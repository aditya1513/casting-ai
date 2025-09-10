/**
 * CastMatch Design System - Component Tokens
 * Component-specific design tokens
 */

import { baseTokens } from './base-tokens';
import { semanticTokens } from './semantic-tokens';

// =============================================================================
// BUTTON TOKENS
// =============================================================================

export const buttonTokens = {
  // Sizes
  size: {
    xs: {
      height: '1.75rem',        // 28px
      paddingX: baseTokens.spacing[2],
      fontSize: baseTokens.typography.fontSize.xs,
      iconSize: '1rem',
    },
    sm: {
      height: '2rem',           // 32px
      paddingX: baseTokens.spacing[3],
      fontSize: baseTokens.typography.fontSize.sm,
      iconSize: '1.125rem',
    },
    md: {
      height: '2.5rem',         // 40px
      paddingX: baseTokens.spacing[4],
      fontSize: baseTokens.typography.fontSize.base,
      iconSize: '1.25rem',
    },
    lg: {
      height: '3rem',           // 48px
      paddingX: baseTokens.spacing[6],
      fontSize: baseTokens.typography.fontSize.lg,
      iconSize: '1.5rem',
    },
    xl: {
      height: '3.5rem',         // 56px
      paddingX: baseTokens.spacing[8],
      fontSize: baseTokens.typography.fontSize.xl,
      iconSize: '1.75rem',
    },
  },
  
  // Variants
  variant: {
    primary: {
      background: 'var(--button-primary-bg)',
      backgroundHover: 'var(--button-primary-bg-hover)',
      backgroundActive: 'var(--button-primary-bg-active)',
      color: 'var(--button-primary-color)',
      border: 'none',
    },
    secondary: {
      background: 'var(--button-secondary-bg)',
      backgroundHover: 'var(--button-secondary-bg-hover)',
      backgroundActive: 'var(--button-secondary-bg-active)',
      color: 'var(--button-secondary-color)',
      border: `${baseTokens.borders.width.thin} solid var(--button-secondary-border)`,
    },
    ghost: {
      background: 'transparent',
      backgroundHover: 'var(--button-ghost-bg-hover)',
      backgroundActive: 'var(--button-ghost-bg-active)',
      color: 'var(--button-ghost-color)',
      border: 'none',
    },
    danger: {
      background: 'var(--button-danger-bg)',
      backgroundHover: 'var(--button-danger-bg-hover)',
      backgroundActive: 'var(--button-danger-bg-active)',
      color: 'var(--button-danger-color)',
      border: 'none',
    },
    premium: {
      background: 'var(--button-premium-bg)',
      backgroundHover: 'var(--button-premium-bg-hover)',
      backgroundActive: 'var(--button-premium-bg-active)',
      color: 'var(--button-premium-color)',
      border: 'none',
      boxShadow: semanticTokens.shadows.spotlight,
    },
  },
  
  // States
  state: {
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
    loading: {
      cursor: 'wait',
    },
    focus: {
      outline: `2px solid var(--color-brand-primary)`,
      outlineOffset: '2px',
    },
  },
  
  // Light theme values
  light: {
    '--button-primary-bg': baseTokens.colors.brand[500],
    '--button-primary-bg-hover': baseTokens.colors.brand[600],
    '--button-primary-bg-active': baseTokens.colors.brand[700],
    '--button-primary-color': baseTokens.colors.neutral[0],
    
    '--button-secondary-bg': baseTokens.colors.neutral[0],
    '--button-secondary-bg-hover': baseTokens.colors.neutral[50],
    '--button-secondary-bg-active': baseTokens.colors.neutral[100],
    '--button-secondary-color': baseTokens.colors.brand[600],
    '--button-secondary-border': baseTokens.colors.brand[500],
    
    '--button-ghost-bg-hover': baseTokens.colors.neutral[50],
    '--button-ghost-bg-active': baseTokens.colors.neutral[100],
    '--button-ghost-color': baseTokens.colors.brand[600],
    
    '--button-danger-bg': baseTokens.colors.error[500],
    '--button-danger-bg-hover': baseTokens.colors.error[600],
    '--button-danger-bg-active': baseTokens.colors.error[700],
    '--button-danger-color': baseTokens.colors.neutral[0],
    
    '--button-premium-bg': `linear-gradient(135deg, ${baseTokens.colors.brand[500]}, ${baseTokens.colors.accent[500]})`,
    '--button-premium-bg-hover': `linear-gradient(135deg, ${baseTokens.colors.brand[600]}, ${baseTokens.colors.accent[600]})`,
    '--button-premium-bg-active': `linear-gradient(135deg, ${baseTokens.colors.brand[700]}, ${baseTokens.colors.accent[700]})`,
    '--button-premium-color': baseTokens.colors.neutral[0],
  },
  
  // Dark theme values
  dark: {
    '--button-primary-bg': baseTokens.colors.brand[400],
    '--button-primary-bg-hover': baseTokens.colors.brand[500],
    '--button-primary-bg-active': baseTokens.colors.brand[600],
    '--button-primary-color': baseTokens.colors.neutral[950],
    
    '--button-secondary-bg': 'transparent',
    '--button-secondary-bg-hover': 'oklch(1 0 0 / 0.05)',
    '--button-secondary-bg-active': 'oklch(1 0 0 / 0.1)',
    '--button-secondary-color': baseTokens.colors.brand[400],
    '--button-secondary-border': baseTokens.colors.brand[400],
    
    '--button-ghost-bg-hover': 'oklch(1 0 0 / 0.05)',
    '--button-ghost-bg-active': 'oklch(1 0 0 / 0.1)',
    '--button-ghost-color': baseTokens.colors.brand[400],
    
    '--button-danger-bg': baseTokens.colors.error[500],
    '--button-danger-bg-hover': baseTokens.colors.error[600],
    '--button-danger-bg-active': baseTokens.colors.error[700],
    '--button-danger-color': baseTokens.colors.neutral[50],
    
    '--button-premium-bg': `linear-gradient(135deg, ${baseTokens.colors.brand[400]}, ${baseTokens.colors.accent[400]})`,
    '--button-premium-bg-hover': `linear-gradient(135deg, ${baseTokens.colors.brand[500]}, ${baseTokens.colors.accent[500]})`,
    '--button-premium-bg-active': `linear-gradient(135deg, ${baseTokens.colors.brand[600]}, ${baseTokens.colors.accent[600]})`,
    '--button-premium-color': baseTokens.colors.neutral[50],
  },
} as const;

