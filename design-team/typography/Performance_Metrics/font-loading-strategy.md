# CastMatch Font Loading & Performance Strategy v1.0

## Performance-First Typography Loading System

### CORE PERFORMANCE TARGETS

**Critical Metrics:**
- **Font Load Time**: < 100ms (Critical path fonts)
- **First Paint**: < 200ms (Text visible immediately)
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive**: < 3 seconds
- **Font Swap Duration**: < 100ms visible

**User Experience Targets:**
- **Reading Speed**: > 250 characters/minute
- **Comprehension Score**: > 80%
- **Mobile Performance**: > 90 Lighthouse score
- **Accessibility Score**: AAA (>90%)

---

## FONT STACK OPTIMIZATION

### Critical Path Fonts (Preload Priority)

#### Primary Font Stack
```css
/* Inter Variable - Body Text (Highest Priority) */
@font-face {
  font-family: 'Inter';
  src: url('./fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  font-stretch: 75% 125%;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* SF Pro Display - Headlines (High Priority) */
@font-face {
  font-family: 'SF Pro Display';
  src: url('./fonts/SF-Pro-Display-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* JetBrains Mono - Code/Technical (Medium Priority) */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('./fonts/JetBrains-Mono-Variable.woff2') format('woff2');
  font-weight: 100 800;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

### Fallback Strategy
```css
/* Comprehensive fallback system */
:root {
  --font-display: 'SF Pro Display', 'San Francisco', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  --font-fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Critical fallback styles */
.font-loading {
  font-family: var(--font-fallback);
  visibility: visible;
}

.font-loaded {
  font-family: var(--font-body);
}
```

---

## PRELOADING STRATEGY

### HTML Head Preload Links
```html
<!-- Critical path font preloading -->
<link rel="preload" 
      href="/fonts/Inter-Variable.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin="anonymous">

<link rel="preload" 
      href="/fonts/SF-Pro-Display-Variable.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin="anonymous">

<!-- Preconnect to font CDN (if using external fonts) -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
```

### Progressive Enhancement
```css
/* Initial invisible state prevents FOIT */
.fonts-loading body {
  visibility: hidden;
}

/* Show text with fallback when loading */
.fonts-loading .text-content {
  visibility: visible;
  font-family: var(--font-fallback);
}

/* Enhanced typography when fonts load */
.fonts-loaded .text-content {
  font-family: var(--font-body);
}
```

---

## FONT LOADING JAVASCRIPT

### Font Loading Detection
```javascript
// CastMatch Font Loading Manager
class FontLoadingManager {
  constructor() {
    this.criticalFonts = [
      { family: 'Inter', weight: '400' },
      { family: 'SF Pro Display', weight: '600' }
    ];
    this.loadingTimeout = 3000; // 3 second timeout
    this.init();
  }

  init() {
    // Add loading class
    document.documentElement.classList.add('fonts-loading');
    
    // Load critical fonts
    this.loadCriticalFonts();
    
    // Fallback timeout
    setTimeout(() => this.handleFallback(), this.loadingTimeout);
  }

  async loadCriticalFonts() {
    try {
      const fontPromises = this.criticalFonts.map(font => 
        new FontFace(font.family, `url(/fonts/${font.family.replace(' ', '-')}-Variable.woff2)`, {
          weight: font.weight,
          display: 'swap'
        }).load()
      );

      await Promise.all(fontPromises);
      this.handleFontsLoaded();
    } catch (error) {
      console.warn('Font loading failed, using fallbacks:', error);
      this.handleFallback();
    }
  }

  handleFontsLoaded() {
    document.documentElement.classList.remove('fonts-loading');
    document.documentElement.classList.add('fonts-loaded');
    
    // Performance mark
    if (window.performance && window.performance.mark) {
      window.performance.mark('fonts-loaded');
    }
    
    // Analytics tracking
    this.trackFontLoadingPerformance('success');
  }

  handleFallback() {
    document.documentElement.classList.remove('fonts-loading');
    document.documentElement.classList.add('fonts-fallback');
    
    // Analytics tracking
    this.trackFontLoadingPerformance('fallback');
  }

  trackFontLoadingPerformance(status) {
    if (window.gtag) {
      window.gtag('event', 'font_loading', {
        'status': status,
        'load_time': performance.now()
      });
    }
  }
}

// Initialize font loading
document.addEventListener('DOMContentLoaded', () => {
  new FontLoadingManager();
});
```

### Web Font Optimization
```javascript
// Font subset loading based on page content
class FontSubsetManager {
  constructor() {
    this.subsets = {
      latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
      devanagari: 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF',
      symbols: 'U+2190-21FF,U+2600-26FF,U+2700-27BF'
    };
  }

  loadRequiredSubsets() {
    const pageContent = document.body.textContent;
    const requiredSubsets = this.detectRequiredSubsets(pageContent);
    
    requiredSubsets.forEach(subset => {
      this.loadFontSubset(subset);
    });
  }

  detectRequiredSubsets(content) {
    const subsets = ['latin']; // Always load Latin
    
    // Check for Devanagari characters (Hindi/Marathi support)
    if (/[\u0900-\u097F]/.test(content)) {
      subsets.push('devanagari');
    }
    
    // Check for special symbols
    if (/[\u2190-\u21FF\u2600-\u26FF\u2700-\u27BF]/.test(content)) {
      subsets.push('symbols');
    }
    
    return subsets;
  }

  loadFontSubset(subset) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/fonts/subsets/${subset}.css`;
    document.head.appendChild(link);
  }
}
```

---

## PERFORMANCE MONITORING

### Core Web Vitals Tracking
```javascript
// Typography performance tracking
class TypographyPerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.init();
  }

  init() {
    this.trackFontLoadTime();
    this.trackCumulativeLayoutShift();
    this.trackFirstContentfulPaint();
  }

  trackFontLoadTime() {
    if (window.PerformanceObserver) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('font')) {
            this.metrics.fontLoadTime = entry.loadTime;
            this.reportMetric('font_load_time', entry.loadTime);
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  trackCumulativeLayoutShift() {
    if (window.PerformanceObserver) {
      const observer = new PerformanceObserver((list) => {
        let clsScore = 0;
        
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        
        this.metrics.cls = clsScore;
        this.reportMetric('cumulative_layout_shift', clsScore);
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }

  reportMetric(name, value) {
    // Report to analytics
    if (window.gtag) {
      window.gtag('event', 'typography_performance', {
        'metric_name': name,
        'metric_value': value
      });
    }

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Typography Metric - ${name}: ${value}`);
    }
  }
}

