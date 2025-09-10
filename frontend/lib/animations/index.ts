/**
 * CastMatch Animation System
 * Central export for all animation utilities and components
 */

// Spring configurations and constants
export * from './spring-configs';

// Animation variants
export * from './variants';

// Gesture patterns and handlers
export * from './gesture-patterns';

// Performance optimization utilities
export * from './performance-optimizer';

// Re-export components
export { AnimatedButton, FloatingActionButton } from '@/components/interactive/AnimatedButton';
export { AnimatedTalentCard } from '@/components/interactive/AnimatedTalentCard';
export { AnimatedSidebar } from '@/components/interactive/AnimatedSidebar';
export { AnimatedMessage, TypingIndicator, AnimatedMessageList } from '@/components/interactive/AnimatedMessage';

// Animation presets for common use cases
export const animationPresets = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  },
  
  // Modal animations
  modalEnter: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  
  // List item animations
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.2 }
  },
  
  // Notification animations
  notification: {
    initial: { opacity: 0, y: -50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, x: 100 },
    transition: { type: 'spring', stiffness: 500, damping: 25 }
  },
  
  // Card hover effects
  cardHover: {
    whileHover: { 
      y: -4, 
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      transition: { duration: 0.2 }
    },
    whileTap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  }
};

// Utility function to combine animation props
export const combineAnimations = (...animations: any[]) => {
  return animations.reduce((acc, animation) => ({
    ...acc,
    ...animation,
    transition: {
      ...acc.transition,
      ...animation.transition
    }
  }), {});
};

// Animation orchestration for complex sequences
export const orchestrateAnimations = (
  animations: Array<{
    element: string;
    animation: any;
    delay?: number;
  }>
) => {
  return animations.reduce((acc, { element, animation, delay = 0 }) => ({
    ...acc,
    [element]: {
      ...animation,
      transition: {
        ...animation.transition,
        delay
      }
    }
  }), {});
};

// Export types
export type { AnimatedButtonProps } from '@/components/interactive/AnimatedButton';
export type { AnimatedTalentCardProps } from '@/components/interactive/AnimatedTalentCard';
export type { AnimatedSidebarProps } from '@/components/interactive/AnimatedSidebar';
export type { AnimatedMessageProps } from '@/components/interactive/AnimatedMessage';