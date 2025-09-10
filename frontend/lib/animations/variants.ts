/**
 * Framer Motion Animation Variants for CastMatch
 * Reusable animation patterns for consistent UI behavior
 */

import { Variants } from 'framer-motion';
import { SPRING_CONFIGS, EASING_CURVES } from './spring-configs';

// Fade animations
export const fadeVariants: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: { 
    scale: 0.8, 
    opacity: 0 
  },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: SPRING_CONFIGS.medium
  },
  hover: { 
    scale: 1.05,
    transition: SPRING_CONFIGS.gentle
  },
  tap: { 
    scale: 0.95,
    transition: SPRING_CONFIGS.instant
  }
};

// Slide animations
export const slideVariants = {
  left: {
    hidden: { x: -100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: SPRING_CONFIGS.smooth
    },
    exit: { x: -100, opacity: 0 }
  },
  right: {
    hidden: { x: 100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: SPRING_CONFIGS.smooth
    },
    exit: { x: 100, opacity: 0 }
  },
  up: {
    hidden: { y: 50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: SPRING_CONFIGS.smooth
    },
    exit: { y: -50, opacity: 0 }
  },
  down: {
    hidden: { y: -50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: SPRING_CONFIGS.smooth
    },
    exit: { y: 50, opacity: 0 }
  }
};

// Sidebar animations
export const sidebarVariants: Variants = {
  expanded: {
    width: '256px',
    transition: {
      duration: 0.3,
      ease: EASING_CURVES.easeInOut,
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  collapsed: {
    width: '72px',
    transition: {
      duration: 0.3,
      ease: EASING_CURVES.easeInOut,
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// Sidebar content animations
export const sidebarContentVariants: Variants = {
  expanded: {
    opacity: 1,
    x: 0,
    display: 'block',
    transition: {
      duration: 0.2,
      delay: 0.1
    }
  },
  collapsed: {
    opacity: 0,
    x: -20,
    transitionEnd: {
      display: 'none'
    }
  }
};

// Message animations
export const messageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING_CONFIGS.gentle
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// Talent card animations
export const talentCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    rotateX: -15
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      ...SPRING_CONFIGS.smooth,
      rotateX: { duration: 0.4 }
    }
  },
  hover: {
    y: -4,
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    transition: SPRING_CONFIGS.gentle
  },
  tap: {
    scale: 0.98,
    transition: SPRING_CONFIGS.instant
  },
  flip: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: EASING_CURVES.easeInOut
    }
  }
};

// Button animations
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    transition: SPRING_CONFIGS.gentle
  },
  tap: {
    scale: 0.95,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: SPRING_CONFIGS.instant
  },
  loading: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Input field animations
export const inputVariants: Variants = {
  idle: {
    borderColor: 'rgba(0,0,0,0.1)',
    boxShadow: 'none'
  },
  focus: {
    borderColor: 'rgba(6, 182, 212, 0.5)',
    boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.1)',
    transition: { duration: 0.2 }
  },
  error: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
    transition: { duration: 0.2 }
  },
  success: {
    borderColor: 'rgba(34, 197, 94, 0.5)',
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1)',
    transition: { duration: 0.2 }
  }
};

// Loading dots animation
export const loadingDotsVariants: Variants = {
  start: {
    transition: {
      staggerChildren: 0.1
    }
  },
  end: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const dotVariants: Variants = {
  start: {
    y: 0
  },
  end: {
    y: -10,
    transition: {
      duration: 0.4,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
};

// Stagger container animations
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING_CONFIGS.gentle
  }
};

// Modal/Overlay animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING_CONFIGS.smooth
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  }
};

export const overlayVariants: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Progress bar animations
export const progressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0
  },
  animate: (progress: number) => ({
    scaleX: progress / 100,
    transition: SPRING_CONFIGS.smooth
  })
};

// Notification animations
export const notificationVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING_CONFIGS.bouncy
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.2 }
  }
};