// Initialize monitoring
new TypographyPerformanceMonitor();
```

### Real User Monitoring
```javascript
// RUM for typography performance
function collectTypographyMetrics() {
  const metrics = {
    fontLoadTime: null,
    firstPaint: null,
    layoutStability: null,
    readabilityScore: null
  };

  // Font load time
  if (window.performance) {
    const fontEntries = performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes('.woff'));
    
    if (fontEntries.length > 0) {
      metrics.fontLoadTime = Math.max(...fontEntries.map(e => e.loadTime));
    }
  }

  // Readability assessment
  metrics.readabilityScore = assessReadability();

  return metrics;
}

function assessReadability() {
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span');
  let readabilityScore = 100;
  
  textElements.forEach(element => {
    const styles = getComputedStyle(element);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight) / fontSize;
    
    // Penalize small fonts
    if (fontSize < 16) readabilityScore -= 10;
    
    // Penalize poor line height
    if (lineHeight < 1.4 || lineHeight > 1.8) readabilityScore -= 5;
    
    // Check contrast ratio (simplified)
    const textColor = styles.color;
    const bgColor = styles.backgroundColor;
    // ... contrast calculation logic
  });
  
  return Math.max(0, readabilityScore);
}
```

---

## LOADING STATES & FALLBACKS

### CSS Loading States
```css
/* Loading state typography */
.loading-text {
  background: linear-gradient(90deg, 
    var(--color-semantic-dark-mode-background-tertiary) 25%, 
    var(--color-semantic-dark-mode-background-elevated) 50%, 
    var(--color-semantic-dark-mode-background-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: loading-shimmer 2s infinite;
  color: transparent;
  border-radius: 4px;
}

@keyframes loading-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Skeleton text blocks */
.skeleton-text {
  background: var(--color-semantic-dark-mode-background-tertiary);
  border-radius: 4px;
  animation: skeleton-pulse 1.5s ease-in-out infinite alternate;
}

.skeleton-text--line {
  height: 1.2em;
  margin-bottom: 0.6em;
}

.skeleton-text--heading {
  height: 1.5em;
  width: 60%;
  margin-bottom: 1em;
}

.skeleton-text--paragraph {
  height: 1em;
  margin-bottom: 0.5em;
}

.skeleton-text--paragraph:last-child {
  width: 80%;
}

@keyframes skeleton-pulse {
  from { opacity: 1; }
  to { opacity: 0.4; }
}
```

### Progressive Enhancement Strategy
```css
/* Base styles without custom fonts */
.no-js,
.fonts-loading {
  --font-display: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', Monaco, Consolas, monospace;
}

/* Enhanced styles with loaded fonts */
.fonts-loaded {
  --font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
}

/* Fallback with slight adjustments */
.fonts-fallback {
  --font-display: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  /* Slightly tighter spacing for fallback fonts */
  letter-spacing: -0.005em;
  line-height: calc(var(--base-line-height) + 0.05);
}
```

---

## MOBILE OPTIMIZATION

### Mobile Font Loading Strategy
```css
/* Mobile-first font loading */
@media (max-width: 768px) {
  /* Prioritize body text font on mobile */
  .fonts-loading .text-body-base,
  .fonts-loading .text-body-lg,
  .fonts-loading .text-body-sm {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    visibility: visible;
  }
  
  /* Load display fonts after critical content */
  .fonts-loaded .text-display-hero,
  .fonts-loaded .text-section-title {
    font-family: var(--font-display);
  }
}

/* Reduce font file sizes on slower connections */
@media (prefers-reduced-data: reduce) {
  /* Use system fonts only */
  :root {
    --font-display: -apple-system, BlinkMacSystemFont, sans-serif;
    --font-body: -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'SF Mono', Monaco, Consolas, monospace;
  }
}
```

### Connection-Based Loading
```javascript
// Adaptive font loading based on connection
class AdaptiveFontLoader {
  constructor() {
    this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    this.loadStrategy = this.determineLoadStrategy();
    this.init();
  }

  determineLoadStrategy() {
    if (!this.connection) return 'standard';
    
    // Slow connections - minimal fonts
    if (this.connection.effectiveType === 'slow-2g' || this.connection.effectiveType === '2g') {
      return 'minimal';
    }
    
    // Medium connections - progressive loading
    if (this.connection.effectiveType === '3g') {
      return 'progressive';
    }
    
    // Fast connections - full loading
    return 'full';
  }

  init() {
    switch (this.loadStrategy) {
      case 'minimal':
        this.loadMinimalFonts();
        break;
      case 'progressive':
        this.loadProgressiveFonts();
        break;
      case 'full':
        this.loadAllFonts();
        break;
      default:
        this.loadAllFonts();
    }
  }

  loadMinimalFonts() {
    // Load only critical body text font
    const bodyFont = new FontFace('Inter', 'url(/fonts/Inter-Regular.woff2)');
    bodyFont.load().then(() => {
      document.fonts.add(bodyFont);
      document.documentElement.classList.add('fonts-minimal');
    });
  }

  loadProgressiveFonts() {
    // Load body font first, then display font
    this.loadMinimalFonts();
    
    setTimeout(() => {
      const displayFont = new FontFace('SF Pro Display', 'url(/fonts/SF-Pro-Display-Semibold.woff2)');
      displayFont.load().then(() => {
        document.fonts.add(displayFont);
        document.documentElement.classList.add('fonts-progressive');
      });
    }, 1000);
  }

  loadAllFonts() {
    // Load all fonts as per standard strategy
    new FontLoadingManager();
  }
}

// Initialize adaptive loading
new AdaptiveFontLoader();
```

---

## PERFORMANCE BENCHMARKS

### Target Metrics
```javascript
const PERFORMANCE_TARGETS = {
  // Font loading
  fontLoadTime: 100, // ms
  firstTextPaint: 200, // ms
  
  // Layout stability
  cumulativeLayoutShift: 0.1,
  layoutStability: 95, // percentage
  
  // User experience
  readingSpeed: 250, // characters per minute
  comprehensionScore: 80, // percentage
  
  // Accessibility
  contrastRatio: 13, // minimum for body text
  fontSizeCompliance: 100, // percentage of text >= 16px
  
  // Mobile performance
  mobileLighthouseScore: 90,
  mobileLoadTime: 2000 // ms
};

// Performance validation
function validatePerformance(metrics) {
  const results = {};
  
  Object.keys(PERFORMANCE_TARGETS).forEach(key => {
    const target = PERFORMANCE_TARGETS[key];
    const actual = metrics[key];
    
    results[key] = {
      target,
      actual,
      passed: actual <= target, // or >= for positive metrics
      score: (actual / target) * 100
    };
  });
  
  return results;
}
```

### Monitoring Dashboard Data
```javascript
// Performance data collection for monitoring
const TypographyPerformanceCollector = {
  collect: () => ({
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    connection: navigator.connection?.effectiveType || 'unknown',
    fonts: {
      loaded: document.fonts.ready,
      available: [...document.fonts].map(f => f.family)
    },
    performance: collectTypographyMetrics(),
    accessibility: {
      contrastPassed: checkContrastRatios(),
      fontSizeCompliance: checkFontSizeCompliance(),
      readabilityScore: assessReadability()
    }
  }),

  report: (data) => {
    // Send to monitoring service
    fetch('/api/typography-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
};

// Collect and report every 30 seconds
setInterval(() => {
  const data = TypographyPerformanceCollector.collect();
  TypographyPerformanceCollector.report(data);
}, 30000);
```

This comprehensive font loading and performance strategy ensures that CastMatch's typography system loads efficiently while maintaining excellent user experience across all devices and network conditions.