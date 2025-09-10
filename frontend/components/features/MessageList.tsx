"use client"

import React, { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { MessageBubble, SystemMessage } from '@/components/castmatch/MessageBubble'
import { TalentCard, TalentData } from '@/components/castmatch/TalentCard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown } from 'lucide-react'

export interface Message {
  id: string
  content: string | React.ReactNode
  sender: 'user' | 'ai' | 'system'
  timestamp: Date
  error?: boolean
  talents?: TalentData[]
  metadata?: Record<string, any>
}

export interface MessageListProps {
  /** Array of messages to display */
  messages: Message[]
  /** Whether new messages are being loaded */
  loading?: boolean
  /** Whether AI is typing a response */
  isTyping?: boolean
  /** User avatar URL */
  userAvatar?: string
  /** User initials */
  userInitials?: string
  /** AI avatar URL */
  aiAvatar?: string
  /** Callback when scrolling near top (for pagination) */
  onLoadMore?: () => void
  /** Whether more messages can be loaded */
  hasMore?: boolean
  /** Auto-scroll to bottom on new messages */
  autoScroll?: boolean
  /** Show scroll to bottom button */
  showScrollButton?: boolean
  /** Custom class name */
  className?: string
}

/**
 * MessageList component for displaying conversation messages
 * Handles auto-scrolling, pagination, and talent card display
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading = false,
  isTyping = false,
  userAvatar,
  userInitials = 'U',
  aiAvatar,
  onLoadMore,
  hasMore = false,
  autoScroll = true,
  showScrollButton = true,
  className,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false)
  const [isNearBottom, setIsNearBottom] = React.useState(true)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && isNearBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, autoScroll, isNearBottom])

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight

    // Check if near bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const nearBottom = distanceFromBottom < 100
    setIsNearBottom(nearBottom)
    setShowScrollToBottom(!nearBottom && showScrollButton)

    // Check if near top for pagination
    if (scrollTop < 100 && hasMore && !loading) {
      onLoadMore?.()
    }
  }, [hasMore, loading, onLoadMore, showScrollButton])

  // Scroll to bottom handler
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Group consecutive messages from the same sender
  const groupedMessages = messages.reduce<Array<{
    sender: 'user' | 'ai' | 'system'
    messages: Message[]
  }>>((groups, message) => {
    const lastGroup = groups[groups.length - 1]
    
    if (message.sender === 'system') {
      // System messages are always separate
      groups.push({ sender: 'system', messages: [message] })
    } else if (lastGroup && lastGroup.sender === message.sender && message.sender !== 'system') {
      // Add to existing group
      lastGroup.messages.push(message)
    } else {
      // Start new group
      groups.push({ sender: message.sender as any, messages: [message] })
    }
    
    return groups
  }, [])

  return (
    <div className={cn("relative h-full", className)}>
      <ScrollArea
        ref={scrollAreaRef}
        className="h-full"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Load More Indicator */}
          {hasMore && (
            <div className="text-center py-4">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onLoadMore}
                >
                  Load earlier messages
                </Button>
              )}
            </div>
          )}

          {/* Welcome Message (if no messages) */}
          {messages.length === 0 && !isTyping && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                <span className="text-2xl text-white font-bold">AI</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Welcome to CastMatch AI</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                I'm here to help you find the perfect talent for your project. 
                Ask me anything about casting, talent search, or managing your productions.
              </p>
            </div>
          )}

          {/* Message Groups */}
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => {
              if (group.sender === 'system') {
                return group.messages.map(message => (
                  <SystemMessage
                    key={message.id}
                    content={message.content as string}
                    type={message.metadata?.type || 'info'}
                  />
                ))
              }

              return (
                <div key={groupIndex} className="space-y-4">
                  {group.messages.map((message, messageIndex) => (
                    <div key={message.id} className="space-y-3">
                      <MessageBubble
                        content={message.content}
                        sender={group.sender}
                        timestamp={messageIndex === group.messages.length - 1 ? message.timestamp : undefined}
                        avatarUrl={userAvatar}
                        userInitials={userInitials}
                        aiAvatarUrl={aiAvatar}
                        error={message.error}
                      />

                      {/* Talent Cards if present */}
                      {message.talents && message.talents.length > 0 && (
                        <div className={cn(
                          "ml-11 space-y-3",
                          group.sender === 'user' && "mr-11 ml-0"
                        )}>
                          {message.talents.length === 1 ? (
                            <TalentCard
                              talent={message.talents[0]}
                              variant="detailed"
                            />
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                              {message.talents.map(talent => (
                                <TalentCard
                                  key={talent.id}
                                  talent={talent}
                                  variant="compact"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Typing Indicator */}
          {isTyping && (
            <div className="mt-4">
              <MessageBubble
                content=""
                sender="ai"
                isTyping={true}
                aiAvatarUrl={aiAvatar}
              />
            </div>
          )}

          {/* Bottom Reference for Auto-scroll */}
          <div ref={bottomRef} className="h-0" />
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 shadow-lg"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

/**
 * MessageListSkeleton component for loading state
 */
export const MessageListSkeleton: React.FC<{
  className?: string
}> = ({ className }) => {
  return (
    <div className={cn("h-full", className)}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* User message skeleton */}
        <div className="flex gap-3 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="max-w-[70%] space-y-1">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            <div className="h-20 w-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          </div>
        </div>

        {/* AI message skeleton */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="max-w-[70%] space-y-1">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-32 w-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          </div>
        </div>

        {/* Talent card skeleton */}
        <div className="ml-11">
          <div className="h-48 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}