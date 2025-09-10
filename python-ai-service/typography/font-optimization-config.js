/**
 * CastMatch Font Optimization Configuration
 * Production-Ready Font Loading and Performance Optimization
 */

const path = require('path');

// Font optimization configuration for build tools
export const FONT_OPTIMIZATION_CONFIG = {
  // Critical font preloading
  preloadFonts: [
    {
      family: 'Inter',
      style: 'normal',
      weight: '400',
      format: 'woff2',
      display: 'swap',
      preload: true,
      critical: true
    },
    {
      family: 'Inter',
      style: 'normal', 
      weight: '600',
      format: 'woff2',
      display: 'swap',
      preload: true,
      critical: true
    },
    {
      family: 'SF Pro Display',
      style: 'normal',
      weight: '700',
      format: 'woff2',
      display: 'swap',
      preload: true,
      critical: true
    }
  ],

  // Font subsetting configuration
  fontSubsets: {
    'Inter': {
      unicodeRanges: [
        'U+0020-007F', // Basic Latin
        'U+00A0-00FF', // Latin-1 Supplement
        'U+0100-017F'  // Latin Extended-A
      ],
      features: ['kern', 'liga'],
      weights: [300, 400, 500, 600, 700],
      styles: ['normal', 'italic']
    },
    'SF Pro Display': {
      unicodeRanges: [
        'U+0020-007F',
        'U+00A0-00FF'
      ],
      features: ['kern', 'liga'],
      weights: [400, 600, 700],
      styles: ['normal']
    },
    'JetBrains Mono': {
      unicodeRanges: [
        'U+0020-007F'
      ],
      features: ['kern'],
      weights: [400, 500],
      styles: ['normal']
    },
    'Noto Sans Devanagari': {
      unicodeRanges: [
        'U+0900-097F', // Devanagari
        'U+1CD0-1CFF', // Vedic Extensions
        'U+200C-200D', // Zero Width Non-Joiner/Joiner
        'U+20A8',      // Rupee Sign
        'U+20B9'       // Indian Rupee Sign
      ],
      features: ['kern', 'mark', 'mkmk'],
      weights: [400, 500, 600],
      styles: ['normal']
    }
  },

  // Font loading strategies
  loadingStrategies: {
    critical: {
      fonts: ['Inter-400', 'Inter-600', 'SF Pro Display-700'],
      strategy: 'preload',
      display: 'swap',
      timeout: 3000
    },
    important: {
      fonts: ['Inter-300', 'Inter-500', 'Inter-700'],
      strategy: 'load',
      display: 'swap',
      timeout: 5000
    },
    optional: {
      fonts: ['JetBrains Mono-400', 'Playlist Script-400'],
      strategy: 'lazy',
      display: 'optional',
      timeout: 1000
    },
    multilingual: {
      fonts: ['Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Telugu'],
      strategy: 'on-demand',
      display: 'swap',
      timeout: 3000
    }
  },

  // Performance budgets
  performanceBudgets: {
    totalFontSize: 150 * 1024,      // 150KB total
    criticalFontSize: 50 * 1024,     // 50KB critical fonts
    fontLoadTime: 100,               // 100ms target
    layoutShift: 0.05,               // CLS target
    renderBlockingTime: 50           // 50ms blocking time
  },

  // Build optimization settings
  buildOptimization: {
    compression: {
      woff2: true,
      woff: true,
      ttf: false
    },
    subsetting: {
      enabled: true,
      unicodeRangeOptimization: true,
      featureOptimization: true,
      glyphOptimization: true
    },
    minification: {
      enabled: true,
      removeUnusedGlyphs: true,
      optimizeOutlines: true,
      compressMetadata: true
    },
    caching: {
      enabled: true,
      maxAge: 31536000,  // 1 year
      immutableAssets: true,
      cdn: true
    }
  }
};

// Webpack font optimization plugin configuration
export const webpackFontOptimization = {
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash:8][ext]'
        },
        use: [
          {
            loader: 'font-optimization-loader',
            options: {
              subset: true,
              unicodeRange: 'auto',
              formats: ['woff2', 'woff'],
              compression: 'maximum'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new FontPreloadPlugin({
      fonts: FONT_OPTIMIZATION_CONFIG.preloadFonts.filter(f => f.critical),
      replaceCallback: (fontUrl) => {
        // Replace with CDN URL if available
        return fontUrl.replace('/fonts/', 'https://cdn.castmatch.com/fonts/');
      }
    })
  ]
};

// Next.js font optimization configuration
export const nextjsFontConfig = {
  // Font optimization for Next.js
  experimental: {
    fontLoaders: [
      {
        loader: '@next/font/google',
        options: {
          subsets: ['latin', 'latin-ext'],
          display: 'swap',
          preload: true,
          fallback: ['system-ui', 'arial']
        }
      }
    ]
  },
  
  // Custom font loading
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin'
          }
        ]
      }
    ];
  }
};

// Font loading service worker configuration
export const fontServiceWorkerConfig = `
// Font caching strategy for service worker
const FONT_CACHE_NAME = 'castmatch-fonts-v1';
const FONT_URLS = [
  '/fonts/inter/inter-v12-latin-regular.woff2',
  '/fonts/inter/inter-v12-latin-600.woff2',
  '/fonts/sf-pro-display/sf-pro-display-v1-latin-700.woff2'
];

// Install event - cache critical fonts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(FONT_CACHE_NAME).then((cache) => {
      return cache.addAll(FONT_URLS);
    })
  );
});

// Fetch event - serve fonts from cache with fallback
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          // Cache successful font responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(FONT_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Fallback to system font if font fetch fails
          return new Response('', { status: 200 });
        });
      })
    );
  }
});
`;

