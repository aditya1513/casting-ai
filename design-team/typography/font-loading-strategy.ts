/**
 * CastMatch Typography - Advanced Font Loading Strategy
 * Optimized for Core Web Vitals and Entertainment Industry Performance
 */

interface FontLoadingConfig {
  fontFamily: string;
  fontDisplay: 'swap' | 'optional' | 'fallback' | 'block';
  preload: boolean;
  subset: boolean;
  unicodeRange?: string;
  fallback: string;
  criticalCSS: boolean;
}

interface PerformanceMetrics {
  LCP_TARGET: number; // 2.5s
  CLS_TARGET: number; // 0.1
  FCP_TARGET: number; // 1.8s
  FONT_LOAD_TARGET: number; // 100ms
}

// CastMatch Font Loading Configuration
export const FONT_LOADING_CONFIG: Record<string, FontLoadingConfig> = {
  // Primary Display Font for Headlines
  'SF Pro Display': {
    fontFamily: 'SF Pro Display',
    fontDisplay: 'swap',
    preload: true,
    subset: true,
    unicodeRange: 'U+0020-007F, U+00A0-00FF', // Basic Latin + Latin-1
    fallback: '-apple-system, BlinkMacSystemFont, system-ui',
    criticalCSS: true
  },
  
  // Body Text Font
  'Inter Variable': {
    fontFamily: 'Inter var',
    fontDisplay: 'swap',
    preload: true,
    subset: true,
    unicodeRange: 'U+0020-007F, U+00A0-00FF, U+0100-017F', // Extended Latin
    fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    criticalCSS: true
  },
  
  // Code/Monospace Font
  'JetBrains Mono': {
    fontFamily: 'JetBrains Mono',
    fontDisplay: 'optional',
    preload: false,
    subset: true,
    unicodeRange: 'U+0020-007F',
    fallback: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    criticalCSS: false
  },
  
  // Creative/Script Font
  'Playlist Script': {
    fontFamily: 'Playlist Script',
    fontDisplay: 'fallback',
    preload: false,
    subset: true,
    unicodeRange: 'U+0020-007F',
    fallback: 'cursive',
    criticalCSS: false
  }
};

// Multilingual Font Support for Mumbai Entertainment Industry
export const MULTILINGUAL_FONTS: Record<string, FontLoadingConfig> = {
  // Hindi Support
  'Noto Sans Devanagari': {
    fontFamily: 'Noto Sans Devanagari',
    fontDisplay: 'swap',
    preload: false,
    subset: true,
    unicodeRange: 'U+0900-097F, U+1CD0-1CFF, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF',
    fallback: 'Arial Unicode MS, sans-serif',
    criticalCSS: false
  },
  
  // Marathi Support (uses Devanagari script)
  'Noto Sans Marathi': {
    fontFamily: 'Noto Sans Devanagari',
    fontDisplay: 'swap',
    preload: false,
    subset: true,
    unicodeRange: 'U+0900-097F',
    fallback: 'Arial Unicode MS, sans-serif',
    criticalCSS: false
  },
  
  // Tamil Support
  'Noto Sans Tamil': {
    fontFamily: 'Noto Sans Tamil',
    fontDisplay: 'swap',
    preload: false,
    subset: true,
    unicodeRange: 'U+0B82-0BFA',
    fallback: 'Arial Unicode MS, sans-serif',
    criticalCSS: false
  },
  
  // Telugu Support
  'Noto Sans Telugu': {
    fontFamily: 'Noto Sans Telugu',
    fontDisplay: 'swap',
    preload: false,
    subset: true,
    unicodeRange: 'U+0C00-0C7F',
    fallback: 'Arial Unicode MS, sans-serif',
    criticalCSS: false
  }
};

// Performance Targets
export const PERFORMANCE_TARGETS: PerformanceMetrics = {
  LCP_TARGET: 2500, // 2.5s
  CLS_TARGET: 0.05, // Improved from 0.1
  FCP_TARGET: 1800, // 1.8s
  FONT_LOAD_TARGET: 100 // 100ms
};

// Critical Font Loading Strategy
export class FontLoadingStrategy {
  private static instance: FontLoadingStrategy;
  private loadedFonts: Set<string> = new Set();
  private fontObserver?: FontFaceObserver;
  
  static getInstance(): FontLoadingStrategy {
    if (!FontLoadingStrategy.instance) {
      FontLoadingStrategy.instance = new FontLoadingStrategy();
    }
    return FontLoadingStrategy.instance;
  }
  
  /**
   * Generate preload links for critical fonts
   */
  generatePreloadLinks(): string[] {
    const preloadLinks: string[] = [];
    
    Object.entries(FONT_LOADING_CONFIG).forEach(([name, config]) => {
      if (config.preload) {
        const fontPath = this.getFontPath(name, config);
        preloadLinks.push(
          `<link rel="preload" href="${fontPath}" as="font" type="font/woff2" crossorigin="anonymous">`
        );
      }
    });
    
    return preloadLinks;
  }
  
