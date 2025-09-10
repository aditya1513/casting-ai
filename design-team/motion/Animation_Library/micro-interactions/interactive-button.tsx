/**
 * Interactive Button with Cinematic Micro-Interactions
 * Premium button animations for entertainment industry feel
 */

'use client'

import { motion, MotionProps } from 'framer-motion'
import { ReactNode, useState } from 'react'
import { duration, easing, colors } from '../core/animation-tokens'
import { Loader2, Sparkles, Zap } from 'lucide-react'

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'destructive'
  | 'premium'
  | 'cinematic'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

export type ButtonEffect = 
  | 'none'
  | 'ripple'
  | 'glow'
  | 'particles'
  | 'magnetic'
  | 'premium'
  | 'cinematic'

interface InteractiveButtonProps extends Omit<MotionProps, 'children'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  effect?: ButtonEffect
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  className?: string
  onClick?: () => void
}

const variantStyles = {
  primary: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500 hover:border-purple-400',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 hover:border-slate-500',
  outline: 'bg-transparent hover:bg-purple-600/10 text-purple-400 border-purple-500 hover:border-purple-400',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 border-transparent hover:border-slate-700',
  destructive: 'bg-red-600 hover:bg-red-700 text-white border-red-500 hover:border-red-400',
  premium: 'bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-500 hover:via-purple-600 hover:to-pink-500 text-white border-purple-400',
  cinematic: 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 hover:from-slate-700 hover:via-slate-800 hover:to-slate-700 text-white border-slate-600 hover:border-purple-500',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
  xl: 'px-8 py-4 text-xl rounded-2xl',
}

export function InteractiveButton({
  children,
  variant = 'primary',
  size = 'md',
  effect = 'glow',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  ...motionProps
}: InteractiveButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])

  const isDisabled = disabled || loading

  // Ripple effect handler
  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (effect !== 'ripple') return

    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newRipple = { id: Date.now(), x, y }
    setRipples(prev => [...prev, newRipple])
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600)
  }

  // Click handler
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return
    
    handleRipple(e)
    onClick?.(e)
  }

  // Animation variants based on effect
  const getAnimationVariants = () => {
    const baseVariants = {
      initial: { scale: 1 },
      hover: { 
        scale: isDisabled ? 1 : 1.02,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 20
        }
      },
      tap: { 
        scale: isDisabled ? 1 : 0.98,
        transition: {
          type: "spring",
          stiffness: 600,
          damping: 25
        }
      }
    }

    switch (effect) {
      case 'glow':
        return {
          ...baseVariants,
          hover: {
            ...baseVariants.hover,
            boxShadow: variant === 'primary' 
              ? colors.purpleGlow 
              : variant === 'secondary'
              ? colors.blueGlow
              : colors.softShadow,
            filter: 'brightness(1.1)',
          }
        }
      
      case 'magnetic':
        return {
          ...baseVariants,
          hover: {
            ...baseVariants.hover,
            y: -2,
            rotateX: 5,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }
        }
      
      case 'premium':
        return {
          ...baseVariants,
          hover: {
            ...baseVariants.hover,
            backgroundImage: 'linear-gradient(45deg, #8B5CF6, #A855F7, #EC4899, #F59E0B)',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
            filter: 'brightness(1.2) saturate(1.1)',
          }
        }
      
      case 'cinematic':
        return {
          ...baseVariants,
          hover: {
            ...baseVariants.hover,
            rotateY: 5,
            rotateX: 2,
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
            filter: 'brightness(1.1) contrast(1.1)',
          }
        }
      
      default:
        return baseVariants
    }
  }

  const animationVariants = getAnimationVariants()

  return (
    <motion.button
      className={`
        relative overflow-hidden border transition-all duration-200 font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      variants={animationVariants}
      initial="initial"
      whileHover={!isDisabled ? "hover" : "initial"}
      whileTap={!isDisabled ? "tap" : "initial"}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      disabled={isDisabled}
      style={{
        willChange: 'transform, filter, box-shadow',
        perspective: '1000px',
      }}
      {...motionProps}
    >
      {/* Background effects */}
      {effect === 'premium' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20"
          animate={{
            background: [
              'linear-gradient(45deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
              'linear-gradient(225deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2), rgba(245, 158, 11, 0.2))',
              'linear-gradient(45deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}

      {effect === 'cinematic' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "linear"
          }}
        />
      )}

      {/* Ripple effects */}
      {effect === 'ripple' && (
        <div className="absolute inset-0 overflow-hidden rounded-inherit">
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              className="absolute bg-white/20 rounded-full pointer-events-none"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.6, ease: easing.exit }}
            />
          ))}
        </div>
      )}

      {/* Particle effects for premium buttons */}
      {effect === 'particles' && !isDisabled && (
        <div className="absolute inset-0 overflow-hidden rounded-inherit">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${20 + i * 30}%`,
                top: `${20 + i * 20}%`,
              }}
              animate={{
                y: [-5, -15, -5],
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={size === 'sm' ? 16 : size === 'lg' ? 24 : size === 'xl' ? 28 : 20} />
          </motion.div>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <motion.div
                animate={{ 
                  rotate: isPressed ? [0, -5, 5, 0] : 0,
                  scale: isPressed ? 0.9 : 1
                }}
                transition={{ 
                  duration: 0.2,
                  ease: easing.bounce 
                }}
              >
                {icon}
              </motion.div>
            )}
            
            <motion.span
              animate={{ 
                scale: isPressed ? 0.95 : 1,
                filter: loading ? 'blur(1px)' : 'blur(0px)'
              }}
              transition={{ duration: 0.1 }}
            >
              {children}
            </motion.span>
            
            {icon && iconPosition === 'right' && (
              <motion.div
                animate={{ 
                  rotate: isPressed ? [0, 5, -5, 0] : 0,
                  scale: isPressed ? 0.9 : 1
                }}
                transition={{ 
                  duration: 0.2,
                  ease: easing.bounce 
                }}
              >
                {icon}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Premium sparkle effect */}
      {(variant === 'premium' || effect === 'premium') && !isDisabled && (
        <motion.div
          className="absolute top-2 right-2 text-yellow-300"
          animate={{ 
            rotate: [0, 180, 360],
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles size={12} />
        </motion.div>
      )}

      {/* Cinematic scan line effect */}
      {effect === 'cinematic' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-1"
          animate={{
            y: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 4,
            ease: "linear"
          }}
        />
      )}
    </motion.button>
  )
}

// Pre-built button variants for common use cases
export function PrimaryButton(props: Omit<InteractiveButtonProps, 'variant'>) {
  return <InteractiveButton {...props} variant="primary" />
}

export function SecondaryButton(props: Omit<InteractiveButtonProps, 'variant'>) {
  return <InteractiveButton {...props} variant="secondary" />
}

export function PremiumButton(props: Omit<InteractiveButtonProps, 'variant' | 'effect'>) {
  return <InteractiveButton {...props} variant="premium" effect="premium" />
}

export function CinematicButton(props: Omit<InteractiveButtonProps, 'variant' | 'effect'>) {
  return <InteractiveButton {...props} variant="cinematic" effect="cinematic" />
}

export function MagneticButton(props: Omit<InteractiveButtonProps, 'effect'>) {
  return <InteractiveButton {...props} effect="magnetic" />
}