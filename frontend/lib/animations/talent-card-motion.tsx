/**
 * TalentCard Motion System
 * Mumbai Film Industry Inspired Interactions with 60fps Performance
 * Framer Motion + CSS Optimizations for Mobile-First Experience
 */

'use client';

import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// ================================================
// ANIMATION CONSTANTS & SPRING CONFIGS
// ================================================

const SPRING_CONFIG = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
} as const;

const MUMBAI_EASING = [0.25, 0.1, 0.25, 1] as const; // Bollywood dramatic curve
const SMOOTH_EASING = [0.4, 0, 0.2, 1] as const;     // Material Design easing

// Performance-optimized transform values
const HOVER_LIFT = {
  y: -8,
  scale: 1.02,
  rotateX: 2,
} as const;

const FOCUS_SCALE = {
  scale: 1.03,
  rotateY: 1,
} as const;

const TAP_COMPRESS = {
  scale: 0.98,
  y: 1,
} as const;

// ================================================
// MICRO-INTERACTION VARIANTS
// ================================================

const cardVariants = {
  // Entry Animation (Staggered)
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    rotateX: -5,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.4,
      ease: MUMBAI_EASING,
      staggerChildren: 0.1,
    },
  },
  
  // Hover State (Desktop only)
  hover: {
    ...HOVER_LIFT,
    transition: {
      ...SPRING_CONFIG,
      duration: 0.2,
    },
  },
  
  // Focus State (Accessibility)
  focus: {
    ...FOCUS_SCALE,
    transition: {
      ...SPRING_CONFIG,
      duration: 0.15,
    },
  },
  
  // Tap/Press State (Mobile)
  tap: {
    ...TAP_COMPRESS,
    transition: {
      duration: 0.1,
      ease: SMOOTH_EASING,
    },
  },
  
  // Shortlist Success Animation
  shortlisted: {
    scale: [1, 1.1, 1],
    rotateZ: [0, -2, 2, 0],
    transition: {
      duration: 0.6,
      ease: MUMBAI_EASING,
      times: [0, 0.3, 0.7, 1],
    },
  },
  
  // Loading Skeleton Animation
  loading: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  
  // Exit Animation
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -10,
    transition: {
      duration: 0.2,
      ease: SMOOTH_EASING,
    },
  },
};

// Avatar-specific animations
const avatarVariants = {
  hidden: {
    scale: 0,
    rotate: -180,
  },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      ...SPRING_CONFIG,
      delay: 0.2,
      duration: 0.5,
    },
  },
  hover: {
    scale: 1.05,
    rotate: 2,
    transition: {
      duration: 0.2,
      ease: SMOOTH_EASING,
    },
  },
};

// Mumbai-inspired golden glow effect
const goldenGlowVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: [0, 0.3, 0],
    scale: [0.8, 1.2, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ================================================
// PERFORMANCE OPTIMIZATIONS
// ================================================

const optimizedTransition = {
  layout: true, // Use layout animations
  layoutId: (id: string) => `talent-card-${id}`,
  style: {
    // Force GPU acceleration
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    willChange: 'transform, opacity',
  },
} as const;

// Reduced motion support
const getMotionProps = (prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) {
    return {
      initial: false,
      animate: { opacity: 1 },
      transition: { duration: 0 },
    };
  }
  
  return {
    initial: 'hidden',
    animate: 'visible',
    whileHover: 'hover',
    whileFocus: 'focus',
    whileTap: 'tap',
    exit: 'exit',
    variants: cardVariants,
    ...optimizedTransition,
  };
};

// ================================================
// MAIN TALENT CARD MOTION COMPONENT
// ================================================

