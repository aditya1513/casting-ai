'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth-context'
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
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
  latency: number
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

// Connection quality monitor
class ConnectionMonitor {
  private latencies: number[] = []
  private maxSamples = 10
  private pingInterval: NodeJS.Timeout | null = null
  private socket: Socket | null = null
  
  start(socket: Socket) {
    this.socket = socket
    this.stop() // Clear any existing interval
    
    this.pingInterval = setInterval(() => {
      const start = Date.now()
      socket.emit('ping', () => {
        const latency = Date.now() - start
        this.addLatency(latency)
      })
    }, 5000)
  }
  
  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
  
  addLatency(latency: number) {
    this.latencies.push(latency)
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift()
    }
  }
  
  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
  }
  
  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'disconnected' {
    const avg = this.getAverageLatency()
    if (avg === 0) return 'disconnected'
    if (avg < 50) return 'excellent'
    if (avg < 150) return 'good'
    return 'poor'
  }
  
  reset() {
    this.latencies = []
  }
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProviderOptimized({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [latency, setLatency] = useState(0)
  const [connectionQuality, setConnectionQuality] = useState<WebSocketContextType['connectionQuality']>('disconnected')
  
  // Refs for stable references
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const connectionMonitorRef = useRef(new ConnectionMonitor())
  const reconnectAttemptRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelayRef = useRef(1000)
  const eventHandlersRef = useRef<Map<string, (...args: any[]) => void>>(new Map())
  
  // Cleanup function for typing timeouts
  const cleanupTypingTimeouts = useCallback(() => {
    typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    typingTimeoutsRef.current.clear()
  }, [])
  
  // Exponential backoff for reconnection
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(reconnectDelayRef.current * Math.pow(2, reconnectAttemptRef.current), 30000)
    return delay
  }, [])
  
  // Setup socket connection with improved error handling
  useEffect(() => {
    let socketInstance: Socket | null = null
    
    const setupSocket = () => {
      if (!isAuthenticated || !user) {
        if (socketInstance) {
          socketInstance.disconnect()
          setSocket(null)
          connectionMonitorRef.current.stop()
        }
        return
      }
      
      const token = Cookies.get('accessToken')
      
      socketInstance = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: getReconnectDelay(),
        reconnectionAttempts: maxReconnectAttempts,
        timeout: 10000,
        autoConnect: true,
      })
      
      // Connection lifecycle handlers
      const handleConnect = () => {
        console.log('WebSocket connected')
        setConnected(true)
        setReconnecting(false)
        reconnectAttemptRef.current = 0
        reconnectDelayRef.current = 1000
        connectionMonitorRef.current.start(socketInstance!)
        
        // Update connection quality periodically
        const qualityInterval = setInterval(() => {
          setLatency(connectionMonitorRef.current.getAverageLatency())
          setConnectionQuality(connectionMonitorRef.current.getConnectionQuality())
        }, 2000)
        
        eventHandlersRef.current.set('qualityInterval', qualityInterval as any)
      }
      
      const handleDisconnect = (reason: string) => {
        console.log('WebSocket disconnected:', reason)
        setConnected(false)
        setConnectionQuality('disconnected')
        connectionMonitorRef.current.stop()
        
        // Clear quality interval
        const qualityInterval = eventHandlersRef.current.get('qualityInterval')
        if (qualityInterval) {
          clearInterval(qualityInterval as any)
          eventHandlersRef.current.delete('qualityInterval')
        }
        
        if (reason === 'io server disconnect') {
          socketInstance?.connect()
        }
      }
      
      const handleReconnectAttempt = (attemptNumber: number) => {
        console.log(`Reconnection attempt ${attemptNumber}`)
        setReconnecting(true)
        reconnectAttemptRef.current = attemptNumber
      }
      
      const handleReconnect = () => {
        setReconnecting(false)
        toast.success('Reconnected to server')
      }
      
      const handleConnectError = (error: Error) => {
        console.error('Connection error:', error)
        if (error.message === 'Unauthorized') {
          toast.error('Authentication failed. Please login again.')
          // Clear auth and redirect to login
          Cookies.remove('accessToken')
        }
      }
      
      const handleReconnectFailed = () => {
        toast.error('Failed to reconnect. Please refresh the page.')
        setReconnecting(false)
      }
      
      // Message handlers with memory leak prevention
      const handleMessage = (message: Message) => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('new-message', { detail: message }))
        })
      }
      
      const handleMessageSent = (message: Message) => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('message-sent', { detail: message }))
        })
      }
      
      const handleMessageError = (error: { message: string }) => {
        toast.error(error.message)
      }
      
      // Typing indicators with automatic cleanup
      const handleUserTyping = ({ userId, userName, conversationId }: TypingUser) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          const users = newMap.get(conversationId) || []
          
          // Check if user already typing
          if (!users.find(u => u.userId === userId)) {
            users.push({ userId, userName, conversationId })
            newMap.set(conversationId, users)
          }
          
          // Set automatic cleanup after 5 seconds
          const existingTimeout = typingTimeoutsRef.current.get(`${conversationId}-${userId}`)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }
          
          const timeout = setTimeout(() => {
            handleUserStoppedTyping({ userId, conversationId })
          }, 5000)
          
          typingTimeoutsRef.current.set(`${conversationId}-${userId}`, timeout)
          
          return newMap
        })
      }
      
      const handleUserStoppedTyping = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          const users = newMap.get(conversationId) || []
          const filtered = users.filter(u => u.userId !== userId)
          
          if (filtered.length > 0) {
            newMap.set(conversationId, filtered)
          } else {
            newMap.delete(conversationId)
          }
          
          // Clear timeout
          const timeoutKey = `${conversationId}-${userId}`
          const timeout = typingTimeoutsRef.current.get(timeoutKey)
          if (timeout) {
            clearTimeout(timeout)
            typingTimeoutsRef.current.delete(timeoutKey)
          }
          
          return newMap
        })
      }
      
      // User presence handlers
      const handleUsersOnline = (users: string[]) => {
        setOnlineUsers(new Set(users))
      }
      
      const handleUserOnline = (userId: string) => {
        setOnlineUsers(prev => new Set(prev).add(userId))
      }
      
      const handleUserOffline = (userId: string) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      }
      
      // Conversation handlers
      const handleConversationCreated = (conversation: any) => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('conversation-created', { detail: conversation }))
        })
      }
      
      const handleConversationUpdated = (conversation: any) => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('conversation-updated', { detail: conversation }))
        })
      }
      
      // Register all event handlers
      socketInstance.on('connect', handleConnect)
      socketInstance.on('disconnect', handleDisconnect)
      socketInstance.on('reconnect_attempt', handleReconnectAttempt)
      socketInstance.on('reconnect', handleReconnect)
      socketInstance.on('connect_error', handleConnectError)
      socketInstance.on('reconnect_failed', handleReconnectFailed)
      socketInstance.on('message', handleMessage)
      socketInstance.on('message-sent', handleMessageSent)
      socketInstance.on('message-error', handleMessageError)
      socketInstance.on('user-typing', handleUserTyping)
      socketInstance.on('user-stopped-typing', handleUserStoppedTyping)
      socketInstance.on('users-online', handleUsersOnline)
      socketInstance.on('user-online', handleUserOnline)
      socketInstance.on('user-offline', handleUserOffline)
      socketInstance.on('conversation-created', handleConversationCreated)
      socketInstance.on('conversation-updated', handleConversationUpdated)
      
      setSocket(socketInstance)
      
      // Store handlers for cleanup
      eventHandlersRef.current.set('connect', handleConnect)
      eventHandlersRef.current.set('disconnect', handleDisconnect)
      eventHandlersRef.current.set('message', handleMessage)
      // ... store other handlers as needed
    }
    
    setupSocket()
    
    // Cleanup function
    return () => {
      if (socketInstance) {
        // Remove all listeners
        socketInstance.removeAllListeners()
        socketInstance.disconnect()
        
        // Clear all timeouts
        cleanupTypingTimeouts()
        
        // Clear intervals
        eventHandlersRef.current.forEach((handler, key) => {
          if (key.includes('Interval')) {
            clearInterval(handler as any)
          }
        })
        eventHandlersRef.current.clear()
        
        // Stop connection monitor
        connectionMonitorRef.current.stop()
        connectionMonitorRef.current.reset()
      }
    }
  }, [isAuthenticated, user, cleanupTypingTimeouts, getReconnectDelay])
  
  // Memoized callbacks for better performance
  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (!socket || !connected) {
      toast.error('Not connected to server')
      return
    }
    
    socket.emit('send-message', {
      conversationId,
      content,
      type: 'user',
    })
  }, [socket, connected])
  
  const joinConversation = useCallback((conversationId: string) => {
    if (!socket || !connected) return
    socket.emit('join-conversation', conversationId)
  }, [socket, connected])
  
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socket || !connected) return
    socket.emit('leave-conversation', conversationId)
    
    // Clear typing users for this conversation
    setTypingUsers(prev => {
      const newMap = new Map(prev)
      newMap.delete(conversationId)
      return newMap
    })
    
    // Clear typing timeouts for this conversation
    typingTimeoutsRef.current.forEach((timeout, key) => {
      if (key.startsWith(conversationId)) {
        clearTimeout(timeout)
        typingTimeoutsRef.current.delete(key)
      }
    })
  }, [socket, connected])
  
  const startTyping = useCallback((conversationId: string) => {
    if (!socket || !connected || !user) return
    
    socket.emit('typing-start', {
      conversationId,
      userId: user.id,
      userName: user.name,
    })
    
    // Clear existing timeout for this user
    const timeoutKey = `self-${conversationId}`
    const existingTimeout = typingTimeoutsRef.current.get(timeoutKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping(conversationId)
    }, 3000)
    
    typingTimeoutsRef.current.set(timeoutKey, timeout)
  }, [socket, connected, user])
  
  const stopTyping = useCallback((conversationId: string) => {
    if (!socket || !connected || !user) return
    
    socket.emit('typing-stop', {
      conversationId,
      userId: user.id,
    })
    
    // Clear timeout
    const timeoutKey = `self-${conversationId}`
    const timeout = typingTimeoutsRef.current.get(timeoutKey)
    if (timeout) {
      clearTimeout(timeout)
      typingTimeoutsRef.current.delete(timeoutKey)
    }
  }, [socket, connected, user])
  
  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
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
    connectionQuality,
    latency,
  }), [
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
    connectionQuality,
    latency,
  ])
  
  return (
    <WebSocketContext.Provider value={contextValue}>
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