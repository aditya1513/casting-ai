/**
 * GPU Acceleration Configuration System
 * Production-optimized animation performance with hardware acceleration
 */

export interface GPUCapabilities {
  hasHardwareAcceleration: boolean;
  maxTextureSize: number;
  webGLVersion: number;
  supportedExtensions: string[];
  memoryInfo: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  isMobile: boolean;
  devicePixelRatio: number;
  batteryLevel?: number;
}

export interface AnimationPerformanceConfig {
  enableGPUAcceleration: boolean;
  useWillChange: boolean;
  preferComposite: boolean;
  maxConcurrentAnimations: number;
  frameRateBudget: number;
  memoryBudgetMB: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

class GPUAccelerationManager {
  private capabilities: GPUCapabilities | null = null;
  private performanceConfig: AnimationPerformanceConfig;
  private activeAnimations = new Set<string>();
  private memoryUsage = 0;

  constructor() {
    this.performanceConfig = this.getDefaultConfig();
    this.initializeCapabilities();
  }

  private getDefaultConfig(): AnimationPerformanceConfig {
    return {
      enableGPUAcceleration: true,
      useWillChange: true,
      preferComposite: true,
      maxConcurrentAnimations: 10,
      frameRateBudget: 16.67, // 60fps
      memoryBudgetMB: 50,
      quality: 'high'
    };
  }

  private async initializeCapabilities(): Promise<void> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // @ts-ignore - Battery API is experimental
      const battery = await navigator.getBattery?.();

      this.capabilities = {
        hasHardwareAcceleration: !!gl,
        maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
        webGLVersion: gl instanceof WebGL2RenderingContext ? 2 : 1,
        supportedExtensions: gl ? gl.getSupportedExtensions() || [] : [],
        memoryInfo: (performance as any).memory || {
          totalJSHeapSize: 0,
          usedJSHeapSize: 0,
          jsHeapSizeLimit: 0
        },
        isMobile,
        devicePixelRatio: window.devicePixelRatio,
        batteryLevel: battery?.level
      };

      // Auto-adjust configuration based on capabilities
      this.adjustConfigurationForDevice();
    } catch (error) {
      console.warn('GPU capabilities detection failed:', error);
      this.capabilities = this.getFallbackCapabilities();
    }
  }

  private getFallbackCapabilities(): GPUCapabilities {
    return {
      hasHardwareAcceleration: false,
      maxTextureSize: 2048,
      webGLVersion: 1,
      supportedExtensions: [],
      memoryInfo: {
        totalJSHeapSize: 0,
        usedJSHeapSize: 0,
        jsHeapSizeLimit: 0
      },
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      devicePixelRatio: window.devicePixelRatio
    };
  }

  private adjustConfigurationForDevice(): void {
    if (!this.capabilities) return;

    const { isMobile, hasHardwareAcceleration, batteryLevel, memoryInfo } = this.capabilities;
    
    // Mobile optimizations
    if (isMobile) {
      this.performanceConfig.maxConcurrentAnimations = 6;
      this.performanceConfig.memoryBudgetMB = 30;
      this.performanceConfig.quality = 'medium';
    }

    // Low battery optimizations
    if (batteryLevel && batteryLevel < 0.2) {
      this.performanceConfig.quality = 'low';
      this.performanceConfig.maxConcurrentAnimations = 3;
      this.performanceConfig.enableGPUAcceleration = false;
    }

    // Memory constraints
    if (memoryInfo.jsHeapSizeLimit > 0 && memoryInfo.jsHeapSizeLimit < 1073741824) { // < 1GB
      this.performanceConfig.quality = 'medium';
      this.performanceConfig.memoryBudgetMB = 25;
    }

    // No GPU acceleration fallback
    if (!hasHardwareAcceleration) {
      this.performanceConfig.enableGPUAcceleration = false;
      this.performanceConfig.useWillChange = false;
      this.performanceConfig.maxConcurrentAnimations = 4;
    }
  }

  /**
   * Applies GPU optimization styles to an element
   */
  optimizeElementForAnimation(
    element: HTMLElement, 
    animationType: 'transform' | 'opacity' | 'filter' | 'backdrop-filter',
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    if (!this.performanceConfig.enableGPUAcceleration) return;

    const style = element.style;

    // Force hardware acceleration layer creation
    if (this.performanceConfig.preferComposite) {
      style.transform = style.transform || 'translateZ(0)';
      style.backfaceVisibility = 'hidden';
      style.perspective = '1000px';
    }

    // Apply will-change based on animation type and priority
    if (this.performanceConfig.useWillChange && priority === 'high') {
      const willChangeProperties = [];
      
      switch (animationType) {
        case 'transform':
          willChangeProperties.push('transform');
          break;
        case 'opacity':
          willChangeProperties.push('opacity');
          break;
        case 'filter':
          willChangeProperties.push('filter');
          break;
        case 'backdrop-filter':
          willChangeProperties.push('backdrop-filter');
          break;
      }
      
      style.willChange = willChangeProperties.join(', ');
    }

    // Optimize rendering
    style.containIntrinsicSize = 'none';
    style.contentVisibility = 'auto';
  }

  /**
   * Removes GPU optimization when animation completes
   */
  cleanupElementOptimization(element: HTMLElement): void {
    const style = element.style;
    style.willChange = 'auto';
    
    // Remove transform if it was only added for GPU acceleration
    if (style.transform === 'translateZ(0)') {
      style.transform = '';
    }
  }

  /**
   * Checks if animation can be executed within performance budget
   */
  canExecuteAnimation(animationId: string, complexity: 'simple' | 'complex' | 'heavy'): boolean {
    if (this.activeAnimations.size >= this.performanceConfig.maxConcurrentAnimations) {
      return false;
    }

    // Memory budget check
    const estimatedMemoryUsage = this.getEstimatedMemoryUsage(complexity);
    if (this.memoryUsage + estimatedMemoryUsage > this.performanceConfig.memoryBudgetMB * 1024 * 1024) {
      return false;
    }

    return true;
  }

  private getEstimatedMemoryUsage(complexity: 'simple' | 'complex' | 'heavy'): number {
    const baseMemory = 1024 * 1024; // 1MB base
    switch (complexity) {
      case 'simple': return baseMemory * 0.5;
      case 'complex': return baseMemory * 2;
      case 'heavy': return baseMemory * 5;
    }
  }

  /**
   * Registers active animation for tracking
   */
  registerAnimation(animationId: string, complexity: 'simple' | 'complex' | 'heavy'): void {
    this.activeAnimations.add(animationId);
    this.memoryUsage += this.getEstimatedMemoryUsage(complexity);
  }

  /**
   * Unregisters completed animation
   */
  unregisterAnimation(animationId: string, complexity: 'simple' | 'complex' | 'heavy'): void {
    this.activeAnimations.delete(animationId);
    this.memoryUsage -= this.getEstimatedMemoryUsage(complexity);
    this.memoryUsage = Math.max(0, this.memoryUsage); // Prevent negative
  }

  /**
   * Gets current performance metrics
   */
  getPerformanceMetrics(): {
    activeAnimations: number;
    memoryUsageMB: number;
    cpuUsage?: number;
    frameRate: number;
    quality: string;
  } {
    return {
      activeAnimations: this.activeAnimations.size,
      memoryUsageMB: this.memoryUsage / (1024 * 1024),
      frameRate: 1000 / this.performanceConfig.frameRateBudget,
      quality: this.performanceConfig.quality
    };
  }

  /**
   * Updates configuration at runtime
   */
  updateConfiguration(config: Partial<AnimationPerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
  }

  /**
   * Gets current capabilities
   */
  getCapabilities(): GPUCapabilities | null {
    return this.capabilities;
  }

  /**
   * Gets current configuration
   */
  getConfiguration(): AnimationPerformanceConfig {
    return { ...this.performanceConfig };
  }
}

