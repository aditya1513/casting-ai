/**
 * Cinematic Typing Indicator with Advanced Animations
 * Movie-grade waiting experience with particle effects
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Bot, Sparkles, Zap } from 'lucide-react'
import { duration, easing, colors } from '../core/animation-tokens'

interface TypingUser {
  userId: string
  userName: string
  conversationId: string
  type?: 'user' | 'ai'
  avatar?: string
}

interface CinematicTypingIndicatorProps {
  users: TypingUser[]
  variant?: 'standard' | 'cinematic' | 'minimal'
  showParticles?: boolean
}

export function CinematicTypingIndicator({ 
  users, 
  variant = 'cinematic',
  showParticles = true 
}: CinematicTypingIndicatorProps) {
  const [currentDotCount, setCurrentDotCount] = useState(1)
  const [showEffects, setShowEffects] = useState(false)
  
  if (users.length === 0) return null

  const primaryUser = users[0]
  const isAI = primaryUser.type === 'ai'
  const hasMultipleUsers = users.length > 1

  // Animate dot sequence
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDotCount(prev => (prev >= 3 ? 1 : prev + 1))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Show particle effects for AI typing
  useEffect(() => {
    if (isAI && showParticles) {
      const timer = setTimeout(() => setShowEffects(true), 200)
      return () => clearTimeout(timer)
    }
  }, [isAI, showParticles])

  const displayText = hasMultipleUsers
    ? `${primaryUser.userName} and ${users.length - 1} others are typing`
    : `${primaryUser.userName} is typing`

  // Container animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.9,
      filter: "blur(4px)"
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: duration.fast / 1000,
        ease: easing.exit
      }
    }
  }

  // Dot animation variants
  const dotVariants = {
    initial: { 
      y: 0, 
      opacity: 0.4,
      scale: 0.8
    },
    animate: { 
      y: [-8, 0, -8], 
      opacity: [0.4, 1, 0.4],
      scale: [0.8, 1.2, 0.8],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: easing.organic,
      }
    }
  }

  // Particle animation variants
  const particleVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0, 
      y: 0 
    },
    visible: (i: number) => ({
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      y: [0, -20, -40],
      x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
        delay: i * 0.2,
        ease: "easeOut"
      }
    })
  }

  // Render variants based on type
  const renderStandardVariant = () => (
    <motion.div
      variants={containerVariants}
      className="px-4 py-2"
    >
      <div className="flex items-center gap-3">
        <motion.div 
          className="bg-slate-800/80 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3 border border-slate-700/50"
          whileHover={{ 
            scale: 1.02,
            backgroundColor: "rgba(30, 41, 59, 0.9)",
            borderColor: "rgba(139, 92, 246, 0.3)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${isAI ? 'bg-purple-500' : 'bg-blue-500'}`}
                variants={dotVariants}
                initial="initial"
                animate="animate"
                style={{ 
                  animationDelay: `${i * 0.2}s`,
                  opacity: i < currentDotCount ? 1 : 0.3
                }}
              />
            ))}
          </div>
          <span className="text-sm text-slate-300">{displayText}</span>
        </motion.div>
      </div>
    </motion.div>
  )

  const renderCinematicVariant = () => (
    <motion.div
      variants={containerVariants}
      className="px-4 py-3 relative"
    >
      <motion.div 
        className="relative bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 
                   backdrop-blur-md rounded-3xl px-6 py-4 border border-slate-700/50 
                   shadow-lg overflow-hidden"
        whileHover={{ 
          scale: 1.02,
          boxShadow: isAI ? colors.purpleGlow : colors.blueGlow
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-purple-600/10"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <div className="flex items-center gap-4 relative z-10">
          {/* Enhanced Avatar */}
          <motion.div
            className="relative"
            animate={{
              rotate: isAI ? [0, 5, -5, 0] : 0
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {primaryUser.avatar ? (
              <motion.img
                src={primaryUser.avatar}
                alt={primaryUser.userName}
                className="w-8 h-8 rounded-full border-2 border-purple-500/50"
                animate={{
                  borderColor: [
                    "rgba(139, 92, 246, 0.5)",
                    "rgba(139, 92, 246, 0.8)",
                    "rgba(139, 92, 246, 0.5)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            ) : (
              <motion.div 
                className={`w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden
                           ${isAI 
                             ? 'bg-gradient-to-br from-purple-600 to-purple-700' 
                             : 'bg-gradient-to-br from-blue-600 to-blue-700'}`}
                animate={{
                  boxShadow: [
                    `0 0 0 0 ${isAI ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                    `0 0 0 8px ${isAI ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)'}`,
                    `0 0 0 0 ${isAI ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isAI ? (
                  <Bot size={16} className="text-white relative z-10" />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 bg-white rounded-full"
                  />
                )}
                
                {/* Rotating background effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            )}

            {/* Particle effects for AI */}
            <AnimatePresence>
              {isAI && showEffects && showParticles && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      variants={particleVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      custom={i}
                      className="absolute top-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full"
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Enhanced Dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    isAI 
                      ? 'bg-gradient-to-r from-purple-400 to-pink-400' 
                      : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                  }`}
                  variants={dotVariants}
                  initial="initial"
                  animate="animate"
                  style={{ 
                    animationDelay: `${i * 0.3}s`,
                  }}
                  whileHover={{ scale: 1.3 }}
                />
              ))}
            </div>

            {/* Enhanced Text */}
            <motion.div
              className="ml-2 text-slate-300"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.span
                className="text-sm font-medium"
                animate={{
                  color: [
                    "#cbd5e1", // slate-300
                    isAI ? "#a855f7" : "#3b82f6", // purple-500 or blue-500
                    "#cbd5e1"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {displayText}
              </motion.span>
              
              {/* Typing dots */}
              <motion.span
                className="ml-1 text-slate-400"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {'.'.repeat(currentDotCount)}
              </motion.span>
            </motion.div>
          </div>

          {/* AI Enhancement Icon */}
          {isAI && (
            <motion.div
              className="ml-auto"
              animate={{ 
                rotate: [0, 15, -15, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Sparkles size={14} className="text-purple-400" />
            </motion.div>
          )}
        </div>

        {/* Progress bar */}
        <motion.div 
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </motion.div>
    </motion.div>
  )

  const renderMinimalVariant = () => (
    <motion.div
      variants={containerVariants}
      className="px-4 py-1"
    >
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-slate-500 rounded-full"
              variants={dotVariants}
              initial="initial"
              animate="animate"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">{displayText}</span>
      </div>
    </motion.div>
  )

  const variantComponents = {
    standard: renderStandardVariant,
    cinematic: renderCinematicVariant,
    minimal: renderMinimalVariant,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`typing-${users.length}-${variant}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {variantComponents[variant]()}
      </motion.div>
    </AnimatePresence>
  )
}