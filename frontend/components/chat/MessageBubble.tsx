'use client'

import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { Check, CheckCheck, Bot, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
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

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuth()
  const isOwnMessage = user?.id === message.sender.id
  const isAI = message.type === 'ai'
  const isSystem = message.type === 'system'

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-2">
        <div className="bg-slate-800/50 rounded-full px-3 py-1 text-xs text-slate-400">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.sender.avatar ? (
          <img
            src={message.sender.avatar}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full border border-slate-700"
          />
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isAI ? "bg-purple-600" : "bg-slate-700"
          )}>
            {isAI ? (
              <Bot size={16} className="text-white" />
            ) : (
              <UserIcon size={16} className="text-slate-400" />
            )}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name */}
        {!isOwnMessage && (
          <span className="text-xs text-slate-400 mb-1 ml-2">
            {message.sender.name}
            {message.sender.role && (
              <span className="ml-1 text-purple-400">
                • {message.sender.role}
              </span>
            )}
          </span>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2 break-words',
            isOwnMessage
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
              : isAI
              ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-purple-500/20'
              : 'bg-slate-800 text-white'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Metadata (if any) */}
          {message.metadata && (
            <div className="mt-2 pt-2 border-t border-white/10">
              {message.metadata.suggestions && (
                <div className="space-y-1">
                  <p className="text-xs opacity-70 mb-1">Suggestions:</p>
                  {message.metadata.suggestions.map((suggestion: string, index: number) => (
                    <button
                      key={index}
                      className="block w-full text-left text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Time and Status */}
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isOwnMessage ? 'flex-row-reverse mr-2' : 'ml-2'
        )}>
          <span className="text-xs text-slate-500">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOwnMessage && (
            <span className="text-slate-500">
              {message.read ? (
                <CheckCheck size={14} className="text-purple-400" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}