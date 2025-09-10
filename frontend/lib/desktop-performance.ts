'use client'

import { useEffect, useState, useCallback } from 'react'

// Performance monitoring
export interface PerformanceMetrics {
  memoryUsage: number
  loadTime: number
  renderTime: number
  interactionDelay: number
  bundleSize: number
  fps: number
  errors: number
}

export interface BrowserInfo {
  name: string
  version: string
  engine: string
  platform: string
  features: {
    webGL: boolean
    indexedDB: boolean
    serviceWorker: boolean
    webAssembly: boolean
    webComponents: boolean
    intersectionObserver: boolean
    resizeObserver: boolean
  }
}

// Browser detection and compatibility
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent
  const platform = navigator.platform
  
  let browser = 'Unknown'
  let version = 'Unknown'
  let engine = 'Unknown'

  // Chrome
  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
    browser = 'Chrome'
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'
    engine = 'Blink'
  }
  // Firefox
  else if (ua.includes('Firefox')) {
    browser = 'Firefox'
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown'
    engine = 'Gecko'
  }
  // Safari
  else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari'
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown'
    engine = 'WebKit'
  }
  // Edge
  else if (ua.includes('Edg')) {
    browser = 'Edge'
    version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown'
    engine = 'Blink'
  }

  const features = {
    webGL: !!window.WebGLRenderingContext,
    indexedDB: !!window.indexedDB,
    serviceWorker: 'serviceWorker' in navigator,
    webAssembly: typeof WebAssembly === 'object',
    webComponents: 'customElements' in window,
    intersectionObserver: 'IntersectionObserver' in window,
    resizeObserver: 'ResizeObserver' in window
  }

  return { name: browser, version, engine, platform, features }
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
    interactionDelay: 0,
    bundleSize: 0,
    fps: 60,
    errors: 0
  })

  const [browserInfo] = useState<BrowserInfo>(getBrowserInfo)

  useEffect(() => {
    // Memory usage monitoring
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / (1024 * 1024))
        }))
      }
    }

    // FPS monitoring
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const measureFPS = (currentTime: number) => {
      frameCount++
      
      if (currentTime - lastTime >= 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }))
        
        frameCount = 0
        lastTime = currentTime
      }
      
      animationId = requestAnimationFrame(measureFPS)
    }

    // Load time measurement
    if ('navigation' in performance && 'timing' in performance) {
      const timing = performance.timing
      const loadTime = timing.loadEventEnd - timing.navigationStart
      setMetrics(prev => ({ ...prev, loadTime: Math.round(loadTime) }))
    }

    // Error tracking
    let errorCount = 0
    const errorHandler = () => {
      errorCount++
      setMetrics(prev => ({ ...prev, errors: errorCount }))
    }

    // Start monitoring
    const memoryInterval = setInterval(updateMemoryUsage, 5000)
    animationId = requestAnimationFrame(measureFPS)
    window.addEventListener('error', errorHandler)

    return () => {
      clearInterval(memoryInterval)
      cancelAnimationFrame(animationId)
      window.removeEventListener('error', errorHandler)
    }
  }, [])

  const measureInteractionDelay = useCallback(async () => {
    const start = performance.now()
    
    // Simulate a small task
    await new Promise(resolve => setTimeout(resolve, 0))
    
    const delay = performance.now() - start
    setMetrics(prev => ({ ...prev, interactionDelay: Math.round(delay) }))
    
    return delay
  }, [])

  return {
    metrics,
    browserInfo,
    measureInteractionDelay
  }
}

// Bundle size analyzer
export function useBundleAnalyzer() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number
    gzippedSize: number
    chunks: Array<{ name: string; size: number }>
  }>({
    totalSize: 0,
    gzippedSize: 0,
    chunks: []
  })

  useEffect(() => {
    // Estimate bundle size from resource timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      let totalSize = 0
      const chunks: Array<{ name: string; size: number }> = []

      resources.forEach(resource => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          const size = resource.transferSize || resource.encodedBodySize || 0
          totalSize += size
          
          const name = resource.name.split('/').pop() || 'unknown'
          chunks.push({ name, size })
        }
      })

      setBundleInfo({
        totalSize: Math.round(totalSize / 1024), // KB
        gzippedSize: Math.round(totalSize * 0.7 / 1024), // Estimate
        chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10)
      })
    }
  }, [])

  return bundleInfo
}

// Desktop-specific optimizations
export class DesktopOptimizer {
  private static instance: DesktopOptimizer
  private resizeObserver?: ResizeObserver
  private intersectionObserver?: IntersectionObserver
  private performanceObserver?: PerformanceObserver