// Singleton instance
export const gpuAcceleration = new GPUAccelerationManager();

// Utility functions for common optimizations
export const GPUOptimizations = {
  /**
   * Creates a GPU-optimized animation element
   */
  createOptimizedElement(
    tagName: string = 'div',
    animationType: 'transform' | 'opacity' | 'filter' | 'backdrop-filter' = 'transform'
  ): HTMLElement {
    const element = document.createElement(tagName);
    gpuAcceleration.optimizeElementForAnimation(element, animationType, 'high');
    return element;
  },

  /**
   * Batch optimize multiple elements
   */
  batchOptimizeElements(
    elements: HTMLElement[],
    animationType: 'transform' | 'opacity' | 'filter' | 'backdrop-filter',
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    requestAnimationFrame(() => {
      elements.forEach(element => {
        gpuAcceleration.optimizeElementForAnimation(element, animationType, priority);
      });
    });
  },

  /**
   * Smart will-change management
   */
  smartWillChange: {
    set(element: HTMLElement, properties: string[]): void {
      if (gpuAcceleration.getConfiguration().useWillChange) {
        element.style.willChange = properties.join(', ');
      }
    },
    
    clear(element: HTMLElement): void {
      element.style.willChange = 'auto';
    },
    
    auto(element: HTMLElement, callback: () => void): void {
      const properties = ['transform', 'opacity'];
      this.set(element, properties);
      
      callback();
      
      // Clear after animation completes
      setTimeout(() => this.clear(element), 100);
    }
  }
};

// CSS classes for GPU optimization
export const GPUOptimizedCSS = `
  .gpu-optimized {
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
    contain: layout style paint;
  }

  .gpu-optimized-high-priority {
    will-change: transform, opacity;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
    contain: layout style paint;
  }

  .gpu-optimized-transform {
    will-change: transform;
    transform: translateZ(0);
  }

  .gpu-optimized-opacity {
    will-change: opacity;
    transform: translateZ(0);
  }

  .gpu-optimized-filter {
    will-change: filter;
    transform: translateZ(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .gpu-optimized,
    .gpu-optimized-high-priority,
    .gpu-optimized-transform,
    .gpu-optimized-opacity,
    .gpu-optimized-filter {
      will-change: auto;
      transform: none;
      animation: none !important;
      transition: none !important;
    }
  }
`;