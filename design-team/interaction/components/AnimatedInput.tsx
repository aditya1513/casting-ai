import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { SPRING_CONFIGS, TRANSITION_DURATIONS } from '../core/spring-configs';

interface AnimatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  placeholder?: string;
  error?: string;
  success?: boolean;
  helper?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  validation?: (value: string) => string | null;
  realTimeValidation?: boolean;
  autoComplete?: string;
  maxLength?: number;
  variant?: 'standard' | 'floating' | 'outlined' | 'mumbai';
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  error = '',
  success = false,
  helper = '',
  required = false,
  disabled = false,
  icon,
  validation,
  realTimeValidation = true,
  autoComplete,
  maxLength,
  variant = 'floating'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localError, setLocalError] = useState(error);
  const [showPassword, setShowPassword] = useState(false);
  const [charCount, setCharCount] = useState(value.length);
  
  // Animation values
  const labelY = useMotionValue(0);
  const labelScale = useMotionValue(1);
  const borderWidth = useMotionValue(1);
  
  // Progress bar for character count
  const progressWidth = useTransform(
    useMotionValue(charCount),
    [0, maxLength || 100],
    ['0%', '100%']
  );
  
  useEffect(() => {
    setCharCount(value.length);
    
    // Real-time validation
    if (realTimeValidation && validation && value) {
      const validationResult = validation(value);
      setLocalError(validationResult || '');
    }
  }, [value, validation, realTimeValidation]);
  
  const handleFocus = () => {
    setIsFocused(true);
    if (variant === 'floating') {
      labelY.set(-24);
      labelScale.set(0.85);
    }
    borderWidth.set(2);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    if (variant === 'floating' && !value) {
      labelY.set(0);
      labelScale.set(1);
    }
    borderWidth.set(1);
    
    // Validate on blur
    if (validation && value) {
      const validationResult = validation(value);
      setLocalError(validationResult || '');
    }
  };
  
  const getInputType = () => {
    if (type === 'password' && showPassword) return 'text';
    return type;
  };
  
  // Variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'standard':
        return 'border-b-2 border-gray-300 focus:border-cyan-500 pb-2';
      case 'outlined':
        return 'border-2 border-gray-300 focus:border-cyan-500 rounded-lg px-4 py-3';
      case 'floating':
        return 'border-2 border-gray-300 focus:border-cyan-500 rounded-lg px-4 pt-6 pb-2';
      case 'mumbai':
        return 'border-2 border-orange-300 focus:border-orange-500 rounded-xl px-4 py-3 bg-gradient-to-r from-orange-50 to-pink-50';
      default:
        return '';
    }
  };
  
  const errorState = localError || error;
  const hasContent = value.length > 0;
  
  return (
    <div className="relative w-full">
      <motion.div
        className="relative"
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={SPRING_CONFIGS.ultraSmooth}
      >
        {/* Floating label for floating variant */}
        {variant === 'floating' && (
          <motion.label
            className={`
              absolute left-4 top-4 text-gray-600 pointer-events-none
              ${isFocused || hasContent ? 'text-sm' : 'text-base'}
              ${errorState ? 'text-red-500' : isFocused ? 'text-cyan-500' : ''}
            `}
            style={{
              y: hasContent || isFocused ? -24 : labelY,
              scale: hasContent || isFocused ? 0.85 : labelScale,
              originX: 0,
              originY: 0
            }}
            transition={SPRING_CONFIGS.gentle}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </motion.label>
        )}
        
        {/* Standard label for other variants */}
        {variant !== 'floating' && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        {/* Input container */}
        <motion.div
          className="relative"
          whileHover={{ scale: disabled ? 1 : 1.01 }}
          transition={SPRING_CONFIGS.ultraSmooth}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
        >
          {/* Icon */}
          {icon && (
            <motion.div
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              animate={{
                color: isFocused ? '#06b6d4' : '#9ca3af',
                scale: isFocused ? 1.1 : 1
              }}
              transition={SPRING_CONFIGS.gentle}
            >
              {icon}
            </motion.div>
          )}
          
          {/* Input field */}
          <motion.input
            ref={inputRef}
            type={getInputType()}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            placeholder={variant !== 'floating' ? placeholder : ''}
            className={`
              w-full bg-transparent outline-none transition-all duration-200
              ${getVariantClasses()}
              ${icon ? 'pl-10' : ''}
              ${type === 'password' ? 'pr-10' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${errorState ? 'border-red-500 text-red-900' : ''}
              ${success ? 'border-green-500' : ''}
            `}
            animate={{
              borderColor: errorState
                ? '#ef4444'
                : success
                ? '#10b981'
                : isFocused
                ? '#06b6d4'
                : '#d1d5db',
            }}
          />
          
          {/* Password toggle */}
          {type === 'password' && (
            <motion.button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING_CONFIGS.snappy}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </motion.button>
          )}
          
          {/* Character count */}
          {maxLength && (
            <div className="absolute right-3 bottom-1 text-xs text-gray-400">
              <motion.span
                animate={{
                  color: charCount >= maxLength * 0.9 ? '#ef4444' : '#9ca3af'
                }}
              >
                {charCount}/{maxLength}
              </motion.span>
            </div>
          )}
        </motion.div>
        
        {/* Progress bar for character count */}
        {maxLength && (
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-gray-200 w-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: isFocused ? 1 : 0 }}
            transition={SPRING_CONFIGS.gentle}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{ width: progressWidth }}
              transition={SPRING_CONFIGS.standard}
            />
          </motion.div>
        )}
      </motion.div>
      
      {/* Helper text and error messages */}
      <AnimatePresence mode="wait">
        {(errorState || helper || success) && (
          <motion.div
            className="mt-1 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_CONFIGS.gentle}
          >
            {errorState && (
              <motion.p
                className="text-red-500 flex items-center gap-1"
                initial={{ x: -10 }}
                animate={{ x: 0 }}
                transition={SPRING_CONFIGS.bouncy}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorState}
              </motion.p>
            )}
            {success && !errorState && (
              <motion.p
                className="text-green-500 flex items-center gap-1"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={SPRING_CONFIGS.bouncy}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Looks good!
              </motion.p>
            )}
            {helper && !errorState && !success && (
              <p className="text-gray-500">{helper}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};