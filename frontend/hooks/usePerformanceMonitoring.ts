'use client';

import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface UsePerformanceMonitoringOptions {
  reportWebVitals?: boolean;
  logToConsole?: boolean;
  reportEndpoint?: string;
  sampleRate?: number;
}

declare global {
  interface Window {
    webVitals?: {
      getFCP: (callback: (metric: any) => void) => void;
      getLCP: (callback: (metric: any) => void) => void;
      getFID: (callback: (metric: any) => void) => void;
      getCLS: (callback: (metric: any) => void) => void;
      getTTFB: (callback: (metric: any) => void) => void;
    };
  }
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const {
    reportWebVitals = true,
    logToConsole = process.env.NODE_ENV === 'development',
    reportEndpoint,
    sampleRate = 1.0
  } = options;

  const metricsRef = useRef<Partial<PerformanceMetrics>>({});
  const reportedRef = useRef(false);

  const shouldSample = useCallback(() => {
    return Math.random() < sampleRate;
  }, [sampleRate]);

  const reportMetric = useCallback(async (name: string, value: number, metadata?: any) => {
    if (!shouldSample()) return;

    const metric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      ...metadata
    };

    if (logToConsole) {
      console.log(`[Performance] ${name}:`, metric);
    }

    if (reportEndpoint) {
      try {
        await fetch(reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metric),
        });
      } catch (error) {
        console.warn('Failed to report performance metric:', error);
      }
    }
  }, [shouldSample, logToConsole, reportEndpoint]);

  const measureComponentRender = useCallback((componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      reportMetric('component_render_time', renderTime, {
        component: componentName,
        type: 'render'
      });
    };
  }, [reportMetric]);

  const measureAsyncOperation = useCallback(<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    return operation().then(
      (result) => {
        const endTime = performance.now();
        const operationTime = endTime - startTime;
        
        reportMetric('async_operation_time', operationTime, {
          operation: operationName,
          status: 'success'
        });
        
        return result;
      },
      (error) => {
        const endTime = performance.now();
        const operationTime = endTime - startTime;
        
        reportMetric('async_operation_time', operationTime, {
          operation: operationName,
          status: 'error',
          error: error.message
        });
        
        throw error;
      }
    );
  }, [reportMetric]);

  const measurePageLoad = useCallback(() => {
    if (!window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ssl: navigation.connectEnd - navigation.secureConnectionStart,
        ttfb: navigation.responseStart - navigation.requestStart,
        download: navigation.responseEnd - navigation.responseStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        domComplete: navigation.domComplete - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart
      };

      Object.entries(metrics).forEach(([key, value]) => {
        if (value > 0) {
          reportMetric(`page_load_${key}`, value);
        }
      });
    }
  }, [reportMetric]);

  const observeWebVitals = useCallback(() => {
    if (!reportWebVitals || typeof window === 'undefined') return;

    // Dynamically import web-vitals
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        metricsRef.current.cls = metric.value;
        reportMetric('cls', metric.value, metric);
      });

      getFID((metric) => {
        metricsRef.current.fid = metric.value;
        reportMetric('fid', metric.value, metric);
      });

      getFCP((metric) => {
        metricsRef.current.fcp = metric.value;
        reportMetric('fcp', metric.value, metric);
      });

      getLCP((metric) => {
        metricsRef.current.lcp = metric.value;
        reportMetric('lcp', metric.value, metric);
      });

      getTTFB((metric) => {
        metricsRef.current.ttfb = metric.value;
        reportMetric('ttfb', metric.value, metric);
      });
    }).catch(() => {
      // Fallback if web-vitals is not available
      console.warn('web-vitals not available, using fallback measurements');
    });
  }, [reportWebVitals, reportMetric]);

  const getResourceTimings = useCallback(() => {
    if (!window.performance) return [];

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    return resources.map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      size: resource.transferSize,
      duration: resource.responseEnd - resource.fetchStart,
      cached: resource.transferSize === 0
    }));
  }, []);

  const measureLargestResources = useCallback(() => {
    const resources = getResourceTimings();
    const largestResources = resources
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    largestResources.forEach((resource, index) => {
      reportMetric('large_resource', resource.size, {
        url: resource.name,
        type: resource.type,
        rank: index + 1,
        duration: resource.duration,
        cached: resource.cached
      });
    });
  }, [getResourceTimings, reportMetric]);

  useEffect(() => {
    if (typeof window === 'undefined' || reportedRef.current) return;

    // Start monitoring when component mounts
    const timeoutId = setTimeout(() => {
      observeWebVitals();
      measurePageLoad();
      measureLargestResources();
      reportedRef.current = true;
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [observeWebVitals, measurePageLoad, measureLargestResources]);

  return {
    reportMetric,
    measureComponentRender,
    measureAsyncOperation,
    getResourceTimings,
    metrics: metricsRef.current
  };
}

export default usePerformanceMonitoring;