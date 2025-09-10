/**
 * CastMatch Design System - Base Tokens
 * Foundation layer of the design system
 * All values are derived from a 4px base unit system
 */

// =============================================================================
// COLOR PALETTE - Using OKLCH for better perceptual uniformity
// =============================================================================

export const colors = {
  // Brand Colors - Mumbai Film Industry Inspired
  brand: {
    50: 'oklch(0.97 0.02 30)',    // Light cream
    100: 'oklch(0.93 0.04 30)',
    200: 'oklch(0.85 0.08 30)',
    300: 'oklch(0.75 0.12 30)',
    400: 'oklch(0.65 0.16 30)',
    500: 'oklch(0.55 0.20 30)',    // Primary brand - warm amber
    600: 'oklch(0.48 0.18 28)',
    700: 'oklch(0.41 0.16 26)',
    800: 'oklch(0.34 0.14 24)',
    900: 'oklch(0.27 0.12 22)',
    950: 'oklch(0.20 0.10 20)',
  },
  
  // Accent Colors - Bollywood Vibrancy
  accent: {
    50: 'oklch(0.97 0.02 350)',
    100: 'oklch(0.93 0.05 350)',
    200: 'oklch(0.85 0.10 350)',
    300: 'oklch(0.75 0.15 350)',
    400: 'oklch(0.65 0.20 350)',
    500: 'oklch(0.55 0.25 350)',   // Vibrant magenta
    600: 'oklch(0.48 0.22 348)',
    700: 'oklch(0.41 0.19 346)',
    800: 'oklch(0.34 0.16 344)',
    900: 'oklch(0.27 0.13 342)',
    950: 'oklch(0.20 0.10 340)',
  },
  
  // Neutral Scale - Cinema Black to Screen White
  neutral: {
    0: 'oklch(1 0 0)',              // Pure white
    50: 'oklch(0.98 0 0)',
    100: 'oklch(0.96 0 0)',
    200: 'oklch(0.92 0 0)',
    300: 'oklch(0.84 0 0)',
    400: 'oklch(0.71 0 0)',
    500: 'oklch(0.56 0 0)',
    600: 'oklch(0.42 0 0)',
    700: 'oklch(0.31 0 0)',
    800: 'oklch(0.21 0 0)',
    900: 'oklch(0.15 0 0)',
    950: 'oklch(0.10 0 0)',
    1000: 'oklch(0.05 0 0)',        // Cinema black
  },
  
  // Semantic Colors
  success: {
    50: 'oklch(0.97 0.02 145)',
    500: 'oklch(0.60 0.18 145)',    // Green
    600: 'oklch(0.52 0.16 143)',
    700: 'oklch(0.44 0.14 141)',
  },
  
  warning: {
    50: 'oklch(0.97 0.02 85)',
    500: 'oklch(0.72 0.20 85)',     // Amber
    600: 'oklch(0.64 0.18 83)',
    700: 'oklch(0.56 0.16 81)',
  },
  
  error: {
    50: 'oklch(0.97 0.02 25)',
    500: 'oklch(0.58 0.25 25)',     // Red
    600: 'oklch(0.50 0.23 23)',
    700: 'oklch(0.42 0.21 21)',
  },
  
  info: {
    50: 'oklch(0.97 0.02 240)',
    500: 'oklch(0.55 0.18 240)',    // Blue
    600: 'oklch(0.47 0.16 238)',
    700: 'oklch(0.39 0.14 236)',
  },
} as const;

