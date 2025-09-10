'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getBrowserInfo } from './desktop-performance'

// Performance optimization configuration
interface PerformanceConfig {
  enableVirtualization: boolean
  chunkSize: number
  debounceMs: number
  throttleMs: number
  preloadThreshold: number
  cacheSize: number
  enableServiceWorker: boolean
  enableImageOptimization: boolean
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableVirtualization: true,
  chunkSize: 50,
  debounceMs: 300,
  throttleMs: 100,
  preloadThreshold: 0.8,
  cacheSize: 100,
  enableServiceWorker: true,
  enableImageOptimization: true
}

// Performance monitoring and optimization service
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private config: PerformanceConfig
  private cache: Map<string, any> = new Map()
  private performanceObserver?: PerformanceObserver
  private intersectionObserver?: IntersectionObserver
  private resizeObserver?: ResizeObserver
  private mutationObserver?: MutationObserver

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeOptimizations()
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(config)
    }
    return PerformanceOptimizer.instance
  }

  private initializeOptimizations() {
    this.initializeImageOptimization()
    this.initializeServiceWorker()
    this.initializePerformanceMonitoring()
  }

  // Image optimization with lazy loading and format detection
  private initializeImageOptimization() {
    if (!this.config.enableImageOptimization) return

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          this.optimizeImage(img)
          this.intersectionObserver?.unobserve(img)
        }
      })
    }, { rootMargin: '50px' })

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.intersectionObserver?.observe(img)
    })
  }

  private optimizeImage(img: HTMLImageElement) {
    const originalSrc = img.dataset.src
    if (!originalSrc) return

    const browserInfo = getBrowserInfo()
    let optimizedSrc = originalSrc

    // Use WebP format for supported browsers
    if (browserInfo.features.webGL && originalSrc.includes('.jpg')) {
      optimizedSrc = originalSrc.replace('.jpg', '.webp')
    }

    // Add responsive image parameters based on viewport
    const devicePixelRatio = window.devicePixelRatio || 1
    const containerWidth = img.parentElement?.clientWidth || window.innerWidth
    const optimalWidth = Math.ceil(containerWidth * devicePixelRatio)

    // Load image with error fallback
    const tempImg = new Image()
    tempImg.onload = () => {
      img.src = optimizedSrc
      img.classList.add('loaded')
      img.classList.remove('loading')
    }
    tempImg.onerror = () => {
      img.src = originalSrc // Fallback to original
      img.classList.add('loaded')
      img.classList.remove('loading')
    }
    
    img.classList.add('loading')
    tempImg.src = optimizedSrc
  }

  // Service worker for caching and offline support
  private async initializeServiceWorker() {
    if (!this.config.enableServiceWorker || !('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, notify user
              this.notifyUpdate()
            }
          })
        }
      })
    } catch (error) {
      console.warn('Service Worker registration failed:', error)
    }
  }

  private notifyUpdate() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update Available', {
        body: 'A new version is available. Refresh to update.',
        icon: '/icons/icon-192.png'
      })
    }
  }

  // Performance monitoring with Web Vitals
  private initializePerformanceMonitoring() {
    if (!('PerformanceObserver' in window)) return

    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        this.processPerformanceEntry(entry)
      })
    })

    // Monitor Core Web Vitals
    try {
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'] 
      })
    } catch (error) {
      console.warn('Performance Observer failed:', error)
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        this.reportMetric('LCP', entry.startTime)
        break
      case 'first-input':
        this.reportMetric('FID', (entry as PerformanceEventTiming).processingStart - entry.startTime)
        break
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.reportMetric('CLS', (entry as any).value)
        }
        break
    }
  }

  private reportMetric(name: string, value: number) {
    // Send to analytics or logging service
    console.log(`Performance metric ${name}:`, value)
    
    // Store in cache for dashboard
    this.cache.set(`metric_${name}`, {
      value,
      timestamp: Date.now(),
      threshold: this.getThreshold(name)
    })
  }

  private getThreshold(metric: string): { good: number; poor: number } {
    switch (metric) {
      case 'LCP': return { good: 2500, poor: 4000 }
      case 'FID': return { good: 100, poor: 300 }
      case 'CLS': return { good: 0.1, poor: 0.25 }
      default: return { good: 0, poor: 0 }
    }
  }

  // Memory management and cleanup
  optimizeMemoryUsage() {
    // Clear old cache entries
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp && (now - value.timestamp) > maxAge) {
        this.cache.delete(key)
      }
    }

    // Limit cache size
    if (this.cache.size > this.config.cacheSize) {
      const entries = Array.from(this.cache.entries())
      const toDelete = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, entries.length - this.config.cacheSize)
      
      toDelete.forEach(([key]) => this.cache.delete(key))
    }

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
  }

  // Virtualization for large lists
  virtualizeList<T>(
    items: T[],
    containerHeight: number,
    itemHeight: number,
    scrollTop: number
  ): { visibleItems: T[]; startIndex: number; endIndex: number; spacerBefore: number; spacerAfter: number } {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(startIndex + visibleCount + 5, items.length) // +5 buffer
    
    const visibleItems = items.slice(startIndex, endIndex)
    const spacerBefore = startIndex * itemHeight
    const spacerAfter = (items.length - endIndex) * itemHeight

    return {
      visibleItems,
      startIndex,
      endIndex,
      spacerBefore,
      spacerAfter
    }
  }

  // Debounced function utility
  debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number = this.config.debounceMs
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // Throttled function utility
  throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number = this.config.throttleMs
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  // Preload critical resources
  preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font' = 'image'): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url
      link.as = type
      
      if (type === 'font') {
        link.crossOrigin = 'anonymous'
      }

      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`Failed to preload ${url}`))
      
      document.head.appendChild(link)
    })
  }

  // Bundle splitting and dynamic imports
  async loadModuleDynamically<T>(modulePath: string): Promise<T> {
    const cacheKey = `module_${modulePath}`
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const module = await import(modulePath)
      this.cache.set(cacheKey, module)
      return module
    } catch (error) {
      console.error(`Failed to load module ${modulePath}:`, error)
      throw error
    }
  }

  // Performance budget monitoring
  checkPerformanceBudget(): {
    budget: { [key: string]: number }
    actual: { [key: string]: number }
    violations: string[]
  } {
    const budget = {
      bundle: 250, // KB
      images: 500, // KB
      fonts: 100, // KB
      scripts: 200, // KB
      styles: 50 // KB
    }

    const actual: { [key: string]: number } = {}
    const violations: string[] = []

    if ('performance' in window) {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      entries.forEach(entry => {
        const size = (entry.transferSize || entry.encodedBodySize || 0) / 1024 // KB
        const type = this.getResourceType(entry.name)
        
        actual[type] = (actual[type] || 0) + size
      })

      // Check violations
      Object.keys(budget).forEach(type => {
        if (actual[type] && actual[type] > budget[type]) {
          violations.push(`${type}: ${actual[type].toFixed(2)}KB exceeds budget of ${budget[type]}KB`)
        }
      })
    }

    return { budget, actual, violations }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'scripts'
    if (url.includes('.css')) return 'styles'
    if (url.match(/\.(jpg|jpeg|png|webp|svg|gif)$/)) return 'images'
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'fonts'
    return 'bundle'
  }

  // Cross-browser compatibility fixes
  applyCompatibilityFixes() {
    const browserInfo = getBrowserInfo()

    // Polyfills for older browsers
    if (!browserInfo.features.intersectionObserver) {
      this.loadPolyfill('https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver')
    }

    if (!browserInfo.features.resizeObserver) {
      this.loadPolyfill('https://polyfill.io/v3/polyfill.min.js?features=ResizeObserver')
    }

    // Safari-specific fixes
    if (browserInfo.name === 'Safari') {
      this.applySafariFixes()
    }

    // Firefox-specific fixes
    if (browserInfo.name === 'Firefox') {
      this.applyFirefoxFixes()
    }

    // Edge-specific fixes
    if (browserInfo.name === 'Edge') {
      this.applyEdgeFixes()
    }
  }

  private async loadPolyfill(url: string) {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    document.head.appendChild(script)
  }

  private applySafariFixes() {
    // Fix for Safari's 100vh issue
    const fixViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    fixViewportHeight()
    window.addEventListener('resize', this.throttle(fixViewportHeight, 250))

    // Fix for Safari's scrolling performance
    document.body.style.WebkitOverflowScrolling = 'touch'
  }

  private applyFirefoxFixes() {
    // Firefox scrollbar styling
    document.documentElement.style.scrollbarWidth = 'thin'
    document.documentElement.style.scrollbarColor = '#888 #f1f1f1'
  }

  private applyEdgeFixes() {
    // Edge-specific CSS fixes
    document.documentElement.style.msOverflowStyle = '-ms-autohiding-scrollbar'
  }

  // Resource cleanup
  cleanup() {
    this.performanceObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    this.resizeObserver?.disconnect()
    this.mutationObserver?.disconnect()
    this.cache.clear()
  }

  // Get performance metrics for dashboard
  getMetrics() {
    const metrics: { [key: string]: any } = {}
    
    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith('metric_')) {
        const metricName = key.replace('metric_', '')
        metrics[metricName] = value
      }
    }

    return metrics
  }
}

