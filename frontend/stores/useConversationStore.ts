import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Message } from '@/components/features/MessageList'
import { TalentData } from '@/components/castmatch/TalentCard'

interface ConversationState {
  // Messages
  messages: Message[]
  activeConversationId: string | null
  conversations: Map<string, Message[]>
  
  // Typing indicators
  isUserTyping: boolean
  isAITyping: boolean
  typingUsers: Set<string>
  
  // Loading states
  isLoading: boolean
  isSending: boolean
  hasMore: boolean
  
  // Error states
  lastError: string | null
  failedMessages: Set<string>
  
  // Metadata
  currentProject: string | null
  contextTalents: TalentData[]
  
  // Actions - Message Management
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  deleteMessage: (messageId: string) => void
  clearMessages: () => void
  
  // Actions - Conversation Management
  setActiveConversation: (conversationId: string) => void
  loadConversation: (conversationId: string) => void
  createNewConversation: () => string
  deleteConversation: (conversationId: string) => void
  
  // Actions - Typing Indicators
  setUserTyping: (isTyping: boolean) => void
  setAITyping: (isTyping: boolean) => void
  addTypingUser: (userId: string) => void
  removeTypingUser: (userId: string) => void
  
  // Actions - Loading & Errors
  setLoading: (isLoading: boolean) => void
  setSending: (isSending: boolean) => void
  setHasMore: (hasMore: boolean) => void
  setError: (error: string | null) => void
  markMessageFailed: (messageId: string) => void
  retryFailedMessage: (messageId: string) => Promise<void>
  
  // Actions - Context
  setCurrentProject: (projectId: string | null) => void
  setContextTalents: (talents: TalentData[]) => void
  addContextTalent: (talent: TalentData) => void
  removeContextTalent: (talentId: string) => void
  
  // Utilities
  getMessageById: (messageId: string) => Message | undefined
  getConversationMessages: (conversationId: string) => Message[]
  searchMessages: (query: string) => Message[]
}

/**
 * Conversation Store for managing chat messages and state
 */
export const useConversationStore = create<ConversationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    messages: [],
    activeConversationId: null,
    conversations: new Map(),
    isUserTyping: false,
    isAITyping: false,
    typingUsers: new Set(),
    isLoading: false,
    isSending: false,
    hasMore: false,
    lastError: null,
    failedMessages: new Set(),
    currentProject: null,
    contextTalents: [],

    // Message Management
    addMessage: (messageData) => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const message: Message = {
        ...messageData,
        id,
        timestamp: new Date(),
      }

      set((state) => ({
        messages: [...state.messages, message],
        lastError: null,
      }))

      // Also update the conversation map
      const conversationId = get().activeConversationId
      if (conversationId) {
        const conversations = new Map(get().conversations)
        const conversationMessages = conversations.get(conversationId) || []
        conversations.set(conversationId, [...conversationMessages, message])
        set({ conversations })
      }

      return id
    },

    updateMessage: (messageId, updates) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      }))

      // Update in conversations map as well
      const conversations = new Map(get().conversations)
      conversations.forEach((messages, convId) => {
        const updatedMessages = messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
        conversations.set(convId, updatedMessages)
      })
      set({ conversations })
    },

    deleteMessage: (messageId) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== messageId),
        failedMessages: new Set(
          Array.from(state.failedMessages).filter((id) => id !== messageId)
        ),
      }))

      // Delete from conversations map
      const conversations = new Map(get().conversations)
      conversations.forEach((messages, convId) => {
        conversations.set(
          convId,
          messages.filter((msg) => msg.id !== messageId)
        )
      })
      set({ conversations })
    },

    clearMessages: () => {
      set({
        messages: [],
        failedMessages: new Set(),
        lastError: null,
      })
    },

    // Conversation Management
    setActiveConversation: (conversationId) => {
      const conversations = get().conversations
      const messages = conversations.get(conversationId) || []
      
      set({
        activeConversationId: conversationId,
        messages,
        failedMessages: new Set(),
        lastError: null,
      })
    },

    loadConversation: (conversationId) => {
      // This would typically load from API
      const conversations = get().conversations
      const messages = conversations.get(conversationId) || []
      
      set({
        activeConversationId: conversationId,
        messages,
        isLoading: false,
      })
    },

    createNewConversation: () => {
      const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const conversations = new Map(get().conversations)
      conversations.set(id, [])
      
      set({
        activeConversationId: id,
        messages: [],
        conversations,
        failedMessages: new Set(),
        lastError: null,
      })
      
      return id
    },

    deleteConversation: (conversationId) => {
      const conversations = new Map(get().conversations)
      conversations.delete(conversationId)
      
      set((state) => ({
        conversations,
        activeConversationId:
          state.activeConversationId === conversationId
            ? null
            : state.activeConversationId,
        messages:
          state.activeConversationId === conversationId ? [] : state.messages,
      }))
    },

    // Typing Indicators
    setUserTyping: (isTyping) => set({ isUserTyping: isTyping }),
    setAITyping: (isTyping) => set({ isAITyping: isTyping }),
    
    addTypingUser: (userId) => {
      set((state) => ({
        typingUsers: new Set(state.typingUsers).add(userId),
      }))
    },

    removeTypingUser: (userId) => {
      set((state) => {
        const typingUsers = new Set(state.typingUsers)
        typingUsers.delete(userId)
        return { typingUsers }
      })
    },

    // Loading & Errors
    setLoading: (isLoading) => set({ isLoading }),
    setSending: (isSending) => set({ isSending }),
    setHasMore: (hasMore) => set({ hasMore }),
    setError: (error) => set({ lastError: error }),

    markMessageFailed: (messageId) => {
      set((state) => ({
        failedMessages: new Set(state.failedMessages).add(messageId),
      }))
    },

    retryFailedMessage: async (messageId) => {
      const message = get().getMessageById(messageId)
      if (!message) return

      // Remove from failed set
      set((state) => {
        const failedMessages = new Set(state.failedMessages)
        failedMessages.delete(messageId)
        return { failedMessages }
      })

      // Here you would typically retry sending to API
      // For now, just mark as successful
      get().updateMessage(messageId, { error: false })
    },

    // Context Management
    setCurrentProject: (projectId) => set({ currentProject: projectId }),
    setContextTalents: (talents) => set({ contextTalents: talents }),

    addContextTalent: (talent) => {
      set((state) => ({
        contextTalents: [...state.contextTalents, talent],
      }))
    },

    removeContextTalent: (talentId) => {
      set((state) => ({
        contextTalents: state.contextTalents.filter((t) => t.id !== talentId),
      }))
    },

    // Utilities
    getMessageById: (messageId) => {
      return get().messages.find((msg) => msg.id === messageId)
    },

    getConversationMessages: (conversationId) => {
      return get().conversations.get(conversationId) || []
    },

    searchMessages: (query) => {
      const lowerQuery = query.toLowerCase()
      return get().messages.filter((msg) => {
        if (typeof msg.content === 'string') {
          return msg.content.toLowerCase().includes(lowerQuery)
        }
        return false
      })
    },
  }))
)

// Selector hooks for common use cases
export const useMessages = () => useConversationStore((state) => state.messages)
export const useIsAITyping = () => useConversationStore((state) => state.isAITyping)
export const useIsSending = () => useConversationStore((state) => state.isSending)
export const useLastError = () => useConversationStore((state) => state.lastError)

// Subscribe to typing changes for sound effects
export const subscribeToTypingChanges = (callback: (isTyping: boolean) => void) => {
  return useConversationStore.subscribe(
    (state) => state.isAITyping,
    callback
  )
}