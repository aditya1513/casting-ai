'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useChatStore } from '@/lib/stores/chat-store'
import { useWebSocket } from '@/lib/websocket-context'
import { format } from 'date-fns'
import { Search, Plus, Bot, Users, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ConversationList() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    fetchConversations,
    loadingConversations,
  } = useChatStore()
  const { onlineUsers } = useWebSocket()

  useEffect(() => {
    fetchConversations()
  }, [])

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Conversations</h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="New conversation"
          >
            <Plus size={20} />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-slate-400 text-sm">No conversations yet</p>
            <p className="text-slate-500 text-xs mt-1">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="py-2">
            {conversations.map((conversation) => {
              const otherParticipant = conversation.participants[0]
              const isOnline = otherParticipant && onlineUsers.has(otherParticipant.id)
              const isActive = activeConversationId === conversation.id
              const isAI = conversation.type === 'ai'

              return (
                <motion.button
                  key={conversation.id}
                  whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.5)' }}
                  onClick={() => setActiveConversation(conversation.id)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center gap-3 transition-all relative',
                    isActive && 'bg-slate-700/50 border-l-4 border-purple-500'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {isAI ? (
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                        <Bot className="text-white" size={24} />
                      </div>
                    ) : conversation.type === 'group' ? (
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                        <Users className="text-slate-400" size={24} />
                      </div>
                    ) : otherParticipant?.avatar ? (
                      <img
                        src={otherParticipant.avatar}
                        alt={otherParticipant.name}
                        className="w-12 h-12 rounded-full border border-slate-600"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                        <UserIcon className="text-slate-400" size={24} />
                      </div>
                    )}
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-medium truncate">
                        {conversation.title || otherParticipant?.name || 'Unnamed'}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(conversation.lastMessage.createdAt), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400 truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button className="w-full py-2 px-4 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-2">
          <Bot size={20} />
          <span>Start AI Chat</span>
        </button>
      </div>
    </div>
  )
}