/**
 * CastMatch Design System - Semantic Tokens
 * Purpose-driven abstractions built on base tokens
 */

import { baseTokens } from './base-tokens';

// =============================================================================
// SEMANTIC COLORS - Purpose-based color assignments
// =============================================================================

export const semanticColors = {
  // Background colors
  background: {
    primary: 'var(--color-bg-primary)',
    secondary: 'var(--color-bg-secondary)',
    tertiary: 'var(--color-bg-tertiary)',
    elevated: 'var(--color-bg-elevated)',
    overlay: 'var(--color-bg-overlay)',
    inverse: 'var(--color-bg-inverse)',
    
    // Interactive backgrounds
    interactive: {
      default: 'var(--color-bg-interactive)',
      hover: 'var(--color-bg-interactive-hover)',
      active: 'var(--color-bg-interactive-active)',
      disabled: 'var(--color-bg-interactive-disabled)',
    },
    
    // Status backgrounds
    success: 'var(--color-bg-success)',
    warning: 'var(--color-bg-warning)',
    error: 'var(--color-bg-error)',
    info: 'var(--color-bg-info)',
  },
  
  // Surface colors (cards, modals, etc.)
  surface: {
    primary: 'var(--color-surface-primary)',
    secondary: 'var(--color-surface-secondary)',
    tertiary: 'var(--color-surface-tertiary)',
    elevated: 'var(--color-surface-elevated)',
    sunken: 'var(--color-surface-sunken)',
    overlay: 'var(--color-surface-overlay)',
    
    // Special surfaces
    spotlight: 'var(--color-surface-spotlight)', // For featured content
    premium: 'var(--color-surface-premium)',     // For premium features
  },
  
  // Text colors
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary: 'var(--color-text-tertiary)',
    disabled: 'var(--color-text-disabled)',
    inverse: 'var(--color-text-inverse)',
    
    // Semantic text
    success: 'var(--color-text-success)',
    warning: 'var(--color-text-warning)',
    error: 'var(--color-text-error)',
    info: 'var(--color-text-info)',
    
    // Link colors
    link: {
      default: 'var(--color-text-link)',
      hover: 'var(--color-text-link-hover)',
      active: 'var(--color-text-link-active)',
      visited: 'var(--color-text-link-visited)',
    },
  },
  
  // Border colors
  border: {
    default: 'var(--color-border-default)',
    light: 'var(--color-border-light)',
    strong: 'var(--color-border-strong)',
    
    // Interactive borders
    interactive: {
      default: 'var(--color-border-interactive)',
      hover: 'var(--color-border-interactive-hover)',
      focus: 'var(--color-border-interactive-focus)',
      error: 'var(--color-border-interactive-error)',
    },
    
    // Status borders
    success: 'var(--color-border-success)',
    warning: 'var(--color-border-warning)',
    error: 'var(--color-border-error)',
    info: 'var(--color-border-info)',
  },
  
  // Brand specific
  brand: {
    primary: 'var(--color-brand-primary)',
    secondary: 'var(--color-brand-secondary)',
    accent: 'var(--color-brand-accent)',
  },
} as const;

// =============================================================================
// LIGHT THEME VALUES
// =============================================================================

