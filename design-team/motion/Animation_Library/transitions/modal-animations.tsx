/**
 * Cinematic Modal and Overlay Animations
 * Theater-inspired entrance and exit effects
 */

'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode, useEffect } from 'react'
import { duration, easing, colors } from '../core/animation-tokens'
import { X } from 'lucide-react'

export type ModalVariant = 
  | 'scale' 
  | 'slide' 
  | 'curtain' 
  | 'iris' 
  | 'spotlight' 
  | 'theater' 
  | 'dissolve'
  | 'zoom'

interface CinematicModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  variant?: ModalVariant
  overlay?: boolean
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

// Backdrop variants
const backdropVariants: Variants = {
  hidden: { 
    opacity: 0,
    backdropFilter: 'blur(0px)'
  },
  visible: { 
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: {
      duration: duration.smooth / 1000,
      ease: easing.entrance
    }
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: duration.fast / 1000,
      ease: easing.exit
    }
  }
}

// Scale modal variants
const scaleModalVariants: Variants = {
  hidden: { 
    scale: 0.8,
    opacity: 0,
    y: 20,
    filter: "blur(4px)"
  },
  visible: { 
    scale: 1,
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      mass: 1
    }
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    y: -10,
    filter: "blur(2px)",
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

// Slide modal variants
const slideModalVariants: Variants = {
  hidden: { 
    y: '100%',
    opacity: 0,
    scale: 0.95
  },
  visible: { 
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 25,
      mass: 1.2
    }
  },
  exit: {
    y: '50%',
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

// Curtain modal variants (theatrical)
const curtainModalVariants: Variants = {
  hidden: { 
    clipPath: 'inset(50% 0 50% 0)',
    opacity: 0,
    scale: 0.9
  },
  visible: { 
    clipPath: 'inset(0% 0 0% 0)',
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.dramatic / 1000,
      ease: easing.dramatic,
      clipPath: { 
        duration: duration.cinematic / 1000,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },
  exit: {
    clipPath: 'inset(50% 0 50% 0)',
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

// Iris modal variants (camera-like)
const irisModalVariants: Variants = {
  hidden: { 
    clipPath: 'circle(0% at 50% 50%)',
    opacity: 0
  },
  visible: { 
    clipPath: 'circle(100% at 50% 50%)',
    opacity: 1,
    transition: {
      duration: duration.epic / 1000,
      ease: easing.cinematic,
      clipPath: {
        duration: duration.dramatic / 1000,
        ease: [0.645, 0.045, 0.355, 1]
      }
    }
  },
  exit: {
    clipPath: 'circle(0% at 50% 50%)',
    opacity: 0,
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Spotlight modal variants
const spotlightModalVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.8,
    filter: "brightness(0.3) contrast(1.2)"
  },
  visible: { 
    opacity: 1,
    scale: 1,
    filter: "brightness(1) contrast(1)",
    transition: {
      duration: duration.dramatic / 1000,
      ease: easing.dramatic
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    filter: "brightness(0.3) contrast(1.2)",
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

// Theater modal variants (grand entrance)
const theaterModalVariants: Variants = {
  hidden: { 
    rotateX: -90,
    opacity: 0,
    scale: 0.8,
    transformOrigin: 'top'
  },
  visible: { 
    rotateX: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.epic / 1000,
      ease: easing.cinematic,
      rotateX: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  },
  exit: {
    rotateX: 90,
    opacity: 0,
    scale: 0.8,
    transformOrigin: 'bottom',
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Dissolve modal variants (particle-like)
const dissolveModalVariants: Variants = {
  hidden: { 
    opacity: 0,
    filter: "blur(8px) saturate(0.5)",
    scale: 0.9
  },
  visible: { 
    opacity: 1,
    filter: "blur(0px) saturate(1)",
    scale: 1,
    transition: {
      duration: duration.dramatic / 1000,
      ease: easing.organic
    }
  },
  exit: {
    opacity: 0,
    filter: "blur(8px) saturate(0.5)",
    scale: 1.05,
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Zoom modal variants (cinematic zoom)
const zoomModalVariants: Variants = {
  hidden: { 
    scale: 0.3,
    opacity: 0,
    filter: "blur(10px)"
  },
  visible: { 
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18,
      mass: 1.5
    }
  },
  exit: {
    scale: 0.7,
    opacity: 0,
    filter: "blur(4px)",
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

const modalVariantMap = {
  scale: scaleModalVariants,
  slide: slideModalVariants,
  curtain: curtainModalVariants,
  iris: irisModalVariants,
  spotlight: spotlightModalVariants,
  theater: theaterModalVariants,
  dissolve: dissolveModalVariants,
  zoom: zoomModalVariants,
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
}

export function CinematicModal({
  isOpen,
  onClose,
  children,
  variant = 'scale',
  overlay = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
  size = 'md'
}: CinematicModalProps) {
  const modalVariants = modalVariantMap[variant]

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          {overlay && (
            <motion.div
              className="absolute inset-0 bg-black/60"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={closeOnOverlayClick ? onClose : undefined}
              style={{ willChange: 'opacity, backdrop-filter' }}
            >
              {/* Cinematic backdrop effects */}
              {variant === 'spotlight' && (
                <motion.div
                  className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40"
                  animate={{
                    background: [
                      'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 70%)',
                      'radial-gradient(circle at 40% 40%, transparent 25%, rgba(0,0,0,0.4) 75%)',
                      'radial-gradient(circle at 60% 60%, transparent 25%, rgba(0,0,0,0.4) 75%)',
                    ]
                  }}
                  transition={{ duration: 6, repeat: Infinity, repeatType: "reverse" }}
                />
              )}
              
              {variant === 'theater' && (
                <motion.div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, rgba(139, 92, 246, 0.1) 25%, transparent 25%), 
                      linear-gradient(-45deg, rgba(139, 92, 246, 0.1) 25%, transparent 25%)
                    `,
                    backgroundSize: '60px 60px'
                  }}
                  animate={{ 
                    backgroundPosition: ['0px 0px', '60px 60px'] 
                  }}
                  transition={{ 
                    duration: 20, 
                    repeat: Infinity, 
                    ease: "linear" 
                  }}
                />
              )}
            </motion.div>
          )}

          {/* Modal Content */}
          <motion.div
            className={`relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl ${sizeClasses[size]} w-full mx-4 ${className}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ 
              willChange: 'transform, opacity, filter',
              perspective: '1000px'
            }}
          >
            {/* Enhanced modal styling */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-purple-900/10 rounded-2xl" />
            
            {/* Close button */}
            {showCloseButton && (
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700/80 
                          border border-slate-600 hover:border-slate-500 transition-colors"
                whileHover={{ 
                  scale: 1.1,
                  backgroundColor: "rgba(30, 41, 59, 0.9)"
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { delay: 0.2 }
                }}
              >
                <X size={20} className="text-slate-400 hover:text-white transition-colors" />
              </motion.button>
            )}

            {/* Content */}
            <div className="relative z-10">
              {children}
            </div>

            {/* Decorative elements for theater variant */}
            {variant === 'theater' && (
              <>
                {/* Top curtain */}
                <motion.div
                  className="absolute -top-1 left-0 right-0 h-2 bg-gradient-to-b from-purple-800 to-transparent rounded-t-2xl"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
                {/* Bottom stage */}
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-t from-purple-800 to-transparent rounded-b-2xl"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                />
              </>
            )}

            {/* Spotlight effect overlay */}
            {variant === 'spotlight' && (
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  background: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 70%)'
                }}
                animate={{
                  background: [
                    'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
                    'radial-gradient(circle at 30% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                    'radial-gradient(circle at 70% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Pre-built modal components for common use cases
export function CinematicAlert({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  variant = 'scale' 
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  variant?: ModalVariant
}) {
  return (
    <CinematicModal isOpen={isOpen} onClose={onClose} variant={variant} size="sm">
      <div className="p-6">
        <motion.h3 
          className="text-lg font-semibold text-white mb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h3>
        <motion.p 
          className="text-slate-300 mb-6 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg 
                      border border-purple-500 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            OK
          </motion.button>
        </motion.div>
      </div>
    </CinematicModal>
  )
}

export function CinematicConfirm({ 
  isOpen, 
  onClose, 
  onConfirm,
  title, 
  message, 
  variant = 'theater',
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  variant?: ModalVariant
  confirmText?: string
  cancelText?: string
}) {
  return (
    <CinematicModal isOpen={isOpen} onClose={onClose} variant={variant} size="sm">
      <div className="p-6">
        <motion.h3 
          className="text-lg font-semibold text-white mb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h3>
        <motion.p 
          className="text-slate-300 mb-6 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
        <motion.div
          className="flex justify-end gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg 
                      border border-slate-600 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {cancelText}
          </motion.button>
          <motion.button
            onClick={onConfirm}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg 
                      border border-purple-500 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
        </motion.div>
      </div>
    </CinematicModal>
  )
}