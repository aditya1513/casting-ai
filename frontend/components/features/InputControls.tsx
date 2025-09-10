"use client"

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { VoiceControls } from '@/components/castmatch/VoiceControls'
import { 
  Send, 
  Paperclip, 
  Image, 
  FileText, 
  X,
  Smile,
  AtSign,
  Hash,
  Sparkles
} from 'lucide-react'

export interface InputControlsProps {
  /** Callback when message is sent */
  onSendMessage: (message: string, attachments?: File[]) => void
  /** Callback when typing starts */
  onTypingStart?: () => void
  /** Callback when typing stops */
  onTypingStop?: () => void
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Max message length */
  maxLength?: number
  /** Enable file attachments */
  enableAttachments?: boolean
  /** Enable voice input */
  enableVoice?: boolean
  /** Enable suggestions */
  enableSuggestions?: boolean
  /** Suggested prompts */
  suggestions?: string[]
  /** Custom class name */
  className?: string
  /** Variant style */
  variant?: 'default' | 'minimal' | 'floating'
}

/**
 * InputControls component for message input with attachments and voice
 * Combines text input, file upload, and voice recording capabilities
 */
export const InputControls: React.FC<InputControlsProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  placeholder = "Ask about talent, roles, or your projects...",
  disabled = false,
  loading = false,
  maxLength = 4000,
  enableAttachments = true,
  enableVoice = true,
  enableSuggestions = true,
  suggestions = [
    "Find actors for a lead role",
    "Show me talent with theater experience",
    "Schedule auditions for next week",
    "What's the status of my current projects?",
  ],
  className,
  variant = 'default',
}) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Handle typing indicators
  useEffect(() => {
    if (message && !isTyping) {
      setIsTyping(true)
      onTypingStart?.()
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (message) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        onTypingStop?.()
      }, 1000)
    } else {
      setIsTyping(false)
      onTypingStop?.()
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, isTyping, onTypingStart, onTypingStop])

  // Handle send message
  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return
    if (disabled || loading) return

    onSendMessage(message.trim(), attachments)
    setMessage('')
    setAttachments([])
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }

    // Navigate suggestions with arrow keys
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
      } else if (e.key === 'Tab' && selectedSuggestion >= 0) {
        e.preventDefault()
        setMessage(suggestions[selectedSuggestion])
        setShowSuggestions(false)
        setSelectedSuggestion(-1)
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedSuggestion(-1)
      }
    }

    // Show suggestions on '/'
    if (e.key === '/' && message === '') {
      e.preventDefault()
      setShowSuggestions(true)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files].slice(0, 5)) // Max 5 files
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Handle voice recording
  const handleVoiceRecording = (audioBlob: Blob) => {
    // Convert audio to file and add as attachment
    const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
      type: 'audio/webm',
    })
    setAttachments(prev => [...prev, audioFile])
  }

  // Handle voice transcription
  const handleTranscription = (text: string, isFinal: boolean) => {
    if (isFinal) {
      setMessage(prev => prev + ' ' + text)
    }
  }

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2 p-2", className)}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={placeholder}
          disabled={disabled || loading}
          maxLength={maxLength}
          className="flex-1 px-3 py-2 bg-transparent border-0 outline-none text-sm"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSend}
          disabled={disabled || loading || !message.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn(
      "relative",
      variant === 'floating' && "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700",
      className
    )}>
      {/* Suggestions */}
      {enableSuggestions && showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions</p>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                selectedSuggestion === index && "bg-gray-100 dark:bg-gray-800"
              )}
              onClick={() => {
                setMessage(suggestion)
                setShowSuggestions(false)
                textareaRef.current?.focus()
              }}
            >
              <Sparkles className="w-3 h-3 inline-block mr-2 text-purple-500" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs"
              >
                {file.type.startsWith('image/') ? (
                  <Image className="w-3 h-3" />
                ) : file.type.startsWith('audio/') ? (
                  <Mic className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex items-end gap-2 p-4">
        {/* Attachment Button */}
        {enableAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || loading}
              aria-label="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(false)}
            placeholder={placeholder}
            disabled={disabled || loading}
            maxLength={maxLength}
            rows={1}
            className={cn(
              "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none outline-none transition-all",
              "focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-900",
              "min-h-[48px] max-h-[140px]",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500"
            )}
            style={{ height: 'auto' }}
          />
          
          {/* Character Count */}
          {message.length > maxLength * 0.8 && (
            <span className="absolute bottom-2 right-2 text-xs text-gray-400">
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Voice Controls */}
        {enableVoice && (
          <VoiceControls
            variant="compact"
            onRecordingStop={handleVoiceRecording}
            onTranscription={handleTranscription}
            enableTranscription={true}
            disabled={disabled || loading}
          />
        )}

        {/* Send Button */}
        <Button
          size="icon"
          variant={message.trim() || attachments.length ? "primary" : "ghost"}
          onClick={handleSend}
          disabled={disabled || loading || (!message.trim() && attachments.length === 0)}
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Quick Actions */}
      {variant === 'default' && (
        <div className="px-4 pb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <button className="hover:text-gray-700 dark:hover:text-gray-300">
            <AtSign className="w-3 h-3 inline mr-1" />
            Mention
          </button>
          <button className="hover:text-gray-700 dark:hover:text-gray-300">
            <Hash className="w-3 h-3 inline mr-1" />
            Reference
          </button>
          <button className="hover:text-gray-700 dark:hover:text-gray-300">
            <Smile className="w-3 h-3 inline mr-1" />
            Emoji
          </button>
          <span className="ml-auto">
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd> to send
          </span>
        </div>
      )}
    </div>
  )
}