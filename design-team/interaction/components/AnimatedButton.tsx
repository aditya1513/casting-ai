import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { SPRING_CONFIGS, TRANSITION_DURATIONS } from '../core/spring-configs';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'mumbai';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  className?: string;
  magneticHover?: boolean;
  rippleEffect?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  success = false,
  className = '',
  magneticHover = true,
  rippleEffect = true
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  
  // Magnetic hover effect values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring animations for smooth magnetic effect
  const springX = useSpring(mouseX, SPRING_CONFIGS.ultraSmooth);
  const springY = useSpring(mouseY, SPRING_CONFIGS.ultraSmooth);
  
  // Transform values for 3D tilt effect
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-7, 7]);
  
  // Handle magnetic hover
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!magneticHover || disabled) return;
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = (e.clientX - centerX) / rect.width;
    const distanceY = (e.clientY - centerY) / rect.height;
    
    mouseX.set(distanceX);
    mouseY.set(distanceY);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };
  
  // Ripple effect handler
  const createRipple = (e: React.MouseEvent) => {
    if (!rippleEffect || disabled) return;
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const rippleX = e.clientX - rect.left;
    const rippleY = e.clientY - rect.top;
    const rippleId = Date.now();
    
    setRipples(prev => [...prev, { x: rippleX, y: rippleY, id: rippleId }]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
    }, 600);
  };
  
  const handleClick = (e: React.MouseEvent) => {
    createRipple(e);
    if (onClick && !disabled && !loading) {
      onClick();
    }
  };
  
  // Size configurations
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };
  
  // Variant configurations
  const variantClasses = {
    primary: 'bg-cyan-500 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-50',
    mumbai: 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
  };
  
  return (
    <motion.button
      ref={buttonRef}
      className={`
        relative overflow-hidden rounded-lg font-medium
        transition-all duration-200 transform-gpu
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      style={{
        x: magneticHover ? springX : 0,
        y: magneticHover ? springY : 0,
        rotateX: magneticHover ? rotateX : 0,
        rotateY: magneticHover ? rotateY : 0,
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      whileHover={
        !disabled
          ? {
              scale: 1.05,
              transition: SPRING_CONFIGS.gentle
            }
          : {}
      }
      whileTap={
        !disabled
          ? {
              scale: 0.95,
              transition: SPRING_CONFIGS.snappy
            }
          : {}
      }
      animate={{
        boxShadow: isHovered && !disabled
          ? variant === 'primary' || variant === 'mumbai'
            ? '0 20px 40px rgba(0, 0, 0, 0.15)'
            : '0 10px 20px rgba(0, 0, 0, 0.1)'
          : undefined
      }}
    >
      {/* Button content with loading/success states */}
      <motion.span
        className="relative z-10 flex items-center justify-center gap-2"
        animate={{
          opacity: loading || success ? 0 : 1,
          y: loading || success ? -20 : 0
        }}
        transition={SPRING_CONFIGS.standard}
      >
        {children}
      </motion.span>
      
      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING_CONFIGS.gentle}
        >
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
      
      {/* Success checkmark */}
      {success && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING_CONFIGS.bouncy}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
      )}
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute bg-white opacity-30 rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            marginLeft: -5,
            marginTop: -5
          }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 40, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
      
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-0 pointer-events-none"
        animate={{
          opacity: isHovered && !disabled ? 0.1 : 0
        }}
        transition={SPRING_CONFIGS.gentle}
      />
    </motion.button>
  );
};