// =============================================================================
// INPUT TOKENS
// =============================================================================

export const inputTokens = {
  // Sizes
  size: {
    sm: {
      height: '2rem',           // 32px
      paddingX: baseTokens.spacing[2],
      fontSize: baseTokens.typography.fontSize.sm,
    },
    md: {
      height: '2.5rem',         // 40px
      paddingX: baseTokens.spacing[3],
      fontSize: baseTokens.typography.fontSize.base,
    },
    lg: {
      height: '3rem',           // 48px
      paddingX: baseTokens.spacing[4],
      fontSize: baseTokens.typography.fontSize.lg,
    },
  },
  
  // States
  state: {
    default: {
      background: 'var(--input-bg)',
      border: `${baseTokens.borders.width.thin} solid var(--input-border)`,
      color: 'var(--input-color)',
    },
    hover: {
      borderColor: 'var(--input-border-hover)',
    },
    focus: {
      borderColor: 'var(--input-border-focus)',
      outline: `2px solid var(--input-outline-focus)`,
      outlineOffset: '1px',
    },
    error: {
      borderColor: 'var(--input-border-error)',
      background: 'var(--input-bg-error)',
    },
    disabled: {
      background: 'var(--input-bg-disabled)',
      opacity: '0.6',
      cursor: 'not-allowed',
    },
  },
  
  // Light theme values
  light: {
    '--input-bg': baseTokens.colors.neutral[0],
    '--input-bg-error': baseTokens.colors.error[50],
    '--input-bg-disabled': baseTokens.colors.neutral[50],
    '--input-color': baseTokens.colors.neutral[900],
    '--input-border': baseTokens.colors.neutral[300],
    '--input-border-hover': baseTokens.colors.neutral[400],
    '--input-border-focus': baseTokens.colors.brand[500],
    '--input-border-error': baseTokens.colors.error[500],
    '--input-outline-focus': `${baseTokens.colors.brand[500]}33`,
    '--input-placeholder': baseTokens.colors.neutral[500],
  },
  
  // Dark theme values
  dark: {
    '--input-bg': 'oklch(0.18 0 0)',
    '--input-bg-error': 'oklch(0.58 0.25 25 / 0.1)',
    '--input-bg-disabled': 'oklch(1 0 0 / 0.02)',
    '--input-color': baseTokens.colors.neutral[50],
    '--input-border': 'oklch(1 0 0 / 0.15)',
    '--input-border-hover': 'oklch(1 0 0 / 0.25)',
    '--input-border-focus': baseTokens.colors.brand[400],
    '--input-border-error': baseTokens.colors.error[500],
    '--input-outline-focus': `${baseTokens.colors.brand[400]}33`,
    '--input-placeholder': baseTokens.colors.neutral[400],
  },
} as const;

