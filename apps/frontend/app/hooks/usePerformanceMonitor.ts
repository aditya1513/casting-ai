'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  renderCount: number;
  memoryUsage?: number;
  jankCount: number;
  slowFrames: number;
}

interface UsePerformanceMonitorOptions {
  enableMemoryTracking?: boolean;
  fpsThreshold?: number;
  logToConsole?: boolean;
  reportToAnalytics?: boolean;
}

export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) {
  const {
    enableMemoryTracking = true,
    fpsThreshold = 30,
    logToConsole = process.env.NODE_ENV === 'development',
    reportToAnalytics = false,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    renderCount: 0,
    memoryUsage: undefined,
    jankCount: 0,
    slowFrames: 0,
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const renderTimeRef = useRef(performance.now());
  const jankCountRef = useRef(0);
  const slowFramesRef = useRef(0);
  const rafIdRef = useRef<number>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // Measure FPS
  const measureFPS = useCallback(() => {
    frameCountRef.current++;
    const currentTime = performance.now();
    const delta = currentTime - lastFrameTimeRef.current;

    // Check for jank (frame took longer than 50ms)
    if (delta > 50) {
      jankCountRef.current++;
    }

    // Check for slow frames (below threshold FPS)
    if (delta > 1000 / fpsThreshold) {
      slowFramesRef.current++;
    }

    // Calculate FPS every second
    if (delta >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / delta);

      setMetrics(prev => ({
        ...prev,
        fps,
        jankCount: jankCountRef.current,
        slowFrames: slowFramesRef.current,
      }));

      // Log performance warnings
      if (logToConsole && fps < fpsThreshold) {
        console.warn(`[${componentName}] Low FPS detected: ${fps} (threshold: ${fpsThreshold})`);
      }

      frameCountRef.current = 0;
      lastFrameTimeRef.current = currentTime;
    }

    rafIdRef.current = requestAnimationFrame(measureFPS);
  }, [componentName, fpsThreshold, logToConsole]);

  // Track memory usage
  const trackMemory = useCallback(() => {
    if (!enableMemoryTracking) return;

    // Check if memory API is available
    if ('memory' in performance && (performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const usedMemoryMB = Math.round(memoryInfo.usedJSHeapSize / 1048576);

      setMetrics(prev => ({
        ...prev,
        memoryUsage: usedMemoryMB,
      }));

      // Warn if memory usage is high
      if (logToConsole && usedMemoryMB > 100) {
        console.warn(`[${componentName}] High memory usage: ${usedMemoryMB}MB`);
      }
    }
  }, [componentName, enableMemoryTracking, logToConsole]);

  // Track render performance
  useEffect(() => {
    renderCountRef.current++;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - renderTimeRef.current;
    renderTimeRef.current = currentTime;

    setMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
      renderTime: timeSinceLastRender,
    }));

    if (logToConsole && renderCountRef.current > 1) {
      console.debug(
        `[${componentName}] Render #${renderCountRef.current}, Time: ${timeSinceLastRender.toFixed(2)}ms`
      );
    }
  });

  // Start monitoring
  useEffect(() => {
    measureFPS();

    // Set up memory tracking interval
    if (enableMemoryTracking) {
      trackMemory(); // Initial measurement
      metricsIntervalRef.current = setInterval(trackMemory, 5000);
    }

    // Report to analytics if enabled
    if (reportToAnalytics) {
      const reportInterval = setInterval(() => {
        reportMetrics(componentName, metrics);
      }, 30000); // Report every 30 seconds

      return () => {
        clearInterval(reportInterval);
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
        }
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [measureFPS, trackMemory, reportToAnalytics, componentName, metrics, enableMemoryTracking]);

  // Mark performance events
  const markEvent = useCallback(
    (eventName: string) => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark(`${componentName}-${eventName}`);

        if (logToConsole) {
          console.debug(`[${componentName}] Performance mark: ${eventName}`);
        }
      }
    },
    [componentName, logToConsole]
  );

  // Measure between two marks
  const measureBetween = useCallback(
    (startMark: string, endMark: string) => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        try {
          performance.measure(
            `${componentName}-${startMark}-to-${endMark}`,
            `${componentName}-${startMark}`,
            `${componentName}-${endMark}`
          );

          const measures = performance.getEntriesByName(
            `${componentName}-${startMark}-to-${endMark}`
          );

          if (measures.length > 0 && logToConsole) {
            console.debug(
              `[${componentName}] ${startMark} to ${endMark}: ${measures[0].duration.toFixed(2)}ms`
            );
          }

          return measures[0]?.duration || 0;
        } catch (error) {
          console.error(`Failed to measure performance: ${error}`);
          return 0;
        }
      }
      return 0;
    },
    [componentName, logToConsole]
  );

  return {
    metrics,
    markEvent,
    measureBetween,
    isHealthy: metrics.fps >= fpsThreshold && metrics.jankCount < 5,
  };
}

// Report metrics to analytics service
function reportMetrics(componentName: string, metrics: PerformanceMetrics) {
  // Send to analytics endpoint
  fetch('/api/analytics/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      component: componentName,
      metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }),
  }).catch(err => {
    console.error('Failed to report performance metrics:', err);
  });
}

// Hook for tracking specific operations
export function useOperationPerformance(operationName: string) {
  const startTimeRef = useRef<number>();

  const startOperation = useCallback(() => {
    startTimeRef.current = performance.now();
    performance.mark(`operation-${operationName}-start`);
  }, [operationName]);

  const endOperation = useCallback(() => {
    if (startTimeRef.current) {
      const duration = performance.now() - startTimeRef.current;
      performance.mark(`operation-${operationName}-end`);

      try {
        performance.measure(
          `operation-${operationName}`,
          `operation-${operationName}-start`,
          `operation-${operationName}-end`
        );
      } catch (error) {
        console.error(`Failed to measure operation: ${error}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Operation: ${operationName}] Duration: ${duration.toFixed(2)}ms`);
      }

      return duration;
    }
    return 0;
  }, [operationName]);

  return { startOperation, endOperation };
}

export default usePerformanceMonitor;