export const lightTheme = {
  // Backgrounds
  '--color-bg-primary': baseTokens.colors.neutral[0],
  '--color-bg-secondary': baseTokens.colors.neutral[50],
  '--color-bg-tertiary': baseTokens.colors.neutral[100],
  '--color-bg-elevated': baseTokens.colors.neutral[0],
  '--color-bg-overlay': 'oklch(0 0 0 / 0.5)',
  '--color-bg-inverse': baseTokens.colors.neutral[900],
  
  '--color-bg-interactive': 'transparent',
  '--color-bg-interactive-hover': baseTokens.colors.neutral[50],
  '--color-bg-interactive-active': baseTokens.colors.neutral[100],
  '--color-bg-interactive-disabled': baseTokens.colors.neutral[50],
  
  '--color-bg-success': baseTokens.colors.success[50],
  '--color-bg-warning': baseTokens.colors.warning[50],
  '--color-bg-error': baseTokens.colors.error[50],
  '--color-bg-info': baseTokens.colors.info[50],
  
  // Surfaces
  '--color-surface-primary': baseTokens.colors.neutral[0],
  '--color-surface-secondary': baseTokens.colors.neutral[50],
  '--color-surface-tertiary': baseTokens.colors.neutral[100],
  '--color-surface-elevated': baseTokens.colors.neutral[0],
  '--color-surface-sunken': baseTokens.colors.neutral[100],
  '--color-surface-overlay': 'oklch(0 0 0 / 0.8)',
  '--color-surface-spotlight': 'linear-gradient(135deg, oklch(0.55 0.20 30 / 0.05), oklch(0.55 0.25 350 / 0.05))',
  '--color-surface-premium': 'linear-gradient(135deg, oklch(0.72 0.20 85 / 0.1), oklch(0.55 0.20 30 / 0.1))',
  
  // Text
  '--color-text-primary': baseTokens.colors.neutral[900],
  '--color-text-secondary': baseTokens.colors.neutral[700],
  '--color-text-tertiary': baseTokens.colors.neutral[500],
  '--color-text-disabled': baseTokens.colors.neutral[400],
  '--color-text-inverse': baseTokens.colors.neutral[0],
  
  '--color-text-success': baseTokens.colors.success[700],
  '--color-text-warning': baseTokens.colors.warning[700],
  '--color-text-error': baseTokens.colors.error[700],
  '--color-text-info': baseTokens.colors.info[700],
  
  '--color-text-link': baseTokens.colors.brand[600],
  '--color-text-link-hover': baseTokens.colors.brand[700],
  '--color-text-link-active': baseTokens.colors.brand[800],
  '--color-text-link-visited': baseTokens.colors.accent[700],
  
  // Borders
  '--color-border-default': baseTokens.colors.neutral[200],
  '--color-border-light': baseTokens.colors.neutral[100],
  '--color-border-strong': baseTokens.colors.neutral[300],
  
  '--color-border-interactive': baseTokens.colors.neutral[300],
  '--color-border-interactive-hover': baseTokens.colors.brand[400],
  '--color-border-interactive-focus': baseTokens.colors.brand[500],
  '--color-border-interactive-error': baseTokens.colors.error[500],
  
  '--color-border-success': baseTokens.colors.success[500],
  '--color-border-warning': baseTokens.colors.warning[500],
  '--color-border-error': baseTokens.colors.error[500],
  '--color-border-info': baseTokens.colors.info[500],
  
  // Brand
  '--color-brand-primary': baseTokens.colors.brand[500],
  '--color-brand-secondary': baseTokens.colors.brand[600],
  '--color-brand-accent': baseTokens.colors.accent[500],
} as const;

// =============================================================================
// DARK THEME VALUES
// =============================================================================

export const darkTheme = {
  // Backgrounds - Using elevation strategy
  '--color-bg-primary': baseTokens.colors.neutral[950],      // Level 0
  '--color-bg-secondary': baseTokens.colors.neutral[900],     // Level 1
  '--color-bg-tertiary': baseTokens.colors.neutral[800],      // Level 2
  '--color-bg-elevated': 'oklch(0.18 0 0)',                   // Level 3
  '--color-bg-overlay': 'oklch(0 0 0 / 0.7)',
  '--color-bg-inverse': baseTokens.colors.neutral[50],
  
  '--color-bg-interactive': 'transparent',
  '--color-bg-interactive-hover': 'oklch(1 0 0 / 0.05)',
  '--color-bg-interactive-active': 'oklch(1 0 0 / 0.1)',
  '--color-bg-interactive-disabled': 'oklch(1 0 0 / 0.02)',
  
  '--color-bg-success': 'oklch(0.60 0.18 145 / 0.1)',
  '--color-bg-warning': 'oklch(0.72 0.20 85 / 0.1)',
  '--color-bg-error': 'oklch(0.58 0.25 25 / 0.1)',
  '--color-bg-info': 'oklch(0.55 0.18 240 / 0.1)',
  
  // Surfaces - Progressive lightening
  '--color-surface-primary': baseTokens.colors.neutral[950],
  '--color-surface-secondary': 'oklch(0.18 0 0)',
  '--color-surface-tertiary': 'oklch(0.22 0 0)',
  '--color-surface-elevated': 'oklch(0.25 0 0)',
  '--color-surface-sunken': baseTokens.colors.neutral[1000],
  '--color-surface-overlay': 'oklch(0.1 0 0 / 0.9)',
  '--color-surface-spotlight': 'linear-gradient(135deg, oklch(0.55 0.20 30 / 0.15), oklch(0.55 0.25 350 / 0.15))',
  '--color-surface-premium': 'linear-gradient(135deg, oklch(0.72 0.20 85 / 0.2), oklch(0.55 0.20 30 / 0.2))',
  
  // Text - High contrast for accessibility
  '--color-text-primary': baseTokens.colors.neutral[50],
  '--color-text-secondary': baseTokens.colors.neutral[300],
  '--color-text-tertiary': baseTokens.colors.neutral[400],
  '--color-text-disabled': baseTokens.colors.neutral[600],
  '--color-text-inverse': baseTokens.colors.neutral[950],
  
  '--color-text-success': baseTokens.colors.success[500],
  '--color-text-warning': baseTokens.colors.warning[500],
  '--color-text-error': baseTokens.colors.error[500],
  '--color-text-info': baseTokens.colors.info[500],
  
  '--color-text-link': baseTokens.colors.brand[400],
  '--color-text-link-hover': baseTokens.colors.brand[300],
  '--color-text-link-active': baseTokens.colors.brand[200],
  '--color-text-link-visited': baseTokens.colors.accent[400],
  
  // Borders - Subtle in dark mode
  '--color-border-default': 'oklch(1 0 0 / 0.1)',
  '--color-border-light': 'oklch(1 0 0 / 0.05)',
  '--color-border-strong': 'oklch(1 0 0 / 0.2)',
  
  '--color-border-interactive': 'oklch(1 0 0 / 0.15)',
  '--color-border-interactive-hover': baseTokens.colors.brand[500],
  '--color-border-interactive-focus': baseTokens.colors.brand[400],
  '--color-border-interactive-error': baseTokens.colors.error[500],
  
  '--color-border-success': baseTokens.colors.success[500],
  '--color-border-warning': baseTokens.colors.warning[500],
  '--color-border-error': baseTokens.colors.error[500],
  '--color-border-info': baseTokens.colors.info[500],
  
  // Brand - Adjusted for dark backgrounds
  '--color-brand-primary': baseTokens.colors.brand[400],
  '--color-brand-secondary': baseTokens.colors.brand[500],
  '--color-brand-accent': baseTokens.colors.accent[400],
} as const;