// =============================================================================
// CARD TOKENS
// =============================================================================

export const cardTokens = {
  // Variants
  variant: {
    default: {
      background: 'var(--card-bg)',
      border: 'var(--card-border)',
      shadow: 'var(--card-shadow)',
    },
    elevated: {
      background: 'var(--card-elevated-bg)',
      border: 'none',
      shadow: 'var(--card-elevated-shadow)',
    },
    outlined: {
      background: 'transparent',
      border: `${baseTokens.borders.width.thin} solid var(--card-outlined-border)`,
      shadow: 'none',
    },
    premium: {
      background: 'var(--card-premium-bg)',
      border: `${baseTokens.borders.width.thin} solid var(--card-premium-border)`,
      shadow: 'var(--card-premium-shadow)',
    },
    talent: {
      background: 'var(--card-talent-bg)',
      border: 'var(--card-talent-border)',
      shadow: 'var(--card-talent-shadow)',
      hover: {
        transform: 'translateY(-4px)',
        shadow: 'var(--card-talent-shadow-hover)',
      },
    },
  },
  
  // Padding
  padding: {
    sm: baseTokens.spacing[3],
    md: baseTokens.spacing[4],
    lg: baseTokens.spacing[6],
    xl: baseTokens.spacing[8],
  },
  
  // Light theme values
  light: {
    '--card-bg': baseTokens.colors.neutral[0],
    '--card-border': 'none',
    '--card-shadow': baseTokens.shadows.sm,
    
    '--card-elevated-bg': baseTokens.colors.neutral[0],
    '--card-elevated-shadow': baseTokens.shadows.md,
    
    '--card-outlined-border': baseTokens.colors.neutral[200],
    
    '--card-premium-bg': `linear-gradient(135deg, ${baseTokens.colors.neutral[0]}, ${baseTokens.colors.brand[50]})`,
    '--card-premium-border': baseTokens.colors.brand[200],
    '--card-premium-shadow': semanticTokens.shadows.spotlight,
    
    '--card-talent-bg': baseTokens.colors.neutral[0],
    '--card-talent-border': 'none',
    '--card-talent-shadow': baseTokens.shadows.base,
    '--card-talent-shadow-hover': baseTokens.shadows.lg,
  },
  
  // Dark theme values
  dark: {
    '--card-bg': 'oklch(0.18 0 0)',
    '--card-border': 'none',
    '--card-shadow': 'none',
    
    '--card-elevated-bg': 'oklch(0.22 0 0)',
    '--card-elevated-shadow': '0 10px 30px 0 oklch(0 0 0 / 0.5)',
    
    '--card-outlined-border': 'oklch(1 0 0 / 0.1)',
    
    '--card-premium-bg': `linear-gradient(135deg, oklch(0.18 0 0), ${baseTokens.colors.brand[950]})`,
    '--card-premium-border': baseTokens.colors.brand[700],
    '--card-premium-shadow': semanticTokens.shadows.spotlight,
    
    '--card-talent-bg': 'oklch(0.18 0 0)',
    '--card-talent-border': `${baseTokens.borders.width.thin} solid oklch(1 0 0 / 0.05)`,
    '--card-talent-shadow': 'none',
    '--card-talent-shadow-hover': '0 10px 30px 0 oklch(0 0 0 / 0.3)',
  },
} as const;

// =============================================================================
// BADGE TOKENS
// =============================================================================

