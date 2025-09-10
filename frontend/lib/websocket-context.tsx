'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
// import { useAuth } from './auth-context' // Temporarily disabled for Auth0 migration
import { toast } from 'sonner'
import Cookies from 'js-cookie'

interface Message {
  id: string
  conversationId: string
  content: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  read: boolean
  type: 'user' | 'ai' | 'system'
}

interface TypingUser {
  userId: string
  userName: string
  conversationId: string
}

interface WebSocketContextType {
  socket: Socket | null
  connected: boolean
  reconnecting: boolean
  sendMessage: (conversationId: string, content: string) => void
  joinConversation: (conversationId: string) => void
  leaveConversation: (conversationId: string) => void
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
  typingUsers: Map<string, TypingUser[]>
  onlineUsers: Set<string>
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  // const { user, isAuthenticated } = useAuth() // Temporarily disabled for Auth0 migration
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Temporarily disable authentication requirement for Auth0 migration
    // if (!isAuthenticated || !user) {
    //   if (socket) {
    //     socket.disconnect()
    //     setSocket(null)
    //   }
    //   return
    // }

    const token = Cookies.get('accessToken')
    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setConnected(true)
      setReconnecting(false)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setConnected(false)
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        newSocket.connect()
      }
    })

    newSocket.on('reconnect_attempt', () => {
      setReconnecting(true)
    })

    newSocket.on('reconnect', () => {
      setReconnecting(false)
      toast.success('Reconnected to server')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      if (error.message === 'Unauthorized') {
        toast.error('Authentication failed. Please login again.')
      }
    })

    // Message events
    newSocket.on('message', (message: Message) => {
      // Handle incoming messages - will be processed by chat components
      window.dispatchEvent(new CustomEvent('new-message', { detail: message }))
    })

    newSocket.on('message-sent', (message: Message) => {
      window.dispatchEvent(new CustomEvent('message-sent', { detail: message }))
    })

    newSocket.on('message-error', (error: { message: string }) => {
      toast.error(error.message)
    })

    // Typing indicators
    newSocket.on('user-typing', ({ userId, userName, conversationId }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        const users = newMap.get(conversationId) || []
        if (!users.find((u) => u.userId === userId)) {
          users.push({ userId, userName, conversationId })
          newMap.set(conversationId, users)
        }
        return newMap
      })
    })

    newSocket.on('user-stopped-typing', ({ userId, conversationId }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        const users = newMap.get(conversationId) || []
        const filtered = users.filter((u) => u.userId !== userId)
        if (filtered.length > 0) {
          newMap.set(conversationId, filtered)
        } else {
          newMap.delete(conversationId)
        }
        return newMap
      })
    })

    // User presence
    newSocket.on('users-online', (users: string[]) => {
      setOnlineUsers(new Set(users))
    })

    newSocket.on('user-online', (userId: string) => {
      setOnlineUsers((prev) => new Set(prev).add(userId))
    })

    newSocket.on('user-offline', (userId: string) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    })

    // Conversation events
    newSocket.on('conversation-created', (conversation) => {
      window.dispatchEvent(new CustomEvent('conversation-created', { detail: conversation }))
    })

    newSocket.on('conversation-updated', (conversation) => {
      window.dispatchEvent(new CustomEvent('conversation-updated', { detail: conversation }))
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, []) // Removed auth dependencies for Auth0 migration

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!socket || !connected) {
        toast.error('Not connected to server')
        return
      }

      socket.emit('send-message', {
        conversationId,
        content,
        type: 'user',
      })
    },
    [socket, connected]
  )

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (!socket || !connected) return
      socket.emit('join-conversation', conversationId)
    },
    [socket, connected]
  )

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (!socket || !connected) return
      socket.emit('leave-conversation', conversationId)
    },
    [socket, connected]
  )

  const startTyping = useCallback(
    (conversationId: string) => {
      if (!socket || !connected) return
      // Temporarily disabled user check for Auth0 migration
      const userId = 'temp-user-id'
      const userName = 'Guest User'

      socket.emit('typing-start', {
        conversationId,
        userId,
        userName,
      })

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(conversationId)
      }, 3000)
    },
    [socket, connected] // Removed user dependency
  )

  const stopTyping = useCallback(
    (conversationId: string) => {
      if (!socket || !connected) return
      // Temporarily disabled user check for Auth0 migration
      const userId = 'temp-user-id'

      socket.emit('typing-stop', {
        conversationId,
        userId,
      })

      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    },
    [socket, connected] // Removed user dependency
  )

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        reconnecting,
        sendMessage,
        joinConversation,
        leaveConversation,
        startTyping,
        stopTyping,
        typingUsers,
        onlineUsers,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}