'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useLayoutContext } from './CastMatchLayoutProvider'
import { Mic, Paperclip, Send, StopCircle } from 'lucide-react'

/**
 * CastMatch Input Area Component
 * Fixed bottom positioning with dynamic height and centered layout
 * Implements 80px min height, 700px max width
 */

interface InputAreaProps {
  onSendMessage?: (message: string) => void
  onAttachment?: () => void
  onVoiceRecord?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CastMatchInputArea({
  onSendMessage,
  onAttachment,
  onVoiceRecord,
  placeholder = "Type your message or describe the talent you're looking for...",
  className = '',
  disabled = false
}: InputAreaProps) {
  const {
    sidebarWidth,
    isMobile,
    setInputAreaHeight
  } = useLayoutContext()
  
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to recalculate
      textareaRef.current.style.height = '80px'
      
      // Calculate new height based on scroll height
      const scrollHeight = textareaRef.current.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, 80), 140)
      
      textareaRef.current.style.height = `${newHeight}px`
      
      // Update global input area height
      setInputAreaHeight(newHeight + 40) // Add padding
    }
  }, [message, setInputAreaHeight])
  
  // Handle send message
  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim())
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '80px'
      }
    }
  }
  
  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  // Toggle voice recording
  const handleVoiceToggle = () => {
    setIsRecording(!isRecording)
    if (onVoiceRecord) {
      onVoiceRecord()
    }
  }
  
  // Calculate input area positioning
  const getInputAreaStyles = (): React.CSSProperties => {
    return {
      position: 'fixed',
      bottom: 0,
      left: isMobile ? 0 : `${sidebarWidth}px`,
      right: 0,
      width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
      minHeight: '120px', // 80px input + 40px padding
      zIndex: 1020,
      transition: 'all 300ms ease',
      willChange: 'left, width',
      // No background or border as per spec
      background: 'transparent'
    }
  }
  
  return (
    <>
      {/* Transparent spacer to prevent content overlap */}
      <div 
        className="input-area-spacer"
        style={{ height: '160px' }} // Total clearance space
      />
      
      {/* Fixed Input Area */}
      <div
        ref={containerRef}
        className={`input-area ${className}`}
        style={getInputAreaStyles()}
        role="region"
        aria-label="Message input area"
      >
        <div className="input-container mx-auto px-6" style={{ maxWidth: '700px' }}>
          <div 
            className={`
              input-wrapper 
              bg-white 
              rounded-2xl 
              shadow-lg
              border
              ${isFocused ? 'border-gray-400 shadow-xl' : 'border-gray-200'}
              transition-all duration-200
            `}
          >
            <div className="flex items-end gap-2 p-3">
              {/* Attachment button */}
              <button
                onClick={onAttachment}
                disabled={disabled}
                className="p-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5 text-gray-500" />
              </button>
              
              {/* Text input area */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="
                    w-full 
                    px-4 
                    py-3
                    text-gray-900 
                    placeholder-gray-400
                    resize-none 
                    focus:outline-none
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    overflow-y-auto
                    scrollbar-none
                  "
                  style={{
                    minHeight: '80px',
                    maxHeight: '140px',
                    lineHeight: '1.5',
                    fontSize: '16px'
                  }}
                  aria-label="Message input"
                />
              </div>
              
              {/* Voice recording button */}
              <button
                onClick={handleVoiceToggle}
                disabled={disabled}
                className={`
                  p-2 
                  rounded-lg 
                  transition-all
                  disabled:opacity-50 
                  disabled:cursor-not-allowed
                  ${isRecording 
                    ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                    : 'hover:bg-gray-50 text-gray-500'
                  }
                `}
                aria-label={isRecording ? "Stop recording" : "Start voice recording"}
              >
                {isRecording ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
              
              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={disabled || !message.trim()}
                className={`
                  p-2 
                  rounded-lg 
                  transition-all
                  ${message.trim() 
                    ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                  disabled:opacity-50 
                  disabled:cursor-not-allowed
                `}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Character count indicator */}
            {message.length > 500 && (
              <div className="px-6 pb-2 text-xs text-gray-500 text-right">
                {message.length} / 1000 characters
              </div>
            )}
          </div>
          
          {/* Helper text */}
          <div className="mt-2 px-4 text-xs text-gray-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Minimal Input Area Component
 * For simpler use cases without all features
 */
interface MinimalInputAreaProps {
  onSend: (message: string) => void
  placeholder?: string
  className?: string
}

export function MinimalInputArea({
  onSend,
  placeholder = "Type a message...",
  className = ''
}: MinimalInputAreaProps) {
  const [message, setMessage] = useState('')
  const { sidebarWidth, isMobile } = useLayoutContext()
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message.trim())
      setMessage('')
    }
  }
  
  return (
    <form
      onSubmit={handleSubmit}
      className={`fixed bottom-0 bg-white border-t border-gray-200 ${className}`}
      style={{
        left: isMobile ? 0 : `${sidebarWidth}px`,
        right: 0,
        width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        zIndex: 1020
      }}
    >
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  )
}