'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface DashboardUpdate {
  type: string
  data: any
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  lastConnected: Date | null
  reconnectAttempts: number
  error: string | null
}

interface WebSocketDashboardOptions {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  enableLogging?: boolean
}

const DEFAULT_OPTIONS: Required<WebSocketDashboardOptions> = {
  url: 'ws://localhost:3001/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  enableLogging: false
}

export class WebSocketDashboardService {
  private ws: WebSocket | null = null
  private options: Required<WebSocketDashboardOptions>
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private isDestroyed = false

  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set()
  
  private connectionState: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
    error: null
  }

  constructor(options: WebSocketDashboardOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  private log(message: string, ...args: any[]) {
    if (this.options.enableLogging) {
      console.log(`[WebSocketDashboard] ${message}`, ...args)
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates }
    this.notifyConnectionListeners()
  }

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.connectionState)
      } catch (error) {
        console.error('Error in connection listener:', error)
      }
    })
  }

  private notifyListeners(type: string, data: any) {
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in ${type} listener:`, error)
        }
      })
    }

    // Also notify wildcard listeners
    const wildcardListeners = this.listeners.get('*')
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener({ type, data })
        } catch (error) {
          console.error('Error in wildcard listener:', error)
        }
      })
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('Service has been destroyed'))
        return
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.connectionState.isConnecting) {
        return
      }

      this.updateConnectionState({ 
        isConnecting: true, 
        error: null 
      })

      this.log('Connecting to WebSocket:', this.options.url)

      try {
        this.ws = new WebSocket(this.options.url)

        const connectTimeout = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws?.close()
            reject(new Error('Connection timeout'))
          }
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(connectTimeout)
          this.log('WebSocket connected')
          
          this.updateConnectionState({
            isConnected: true,
            isConnecting: false,
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: null
          })

          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const update: DashboardUpdate = JSON.parse(event.data)
            this.log('Received update:', update.type, update.data)
            this.notifyListeners(update.type, update.data)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout)
          this.log('WebSocket disconnected:', event.code, event.reason)
          
          this.updateConnectionState({
            isConnected: false,
            isConnecting: false
          })

          this.stopHeartbeat()

          if (!this.isDestroyed && event.code !== 1000) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout)
          this.log('WebSocket error:', error)
          
          this.updateConnectionState({
            isConnected: false,
            isConnecting: false,
            error: 'Connection error'
          })

          reject(new Error('WebSocket connection failed'))
        }

      } catch (error) {
        this.updateConnectionState({
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        reject(error)
      }
    })
  }

  private scheduleReconnect() {
    if (this.isDestroyed) return
    
    if (this.connectionState.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached')
      this.updateConnectionState({
        error: 'Maximum reconnection attempts exceeded'
      })
      return
    }

    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.connectionState.reconnectAttempts),
      30000
    )

    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.connectionState.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(() => {
      this.updateConnectionState({
        reconnectAttempts: this.connectionState.reconnectAttempts + 1
      })
      this.connect().catch(error => {
        this.log('Reconnect failed:', error)
      })
    }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  disconnect() {
    this.log('Disconnecting WebSocket')
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.updateConnectionState({
      isConnected: false,
      isConnecting: false
    })
  }

  destroy() {
    this.log('Destroying WebSocket service')
    this.isDestroyed = true
    this.disconnect()
    this.listeners.clear()
    this.connectionListeners.clear()
  }

  // Event subscription methods
  on(type: string, listener: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type)
      if (typeListeners) {
        typeListeners.delete(listener)
        if (typeListeners.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  onConnectionChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener)
    
    // Immediately call with current state
    listener(this.connectionState)

    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  // Send data to server
  send(type: string, data: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }))
        return true
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        return false
      }
    }
    return false
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  isConnected(): boolean {
    return this.connectionState.isConnected
  }
}

// React hook for using WebSocket dashboard
export function useWebSocketDashboard(options?: WebSocketDashboardOptions) {
  const wsRef = useRef<WebSocketDashboardService | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    lastConnected: null,
    reconnectAttempts: 0,
    error: null
  })

  // Initialize WebSocket service
  useEffect(() => {
    wsRef.current = new WebSocketDashboardService(options)
    
    const unsubscribe = wsRef.current.onConnectionChange(setConnectionState)
    
    // Auto-connect
    wsRef.current.connect().catch(error => {
      console.error('Failed to connect to WebSocket:', error)
    })

    return () => {
      unsubscribe()
      wsRef.current?.destroy()
    }
  }, [])

  const subscribe = useCallback((type: string, listener: (data: any) => void) => {
    return wsRef.current?.on(type, listener) ?? (() => {})
  }, [])

  const send = useCallback((type: string, data: any) => {
    return wsRef.current?.send(type, data) ?? false
  }, [])

  const reconnect = useCallback(() => {
    return wsRef.current?.connect() ?? Promise.reject(new Error('Service not initialized'))
  }, [])

  return {
    connectionState,
    subscribe,
    send,
    reconnect,
    isConnected: connectionState.isConnected
  }
}

// Hook for specific dashboard updates
export function useDashboardUpdates() {
  const { subscribe, connectionState } = useWebSocketDashboard({
    enableLogging: process.env.NODE_ENV === 'development'
  })

  const [updates, setUpdates] = useState<DashboardUpdate[]>([])

  useEffect(() => {
    const unsubscribe = subscribe('*', (update: { type: string; data: any }) => {
      const dashboardUpdate: DashboardUpdate = {
        type: update.type,
        data: update.data,
        timestamp: new Date().toISOString(),
        priority: 'medium' // Default priority
      }
      
      setUpdates(prev => [dashboardUpdate, ...prev.slice(0, 99)]) // Keep last 100 updates
    })

    return unsubscribe
  }, [subscribe])

  const clearUpdates = useCallback(() => {
    setUpdates([])
  }, [])

  return {
    updates,
    clearUpdates,
    connectionState
  }
}

// Specific hooks for different types of updates
export function useTalentUpdates() {
  const { subscribe } = useWebSocketDashboard()
  const [talents, setTalents] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = subscribe('talent_update', (data) => {
      setTalents(prev => {
        const existing = prev.find(t => t.id === data.id)
        if (existing) {
          return prev.map(t => t.id === data.id ? { ...t, ...data } : t)
        } else {
          return [data, ...prev]
        }
      })
    })

    return unsubscribe
  }, [subscribe])

  return talents
}

export function useProjectUpdates() {
  const { subscribe } = useWebSocketDashboard()
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = subscribe('project_update', (data) => {
      setProjects(prev => {
        const existing = prev.find(p => p.id === data.id)
        if (existing) {
          return prev.map(p => p.id === data.id ? { ...p, ...data } : p)
        } else {
          return [data, ...prev]
        }
      })
    })

    return unsubscribe
  }, [subscribe])

  return projects
}

export function useNotifications() {
  const { subscribe } = useWebSocketDashboard()
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = subscribe('notification', (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 49)]) // Keep last 50 notifications
    })

    return unsubscribe
  }, [subscribe])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    markAsRead,
    clearAll,
    unreadCount: notifications.filter(n => !n.read).length
  }
}