/**
 * CastMatch Motion Performance Configuration
 * Optimization settings for 60fps animations
 * Performance monitoring and adaptive quality
 */

class PerformanceOptimizer {
  constructor() {
    this.config = {
      targetFPS: 60,
      minFPS: 30,
      frameTime: 16.67, // ms for 60fps
      maxFrameTime: 33.33, // ms for 30fps
      
      // Performance thresholds
      thresholds: {
        high: { fps: 55, cpu: 30, memory: 100 },
        medium: { fps: 45, cpu: 50, memory: 200 },
        low: { fps: 30, cpu: 70, memory: 300 }
      },
      
      // Quality levels
      quality: {
        ultra: {
          blurAmount: 32,
          particleCount: 100,
          shadowQuality: 'high',
          animationComplexity: 'full',
          enableGPU: true
        },
        high: {
          blurAmount: 20,
          particleCount: 50,
          shadowQuality: 'medium',
          animationComplexity: 'standard',
          enableGPU: true
        },
        medium: {
          blurAmount: 10,
          particleCount: 25,
          shadowQuality: 'low',
          animationComplexity: 'reduced',
          enableGPU: true
        },
        low: {
          blurAmount: 0,
          particleCount: 0,
          shadowQuality: 'none',
          animationComplexity: 'minimal',
          enableGPU: false
        }
      }
    };
    
    this.metrics = {
      fps: 60,
      frameDrops: 0,
      jankRate: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      renderTime: 0,
      paintTime: 0,
      scriptTime: 0
    };
    
    this.currentQuality = 'high';
    this.adaptiveQuality = true;
    this.performanceObserver = null;
    this.rafId = null;
    
    this.init();
  }
  
  init() {
    this.detectCapabilities();
    this.setupPerformanceObserver();
    this.startMonitoring();
    this.applyOptimizations();
    this.setupEventListeners();
  }
  
  // ========================
  // CAPABILITY DETECTION
  // ========================
  
  detectCapabilities() {
    this.capabilities = {
      gpu: this.detectGPU(),
      cpu: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4,
      connection: this.detectConnection(),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1
      },
      browser: this.detectBrowser(),
      features: {
        willChange: CSS.supports('will-change', 'transform'),
        backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
        webGL: this.detectWebGL(),
        intersectionObserver: 'IntersectionObserver' in window,
        requestIdleCallback: 'requestIdleCallback' in window,
        webAnimationsAPI: 'animate' in Element.prototype
      }
    };
    
