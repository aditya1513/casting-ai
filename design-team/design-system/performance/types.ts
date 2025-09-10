/**
 * TypeScript definitions for CSS optimization utilities
 * CastMatch Design System
 */

import { CSSObject } from '@emotion/react';

// Theme structure for the design system
export interface Theme {
  colors: {
    base: Record<string, string>;
    gray: Record<string, string>;
    mumbai: {
      saffron: Record<string, string>;
      crimson: Record<string, string>;
      gold: Record<string, string>;
    };
    neon: {
      'electric-blue': Record<string, string>;
      magenta: Record<string, string>;
    };
    semantic: {
      'dark-mode': {
        background: Record<string, string>;
        text: Record<string, string>;
        border: Record<string, string>;
        accent: Record<string, string>;
        shadow: Record<string, string>;
      };
    };
  };
  spacing: {
    fluid: Record<string, string>;
    touch: Record<string, string>;
    container: Record<string, string>;
  };
  typography: {
    fluid: Record<string, string>;
    'line-height': Record<string, number>;
  };
  breakpoint: Record<string, string>;
  component: {
    button: Record<string, Record<string, string>>;
    card: Record<string, Record<string, string>>;
    input: Record<string, Record<string, string>>;
    modal: Record<string, string>;
    sidebar: Record<string, string>;
    navigation: Record<string, Record<string, string>>;
  };
  animation: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
  shadow: Record<string, Record<string, any>>;
  grid: Record<string, Record<string, string | number>>;
}

// CSS-in-JS styling function types
export type StyleFunction<T = any> = (theme: Theme, props?: T) => CSSObject;
export type StyleObject = CSSObject | StyleFunction;
export type StyleDefinition = StyleObject | StyleObject[];

// Component variant types
export interface ComponentVariant {
  name: string;
  styles: CSSObject;
  description?: string;
  accessibility?: {
    contrast_ratio?: string;
    wcag_level?: 'A' | 'AA' | 'AAA';
    keyboard_accessible?: boolean;
    screen_reader_friendly?: boolean;
  };
}

// Component state types
export type ComponentState = 
  | 'default'
  | 'hover' 
  | 'active'
  | 'focus'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'success';

// Responsive breakpoint types
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'desktop-xl';

// Animation preferences
export type MotionPreference = 'no-preference' | 'reduce';

// Theme mode types
export type ThemeMode = 'light' | 'dark' | 'auto';

// Color format types
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

// CSS property categories for optimization
export interface CSSPropertyCategories {
  layout: string[];
  visual: string[];
  animation: string[];
  interaction: string[];
}

// Performance budget constraints
export interface PerformanceBudget {
  maxBundleSize: number; // in KB
  maxRenderTime: number; // in ms
  maxMemoryUsage: number; // in MB
  maxCacheSize: number; // number of entries
}

// CSS optimization strategies
export type OptimizationStrategy = 
  | 'static-extraction'
  | 'runtime-optimization' 
  | 'critical-css'
  | 'cache-optimization'
  | 'bundle-splitting';

// Accessibility compliance levels
export interface AccessibilityCompliance {
  level: 'A' | 'AA' | 'AAA';
  contrast_ratio: number;
  keyboard_navigation: boolean;
  screen_reader_support: boolean;
  focus_indicators: boolean;
}

// Design token categories
export type TokenCategory = 
  | 'color'
  | 'typography'
  | 'spacing'
  | 'shadow'
  | 'border'
  | 'animation'
  | 'breakpoint';

// Token value types
export type TokenValue = string | number | object;

// Design token definition
export interface DesignToken {
  $type: TokenCategory;
  $value: TokenValue;
  $description?: string;
  accessibility?: AccessibilityCompliance;
  performance?: {
    static_extractable?: boolean;
    cache_friendly?: boolean;
    bundle_impact?: 'low' | 'medium' | 'high';
  };
}

// Component documentation types
export interface ComponentDocumentation {
  name: string;
  description: string;
  variants: ComponentVariant[];
  states: ComponentState[];
  accessibility: AccessibilityCompliance;
  examples: {
    code: string;
    preview?: string;
    description: string;
  }[];
  api: {
    props: {
      name: string;
      type: string;
      default?: any;
      required: boolean;
      description: string;
    }[];
  };
  migration?: {
    from: string;
    to: string;
    breaking_changes: string[];
    migration_guide: string;
  };
}

// Style system configuration
export interface StyleSystemConfig {
  theme: Theme;
  optimization: {
    enabled: boolean;
    strategies: OptimizationStrategy[];
    budget: PerformanceBudget;
  };
  accessibility: {
    enforce_wcag: boolean;
    level: 'A' | 'AA' | 'AAA';
    color_contrast_checking: boolean;
  };
  responsive: {
    mobile_first: boolean;
    container_queries: boolean;
    fluid_typography: boolean;
  };
  dark_mode: {
    enabled: boolean;
    strategy: 'class' | 'attribute' | 'media';
    transition_duration: string;
  };
}

// CSS-in-JS library types
export type CSSInJSLibrary = 'emotion' | 'styled-components' | 'stitches' | 'vanilla-extract';

// Build optimization types
export interface BuildOptimization {
  library: CSSInJSLibrary;
  static_extraction: boolean;
  tree_shaking: boolean;
  dead_code_elimination: boolean;
  minification: boolean;
  critical_css_inlining: boolean;
}

// Runtime optimization types
export interface RuntimeOptimization {
  style_caching: boolean;
  memoization: boolean;
  lazy_loading: boolean;
  code_splitting: boolean;
  performance_monitoring: boolean;
}

// Export all types as a namespace
export namespace CastMatchDesignSystem {
  export type {
    Theme,
    StyleFunction,
    StyleObject,
    StyleDefinition,
    ComponentVariant,
    ComponentState,
    Breakpoint,
    MotionPreference,
    ThemeMode,
    ColorFormat,
    CSSPropertyCategories,
    PerformanceBudget,
    OptimizationStrategy,
    AccessibilityCompliance,
    TokenCategory,
    TokenValue,
    DesignToken,
    ComponentDocumentation,
    StyleSystemConfig,
    CSSInJSLibrary,
    BuildOptimization,
    RuntimeOptimization,
  };
}