// Font monitoring and analytics
export const fontAnalyticsConfig = {
  // Font loading performance monitoring
  monitoring: {
    enabled: true,
    endpoints: {
      metrics: '/api/metrics/fonts',
      errors: '/api/errors/fonts'
    },
    events: [
      'font-load-start',
      'font-load-success',
      'font-load-error',
      'font-display-swap',
      'layout-shift'
    ]
  },
  
  // Real User Monitoring for fonts
  rum: {
    sampleRate: 0.1, // 10% of users
    trackCLS: true,
    trackFCP: true,
    trackLCP: true,
    fontMetrics: true
  }
};

// Font optimization utilities
export class FontOptimizationUtils {
  /**
   * Generate font-face declarations with optimization
   */
  static generateFontFace(fontConfig) {
    const { family, weight, style, format, display, unicodeRange } = fontConfig;
    
    return `
      @font-face {
        font-family: "${family}";
        font-style: ${style};
        font-weight: ${weight};
        font-display: ${display};
        src: url("fonts/${family.toLowerCase().replace(/\s+/g, '-')}/${family.toLowerCase().replace(/\s+/g, '-')}-${style}-${weight}.${format}") format("${format}");
        ${unicodeRange ? `unicode-range: ${unicodeRange};` : ''}
      }
    `;
  }
  
  /**
   * Calculate font loading budget
   */
  static calculateFontBudget(fonts) {
    let totalSize = 0;
    let criticalSize = 0;
    
    fonts.forEach(font => {
      const estimatedSize = this.estimateFontSize(font);
      totalSize += estimatedSize;
      
      if (font.critical) {
        criticalSize += estimatedSize;
      }
    });
    
    return {
      totalSize,
      criticalSize,
      budgetStatus: {
        total: totalSize <= FONT_OPTIMIZATION_CONFIG.performanceBudgets.totalFontSize,
        critical: criticalSize <= FONT_OPTIMIZATION_CONFIG.performanceBudgets.criticalFontSize
      }
    };
  }
  
  /**
   * Estimate font file size
   */
  static estimateFontSize(fontConfig) {
    const baseSize = 20 * 1024; // 20KB base
    const weightMultiplier = fontConfig.weight >= 700 ? 1.2 : 1.0;
    const subsetReduction = fontConfig.subset ? 0.6 : 1.0;
    
    return Math.floor(baseSize * weightMultiplier * subsetReduction);
  }
  
  /**
   * Generate preload links HTML
   */
  static generatePreloadHTML(fonts) {
    return fonts
      .filter(font => font.preload)
      .map(font => {
        const href = this.getFontUrl(font);
        return `<link rel="preload" href="${href}" as="font" type="font/${font.format}" crossorigin="anonymous">`;
      })
      .join('\n');
  }
  
  /**
   * Get optimized font URL
   */
  static getFontUrl(fontConfig) {
    const { family, style, weight, format } = fontConfig;
    const fileName = `${family.toLowerCase().replace(/\s+/g, '-')}-${style}-${weight}.${format}`;
    return `/fonts/${family.toLowerCase().replace(/\s+/g, '-')}/${fileName}`;
  }
}

// Performance monitoring class
export class FontPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Set();
  }
  
  /**
   * Start monitoring font loading performance
   */
  startMonitoring() {
    if ('PerformanceObserver' in window) {
      // Monitor font loading
      const fontObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.woff') || entry.name.includes('.ttf')) {
            this.trackFontLoad(entry);
          }
        }
      });
      
      fontObserver.observe({ entryTypes: ['resource'] });
      
      // Monitor layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            this.trackLayoutShift(entry);
          }
        }
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }
  
  /**
   * Track font loading metrics
   */
  trackFontLoad(entry) {
    const fontName = this.extractFontName(entry.name);
    const loadTime = entry.responseEnd - entry.startTime;
    
    this.metrics.set(`font-load-${fontName}`, {
      name: fontName,
      loadTime,
      size: entry.transferSize,
      timestamp: Date.now()
    });
    
    // Alert if font load time exceeds budget
    if (loadTime > FONT_OPTIMIZATION_CONFIG.performanceBudgets.fontLoadTime) {
      console.warn(`Font ${fontName} exceeded load time budget: ${loadTime}ms`);
    }
    
    this.notifyObservers('font-loaded', { fontName, loadTime, size: entry.transferSize });
  }
  
  /**
   * Track layout shift caused by font loading
   */
  trackLayoutShift(entry) {
    if (entry.value > FONT_OPTIMIZATION_CONFIG.performanceBudgets.layoutShift) {
      console.warn(`Layout shift detected: ${entry.value}`);
      this.notifyObservers('layout-shift', { value: entry.value });
    }
  }
  
  /**
   * Extract font name from URL
   */
  extractFontName(url) {
    const matches = url.match(/\/([^\/]+)\.(woff2?|ttf|eot)/);
    return matches ? matches[1] : 'unknown';
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
  
  /**
   * Subscribe to performance events
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  /**
   * Notify observers of performance events
   */
  notifyObservers(event, data) {
    this.observers.forEach(callback => callback(event, data));
  }
}

// Initialize font optimization
export const initializeFontOptimization = () => {
  const monitor = new FontPerformanceMonitor();
  monitor.startMonitoring();
  
  // Subscribe to metrics for analytics
  monitor.subscribe((event, data) => {
    if (fontAnalyticsConfig.monitoring.enabled) {
      fetch('/api/metrics/fonts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: Date.now() })
      });
    }
  });
  
  return monitor;
};

export default {
  FONT_OPTIMIZATION_CONFIG,
  webpackFontOptimization,
  nextjsFontConfig,
  fontServiceWorkerConfig,
  fontAnalyticsConfig,
  FontOptimizationUtils,
  FontPerformanceMonitor,
  initializeFontOptimization
};