// =============================================================================
// MUMBAI FESTIVAL THEMES - Cultural color schemes
// =============================================================================

export const festivalThemes = {
  diwali: {
    '--color-brand-primary': 'oklch(0.72 0.25 45)',   // Golden
    '--color-brand-accent': 'oklch(0.55 0.30 350)',   // Deep pink
    '--color-surface-spotlight': 'linear-gradient(135deg, oklch(0.72 0.25 45 / 0.2), oklch(0.55 0.30 350 / 0.2))',
  },
  holi: {
    '--color-brand-primary': 'oklch(0.65 0.25 350)',  // Magenta
    '--color-brand-accent': 'oklch(0.60 0.25 145)',   // Green
    '--color-surface-spotlight': 'linear-gradient(135deg, oklch(0.65 0.25 350 / 0.2), oklch(0.60 0.25 145 / 0.2), oklch(0.55 0.25 240 / 0.2))',
  },
  ganeshChaturthi: {
    '--color-brand-primary': 'oklch(0.55 0.25 30)',   // Saffron
    '--color-brand-accent': 'oklch(0.60 0.20 145)',   // Green
    '--color-surface-spotlight': 'linear-gradient(135deg, oklch(0.55 0.25 30 / 0.2), oklch(0.60 0.20 145 / 0.2))',
  },
} as const;

// =============================================================================
// SEMANTIC SPACING - Context-aware spacing
// =============================================================================

export const semanticSpacing = {
  // Component spacing
  component: {
    xs: baseTokens.spacing[1],    // 4px
    sm: baseTokens.spacing[2],    // 8px
    md: baseTokens.spacing[3],    // 12px
    lg: baseTokens.spacing[4],    // 16px
    xl: baseTokens.spacing[6],    // 24px
  },
  
  // Section spacing
  section: {
    xs: baseTokens.spacing[4],    // 16px
    sm: baseTokens.spacing[6],    // 24px
    md: baseTokens.spacing[8],    // 32px
    lg: baseTokens.spacing[12],   // 48px
    xl: baseTokens.spacing[16],   // 64px
  },
  
  // Page spacing
  page: {
    sm: baseTokens.spacing[6],    // 24px
    md: baseTokens.spacing[8],    // 32px
    lg: baseTokens.spacing[12],   // 48px
    xl: baseTokens.spacing[20],   // 80px
  },
} as const;

// =============================================================================
// SEMANTIC SHADOWS - Purpose-based shadows
// =============================================================================

export const semanticShadows = {
  // Card elevations
  card: {
    rest: baseTokens.shadows.sm,
    hover: baseTokens.shadows.md,
    active: baseTokens.shadows.base,
  },
  
  // Modal/Dialog
  modal: baseTokens.shadows['2xl'],
  
  // Dropdown/Popover
  dropdown: baseTokens.shadows.lg,
  
  // Button shadows
  button: {
    rest: 'none',
    hover: baseTokens.shadows.sm,
    active: baseTokens.shadows.xs,
  },
  
  // Focus ring
  focus: '0 0 0 3px oklch(0.55 0.20 30 / 0.2)',
  
  // Cinematic effects
  spotlight: baseTokens.shadows.cinematic.glow,
  dramatic: baseTokens.shadows.cinematic.hard,
} as const;

// Export all semantic tokens
export const semanticTokens = {
  colors: semanticColors,
  spacing: semanticSpacing,
  shadows: semanticShadows,
  themes: {
    light: lightTheme,
    dark: darkTheme,
    festival: festivalThemes,
  },
} as const;

export type SemanticTokens = typeof semanticTokens;