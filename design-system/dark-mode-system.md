# CastMatch Dark Mode Implementation Guide

## Version 1.0.0

### Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System Architecture](#color-system-architecture)
3. [Implementation Strategy](#implementation-strategy)
4. [Component Adaptations](#component-adaptations)
5. [Performance Considerations](#performance-considerations)
6. [Testing & Validation](#testing--validation)

---

## Design Philosophy

### Elevation-Based Approach

In dark mode, we use **elevation** to create visual hierarchy instead of shadows. Higher elevation surfaces are lighter in color, creating a natural depth perception.

**Elevation Levels**:
- **Level 0 (Base)**: `oklch(12.5% 0.025 110)` - Pure background
- **Level 1 (Raised)**: `oklch(18.2% 0.024 110)` - Cards, containers
- **Level 2 (Overlay)**: `oklch(22.5% 0.023 110)` - Modals, dropdowns
- **Level 3 (Prominent)**: `oklch(26.8% 0.022 110)` - Active states
- **Level 4 (Peak)**: `oklch(32.5% 0.020 110)` - Tooltips, popovers

### Color Adaptation Principles

1. **Reduced Saturation**: Dark backgrounds require less saturated colors
2. **Increased Contrast**: Minimum 4.5:1 for body text, 3:1 for large text
3. **Accent Optimization**: Brighter accent colors for visibility
4. **Semantic Preservation**: Maintain meaning across themes

---

## Color System Architecture

### CSS Variable Strategy

```css
:root {
  /* Light mode (default) */
  --color-background-primary: oklch(98.5% 0.002 110);
  --color-background-secondary: oklch(96.8% 0.003 110);
  --color-text-primary: oklch(18.2% 0.024 110);
  --color-text-secondary: oklch(39.8% 0.020 110);
  --color-accent-gold: oklch(68.5% 0.175 96);
  --color-accent-crimson: oklch(58.8% 0.195 25);
  --color-surface-raised: oklch(100% 0 0);
  --color-border-default: oklch(88.2% 0.008 110);
  
  /* Shadows in light mode */
  --shadow-sm: 0 1px 3px 0 oklch(0% 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px oklch(0% 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px oklch(0% 0 0 / 0.1);
}

[data-theme="dark"] {
  /* Dark mode overrides */
  --color-background-primary: oklch(12.5% 0.025 110);
  --color-background-secondary: oklch(18.2% 0.024 110);
  --color-text-primary: oklch(96.8% 0.003 110);
  --color-text-secondary: oklch(88.2% 0.008 110);
  --color-accent-gold: oklch(72.5% 0.165 96);
  --color-accent-crimson: oklch(62.5% 0.175 25);
  --color-surface-raised: oklch(18.2% 0.024 110 / 0.8);
  --color-border-default: oklch(28.5% 0.022 110);
  
  /* Elevation-based shadows in dark mode */
  --shadow-sm: 0 0 0 1px oklch(100% 0 0 / 0.05);
  --shadow-md: 0 0 0 1px oklch(100% 0 0 / 0.1), 0 4px 12px oklch(0% 0 0 / 0.5);
  --shadow-lg: 0 0 0 1px oklch(100% 0 0 / 0.1), 0 8px 24px oklch(0% 0 0 / 0.7);
}

/* Automatic dark mode based on system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Apply dark mode variables */
  }
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for automatic
  theme: {
    extend: {
      colors: {
        // Dynamic color values using CSS variables
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        accent: {
          gold: 'var(--color-accent-gold)',
          crimson: 'var(--color-accent-crimson)',
        },
        surface: {
          raised: 'var(--color-surface-raised)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
        }
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      }
    }
  }
};
```

---

## Implementation Strategy

### Theme Context Provider

```tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load saved preference
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (theme: Theme) => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        root.setAttribute('data-theme', systemTheme);
        setResolvedTheme(systemTheme);
      } else {
        root.setAttribute('data-theme', theme);
        setResolvedTheme(theme);
      }
    };

    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Theme Toggle Component

```tsx
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const icons = {
    light: '☀️',
    dark: '🌙',
    system: '💻'
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative p-3 rounded-lg bg-surface-raised border border-border-DEFAULT"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        key={theme}
        initial={{ opacity: 0, rotate: -180 }}
        animate={{ opacity: 1, rotate: 0 }}
        exit={{ opacity: 0, rotate: 180 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-2xl">{icons[theme]}</span>
      </motion.div>
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </motion.button>
  );
};
```

### Advanced Theme Switcher

```tsx
export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: '☀️', description: 'Bright and energetic' },
    { value: 'dark', label: 'Dark', icon: '🌙', description: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: '💻', description: 'Match your device' }
  ];

  return (
    <div className="p-4 bg-surface-raised rounded-xl border border-border-DEFAULT">
      <h3 className="text-lg font-semibold mb-4">Appearance</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value as Theme)}
            className={cn(
              'w-full flex items-start p-3 rounded-lg transition-all',
              theme === option.value
                ? 'bg-accent-gold/10 border-2 border-accent-gold'
                : 'border-2 border-transparent hover:bg-background-secondary'
            )}
          >
            <span className="text-2xl mr-3">{option.icon}</span>
            <div className="text-left">
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-text-secondary">{option.description}</div>
              {option.value === 'system' && (
                <div className="text-xs mt-1 text-accent-gold">
                  Currently: {resolvedTheme}
                </div>
              )}
            </div>
            {theme === option.value && (
              <span className="ml-auto text-accent-gold">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

## Component Adaptations

### Button Component Dark Mode

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-semibold transition-all duration-300',
  {
    variants: {
      variant: {
        primary: [
          // Light mode
          'bg-[oklch(68.5%_0.175_96)] text-white',
          'hover:bg-[oklch(61.2%_0.165_96)]',
          // Dark mode
          'dark:bg-[oklch(72.5%_0.165_96)]',
          'dark:hover:bg-[oklch(78.5%_0.155_96)]',
          'dark:text-[oklch(12.5%_0.025_110)]'
        ],
        secondary: [
          // Light mode
          'bg-transparent border-2 border-[oklch(68.5%_0.175_96)]',
          'text-[oklch(68.5%_0.175_96)]',
          'hover:bg-[oklch(68.5%_0.175_96)]/10',
          // Dark mode
          'dark:border-[oklch(72.5%_0.165_96)]',
          'dark:text-[oklch(72.5%_0.165_96)]',
          'dark:hover:bg-[oklch(72.5%_0.165_96)]/20'
        ],
        ghost: [
          // Light mode
          'text-[oklch(28.5%_0.022_110)]',
          'hover:bg-[oklch(93.5%_0.005_110)]',
          // Dark mode
          'dark:text-[oklch(88.2%_0.008_110)]',
          'dark:hover:bg-[oklch(28.5%_0.022_110)]'
        ]
      }
    }
  }
);
```

### Card Component with Elevation

```tsx
const Card: React.FC<{ elevation?: number }> = ({ elevation = 1, children }) => {
  const elevationClasses = {
    0: 'bg-background-primary dark:bg-[oklch(12.5%_0.025_110)]',
    1: 'bg-surface-raised dark:bg-[oklch(18.2%_0.024_110)]',
    2: 'bg-surface-raised dark:bg-[oklch(22.5%_0.023_110)]',
    3: 'bg-surface-raised dark:bg-[oklch(26.8%_0.022_110)]',
    4: 'bg-surface-raised dark:bg-[oklch(32.5%_0.020_110)]'
  };

  const shadowClasses = {
    0: '',
    1: 'shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5',
    2: 'shadow-md dark:shadow-none dark:ring-1 dark:ring-white/10',
    3: 'shadow-lg dark:shadow-none dark:ring-1 dark:ring-white/15',
    4: 'shadow-xl dark:shadow-none dark:ring-1 dark:ring-white/20'
  };

  return (
    <div className={cn(
      'rounded-xl p-6 transition-all',
      elevationClasses[elevation],
      shadowClasses[elevation]
    )}>
      {children}
    </div>
  );
};
```

### Input Field Adaptation

```tsx
const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      className={cn(
        // Base styles
        'w-full px-4 py-2 rounded-lg transition-all',
        // Light mode
        'bg-white border border-[oklch(88.2%_0.008_110)]',
        'text-[oklch(18.2%_0.024_110)]',
        'placeholder:text-[oklch(62.8%_0.015_110)]',
        'focus:border-[oklch(68.5%_0.175_96)] focus:ring-2 focus:ring-[oklch(68.5%_0.175_96)]/20',
        // Dark mode
        'dark:bg-[oklch(18.2%_0.024_110)] dark:border-[oklch(28.5%_0.022_110)]',
        'dark:text-[oklch(96.8%_0.003_110)]',
        'dark:placeholder:text-[oklch(50.2%_0.018_110)]',
        'dark:focus:border-[oklch(72.5%_0.165_96)] dark:focus:ring-[oklch(72.5%_0.165_96)]/20'
      )}
      {...props}
    />
  );
};
```

### Modal with Backdrop

```tsx
const Modal: React.FC<ModalProps> = ({ open, children }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className={cn(
        'absolute inset-0 transition-opacity',
        // Light mode
        'bg-black/50 backdrop-blur-sm',
        // Dark mode - stronger backdrop
        'dark:bg-black/70 dark:backdrop-blur-md'
      )} />
      
      {/* Modal content */}
      <div className={cn(
        'relative rounded-2xl p-8 max-w-lg w-full mx-4',
        // Light mode
        'bg-white shadow-2xl',
        // Dark mode with elevation
        'dark:bg-[oklch(22.5%_0.023_110)] dark:ring-1 dark:ring-white/10'
      )}>
        {children}
      </div>
    </div>,
    document.body
  );
};
```

---

## Performance Considerations

### CSS Variable Performance

```css
/* Optimize CSS variable lookups */
.theme-cached {
  /* Cache frequently used variables */
  --cached-bg: var(--color-background-primary);
  --cached-text: var(--color-text-primary);
  --cached-border: var(--color-border-default);
  
  /* Use cached variables */
  background-color: var(--cached-bg);
  color: var(--cached-text);
  border-color: var(--cached-border);
}
```

### Transition Optimization

```tsx
// Prevent flash of unstyled content
const useThemeTransition = () => {
  useEffect(() => {
    // Disable transitions temporarily during theme switch
    const disableTransitions = () => {
      const css = document.createElement('style');
      css.textContent = '* { transition: none !important; }';
      css.id = 'disable-transitions';
      document.head.appendChild(css);
      
      // Force reflow
      window.getComputedStyle(document.body);
      
      // Re-enable transitions
      setTimeout(() => {
        document.getElementById('disable-transitions')?.remove();
      }, 50);
    };

    window.addEventListener('theme-change', disableTransitions);
    return () => window.removeEventListener('theme-change', disableTransitions);
  }, []);
};
```

### Lazy Loading Theme Styles

```tsx
const useLazyThemeStyles = (theme: 'light' | 'dark') => {
  useEffect(() => {
    const loadThemeStyles = async () => {
      if (theme === 'dark') {
        // Lazy load dark mode specific styles
        await import('./styles/dark-mode.css');
      }
    };
    
    loadThemeStyles();
  }, [theme]);
};
```

---

## Testing & Validation

### Contrast Ratio Testing

```typescript
// utils/contrast-checker.ts
export const checkContrast = (
  foreground: string,
  background: string
): { ratio: number; passes: { AA: boolean; AAA: boolean } } => {
  const getLuminance = (color: string): number => {
    // Convert OKLCH to RGB and calculate relative luminance
    // Implementation details...
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio,
    passes: {
      AA: ratio >= 4.5, // Normal text
      AAA: ratio >= 7.0  // Enhanced contrast
    }
  };
};

