'use client'

import { getBrowserInfo } from './desktop-performance'

// Performance testing suite for CastMatch
export class PerformanceTester {
  private testResults: Map<string, TestResult[]> = new Map()
  private isRunning = false

  constructor() {
    this.registerTestSuite()
  }

  private registerTestSuite() {
    // Register all available tests
    this.addTest('dom-manipulation', this.testDOMManipulation.bind(this))
    this.addTest('virtual-scrolling', this.testVirtualScrolling.bind(this))
    this.addTest('image-loading', this.testImageLoading.bind(this))
    this.addTest('api-performance', this.testAPIPerformance.bind(this))
    this.addTest('memory-usage', this.testMemoryUsage.bind(this))
    this.addTest('rendering-performance', this.testRenderingPerformance.bind(this))
    this.addTest('bundle-analysis', this.testBundlePerformance.bind(this))
  }

  private addTest(name: string, testFunction: () => Promise<TestResult>) {
    if (!this.testResults.has(name)) {
      this.testResults.set(name, [])
    }
  }

  async runAllTests(): Promise<PerformanceTestSuite> {
    if (this.isRunning) {
      throw new Error('Performance tests are already running')
    }

    this.isRunning = true
    const startTime = performance.now()
    const browserInfo = getBrowserInfo()
    const results: TestResult[] = []

    try {
      console.log('🚀 Starting CastMatch Performance Test Suite...')

      // Run all registered tests
      for (const [testName] of this.testResults) {
        try {
          console.log(`Running ${testName}...`)
          const result = await this.runSingleTest(testName)
          results.push(result)
          this.testResults.get(testName)?.push(result)
        } catch (error) {
          console.error(`❌ Test ${testName} failed:`, error)
          results.push({
            name: testName,
            duration: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            metrics: {},
            timestamp: Date.now()
          })
        }
      }

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      console.log(`✅ Performance test suite completed in ${totalDuration.toFixed(2)}ms`)

      return {
        results,
        summary: this.generateSummary(results),
        browserInfo,
        totalDuration,
        timestamp: Date.now()
      }
    } finally {
      this.isRunning = false
    }
  }

  private async runSingleTest(testName: string): Promise<TestResult> {
    const startTime = performance.now()
    
    try {
      let result: TestResult
      
      switch (testName) {
        case 'dom-manipulation':
          result = await this.testDOMManipulation()
          break
        case 'virtual-scrolling':
          result = await this.testVirtualScrolling()
          break
        case 'image-loading':
          result = await this.testImageLoading()
          break
        case 'api-performance':
          result = await this.testAPIPerformance()
          break
        case 'memory-usage':
          result = await this.testMemoryUsage()
          break
        case 'rendering-performance':
          result = await this.testRenderingPerformance()
          break
        case 'bundle-analysis':
          result = await this.testBundlePerformance()
          break
        default:
          throw new Error(`Unknown test: ${testName}`)
      }

      const endTime = performance.now()
      result.duration = endTime - startTime
      result.timestamp = Date.now()
      
      return result
    } catch (error) {
      const endTime = performance.now()
      return {
        name: testName,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {},
        timestamp: Date.now()
      }
    }
  }

  private async testDOMManipulation(): Promise<TestResult> {
    const iterations = 1000
    const container = document.createElement('div')
    document.body.appendChild(container)

    const startTime = performance.now()

    // Test DOM creation and manipulation
    for (let i = 0; i < iterations; i++) {
      const element = document.createElement('div')
      element.className = 'test-element'
      element.textContent = `Test Element ${i}`
      element.style.position = 'absolute'
      element.style.left = `${i % 100}px`
      element.style.top = `${Math.floor(i / 100) * 20}px`
      container.appendChild(element)
    }

    const midTime = performance.now()

    // Test DOM removal
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    const endTime = performance.now()
    document.body.removeChild(container)

    const creationTime = midTime - startTime
    const removalTime = endTime - midTime
    const totalTime = endTime - startTime

    return {
      name: 'dom-manipulation',
      duration: totalTime,
      success: true,
      metrics: {
        iterations,
        creationTime: Math.round(creationTime),
        removalTime: Math.round(removalTime),
        avgCreationTime: creationTime / iterations,
        avgRemovalTime: removalTime / iterations,
        elementsPerSecond: Math.round((iterations * 2000) / totalTime) // creation + removal
      },
      timestamp: Date.now()
    }
  }

