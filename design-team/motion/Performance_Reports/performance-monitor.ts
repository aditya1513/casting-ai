/**
 * Animation Performance Monitoring System
 * Real-time performance tracking and optimization suggestions
 */

interface PerformanceMetrics {
  fps: number
  averageFps: number
  frameDrops: number
  animationDuration: number
  cpuUsage: number
  memoryUsage: number
  timestamp: number
}

interface AnimationProfile {
  id: string
  name: string
  component: string
  startTime: number
  endTime?: number
  metrics: PerformanceMetrics[]
  warnings: string[]
  suggestions: string[]
}

export class AnimationPerformanceMonitor {
  private profiles: Map<string, AnimationProfile> = new Map()
  private isMonitoring = false
  private frameCount = 0
  private lastTime = 0
  private frameDrops = 0
  private fpsHistory: number[] = []
  private animationFrame?: number
  private memoryObserver?: PerformanceObserver

  constructor() {
    this.setupMemoryObserver()
  }

  private setupMemoryObserver() {
    if ('performance' in window && 'PerformanceObserver' in window) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          // Process memory usage entries
          entries.forEach((entry) => {
            if (entry.name === 'memory') {
              this.recordMemoryUsage(entry as any)
            }
          })
        })
        
        this.memoryObserver.observe({ entryTypes: ['measure', 'navigation'] })
      } catch (e) {
        console.warn('Performance Observer not supported:', e)
      }
    }
  }

  startProfiling(id: string, name: string, component: string) {
    const profile: AnimationProfile = {
      id,
      name,
      component,
      startTime: performance.now(),
      metrics: [],
      warnings: [],
      suggestions: []
    }
    
    this.profiles.set(id, profile)
    
    if (!this.isMonitoring) {
      this.startMonitoring()
    }
    
    return id
  }

  stopProfiling(id: string) {
    const profile = this.profiles.get(id)
    if (profile) {
      profile.endTime = performance.now()
      this.analyzeProfile(profile)
      
      // If no more active profiles, stop monitoring
      const activeProfiles = Array.from(this.profiles.values()).filter(p => !p.endTime)
      if (activeProfiles.length === 0) {
        this.stopMonitoring()
      }
    }
  }

  private startMonitoring() {
    this.isMonitoring = true
    this.frameCount = 0
    this.lastTime = performance.now()
    this.measureFrame()
  }

  private stopMonitoring() {
    this.isMonitoring = false
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
  }

  private measureFrame = () => {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    this.frameCount++

    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      this.fpsHistory.push(fps)
      
      // Keep only last 10 seconds of FPS data
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift()
      }

      // Detect frame drops (FPS below 45)
      if (fps < 45) {
        this.frameDrops++
      }

      // Update active profiles
      this.updateActiveProfiles(fps)

      this.frameCount = 0
      this.lastTime = currentTime
    }

    this.animationFrame = requestAnimationFrame(this.measureFrame)
  }

  private updateActiveProfiles(currentFps: number) {
    const activeProfiles = Array.from(this.profiles.values()).filter(p => !p.endTime)
    const averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length

    activeProfiles.forEach(profile => {
      const metrics: PerformanceMetrics = {
        fps: currentFps,
        averageFps: Math.round(averageFps),
        frameDrops: this.frameDrops,
        animationDuration: performance.now() - profile.startTime,
        cpuUsage: this.getCPUUsage(),
        memoryUsage: this.getMemoryUsage(),
        timestamp: performance.now()
      }

      profile.metrics.push(metrics)

      // Generate warnings for performance issues
      this.generateWarnings(profile, metrics)
    })
  }

  private generateWarnings(profile: AnimationProfile, metrics: PerformanceMetrics) {
    const warnings: string[] = []
    const suggestions: string[] = []

    // FPS warnings
    if (metrics.fps < 30) {
      warnings.push(`Critical FPS drop: ${metrics.fps} FPS`)
      suggestions.push('Consider reducing animation complexity or enabling reduced motion')
    } else if (metrics.fps < 45) {
      warnings.push(`Low FPS detected: ${metrics.fps} FPS`)
      suggestions.push('Optimize transforms and consider GPU acceleration')
    }

    // Duration warnings
    if (metrics.animationDuration > 5000) {
      warnings.push('Animation running longer than 5 seconds')
      suggestions.push('Consider shorter durations for better user experience')
    }

    // Memory warnings
    if (metrics.memoryUsage > 100) {
      warnings.push(`High memory usage: ${metrics.memoryUsage}MB`)
      suggestions.push('Check for memory leaks in animation cleanup')
    }

    // Frame drop warnings
    if (metrics.frameDrops > 5) {
      warnings.push(`Multiple frame drops detected: ${metrics.frameDrops}`)
      suggestions.push('Use requestAnimationFrame and optimize rendering loop')
    }

    // Add new warnings and suggestions
    warnings.forEach(warning => {
      if (!profile.warnings.includes(warning)) {
        profile.warnings.push(warning)
      }
    })

    suggestions.forEach(suggestion => {
      if (!profile.suggestions.includes(suggestion)) {
        profile.suggestions.push(suggestion)
      }
    })
  }

  private analyzeProfile(profile: AnimationProfile) {
    if (profile.metrics.length === 0) return

    const avgFps = profile.metrics.reduce((sum, m) => sum + m.fps, 0) / profile.metrics.length
    const minFps = Math.min(...profile.metrics.map(m => m.fps))
    const maxMemory = Math.max(...profile.metrics.map(m => m.memoryUsage))
    const totalDuration = (profile.endTime! - profile.startTime) / 1000

    // Performance score calculation (0-100)
    let score = 100
    if (avgFps < 60) score -= (60 - avgFps) * 2
    if (minFps < 30) score -= 20
    if (maxMemory > 50) score -= 10
    if (totalDuration > 3) score -= 5
    if (profile.warnings.length > 0) score -= profile.warnings.length * 5

    score = Math.max(0, Math.round(score))

    // Generate final suggestions
    if (score < 70) {
      profile.suggestions.push('Consider using CSS animations instead of JavaScript for better performance')
    }
    if (avgFps < 45) {
      profile.suggestions.push('Add will-change CSS property to animated elements')
      profile.suggestions.push('Use transform and opacity for smooth animations')
    }
    if (maxMemory > 100) {
      profile.suggestions.push('Implement proper cleanup in useEffect return functions')
    }

    // Log results in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🎬 Animation Performance Report: ${profile.name}`)
      console.log(`Component: ${profile.component}`)
      console.log(`Duration: ${totalDuration.toFixed(2)}s`)
      console.log(`Average FPS: ${avgFps.toFixed(1)}`)
      console.log(`Minimum FPS: ${minFps}`)
      console.log(`Performance Score: ${score}/100`)
      
      if (profile.warnings.length > 0) {
        console.warn('Warnings:', profile.warnings)
      }
      
      if (profile.suggestions.length > 0) {
        console.info('Suggestions:', profile.suggestions)
      }
      
      console.groupEnd()
    }
  }

  private getCPUUsage(): number {
    // Simplified CPU usage estimation based on frame timing
    const frameTime = 16.67 // Target frame time for 60fps
    const actualFrameTime = 1000 / (this.fpsHistory[this.fpsHistory.length - 1] || 60)
    return Math.min(100, (actualFrameTime / frameTime) * 100)
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return Math.round(memory.usedJSHeapSize / (1024 * 1024))
    }
    return 0
  }

  private recordMemoryUsage(entry: any) {
    // Handle memory usage entries from Performance Observer
    const activeProfiles = Array.from(this.profiles.values()).filter(p => !p.endTime)
    activeProfiles.forEach(profile => {
      if (profile.metrics.length > 0) {
        const lastMetric = profile.metrics[profile.metrics.length - 1]
        lastMetric.memoryUsage = this.getMemoryUsage()
      }
    })
  }

  getProfileReport(id: string) {
    return this.profiles.get(id)
  }

  getAllProfiles() {
    return Array.from(this.profiles.values())
  }

  getPerformanceSummary() {
    const profiles = this.getAllProfiles()
    const completedProfiles = profiles.filter(p => p.endTime)
    
    if (completedProfiles.length === 0) {
      return null
    }

    const totalAnimations = completedProfiles.length
    const averageScore = completedProfiles.reduce((sum, profile) => {
      const avgFps = profile.metrics.reduce((s, m) => s + m.fps, 0) / profile.metrics.length
      let score = 100 - (60 - avgFps) * 2
      score = Math.max(0, score - profile.warnings.length * 5)
      return sum + score
    }, 0) / totalAnimations

    const totalWarnings = profiles.reduce((sum, profile) => sum + profile.warnings.length, 0)
    const commonIssues = this.getCommonIssues(profiles)

    return {
      totalAnimations,
      averageScore: Math.round(averageScore),
      totalWarnings,
      commonIssues,
      recommendations: this.getGlobalRecommendations(profiles)
    }
  }

  private getCommonIssues(profiles: AnimationProfile[]) {
    const issueCount = new Map<string, number>()
    
    profiles.forEach(profile => {
      profile.warnings.forEach(warning => {
        const count = issueCount.get(warning) || 0
        issueCount.set(warning, count + 1)
      })
    })

    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }))
  }

  private getGlobalRecommendations(profiles: AnimationProfile[]) {
    const recommendations: string[] = []
    const lowFpsProfiles = profiles.filter(p => {
      const avgFps = p.metrics.reduce((sum, m) => sum + m.fps, 0) / p.metrics.length
      return avgFps < 45
    })

    if (lowFpsProfiles.length > profiles.length * 0.3) {
      recommendations.push('Consider implementing adaptive animation quality based on device performance')
    }

    const highMemoryProfiles = profiles.filter(p => {
      const maxMemory = Math.max(...p.metrics.map(m => m.memoryUsage))
      return maxMemory > 100
    })

    if (highMemoryProfiles.length > 0) {
      recommendations.push('Implement animation pooling and cleanup strategies')
    }

    const longRunningProfiles = profiles.filter(p => 
      p.endTime && (p.endTime - p.startTime) > 5000
    )

    if (longRunningProfiles.length > 0) {
      recommendations.push('Consider shorter animation durations and better user control')
    }

    return recommendations
  }

  clearProfiles() {
    this.profiles.clear()
    this.fpsHistory = []
    this.frameDrops = 0
  }
}

