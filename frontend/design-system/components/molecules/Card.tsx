'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card Component
 * Container component for grouping related content
 */

const cardVariants = cva(
  [
    'rounded-xl transition-all duration-300',
    'backdrop-blur-sm',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-white dark:bg-neutral-900/50',
          'shadow-sm hover:shadow-md',
          'border border-neutral-200/50 dark:border-white/5',
        ].join(' '),
        
        elevated: [
          'bg-white dark:bg-neutral-900/70',
          'shadow-md hover:shadow-xl',
          'hover:-translate-y-1',
        ].join(' '),
        
        outlined: [
          'bg-transparent',
          'border border-neutral-300 dark:border-white/10',
          'hover:border-neutral-400 dark:hover:border-white/20',
        ].join(' '),
        
        gradient: [
          'bg-gradient-to-br from-white to-neutral-50',
          'dark:from-neutral-900 dark:to-neutral-950',
          'shadow-lg hover:shadow-xl',
          'border border-neutral-200/30 dark:border-white/5',
        ].join(' '),
        
        premium: [
          'bg-gradient-to-br from-brand-50 via-white to-accent-50',
          'dark:from-brand-950/50 dark:via-neutral-900 dark:to-accent-950/50',
          'shadow-lg shadow-brand-500/10 hover:shadow-xl hover:shadow-brand-500/20',
          'border border-brand-200/50 dark:border-brand-800/30',
          'relative overflow-hidden',
        ].join(' '),
        
        talent: [
          'bg-white dark:bg-neutral-900/60',
          'shadow-sm hover:shadow-lg',
          'border border-neutral-200/50 dark:border-white/5',
          'hover:border-brand-200 dark:hover:border-brand-800/50',
          'hover:-translate-y-0.5 hover:scale-[1.01]',
        ].join(' '),
        
        glassmorphic: [
          'bg-white/70 dark:bg-neutral-900/30',
          'backdrop-blur-xl backdrop-saturate-150',
          'shadow-lg shadow-neutral-500/10',
          'border border-white/20 dark:border-white/10',
        ].join(' '),
      },
      
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      
      interactive: {
        true: 'cursor-pointer active:scale-[0.99]',
        false: '',
      },
    },
    
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  image?: {
    src: string;
    alt: string;
    position?: 'top' | 'left' | 'right';
  };
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    padding, 
    interactive,
    header,
    footer,
    image,
    children,
    ...props 
  }, ref) => {
    const content = (
      <>
        {header && (
          <CardHeader className={padding === 'none' ? 'px-4 pt-4' : ''}>
            {header}
          </CardHeader>
        )}
        
        {padding === 'none' ? (
          <div className="p-4">{children}</div>
        ) : (
          children
        )}
        
        {footer && (
          <CardFooter className={padding === 'none' ? 'px-4 pb-4' : ''}>
            {footer}
          </CardFooter>
        )}
      </>
    );
    
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, interactive }), className)}
        {...props}
      >
        {/* Premium gradient overlay */}
        {variant === 'premium' && (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-accent-500/5 pointer-events-none" />
        )}
        
        {image ? (
          <div className={cn(
            'flex',
            image.position === 'left' && 'flex-row',
            image.position === 'right' && 'flex-row-reverse',
            image.position === 'top' && 'flex-col'
          )}>
            <div className={cn(
              'flex-shrink-0 overflow-hidden',
              image.position === 'top' && 'w-full h-48 rounded-t-xl',
              image.position === 'left' && 'w-1/3 rounded-l-xl',
              image.position === 'right' && 'w-1/3 rounded-r-xl'
            )}>
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              {content}
            </div>
          </div>
        ) : (
          content
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 pb-4',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title
export const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight',
      'text-neutral-900 dark:text-neutral-50',
      className
    )}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

// Card Description
export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm text-neutral-600 dark:text-neutral-400',
      className
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content
export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer
export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center pt-4 border-t border-neutral-200 dark:border-white/5',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Specialized card variants

// Stat Card
export const StatCard = ({
  title,
  value,
  change,
  icon,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) => {
  const isPositive = change && change.value > 0;
  
  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {value}
          </p>
          {change && (
            <div className={cn(
              'mt-2 flex items-center text-sm',
              isPositive ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'
            )}>
              <span className="font-medium">
                {isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
              <span className="ml-1 text-neutral-600 dark:text-neutral-400">
                {change.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            'p-3 rounded-lg',
            variant === 'success' && 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400',
            variant === 'warning' && 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
            variant === 'error' && 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400',
            variant === 'default' && 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
          )}>
            {icon}
          </div>
        )}
      </div>
      
      {/* Background decoration */}
      <div className={cn(
        'absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-5',
        variant === 'success' && 'bg-success-500',
        variant === 'warning' && 'bg-warning-500',
        variant === 'error' && 'bg-error-500',
        variant === 'default' && 'bg-brand-500'
      )} />
    </Card>
  );
};

export { Card, cardVariants };