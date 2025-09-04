/**
 * CastMatch Talent Card Animations
 * Framer Motion Implementation
 * 
 * Created by: Motion UI Specialist & Interaction Design Specialist
 * Performance Target: 60fps on all devices
 * Accessibility: Respects prefers-reduced-motion
 * Dark Mode: OLED optimized animations
 */

import { motion, Variants, useReducedMotion } from 'framer-motion'
import { useState, useCallback } from 'react'

// ==========================================
// ANIMATION VARIANTS
// ==========================================

// Card container animations
const cardVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    boxShadow: '0 0 0 rgba(212, 175, 55, 0)',
    borderColor: 'rgba(64, 64, 64, 1)',
  },
  hover: {
    scale: 1.02,
    y: -8,
    rotateX: 5,
    rotateY: 2,
    boxShadow: '0 16px 48px rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.4)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      mass: 0.8,
      duration: 0.4,
    },
  },
  tap: {
    scale: 0.98,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.1,
    },
  },
  loading: {
    opacity: 0.7,
    transition: {
      duration: 0.2,
      ease: 'easeInOut',
    },
  },
}

// Accent line animation (top border)
const accentLineVariants: Variants = {
  initial: {
    scaleX: 0,
    opacity: 0,
    transformOrigin: 'left',
  },
  hover: {
    scaleX: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      delay: 0.1,
      duration: 0.6,
    },
  },
}

// Avatar animations
const avatarVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
    filter: 'brightness(1) saturate(1)',
  },
  hover: {
    scale: 1.1,
    rotate: 2,
    filter: 'brightness(1.1) saturate(1.2)',
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 15,
      delay: 0.05,
    },
  },
}

// Talent info text animations
const textVariants: Variants = {
  initial: {
    x: 0,
    color: '#ffffff',
  },
  hover: {
    x: 4,
    color: '#ffffff',
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      delay: 0.1,
    },
  },
}

const roleTextVariants: Variants = {
  initial: {
    x: 0,
    color: '#d4af37',
    textShadow: '0 0 0 rgba(212, 175, 55, 0)',
  },
  hover: {
    x: 4,
    color: '#f0c850',
    textShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      delay: 0.15,
    },
  },
}

// Skill tags animations
const skillTagsContainerVariants: Variants = {
  hover: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
}

const skillTagVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  hover: {
    scale: 1.05,
    y: -2,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: 'rgba(212, 175, 55, 0.5)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
}

// Stats animation
const statsContainerVariants: Variants = {
  hover: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.25,
    },
  },
}

const statItemVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.05,
    y: -1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
}

// Button animations
const buttonVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.2)',
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.4)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
}

