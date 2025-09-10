/**
 * CastMatch Design System - Responsive Utilities
 * Breakpoint system and responsive helpers
 */

// =============================================================================
// BREAKPOINT CONFIGURATION
// =============================================================================

export const breakpoints = {
  xs: 375,    // Mobile S
  sm: 640,    // Mobile L
  md: 768,    // Tablet
  lg: 1024,   // Desktop
  xl: 1280,   // Desktop L
  '2xl': 1536, // Desktop XL
  '3xl': 1920, // Full HD
  '4xl': 2560, // 2K/4K
} as const;

export type Breakpoint = keyof typeof breakpoints;

// =============================================================================
// MEDIA QUERY UTILITIES
// =============================================================================

/**
 * Generate media query strings for CSS-in-JS
 */
export const media = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
  '3xl': `@media (min-width: ${breakpoints['3xl']}px)`,
  '4xl': `@media (min-width: ${breakpoints['4xl']}px)`,
  
  // Max width queries
  xsMax: `@media (max-width: ${breakpoints.sm - 1}px)`,
  smMax: `@media (max-width: ${breakpoints.md - 1}px)`,
  mdMax: `@media (max-width: ${breakpoints.lg - 1}px)`,
  lgMax: `@media (max-width: ${breakpoints.xl - 1}px)`,
  xlMax: `@media (max-width: ${breakpoints['2xl'] - 1}px)`,
  
  // Range queries
  xsToSm: `@media (min-width: ${breakpoints.xs}px) and (max-width: ${breakpoints.sm - 1}px)`,
  smToMd: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  mdToLg: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lgToXl: `@media (min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  
  // Device-specific
  mobile: `@media (max-width: ${breakpoints.md - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.lg}px)`,
  
  // Orientation
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
  
  // High resolution displays
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  
  // Accessibility
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  highContrast: '@media (prefers-contrast: high)',
  darkMode: '@media (prefers-color-scheme: dark)',
} as const;

// =============================================================================
// RESPONSIVE HOOKS (React)
// =============================================================================

import { useState, useEffect } from 'react';

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');
  
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['4xl']) {
        setBreakpoint('4xl');
      } else if (width >= breakpoints['3xl']) {
        setBreakpoint('3xl');
      } else if (width >= breakpoints['2xl']) {
        setBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  return breakpoint;
}

/**
 * Hook to check if screen is above a certain breakpoint
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [matches, query]);
  
  return matches;
}

/**
 * Hook to detect device type
 */
export function useDevice() {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.md - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`
  );
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch: 'ontouchstart' in window,
  };
}

// =============================================================================
// RESPONSIVE COMPONENT UTILITIES
// =============================================================================

/**
 * Responsive value helper
 * Allows setting different values per breakpoint
 */
export type ResponsiveValue<T> = T | {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  '3xl'?: T;
  '4xl'?: T;
};

/**
 * Get the current responsive value based on breakpoint
 */
export function getResponsiveValue<T>(
  value: ResponsiveValue<T>,
  currentBreakpoint: Breakpoint
): T | undefined {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  
  // Start from current breakpoint and work backwards to find a value
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (bp in value && value[bp as keyof typeof value] !== undefined) {
      return value[bp as keyof typeof value];
    }
  }
  
  // If no value found, try to get the smallest defined value
  for (const bp of breakpointOrder) {
    if (bp in value && value[bp as keyof typeof value] !== undefined) {
      return value[bp as keyof typeof value];
    }
  }
  
  return undefined;
}

// =============================================================================
// CONTAINER UTILITIES
// =============================================================================

/**
 * Container max widths per breakpoint
 */
export const containerWidths = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
  '4xl': '2560px',
} as const;

/**
 * Generate container styles
 */
export function getContainerStyles(breakpoint: Breakpoint) {
  return {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: 'var(--space-4)',
    paddingRight: 'var(--space-4)',
    maxWidth: containerWidths[breakpoint],
  };
}

// =============================================================================
// GRID SYSTEM
// =============================================================================

/**
 * Grid configuration
 */
export const gridConfig = {
  columns: 12,
  gap: {
    xs: '1rem',
    sm: '1.25rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '2.5rem',
  },
} as const;

/**
 * Generate grid column span classes
 */
export function getGridColumns(span: number | ResponsiveValue<number>) {
  const breakpoint = useBreakpoint();
  const columns = getResponsiveValue(span, breakpoint) || 12;
  
  return {
    gridColumn: `span ${columns} / span ${columns}`,
  };
}

// =============================================================================
// DENSITY SETTINGS
// =============================================================================

export type Density = 'comfortable' | 'compact' | 'spacious';

/**
 * Density multipliers for spacing
 */
export const densityMultipliers = {
  compact: 0.75,
  comfortable: 1,
  spacious: 1.5,
} as const;

/**
 * Apply density to spacing values
 */
export function applyDensity(value: number, density: Density = 'comfortable') {
  return value * densityMultipliers[density];
}

// =============================================================================
// RESPONSIVE TYPOGRAPHY
// =============================================================================

/**
 * Fluid typography scale
 */
export const fluidTypography = {
  xs: 'clamp(0.625rem, 0.5rem + 0.5vw, 0.75rem)',
  sm: 'clamp(0.75rem, 0.625rem + 0.5vw, 0.875rem)',
  base: 'clamp(1rem, 0.875rem + 0.5vw, 1.125rem)',
  lg: 'clamp(1.125rem, 1rem + 0.5vw, 1.25rem)',
  xl: 'clamp(1.25rem, 1.125rem + 0.5vw, 1.5rem)',
  '2xl': 'clamp(1.5rem, 1.25rem + 1vw, 1.875rem)',
  '3xl': 'clamp(1.875rem, 1.5rem + 1.5vw, 2.25rem)',
  '4xl': 'clamp(2.25rem, 1.875rem + 1.5vw, 3rem)',
  '5xl': 'clamp(3rem, 2.25rem + 3vw, 3.75rem)',
  '6xl': 'clamp(3.75rem, 3rem + 3vw, 4.5rem)',
} as const;

// =============================================================================
// RESPONSIVE SPACING
// =============================================================================

/**
 * Responsive spacing scale
 */
export const responsiveSpacing = {
  xs: {
    1: '0.125rem',
    2: '0.25rem',
    3: '0.375rem',
    4: '0.5rem',
    6: '0.75rem',
    8: '1rem',
    12: '1.5rem',
    16: '2rem',
    24: '3rem',
  },
  sm: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    6: '1.5rem',
    8: '2rem',
    12: '3rem',
    16: '4rem',
    24: '6rem',
  },
  lg: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    6: '1.5rem',
    8: '2rem',
    12: '3rem',
    16: '4rem',
    24: '6rem',
  },
} as const;

// Export all utilities
export const responsive = {
  breakpoints,
  media,
  useBreakpoint,
  useMediaQuery,
  useDevice,
  getResponsiveValue,
  containerWidths,
  getContainerStyles,
  gridConfig,
  getGridColumns,
  densityMultipliers,
  applyDensity,
  fluidTypography,
  responsiveSpacing,
} as const;