// Test all color combinations
const testColorContrast = () => {
  const textColors = [
    'oklch(96.8% 0.003 110)', // Dark mode primary text
    'oklch(88.2% 0.008 110)', // Dark mode secondary text
  ];

  const backgrounds = [
    'oklch(12.5% 0.025 110)', // Dark mode background
    'oklch(18.2% 0.024 110)', // Dark mode raised surface
  ];

  textColors.forEach(text => {
    backgrounds.forEach(bg => {
      const result = checkContrast(text, bg);
      console.log(`Text: ${text} on Background: ${bg}`);
      console.log(`Contrast Ratio: ${result.ratio.toFixed(2)}`);
      console.log(`WCAG AA: ${result.passes.AA ? '✅' : '❌'}`);
      console.log(`WCAG AAA: ${result.passes.AAA ? '✅' : '❌'}`);
    });
  });
};
```

### Visual Regression Testing

```typescript
// tests/dark-mode.test.tsx
import { render } from '@testing-library/react';
import { ThemeProvider } from '../ThemeProvider';

describe('Dark Mode Visual Tests', () => {
  it('should render components correctly in dark mode', async () => {
    const { container } = render(
      <ThemeProvider defaultTheme="dark">
        <YourComponent />
      </ThemeProvider>
    );

    // Take screenshot for visual regression
    await expect(container).toMatchSnapshot();
    
    // Check computed styles
    const element = container.querySelector('.your-element');
    const styles = window.getComputedStyle(element);
    
    expect(styles.backgroundColor).toBe('oklch(18.2% 0.024 110)');
    expect(styles.color).toBe('oklch(96.8% 0.003 110)');
  });
});
```

### Accessibility Audit

```typescript
// accessibility/dark-mode-audit.ts
export const auditDarkMode = () => {
  const checks = [
    {
      name: 'Focus indicators visible',
      test: () => {
        const focusableElements = document.querySelectorAll(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        );
        
        return Array.from(focusableElements).every(el => {
          const styles = window.getComputedStyle(el, ':focus');
          return styles.outlineWidth !== '0px' || styles.boxShadow !== 'none';
        });
      }
    },
    {
      name: 'Sufficient color contrast',
      test: () => {
        // Check all text elements for contrast
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
        
        return Array.from(textElements).every(el => {
          const styles = window.getComputedStyle(el);
          const parent = el.parentElement;
          const bgStyles = window.getComputedStyle(parent);
          
          const result = checkContrast(styles.color, bgStyles.backgroundColor);
          return result.passes.AA;
        });
      }
    },
    {
      name: 'No color-only information',
      test: () => {
        // Ensure critical information isn't conveyed by color alone
        const criticalElements = document.querySelectorAll('[aria-label], [aria-describedby]');
        return criticalElements.length > 0;
      }
    }
  ];

  return checks.map(check => ({
    name: check.name,
    passed: check.test()
  }));
};
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up CSS variables for all colors
- [ ] Implement theme context and provider
- [ ] Create theme toggle component
- [ ] Configure Tailwind for dark mode
- [ ] Test with system preferences

