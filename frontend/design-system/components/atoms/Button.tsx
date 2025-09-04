'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button Component
 * Primary interactive element with multiple variants and states
 */

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'rounded-lg whitespace-nowrap',
    'select-none appearance-none',
    'relative overflow-hidden',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-500 text-white',
          'hover:bg-brand-600',
          'focus-visible:ring-brand-500',
          'dark:bg-brand-400 dark:text-neutral-950',
          'dark:hover:bg-brand-500',
        ].join(' '),
        
        secondary: [
          'bg-white text-brand-600',
          'border border-brand-500',
          'hover:bg-neutral-50',
          'focus-visible:ring-brand-500',
          'dark:bg-transparent dark:text-brand-400',
          'dark:border-brand-400 dark:hover:bg-white/5',
        ].join(' '),
        
        ghost: [
          'text-brand-600 bg-transparent',
          'hover:bg-neutral-50',
          'focus-visible:ring-brand-500',
          'dark:text-brand-400 dark:hover:bg-white/5',
        ].join(' '),
        
        danger: [
          'bg-error-500 text-white',
          'hover:bg-error-600',
          'focus-visible:ring-error-500',
          'dark:bg-error-500 dark:hover:bg-error-600',
        ].join(' '),
        
        premium: [
          'bg-gradient-to-r from-brand-500 to-accent-500',
          'text-white shadow-lg shadow-brand-500/25',
          'hover:shadow-xl hover:shadow-brand-500/30',
          'hover:scale-[1.02]',
          'focus-visible:ring-accent-500',
          'dark:from-brand-400 dark:to-accent-400',
          'dark:shadow-brand-400/20 dark:hover:shadow-brand-400/30',
        ].join(' '),
      },
      
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        xl: 'h-14 px-8 text-xl',
      },
      
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

// Ripple effect styles
const rippleStyles = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  .ripple::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.3;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  
  .ripple-active::before {
    width: 100%;
    height: 100%;
    animation: ripple 600ms ease-out;
  }
`;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ripple?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    ripple = true,
    children,
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const [isRippling, setIsRippling] = React.useState(false);
    const [rippleOrigin, setRippleOrigin] = React.useState({ x: 0, y: 0 });
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setRippleOrigin({ x, y });
        setIsRippling(true);
        
        setTimeout(() => {
          setIsRippling(false);
        }, 600);
      }
      
      onClick?.(e);
    };
    
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: rippleStyles }} />
        <button
          className={cn(
            buttonVariants({ variant, size, fullWidth, className }),
            isRippling && ripple && 'ripple ripple-active'
          )}
          ref={ref}
          disabled={disabled || loading}
          onClick={handleClick}
          {...props}
          style={{
            ...props.style,
            '--ripple-x': `${rippleOrigin.x}px`,
            '--ripple-y': `${rippleOrigin.y}px`,
          } as React.CSSProperties}
        >
          {loading ? (
            <>
              <LoadingSpinner size={size} />
              <span className="ml-2">Loading...</span>
            </>
          ) : (
            <>
              {leftIcon && <span className="mr-2">{leftIcon}</span>}
              {children}
              {rightIcon && <span className="ml-2">{rightIcon}</span>}
            </>
          )}
        </button>
      </>
    );
  }
);

Button.displayName = 'Button';

// Loading spinner component
const LoadingSpinner = ({ size }: { size?: string }) => {
  const sizeClass = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size || 'md'];
  
  return (
    <svg
      className={cn('animate-spin', sizeClass)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export { Button, buttonVariants };