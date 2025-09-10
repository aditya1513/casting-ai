/**
 * Cinematic Loading Components
 * Hollywood-inspired loading animations with narrative elements
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { duration, easing, colors } from '../core/animation-tokens'
import { Film, Camera, Zap, Star, Sparkles } from 'lucide-react'

export type LoaderVariant = 
  | 'filmReel'
  | 'spotlight'
  | 'cameraShutter'
  | 'countdown'
  | 'premiere'
  | 'director'
  | 'redCarpet'
  | 'actionClap'

interface CinematicLoaderProps {
  variant?: LoaderVariant
  message?: string
  progress?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showProgress?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
}

export function CinematicLoader({
  variant = 'filmReel',
  message = 'Loading...',
  progress = 0,
  size = 'md',
  showProgress = false,
  className = ''
}: CinematicLoaderProps) {
  const [currentFrame, setCurrentFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % 8)
    }, 125)
    return () => clearInterval(interval)
  }, [])

  const renderFilmReel = () => (
    <motion.div
      className={`relative ${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      {/* Film reel */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-4 border-slate-600">
        {/* Film holes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-slate-900 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              transformOrigin: '0 0',
              transform: `rotate(${i * 45}deg) translate(${size === 'sm' ? '16px' : size === 'md' ? '20px' : size === 'lg' ? '32px' : '40px'}, -4px)`,
            }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
          />
        ))}
        
        {/* Center hub */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
          <Film className="text-white" size={size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 24 : 32} />
        </div>
      </div>
    </motion.div>
  )

  const renderSpotlight = () => (
    <motion.div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Spotlight beam */}
      <motion.div
        className="absolute inset-0 bg-gradient-conic from-transparent via-purple-500/30 to-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Center light */}
      <motion.div
        className="absolute inset-2 rounded-full bg-gradient-radial from-white via-purple-200 to-purple-500"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Rays */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 bg-gradient-to-t from-transparent to-purple-400"
          style={{
            height: '50%',
            left: '50%',
            top: '0',
            transformOrigin: 'bottom center',
            transform: `rotate(${i * 60}deg)`,
          }}
          animate={{ 
            scaleY: [0.5, 1, 0.5],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
        />
      ))}
    </motion.div>
  )

  const renderCameraShutter = () => (
    <motion.div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-slate-600">
        {/* Shutter blades */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-2 bg-slate-700"
            style={{
              clipPath: 'polygon(50% 50%, 60% 10%, 100% 50%)',
              transformOrigin: 'center',
              transform: `rotate(${i * 45}deg)`,
            }}
            animate={{
              scale: [1, 0.8, 1],
              rotate: `${i * 45 + (currentFrame * 5)}deg`
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        ))}
        
        {/* Center */}
        <motion.div
          className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Camera className="text-white" size={size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 24 : 32} />
        </motion.div>
      </div>
    </motion.div>
  )

  const renderCountdown = () => (
    <motion.div className={`relative ${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <motion.div
        className="text-4xl font-bold text-white"
        key={Math.floor((5 - currentFrame) / 2) + 1}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {Math.max(1, Math.floor((8 - currentFrame) / 2))}
      </motion.div>
      
      {/* Action flash */}
      <AnimatePresence>
        {currentFrame === 7 && (
          <motion.div
            className="absolute inset-0 bg-yellow-400 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2, opacity: [0, 1, 0] }}
            exit={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )

  const renderPremiere = () => (
    <motion.div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Red carpet */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-lg"
        animate={{ 
          boxShadow: [
            '0 0 20px rgba(239, 68, 68, 0.5)',
            '0 0 40px rgba(239, 68, 68, 0.8)',
            '0 0 20px rgba(239, 68, 68, 0.5)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Stars */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-yellow-400"
          style={{
            left: `${20 + i * 15}%`,
            top: `${20 + (i % 2) * 20}%`,
          }}
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 3, 
            delay: i * 0.2, 
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Star size={size === 'sm' ? 8 : size === 'md' ? 12 : size === 'lg' ? 16 : 20} fill="currentColor" />
        </motion.div>
      ))}
    </motion.div>
  )

  const renderDirector = () => (
    <motion.div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Director's chair */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg"
        animate={{ rotateY: [0, 10, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      {/* Megaphone */}
      <motion.div
        className="absolute inset-2 flex items-center justify-center"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Zap className="text-yellow-400" size={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 28 : 36} />
      </motion.div>
      
      {/* Action lines */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute right-1 top-1/2 w-4 h-0.5 bg-yellow-400"
          style={{ originX: 0 }}
          animate={{ 
            scaleX: [0, 1, 0],
            x: [0, 8, 16]
          }}
          transition={{ 
            duration: 1.5, 
            delay: i * 0.2, 
            repeat: Infinity 
          }}
        />
      ))}
    </motion.div>
  )

  const renderActionClap = () => (
    <motion.div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Clapboard */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg"
        animate={{ rotateX: [0, -15, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      
      {/* Stripes */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1 right-1 h-1 bg-white"
          style={{ top: `${20 + i * 15}%` }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
        />
      ))}
      
      {/* Text area */}
      <motion.div
        className="absolute bottom-2 left-2 right-2 h-4 bg-white rounded-sm"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  )

  const loaderComponents = {
    filmReel: renderFilmReel,
    spotlight: renderSpotlight,
    cameraShutter: renderCameraShutter,
    countdown: renderCountdown,
    premiere: renderPremiere,
    director: renderDirector,
    redCarpet: renderPremiere, // Alias
    actionClap: renderActionClap,
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main loader */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.smooth / 1000 }}
      >
        {loaderComponents[variant]()}
      </motion.div>

      {/* Message */}
      {message && (
        <motion.div
          className="text-slate-300 text-sm font-medium text-center"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.div>
      )}

      {/* Progress bar */}
      {showProgress && (
        <motion.div 
          className="w-32 h-1 bg-slate-700 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </div>
  )
}

// Full-screen loading overlay with cinematic entrance
interface CinematicLoadingOverlayProps {
  isLoading: boolean
  variant?: LoaderVariant
  message?: string
  progress?: number
  showProgress?: boolean
}

export function CinematicLoadingOverlay({
  isLoading,
  variant = 'filmReel',
  message = 'Loading your cinematic experience...',
  progress = 0,
  showProgress = false
}: CinematicLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.smooth / 1000 }}
        >
          {/* Background pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, #8B5CF6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #A855F7 0%, transparent 50%)',
            }}
            animate={{
              background: [
                'radial-gradient(circle at 25% 25%, #8B5CF6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #A855F7 0%, transparent 50%)',
                'radial-gradient(circle at 75% 25%, #A855F7 0%, transparent 50%), radial-gradient(circle at 25% 75%, #8B5CF6 0%, transparent 50%)',
                'radial-gradient(circle at 25% 25%, #8B5CF6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #A855F7 0%, transparent 50%)',
              ]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          {/* Main content */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 150,
              damping: 20
            }}
          >
            <CinematicLoader
              variant={variant}
              message={message}
              progress={progress}
              showProgress={showProgress}
              size="xl"
            />
          </motion.div>

          {/* Cinematic scan lines */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 92, 246, 0.03) 2px, rgba(139, 92, 246, 0.03) 4px)',
            }}
            animate={{ y: ['-100%', '100%'] }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for managing loading states with cinematic timing
export function useCinematicLoading(initialMessage = 'Loading...') {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(initialMessage)
  const [progress, setProgress] = useState(0)

  const startLoading = (newMessage?: string) => {
    setIsLoading(true)
    if (newMessage) setMessage(newMessage)
    setProgress(0)
  }

  const updateProgress = (newProgress: number, newMessage?: string) => {
    setProgress(newProgress)
    if (newMessage) setMessage(newMessage)
  }

  const finishLoading = (delay = 500) => {
    setProgress(100)
    setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
    }, delay)
  }

  return {
    isLoading,
    message,
    progress,
    startLoading,
    updateProgress,
    finishLoading,
    setMessage,
  }
}