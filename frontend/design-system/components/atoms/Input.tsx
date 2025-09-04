'use client';

import React, { forwardRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Input Component
 * Form input element with validation states and icons
 */

const inputVariants = cva(
  [
    'w-full rounded-lg transition-all duration-200',
    'bg-white dark:bg-neutral-900/50',
    'text-neutral-900 dark:text-neutral-50',
    'placeholder:text-neutral-500 dark:placeholder:text-neutral-400',
    'border border-neutral-300 dark:border-white/15',
    'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
    'focus:border-brand-500 dark:focus:border-brand-400',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3 text-base',
        lg: 'h-12 px-4 text-lg',
      },
      
      variant: {
        default: '',
        error: [
          'border-error-500 dark:border-error-500',
          'bg-error-50 dark:bg-error-500/10',
          'focus:ring-error-500/20 focus:border-error-500',
        ].join(' '),
        success: [
          'border-success-500 dark:border-success-500',
          'bg-success-50 dark:bg-success-500/10',
          'focus:ring-success-500/20 focus:border-success-500',
        ].join(' '),
      },
      
      withIcon: {
        left: 'pl-10',
        right: 'pr-10',
        both: 'px-10',
      },
    },
    
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

const inputWrapperVariants = cva('relative w-full', {
  variants: {
    fullWidth: {
      true: 'w-full',
      false: 'w-auto',
    },
  },
  defaultVariants: {
    fullWidth: true,
  },
});

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    size,
    variant,
    label,
    error,
    success,
    helper,
    leftIcon,
    rightIcon,
    fullWidth = true,
    showPasswordToggle = false,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    // Determine variant based on error/success states
    const computedVariant = error ? 'error' : success ? 'success' : variant;
    
    // Determine icon positioning
    const withIcon = leftIcon && rightIcon ? 'both' : leftIcon ? 'left' : rightIcon || (type === 'password' && showPasswordToggle) ? 'right' : undefined;
    
    return (
      <div className={inputWrapperVariants({ fullWidth })}>
        {label && (
          <label className="block mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            type={inputType}
            className={cn(
              inputVariants({ size, variant: computedVariant, withIcon }),
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          
          {(rightIcon || (type === 'password' && showPasswordToggle)) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
              {type === 'password' && showPasswordToggle ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>
        
        {(error || success || helper) && (
          <div className={cn(
            'mt-1.5 text-sm',
            error && 'text-error-600 dark:text-error-400',
            success && 'text-success-600 dark:text-success-400',
            !error && !success && 'text-neutral-500 dark:text-neutral-400'
          )}>
            {error || success || helper}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Icon components
const EyeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Textarea variant
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & 
  Omit<InputProps, 'type' | 'showPasswordToggle'>
>(({ className, size = 'md', variant, label, error, success, helper, ...props }, ref) => {
  const computedVariant = error ? 'error' : success ? 'success' : variant;
  
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      
      <textarea
        className={cn(
          inputVariants({ size, variant: computedVariant }),
          'min-h-[100px] py-2',
          className
        )}
        ref={ref}
        {...props}
      />
      
      {(error || success || helper) && (
        <div className={cn(
          'mt-1.5 text-sm',
          error && 'text-error-600 dark:text-error-400',
          success && 'text-success-600 dark:text-success-400',
          !error && !success && 'text-neutral-500 dark:text-neutral-400'
        )}>
          {error || success || helper}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export { Input, inputVariants };