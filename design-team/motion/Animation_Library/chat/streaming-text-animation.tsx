/**
 * Streaming Text Animation with Typewriter Effect
 * Realistic AI text streaming with cinema-grade timing
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { duration, easing } from '../core/animation-tokens'

interface StreamingTextAnimationProps {
  text: string
  speed?: number // Characters per second
  onComplete?: () => void
  showCursor?: boolean
  variant?: 'typewriter' | 'fade-in' | 'slide-in' | 'cinematic'
  enableSound?: boolean
}

export function StreamingTextAnimation({
  text,
  speed = 30,
  onComplete,
  showCursor = true,
  variant = 'cinematic',
  enableSound = false
}: StreamingTextAnimationProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [showBlinkingCursor, setShowBlinkingCursor] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Create typing sound effect
  const createTypingSound = () => {
    if (!enableSound || !audioContextRef.current) return
    
    const audioContext = audioContextRef.current
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800 + Math.random() * 200, audioContext.currentTime)
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  // Initialize audio context
  useEffect(() => {
    if (enableSound && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [enableSound])

  // Main streaming logic
  useEffect(() => {
    if (currentIndex < text.length) {
      const char = text[currentIndex]
      const delay = calculateDelay(char, speed)
      
      intervalRef.current = setTimeout(() => {
        setDisplayedText(prev => prev + char)
        setCurrentIndex(prev => prev + 1)
        
        // Play typing sound
        if (char !== ' ') {
          createTypingSound()
        }
      }, delay)
    } else if (currentIndex >= text.length && !isComplete) {
      setIsComplete(true)
      onComplete?.()
      
      // Hide cursor after completion
      if (showCursor) {
        setTimeout(() => setShowBlinkingCursor(false), 2000)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [currentIndex, text, speed, isComplete, onComplete, showCursor])

  // Calculate typing delay based on character type
  const calculateDelay = (char: string, baseSpeed: number) => {
    const baseDelay = 1000 / baseSpeed
    
    // Add natural pauses for punctuation
    if (char === '.') return baseDelay * 3
    if (char === ',' || char === ';') return baseDelay * 2
    if (char === '!' || char === '?') return baseDelay * 2.5
    if (char === '\n') return baseDelay * 4
    if (char === ' ') return baseDelay * 0.5
    
    // Add slight randomness for natural feel
    return baseDelay * (0.8 + Math.random() * 0.4)
  }

  // Cursor animation variants
  const cursorVariants = {
    blink: {
      opacity: [1, 0, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    steady: {
      opacity: 1
    }
  }

  // Text animation variants for different styles
  const textVariants = {
    typewriter: {
      hidden: { opacity: 1 },
      visible: { opacity: 1 }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { duration: 0.1 }
      }
    },
    slideIn: {
      hidden: { opacity: 0, x: -5 },
      visible: { 
        opacity: 1, 
        x: 0,
        transition: { 
          duration: 0.15,
          ease: easing.entrance
        }
      }
    },
    cinematic: {
      hidden: { 
        opacity: 0, 
        scale: 0.98,
        filter: "blur(1px)"
      },
      visible: { 
        opacity: 1, 
        scale: 1,
        filter: "blur(0px)",
        transition: { 
          duration: 0.2,
          ease: easing.cinematic
        }
      }
    }
  }

  // Word-by-word animation for cinematic variant
  const renderCinematicText = () => {
    const words = displayedText.split(' ')
    
    return (
      <span className="inline-block">
        {words.map((word, index) => (
          <motion.span
            key={`word-${index}-${word}`}
            initial="hidden"
            animate="visible"
            variants={textVariants.cinematic}
            className="inline-block mr-1"
          >
            {word}
            {index < words.length - 1 && ' '}
          </motion.span>
        ))}
      </span>
    )
  }

  // Character-by-character animation for other variants
  const renderCharacterText = () => {
    return (
      <span className="inline-block">
        {displayedText.split('').map((char, index) => (
          <motion.span
            key={`char-${index}`}
            initial="hidden"
            animate="visible"
            variants={textVariants[variant as keyof typeof textVariants]}
            className={char === ' ' ? 'inline-block w-1' : 'inline-block'}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </span>
    )
  }

  return (
    <div className="inline-block relative">
      {/* Text Content */}
      <motion.div
        className="inline-block whitespace-pre-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.fast / 1000 }}
      >
        {variant === 'cinematic' ? renderCinematicText() : renderCharacterText()}
        
        {/* Typing Cursor */}
        <AnimatePresence>
          {showCursor && showBlinkingCursor && (
            <motion.span
              variants={cursorVariants}
              animate="blink"
              exit={{ opacity: 0 }}
              className="inline-block w-0.5 h-5 bg-purple-500 ml-0.5 align-text-bottom"
              style={{ backgroundColor: 'currentColor' }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Completion Effects */}
      <AnimatePresence>
        {isComplete && variant === 'cinematic' && (
          <>
            {/* Sparkle effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1.2, 0],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 1.5,
                ease: easing.dramatic
              }}
              className="absolute -top-2 -right-2 w-3 h-3 bg-purple-400 rounded-full"
            />
            
            {/* Glow effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.3, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2,
                ease: easing.organic
              }}
              className="absolute inset-0 bg-purple-500/20 rounded blur-sm -z-10"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Enhanced hook for streaming text with word-level control
export function useStreamingText(
  fullText: string,
  options: {
    speed?: number
    pauseOnPunctuation?: boolean
    enableSound?: boolean
    onWordComplete?: (word: string, index: number) => void
  } = {}
) {
  const [streamedText, setStreamedText] = useState('')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const words = fullText.split(' ')

  const startStreaming = () => {
    setIsStreaming(true)
    setStreamedText('')
    setCurrentWordIndex(0)
    setIsComplete(false)
  }

  const stopStreaming = () => {
    setIsStreaming(false)
    setStreamedText(fullText)
    setIsComplete(true)
  }

  const resetStreaming = () => {
    setStreamedText('')
    setCurrentWordIndex(0)
    setIsStreaming(false)
    setIsComplete(false)
  }

  useEffect(() => {
    if (!isStreaming || currentWordIndex >= words.length) {
      if (currentWordIndex >= words.length && !isComplete) {
        setIsComplete(true)
      }
      return
    }

    const word = words[currentWordIndex]
    const delay = (word.length * (1000 / (options.speed || 30))) + 
                  (options.pauseOnPunctuation && /[.!?]/.test(word) ? 500 : 0)

    const timer = setTimeout(() => {
      setStreamedText(prev => prev + (prev ? ' ' : '') + word)
      options.onWordComplete?.(word, currentWordIndex)
      setCurrentWordIndex(prev => prev + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [isStreaming, currentWordIndex, words, options])

  return {
    streamedText,
    isStreaming,
    isComplete,
    startStreaming,
    stopStreaming,
    resetStreaming,
    progress: currentWordIndex / words.length
  }
}