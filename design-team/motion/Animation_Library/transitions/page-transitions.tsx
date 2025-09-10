/**
 * Cinematic Page Transition System
 * Hollywood-grade page transitions for CastMatch
 */

'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'
import { duration, easing, colors } from '../core/animation-tokens'
import { useRouter } from 'next/navigation'

// Transition variant types
export type TransitionVariant = 
  | 'fade' 
  | 'slide' 
  | 'scale' 
  | 'rotate' 
  | 'curtain' 
  | 'morph' 
  | 'cinema' 
  | 'spotlight'
  | 'iris'
  | 'filmStrip'

interface PageTransitionProps {
  children: ReactNode
  variant?: TransitionVariant
  duration?: number
  easing?: string
  className?: string
}

// Fade transition variants
const fadeVariants: Variants = {
  initial: { 
    opacity: 0 
  },
  in: { 
    opacity: 1,
    transition: {
      duration: duration.smooth / 1000,
      ease: easing.entrance
    }
  },
  out: { 
    opacity: 0,
    transition: {
      duration: duration.fast / 1000,
      ease: easing.exit
    }
  }
}

// Slide transition variants
const slideVariants: Variants = {
  initial: { 
    x: '100%',
    opacity: 0 
  },
  in: { 
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 25,
      mass: 1
    }
  },
  out: { 
    x: '-100%',
    opacity: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.cinematic
    }
  }
}

// Scale transition variants
const scaleVariants: Variants = {
  initial: { 
    scale: 0.8,
    opacity: 0,
    filter: "blur(4px)"
  },
  in: { 
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      mass: 1.2
    }
  },
  out: { 
    scale: 1.1,
    opacity: 0,
    filter: "blur(2px)",
    transition: {
      duration: duration.base / 1000,
      ease: easing.dramatic
    }
  }
}

// Rotate transition variants
const rotateVariants: Variants = {
  initial: { 
    rotateY: 90,
    opacity: 0,
    scale: 0.8
  },
  in: { 
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.cinematic
    }
  },
  out: { 
    rotateY: -90,
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

// Curtain transition variants (theatrical)
const curtainVariants: Variants = {
  initial: { 
    clipPath: 'inset(0 100% 0 0)',
    opacity: 0
  },
  in: { 
    clipPath: 'inset(0 0% 0 0)',
    opacity: 1,
    transition: {
      duration: duration.dramatic / 1000,
      ease: easing.dramatic,
      clipPath: { duration: duration.epic / 1000 }
    }
  },
  out: { 
    clipPath: 'inset(0 0 0 100%)',
    opacity: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.exit
    }
  }
}

