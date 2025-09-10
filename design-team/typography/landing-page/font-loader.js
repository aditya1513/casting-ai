/**
 * Font Loading Strategy for Landing Page
 * Optimized for Mumbai market with Hindi support
 * Performance target: <100ms font load time
 */

class FontLoader {
  constructor() {
    this.fonts = {
      primary: [
        {
          family: 'Inter Display',
          weight: '100 900',
          style: 'normal',
          src: '/fonts/InterDisplay-Variable.woff2',
          unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
          priority: 'high'
        },
        {
          family: 'Inter',
          weight: '100 900',
          style: 'normal',
          src: '/fonts/Inter-Variable.woff2',
          priority: 'high'
        }
      ],
      devanagari: [
        {
          family: 'Noto Sans Devanagari',
          weight: '100 900',
          style: 'normal',
          src: '/fonts/NotoSansDevanagari-Variable.woff2',
          unicodeRange: 'U+0900-097F, U+1CD0-1CFF, U+200C-200D, U+20B9, U+A8E0-A8FF',
          priority: 'medium'
        }
      ]
    };
    
    this.loadedFonts = new Set();
    this.fontLoadTimeout = 3000; // 3 seconds timeout
    this.metricsEndpoint = '/api/font-metrics';
  }
  
  /**
   * Initialize font loading with performance monitoring
   */
  async init() {
    const startTime = performance.now();
    
    try {
      // Detect user language preference
      const userLang = this.detectLanguage();
      
      // Load critical fonts first
      await this.loadCriticalFonts(userLang);
      
      // Load remaining fonts asynchronously
      this.loadSecondaryFonts(userLang);
      
      // Track performance metrics
      const loadTime = performance.now() - startTime;
      this.trackMetrics('font-load-complete', { loadTime, language: userLang });
      
      // Apply font-ready class to body
      document.body.classList.add('fonts-loaded');
      
      // Setup font swap fallback
      this.setupFontSwapFallback();
      
      console.log(`Fonts loaded in ${loadTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Font loading error:', error);
      this.applyFallbackFonts();
      this.trackMetrics('font-load-error', { error: error.message });
    }
  }
  
  /**
   * Detect user's language preference
   */
  detectLanguage() {
    // Check localStorage for saved preference
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) return savedLang;
    
    // Check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    
    // Check if Hindi is preferred
    if (browserLang.startsWith('hi')) {
      return 'hi';
    }
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam === 'hi') {
      return 'hi';
    }
    
    // Default to English
    return 'en';
  }
  
  /**
   * Load critical fonts with priority
   */
  async loadCriticalFonts(language) {
    const criticalFonts = [];
    
    // Always load primary Latin fonts
    criticalFonts.push(...this.fonts.primary.filter(f => f.priority === 'high'));
    
    // Load Devanagari fonts if Hindi is detected
    if (language === 'hi' || this.hasDevanagariContent()) {
      criticalFonts.push(...this.fonts.devanagari);
    }
    
    // Create FontFace objects and load them
    const fontPromises = criticalFonts.map(font => this.loadFont(font));
    
    // Use Promise.race with timeout for faster loading
    await Promise.race([
      Promise.all(fontPromises),
      this.timeout(this.fontLoadTimeout)
    ]);
  }
  
  /**
   * Load individual font
   */
  async loadFont(fontConfig) {
    const { family, weight, style, src, unicodeRange } = fontConfig;
    
    // Check if already loaded
    const fontKey = `${family}-${weight}`;
    if (this.loadedFonts.has(fontKey)) {
      return Promise.resolve();
    }
    
    try {
      // Create FontFace object
      const fontFace = new FontFace(
        family,
        `url(${src}) format('woff2')`,
        {
          weight,
          style,
          display: 'swap',
          unicodeRange
        }
      );
      
      // Load the font
      await fontFace.load();
      
      // Add to document
      document.fonts.add(fontFace);
      
      // Mark as loaded
      this.loadedFonts.add(fontKey);
      
      return fontFace;
      
    } catch (error) {
      console.warn(`Failed to load font ${family}:`, error);
      throw error;
    }
  }
  
  /**
   * Load secondary fonts asynchronously
   */
  loadSecondaryFonts(language) {
    // Load remaining font weights asynchronously
    requestIdleCallback(() => {
      const secondaryFonts = this.fonts.primary.filter(f => f.priority !== 'high');
      
      secondaryFonts.forEach(font => {
        this.loadFont(font).catch(error => {
          console.warn('Secondary font load failed:', error);
        });
      });
    });
  }
  
  /**
   * Check if page contains Devanagari content
   */
  hasDevanagariContent() {
    const devanagariRegex = /[\u0900-\u097F]/;
    const textContent = document.body.innerText || document.body.textContent;
    return devanagariRegex.test(textContent);
  }
  
  /**
   * Setup font swap fallback for slow connections
   */
  setupFontSwapFallback() {
    // Monitor font loading status
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        document.body.classList.add('fonts-ready');
      });
      
      // Add loading state classes
      document.fonts.addEventListener('loading', () => {
        document.body.classList.add('fonts-loading');
      });
      
      document.fonts.addEventListener('loadingdone', () => {
        document.body.classList.remove('fonts-loading');
        document.body.classList.add('fonts-loaded');
      });
    }
  }
  
  /**
   * Apply fallback fonts for failed loads
   */
  applyFallbackFonts() {
    document.body.classList.add('fonts-fallback');
    
    // Inject fallback CSS
    const fallbackStyles = `
      .fonts-fallback {
        --font-display-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --font-body-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --font-hindi-display: system-ui, sans-serif;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = fallbackStyles;
    document.head.appendChild(styleElement);
  }
  
  /**
   * Timeout promise helper
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Font loading timeout')), ms);
    });
  }
  
  /**
   * Track performance metrics
   */
  trackMetrics(event, data) {
    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', event, {
        event_category: 'Performance',
        event_label: 'Font Loading',
        value: Math.round(data.loadTime),
        ...data
      });
    }
    
    // Send to custom metrics endpoint
    if (navigator.sendBeacon) {
      const metrics = {
        event,
        timestamp: Date.now(),
        ...data,
        connection: navigator.connection ? navigator.connection.effectiveType : 'unknown',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
      
      navigator.sendBeacon(this.metricsEndpoint, JSON.stringify(metrics));
    }
  }
  
  /**
   * Preconnect to font CDN
   */
  static preconnect() {
    const links = [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
    ];
    
    links.forEach(link => {
      const linkElement = document.createElement('link');
      Object.assign(linkElement, link);
      document.head.appendChild(linkElement);
    });
  }
  
  /**
   * Preload critical font files
   */
  static preloadCriticalFonts() {
    const criticalFonts = [
      '/fonts/InterDisplay-Variable.woff2',
      '/fonts/Inter-Variable.woff2'
    ];
    
    criticalFonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = font;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
}

// Initialize font loader on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Preconnect to font sources
    FontLoader.preconnect();
    
    // Preload critical fonts
    FontLoader.preloadCriticalFonts();
    
    // Initialize font loader
    const fontLoader = new FontLoader();
    fontLoader.init();
  });
} else {
  // DOM already loaded
  FontLoader.preconnect();
  FontLoader.preloadCriticalFonts();
  const fontLoader = new FontLoader();
  fontLoader.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FontLoader;
}