const secondaryButtonVariants: Variants = {
  initial: {
    scale: 1,
    borderColor: '#666666',
    color: '#ffffff',
  },
  hover: {
    scale: 1.05,
    borderColor: '#d4af37',
    color: '#d4af37',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
}

// Availability indicator animations
const availabilityIndicatorVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 0 0 rgba(34, 197, 94, 0)',
  },
  pulse: {
    scale: [1, 1.2, 1],
    boxShadow: [
      '0 0 0 rgba(34, 197, 94, 0)',
      '0 0 12px rgba(34, 197, 94, 0.4)',
      '0 0 0 rgba(34, 197, 94, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ==========================================
// PERFORMANCE HOOKS
// ==========================================

// Custom hook for performance monitoring
const usePerformanceMonitor = () => {
  const [frameRate, setFrameRate] = useState<number>(60)
  const [dropCount, setDropCount] = useState<number>(0)
  
  const monitorFrame = useCallback(() => {
    let start = performance.now()
    let frames = 0
    
    const countFrames = () => {
      frames++
      const elapsed = performance.now() - start
      
      if (elapsed >= 1000) {
        const fps = Math.round((frames * 1000) / elapsed)
        setFrameRate(fps)
        
        if (fps < 55) {
          setDropCount(prev => prev + 1)
        }
        
        frames = 0
        start = performance.now()
      }
      
      requestAnimationFrame(countFrames)
    }
    
    requestAnimationFrame(countFrames)
  }, [])
  
  return { frameRate, dropCount, monitorFrame }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

interface TalentCardAnimatedProps {
  talent: {
    id: string
    name: string
    role: string
    location: string
    avatar: string
    skills: string[]
    stats: {
      projects: number
      rating: number
      response: number
      experience: string
    }
    availability: 'available' | 'busy' | 'unavailable'
  }
  onContact: (id: string) => void
  onViewProfile: (id: string) => void
  onAudition: (id: string) => void
  isLoading?: boolean
}

export const TalentCardAnimated: React.FC<TalentCardAnimatedProps> = ({
  talent,
  onContact,
  onViewProfile,
  onAudition,
  isLoading = false,
}) => {
  const shouldReduceMotion = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const { frameRate, dropCount, monitorFrame } = usePerformanceMonitor()
  
  // Reduce animations for users who prefer reduced motion
  const cardAnimationVariants = shouldReduceMotion
    ? {
        initial: cardVariants.initial,
        hover: {
          ...cardVariants.initial,
          boxShadow: cardVariants.hover.boxShadow,
          borderColor: cardVariants.hover.borderColor,
        },
        tap: cardVariants.initial,
      }
    : cardVariants
  
  const availabilityColors = {
    available: '#22c55e',
    busy: '#f59e0b',
    unavailable: '#ef4444',
  }
  
  return (
    <motion.div
      className=\"talent-card\"
      variants={cardAnimationVariants}
      initial=\"initial\"
      whileHover=\"hover\"
      whileTap=\"tap\"
      animate={isLoading ? 'loading' : 'initial'}
      onHoverStart={() => {
        setIsHovered(true)
        if (process.env.NODE_ENV === 'development') {
          monitorFrame()
        }
      }}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #171717 0%, #262626 100%)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #404040',
        cursor: 'pointer',
        overflow: 'hidden',
        transformStyle: 'preserve-3d',
        // GPU acceleration
        transform: 'translateZ(0)',
        willChange: 'transform, box-shadow, border-color',
      }}
    >
      {/* Accent line at top */}
      <motion.div
        variants={accentLineVariants}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #d4af37 0%, #b8941f 100%)',
        }}
      />
      
      {/* Availability indicator */}
      <motion.div
        variants={availabilityIndicatorVariants}
        animate={talent.availability === 'available' ? 'pulse' : 'initial'}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: availabilityColors[talent.availability],
          border: `2px solid #171717`,
        }}
      />
      
      {/* Header section */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
        {/* Avatar */}
        <motion.div
          variants={avatarVariants}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4a4a4a 0%, #333 100%)',
            border: '2px solid #555',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Avatar placeholder */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            opacity: 0.6,
          }}>
            📸
          </div>
        </motion.div>
        
        {/* Talent info */}
        <div>
          <motion.h3
            variants={textVariants}
            style={{
              fontFamily: \"'Playfair Display', serif\",
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: 1.2,
              color: '#ffffff',
              margin: '0 0 4px 0',
            }}
          >
            {talent.name}
          </motion.h3>
          <motion.p
            variants={roleTextVariants}
            style={{
              fontFamily: \"'Inter', sans-serif\",
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.4,
              color: '#d4af37',
              margin: '0 0 2px 0',
            }}
          >
            {talent.role}
          </motion.p>
          <motion.p
            variants={textVariants}
            style={{
              fontFamily: \"'Inter', sans-serif\",
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 1.4,
              color: '#999',
              margin: '0',
            }}
          >
            {talent.location}
          </motion.p>
        </div>
        
        {/* Action buttons in header */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button
            variants={secondaryButtonVariants}
            whileHover=\"hover\"
            whileTap=\"tap\"
            style={{
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: '1px solid #666',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ♡
          </motion.button>
          <motion.button
            variants={secondaryButtonVariants}
            whileHover=\"hover\"
            whileTap=\"tap\"
            style={{
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: '1px solid #666',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ↗
          </motion.button>
        </div>
      </div>
      
      {/* Skills section */}
      <div style={{ marginBottom: '16px' }}>
        <motion.div
          variants={skillTagsContainerVariants}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          {talent.skills.map((skill, index) => (
            <motion.span
              key={index}
              variants={skillTagVariants}
              style={{
                padding: '6px 12px',
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#d4af37',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
              }}
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>
      </div>
      
      {/* Stats section */}
      <motion.div
        variants={statsContainerVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '16px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {[
          { label: 'Projects', value: talent.stats.projects },
          { label: 'Rating', value: talent.stats.rating },
          { label: 'Response', value: `${talent.stats.response}%` },
          { label: 'Experience', value: talent.stats.experience },
        ].map((stat, index) => (
          <motion.div
            key={index}
            variants={statItemVariants}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '4px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {stat.value}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#737373',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {stat.label}
            </span>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
        <motion.button
          variants={buttonVariants}
          whileHover=\"hover\"
          whileTap=\"tap\"
          onClick={() => onViewProfile(talent.id)}
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
          }}
        >
          View Profile
        </motion.button>
        <motion.button
          variants={secondaryButtonVariants}
          whileHover=\"hover\"
          whileTap=\"tap\"
          onClick={() => onContact(talent.id)}
          style={{
            padding: '14px 20px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
            cursor: 'pointer',
          }}
        >
          Contact
        </motion.button>
        <motion.button
          variants={secondaryButtonVariants}
          whileHover=\"hover\"
          whileTap=\"tap\"
          onClick={() => onAudition(talent.id)}
          style={{
            padding: '14px 20px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid #666',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
            cursor: 'pointer',
          }}
        >
          Audition
        </motion.button>
      </div>
      
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && isHovered && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          fontSize: '10px',
          color: frameRate >= 55 ? '#22c55e' : '#ef4444',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '2px 6px',
          borderRadius: '4px',
        }}>
          {frameRate}fps {dropCount > 0 && `(${dropCount} drops)`}
        </div>
      )}
    </motion.div>
  )
}

export default TalentCardAnimated

// ==========================================
// PERFORMANCE METRICS & OPTIMIZATIONS
// ==========================================

/**
 * Performance Targets:
 * - 60fps on all interactions
 * - <16ms per frame
 * - <200ms total interaction time
 * - GPU acceleration for transforms
 * - Reduced motion support
 * 
 * Optimizations Applied:
 * - transform3d() for GPU acceleration
 * - will-change hints for animation properties
 * - Staggered animations to prevent jank
 * - Conditional animation variants for reduced motion
 * - Performance monitoring in development
 * - Minimal DOM manipulation during animations
 */