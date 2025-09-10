/**
 * CastMatch Design System - Main Export
 * Central export point for all design system components and utilities
 */

// =============================================================================
// TOKENS
// =============================================================================

export { baseTokens } from './tokens/base-tokens';
export type { BaseTokens } from './tokens/base-tokens';

export { 
  semanticTokens,
  lightTheme,
  darkTheme,
  festivalThemes 
} from './tokens/semantic-tokens';
export type { SemanticTokens } from './tokens/semantic-tokens';

export { componentTokens } from './tokens/component-tokens';
export type { ComponentTokens } from './tokens/component-tokens';

// =============================================================================
// ATOMIC COMPONENTS
// =============================================================================

export { 
  Button, 
  buttonVariants 
} from './components/atoms/Button';
export type { ButtonProps } from './components/atoms/Button';

export { 
  Input,
  Textarea,
  inputVariants 
} from './components/atoms/Input';
export type { InputProps } from './components/atoms/Input';

export { 
  Badge,
  BadgeGroup,
  StatusBadge,
  SkillBadge,
  badgeVariants 
} from './components/atoms/Badge';
export type { BadgeProps } from './components/atoms/Badge';

// =============================================================================
// MOLECULAR COMPONENTS
// =============================================================================

export { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  cardVariants 
} from './components/molecules/Card';
export type { CardProps } from './components/molecules/Card';

// =============================================================================
// ORGANISM COMPONENTS
// =============================================================================

export { default as TalentCard } from './components/organisms/TalentCard';
export type { TalentCardProps } from './components/organisms/TalentCard';

// =============================================================================
// UTILITIES
// =============================================================================

export {
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
  responsive
} from './utils/responsive';

export type {
  Breakpoint,
  ResponsiveValue,
  Density
} from './utils/responsive';

// =============================================================================
// THEME UTILITIES
// =============================================================================

/**
 * Apply theme to document
 */
export const applyTheme = (theme: 'light' | 'dark' | 'diwali' | 'holi' | 'ganesh') => {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Store preference
  localStorage.setItem('castmatch-theme', theme);
};

/**
 * Get current theme
 */
export const getCurrentTheme = (): string => {
  return document.documentElement.getAttribute('data-theme') || 'light';
};

/**
 * Initialize theme from localStorage or system preference
 */
export const initializeTheme = () => {
  const stored = localStorage.getItem('castmatch-theme');
  
  if (stored) {
    applyTheme(stored as any);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }
};

/**
 * Toggle between light and dark themes
 */
export const toggleTheme = () => {
  const current = getCurrentTheme();
  applyTheme(current === 'dark' ? 'light' : 'dark');
};

// =============================================================================
// DESIGN SYSTEM CONFIGURATION
// =============================================================================

export const designSystem = {
  version: '1.0.0',
  name: 'CastMatch Design System',
  
  // Token references
  tokens: {
    base: baseTokens,
    semantic: semanticTokens,
    component: componentTokens,
  },
  
  // Theme management
  theme: {
    apply: applyTheme,
    get: getCurrentTheme,
    init: initializeTheme,
    toggle: toggleTheme,
  },
  
  // Responsive utilities
  responsive: {
    breakpoints,
    media,
    hooks: {
      useBreakpoint,
      useMediaQuery,
      useDevice,
    },
    utils: {
      getResponsiveValue,
      getContainerStyles,
      getGridColumns,
      applyDensity,
    },
  },
  
  // Component registry
  components: {
    atoms: ['Button', 'Input', 'Badge'],
    molecules: ['Card'],
    organisms: ['TalentCard'],
  },
  
  // Performance budgets
  performance: {
    maxBundleSize: 100, // kb
    maxRenderTime: 50,  // ms
    targetFPS: 60,
    maxLoadTime: 3000,  // ms
  },
  
  // Accessibility standards
  accessibility: {
    standard: 'WCAG 2.1',
    level: 'AA',
    contrastRatio: {
      normal: 4.5,
      large: 3,
    },
  },
} as const;

// Default export
export default designSystem;