  static getInstance(): DesktopOptimizer {
    if (!DesktopOptimizer.instance) {
      DesktopOptimizer.instance = new DesktopOptimizer()
    }
    return DesktopOptimizer.instance
  }

  // Lazy load images when they enter viewport
  lazyLoadImages() {
    if (!('IntersectionObserver' in window)) return

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          if (img.dataset.src) {
            img.src = img.dataset.src
            img.classList.remove('lazy')
            this.intersectionObserver?.unobserve(img)
          }
        }
      })
    }, { threshold: 0.1 })

    document.querySelectorAll('img[data-src]').forEach(img => {
      this.intersectionObserver?.observe(img)
    })
  }

  // Optimize table rendering for large datasets
  virtualizeTable(container: HTMLElement, itemHeight: number = 50) {
    if (!container) return

    const items = Array.from(container.children) as HTMLElement[]
    const containerHeight = container.clientHeight
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 // Buffer

    let scrollTop = 0
    let startIndex = 0
    let endIndex = Math.min(visibleCount, items.length)

    const updateVisibleItems = () => {
      startIndex = Math.floor(scrollTop / itemHeight)
      endIndex = Math.min(startIndex + visibleCount, items.length)

      items.forEach((item, index) => {
        if (index >= startIndex && index < endIndex) {
          item.style.display = ''
          item.style.transform = `translateY(${index * itemHeight}px)`
        } else {
          item.style.display = 'none'
        }
      })
    }

    container.addEventListener('scroll', (e) => {
      scrollTop = (e.target as HTMLElement).scrollTop
      requestAnimationFrame(updateVisibleItems)
    })

    updateVisibleItems()
  }

  // Debounce expensive operations
  debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // Throttle high-frequency events
  throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
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
  preloadCriticalResources(resources: string[]) {
    resources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      
      if (resource.endsWith('.js')) {
        link.as = 'script'
      } else if (resource.endsWith('.css')) {
        link.as = 'style'
      } else if (resource.match(/\.(jpg|jpeg|png|webp)$/)) {
        link.as = 'image'
      }
      
      document.head.appendChild(link)
    })
  }

  // Monitor and log performance metrics
  startPerformanceMonitoring() {
    if (!('PerformanceObserver' in window)) return

    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'measure') {
          console.log(`Performance: ${entry.name} took ${entry.duration}ms`)
        } else if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          console.log('Navigation Timing:', {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.navigationStart,
            loadComplete: nav.loadEventEnd - nav.navigationStart,
            firstPaint: nav.loadEventEnd - nav.fetchStart
          })
        }
      })
    })

    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] })
  }

  // Clean up observers
  cleanup() {
    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    this.performanceObserver?.disconnect()
  }
}

// React hook for desktop optimizations
export function useDesktopOptimizations() {
  const optimizer = DesktopOptimizer.getInstance()

  useEffect(() => {
    optimizer.startPerformanceMonitoring()
    optimizer.lazyLoadImages()

    return () => {
      optimizer.cleanup()
    }
  }, [optimizer])

  return {
    debounce: optimizer.debounce.bind(optimizer),
    throttle: optimizer.throttle.bind(optimizer),
    virtualizeTable: optimizer.virtualizeTable.bind(optimizer),
    preloadResources: optimizer.preloadCriticalResources.bind(optimizer)
  }
}

// Cross-browser compatibility checks
export function checkBrowserCompatibility(): {
  isSupported: boolean
  missingFeatures: string[]
  recommendations: string[]
} {
  const { features, name, version } = getBrowserInfo()
  const missingFeatures: string[] = []
  const recommendations: string[] = []

  // Check essential features
  if (!features.intersectionObserver) {
    missingFeatures.push('IntersectionObserver')
    recommendations.push('Update to a modern browser for better performance')
  }

  if (!features.resizeObserver) {
    missingFeatures.push('ResizeObserver')
  }

  if (!features.webComponents) {
    missingFeatures.push('Web Components')
  }

  // Browser-specific checks
  if (name === 'Chrome' && parseInt(version) < 80) {
    recommendations.push('Update Chrome to version 80 or later for optimal experience')
  }

  if (name === 'Firefox' && parseInt(version) < 75) {
    recommendations.push('Update Firefox to version 75 or later for optimal experience')
  }

  if (name === 'Safari' && parseInt(version) < 14) {
    recommendations.push('Update Safari to version 14 or later for optimal experience')
  }

  return {
    isSupported: missingFeatures.length < 3,
    missingFeatures,
    recommendations
  }
}