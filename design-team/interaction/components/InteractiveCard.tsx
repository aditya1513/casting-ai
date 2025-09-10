import { motion, useMotionValue, useTransform, useSpring, PanInfo } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { SPRING_CONFIGS, GESTURE_THRESHOLDS } from '../core/spring-configs';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  draggable?: boolean;
  tiltEffect?: boolean;
  expandable?: boolean;
  variant?: 'default' | 'elevated' | 'glass' | 'mumbai';
  image?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className = '',
  onClick,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  draggable = false,
  tiltEffect = true,
  expandable = false,
  variant = 'default',
  image,
  title,
  subtitle,
  actions
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  // Motion values for interactions
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  
  // Spring animations
  const springX = useSpring(x, SPRING_CONFIGS.ultraSmooth);
  const springY = useSpring(y, SPRING_CONFIGS.ultraSmooth);
  const springRotateX = useSpring(rotateX, SPRING_CONFIGS.gentle);
  const springRotateY = useSpring(rotateY, SPRING_CONFIGS.gentle);
  
  // Transform values for visual effects
  const shadowX = useTransform(springX, [-100, 100], [-10, 10]);
  const shadowY = useTransform(springY, [-100, 100], [-10, 10]);
  const scale = useTransform([springX, springY], ([x, y]) => {
    const distance = Math.sqrt(x * x + y * y);
    return 1 + Math.min(distance / 1000, 0.05);
  });
  
  // Swipe opacity indicators
  const leftSwipeOpacity = useTransform(x, [-200, -50], [1, 0]);
  const rightSwipeOpacity = useTransform(x, [50, 200], [0, 1]);
  
  // Long press timer
  const longPressTimer = useRef<NodeJS.Timeout>();
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tiltEffect || !isHovered) return;
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const rotateXValue = ((e.clientY - centerY) / rect.height) * 20;
    const rotateYValue = ((e.clientX - centerX) / rect.width) * 20;
    
    rotateX.set(-rotateXValue);
    rotateY.set(rotateYValue);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    x.set(0);
    y.set(0);
  };
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = GESTURE_THRESHOLDS.swipe.distance;
    const velocity = GESTURE_THRESHOLDS.swipe.velocity;
    
    if (info.offset.x < -swipeThreshold && info.velocity.x < -velocity && onSwipeLeft) {
      onSwipeLeft();
    } else if (info.offset.x > swipeThreshold && info.velocity.x > velocity && onSwipeRight) {
      onSwipeRight();
    } else {
      // Spring back to center
      x.set(0);
      y.set(0);
    }
  };
  
  const handlePressStart = () => {
    setIsPressing(true);
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        // Haptic feedback simulation
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, GESTURE_THRESHOLDS.press.duration);
    }
  };
  
  const handlePressEnd = () => {
    setIsPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };
  
  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          background: 'white',
          boxShadow: isHovered
            ? '0 20px 40px rgba(0, 0, 0, 0.15)'
            : '0 10px 20px rgba(0, 0, 0, 0.1)',
        };
      case 'glass':
        return {
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        };
      case 'mumbai':
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: isHovered
            ? '0 20px 40px rgba(102, 126, 234, 0.4)'
            : '0 10px 20px rgba(102, 126, 234, 0.2)',
        };
      default:
        return {
          background: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        };
    }
  };
  
  return (
    <motion.div
      ref={cardRef}
      className={`relative rounded-xl overflow-hidden cursor-pointer ${className}`}
      style={{
        ...getVariantStyles(),
        x: springX,
        y: springY,
        rotateX: tiltEffect ? springRotateX : 0,
        rotateY: tiltEffect ? springRotateY : 0,
        scale,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      drag={draggable}
      dragElastic={GESTURE_THRESHOLDS.drag.elasticity}
      dragConstraints={{ left: -200, right: 200, top: -100, bottom: 100 }}
      onDragEnd={handleDragEnd}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onClick={() => {
        if (expandable) {
          setIsExpanded(!isExpanded);
        }
        if (onClick) {
          onClick();
        }
      }}
      whileHover={{ scale: tiltEffect ? 1.02 : 1 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_CONFIGS.gentle}
      animate={{
        height: isExpanded ? 'auto' : undefined,
      }}
    >
      {/* Swipe indicators */}
      {draggable && (
        <>
          <motion.div
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
            style={{ opacity: leftSwipeOpacity }}
          >
            Remove
          </motion.div>
          <motion.div
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium"
            style={{ opacity: rightSwipeOpacity }}
          >
            Accept
          </motion.div>
        </>
      )}
      
      {/* Card image */}
      {image && (
        <motion.div
          className="relative h-48 overflow-hidden"
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={SPRING_CONFIGS.gentle}
        >
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </motion.div>
      )}
      
      {/* Card content */}
      <div className="p-6">
        {title && (
          <motion.h3
            className="text-xl font-semibold mb-2"
            animate={{
              x: isHovered ? 4 : 0,
            }}
            transition={SPRING_CONFIGS.gentle}
          >
            {title}
          </motion.h3>
        )}
        
        {subtitle && (
          <motion.p
            className="text-gray-600 mb-4"
            animate={{
              opacity: isHovered ? 1 : 0.7,
            }}
            transition={SPRING_CONFIGS.gentle}
          >
            {subtitle}
          </motion.p>
        )}
        
        {children}
        
        {/* Expandable content */}
        <AnimatePresence>
          {expandable && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING_CONFIGS.standard}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <p className="text-sm text-gray-600">
                Additional expanded content goes here...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Action buttons */}
      {actions && (
        <motion.div
          className="px-6 pb-4 flex gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isHovered || showActions ? 1 : 0,
            y: isHovered || showActions ? 0 : 20,
          }}
          transition={SPRING_CONFIGS.gentle}
        >
          {actions}
        </motion.div>
      )}
      
      {/* Long press indicator */}
      {isPressing && onLongPress && (
        <motion.div
          className="absolute inset-0 bg-black/10 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: GESTURE_THRESHOLDS.press.duration / 1000 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-white rounded-full"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: GESTURE_THRESHOLDS.press.duration / 1000 }}
          />
        </motion.div>
      )}
      
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 opacity-0 pointer-events-none"
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={SPRING_CONFIGS.gentle}
      />
    </motion.div>
  );
};

// Re-export AnimatePresence for convenience
export { AnimatePresence } from 'framer-motion';