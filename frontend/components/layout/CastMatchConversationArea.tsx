'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useLayoutContext } from './CastMatchLayoutProvider'

/**
 * CastMatch Conversation Area Component
 * Scrollable message container with smooth behavior and bottom clearance
 * Implements hidden scrollbars and automatic scroll management
 */

interface ConversationAreaProps {
  children: React.ReactNode
  className?: string
  autoScrollToBottom?: boolean
  showScrollIndicator?: boolean
}

export function CastMatchConversationArea({
  children,
  className = '',
  autoScrollToBottom = true,
  showScrollIndicator = true
}: ConversationAreaProps) {
  const { inputAreaHeight } = useLayoutContext()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  
  // Check if scrolled to bottom
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setIsScrolledToBottom(isAtBottom)
      setShowScrollButton(!isAtBottom && scrollHeight > clientHeight)
    }
  }
  
  // Scroll to bottom function
  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }
  
  // Auto scroll when new content is added
  useEffect(() => {
    if (autoScrollToBottom && isScrolledToBottom) {
      scrollToBottom()
    }
  }, [children, autoScrollToBottom, isScrolledToBottom])
  
  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom(false)
  }, [])
  
  return (
    <div className={`conversation-area-wrapper relative flex flex-col h-full ${className}`}>
      {/* Scrollable conversation container */}
      <div
        ref={scrollContainerRef}
        className="conversation-area flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={checkScrollPosition}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' },
          scrollBehavior: 'smooth',
          paddingBottom: `${inputAreaHeight + 80}px` // Dynamic bottom padding
        }}
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        <div className="conversation-content max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
        
        {/* Bottom spacer for input area clearance */}
        <div 
          className="bottom-spacer flex-shrink-0" 
          style={{ height: `${inputAreaHeight + 80}px` }}
          aria-hidden="true"
        />
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && showScrollIndicator && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 z-10"
          aria-label="Scroll to bottom"
        >
          <svg 
            className="w-5 h-5 text-gray-600" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Message Component
 * Individual message display with avatar and metadata
 */
interface MessageProps {
  content: React.ReactNode
  sender: 'user' | 'ai'
  timestamp?: Date
  avatar?: string
  name?: string
  className?: string
}

export function Message({
  content,
  sender,
  timestamp = new Date(),
  avatar,
  name,
  className = ''
}: MessageProps) {
  const isUser = sender === 'user'
  
  return (
    <div 
      className={`
        message-wrapper 
        flex 
        ${isUser ? 'justify-end' : 'justify-start'}
        mb-6
        ${className}
      `}
    >
      <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img 
              src={avatar} 
              alt={name || (isUser ? 'User' : 'AI Assistant')}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${isUser ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}
            `}>
              {isUser ? 'U' : 'AI'}
            </div>
          )}
        </div>
        
        {/* Message content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Name and timestamp */}
          <div className="flex items-center gap-2 mb-1">
            {name && (
              <span className="text-sm font-medium text-gray-700">
                {name}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          {/* Message bubble */}
          <div className={`
            inline-block 
            px-4 py-3 
            rounded-2xl 
            ${isUser 
              ? 'bg-gray-900 text-white rounded-tr-sm' 
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
            }
          `}>
            <div className="message-content">{content}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Typing Indicator Component
 * Shows when AI is processing/typing
 */
export function TypingIndicator() {
  return (
    <div className="message-wrapper flex justify-start mb-6">
      <div className="flex gap-3 max-w-3xl">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-gray-600">AI</span>
        </div>
        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * System Message Component
 * For system notifications and status updates
 */
interface SystemMessageProps {
  content: string
  type?: 'info' | 'success' | 'warning' | 'error'
  timestamp?: Date
}

export function SystemMessage({
  content,
  type = 'info',
  timestamp = new Date()
}: SystemMessageProps) {
  const typeStyles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200'
  }
  
  return (
    <div className="system-message-wrapper flex justify-center my-4">
      <div className={`
        px-4 py-2 
        rounded-full 
        border 
        text-sm 
        ${typeStyles[type]}
      `}>
        <span>{content}</span>
        <span className="ml-2 opacity-75 text-xs">
          {timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  )
}

/**
 * Message Group Component
 * Groups related messages together
 */
interface MessageGroupProps {
  children: React.ReactNode
  date?: Date
  className?: string
}

export function MessageGroup({
  children,
  date,
  className = ''
}: MessageGroupProps) {
  return (
    <div className={`message-group ${className}`}>
      {date && (
        <div className="text-center my-6">
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {date.toLocaleDateString([], { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}