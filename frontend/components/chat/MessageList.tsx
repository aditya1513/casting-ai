'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { format } from 'date-fns'

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

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">💬</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Start a conversation
          </h3>
          <p className="text-slate-400">
            Send a message to begin. I'm here to help you with casting needs,
            finding talent, or managing your production.
          </p>
        </div>
      </div>
    )
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.createdAt), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  return (
    <div className="flex-1 px-4 py-6 space-y-6">
      <AnimatePresence initial={false}>
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-slate-800 rounded-full px-3 py-1">
                <span className="text-xs text-slate-400">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-4">
              {dateMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}