// React hook for performance optimization
export function usePerformanceOptimizer(config?: Partial<PerformanceConfig>) {
  const optimizerRef = useRef<PerformanceOptimizer>()
  const [metrics, setMetrics] = useState<{ [key: string]: any }>({})

  useEffect(() => {
    optimizerRef.current = PerformanceOptimizer.getInstance(config)
    optimizerRef.current.applyCompatibilityFixes()

    // Update metrics periodically
    const interval = setInterval(() => {
      if (optimizerRef.current) {
        setMetrics(optimizerRef.current.getMetrics())
        optimizerRef.current.optimizeMemoryUsage()
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      optimizerRef.current?.cleanup()
    }
  }, [])

  const preloadResource = useCallback((url: string, type?: 'script' | 'style' | 'image' | 'font') => {
    return optimizerRef.current?.preloadResource(url, type)
  }, [])

  const debounce = useCallback(<T extends (...args: any[]) => void>(func: T, wait?: number) => {
    return optimizerRef.current?.debounce(func, wait)
  }, [])

  const throttle = useCallback(<T extends (...args: any[]) => void>(func: T, limit?: number) => {
    return optimizerRef.current?.throttle(func, limit)
  }, [])

  const virtualizeList = useCallback(<T>(
    items: T[],
    containerHeight: number,
    itemHeight: number,
    scrollTop: number
  ) => {
    return optimizerRef.current?.virtualizeList(items, containerHeight, itemHeight, scrollTop) || {
      visibleItems: items,
      startIndex: 0,
      endIndex: items.length,
      spacerBefore: 0,
      spacerAfter: 0
    }
  }, [])

  return {
    metrics,
    preloadResource,
    debounce,
    throttle,
    virtualizeList,
    checkBudget: () => optimizerRef.current?.checkPerformanceBudget()
  }
}

// Performance budget component
export function usePerformanceBudget() {
  const [budget, setBudget] = useState<any>(null)
  const optimizer = PerformanceOptimizer.getInstance()

  useEffect(() => {
    const updateBudget = () => {
      setBudget(optimizer.checkPerformanceBudget())
    }

    updateBudget()
    const interval = setInterval(updateBudget, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [optimizer])

  return budget
}