  /**
   * Generate critical CSS for above-the-fold content
   */
  generateCriticalCSS(): string {
    const criticalCSS: string[] = [];
    
    Object.entries(FONT_LOADING_CONFIG).forEach(([name, config]) => {
      if (config.criticalCSS) {
        criticalCSS.push(`
          @font-face {
            font-family: "${config.fontFamily}";
            src: url("${this.getFontPath(name, config)}") format("woff2");
            font-display: ${config.fontDisplay};
            ${config.unicodeRange ? `unicode-range: ${config.unicodeRange};` : ''}
          }
        `);
      }
    });
    
    return criticalCSS.join('\n');
  }
  
  /**
   * Implement progressive font loading with fallbacks
   */
  async loadFontsProgressively(): Promise<void> {
    // Load critical fonts first
    const criticalFonts = Object.entries(FONT_LOADING_CONFIG)
      .filter(([, config]) => config.criticalCSS);
    
    for (const [name, config] of criticalFonts) {
      await this.loadFont(name, config);
    }
    
    // Load non-critical fonts with delay
    setTimeout(async () => {
      const nonCriticalFonts = Object.entries(FONT_LOADING_CONFIG)
        .filter(([, config]) => !config.criticalCSS);
      
      for (const [name, config] of nonCriticalFonts) {
        await this.loadFont(name, config);
      }
    }, 100);
  }
  
  /**
   * Load multilingual fonts on demand
   */
  async loadMultilingualFont(language: string): Promise<void> {
    const fontConfig = MULTILINGUAL_FONTS[`Noto Sans ${language}`];
    if (fontConfig && !this.loadedFonts.has(fontConfig.fontFamily)) {
      await this.loadFont(`Noto Sans ${language}`, fontConfig);
    }
  }
  
  /**
   * Monitor font loading performance
   */
  monitorFontPerformance(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('.woff')) {
            const loadTime = entry.responseEnd - entry.startTime;
            console.log(`Font loaded: ${entry.name} in ${loadTime}ms`);
            
            if (loadTime > PERFORMANCE_TARGETS.FONT_LOAD_TARGET) {
              console.warn(`Font load time exceeded target: ${loadTime}ms > ${PERFORMANCE_TARGETS.FONT_LOAD_TARGET}ms`);
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }
  
  /**
   * Generate font subset based on content analysis
   */
  generateFontSubset(content: string, language: string = 'en'): string {
    const uniqueChars = [...new Set(content)].sort();
    const unicodeRanges: string[] = [];
    
    uniqueChars.forEach(char => {
      const codePoint = char.codePointAt(0);
      if (codePoint) {
        unicodeRanges.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
      }
    });
    
    return unicodeRanges.join(', ');
  }
  
  /**
   * Implement FOUT/FOIT prevention
   */
  implementFallbackStrategy(): void {
    // Add CSS classes for font loading states
    document.documentElement.classList.add('fonts-loading');
    
    // Remove loading class when fonts are loaded
    Promise.all([
      this.loadFontsProgressively()
    ]).then(() => {
      document.documentElement.classList.remove('fonts-loading');
      document.documentElement.classList.add('fonts-loaded');
    });
  }
  
  private async loadFont(name: string, config: FontLoadingConfig): Promise<void> {
    try {
      const fontFace = new FontFace(
        config.fontFamily,
        `url("${this.getFontPath(name, config)}")`,
        {
          display: config.fontDisplay,
          unicodeRange: config.unicodeRange
        }
      );
      
      await fontFace.load();
      document.fonts.add(fontFace);
      this.loadedFonts.add(config.fontFamily);
      
    } catch (error) {
      console.error(`Failed to load font ${name}:`, error);
    }
  }
  
  private getFontPath(name: string, config: FontLoadingConfig): string {
    const cleanName = name.toLowerCase().replace(/\s+/g, '-');
    return `/fonts/${cleanName}/${cleanName}-regular.woff2`;
  }
}

// Font Face Observer polyfill interface
interface FontFaceObserver {
  load(): Promise<void>;
}

// Initialize font loading strategy
export const initializeFontLoading = (): void => {
  const strategy = FontLoadingStrategy.getInstance();
  
  // Start font loading process
  strategy.implementFallbackStrategy();
  strategy.monitorFontPerformance();
  
  // Load fonts based on network conditions
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType === '4g' || connection.effectiveType === 'wifi') {
      strategy.loadFontsProgressively();
    }
  } else {
    // Default to progressive loading
    strategy.loadFontsProgressively();
  }
};

// Export for use in Next.js/React applications
export const getFontPreloadLinks = (): string[] => {
  const strategy = FontLoadingStrategy.getInstance();
  return strategy.generatePreloadLinks();
};

export const getCriticalFontCSS = (): string => {
  const strategy = FontLoadingStrategy.getInstance();
  return strategy.generateCriticalCSS();
};