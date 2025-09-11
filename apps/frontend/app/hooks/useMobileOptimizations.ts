'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Device detection and capabilities
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'small' | 'medium' | 'large';
  hasTouch: boolean;
  supportsHover: boolean;
  pixelRatio: number;
  connection: 'slow' | 'fast' | 'unknown';
  prefersReducedMotion: boolean;
  supportsWebP: boolean;
  supportsAVIF: boolean;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
}

// Performance metrics
interface PerformanceMetrics {
  fps: number;
  memoryUsage?: number;
  renderTime: number;
  interactionDelay: number;
  scrollPerformance: 'smooth' | 'laggy' | 'poor';
}

// Viewport tracking
interface ViewportInfo {
  width: number;
  height: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  safeAreaRight: number;
  isKeyboardOpen: boolean;
}

// Touch and gesture handling
interface GestureState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'up' | 'down' | 'left' | 'right' | null;
  type: 'tap' | 'swipe' | 'pinch' | 'long-press' | null;
}

export const useMobileOptimizations = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'portrait',
    screenSize: 'large',
    hasTouch: false,
    supportsHover: true,
    pixelRatio: 1,
    connection: 'unknown',
    prefersReducedMotion: false,
    supportsWebP: false,
    supportsAVIF: false,
  });

  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    safeAreaLeft: 0,
    safeAreaRight: 0,
    isKeyboardOpen: false,
  });

  const [performance, setPerformance] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    interactionDelay: 0,
    scrollPerformance: 'smooth',
  });

  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null,
    type: null,
  });

  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const fpsCounter = useRef(0);
  const lastFrameTime = useRef(performance.now());

  // Device detection
  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isTablet = /iPad|Android(?=.*Mobile)|Tablet/i.test(ua) && window.innerWidth >= 768;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const supportsHover = window.matchMedia('(hover: hover)').matches;
      const pixelRatio = window.devicePixelRatio || 1;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Screen size detection
      const width = window.innerWidth;
      let screenSize: 'small' | 'medium' | 'large' = 'large';
      if (width < 640) screenSize = 'small';
      else if (width < 1024) screenSize = 'medium';

      // Connection speed estimation
      let connection: 'slow' | 'fast' | 'unknown' = 'unknown';
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          const effectiveType = conn.effectiveType;
          connection = ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
        }
      }

      // Image format support
      const canvas = document.createElement('canvas');
      const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      const supportsAVIF = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;

      setDeviceInfo({
        isMobile: isMobile && !isTablet,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
        screenSize,
        hasTouch,
        supportsHover,
        pixelRatio,
        connection,
        prefersReducedMotion,
        supportsWebP,
        supportsAVIF,
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  // Viewport tracking with safe areas
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const visualViewport = window.visualViewport;

      // Safe area detection
      const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0');
      const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0');
      const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0');
      const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0');

      // Keyboard detection (mobile)
      const isKeyboardOpen = visualViewport ? visualViewport.height < height * 0.8 : false;

      setViewport({
        width,
        height: visualViewport?.height || height,
        safeAreaTop,
        safeAreaBottom,
        safeAreaLeft,
        safeAreaRight,
        isKeyboardOpen,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
      }
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      const now = performance.now();
      frameCount++;

      if (now >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        setPerformance(prev => ({ ...prev, fps }));
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);

    // Memory usage (if available)
    if ('memory' in performance) {
      const updateMemory = () => {
        const memInfo = (performance as any).memory;
        setPerformance(prev => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit
        }));
      };

      const memoryInterval = setInterval(updateMemory, 5000);
      return () => {
        cancelAnimationFrame(rafId);
        clearInterval(memoryInterval);
      };
    }

    return () => cancelAnimationFrame(rafId);
  }, []);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      setIsAtTop(currentScrollY <= 10);
      setIsAtBottom(currentScrollY >= maxScroll - 10);
      setScrollDirection(currentScrollY > lastScrollY.current ? 'down' : 'up');
      setIsScrolling(true);

      lastScrollY.current = currentScrollY;

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
        setScrollDirection(null);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // Battery API (if available)
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setDeviceInfo(prev => ({
            ...prev,
            batteryLevel: battery.level,
            isLowPowerMode: battery.level < 0.2 || !battery.charging,
          }));
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  // Touch gesture handling
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setGestureState({
      isActive: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
      type: null,
    });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setGestureState(prev => {
      const deltaX = touch.clientX - prev.startX;
      const deltaY = touch.clientY - prev.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / 16.67; // Approximate velocity

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      return {
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX,
        deltaY,
        velocity,
        direction,
        type: distance > 10 ? 'swipe' : 'tap',
      };
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    setGestureState(prev => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  // Optimized image loading based on device capabilities
  const getOptimizedImageUrl = useCallback((baseUrl: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    if (!baseUrl) return '';

    const { pixelRatio, connection, supportsWebP, supportsAVIF } = deviceInfo;
    
    // Determine optimal size based on device and connection
    let targetSize = size;
    if (connection === 'slow' && size === 'large') {
      targetSize = 'medium';
    }

    // Size multipliers
    const sizeMap = {
      small: pixelRatio > 1 ? 400 : 300,
      medium: pixelRatio > 1 ? 800 : 600,
      large: pixelRatio > 1 ? 1200 : 1000,
    };

    const width = sizeMap[targetSize];
    
    // Format selection
    let format = 'jpg';
    if (supportsAVIF) format = 'avif';
    else if (supportsWebP) format = 'webp';

    // Construct optimized URL (assuming a service like Cloudinary or similar)
    return `${baseUrl}?w=${width}&f=${format}&q=auto`;
  }, [deviceInfo]);

  // Optimized video settings
  const getOptimizedVideoSettings = useCallback(() => {
    const { connection, batteryLevel, isLowPowerMode } = deviceInfo;
    
    let quality = 'auto';
    let autoplay = true;
    let preload = 'metadata';

    if (connection === 'slow' || isLowPowerMode || (batteryLevel && batteryLevel < 0.3)) {
      quality = 'low';
      autoplay = false;
      preload = 'none';
    }

    return { quality, autoplay, preload };
  }, [deviceInfo]);

  // Performance-aware component rendering
  const shouldReduceAnimations = useCallback(() => {
    return deviceInfo.prefersReducedMotion || performance.fps < 30 || deviceInfo.isLowPowerMode;
  }, [deviceInfo, performance]);

  // Lazy loading threshold based on device
  const getLazyLoadingOffset = useCallback(() => {
    if (deviceInfo.connection === 'slow') return '50px';
    if (deviceInfo.isMobile) return '100px';
    return '200px';
  }, [deviceInfo]);

  return {
    // Device information
    deviceInfo,
    viewport,
    performance,
    gestureState,

    // Scroll state
    isScrolling,
    scrollDirection,
    isAtTop,
    isAtBottom,

    // Touch event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Optimization helpers
    getOptimizedImageUrl,
    getOptimizedVideoSettings,
    shouldReduceAnimations,
    getLazyLoadingOffset,

    // Utility functions
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    hasTouch: deviceInfo.hasTouch,
    isLowPerformance: performance.fps < 30 || deviceInfo.isLowPowerMode,
    isSlowConnection: deviceInfo.connection === 'slow',
  };
};