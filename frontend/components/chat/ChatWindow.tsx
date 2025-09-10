'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { ChatHeader } from './ChatHeader'
import { useWebSocket } from '@/lib/websocket-context'
import { useChatStore } from '@/lib/stores/chat-store'
import { Loader2 } from 'lucide-react'

interface ChatWindowProps {
  conversationId: string
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { connected, reconnecting, joinConversation, leaveConversation, typingUsers } = useWebSocket()
  const { messages, loadingMessages, fetchMessages } = useChatStore()
  const conversationMessages = messages.get(conversationId) || []
  const conversationTypingUsers = typingUsers.get(conversationId) || []
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId)
      joinConversation(conversationId)

      return () => {
        leaveConversation(conversationId)
      }
    }
  }, [conversationId, joinConversation, leaveConversation, fetchMessages])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  if (loadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-purple-500" size={48} />
          <p className="text-slate-400">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 h-screen md:h-full">
      <ChatHeader conversationId={conversationId} />
      
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Connection Status */}
        {!connected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-900/20 border-b border-yellow-700 px-3 py-2 md:px-4"
          >
            <p className="text-xs md:text-sm text-yellow-400 flex items-center">
              {reconnecting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={14} />
                  <span className="hidden sm:inline">Reconnecting to server...</span>
                  <span className="sm:hidden">Reconnecting...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Connection lost. Trying to reconnect...</span>
                  <span className="sm:hidden">Connection lost</span>
                </>
              )}
            </p>
          </motion.div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-2 md:px-4">
          <MessageList messages={conversationMessages} />
          {conversationTypingUsers.length > 0 && (
            <TypingIndicator users={conversationTypingUsers} />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Fixed at bottom on mobile */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800">
          <MessageInput conversationId={conversationId} />
        </div>
      </div>
    </div>
  )
}