// Global performance monitor instance
export const performanceMonitor = new AnimationPerformanceMonitor()

// React hook for animation performance monitoring
export function useAnimationPerformance(name: string, component: string) {
  const profileId = `${component}-${name}-${Date.now()}`

  const startProfiling = () => {
    return performanceMonitor.startProfiling(profileId, name, component)
  }

  const stopProfiling = () => {
    performanceMonitor.stopProfiling(profileId)
  }

  const getReport = () => {
    return performanceMonitor.getProfileReport(profileId)
  }

  return {
    startProfiling,
    stopProfiling,
    getReport
  }
}

// Performance optimization suggestions
export const performanceOptimizations = {
  // CSS optimizations
  css: {
    willChange: 'transform, opacity, filter',
    transform: 'translateZ(0)', // Force GPU layer
    backfaceVisibility: 'hidden',
    perspective: '1000px',
    
    // For smooth animations
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    
    // Avoid layout thrashing
    avoidProperties: ['width', 'height', 'padding', 'margin', 'border-width'],
    preferProperties: ['transform', 'opacity', 'filter']
  },

  // JavaScript optimizations
  javascript: {
    // Use requestAnimationFrame
    useRAF: true,
    
    // Debounce expensive operations
    debounceMs: 16, // ~60fps
    
    // Batch DOM updates
    batchUpdates: true,
    
    // Memory management
    cleanupTimeouts: true,
    removeEventListeners: true,
    nullifyReferences: true
  },

  // React specific optimizations
  react: {
    // Memoization
    useMemo: ['animation variants', 'style calculations'],
    useCallback: ['event handlers', 'animation callbacks'],
    
    // Component optimization
    memo: 'wrap expensive animated components',
    keys: 'use stable keys for animated lists',
    
    // State management
    separateState: 'separate animation state from business logic',
    reducerPattern: 'use useReducer for complex animation state'
  }
}

// Device performance detection
export function getDevicePerformanceLevel(): 'low' | 'medium' | 'high' {
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as any).deviceMemory || 4
  const connection = (navigator as any).connection
  
  let score = 0
  
  // CPU score
  if (cores >= 8) score += 3
  else if (cores >= 4) score += 2
  else score += 1
  
  // Memory score
  if (memory >= 8) score += 3
  else if (memory >= 4) score += 2
  else score += 1
  
  // Network score
  if (connection) {
    if (connection.effectiveType === '4g') score += 2
    else if (connection.effectiveType === '3g') score += 1
  } else {
    score += 2 // Assume good connection if unknown
  }
  
  if (score >= 7) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}