export const badgeTokens = {
  // Sizes
  size: {
    sm: {
      height: '1.25rem',        // 20px
      paddingX: baseTokens.spacing[1.5],
      fontSize: baseTokens.typography.fontSize['2xs'],
    },
    md: {
      height: '1.5rem',         // 24px
      paddingX: baseTokens.spacing[2],
      fontSize: baseTokens.typography.fontSize.xs,
    },
    lg: {
      height: '1.75rem',        // 28px
      paddingX: baseTokens.spacing[2.5],
      fontSize: baseTokens.typography.fontSize.sm,
    },
  },
  
  // Variants
  variant: {
    default: {
      background: 'var(--badge-default-bg)',
      color: 'var(--badge-default-color)',
      border: 'none',
    },
    success: {
      background: 'var(--badge-success-bg)',
      color: 'var(--badge-success-color)',
      border: 'none',
    },
    warning: {
      background: 'var(--badge-warning-bg)',
      color: 'var(--badge-warning-color)',
      border: 'none',
    },
    error: {
      background: 'var(--badge-error-bg)',
      color: 'var(--badge-error-color)',
      border: 'none',
    },
    info: {
      background: 'var(--badge-info-bg)',
      color: 'var(--badge-info-color)',
      border: 'none',
    },
    premium: {
      background: 'var(--badge-premium-bg)',
      color: 'var(--badge-premium-color)',
      border: `${baseTokens.borders.width.thin} solid var(--badge-premium-border)`,
    },
  },
  
  // Light theme values
  light: {
    '--badge-default-bg': baseTokens.colors.neutral[100],
    '--badge-default-color': baseTokens.colors.neutral[700],
    
    '--badge-success-bg': baseTokens.colors.success[50],
    '--badge-success-color': baseTokens.colors.success[700],
    
    '--badge-warning-bg': baseTokens.colors.warning[50],
    '--badge-warning-color': baseTokens.colors.warning[700],
    
    '--badge-error-bg': baseTokens.colors.error[50],
    '--badge-error-color': baseTokens.colors.error[700],
    
    '--badge-info-bg': baseTokens.colors.info[50],
    '--badge-info-color': baseTokens.colors.info[700],
    
    '--badge-premium-bg': `linear-gradient(135deg, ${baseTokens.colors.brand[50]}, ${baseTokens.colors.accent[50]})`,
    '--badge-premium-color': baseTokens.colors.brand[700],
    '--badge-premium-border': baseTokens.colors.brand[200],
  },
  
  // Dark theme values
  dark: {
    '--badge-default-bg': 'oklch(0.25 0 0)',
    '--badge-default-color': baseTokens.colors.neutral[300],
    
    '--badge-success-bg': 'oklch(0.60 0.18 145 / 0.2)',
    '--badge-success-color': baseTokens.colors.success[500],
    
    '--badge-warning-bg': 'oklch(0.72 0.20 85 / 0.2)',
    '--badge-warning-color': baseTokens.colors.warning[500],
    
    '--badge-error-bg': 'oklch(0.58 0.25 25 / 0.2)',
    '--badge-error-color': baseTokens.colors.error[500],
    
    '--badge-info-bg': 'oklch(0.55 0.18 240 / 0.2)',
    '--badge-info-color': baseTokens.colors.info[500],
    
    '--badge-premium-bg': `linear-gradient(135deg, ${baseTokens.colors.brand[950]}, ${baseTokens.colors.accent[950]})`,
    '--badge-premium-color': baseTokens.colors.brand[400],
    '--badge-premium-border': baseTokens.colors.brand[700],
  },
} as const;

// =============================================================================
// MODAL TOKENS
// =============================================================================

export const modalTokens = {
  // Sizes
  size: {
    sm: '24rem',     // 384px
    md: '32rem',     // 512px
    lg: '48rem',     // 768px
    xl: '64rem',     // 1024px
    full: '100%',
  },
  
  // Backdrop
  backdrop: {
    background: 'var(--modal-backdrop-bg)',
    backdropFilter: 'blur(4px)',
  },
  
  // Content
  content: {
    background: 'var(--modal-content-bg)',
    borderRadius: baseTokens.borderRadius.xl,
    shadow: 'var(--modal-content-shadow)',
    padding: baseTokens.spacing[6],
  },
  
  // Light theme values
  light: {
    '--modal-backdrop-bg': 'oklch(0 0 0 / 0.5)',
    '--modal-content-bg': baseTokens.colors.neutral[0],
    '--modal-content-shadow': baseTokens.shadows['2xl'],
  },
  
  // Dark theme values
  dark: {
    '--modal-backdrop-bg': 'oklch(0 0 0 / 0.7)',
    '--modal-content-bg': 'oklch(0.18 0 0)',
    '--modal-content-shadow': '0 25px 50px -12px oklch(0 0 0 / 0.5)',
  },
} as const;

// Export all component tokens
export const componentTokens = {
  button: buttonTokens,
  input: inputTokens,
  card: cardTokens,
  badge: badgeTokens,
  modal: modalTokens,
} as const;

export type ComponentTokens = typeof componentTokens;