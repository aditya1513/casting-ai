'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Paperclip, Mic, Smile, X } from 'lucide-react'
import { useWebSocket } from '@/lib/websocket-context'
import { useChatStore } from '@/lib/stores/chat-store'
import { toast } from 'sonner'

interface MessageInputProps {
  conversationId: string
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage, startTyping, stopTyping, connected } = useWebSocket()
  const { addMessage } = useChatStore()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return
    if (!connected) {
      toast.error('Not connected to server. Please wait...')
      return
    }

    // Send the message
    sendMessage(conversationId, message.trim())
    
    // Clear input
    setMessage('')
    setAttachments([])
    stopTyping(conversationId)
    
    // Focus back on input
    textareaRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Start typing indicator
    startTyping(conversationId)

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId)
    }, 2000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files])
      toast.success(`${files.length} file(s) attached`)
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-slate-900 p-3 md:p-4 safe-area-inset-bottom">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((file, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-800 rounded-lg px-2 py-1 md:px-3 md:py-2 flex items-center gap-1 md:gap-2"
            >
              <Paperclip size={12} className="text-slate-400 md:size-14" />
              <span className="text-xs md:text-sm text-slate-300 max-w-[100px] md:max-w-[150px] truncate">
                {file.name}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={12} className="md:size-14" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Attachment Button - Hidden on small screens */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          className="hidden sm:flex p-2 text-slate-400 hover:text-purple-400 transition-colors"
          title="Attach file"
        >
          <Paperclip size={18} className="md:size-20" />
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
        />

        {/* Text Input */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 focus-within:border-purple-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              handleTyping()
            }}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="w-full px-3 py-2 md:px-4 md:py-3 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none max-h-24 md:max-h-32 text-sm md:text-base"
            rows={1}
          />
        </div>

        {/* Action Buttons Container */}
        <div className="flex items-center gap-1">
          {/* Emoji Button - Hidden on mobile */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="hidden md:flex p-2 text-slate-400 hover:text-purple-400 transition-colors"
            title="Add emoji"
          >
            <Smile size={18} className="md:size-20" />
          </motion.button>

          {/* Voice Button - Optional on mobile */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsRecording(!isRecording)
              toast.info(isRecording ? 'Recording stopped' : 'Recording started')
            }}
            className={`p-1.5 md:p-2 transition-colors ${
              isRecording
                ? 'text-red-500 animate-pulse'
                : 'text-slate-400 hover:text-purple-400'
            }`}
            title="Voice message"
          >
            <Mic size={16} className="md:size-20" />
          </motion.button>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!connected || (!message.trim() && attachments.length === 0)}
            className="p-1.5 md:p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Send message"
          >
            <Send size={16} className="md:size-20" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}