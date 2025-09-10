/**
 * Enhanced Theme Provider with Performance Optimizations
 * CastMatch Design System - Production Ready
 * 
 * Features:
 * - Smooth dark mode transitions (<100ms)
 * - CSS custom properties for dynamic theming
 * - Performance monitoring and optimization
 * - Automatic theme detection
 * - Memory leak prevention
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useRef,
  useMemo
} from 'react';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { Global, css } from '@emotion/react';
import { cssOptimizer } from '../../design-system/performance/css-optimization';
import type { Theme, ThemeMode, ComponentState } from '../../design-system/performance/types';

// Import optimized color tokens
import colorsOptimized from '../../design-system/tokens/colors-optimized.json';
import responsiveTokens from '../../design-system/tokens/responsive-tokens.json';

// Theme context interface
interface ThemeContextValue {
  mode: ThemeMode;
  theme: Theme;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  isTransitioning: boolean;
  performance: {
    transitionDuration: number;
    renderTime: number;
    cacheHits: number;
  };
}

// Create theme context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Theme configuration
const THEME_CONFIG = {
  transitionDuration: 85, // <100ms for smooth UX
  cssVariablePrefix: '--castmatch',
  storageKey: 'castmatch-theme-mode',
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
};

/**
 * Convert design tokens to CSS custom properties
 */
