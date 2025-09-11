/**
 * Mobile Performance Optimization Utilities
 * Handles device-specific optimizations for CastMatch mobile experience
 */

// Intersection Observer for lazy loading
export class MobileLazyLoader {
  private observer: IntersectionObserver | null = null;
  private loadedElements = new Set<Element>();

  constructor(
    private options: IntersectionObserverInit = {
      rootMargin: '50px',
      threshold: 0.1,
    }
  ) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(this.handleIntersection.bind(this), options);
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        this.loadElement(entry.target);
        this.loadedElements.add(entry.target);
        this.observer?.unobserve(entry.target);
      }
    });
  }

  private loadElement(element: Element) {
    // Load images
    if (element instanceof HTMLImageElement) {
      const dataSrc = element.getAttribute('data-src');
      if (dataSrc) {
        element.src = dataSrc;
        element.removeAttribute('data-src');
      }
    }

    // Load videos
    if (element instanceof HTMLVideoElement) {
      const dataSrc = element.getAttribute('data-src');
      if (dataSrc) {
        element.src = dataSrc;
        element.load();
        element.removeAttribute('data-src');
      }
    }

    // Load background images
    const dataBg = element.getAttribute('data-bg');
    if (dataBg) {
      (element as HTMLElement).style.backgroundImage = `url(${dataBg})`;
      element.removeAttribute('data-bg');
    }

    // Trigger custom load event
    element.dispatchEvent(new CustomEvent('lazyloaded'));
  }

  observe(element: Element) {
    if (this.observer) {
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadElement(element);
    }
  }

  unobserve(element: Element) {
    this.observer?.unobserve(element);
    this.loadedElements.delete(element);
  }

  disconnect() {
    this.observer?.disconnect();
    this.loadedElements.clear();
  }
}

// Virtual scrolling for large lists
export class VirtualScrollManager {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleCount: number;
  private totalItems: number;
  private scrollTop = 0;
  private renderCallback: (startIndex: number, endIndex: number) => void;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    totalItems: number,
    renderCallback: (startIndex: number, endIndex: number) => void
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
    this.renderCallback = renderCallback;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2; // Buffer items

    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    this.updateVisibleItems();
  }

  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.updateVisibleItems();
  }

  private updateVisibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleCount, this.totalItems);
    
    this.renderCallback(Math.max(0, startIndex), endIndex);
  }

  updateTotalItems(newTotal: number) {
    this.totalItems = newTotal;
    this.updateVisibleItems();
  }

  scrollToIndex(index: number) {
    const targetScrollTop = index * this.itemHeight;
    this.container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
  }

  destroy() {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}

// Touch gesture recognition
export class MobileGestureHandler {
  private element: HTMLElement;
  private startPoint = { x: 0, y: 0 };
  private currentPoint = { x: 0, y: 0 };
  private startTime = 0;
  private isTracking = false;

  constructor(
    element: HTMLElement,
    private options: {
      swipeThreshold?: number;
      velocityThreshold?: number;
      longPressDelay?: number;
      onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', distance: number) => void;
      onTap?: (point: { x: number; y: number }) => void;
      onLongPress?: (point: { x: number; y: number }) => void;
      onPinch?: (scale: number) => void;
    } = {}
  ) {
    this.element = element;
    this.options = {
      swipeThreshold: 50,
      velocityThreshold: 0.5,
      longPressDelay: 500,
      ...options,
    };

    this.attachListeners();
  }

  private attachListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.startPoint = { x: touch.clientX, y: touch.clientY };
      this.currentPoint = { x: touch.clientX, y: touch.clientY };
      this.startTime = Date.now();
      this.isTracking = true;

      // Long press detection
      setTimeout(() => {
        if (this.isTracking && this.getDistance() < 10) {
          this.options.onLongPress?.(this.startPoint);
        }
      }, this.options.longPressDelay);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.isTracking || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.currentPoint = { x: touch.clientX, y: touch.clientY };

    // Prevent default scrolling for horizontal swipes
    const deltaX = Math.abs(this.currentPoint.x - this.startPoint.x);
    const deltaY = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (!this.isTracking) return;

    const distance = this.getDistance();
    const duration = Date.now() - this.startTime;
    const velocity = distance / duration;

    if (distance < 10 && duration < 300) {
      // Tap gesture
      this.options.onTap?.(this.startPoint);
    } else if (distance > (this.options.swipeThreshold || 50) && velocity > (this.options.velocityThreshold || 0.5)) {
      // Swipe gesture
      const deltaX = this.currentPoint.x - this.startPoint.x;
      const deltaY = this.currentPoint.y - this.startPoint.y;
      
      let direction: 'up' | 'down' | 'left' | 'right';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      this.options.onSwipe?.(direction, distance);
    }

    this.isTracking = false;
  }

  private getDistance(): number {
    const deltaX = this.currentPoint.x - this.startPoint.x;
    const deltaY = this.currentPoint.y - this.startPoint.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }
}

