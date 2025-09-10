/**
 * Performance Optimization Utilities for Animations
 * Ensures 60fps performance and accessibility compliance
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MotionValue, useMotionValue, useTransform } from 'framer-motion';

// Performance monitoring
export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private callbacks: ((fps: number) => void)[] = [];

  start() {
    this.measure();
  }

  private measure = () => {
    const currentTime = performance.now();
    this.frameCount++;

    if (currentTime >= this.lastTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
      this.callbacks.forEach(cb => cb(this.fps));
    }

    requestAnimationFrame(this.measure);
  };

  onFPSChange(callback: (fps: number) => void) {
    this.callbacks.push(callback);
  }

  getFPS() {
    return this.fps;
  }
}

// Reduced motion preference detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Animation frame throttling
export const useAnimationFrame = (callback: (deltaTime: number) => void) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};

// Intersection Observer for scroll-triggered animations
export const useIntersectionAnimation = (
  threshold = 0.1,
  rootMargin = '0px'
) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold, rootMargin, hasAnimated]);

  return { ref: elementRef, isVisible };
};

// Debounced animation triggers
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// GPU acceleration utilities
export const gpuAccelerate = (styles: React.CSSProperties): React.CSSProperties => ({
  ...styles,
  transform: styles.transform || 'translateZ(0)',
  willChange: 'transform, opacity',
  backfaceVisibility: 'hidden',
  perspective: 1000
});

// Optimized scroll handler
export const useOptimizedScroll = (
  callback: (scrollY: number) => void,
  delay = 100
) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          callback(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }

      setIsScrolling(true);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, delay);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, delay]);

  return isScrolling;
};

// Batch DOM updates
export class BatchUpdater {
  private updates: (() => void)[] = [];
  private scheduled = false;

  add(update: () => void) {
    this.updates.push(update);
    this.schedule();
  }

  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      const currentUpdates = [...this.updates];
      this.updates = [];
      this.scheduled = false;
      currentUpdates.forEach(update => update());
    });
  }
}

// Performance-based quality adjustment
export const useAdaptiveQuality = () => {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const monitor = useRef(new PerformanceMonitor());

  useEffect(() => {
    monitor.current.start();
    monitor.current.onFPSChange((fps) => {
      if (fps < 30) {
        setQuality('low');
      } else if (fps < 50) {
        setQuality('medium');
      } else {
        setQuality('high');
      }
    });
  }, []);

  return quality;
};

// Accessibility utilities
export const a11y = {
  // Focus trap for modals
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => element.removeEventListener('keydown', handleKeyDown);
  },

  // Announce to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Focus visible only for keyboard navigation
  focusVisible: () => {
    document.body.classList.add('keyboard-navigation');
    
    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigation');
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }
};

// Memory leak prevention
export const useCleanup = (cleanup: () => void) => {
  useEffect(() => {
    return cleanup;
  }, []);
};

// Lazy loading for heavy animations
export const useLazyAnimation = (
  importFn: () => Promise<any>,
  fallback?: React.ComponentType
) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(
    fallback || null
  );

  useEffect(() => {
    importFn().then(module => {
      setComponent(() => module.default || module);
    });
  }, []);

  return Component;
};

// Animation performance config based on device
export const getDeviceAnimationConfig = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 2;
  
  if (isLowEnd || isMobile) {
    return {
      stiffness: 400,
      damping: 30,
      mass: 0.5,
      enableBlur: false,
      enableShadows: false,
      enable3D: false
    };
  }
  
  return {
    stiffness: 300,
    damping: 25,
    mass: 1,
    enableBlur: true,
    enableShadows: true,
    enable3D: true
  };
};

// CSS variables for performance
export const performanceCSSVars = `
  :root {
    --animation-duration-fast: 0.2s;
    --animation-duration-medium: 0.3s;
    --animation-duration-slow: 0.5s;
    --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    :root {
      --animation-duration-fast: 0.01s;
      --animation-duration-medium: 0.01s;
      --animation-duration-slow: 0.01s;
    }
  }

  .keyboard-navigation *:focus {
    outline: 2px solid var(--focus-color, #06b6d4);
    outline-offset: 2px;
  }

  .keyboard-navigation *:focus:not(:focus-visible) {
    outline: none;
  }

  /* GPU acceleration for animated elements */
  .gpu-accelerated {
    transform: translateZ(0);
    will-change: transform, opacity;
    backface-visibility: hidden;
  }
`;