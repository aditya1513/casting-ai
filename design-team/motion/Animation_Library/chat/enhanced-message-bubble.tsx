/**
 * Enhanced Message Bubble with Cinematic Animations
 * Hollywood-grade entrance effects and micro-interactions
 */

'use client'

import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { Check, CheckCheck, Bot, User as UserIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { duration, easing, variants, colors } from '../core/animation-tokens'

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
  isStreaming?: boolean
}

interface EnhancedMessageBubbleProps {
  message: Message
  index: number
  isLatest?: boolean
}

export function EnhancedMessageBubble({ message, index, isLatest }: EnhancedMessageBubbleProps) {
  const { user } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-10%" })
  const [isHovered, setIsHovered] = useState(false)
  const [showSparkles, setShowSparkles] = useState(false)
  
  const isOwnMessage = user?.id === message.sender.id
  const isAI = message.type === 'ai'
  const isSystem = message.type === 'system'

  // Trigger sparkle effect for AI messages
  useEffect(() => {
    if (isAI && isLatest) {
      const timer = setTimeout(() => setShowSparkles(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isAI, isLatest])

  // Cinema-style entrance animation variants
  const messageVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      rotateX: -15,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 20,
        mass: 1,
        delay: index * 0.05, // Staggered entrance
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: duration.fast / 1000,
        ease: easing.exit
      }
    }
  }

  // Avatar animation variants
  const avatarVariants = {
    hidden: { 
      scale: 0,
      rotate: -180,
      opacity: 0 
    },
    visible: { 
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: (index * 0.05) + 0.1
      }
    }
  }

  // Content animation for streaming text
  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: message.isStreaming ? 0 : duration.base / 1000,
        ease: easing.entrance
      }
    }
  }

  // Hover interaction variants
  const hoverVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  }

  // Sparkle animation for AI messages
  const sparkleVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3,
        ease: "easeInOut"
      }
    }
  }

  if (isSystem) {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={messageVariants}
        className="flex items-center justify-center my-4"
      >
        <motion.div 
          className="bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-slate-400 border border-slate-700/50"
          whileHover={{ scale: 1.05, backgroundColor: "rgba(30, 41, 59, 0.7)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{ duration: duration.smooth / 1000, ease: easing.entrance }}
            className="overflow-hidden"
          >
            {message.content}
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      exit="exit"
      variants={messageVariants}
      className={cn(
        'flex items-end gap-3 relative group',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Animated Avatar */}
      <motion.div 
        variants={avatarVariants}
        className="flex-shrink-0 relative"
      >
        {message.sender.avatar ? (
          <motion.img
            src={message.sender.avatar}
            alt={message.sender.name}
            className="w-10 h-10 rounded-full border-2 border-transparent"
            whileHover={{ 
              borderColor: isAI ? "#8B5CF6" : "#6366F1",
              scale: 1.1 
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        ) : (
          <motion.div 
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden",
              isAI 
                ? "bg-gradient-to-br from-purple-600 to-purple-700" 
                : "bg-gradient-to-br from-slate-700 to-slate-800"
            )}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {isAI ? (
              <Bot size={20} className="text-white relative z-10" />
            ) : (
              <UserIcon size={20} className="text-slate-300 relative z-10" />
            )}
            
            {/* Animated background for AI */}
            {isAI && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
              />
            )}
          </motion.div>
        )}
        
        {/* AI Sparkle Effect */}
        <AnimatePresence>
          {isAI && showSparkles && (
            <motion.div
              variants={sparkleVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute -top-1 -right-1"
            >
              <Sparkles size={16} className="text-yellow-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Message Content Container */}
      <motion.div
        variants={hoverVariants}
        initial="initial"
        whileHover="hover"
        className={cn(
          'flex flex-col max-w-[75%] relative',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name with Typing Animation */}
        {!isOwnMessage && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (index * 0.05) + 0.2, duration: duration.base / 1000 }}
            className="text-xs text-slate-400 mb-2 ml-3 flex items-center gap-2"
          >
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ duration: duration.smooth / 1000, ease: easing.entrance }}
              className="overflow-hidden whitespace-nowrap"
            >
              {message.sender.name}
            </motion.span>
            {message.sender.role && (
              <motion.span 
                className="text-purple-400 text-xs px-2 py-1 bg-purple-900/30 rounded-full backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (index * 0.05) + 0.4 }}
              >
                {message.sender.role}
              </motion.span>
            )}
          </motion.div>
        )}

        {/* Enhanced Message Bubble */}
        <motion.div
          variants={contentVariants}
          className={cn(
            'rounded-2xl px-5 py-3 break-words relative overflow-hidden shadow-lg',
            'backdrop-blur-sm border border-opacity-20',
            isOwnMessage
              ? 'bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white border-purple-400'
              : isAI
              ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white border-purple-500'
              : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-600'
          )}
          whileHover={{
            boxShadow: isAI 
              ? colors.purpleGlow
              : isOwnMessage 
              ? colors.blueGlow
              : colors.softShadow
          }}
          transition={{ duration: duration.fast / 1000 }}
        >
          {/* Shimmer effect for AI messages */}
          {isAI && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 5,
                ease: "linear"
              }}
            />
          )}

          {/* Message Text with Typewriter Effect */}
          <motion.p 
            className="whitespace-pre-wrap relative z-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ 
              duration: message.isStreaming ? 0.1 : duration.base / 1000,
              ease: easing.entrance 
            }}
          >
            {message.content}
          </motion.p>

          {/* Enhanced Metadata */}
          <AnimatePresence>
            {message.metadata && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: duration.smooth / 1000 }}
                className="mt-3 pt-3 border-t border-white/20"
              >
                {message.metadata.suggestions && (
                  <div className="space-y-2">
                    <motion.p 
                      className="text-xs opacity-70 mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ delay: 0.3 }}
                    >
                      Suggestions:
                    </motion.p>
                    {message.metadata.suggestions.map((suggestion: string, idx: number) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ 
                          scale: 1.02, 
                          backgroundColor: "rgba(255, 255, 255, 0.3)",
                          x: 5
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ 
                          delay: idx * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                        className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-white/10 
                                 border border-white/20 hover:border-white/40 transition-all duration-200"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Enhanced Time and Status */}
        <motion.div 
          className={cn(
            'flex items-center gap-2 mt-2 text-xs text-slate-500',
            isOwnMessage ? 'flex-row-reverse mr-3' : 'ml-3'
          )}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: isHovered ? 1 : 0.6, y: 0 }}
          transition={{ duration: duration.fast / 1000 }}
        >
          <motion.span
            whileHover={{ color: "#8B5CF6" }}
            transition={{ duration: duration.micro / 1000 }}
          >
            {format(new Date(message.createdAt), 'HH:mm')}
          </motion.span>
          
          {isOwnMessage && (
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                delay: (index * 0.05) + 0.6
              }}
              className="text-slate-500"
            >
              {message.read ? (
                <motion.div
                  whileHover={{ scale: 1.2, color: "#8B5CF6" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CheckCheck size={16} className="text-purple-400" />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Check size={16} />
                </motion.div>
              )}
            </motion.span>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}