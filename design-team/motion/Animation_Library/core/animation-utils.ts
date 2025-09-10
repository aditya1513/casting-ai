/**
 * CastMatch Motion Design System
 * Animation Utilities and Hooks for Performance Optimization
 */

import { useReducedMotion } from 'framer-motion';
import { duration, easing, performance } from './animation-tokens';

// Performance monitoring for animations
export class AnimationPerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private animationId: number | null = null;

  start() {
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.measureFPS();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private measureFPS() {
    this.animationId = requestAnimationFrame((currentTime) => {
      this.frameCount++;
      
      if (currentTime - this.lastTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastTime = currentTime;
        
        // Log performance warning if FPS drops below 45
        if (this.fps < 45) {
          console.warn(`Animation performance warning: ${this.fps} FPS`);
        }
      }
      
      this.measureFPS();
    });
  }

  getFPS(): number {
    return this.fps;
  }
}

// Global performance monitor instance
export const perfMonitor = new AnimationPerformanceMonitor();

// Utility to check if device supports smooth animations
export const getDeviceCapabilities = () => {
  const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGPUAcceleration = 'transform3d' in document.createElement('div').style;
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  
  return {
    hasReducedMotion,
    hasGPUAcceleration,
    isLowEndDevice,
    shouldOptimize: hasReducedMotion || isLowEndDevice,
  };
};

// Adaptive animation configuration based on device capabilities
export const getAdaptiveConfig = () => {
  const capabilities = getDeviceCapabilities();
  
  if (capabilities.shouldOptimize) {
    return {
      duration: duration.fast,
      easing: easing.ease,
      enableComplexAnimations: false,
      enableParallax: false,
      enableParticles: false,
    };
  }
  
  return {
    duration: duration.base,
    easing: easing.cinematic,
    enableComplexAnimations: true,
    enableParallax: true,
    enableParticles: true,
  };
};

// Hook for responsive animation configuration
export const useAdaptiveAnimation = () => {
  const shouldReduceMotion = useReducedMotion();
  const config = getAdaptiveConfig();
  
  return {
    ...config,
    shouldReduceMotion,
  };
};

// Animation queue manager for complex sequences
export class AnimationQueue {
  private queue: Array<() => Promise<void>> = [];
  private isRunning = false;

  add(animation: () => Promise<void>) {
    this.queue.push(animation);
    if (!this.isRunning) {
      this.process();
    }
  }

  private async process() {
    this.isRunning = true;
    
    while (this.queue.length > 0) {
      const animation = this.queue.shift();
      if (animation) {
        await animation();
      }
    }
    
    this.isRunning = false;
  }

  clear() {
    this.queue = [];
    this.isRunning = false;
  }
}

// Global animation queue
export const animationQueue = new AnimationQueue();

// Utility functions for common animation patterns
export const createStaggeredAnimation = (
  items: number,
  baseDelay: number = 100,
  direction: 'forward' | 'reverse' | 'center' = 'forward'
) => {
  const animations = [];
  
  for (let i = 0; i < items; i++) {
    let delay;
    
    switch (direction) {
      case 'reverse':
        delay = (items - 1 - i) * baseDelay;
        break;
      case 'center':
        const center = Math.floor(items / 2);
        delay = Math.abs(i - center) * baseDelay;
        break;
      default:
        delay = i * baseDelay;
    }
    
    animations.push({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: delay / 1000, duration: duration.base / 1000 }
    });
  }
  
  return animations;
};

// Intersection Observer for scroll-triggered animations
export const createScrollTrigger = (
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
) => {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
    ...options,
  };
  
  return new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, defaultOptions);
};

// Gesture recognition for mobile animations
export const createGestureHandler = () => {
  let startY = 0;
  let startX = 0;
  let threshold = 50; // Minimum distance for gesture recognition
  
  return {
    onTouchStart: (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    },
    
    onTouchEnd: (e: TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - startY;
      const deltaX = e.changedTouches[0].clientX - startX;
      
      if (Math.abs(deltaY) > threshold) {
        return deltaY > 0 ? 'swipeDown' : 'swipeUp';
      }
      
      if (Math.abs(deltaX) > threshold) {
        return deltaX > 0 ? 'swipeRight' : 'swipeLeft';
      }
      
      return null;
    },
  };
};

// CSS-in-JS animation utilities
export const createKeyframes = (name: string, keyframes: Record<string, any>) => {
  const keyframeString = Object.entries(keyframes)
    .map(([key, value]) => {
      const properties = Object.entries(value)
        .map(([prop, val]) => `${prop}: ${val}`)
        .join('; ');
      return `${key} { ${properties} }`;
    })
    .join('\n');
    
  return `@keyframes ${name} { ${keyframeString} }`;
};

// Particle system utilities
export const createParticleSystem = (
  count: number,
  containerSize: { width: number; height: number }
) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * containerSize.width,
    y: Math.random() * containerSize.height,
    size: Math.random() * 4 + 1,
    opacity: Math.random() * 0.8 + 0.2,
    velocity: {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
    },
    color: `hsl(${Math.random() * 60 + 270}, 70%, 60%)`, // Purple-blue range
  }));
};

// Animation debugging utilities
export const logAnimationPerformance = (name: string, startTime: number) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (duration > 16.67) { // More than 1 frame at 60fps
    console.warn(`Animation "${name}" took ${duration.toFixed(2)}ms (longer than 1 frame)`);
  } else {
    console.log(`Animation "${name}" completed in ${duration.toFixed(2)}ms`);
  }
};

// Memory management for complex animations
export const cleanupAnimation = (element: HTMLElement) => {
  element.style.willChange = 'auto';
  element.style.transform = '';
  element.style.opacity = '';
  element.style.filter = '';
};

// Utility to convert CSS values to numbers
export const parseCSS = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Easing function implementations for JS animations
export const easingFunctions = {
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};