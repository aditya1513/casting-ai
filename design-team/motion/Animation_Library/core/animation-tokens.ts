/**
 * CastMatch Motion Design System
 * Core Animation Tokens - Cinema-grade timing and easing
 */

// Duration tokens based on 24fps film standards
export const duration = {
  instant: 0, // 0ms - immediate
  micro: 50,  // 1-2 frames - micro interactions
  fast: 150,  // 3-4 frames - quick feedback
  base: 250,  // 6 frames - standard transitions
  smooth: 350, // 8-9 frames - smooth interactions
  cinematic: 500, // 12 frames - cinematic feel
  dramatic: 750,  // 18 frames - dramatic emphasis
  epic: 1000,     // 24 frames - epic transitions
  extended: 1500, // 36 frames - extended sequences
} as const;

// Hollywood-inspired easing curves
export const easing = {
  // Standard eases
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Custom cubic-bezier curves for cinematic feel
  entrance: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth entrance
  exit: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',   // Quick exit
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Playful bounce
  dramatic: 'cubic-bezier(0.19, 1, 0.22, 1)',       // Dramatic ease
  cinematic: 'cubic-bezier(0.77, 0, 0.175, 1)',     // Cinema-like
  organic: 'cubic-bezier(0.23, 1, 0.320, 1)',       // Organic motion
  anticipation: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)', // Anticipation
} as const;

// Stagger delays for sequential animations
export const stagger = {
  micro: 25,   // Micro stagger
  tight: 50,   // Tight sequence
  base: 100,   // Standard stagger
  relaxed: 150, // Relaxed timing
  dramatic: 200, // Dramatic reveal
  epic: 300,   // Epic sequence
} as const;

// Spring physics configurations
export const spring = {
  // Gentle spring for UI elements
  gentle: {
    type: 'spring',
    stiffness: 100,
    damping: 15,
    mass: 1,
  },
  
  // Bouncy spring for playful interactions
  bouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 10,
    mass: 1,
  },
  
  // Snappy spring for quick responses
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
    mass: 1,
  },
  
  // Dramatic spring for emphasis
  dramatic: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 1.5,
  },
  
  // Cinematic spring for smooth transitions
  cinematic: {
    type: 'spring',
    stiffness: 150,
    damping: 30,
    mass: 2,
  },
} as const;

// Transform utilities
export const transform = {
  // Scale variants
  scaleEnter: { scale: 0.8, opacity: 0 },
  scaleExit: { scale: 0.95, opacity: 0 },
  scaleHover: { scale: 1.05 },
  scalePress: { scale: 0.95 },
  
  // Slide variants
  slideUp: { y: 20, opacity: 0 },
  slideDown: { y: -20, opacity: 0 },
  slideLeft: { x: 20, opacity: 0 },
  slideRight: { x: -20, opacity: 0 },
  
  // Rotation variants
  rotateClockwise: { rotate: 45, opacity: 0 },
  rotateCounterClockwise: { rotate: -45, opacity: 0 },
  
  // Advanced transforms
  perspective: { rotateX: -15, scale: 0.95, opacity: 0 },
  flip: { rotateY: 90, opacity: 0 },
  
  // Cinema-style transforms
  dolly: { scale: 1.1, z: 100, opacity: 0 },
  zoom: { scale: 0.8, z: -100, opacity: 0 },
} as const;

// Animation variants for common patterns
export const variants = {
  // Fade animations
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: duration.base / 1000, ease: easing.entrance }
    }
  },
  
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: duration.smooth / 1000, ease: easing.entrance }
    }
  },
  
  // Scale animations
  scaleIn: {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: duration.cinematic / 1000, ease: easing.dramatic }
    }
  },
  
  // Slide animations
  slideInLeft: {
    hidden: { x: -100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: duration.smooth / 1000, ease: easing.cinematic }
    }
  },
  
  // Container animations for stagger effects
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger.base / 1000,
        delayChildren: stagger.micro / 1000,
      }
    }
  },
  
  // List item animations
  listItem: {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: duration.base / 1000, ease: easing.entrance }
    }
  },
} as const;

// Performance optimization settings
export const performance = {
  // GPU acceleration hints
  willChange: {
    transform: 'transform',
    opacity: 'opacity',
    filter: 'filter',
    auto: 'auto',
  },
  
  // Layer promotion for complex animations
  promote: {
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    perspective: '1000px',
  },
  
  // Reduced motion preferences
  reducedMotion: {
    duration: duration.fast,
    easing: easing.ease,
    disableTransforms: true,
  },
} as const;

// Color animation tokens
export const colors = {
  // Brand gradients for animations
  primary: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
  secondary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  accent: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  
  // Glow effects
  purpleGlow: '0 0 20px rgba(139, 92, 246, 0.3)',
  blueGlow: '0 0 20px rgba(99, 102, 241, 0.3)',
  goldGlow: '0 0 20px rgba(245, 158, 11, 0.3)',
  
  // Shadow variants
  softShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  mediumShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  dramaticShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;
export type Spring = keyof typeof spring;
export type Transform = keyof typeof transform;
export type Variant = keyof typeof variants;