interface TalentCardMotionProps {
  children: React.ReactNode;
  id: string;
  isShortlisted?: boolean;
  loading?: boolean;
  featured?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

export function TalentCardMotion({
  children,
  id,
  isShortlisted = false,
  loading = false,
  featured = false,
  onAnimationComplete,
  className = '',
}: TalentCardMotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const isInView = useInView(ref, { 
    once: true, 
    margin: '0px 0px -100px 0px' // Start animation before fully visible
  });
  
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Intersection Observer animation trigger
  useEffect(() => {
    if (isInView && !loading) {
      controls.start('visible');
    }
  }, [isInView, loading, controls]);

  // Shortlist success animation
  useEffect(() => {
    if (isShortlisted && !prefersReducedMotion) {
      controls.start('shortlisted').then(onAnimationComplete);
    }
  }, [isShortlisted, controls, prefersReducedMotion, onAnimationComplete]);

  const motionProps = getMotionProps(prefersReducedMotion);

  return (
    <motion.div
      ref={ref}
      layoutId={`talent-card-${id}`}
      className={`talent-card-motion ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={controls}
      {...motionProps}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Mumbai Golden Glow for Featured Cards */}
      {featured && !prefersReducedMotion && (
        <motion.div
          className="absolute -inset-2 rounded-lg bg-gradient-to-r from-mumbai-gold-500/20 to-mumbai-saffron-500/20 blur-md"
          variants={goldenGlowVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          style={{ zIndex: -1 }}
        />
      )}
      
      {children}
      
      {/* Interactive Ripple Effect */}
      <AnimatePresence>
        {isHovered && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: 1.1, 
              opacity: [0, 0.1, 0],
            }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ 
              duration: 0.6,
              ease: MUMBAI_EASING,
            }}
            style={{
              background: 'radial-gradient(circle, var(--color-mumbai-saffron-500) 0%, transparent 70%)',
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ================================================
// AVATAR MOTION COMPONENT
// ================================================

interface AvatarMotionProps {
  src: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export function AvatarMotion({ 
  src, 
  alt, 
  size = 'medium',
  loading = false 
}: AvatarMotionProps) {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-20 h-20',
    large: 'w-24 h-24',
  };

  if (loading) {
    return (
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gray-700`}
        variants={{
          loading: {
            opacity: [0.3, 0.7, 0.3],
            transition: {
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          },
        }}
        animate="loading"
      />
    );
  }

  return (
    <motion.div
      className="relative"
      variants={avatarVariants}
      style={{ transformOrigin: 'center center' }}
    >
      <motion.img
        src={src}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-mumbai-gold-500`}
        loading="lazy"
        style={{
          transformOrigin: 'center center',
        }}
      />
      
      {/* Cinematic rim lighting effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, var(--color-mumbai-gold-500)/20, transparent 50%)',
          mixBlendMode: 'overlay',
        }}
        animate={{
          opacity: [0, 0.5, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}

// ================================================
// BUTTON MOTION COMPONENTS
// ================================================

interface ButtonMotionProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ButtonMotion({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  onClick,
  className = '',
}: ButtonMotionProps) {
  const buttonVariants = {
    idle: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -1,
      transition: { duration: 0.15, ease: SMOOTH_EASING }
    },
    tap: { 
      scale: 0.98, 
      y: 1,
      transition: { duration: 0.1 }
    },
    loading: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }
    },
  };

  return (
    <motion.button
      className={`button button--${variant} ${className}`}
      variants={buttonVariants}
      initial="idle"
      whileHover={!disabled && !loading ? "hover" : "idle"}
      whileTap={!disabled && !loading ? "tap" : "idle"}
      animate={loading ? "loading" : "idle"}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center"
          >
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ================================================
// RATING STARS MOTION
// ================================================

interface RatingStarsMotionProps {
  rating: number;
  maxRating?: number;
  animated?: boolean;
}

export function RatingStarsMotion({ 
  rating, 
  maxRating = 5, 
  animated = true 
}: RatingStarsMotionProps) {
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);
  
  const starVariants = {
    hidden: { scale: 0, rotate: -180, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    }),
    hover: {
      scale: 1.2,
      rotate: 10,
      transition: { duration: 0.2 }
    },
  };

  return (
    <motion.div 
      className="flex items-center gap-0.5"
      initial={animated ? "hidden" : false}
      animate={animated ? "visible" : false}
    >
      {stars.map((star) => (
        <motion.span
          key={star}
          className={`text-lg ${
            star <= rating 
              ? 'text-mumbai-gold-500' 
              : 'text-gray-600'
          }`}
          custom={star - 1}
          variants={animated ? starVariants : undefined}
          whileHover={animated ? "hover" : undefined}
          style={{ display: 'inline-block' }}
        >
          ★
        </motion.span>
      ))}
    </motion.div>
  );
}

// ================================================
// USAGE EXAMPLE
// ================================================

/*
Usage in TalentCard component:

<TalentCardMotion id={talent.id} featured={talent.featured}>
  <div className="talent-card">
    <AvatarMotion 
      src={talent.avatar} 
      alt={talent.name}
      size="medium"
    />
    
    <div className="talent-info">
      <h3>{talent.name}</h3>
      <p>{talent.age} • {talent.location}</p>
    </div>
    
    <RatingStarsMotion 
      rating={talent.rating}
      animated={true}
    />
    
    <div className="actions">
      <ButtonMotion variant="secondary" onClick={onView}>
        View Profile
      </ButtonMotion>
      <ButtonMotion variant="primary" onClick={onShortlist}>
        Shortlist
      </ButtonMotion>
    </div>
  </div>
</TalentCardMotion>
*/

// ================================================
// PERFORMANCE MONITORING
// ================================================

export const motionPerformance = {
  // Monitor frame rate
  measureFPS: () => {
    let frames = 0;
    let lastTime = performance.now();
    
    function measure() {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        console.log(`Motion FPS: ${fps}`);
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measure);
    }
    
    requestAnimationFrame(measure);
  },
  
  // Preload critical animations
  preloadAnimations: () => {
    // Trigger GPU layers for critical elements
    const style = document.createElement('style');
    style.textContent = `
      .talent-card-motion,
      .button,
      .avatar-motion {
        transform: translateZ(0);
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(style);
  },
};