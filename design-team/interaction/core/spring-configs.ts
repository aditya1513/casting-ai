/**
 * CastMatch Premium Spring Animation Configurations
 * Based on uxerflow-level sophistication
 * Target: 60fps, <100ms response time
 */

export const SPRING_CONFIGS = {
  // Ultra-smooth for micro-interactions
  ultraSmooth: {
    stiffness: 260,
    damping: 26,
    mass: 0.8,
    velocity: 0
  },
  
  // Gentle for hover states
  gentle: {
    stiffness: 300,
    damping: 25,
    mass: 1,
    velocity: 0
  },
  
  // Standard for most interactions
  standard: {
    stiffness: 400,
    damping: 20,
    mass: 1,
    velocity: 0
  },
  
  // Snappy for quick feedback
  snappy: {
    stiffness: 500,
    damping: 18,
    mass: 0.9,
    velocity: 0
  },
  
  // Bouncy for delightful moments
  bouncy: {
    stiffness: 600,
    damping: 15,
    mass: 0.8,
    velocity: 0
  },
  
  // Instant for immediate response
  instant: {
    stiffness: 800,
    damping: 30,
    mass: 0.5,
    velocity: 0
  },
  
  // Mumbai-specific: Energetic
  mumbaiEnergetic: {
    stiffness: 450,
    damping: 17,
    mass: 0.85,
    velocity: 0
  }
};

export const TRANSITION_DURATIONS = {
  instant: 0.1,    // 100ms - immediate feedback
  fast: 0.2,       // 200ms - quick interactions
  medium: 0.3,     // 300ms - standard transitions
  smooth: 0.4,     // 400ms - smooth animations
  slow: 0.5,       // 500ms - deliberate movements
  cinematic: 0.8   // 800ms - dramatic reveals
};

export const EASING_CURVES = {
  // Premium easing functions
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
  smoothSpring: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  
  // Mumbai-specific: Dynamic
  mumbaiDynamic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

export const GESTURE_THRESHOLDS = {
  swipe: {
    distance: 50,      // Minimum swipe distance in pixels
    velocity: 0.5,     // Minimum velocity
    direction: 30      // Maximum angle deviation in degrees
  },
  
  pinch: {
    scale: 0.2,        // Minimum scale change
    sensitivity: 0.01  // Pinch sensitivity
  },
  
  press: {
    duration: 500,     // Long press duration in ms
    movement: 10       // Maximum movement during press
  },
  
  drag: {
    threshold: 5,      // Minimum drag distance to trigger
    elasticity: 0.2,   // Elastic boundary effect
    momentum: 0.98     // Momentum decay rate
  }
};

export const PERFORMANCE_TARGETS = {
  fps: 60,
  responseTime: 100,    // Maximum response time in ms
  animationBudget: 16,  // 16ms per frame for 60fps
  touchDelay: 0,        // No delay on touch events
  gpuAcceleration: true // Force GPU acceleration
};

export const ACCESSIBILITY_CONFIG = {
  reducedMotion: {
    duration: 0.01,     // Near-instant for reduced motion
    stiffness: 10000,  // Very high stiffness
    damping: 1000      // Very high damping
  },
  
  focusIndicator: {
    outline: '2px solid #0066FF',
    outlineOffset: '2px',
    borderRadius: '4px'
  },
  
  touchTarget: {
    minSize: 44,       // Minimum 44x44px touch targets
    padding: 8         // Additional padding for small elements
  }
};