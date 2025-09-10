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
    role?: 'casting-director' | 'talent' | 'producer' | 'ai-assistant'
  }
  createdAt: string
  read: boolean
  type: 'user' | 'ai' | 'system'
  metadata?: {
    suggestions?: string[]
    castingBrief?: {
      title: string
      description: string
      deadline?: string
    }
    portfolioShare?: {
      title: string
      description: string
      type: 'headshot' | 'reel' | 'portfolio'
    }
  }
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
        <div className="chat-message-system bg-slate-800/50 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2 contain-layout-style',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.sender.avatar ? (
          <img
            src={message.sender.avatar}
            alt={`${message.sender.name} profile picture`}
            className="w-8 h-8 rounded-full border border-slate-700"
            loading="lazy"
          />
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isAI ? "bg-purple-600" : "bg-slate-700"
          )}>
            {isAI ? (
              <Bot size={16} className="text-white" aria-label="AI Assistant" />
            ) : (
              <UserIcon size={16} className="text-slate-400" aria-label="User" />
            )}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col max-w-[70%] mobile:max-w-[85%]',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name */}
        {!isOwnMessage && (
          <span className={cn(
            "chat-sender-name mb-1 ml-2",
            message.sender.role === 'casting-director' && "chat-sender-name--casting-director",
            message.sender.role === 'talent' && "chat-sender-name--talent", 
            message.sender.role === 'producer' && "chat-sender-name--producer",
            isAI && "chat-sender-name--ai-assistant"
          )}>
            {message.sender.name}
            {message.sender.role && (
              <span className={cn(
                "chat-role-badge ml-1",
                message.sender.role === 'casting-director' && "chat-role-badge--casting",
                message.sender.role === 'talent' && "chat-role-badge--talent",
                isAI && "chat-role-badge--ai"
              )}>
                {message.sender.role === 'casting-director' ? 'Casting Director' : 
                 message.sender.role === 'talent' ? 'Talent' :
                 message.sender.role === 'producer' ? 'Producer' :
                 'AI Assistant'}
              </span>
            )}
          </span>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2 break-words smooth-fonts',
            isOwnMessage
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
              : isAI
              ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-purple-500/20'
              : 'bg-slate-800 text-white'
          )}
        >
          {/* Regular Message Content */}
          <p className={cn(
            "whitespace-pre-wrap",
            isOwnMessage ? "chat-message-user" : isAI ? "chat-message-ai" : "chat-message-user"
          )}>
            {message.content}
          </p>

          {/* Casting Brief Metadata */}
          {message.metadata?.castingBrief && (
            <div className="chat-message-casting-brief mt-3">
              <h4 className="chat-audition-title">{message.metadata.castingBrief.title}</h4>
              <p className="chat-audition-info">{message.metadata.castingBrief.description}</p>
              {message.metadata.castingBrief.deadline && (
                <p className="chat-audition-deadline">
                  Deadline: {format(new Date(message.metadata.castingBrief.deadline), 'MMM dd, yyyy')}
                </p>
              )}
            </div>
          )}

          {/* Portfolio Share Metadata */}
          {message.metadata?.portfolioShare && (
            <div className="chat-message-portfolio mt-3">
              <h4 className="chat-portfolio-title">{message.metadata.portfolioShare.title}</h4>
              <p className="chat-portfolio-description">{message.metadata.portfolioShare.description}</p>
            </div>
          )}

          {/* AI Suggestions */}
          {message.metadata?.suggestions && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-caption opacity-70 mb-1">Suggestions:</p>
                {message.metadata.suggestions.map((suggestion: string, index: number) => (
                  <button
                    key={index}
                    className="chat-message-action block w-full text-left px-2 py-1 rounded bg-white/10 hover:bg-white/20 motion-reduce:transition-none"
                    aria-label={`Suggestion: ${suggestion}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Time and Status */}
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isOwnMessage ? 'flex-row-reverse mr-2' : 'ml-2'
        )}>
          <time 
            className="chat-timestamp"
            dateTime={message.createdAt}
            title={format(new Date(message.createdAt), 'MMM dd, yyyy HH:mm')}
          >
            {format(new Date(message.createdAt), 'HH:mm')}
          </time>
          {isOwnMessage && (
            <span className="text-slate-500" aria-label={message.read ? "Message read" : "Message delivered"}>
              {message.read ? (
                <CheckCheck size={14} className="text-purple-400 chat-status-read" />
              ) : (
                <Check size={14} className="chat-status-delivered" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Export enhanced version as default
export default MessageBubble