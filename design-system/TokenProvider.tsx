import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface TokenContextValue {
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  tokens: Record<string, any>;
  isSystemDark: boolean;
}

const TokenContext = createContext<TokenContextValue | undefined>(undefined);

interface TokenProviderProps {
  children: ReactNode;
  theme?: 'light' | 'dark' | 'auto';
  tokens?: Record<string, any>;
}

export function TokenProvider({ 
  children, 
  theme: initialTheme = 'auto',
  tokens: customTokens = {}
}: TokenProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(initialTheme);
  const [isSystemDark, setIsSystemDark] = useState(false);

  // Detect system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };

    // Set initial value
    setIsSystemDark(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // Remove data-theme attribute to use system preference
      root.removeAttribute('data-theme');
    } else {
      // Set explicit theme
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Load and inject token CSS
  useEffect(() => {
    const linkId = 'castmatch-design-tokens';
    let link = document.getElementById(linkId) as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = '/design-system/dist/tokens.css';
      document.head.appendChild(link);
    }

    return () => {
      // Optionally remove the stylesheet on unmount
      // link?.remove();
    };
  }, []);

  // Apply custom tokens as CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    const applyTokens = (tokens: Record<string, any>, prefix = '--custom-') => {
      Object.entries(tokens).forEach(([key, value]) => {
        if (typeof value === 'object' && !Array.isArray(value)) {
          applyTokens(value, `${prefix}${key}-`);
        } else {
          root.style.setProperty(`${prefix}${key}`, String(value));
        }
      });
    };

    if (Object.keys(customTokens).length > 0) {
      applyTokens(customTokens);
    }
  }, [customTokens]);

  const effectiveTheme = theme === 'auto' 
    ? (isSystemDark ? 'dark' : 'light')
    : theme;

  const value: TokenContextValue = {
    theme,
    setTheme,
    tokens: customTokens,
    isSystemDark
  };

  return (
    <TokenContext.Provider value={value}>
      <div data-effective-theme={effectiveTheme}>
        {children}
      </div>
    </TokenContext.Provider>
  );
}

export function useTokens() {
  const context = useContext(TokenContext);
  
  if (!context) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  
  return context;
}

// Theme toggle component
export function ThemeToggle() {
  const { theme, setTheme } = useTokens();

  const icons = {
    light: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
      </svg>
    ),
    dark: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    ),
    auto: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" opacity="0.3" />
      </svg>
    )
  };

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className="theme-toggle"
      aria-label={`Current theme: ${theme}. Click to change.`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: 'var(--border-radius-lg)',
        backgroundColor: 'var(--surface-secondary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-primary)',
        cursor: 'pointer',
        transition: 'all var(--transition-duration-200) var(--transition-timing-smooth)'
      }}
    >
      {icons[theme]}
    </button>
  );
}

// Hook for accessing specific token values
export function useToken(path: string): string {
  const { tokens } = useTokens();
  
  const getValue = (obj: any, path: string): string => {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value || `var(--${path.replace(/\./g, '-')})`;
  };
  
  return getValue(tokens, path);
}

// Utility hook for responsive design
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<string>('xs');

  useEffect(() => {
    const breakpoints = {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
      '3xl': 1920,
      '4xl': 2560
    };

    const getBreakpoint = () => {
      const width = window.innerWidth;
      let current = 'xs';
      
      for (const [key, value] of Object.entries(breakpoints)) {
        if (width >= value) {
          current = key;
        } else {
          break;
        }
      }
      
      return current;
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return breakpoint;
}