// =============================================================================
// TYPOGRAPHY SCALE - Modular Scale (1.25 ratio)
// =============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: '"Playfair Display", "Georgia", serif',
    mono: '"JetBrains Mono", "SF Mono", monospace',
    display: '"Bebas Neue", "Impact", sans-serif', // For cinematic headers
  },
  
  // Font Sizes - Fluid Typography
  fontSize: {
    '2xs': 'clamp(0.625rem, 0.5rem + 0.5vw, 0.75rem)',    // 10-12px
    xs: 'clamp(0.75rem, 0.625rem + 0.5vw, 0.875rem)',     // 12-14px
    sm: 'clamp(0.875rem, 0.75rem + 0.5vw, 1rem)',         // 14-16px
    base: 'clamp(1rem, 0.875rem + 0.5vw, 1.125rem)',      // 16-18px
    lg: 'clamp(1.125rem, 1rem + 0.5vw, 1.25rem)',         // 18-20px
    xl: 'clamp(1.25rem, 1.125rem + 0.5vw, 1.5rem)',       // 20-24px
    '2xl': 'clamp(1.5rem, 1.25rem + 1vw, 1.875rem)',      // 24-30px
    '3xl': 'clamp(1.875rem, 1.5rem + 1.5vw, 2.25rem)',    // 30-36px
    '4xl': 'clamp(2.25rem, 1.875rem + 1.5vw, 3rem)',      // 36-48px
    '5xl': 'clamp(3rem, 2.25rem + 3vw, 3.75rem)',         // 48-60px
    '6xl': 'clamp(3.75rem, 3rem + 3vw, 4.5rem)',          // 60-72px
  },
  
  // Font Weights
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  
  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '1.75',
    paragraph: '1.8',
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
    cinematic: '0.2em', // For dramatic headers
  },
} as const;

// =============================================================================
// SPACING SCALE - 4px base unit
// =============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px - base unit
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// =============================================================================
// BORDER RADIUS - Smooth curves
// =============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.5rem',   // 8px
  md: '0.625rem',   // 10px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  pill: '9999px',
  circle: '50%',
} as const;

// =============================================================================
// SHADOWS - Elevation system
// =============================================================================

export const shadows = {
  none: 'none',
  
  // Subtle shadows for light mode
  xs: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
  sm: '0 2px 4px 0 oklch(0 0 0 / 0.06), 0 1px 2px 0 oklch(0 0 0 / 0.04)',
  base: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.05)',
  md: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.05)',
  lg: '0 20px 25px -5px oklch(0 0 0 / 0.1), 0 10px 10px -5px oklch(0 0 0 / 0.04)',
  xl: '0 25px 50px -12px oklch(0 0 0 / 0.15)',
  '2xl': '0 35px 60px -15px oklch(0 0 0 / 0.2)',
  
  // Cinematic shadows (dramatic)
  cinematic: {
    soft: '0 20px 40px -10px oklch(0.55 0.20 30 / 0.25)',
    hard: '10px 10px 0 0 oklch(0 0 0 / 1)',
    glow: '0 0 40px 10px oklch(0.55 0.25 350 / 0.3)',
  },
  
  // Inner shadows
  inner: {
    sm: 'inset 0 1px 2px 0 oklch(0 0 0 / 0.05)',
    base: 'inset 0 2px 4px 0 oklch(0 0 0 / 0.06)',
    lg: 'inset 0 4px 6px 0 oklch(0 0 0 / 0.1)',
  },
} as const;

// =============================================================================
// ANIMATION - Motion tokens
// =============================================================================

export const animation = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    base: '250ms',
    moderate: '350ms',
    slow: '500ms',
    slower: '750ms',
    slowest: '1000ms',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Spring animations
    spring: {
      bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      snappy: 'cubic-bezier(0.86, 0, 0.07, 1)',
    },
    
    // Cinematic easings
    cinematic: {
      dramatic: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
      smooth: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    },
  },
  
  // Delays
  delay: {
    none: '0ms',
    short: '100ms',
    base: '200ms',
    long: '300ms',
    longer: '500ms',
  },
  
  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    slideIn: {
      from: { transform: 'translateY(10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    shimmer: {
      from: { backgroundPosition: '200% 0' },
      to: { backgroundPosition: '-200% 0' },
    },
  },
} as const;

// =============================================================================
// BREAKPOINTS - Responsive design
// =============================================================================

export const breakpoints = {
  xs: '375px',   // Mobile S
  sm: '640px',   // Mobile L
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Desktop L
  '2xl': '1536px', // Desktop XL
  '3xl': '1920px', // Full HD
  '4xl': '2560px', // 2K/4K
} as const;

// =============================================================================
// Z-INDEX SCALE - Layering system
// =============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  elevated: 10,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  notification: 1600,
  maximum: 9999,
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const borders = {
  width: {
    none: '0',
    thin: '1px',
    base: '2px',
    thick: '3px',
    bold: '4px',
  },
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
    double: 'double',
  },
} as const;

// Export all tokens as a single object for easy access
export const baseTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  zIndex,
  borders,
} as const;

export type BaseTokens = typeof baseTokens;