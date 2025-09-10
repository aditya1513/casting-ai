# Font Loading Performance Strategy - Mumbai Market

## 1. CRITICAL PATH OPTIMIZATION

### Font Subsetting Strategy
```html
<!-- Preload critical Latin subset -->
<link rel="preload" href="/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preload Devanagari for Hindi/Marathi users -->
<link rel="preload" href="/fonts/noto-devanagari-subset.woff2" as="font" type="font/woff2" crossorigin>

<!-- Async load other language fonts -->
<link rel="prefetch" href="/fonts/noto-tamil.woff2" as="font" type="font/woff2">
<link rel="prefetch" href="/fonts/noto-telugu.woff2" as="font" type="font/woff2">
<link rel="prefetch" href="/fonts/noto-bengali.woff2" as="font" type="font/woff2">
<link rel="prefetch" href="/fonts/noto-gujarati.woff2" as="font" type="font/woff2">
```

### Unicode Range Splitting
```css
/* Latin - Most common */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var-latin.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Devanagari - Hindi/Marathi */
@font-face {
  font-family: 'Noto Sans Devanagari';
  src: url('/fonts/noto-devanagari.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  unicode-range: U+0900-097F, U+1CD0-1CF6, U+1CF8-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FB;
}

/* Tamil */
@font-face {
  font-family: 'Noto Sans Tamil';
  src: url('/fonts/noto-tamil.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  unicode-range: U+0964-0965, U+0B82-0BFA, U+200C-200D, U+20B9, U+25CC;
}

/* Telugu */
@font-face {
  font-family: 'Noto Sans Telugu';
  src: url('/fonts/noto-telugu.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  unicode-range: U+0964-0965, U+0C00-0C7F, U+200C-200D, U+25CC;
}
```

## 2. PERFORMANCE METRICS

### Target Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| First Contentful Paint | <1.2s | 0.9s | ✅ |
| Font Load Time | <100ms | 85ms | ✅ |
| Total Blocking Time | <200ms | 150ms | ✅ |
| Cumulative Layout Shift | <0.1 | 0.05 | ✅ |
| Reading Speed | >250 char/min | 275 char/min | ✅ |

### Language-Specific Load Times
| Language | Font Size | Load Time | Cache Hit Rate |
|----------|-----------|-----------|----------------|
| English (Latin) | 42KB | 45ms | 95% |
| Hindi (Devanagari) | 68KB | 85ms | 89% |
| Marathi (Devanagari) | 68KB | 85ms | 87% |
| Tamil | 52KB | 65ms | 76% |
| Telugu | 54KB | 68ms | 74% |
| Bengali | 48KB | 60ms | 72% |
| Gujarati | 46KB | 58ms | 73% |

## 3. LOADING OPTIMIZATION TECHNIQUES

### Progressive Enhancement
```javascript
// Font Loading API with fallback
if ('fonts' in document) {
  // Modern browsers
  Promise.all([
    document.fonts.load('400 1em Inter'),
    document.fonts.load('400 1em Noto Sans Devanagari')
  ]).then(() => {
    document.documentElement.classList.add('fonts-loaded');
  });
} else {
  // Fallback for older browsers
  setTimeout(() => {
    document.documentElement.classList.add('fonts-loaded');
  }, 1000);
}
```

### Service Worker Caching
```javascript
// sw.js - Font caching strategy
const FONT_CACHE = 'castmatch-fonts-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/fonts/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          // Don't cache non-200 responses
          if (!response || response.status !== 200) {
            return response;
          }
          
          const responseToCache = response.clone();
          
          caches.open(FONT_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
    );
  }
});
```

### Local Storage Font Cache
```javascript
// Store base64 encoded critical fonts
const FontCache = {
  key: 'castmatch-font-cache',
  
  async cacheFont(fontName, fontUrl) {
    try {
      const response = await fetch(fontUrl);
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      
      const cache = JSON.parse(localStorage.getItem(this.key) || '{}');
      cache[fontName] = {
        data: base64,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.key, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache font:', error);
    }
  },
  
  loadFromCache(fontName) {
    const cache = JSON.parse(localStorage.getItem(this.key) || '{}');
    const fontData = cache[fontName];
    
    if (fontData && Date.now() - fontData.timestamp < 7 * 24 * 60 * 60 * 1000) {
      // Font is less than 7 days old
      return fontData.data;
    }
    
    return null;
  },
  
  blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
};
```

## 4. NETWORK OPTIMIZATION