// Image optimization utilities
export class MobileImageOptimizer {
  static getOptimizedUrl(
    baseUrl: string,
    options: {
      width?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpg' | 'png';
      dpr?: number;
    } = {}
  ): string {
    const { width = 800, quality = 80, format = 'webp', dpr = 1 } = options;
    
    // Example for Cloudinary or similar service
    const params = new URLSearchParams({
      w: (width * dpr).toString(),
      q: quality.toString(),
      f: format,
      dpr: dpr.toString(),
    });

    return `${baseUrl}?${params.toString()}`;
  }

  static supportsFormat(format: 'webp' | 'avif'): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      const dataUrl = canvas.toDataURL(`image/${format}`);
      return dataUrl.startsWith(`data:image/${format}`);
    } catch {
      return false;
    }
  }

  static getOptimalFormat(): 'avif' | 'webp' | 'jpg' {
    if (this.supportsFormat('avif')) return 'avif';
    if (this.supportsFormat('webp')) return 'webp';
    return 'jpg';
  }
}

// Performance monitoring
export class MobilePerformanceMonitor {
  private metrics: {
    fps: number[];
    memoryUsage: number[];
    renderTimes: number[];
    interactionDelays: number[];
  } = {
    fps: [],
    memoryUsage: [],
    renderTimes: [],
    interactionDelays: [],
  };

  private isMonitoring = false;
  private frameCount = 0;
  private lastTime = performance.now();

  startMonitoring() {
    this.isMonitoring = true;
    this.measureFPS();
    this.measureMemory();
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  private measureFPS() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameCount++;

    if (now >= this.lastTime + 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.metrics.fps.push(fps);
      
      // Keep only last 60 measurements
      if (this.metrics.fps.length > 60) {
        this.metrics.fps.shift();
      }

      this.frameCount = 0;
      this.lastTime = now;
    }

    requestAnimationFrame(() => this.measureFPS());
  }

  private measureMemory() {
    if (!this.isMonitoring || !('memory' in performance)) return;

    const memInfo = (performance as any).memory;
    const usage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
    this.metrics.memoryUsage.push(usage);

    // Keep only last 120 measurements (2 minutes at 1/sec)
    if (this.metrics.memoryUsage.length > 120) {
      this.metrics.memoryUsage.shift();
    }

    setTimeout(() => this.measureMemory(), 1000);
  }

  measureInteractionDelay(callback: () => void): number {
    const start = performance.now();
    
    requestAnimationFrame(() => {
      const delay = performance.now() - start;
      this.metrics.interactionDelays.push(delay);
      
      if (this.metrics.interactionDelays.length > 100) {
        this.metrics.interactionDelays.shift();
      }
      
      callback();
    });

    return performance.now() - start;
  }

  getMetrics() {
    return {
      averageFPS: this.metrics.fps.reduce((a, b) => a + b, 0) / this.metrics.fps.length || 0,
      averageMemoryUsage: this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length || 0,
      averageInteractionDelay: this.metrics.interactionDelays.reduce((a, b) => a + b, 0) / this.metrics.interactionDelays.length || 0,
      isPerformanceGood: () => {
        const avgFPS = this.getMetrics().averageFPS;
        const avgDelay = this.getMetrics().averageInteractionDelay;
        return avgFPS > 45 && avgDelay < 16.67; // 60fps target
      },
    };
  }
}

// Connection quality detector
export class ConnectionQualityDetector {
  private static instance: ConnectionQualityDetector;
  private quality: 'fast' | 'slow' | 'offline' = 'fast';
  private callbacks: Array<(quality: string) => void> = [];

  private constructor() {
    this.detectInitialQuality();
    this.setupListeners();
  }

  static getInstance(): ConnectionQualityDetector {
    if (!this.instance) {
      this.instance = new ConnectionQualityDetector();
    }
    return this.instance;
  }

  private detectInitialQuality() {
    if (!navigator.onLine) {
      this.quality = 'offline';
      return;
    }

    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      if (['slow-2g', '2g', '3g'].includes(effectiveType)) {
        this.quality = 'slow';
      } else {
        this.quality = 'fast';
      }
    }
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.quality = 'fast';
      this.notifyCallbacks();
    });

    window.addEventListener('offline', () => {
      this.quality = 'offline';
      this.notifyCallbacks();
    });

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        this.detectInitialQuality();
        this.notifyCallbacks();
      });
    }
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.quality));
  }

  getQuality(): 'fast' | 'slow' | 'offline' {
    return this.quality;
  }

  onChange(callback: (quality: string) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  async measureSpeed(): Promise<number> {
    try {
      const start = performance.now();
      const response = await fetch('/api/health', { cache: 'no-cache' });
      const end = performance.now();
      
      if (response.ok) {
        return end - start;
      }
    } catch (error) {
      console.warn('Failed to measure connection speed:', error);
    }
    
    return Infinity;
  }
}

// Export singleton instance
export const connectionQuality = ConnectionQualityDetector.getInstance();