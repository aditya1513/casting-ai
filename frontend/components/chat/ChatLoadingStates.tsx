'use client'

import { motion } from 'framer-motion'
import { Loader2, MessageSquare, Send, Zap } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'purple' | 'green'
}

export function LoadingSpinner({ size = 'md', variant = 'default' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  const colorClasses = {
    default: 'text-slate-400',
    purple: 'text-purple-500',
    green: 'text-green-500'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[variant]}`} />
  )
}

export function MessageLoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3 md:p-4"
    >
      <div className="w-8 h-8 bg-slate-700 rounded-full animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-700 rounded animate-pulse w-1/4" />
        <div className="space-y-1">
          <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-700 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-slate-700 rounded animate-pulse w-2/3" />
        </div>
      </div>
    </motion.div>
  )
}

export function ConversationLoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800"
        >
          <div className="w-10 h-10 bg-slate-700 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-700 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-slate-700 rounded animate-pulse w-16" />
            </div>
            <div className="h-3 bg-slate-700 rounded animate-pulse w-2/3" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

interface TypingIndicatorProps {
  message?: string
  className?: string
}

export function ChatTypingIndicator({ message = "AI is thinking...", className = "" }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-center gap-2 p-3 mx-3 md:mx-4 mb-2 bg-slate-800/50 rounded-lg ${className}`}
    >
      <div className="flex gap-1">
        <motion.div
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
        />
      </div>
      <span className="text-sm text-slate-400">{message}</span>
    </motion.div>
  )
}

interface SendingIndicatorProps {
  message: string
}

export function MessageSendingIndicator({ message }: SendingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-3 p-3 md:p-4"
    >
      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
        <Send size={14} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="bg-purple-600 text-white rounded-xl px-4 py-2 max-w-xs md:max-w-md opacity-75">
          <p className="text-sm md:text-base">{message}</p>
          <div className="flex items-center gap-1 mt-1">
            <LoadingSpinner size="sm" variant="default" />
            <span className="text-xs text-purple-200">Sending...</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function EmptyStateMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        animate={{ 
          rotateY: [0, 360],
          scale: [1, 1.1, 1] 
        }}
        transition={{ 
          rotateY: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4"
      >
        <MessageSquare className="text-white" size={32} />
      </motion.div>
      <h3 className="text-lg font-semibold text-white mb-2">Start a conversation</h3>
      <p className="text-slate-400 max-w-md">
        Ask me anything about casting, talent discovery, or production needs. 
        I'm here to help you find the perfect talent for your project.
      </p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 flex items-center gap-2 text-sm text-slate-500"
      >
        <Zap size={16} />
        <span>Powered by Claude AI</span>
      </motion.div>
    </motion.div>
  )
}

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  message?: string
}

export function ConnectionStatus({ status, message }: ConnectionStatusProps) {
  const statusConfig = {
    connecting: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700',
      icon: <LoadingSpinner size="sm" variant="default" />,
      defaultMessage: 'Connecting to server...'
    },
    connected: {
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
      icon: <div className="w-2 h-2 bg-green-400 rounded-full" />,
      defaultMessage: 'Connected'
    },
    disconnected: {
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      icon: <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />,
      defaultMessage: 'Disconnected'
    },
    error: {
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      icon: <div className="w-2 h-2 bg-red-400 rounded-full" />,
      defaultMessage: 'Connection error'
    }
  }

  const config = statusConfig[status]
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`${config.bgColor} ${config.borderColor} border-b px-3 py-2 md:px-4`}
    >
      <div className={`flex items-center gap-2 text-xs md:text-sm ${config.color}`}>
        {config.icon}
        <span>{message || config.defaultMessage}</span>
      </div>
    </motion.div>
  )
}