### Phase 2: Core Components (Week 2)
- [ ] Adapt all buttons for dark mode
- [ ] Update form inputs and controls
- [ ] Modify cards and surfaces
- [ ] Adjust navigation components
- [ ] Update typography colors

### Phase 3: Advanced Features (Week 3)
- [ ] Implement elevation system
- [ ] Add smooth transitions
- [ ] Create theme-aware shadows
- [ ] Optimize performance
- [ ] Add persistence

### Phase 4: Testing & Refinement (Week 4)
- [ ] Conduct contrast ratio testing
- [ ] Perform accessibility audit
- [ ] Set up visual regression tests
- [ ] User preference testing
- [ ] Performance benchmarking

### Phase 5: Documentation (Week 5)
- [ ] Document color mappings
- [ ] Create migration guide
- [ ] Write usage examples
- [ ] Develop best practices
- [ ] Training materials

---

## Best Practices

### Do's ✅
1. **Use semantic color tokens** instead of hard-coded values
2. **Test in both themes** during development
3. **Maintain consistent elevation** across similar components
4. **Provide theme persistence** across sessions
5. **Respect user preferences** (prefers-color-scheme)
6. **Use smooth transitions** when switching themes
7. **Test contrast ratios** for all text/background combinations
8. **Consider images and media** in dark mode

### Don'ts ❌
1. **Don't use pure black** (#000000) as background
2. **Don't use pure white** (#FFFFFF) as text
3. **Don't increase saturation** in dark mode
4. **Don't rely on shadows** for elevation in dark mode
5. **Don't forget focus states** in both themes
6. **Don't hardcode theme-specific values**
7. **Don't neglect loading states** and skeletons
8. **Don't ignore system preferences**

---

## Mumbai Cinema Dark Theme

Special considerations for Mumbai entertainment industry:

```css
/* Bollywood-inspired dark theme */
[data-theme="bollywood-dark"] {
  /* Cinema hall ambiance */
  --color-background-primary: oklch(8% 0.02 20); /* Deep velvet */
  --color-background-secondary: oklch(12% 0.025 20);
  
  /* Golden accents like cinema screens */
  --color-accent-gold: oklch(75% 0.18 85);
  --color-accent-spotlight: oklch(85% 0.15 90);
  
  /* Red carpet crimson */
  --color-accent-crimson: oklch(65% 0.20 25);
  
  /* Film reel borders */
  --color-border-reel: oklch(25% 0.01 0);
}