    // Determine initial quality based on capabilities
    this.currentQuality = this.determineQuality();
  }
  
  detectGPU() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return { vendor: 'unknown', renderer: 'unknown' };
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { vendor: 'unknown', renderer: 'unknown' };
    
    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    };
  }
  
  detectConnection() {
    const connection = navigator.connection || 
                      navigator.mozConnection || 
                      navigator.webkitConnection;
    
    if (!connection) return { type: 'unknown', speed: 'unknown' };
    
    return {
      type: connection.effectiveType || 'unknown',
      speed: connection.downlink || 'unknown',
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };
  }
  
  detectBrowser() {
    const ua = navigator.userAgent;
    let browser = 'unknown';
    
    if (ua.indexOf('Chrome') > -1) browser = 'chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'firefox';
    else if (ua.indexOf('Edge') > -1) browser = 'edge';
    
    return browser;
  }
  
  detectWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
               (canvas.getContext('webgl') || 
                canvas.getContext('experimental-webgl')));
    } catch(e) {
      return false;
    }
  }
  
  determineQuality() {
    const { cpu, memory, connection } = this.capabilities;
    
    // Ultra quality for high-end devices
    if (cpu >= 8 && memory >= 8 && connection.type === '4g') {
      return 'ultra';
    }
    
    // High quality for good devices
    if (cpu >= 4 && memory >= 4) {
      return 'high';
    }
    
    // Medium quality for average devices
    if (cpu >= 2 && memory >= 2) {
      return 'medium';
    }
    
    // Low quality for low-end devices
    return 'low';
  }
  
  // ========================
  // PERFORMANCE MONITORING
  // ========================
  
  setupPerformanceObserver() {
    if (!window.PerformanceObserver) return;
    
    try {
      // Monitor long tasks
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.metrics.jankRate++;
            console.warn(`Long task detected: ${entry.duration}ms`);
          }
        }
      });
      
      this.performanceObserver.observe({ entryTypes: ['longtask'] });
      
      // Monitor paint timing
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.paintTime = entry.startTime;
          }
        }
      });
      
      paintObserver.observe({ entryTypes: ['paint'] });
      
    } catch (e) {
      console.warn('Performance Observer not supported:', e);
    }
  }
  
  startMonitoring() {
    let lastTime = performance.now();
    let frames = 0;
    
    const measureFPS = (currentTime) => {
      frames++;
      
      if (currentTime >= lastTime + 1000) {
        this.metrics.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        // Check if we need to adjust quality
        if (this.adaptiveQuality) {
          this.adjustQuality();
        }
        
        // Update performance dashboard
        this.updateDashboard();
      }
      
      // Measure frame time
      const frameTime = currentTime - lastTime;
      if (frameTime > this.config.frameTime * 1.5) {
        this.metrics.frameDrops++;
      }
      
      this.rafId = requestAnimationFrame(measureFPS);
    };
    
    this.rafId = requestAnimationFrame(measureFPS);
  }
  
  adjustQuality() {
    const { fps, jankRate, cpuUsage } = this.metrics;
    const { thresholds } = this.config;
    
    let newQuality = this.currentQuality;
    
    // Downgrade quality if performance is poor
    if (fps < thresholds.low.fps || jankRate > 10 || cpuUsage > thresholds.low.cpu) {
      if (this.currentQuality === 'ultra') newQuality = 'high';
      else if (this.currentQuality === 'high') newQuality = 'medium';
      else if (this.currentQuality === 'medium') newQuality = 'low';
    }
    
    // Upgrade quality if performance is good
    else if (fps > thresholds.high.fps && jankRate < 2 && cpuUsage < thresholds.high.cpu) {
      if (this.currentQuality === 'low') newQuality = 'medium';
      else if (this.currentQuality === 'medium') newQuality = 'high';
      else if (this.currentQuality === 'high' && this.capabilities.cpu >= 8) {
        newQuality = 'ultra';
      }
    }
    
    if (newQuality !== this.currentQuality) {
      this.currentQuality = newQuality;
      this.applyQualitySettings(newQuality);
      console.log(`Performance: Quality adjusted to ${newQuality}`);
    }
  }
  
  // ========================
  // OPTIMIZATION TECHNIQUES
  // ========================
  
  applyOptimizations() {
    // GPU Acceleration
    this.enableGPUAcceleration();
    
    // Layer Management
    this.optimizeLayers();
    
    // Animation Batching
    this.setupAnimationBatching();
    
    // Intersection Observer for lazy animations
    this.setupLazyAnimations();
    
    // Debounce and throttle expensive operations
    this.optimizeEventHandlers();
    
    // Memory management
    this.setupMemoryManagement();
  }
  
  enableGPUAcceleration() {
    // Add GPU acceleration to animated elements
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    animatedElements.forEach(el => {
      el.style.willChange = 'transform, opacity';
      el.style.transform = 'translateZ(0)';
      el.style.backfaceVisibility = 'hidden';
      el.style.perspective = '1000px';
    });
  }
  
  optimizeLayers() {
    // Promote elements to their own layer
    const layerElements = document.querySelectorAll('.promote-layer');
    
    layerElements.forEach(el => {
      el.style.transform = 'translateZ(0)';
      el.style.willChange = 'transform';
    });
    
    // Clean up will-change after animations
    const cleanupWillChange = (el) => {
      el.addEventListener('animationend', () => {
        el.style.willChange = 'auto';
      }, { once: true });
    };
    
    document.querySelectorAll('[data-animate]').forEach(cleanupWillChange);
  }
  
  setupAnimationBatching() {
    const animationQueue = [];
    let rafScheduled = false;
    
    const processQueue = () => {
      animationQueue.forEach(fn => fn());
      animationQueue.length = 0;
      rafScheduled = false;
    };
    
    window.batchAnimation = (fn) => {
      animationQueue.push(fn);
      
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(processQueue);
      }
    };
  }
  
  setupLazyAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('animate');
          observer.unobserve(el);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    document.querySelectorAll('[data-lazy-animate]').forEach(el => {
      observer.observe(el);
    });
  }
  
  optimizeEventHandlers() {
    // Throttle scroll events
    let scrollTicking = false;
    const handleScroll = () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          // Handle scroll animations
          document.dispatchEvent(new CustomEvent('optimizedScroll'));
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Debounce resize events
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        document.dispatchEvent(new CustomEvent('optimizedResize'));
      }, 250);
    };
    
    window.addEventListener('resize', handleResize);
  }
  
  setupMemoryManagement() {
    // Clean up completed animations
    const cleanupAnimations = () => {
      const animations = document.getAnimations();
      animations.forEach(animation => {
        if (animation.playState === 'finished') {
          animation.cancel();
        }
      });
    };
    
    // Run cleanup periodically
    setInterval(cleanupAnimations, 30000);
    
    // Clean up on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cleanupAnimations();
      }
    });
  }
  
  // ========================
  // QUALITY SETTINGS
  // ========================
  
  applyQualitySettings(quality) {
    const settings = this.config.quality[quality];
    const root = document.documentElement;
    
    // Update CSS variables
    root.style.setProperty('--blur-amount', `${settings.blurAmount}px`);
    root.style.setProperty('--particle-count', settings.particleCount);
    
    // Toggle quality classes
    document.body.className = document.body.className
      .replace(/quality-\w+/g, '')
      .trim() + ` quality-${quality}`;
    
    // Update shadow quality
    this.updateShadowQuality(settings.shadowQuality);
    
    // Update animation complexity
    this.updateAnimationComplexity(settings.animationComplexity);
    
    // Toggle GPU acceleration
    if (!settings.enableGPU) {
      this.disableGPUAcceleration();
    } else {
      this.enableGPUAcceleration();
    }
  }
  
  updateShadowQuality(quality) {
    const shadowMap = {
      high: '0 10px 30px rgba(0,0,0,0.2)',
      medium: '0 5px 15px rgba(0,0,0,0.15)',
      low: '0 2px 8px rgba(0,0,0,0.1)',
      none: 'none'
    };
    
    document.documentElement.style.setProperty('--shadow-quality', shadowMap[quality]);
  }
  
  updateAnimationComplexity(complexity) {
    const complexityMap = {
      full: { duration: 1, stagger: 1 },
      standard: { duration: 0.8, stagger: 0.8 },
      reduced: { duration: 0.5, stagger: 0.5 },
      minimal: { duration: 0.2, stagger: 0 }
    };
    
    const settings = complexityMap[complexity];
    document.documentElement.style.setProperty('--animation-multiplier', settings.duration);
    document.documentElement.style.setProperty('--stagger-multiplier', settings.stagger);
  }
  
  disableGPUAcceleration() {
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.willChange = 'auto';
      el.style.transform = 'none';
    });
  }
  
  // ========================
  // PERFORMANCE DASHBOARD
  // ========================
  
  updateDashboard() {
    const dashboard = document.getElementById('performance-dashboard');
    if (!dashboard) return;
    
    dashboard.innerHTML = `
      <div class="perf-metrics">
        <div class="metric">
          <span class="label">FPS:</span>
          <span class="value ${this.metrics.fps < 30 ? 'warning' : ''}">${this.metrics.fps}</span>
        </div>
        <div class="metric">
          <span class="label">Quality:</span>
          <span class="value">${this.currentQuality}</span>
        </div>
        <div class="metric">
          <span class="label">Frame Drops:</span>
          <span class="value">${this.metrics.frameDrops}</span>
        </div>
        <div class="metric">
          <span class="label">Jank Rate:</span>
          <span class="value">${this.metrics.jankRate}</span>
        </div>
      </div>
    `;
  }
  
  // ========================
  // EVENT LISTENERS
  // ========================
  
  setupEventListeners() {
    // Toggle adaptive quality
    document.addEventListener('toggleAdaptiveQuality', (e) => {
      this.adaptiveQuality = e.detail.enabled;
    });
    
    // Manual quality change
    document.addEventListener('setQuality', (e) => {
      this.currentQuality = e.detail.quality;
      this.applyQualitySettings(e.detail.quality);
    });
    
    // Performance report
    document.addEventListener('requestPerformanceReport', () => {
      this.generateReport();
    });
  }
  
  // ========================
  // REPORTING
  // ========================
  
  generateReport() {
    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      capabilities: this.capabilities,
      currentQuality: this.currentQuality,
      recommendations: this.getRecommendations()
    };
  }
  
  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.fps < 30) {
      recommendations.push('Consider reducing animation complexity');
    }
    
    if (this.metrics.jankRate > 5) {
      recommendations.push('Optimize JavaScript execution');
    }
    
    if (this.metrics.frameDrops > 10) {
      recommendations.push('Reduce concurrent animations');
    }
    
    if (!this.capabilities.features.backdropFilter) {
      recommendations.push('Provide fallback for backdrop-filter');
    }
    
    return recommendations;
  }
  
  // Cleanup
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceOptimizer;
}