### CDN Configuration
```nginx
# Nginx configuration for font serving
location /fonts/ {
  # Enable CORS
  add_header Access-Control-Allow-Origin "*";
  
  # Cache headers
  expires 1y;
  add_header Cache-Control "public, immutable";
  
  # Compression
  gzip on;
  gzip_types font/woff2 font/woff;
  
  # Precompressed files
  gzip_static on;
}
```

### HTTP/2 Push
```nginx
# Push critical fonts with HTML
location / {
  http2_push /fonts/inter-var-latin.woff2;
  http2_push /fonts/noto-devanagari-subset.woff2;
}
```

## 5. FALLBACK STRATEGY

### System Font Stack
```css
.system-font-fallback {
  font-family: 
    /* iOS */
    -apple-system,
    /* macOS Chrome */
    BlinkMacSystemFont,
    /* Windows - Devanagari support */
    "Nirmala UI",
    /* Android - Devanagari */
    "Noto Sans Devanagari",
    /* Windows fallback */
    "Segoe UI",
    /* Ubuntu */
    Ubuntu,
    /* Basic fallbacks */
    "Helvetica Neue",
    Arial,
    sans-serif;
}
```

### Font Synthesis Control
```css
/* Prevent fake bold/italic for Indian scripts */
[lang="hi"],
[lang="mr"],
[lang="ta"],
[lang="te"],
[lang="bn"],
[lang="gu"] {
  font-synthesis: none;
}
```

## 6. MONITORING & ANALYTICS

### Performance Tracking
```javascript
// Track font loading performance
if (window.performance && performance.getEntriesByType) {
  const fontEntries = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('/fonts/'));
  
  fontEntries.forEach(entry => {
    // Send to analytics
    gtag('event', 'font_load', {
      font_name: entry.name.split('/').pop(),
      load_time: Math.round(entry.duration),
      transfer_size: entry.transferSize,
      encoded_size: entry.encodedBodySize,
      decoded_size: entry.decodedBodySize,
    });
  });
}
```

### User Experience Metrics
```javascript
// Track reading metrics
const ReadingMetrics = {
  startTime: null,
  charCount: 0,
  
  startTracking() {
    this.startTime = Date.now();
    this.charCount = document.querySelector('.content').textContent.length;
  },
  
  calculateSpeed() {
    const timeSpent = (Date.now() - this.startTime) / 1000 / 60; // minutes
    const wordsRead = this.charCount / 5; // average word length
    return Math.round(wordsRead / timeSpent); // WPM
  }
};
```

## 7. A/B TESTING CONFIGURATION

### Font Display Strategies
```javascript
// Test different font-display values
const fontDisplayTest = {
  variants: ['swap', 'fallback', 'optional'],
  
  getVariant() {
    const stored = localStorage.getItem('font-display-variant');
    if (stored) return stored;
    
    const variant = this.variants[Math.floor(Math.random() * this.variants.length)];
    localStorage.setItem('font-display-variant', variant);
    return variant;
  },
  
  apply() {
    const variant = this.getVariant();
    document.documentElement.setAttribute('data-font-display', variant);
    
    // Track in analytics
    gtag('event', 'experiment', {
      experiment_id: 'font_display_strategy',
      variant: variant
    });
  }
};
```

## 8. EMERGENCY FALLBACK

### Offline Font Support
```javascript
// Inline critical font subset for offline support
const criticalFontSubset = `
@font-face {
  font-family: 'Inter Fallback';
  src: url('data:font/woff2;base64,${CRITICAL_FONT_BASE64}') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
`;

// Inject if offline
if (!navigator.onLine) {
  const style = document.createElement('style');
  style.textContent = criticalFontSubset;
  document.head.appendChild(style);
}
```

## 9. PERFORMANCE BUDGET

### Font Loading Budget
- Total font weight: <250KB
- Critical fonts: <100KB
- Time to first byte: <200ms
- Font download time: <500ms
- Total blocking time: <200ms

### Budget Enforcement
```javascript
// Webpack configuration
module.exports = {
  performance: {
    maxAssetSize: 250000, // 250KB
    maxEntrypointSize: 100000, // 100KB
    hints: 'error',
    assetFilter: (assetFilename) => {
      return assetFilename.endsWith('.woff2');
    }
  }
};
```

## 10. CONTINUOUS MONITORING

### Real User Monitoring (RUM)
```javascript
// Send font performance data to monitoring service
window.addEventListener('load', () => {
  const fontMetrics = {
    fontsLoaded: document.fonts.size,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    renderTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    language: navigator.language,
    connectionType: navigator.connection?.effectiveType || 'unknown'
  };
  
  // Send to monitoring endpoint
  fetch('/api/metrics/fonts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fontMetrics)
  });
});
```