  private async testVirtualScrolling(): Promise<TestResult> {
    const itemCount = 10000
    const itemHeight = 50
    const containerHeight = 400
    
    const startTime = performance.now()

    // Simulate virtual scrolling calculations
    const visibleItemCount = Math.ceil(containerHeight / itemHeight)
    const results = []

    for (let scrollTop = 0; scrollTop < itemCount * itemHeight; scrollTop += itemHeight) {
      const startIndex = Math.floor(scrollTop / itemHeight)
      const endIndex = Math.min(startIndex + visibleItemCount, itemCount)
      
      results.push({
        scrollTop,
        startIndex,
        endIndex,
        visibleCount: endIndex - startIndex
      })
    }

    const endTime = performance.now()

    return {
      name: 'virtual-scrolling',
      duration: endTime - startTime,
      success: true,
      metrics: {
        totalItems: itemCount,
        calculations: results.length,
        avgVisibleItems: results.reduce((sum, r) => sum + r.visibleCount, 0) / results.length,
        calculationsPerMs: results.length / (endTime - startTime)
      },
      timestamp: Date.now()
    }
  }

  private async testImageLoading(): Promise<TestResult> {
    const testImages = [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 red pixel
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 white pixel
    ]

    const startTime = performance.now()
    const loadPromises = testImages.map((src, index) => {
      return new Promise<number>((resolve, reject) => {
        const img = new Image()
        const imgStartTime = performance.now()
        
        img.onload = () => {
          resolve(performance.now() - imgStartTime)
        }
        
        img.onerror = () => {
          reject(new Error(`Failed to load image ${index}`))
        }
        
        img.src = src
      })
    })

    try {
      const loadTimes = await Promise.all(loadPromises)
      const endTime = performance.now()

      return {
        name: 'image-loading',
        duration: endTime - startTime,
        success: true,
        metrics: {
          imagesLoaded: loadTimes.length,
          avgLoadTime: loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length,
          maxLoadTime: Math.max(...loadTimes),
          minLoadTime: Math.min(...loadTimes)
        },
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        name: 'image-loading',
        duration: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Image loading failed',
        metrics: {},
        timestamp: Date.now()
      }
    }
  }

  private async testAPIPerformance(): Promise<TestResult> {
    const testEndpoints = [
      { url: '/api/health', method: 'GET' },
      { url: '/api/talents', method: 'GET' },
      { url: '/api/projects', method: 'GET' }
    ]

    const startTime = performance.now()
    const results = []

    for (const endpoint of testEndpoints) {
      const requestStart = performance.now()
      
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          cache: 'no-cache'
        })
        
