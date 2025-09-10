import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import axios from 'axios'

interface Message {
  id: string
  conversationId: string
  content: string
  sender: {
    id: string
    name: string
    avatar?: string
    role?: string
  }
  createdAt: string
  read: boolean
  type: 'user' | 'ai' | 'system'
  metadata?: any
}

interface Conversation {
  id: string
  title: string
  participants: Array<{
    id: string
    name: string
    avatar?: string
    role: string
  }>
  lastMessage?: Message
  unreadCount: number
  createdAt: string
  updatedAt: string
  type: 'direct' | 'group' | 'ai'
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Map<string, Message[]>
  loadingConversations: boolean
  loadingMessages: boolean
  error: string | null

  // Actions
  setActiveConversation: (id: string) => void
  fetchConversations: () => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  addMessage: (message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  markAsRead: (conversationId: string, messageIds: string[]) => void
  createConversation: (participants: string[], title?: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  clearError: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        conversations: [],
        activeConversationId: null,
        messages: new Map(),
        loadingConversations: false,
        loadingMessages: false,
        error: null,

        setActiveConversation: (id) => {
          set({ activeConversationId: id })
        },

        fetchConversations: async () => {
          set({ loadingConversations: true, error: null })
          try {
            const response = await axios.get(`${API_URL}/conversations`)
            set({ conversations: response.data, loadingConversations: false })
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch conversations',
              loadingConversations: false,
            })
          }
        },

        fetchMessages: async (conversationId) => {
          set({ loadingMessages: true, error: null })
          try {
            const response = await axios.get(
              `${API_URL}/conversations/${conversationId}/messages`
            )
            const currentMessages = get().messages
            currentMessages.set(conversationId, response.data)
            set({ messages: new Map(currentMessages), loadingMessages: false })
          } catch (error: any) {
            set({
              error: error.response?.data?.message || 'Failed to fetch messages',
              loadingMessages: false,
            })
          }
        },

        addMessage: (message) => {
          const currentMessages = get().messages
          const conversationMessages = currentMessages.get(message.conversationId) || []
          const updatedMessages = [...conversationMessages, message]
          currentMessages.set(message.conversationId, updatedMessages)
          set({ messages: new Map(currentMessages) })

          // Update last message in conversation
          const conversations = get().conversations.map((conv) => {
            if (conv.id === message.conversationId) {
              return { ...conv, lastMessage: message, updatedAt: message.createdAt }
            }
            return conv
          })
          set({ conversations })
        },

        updateMessage: (conversationId, messageId, updates) => {
          const currentMessages = get().messages
          const conversationMessages = currentMessages.get(conversationId) || []
          const updatedMessages = conversationMessages.map((msg) => {
            if (msg.id === messageId) {
              return { ...msg, ...updates }
            }
            return msg
          })
          currentMessages.set(conversationId, updatedMessages)
          set({ messages: new Map(currentMessages) })
        },

        markAsRead: (conversationId, messageIds) => {
          const currentMessages = get().messages
          const conversationMessages = currentMessages.get(conversationId) || []
          const updatedMessages = conversationMessages.map((msg) => {
            if (messageIds.includes(msg.id)) {
              return { ...msg, read: true }
            }
            return msg
          })
          currentMessages.set(conversationId, updatedMessages)
          set({ messages: new Map(currentMessages) })

          // Update unread count
          const conversations = get().conversations.map((conv) => {
            if (conv.id === conversationId) {
              return { ...conv, unreadCount: 0 }
            }
            return conv
          })
          set({ conversations })
        },

        createConversation: async (participants, title) => {
          try {
            const response = await axios.post(`${API_URL}/conversations`, {
              participants,
              title,
            })
            const newConversation = response.data
            set({ conversations: [...get().conversations, newConversation] })
            return newConversation
          } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to create conversation' })
            throw error
          }
        },

        deleteConversation: async (conversationId) => {
          try {
            await axios.delete(`${API_URL}/conversations/${conversationId}`)
            set({
              conversations: get().conversations.filter((c) => c.id !== conversationId),
              activeConversationId:
                get().activeConversationId === conversationId ? null : get().activeConversationId,
            })
            // Remove messages for this conversation
            const messages = get().messages
            messages.delete(conversationId)
            set({ messages: new Map(messages) })
          } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to delete conversation' })
            throw error
          }
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          activeConversationId: state.activeConversationId,
        }),
      }
    )
  )
)