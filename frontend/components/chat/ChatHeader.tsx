'use client'

import { useChatStore } from '@/lib/stores/chat-store'
import { useWebSocket } from '@/lib/websocket-context'
import { MoreVertical, Phone, Video, Search, Users } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChatHeaderProps {
  conversationId: string
}

export function ChatHeader({ conversationId }: ChatHeaderProps) {
  const { conversations } = useChatStore()
  const { onlineUsers } = useWebSocket()
  
  const conversation = conversations.find(c => c.id === conversationId)
  
  if (!conversation) return null

  const otherParticipants = conversation.participants.filter(
    p => p.id !== 'current-user' // This will be replaced with actual user ID
  )

  const isOnline = otherParticipants.some(p => onlineUsers.has(p.id))

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {conversation.type === 'ai' ? (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>
            ) : otherParticipants[0]?.avatar ? (
              <img
                src={otherParticipants[0].avatar}
                alt={otherParticipants[0].name}
                className="w-10 h-10 rounded-full border border-slate-600"
              />
            ) : (
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {otherParticipants[0]?.name[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            
            {/* Online Status */}
            {isOnline && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"
              />
            )}
          </div>

          {/* Name and Status */}
          <div>
            <h2 className="text-white font-semibold">
              {conversation.title || otherParticipants.map(p => p.name).join(', ')}
            </h2>
            <p className="text-xs text-slate-400">
              {conversation.type === 'ai' ? (
                'AI Assistant'
              ) : isOnline ? (
                <span className="text-green-400">Online</span>
              ) : (
                'Offline'
              )}
              {conversation.type === 'group' && (
                <span className="ml-2">
                  <Users className="inline w-3 h-3 mr-1" />
                  {conversation.participants.length} members
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="Search in conversation"
          >
            <Search size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="Voice call"
          >
            <Phone size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="Video call"
          >
            <Video size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="More options"
          >
            <MoreVertical size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}