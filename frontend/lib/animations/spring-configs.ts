/**
 * Spring Animation Configurations for CastMatch
 * Optimized for 60fps performance with GPU acceleration
 */

export const SPRING_CONFIGS = {
  // Gentle animations for subtle feedback
  gentle: { 
    type: "spring",
    stiffness: 300, 
    damping: 25,
    mass: 0.8
  },
  
  // Standard interactions
  medium: { 
    type: "spring",
    stiffness: 400, 
    damping: 20,
    mass: 1
  },
  
  // Bouncy, playful animations
  bouncy: { 
    type: "spring",
    stiffness: 500, 
    damping: 15,
    mass: 0.5
  },
  
  // Instant, snappy feedback
  instant: { 
    type: "spring",
    stiffness: 800, 
    damping: 30,
    mass: 0.3
  },
  
  // Smooth, cinematic transitions
  smooth: {
    type: "spring",
    stiffness: 260,
    damping: 20,
    mass: 1
  },
  
  // Elastic bounce effect
  elastic: {
    type: "spring",
    stiffness: 600,
    damping: 10,
    mass: 0.8
  }
};

export const TRANSITION_DURATIONS = {
  instant: 0.1,
  fast: 0.2,
  medium: 0.3,
  slow: 0.5,
  cinematic: 0.8
};

export const EASING_CURVES = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],
  smooth: [0.25, 0.1, 0.25, 1],
  bounce: [0.68, -0.55, 0.265, 1.55]
};

export const STAGGER_DELAYS = {
  fast: 0.03,
  medium: 0.05,
  slow: 0.08,
  cinematic: 0.12
};

// Performance-optimized transform properties
export const GPU_ACCELERATED_PROPS = {
  transform: true,
  opacity: true,
  filter: true
};

// Reduced motion preferences
export const REDUCED_MOTION_CONFIG = {
  type: "tween",
  duration: 0.01
};

// Animation performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  targetFPS: 60,
  minFPS: 30,
  maxAnimationDuration: 1000, // ms
  maxConcurrentAnimations: 10
};