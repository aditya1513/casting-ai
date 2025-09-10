/**
 * CastMatch Animation Configuration
 * Performance-optimized animation constants and utilities
 * Designed for 60fps on low-end devices and 2G/3G networks in Mumbai
 */

import { Variants, Transition } from 'framer-motion';

// Core animation timing constants
export const ANIMATION_TIMING = {
  // Ultra-fast for immediate feedback
  instant: 0.05,
  // Fast for micro-interactions
  fast: 0.15,
  // Standard for most transitions
  standard: 0.3,
  // Moderate for page transitions
  moderate: 0.5,
  // Slow for cinematic effects
  slow: 0.8,
  // Dramatic for Bollywood-inspired animations
  dramatic: 1.2,
} as const;

// Spring physics configurations optimized for performance
export const SPRING_CONFIGS = {
  // Snappy: Quick, responsive interactions
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
    mass: 0.5,
  },
  // Bouncy: Playful micro-interactions
  bouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    mass: 0.8,
  },
  // Gentle: Smooth, professional transitions
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 1,
  },
  // Smooth: Elegant page transitions
  smooth: {
    type: 'spring',
    stiffness: 150,
    damping: 22,
    mass: 1.2,
  },
  // Wobbly: Fun, attention-grabbing effects
  wobbly: {
    type: 'spring',
    stiffness: 180,
    damping: 12,
    mass: 1,
  },
} as const;

// Easing functions for CSS animations
export const EASING = {
  // Standard curves
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Custom curves for cinematic effects
  curtainRise: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  spotlight: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  filmStrip: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  stageEntrance: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  cameraZoom: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  
  // Performance-optimized
  fastOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  slowIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

// Stagger configurations for sequential animations
export const STAGGER_CONFIGS = {
  // Quick succession
  tight: {
    delayChildren: 0.05,
    staggerChildren: 0.05,
  },
  // Standard spacing
  normal: {
    delayChildren: 0.1,
    staggerChildren: 0.1,
  },
  // Leisurely pace
  relaxed: {
    delayChildren: 0.15,
    staggerChildren: 0.15,
  },
  // Dramatic timing
  cinematic: {
    delayChildren: 0.2,
    staggerChildren: 0.25,
  },
} as const;

// Common animation variants
export const COMMON_VARIANTS: Record<string, Variants> = {
  // Fade animations
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  
  fadeInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  
  fadeInLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  
  fadeInRight: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  
  // Scale animations
  scaleIn: {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
  },
  
  scaleOut: {
    visible: { scale: 1, opacity: 1 },
    hidden: { scale: 0.8, opacity: 0 },
  },
  
  // Slide animations
  slideInLeft: {
    hidden: { x: '-100%' },
    visible: { x: 0 },
  },
  
  slideInRight: {
    hidden: { x: '100%' },
    visible: { x: 0 },
  },
  
  slideInUp: {
    hidden: { y: '100%' },
    visible: { y: 0 },
  },
  
  slideInDown: {
    hidden: { y: '-100%' },
    visible: { y: 0 },
  },
  
  // Bollywood-inspired cinematic variants
  curtainRise: {
    hidden: { 
      opacity: 0,
      y: 40,
      scale: 0.95,
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'tween',
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: ANIMATION_TIMING.dramatic,
      },
    },
  },
  
  spotlight: {
    hidden: {
      opacity: 0,
      scale: 0.3,
      filter: 'brightness(0.5)',
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'brightness(1)',
      transition: {
        type: 'spring',
        stiffness: 180,
        damping: 12,
        duration: ANIMATION_TIMING.slow,
      },
    },
  },
  
  filmStrip: {
    hidden: {
      opacity: 0,
      x: -100,
      rotateX: -15,
    },
    visible: {
      opacity: 1,
      x: 0,
      rotateX: 0,
      transition: {
        type: 'tween',
        ease: [0.175, 0.885, 0.32, 1.275],
        duration: ANIMATION_TIMING.moderate,
      },
    },
  },
  
  stageEntrance: {
    hidden: {
      opacity: 0,
      y: 60,
      scale: 0.8,
      rotate: -5,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
        duration: ANIMATION_TIMING.slow,
      },
    },
  },
};

// Performance optimization utilities
export const WILL_CHANGE_AUTO = {
  willChange: 'auto',
} as const;

export const WILL_CHANGE_TRANSFORM = {
  willChange: 'transform',
} as const;

export const WILL_CHANGE_OPACITY = {
  willChange: 'opacity',
} as const;

export const WILL_CHANGE_TRANSFORM_OPACITY = {
  willChange: 'transform, opacity',
} as const;

// GPU acceleration helpers
export const FORCE_GPU_ACCELERATION = {
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden' as const,
  perspective: 1000,
} as const;

// Reduced motion preferences
export const REDUCED_MOTION_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Animation duration based on content length (for dynamic content)
export const getDynamicDuration = (contentLength: number): number => {
  const baseTime = ANIMATION_TIMING.standard;
  const scaleFactor = Math.min(contentLength / 100, 2); // Max 2x base time
  return baseTime + (scaleFactor * 0.1);
};

// Responsive animation utilities
export const getResponsiveTransition = (isMobile: boolean): Transition => {
  return isMobile 
    ? { ...SPRING_CONFIGS.snappy, duration: ANIMATION_TIMING.fast }
    : { ...SPRING_CONFIGS.gentle, duration: ANIMATION_TIMING.standard };
};

// Network-aware animation configuration
export const getNetworkAwareConfig = (connectionSpeed: 'slow' | 'medium' | 'fast') => {
  switch (connectionSpeed) {
    case 'slow':
      return {
        duration: ANIMATION_TIMING.fast,
        transition: SPRING_CONFIGS.snappy,
        reducedMotion: true,
      };
    case 'medium':
      return {
        duration: ANIMATION_TIMING.standard,
        transition: SPRING_CONFIGS.gentle,
        reducedMotion: false,
      };
    case 'fast':
    default:
      return {
        duration: ANIMATION_TIMING.moderate,
        transition: SPRING_CONFIGS.smooth,
        reducedMotion: false,
      };
  }
};

export type AnimationConfig = typeof SPRING_CONFIGS;
export type AnimationVariant = keyof typeof COMMON_VARIANTS;
export type AnimationTiming = keyof typeof ANIMATION_TIMING;