function generateCSSProperties(tokens: any, prefix = ''): Record<string, string> {
  const properties: Record<string, string> = {};
  
  function processTokens(obj: any, currentPrefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const propName = currentPrefix ? `${currentPrefix}-${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        if ('$value' in value) {
          // Design token with $value
          properties[`${THEME_CONFIG.cssVariablePrefix}-${propName}`] = String(value.$value);
        } else {
          // Nested object
          processTokens(value, propName);
        }
      } else if (typeof value === 'string' || typeof value === 'number') {
        properties[`${THEME_CONFIG.cssVariablePrefix}-${propName}`] = String(value);
      }
    });
  }
  
  processTokens(tokens, prefix);
  return properties;
}

/**
 * Build optimized theme object from tokens
 */
function buildTheme(mode: ThemeMode): Theme {
  const colorTokens = colorsOptimized.color;
  const responsiveConfig = responsiveTokens;
  
  // Apply mode-specific color overrides
  const modeColors = mode === 'dark' 
    ? colorTokens.semantic['dark-mode']
    : colorTokens.semantic['dark-mode']; // Use dark mode as default for now

  return {
    colors: {
      base: colorTokens.base,
      gray: colorTokens.gray,
      mumbai: colorTokens.mumbai,
      neon: colorTokens.neon,
      semantic: {
        'dark-mode': modeColors,
      },
    },
    spacing: responsiveConfig.spacing,
    typography: responsiveConfig.typography,
    breakpoint: responsiveConfig.breakpoint,
    component: responsiveConfig.component,
    animation: responsiveConfig.animation,
    shadow: responsiveConfig.shadow,
    grid: responsiveConfig.grid,
  } as Theme;
}

/**
 * Global CSS with smooth transitions and CSS custom properties
 */
const createGlobalStyles = (
  theme: Theme, 
  mode: ThemeMode, 
  isTransitioning: boolean
) => {
  const cssProperties = generateCSSProperties({
    ...colorsOptimized.color,
    ...responsiveTokens,
  });

  return css`
    :root {
      /* CSS Custom Properties for dynamic theming */
      ${Object.entries(cssProperties)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join('\n      ')}
      
      /* Theme transition settings */
      --theme-transition-duration: ${THEME_CONFIG.transitionDuration}ms;
      --theme-transition-easing: cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Smooth theme transitions */
    *,
    *::before,
    *::after {
      transition: 
        background-color var(--theme-transition-duration) var(--theme-transition-easing),
        color var(--theme-transition-duration) var(--theme-transition-easing),
        border-color var(--theme-transition-duration) var(--theme-transition-easing),
        box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
    }

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        transition: none !important;
      }
    }

    /* Theme mode classes */
    html[data-theme="dark"] {
      color-scheme: dark;
    }

    html[data-theme="light"] {
      color-scheme: light;
    }

    html[data-theme="auto"] {
      color-scheme: light dark;
    }

    /* Base styles with CSS custom properties */
    body {
      background-color: var(--castmatch-semantic-dark-mode-background-primary);
      color: var(--castmatch-semantic-dark-mode-text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: var(--castmatch-typography-line-height-body);
      margin: 0;
      padding: 0;
      
      /* Prevent layout shifts during theme transitions */
      ${isTransitioning ? 'overflow-x: hidden;' : ''}
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      :root {
        --castmatch-semantic-dark-mode-text-primary: #ffffff;
        --castmatch-semantic-dark-mode-background-primary: #000000;
      }
    }

    /* Focus indicators with high contrast */
    *:focus {
      outline: 2px solid var(--castmatch-semantic-dark-mode-border-focus);
      outline-offset: 2px;
    }

    /* Remove outline for mouse users */
    *:focus:not(:focus-visible) {
      outline: none;
    }

    /* Smooth scroll behavior */
    html {
      scroll-behavior: smooth;
    }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }
    }

    /* Loading states */
    .theme-transitioning * {
      pointer-events: none;
    }

    /* Performance optimizations */
    img, video {
      content-visibility: auto;
      contain-intrinsic-size: 300px;
    }

    /* Critical CSS for above-the-fold content */
    .critical-content {
      contain: layout style;
    }
  `;
};

/**
 * Performance monitoring hook
 */
function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    transitionDuration: 0,
    renderTime: 0,
    cacheHits: 0,
  });

  useEffect(() => {
    if (!THEME_CONFIG.enablePerformanceMonitoring) return;

    const startTime = performance.now();
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'theme-transition') {
          setMetrics(prev => ({
            ...prev,
            transitionDuration: entry.duration,
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => {
      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime,
      }));
      observer.disconnect();
    };
  }, []);

  return metrics;
}

/**
 * Theme persistence hook
 */
function useThemePersistence() {
  const getStoredTheme = useCallback((): ThemeMode => {
    if (typeof window === 'undefined') return 'auto';
    
    try {
      const stored = localStorage.getItem(THEME_CONFIG.storageKey);
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }
    
    return 'auto';
  }, []);

  const setStoredTheme = useCallback((mode: ThemeMode) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(THEME_CONFIG.storageKey, mode);
    } catch (error) {
      console.warn('Failed to store theme in localStorage:', error);
    }
  }, []);

  return { getStoredTheme, setStoredTheme };
}

/**
 * System theme detection hook
 */
function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
}

/**
 * Enhanced Theme Provider Component
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  enableTransitions?: boolean;
}

export function ThemeProvider({ 
  children, 
  defaultMode = 'auto',
  enableTransitions = true 
}: ThemeProviderProps) {
  const { getStoredTheme, setStoredTheme } = useThemePersistence();
  const systemTheme = useSystemTheme();
  const performance = usePerformanceMonitoring();
  
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize theme mode
  useEffect(() => {
    const storedMode = getStoredTheme();
    setModeState(storedMode);
  }, [getStoredTheme]);

  // Update document attributes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const actualMode = mode === 'auto' ? systemTheme : mode;
    document.documentElement.setAttribute('data-theme', actualMode);
    
    // Update meta theme-color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const bgColor = actualMode === 'dark' ? '#000000' : '#ffffff';
      themeColorMeta.setAttribute('content', bgColor);
    }
  }, [mode, systemTheme]);

  // Build theme object with memoization
  const theme = useMemo(() => {
    const actualMode = mode === 'auto' ? systemTheme : mode;
    return buildTheme(actualMode);
  }, [mode, systemTheme]);

  // Transition management
  const startTransition = useCallback(() => {
    if (!enableTransitions) return;

    setIsTransitioning(true);
    performance.mark?.('theme-transition-start');
    
    // Clear existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // End transition after duration
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      performance.mark?.('theme-transition-end');
      performance.measure?.(
        'theme-transition',
        'theme-transition-start',
        'theme-transition-end'
      );
    }, THEME_CONFIG.transitionDuration);
  }, [enableTransitions]);

  // Theme mode controls
  const setMode = useCallback((newMode: ThemeMode) => {
    startTransition();
    setModeState(newMode);
    setStoredTheme(newMode);
  }, [startTransition, setStoredTheme]);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  }, [mode, setMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      cssOptimizer.cleanup();
    };
  }, []);

  const contextValue = useMemo((): ThemeContextValue => ({
    mode,
    theme,
    toggleMode,
    setMode,
    isTransitioning,
    performance,
  }), [mode, theme, toggleMode, setMode, isTransitioning, performance]);

  const actualMode = mode === 'auto' ? systemTheme : mode;
  const globalStyles = useMemo(() => 
    createGlobalStyles(theme, actualMode, isTransitioning),
    [theme, actualMode, isTransitioning]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <EmotionThemeProvider theme={theme}>
        <Global styles={globalStyles} />
        <div className={isTransitioning ? 'theme-transitioning' : ''}>
          {children}
        </div>
      </EmotionThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use the theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * Hook to use theme-aware styles with optimization
 */
export function useThemedStyles<T = any>(
  styleFunction: (theme: Theme, props?: T) => any,
  props?: T,
  dependencies: React.DependencyList = []
) {
  const { theme } = useTheme();
  
  return useMemo(
    () => styleFunction(theme, props),
    [theme, props, ...dependencies] // eslint-disable-line react-hooks/exhaustive-deps
  );
}

/**
 * Hook for component state styles
 */
export function useComponentState() {
  const [state, setState] = useState<ComponentState>('default');
  
  const getStateStyles = useCallback((baseStyles: any, stateOverrides: Record<ComponentState, any>) => {
    return {
      ...baseStyles,
      ...stateOverrides[state],
    };
  }, [state]);

  return {
    state,
    setState,
    getStateStyles,
  };
}

/**
 * Performance optimization HOC
 */
export function withThemeOptimization<P extends object>(
  Component: React.ComponentType<P>
) {
  const OptimizedComponent = React.memo((props: P) => {
    const { theme, isTransitioning } = useTheme();
    
    // Skip rendering during transitions for better performance
    if (isTransitioning && process.env.NODE_ENV === 'production') {
      return null;
    }

    return <Component {...props} theme={theme} />;
  });

  OptimizedComponent.displayName = `withThemeOptimization(${Component.displayName || Component.name})`;
  
  return OptimizedComponent;
}

// Export default theme provider
export default ThemeProvider;