// Morph transition variants (liquid-like)
const morphVariants: Variants = {
  initial: { 
    borderRadius: '50%',
    scale: 0,
    opacity: 0
  },
  in: { 
    borderRadius: '0%',
    scale: 1,
    opacity: 1,
    transition: {
      duration: duration.epic / 1000,
      ease: easing.organic,
      borderRadius: { 
        duration: duration.dramatic / 1000,
        ease: easing.bounce
      }
    }
  },
  out: { 
    borderRadius: '50%',
    scale: 0,
    opacity: 0,
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Cinema transition variants (film-like)
const cinemaVariants: Variants = {
  initial: { 
    scaleY: 0,
    opacity: 0,
    transformOrigin: 'top'
  },
  in: { 
    scaleY: 1,
    opacity: 1,
    transition: {
      duration: duration.epic / 1000,
      ease: easing.cinematic,
      scaleY: {
        duration: duration.dramatic / 1000,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },
  out: { 
    scaleY: 0,
    opacity: 0,
    transformOrigin: 'bottom',
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Spotlight transition variants (dramatic reveal)
const spotlightVariants: Variants = {
  initial: { 
    clipPath: 'circle(0% at 50% 50%)',
    opacity: 0
  },
  in: { 
    clipPath: 'circle(150% at 50% 50%)',
    opacity: 1,
    transition: {
      duration: duration.epic / 1000,
      ease: easing.dramatic
    }
  },
  out: { 
    clipPath: 'circle(0% at 50% 50%)',
    opacity: 0,
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Iris transition variants (camera-like)
const irisVariants: Variants = {
  initial: { 
    clipPath: 'circle(0% at center)',
    opacity: 0,
    scale: 1.1
  },
  in: { 
    clipPath: 'circle(100% at center)',
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.dramatic / 1000,
      ease: easing.cinematic,
      clipPath: {
        duration: duration.epic / 1000,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },
  out: { 
    clipPath: 'circle(0% at center)',
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: duration.cinematic / 1000,
      ease: easing.exit
    }
  }
}

// Film strip transition variants
const filmStripVariants: Variants = {
  initial: { 
    x: '100%',
    skewX: 15,
    opacity: 0
  },
  in: { 
    x: 0,
    skewX: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1.5
    }
  },
  out: { 
    x: '-100%',
    skewX: -15,
    opacity: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.cinematic
    }
  }
}

// Variant mapping
const variantMap = {
  fade: fadeVariants,
  slide: slideVariants,
  scale: scaleVariants,
  rotate: rotateVariants,
  curtain: curtainVariants,
  morph: morphVariants,
  cinema: cinemaVariants,
  spotlight: spotlightVariants,
  iris: irisVariants,
  filmStrip: filmStripVariants,
}

export function PageTransition({ 
  children, 
  variant = 'fade', 
  duration: customDuration,
  easing: customEasing,
  className = ''
}: PageTransitionProps) {
  const variants = variantMap[variant]

  return (
    <motion.div
      key={variant}
      initial="initial"
      animate="in"
      exit="out"
      variants={variants}
      className={`${className}`}
      style={{
        willChange: 'transform, opacity, filter',
      }}
    >
      {children}
    </motion.div>
  )
}

// Advanced page transition wrapper with loading states
interface AdvancedPageTransitionProps {
  children: ReactNode
  variant?: TransitionVariant
  showLoadingState?: boolean
  loadingComponent?: ReactNode
  isLoading?: boolean
  onTransitionComplete?: () => void
  className?: string
}

export function AdvancedPageTransition({
  children,
  variant = 'cinema',
  showLoadingState = true,
  loadingComponent,
  isLoading = false,
  onTransitionComplete,
  className = ''
}: AdvancedPageTransitionProps) {
  const [showContent, setShowContent] = useState(false)
  
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isLoading])

  const defaultLoadingComponent = (
    <motion.div
      className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Cinematic loading spinner */}
        <motion.div
          className="w-16 h-16 border-4 border-purple-900 border-t-purple-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="text-purple-400 text-lg font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading...
        </motion.div>
      </motion.div>
    </motion.div>
  )

  return (
    <AnimatePresence mode="wait" onExitComplete={onTransitionComplete}>
      {isLoading ? (
        showLoadingState && (
          <motion.div key="loading">
            {loadingComponent || defaultLoadingComponent}
          </motion.div>
        )
      ) : (
        showContent && (
          <PageTransition
            key="content"
            variant={variant}
            className={className}
          >
            {children}
          </PageTransition>
        )
      )}
    </AnimatePresence>
  )
}

// Route transition hook for Next.js
export function useRouteTransition(variant: TransitionVariant = 'cinema') {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const navigateWithTransition = (href: string, delay: number = 300) => {
    setIsTransitioning(true)
    
    setTimeout(() => {
      router.push(href)
      setIsTransitioning(false)
    }, delay)
  }

  return {
    isTransitioning,
    navigateWithTransition
  }
}

// Pre-built transition components for common scenarios
export function FadePageTransition({ children, className }: { children: ReactNode, className?: string }) {
  return <PageTransition variant="fade" className={className}>{children}</PageTransition>
}

export function SlidePageTransition({ children, className }: { children: ReactNode, className?: string }) {
  return <PageTransition variant="slide" className={className}>{children}</PageTransition>
}

export function CinemaPageTransition({ children, className }: { children: ReactNode, className?: string }) {
  return <PageTransition variant="cinema" className={className}>{children}</PageTransition>
}

export function SpotlightPageTransition({ children, className }: { children: ReactNode, className?: string }) {
  return <PageTransition variant="spotlight" className={className}>{children}</PageTransition>
}

// Transition overlay effects
export function TransitionOverlay({ 
  variant = 'cinema',
  isActive = false 
}: { 
  variant?: TransitionVariant
  isActive?: boolean 
}) {
  const overlayVariants: Variants = {
    hidden: { 
      opacity: 0,
      scale: 0.8
    },
    visible: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: duration.dramatic / 1000,
        ease: easing.dramatic
      }
    }
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900/40 to-purple-900/20 backdrop-blur-sm z-40"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Cinema-style scan lines */}
          {variant === 'cinema' && (
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #8B5CF6 2px, #8B5CF6 4px)',
              }}
              animate={{ y: ['-100%', '100%'] }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            />
          )}
          
          {/* Spotlight effect */}
          {variant === 'spotlight' && (
            <motion.div
              className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50"
              animate={{ 
                background: [
                  'radial-gradient(circle at 30% 30%, transparent 20%, rgba(0,0,0,0.5) 80%)',
                  'radial-gradient(circle at 70% 70%, transparent 20%, rgba(0,0,0,0.5) 80%)',
                  'radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.5) 80%)',
                ]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}