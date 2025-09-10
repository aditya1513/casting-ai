import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// WCAG AAA Compliant Animation Configurations
export const ANIMATION_CONFIG = {
  // Spring Physics for Natural Motion
  springs: {
    gentle: { type: 'spring', stiffness: 300, damping: 30 },
    medium: { type: 'spring', stiffness: 400, damping: 25 },
    bouncy: { type: 'spring', stiffness: 500, damping: 20 },
    stiff: { type: 'spring', stiffness: 700, damping: 35 },
  },
  
  // Duration-based Transitions
  durations: {
    instant: 0.1,
    fast: 0.2,
    medium: 0.3,
    slow: 0.5,
    verySlow: 0.8,
  },
  
  // Easing Functions
  easings: {
    easeOut: [0.16, 1, 0.3, 1],
    easeInOut: [0.87, 0, 0.13, 1],
    anticipate: [0.36, 0, 0.66, -0.56],
    smooth: [0.43, 0.13, 0.23, 0.96],
  },
};

// Accessibility Hook for Reduced Motion
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};

// Loading State Components
export const SkeletonLoader = ({ 
  width = '100%', 
  height = '20px',
  borderRadius = '4px' 
}: {
  width?: string;
  height?: string;
  borderRadius?: string;
}) => {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
        backgroundSize: '200% 100%',
      }}
      animate={
        reducedMotion
          ? {}
          : {
              backgroundPosition: ['200% 0', '-200% 0'],
            }
      }
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
};

export const CardSkeleton = () => (
  <motion.div
    className="p-4 bg-white border border-gray-200 rounded-lg"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <SkeletonLoader width="60%" height="24px" />
    <div className="mt-2">
      <SkeletonLoader width="100%" height="16px" />
    </div>
    <div className="mt-2">
      <SkeletonLoader width="80%" height="16px" />
    </div>
  </motion.div>
);

// Pulse Loading Animation
export const PulseLoader = () => {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      className="flex space-x-2"
      aria-label="Loading"
      role="status"
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-gray-600 rounded-full"
          animate={
            reducedMotion
              ? { opacity: [0.3, 1, 0.3] }
              : {
                  y: [0, -10, 0],
                  opacity: [0.3, 1, 0.3],
                }
          }
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
          }}
        />
      ))}
    </motion.div>
  );
};

// Error State Component with Recovery
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'Unable to load content. Please try again.',
  onRetry,
  onDismiss,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      className="p-6 bg-red-50 border-2 border-red-500 rounded-lg"
      initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.95 }}
      transition={ANIMATION_CONFIG.springs.gentle}
      role="alert"
      aria-live="assertive"
    >
      <motion.div
        className="flex items-center"
        initial={{ x: reducedMotion ? 0 : -20 }}
        animate={{ x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
          !
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-red-900">{title}</h3>
          <p className="text-red-700 mt-1">{message}</p>
        </div>
      </motion.div>
      
      <motion.div
        className="flex gap-3 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {onRetry && (
          <motion.button
            className="px-4 py-2 bg-red-500 text-white rounded-md font-medium"
            whileHover={{ scale: reducedMotion ? 1 : 1.05 }}
            whileTap={{ scale: reducedMotion ? 1 : 0.95 }}
            onClick={onRetry}
          >
            Try Again
          </motion.button>
        )}
        {onDismiss && (
          <motion.button
            className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-md font-medium"
            whileHover={{ scale: reducedMotion ? 1 : 1.05 }}
            whileTap={{ scale: reducedMotion ? 1 : 0.95 }}
            onClick={onDismiss}
          >
            Dismiss
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

// Empty State Component
export const EmptyState = ({
  icon = '📋',
  title = 'No data available',
  message = 'There is no content to display at the moment.',
  actionLabel,
  onAction,
}: {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION_CONFIG.springs.gentle}
    >
      <motion.div
        className="text-6xl opacity-30 mb-4"
        animate={
          reducedMotion
            ? {}
            : {
                rotate: [0, 10, -10, 0],
              }
        }
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        {icon}
      </motion.div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md">{message}</p>
      
      {actionLabel && onAction && (
        <motion.button
          className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium"
          whileHover={{ scale: reducedMotion ? 1 : 1.05 }}
          whileTap={{ scale: reducedMotion ? 1 : 0.95 }}
          onClick={onAction}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

// Interactive Card Component
export const InteractiveCard = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  error = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  className?: string;
}) => {
  const reducedMotion = useReducedMotion();
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <motion.div
      className={`
        relative p-4 bg-white border rounded-lg cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'}
        ${className}
      `}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={
        !disabled && !reducedMotion
          ? {
              y: -4,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            }
          : {}
      }
      whileTap={!disabled && !reducedMotion ? { scale: 0.98 } : {}}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={!disabled ? onClick : undefined}
      transition={ANIMATION_CONFIG.springs.gentle}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-busy={loading}
    >
      <AnimatePresence>
        {loading && (
          <motion.div
            className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PulseLoader />
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        animate={isPressed && !reducedMotion ? { scale: 0.98 } : {}}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Success Animation Component
export const SuccessAnimation = ({ onComplete }: { onComplete?: () => void }) => {
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-full p-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={ANIMATION_CONFIG.springs.bouncy}
        onAnimationComplete={onComplete}
      >
        <motion.svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-green-500"
        >
          <motion.path
            d="M20 6L9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reducedMotion ? 0.1 : 0.5,
              ease: 'easeOut',
            }}
          />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
};

// Toast Notification Component
export const Toast = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };
  
  return (
    <motion.div
      className={`
        flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-lg shadow-lg
        ${type === 'success' ? 'border-green-500' : ''}
        ${type === 'error' ? 'border-red-500' : ''}
        ${type === 'warning' ? 'border-yellow-500' : ''}
        ${type === 'info' ? 'border-blue-500' : ''}
      `}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={ANIMATION_CONFIG.springs.gentle}
      role="alert"
      aria-live="polite"
    >
      <div className={`w-2 h-2 ${colors[type]} rounded-full`} />
      <p className="flex-1 text-gray-900">{message}</p>
      <motion.button
        className="text-gray-500 hover:text-gray-700"
        whileHover={{ scale: reducedMotion ? 1 : 1.1 }}
        whileTap={{ scale: reducedMotion ? 1 : 0.9 }}
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </motion.button>
    </motion.div>
  );
};

// Focus Trap Hook for Modals
export const useFocusTrap = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref]);
};

// Progressive Enhancement Wrapper
export const ProgressiveEnhancement = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return <>{fallback || children}</>;
  }
  
  return <>{children}</>;
};

// Scroll-triggered Animation Hook
export const useScrollAnimation = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const controls = useAnimation();
  const reducedMotion = useReducedMotion();
  
  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);
  
  return {
    ref,
    animate: controls,
    initial: reducedMotion ? 'visible' : 'hidden',
    variants: {
      hidden: { opacity: 0, y: 50 },
      visible: {
        opacity: 1,
        y: 0,
        transition: ANIMATION_CONFIG.springs.gentle,
      },
    },
  };
};