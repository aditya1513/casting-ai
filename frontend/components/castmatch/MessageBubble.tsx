"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

export interface MessageBubbleProps {
  /** Message content - can be text or React nodes */
  content: React.ReactNode
  /** Message sender type */
  sender: 'user' | 'ai'
  /** Timestamp of the message */
  timestamp?: Date
  /** User avatar URL */
  avatarUrl?: string
  /** User initials for fallback */
  userInitials?: string
  /** AI avatar URL */
  aiAvatarUrl?: string
  /** Whether the message is being typed */
  isTyping?: boolean
  /** Additional class names */
  className?: string
  /** Error state */
  error?: boolean
  /** Loading state */
  loading?: boolean
}

/**
 * MessageBubble component for displaying chat messages
 * Follows the CastMatch conversation design pattern
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  sender,
  timestamp,
  avatarUrl,
  userInitials = 'U',
  aiAvatarUrl,
  isTyping = false,
  className,
  error = false,
  loading = false,
}) => {
  const isUser = sender === 'user'

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar size="sm">
          {isUser ? (
            <>
              <AvatarImage src={avatarUrl} alt="User" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </>
          ) : (
            <>
              <AvatarImage src={aiAvatarUrl} alt="CastMatch AI" />
              <AvatarFallback type="ai">AI</AvatarFallback>
            </>
          )}
        </Avatar>
      </div>

      {/* Message Content */}
      <div className={cn("flex flex-col gap-1 max-w-[70%]", isUser && "items-end")}>
        {/* Sender Name & Timestamp */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400",
          isUser && "flex-row-reverse"
        )}>
          <span className="font-medium">
            {isUser ? 'You' : 'CastMatch AI'}
          </span>
          {timestamp && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl transition-all duration-200",
            isUser
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-tr-md"
              : "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-white rounded-tl-md",
            error && "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800",
            loading && "animate-pulse"
          )}
        >
          {isTyping ? (
            <div className="flex gap-1.5 py-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
            </div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Failed to send message. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * SystemMessage component for displaying system notifications
 */
export const SystemMessage: React.FC<{
  content: string
  type?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}> = ({ content, type = 'info', className }) => {
  const typeStyles = {
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    success: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    warning: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    error: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  }

  return (
    <div className={cn("flex justify-center my-4", className)}>
      <div className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium",
        typeStyles[type]
      )}>
        {content}
      </div>
    </div>
  )
}

/**
 * MessageGroup component for grouping messages from the same sender
 */
export const MessageGroup: React.FC<{
  messages: Array<{
    id: string
    content: React.ReactNode
    timestamp?: Date
    error?: boolean
  }>
  sender: 'user' | 'ai'
  avatarUrl?: string
  userInitials?: string
  aiAvatarUrl?: string
  className?: string
}> = ({ messages, sender, avatarUrl, userInitials, aiAvatarUrl, className }) => {
  if (messages.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          content={message.content}
          sender={sender}
          timestamp={index === messages.length - 1 ? message.timestamp : undefined}
          avatarUrl={avatarUrl}
          userInitials={userInitials}
          aiAvatarUrl={aiAvatarUrl}
          error={message.error}
        />
      ))}
    </div>
  )
}