        const requestEnd = performance.now()
        results.push({
          url: endpoint.url,
          status: response.status,
          duration: requestEnd - requestStart,
          success: response.ok
        })
      } catch (error) {
        const requestEnd = performance.now()
        results.push({
          url: endpoint.url,
          status: 0,
          duration: requestEnd - requestStart,
          success: false,
          error: error instanceof Error ? error.message : 'Request failed'
        })
      }
    }

    const endTime = performance.now()
    const successfulRequests = results.filter(r => r.success)

    return {
      name: 'api-performance',
      duration: endTime - startTime,
      success: successfulRequests.length > 0,
      metrics: {
        totalRequests: results.length,
        successfulRequests: successfulRequests.length,
        avgResponseTime: successfulRequests.length > 0 
          ? successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length
          : 0,
        maxResponseTime: successfulRequests.length > 0 
          ? Math.max(...successfulRequests.map(r => r.duration))
          : 0,
        failureRate: (results.length - successfulRequests.length) / results.length
      },
      timestamp: Date.now()
    }
  }

  private async testMemoryUsage(): Promise<TestResult> {
    const startTime = performance.now()

    if (!('memory' in performance)) {
      return {
        name: 'memory-usage',
        duration: 0,
        success: false,
        error: 'Memory API not available in this browser',
        metrics: {},
        timestamp: Date.now()
      }
    }

    const initialMemory = (performance as any).memory
    const testData = []

    // Create memory pressure
    for (let i = 0; i < 100000; i++) {
      testData.push({
        id: i,
        data: new Array(100).fill(`test-data-${i}`)
      })
    }

    const afterAllocationMemory = (performance as any).memory

    // Clean up
    testData.length = 0

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }

    const afterCleanupMemory = (performance as any).memory
    const endTime = performance.now()

    return {
      name: 'memory-usage',
      duration: endTime - startTime,
      success: true,
      metrics: {
        initialUsed: Math.round(initialMemory.usedJSHeapSize / 1024 / 1024),
        peakUsed: Math.round(afterAllocationMemory.usedJSHeapSize / 1024 / 1024),
        finalUsed: Math.round(afterCleanupMemory.usedJSHeapSize / 1024 / 1024),
        memoryAllocated: Math.round((afterAllocationMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / 1024 / 1024),
        memoryFreed: Math.round((afterAllocationMemory.usedJSHeapSize - afterCleanupMemory.usedJSHeapSize) / 1024 / 1024),
        heapLimit: Math.round(afterCleanupMemory.jsHeapSizeLimit / 1024 / 1024)
      },
      timestamp: Date.now()
    }
  }

  private async testRenderingPerformance(): Promise<TestResult> {
    const startTime = performance.now()
    let frameCount = 0
    let totalRenderTime = 0

    return new Promise<TestResult>((resolve) => {
      const testDuration = 1000 // 1 second test
      const startTimestamp = performance.now()

      function measureFrame(timestamp: number) {
        const frameStartTime = performance.now()
        
        // Simulate some rendering work
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          ctx.fillStyle = `hsl(${frameCount % 360}, 50%, 50%)`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `hsl(${(frameCount + i) % 360}, 50%, 50%)`
            ctx.fillRect(
              Math.random() * canvas.width,
              Math.random() * canvas.height,
              10,
              10
            )
          }
        }

        const frameEndTime = performance.now()
        totalRenderTime += frameEndTime - frameStartTime
        frameCount++

        if (timestamp - startTimestamp < testDuration) {
          requestAnimationFrame(measureFrame)
        } else {
          const endTime = performance.now()
          const actualDuration = endTime - startTime
          
          resolve({
            name: 'rendering-performance',
            duration: actualDuration,
            success: true,
            metrics: {
              frameCount,
              avgFPS: Math.round((frameCount * 1000) / testDuration),
              avgFrameTime: totalRenderTime / frameCount,
              totalRenderTime,
              efficiency: (totalRenderTime / actualDuration) * 100
            },
            timestamp: Date.now()
          })
        }
      }

      requestAnimationFrame(measureFrame)
    })
  }

  private async testBundlePerformance(): Promise<TestResult> {
    const startTime = performance.now()

    if (!('getEntriesByType' in performance)) {
      return {
        name: 'bundle-analysis',
        duration: 0,
        success: false,
        error: 'Performance timing API not available',
        metrics: {},
        timestamp: Date.now()
      }
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const scriptResources = resources.filter(resource => 
      resource.name.includes('.js') && resource.transferSize > 0
    )

    const totalSize = scriptResources.reduce((sum, resource) => 
      sum + (resource.transferSize || 0), 0
    )
    
    const totalLoadTime = scriptResources.reduce((sum, resource) => 
      sum + (resource.duration || 0), 0
    )

    const endTime = performance.now()

    return {
      name: 'bundle-analysis',
      duration: endTime - startTime,
      success: true,
      metrics: {
        scriptCount: scriptResources.length,
        totalSize: Math.round(totalSize / 1024), // KB
        totalLoadTime: Math.round(totalLoadTime),
        avgScriptSize: scriptResources.length > 0 ? Math.round(totalSize / scriptResources.length / 1024) : 0,
        avgLoadTime: scriptResources.length > 0 ? Math.round(totalLoadTime / scriptResources.length) : 0,
        largestScript: scriptResources.length > 0 
          ? Math.round(Math.max(...scriptResources.map(r => r.transferSize || 0)) / 1024)
          : 0
      },
      timestamp: Date.now()
    }
  }

  private generateSummary(results: TestResult[]): TestSummary {
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    return {
      totalTests: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / results.length) * 100,
      avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      criticalIssues: this.identifyCriticalIssues(results),
      recommendations: this.generateRecommendations(results)
    }
  }

  private identifyCriticalIssues(results: TestResult[]): string[] {
    const issues: string[] = []

    results.forEach(result => {
      if (!result.success) {
        issues.push(`${result.name} failed: ${result.error}`)
      }

      if (result.name === 'memory-usage' && result.metrics.memoryAllocated > 100) {
        issues.push(`High memory usage detected: ${result.metrics.memoryAllocated}MB allocated`)
      }

      if (result.name === 'api-performance' && result.metrics.avgResponseTime > 1000) {
        issues.push(`Slow API responses: ${result.metrics.avgResponseTime.toFixed(0)}ms average`)
      }

      if (result.name === 'rendering-performance' && result.metrics.avgFPS < 30) {
        issues.push(`Low frame rate: ${result.metrics.avgFPS} FPS`)
      }
    })

    return issues
  }

  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = []

    results.forEach(result => {
      if (result.name === 'bundle-analysis' && result.metrics.totalSize > 500) {
        recommendations.push('Consider code splitting to reduce initial bundle size')
      }

      if (result.name === 'dom-manipulation' && result.metrics.avgCreationTime > 1) {
        recommendations.push('Optimize DOM manipulation by batching operations')
      }

      if (result.name === 'image-loading' && result.metrics.avgLoadTime > 100) {
        recommendations.push('Implement lazy loading and image optimization')
      }
    })

    return recommendations
  }

  getTestHistory(testName: string): TestResult[] {
    return this.testResults.get(testName) || []
  }

  clearTestHistory(): void {
    this.testResults.clear()
    this.registerTestSuite()
  }
}

// Types
export interface TestResult {
  name: string
  duration: number
  success: boolean
  error?: string
  metrics: Record<string, any>
  timestamp: number
}

export interface TestSummary {
  totalTests: number
  successful: number
  failed: number
  successRate: number
  avgDuration: number
  criticalIssues: string[]
  recommendations: string[]
}

export interface PerformanceTestSuite {
  results: TestResult[]
  summary: TestSummary
  browserInfo: any
  totalDuration: number
  timestamp: number
}

// React hook for performance testing
export function usePerformanceTesting() {
  const [tester] = useState(() => new PerformanceTester())
  const [isRunning, setIsRunning] = useState(false)
  const [lastResults, setLastResults] = useState<PerformanceTestSuite | null>(null)

  const runTests = async () => {
    if (isRunning) return

    setIsRunning(true)
    try {
      const results = await tester.runAllTests()
      setLastResults(results)
      return results
    } finally {
      setIsRunning(false)
    }
  }

  const getTestHistory = (testName: string) => tester.getTestHistory(testName)
  const clearHistory = () => tester.clearTestHistory()

  return {
    runTests,
    isRunning,
    lastResults,
    getTestHistory,
    clearHistory
  }
}