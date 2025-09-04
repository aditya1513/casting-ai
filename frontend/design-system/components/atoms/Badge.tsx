'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge Component
 * Small labeling component for status and categorization
 */

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'font-medium rounded-full',
    'transition-all duration-200',
    'whitespace-nowrap select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-neutral-100 text-neutral-700',
          'dark:bg-neutral-800 dark:text-neutral-300',
        ].join(' '),
        
        success: [
          'bg-success-50 text-success-700',
          'dark:bg-success-500/20 dark:text-success-400',
        ].join(' '),
        
        warning: [
          'bg-warning-50 text-warning-700',
          'dark:bg-warning-500/20 dark:text-warning-400',
        ].join(' '),
        
        error: [
          'bg-error-50 text-error-700',
          'dark:bg-error-500/20 dark:text-error-400',
        ].join(' '),
        
        info: [
          'bg-info-50 text-info-700',
          'dark:bg-info-500/20 dark:text-info-400',
        ].join(' '),
        
        premium: [
          'bg-gradient-to-r from-brand-50 to-accent-50',
          'text-brand-700 border border-brand-200',
          'dark:from-brand-950 dark:to-accent-950',
          'dark:text-brand-400 dark:border-brand-700',
          'shadow-sm shadow-brand-500/10',
        ].join(' '),
        
        outline: [
          'bg-transparent border border-neutral-300',
          'text-neutral-700',
          'dark:border-neutral-700 dark:text-neutral-300',
        ].join(' '),
      },
      
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
      },
      
      pulse: {
        true: 'animate-pulse',
        false: '',
      },
      
      dot: {
        true: 'pl-1.5',
        false: '',
      },
    },
    
    defaultVariants: {
      variant: 'default',
      size: 'md',
      pulse: false,
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    pulse, 
    dot,
    leftIcon,
    rightIcon,
    removable,
    onRemove,
    children, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, pulse, dot }), className)}
        {...props}
      >
        {dot && (
          <span className={cn(
            'rounded-full mr-1.5',
            size === 'sm' && 'w-1.5 h-1.5',
            size === 'md' && 'w-2 h-2',
            size === 'lg' && 'w-2.5 h-2.5',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'error' && 'bg-error-500',
            variant === 'info' && 'bg-info-500',
            variant === 'premium' && 'bg-gradient-to-r from-brand-500 to-accent-500',
            (!variant || variant === 'default' || variant === 'outline') && 'bg-neutral-500'
          )} />
        )}
        
        {leftIcon && <span className="mr-1.5">{leftIcon}</span>}
        
        {children}
        
        {rightIcon && <span className="ml-1.5">{rightIcon}</span>}
        
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className={cn(
              'ml-1.5 -mr-0.5 hover:opacity-70 transition-opacity',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}
          >
            <svg
              className={cn(
                size === 'sm' && 'w-3 h-3',
                size === 'md' && 'w-3.5 h-3.5',
                size === 'lg' && 'w-4 h-4'
              )}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// Badge group for multiple badges
export const BadgeGroup = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  );
};

// Status indicator badge
export const StatusBadge = ({ 
  status, 
  size = 'md' 
}: { 
  status: 'online' | 'offline' | 'away' | 'busy';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const statusConfig = {
    online: { variant: 'success' as const, label: 'Online' },
    offline: { variant: 'default' as const, label: 'Offline' },
    away: { variant: 'warning' as const, label: 'Away' },
    busy: { variant: 'error' as const, label: 'Busy' },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} size={size} dot pulse={status === 'online'}>
      {config.label}
    </Badge>
  );
};

// Skill badge for talent profiles
export const SkillBadge = ({ 
  skill, 
  level,
  size = 'md' 
}: { 
  skill: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const levelConfig = {
    beginner: { variant: 'default' as const, stars: 1 },
    intermediate: { variant: 'info' as const, stars: 2 },
    advanced: { variant: 'success' as const, stars: 3 },
    expert: { variant: 'premium' as const, stars: 4 },
  };
  
  const config = level ? levelConfig[level] : { variant: 'default' as const, stars: 0 };
  
  return (
    <Badge variant={config.variant} size={size}>
      {skill}
      {level && (
        <span className="ml-1.5 opacity-60">
          {'★'.repeat(config.stars)}
        </span>
      )}
    </Badge>
  );
};

export { Badge, badgeVariants };