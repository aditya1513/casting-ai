/**
 * Performance Monitoring and Benchmarking Middleware
 * Real-time performance tracking, metrics collection, and alerting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { EventEmitter } from 'events';

// ==================== TYPES ====================

export interface PerformanceMetrics {
  responseTime: number;
  dbQueryTime?: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  route: string;
  method: string;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip: string;
  contentLength?: number;
  compression?: string;
}

export interface PerformanceAlert {
  type: 'slow_response' | 'high_memory' | 'high_cpu' | 'error_spike' | 'high_load';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: any;
  timestamp: Date;
}

export interface PerformanceStats {
  requests: {
    total: number;
    perSecond: number;
    perMinute: number;
    perHour: number;
  };
  responseTime: {
    average: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  errors: {
    total: number;
    rate: number;
    byStatus: Record<number, number>;
  };
  routes: {
    [route: string]: {
      count: number;
      averageTime: number;
      errorRate: number;
    };
  };
}

// ==================== PERFORMANCE MONITOR ====================

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 10000;
  private readonly alertThresholds = {
    slowResponse: 2000, // 2 seconds
    highMemory: 1024 * 1024 * 1024, // 1GB
    highCpu: 80, // 80%
    highErrorRate: 0.1, // 10%
  };
  
  private intervalId?: NodeJS.Timeout;
  private startTime = Date.now();
  private lastCpuUsage?: NodeJS.CpuUsage;

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlerts();
      this.cleanupOldMetrics();
    }, 30000); // Every 30 seconds

    logger.info('✅ Performance monitoring started');
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    // Emit system metrics event
    this.emit('system:metrics', {
      memory: memoryUsage,
      cpu: cpuUsage,
      uptime: process.uptime(),
      timestamp: new Date(),
    });
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    
    if (recentMetrics.length === 0) return;

    // Check average response time
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    if (avgResponseTime > this.alertThresholds.slowResponse) {
      this.emitAlert({
        type: 'slow_response',
        severity: avgResponseTime > 5000 ? 'critical' : 'high',
        message: `High average response time: ${avgResponseTime.toFixed(0)}ms`,
        metrics: { averageResponseTime: avgResponseTime, sampleSize: recentMetrics.length },
        timestamp: new Date(),
      });
    }

    // Check memory usage
    const currentMemory = process.memoryUsage();
    if (currentMemory.rss > this.alertThresholds.highMemory) {
      this.emitAlert({
        type: 'high_memory',
        severity: currentMemory.rss > this.alertThresholds.highMemory * 1.5 ? 'critical' : 'high',
        message: `High memory usage: ${Math.round(currentMemory.rss / 1024 / 1024)}MB`,
        metrics: currentMemory,
        timestamp: new Date(),
      });
    }

    // Check error rate
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / recentMetrics.length;
    if (errorRate > this.alertThresholds.highErrorRate) {
      this.emitAlert({
        type: 'error_spike',
        severity: errorRate > 0.25 ? 'critical' : 'high',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        metrics: { errorRate, errorCount, totalRequests: recentMetrics.length },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Add performance metric
   */
  public addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Emit metric event for real-time monitoring
    this.emit('metric:added', metric);
    
    // Log slow requests
    if (metric.responseTime > 1000) {
      logger.warn('Slow request detected', {
        route: metric.route,
        method: metric.method,
        responseTime: `${metric.responseTime}ms`,
        statusCode: metric.statusCode,
        userId: metric.userId,
      });
    }

    // Log errors
    if (metric.statusCode >= 400) {
      logger.error('Request error', {
        route: metric.route,
        method: metric.method,
        statusCode: metric.statusCode,
        responseTime: `${metric.responseTime}ms`,
        userId: metric.userId,
        ip: metric.ip,
      });
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(timeWindow?: number): PerformanceStats {
    const windowMetrics = timeWindow ? this.getRecentMetrics(timeWindow) : this.metrics;
    
    if (windowMetrics.length === 0) {
      return this.getEmptyStats();
    }

    // Calculate response time statistics
    const responseTimes = windowMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const responseTimeStats = {
      average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p50: this.getPercentile(responseTimes, 0.5),
      p90: this.getPercentile(responseTimes, 0.9),
      p95: this.getPercentile(responseTimes, 0.95),
      p99: this.getPercentile(responseTimes, 0.99),
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
    };

    // Calculate request statistics
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;
    const oneSecondAgo = now - 1000;

    const requestStats = {
      total: windowMetrics.length,
      perHour: windowMetrics.filter(m => m.timestamp.getTime() > oneHourAgo).length,
      perMinute: windowMetrics.filter(m => m.timestamp.getTime() > oneMinuteAgo).length,
      perSecond: windowMetrics.filter(m => m.timestamp.getTime() > oneSecondAgo).length,
    };

    // Calculate error statistics
    const errorMetrics = windowMetrics.filter(m => m.statusCode >= 400);
    const errorsByStatus = errorMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Calculate route statistics
    const routeStats = windowMetrics.reduce((acc, m) => {
      const key = `${m.method} ${m.route}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0, errors: 0 };
      }
      acc[key].count++;
      acc[key].totalTime += m.responseTime;
      if (m.statusCode >= 400) {
        acc[key].errors++;
      }
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; errors: number }>);

    const routes = Object.entries(routeStats).reduce((acc, [route, stats]) => {
      acc[route] = {
        count: stats.count,
        averageTime: stats.totalTime / stats.count,
        errorRate: stats.errors / stats.count,
      };
      return acc;
    }, {} as Record<string, { count: number; averageTime: number; errorRate: number }>);

    return {
      requests: requestStats,
      responseTime: responseTimeStats,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      errors: {
        total: errorMetrics.length,
        rate: errorMetrics.length / windowMetrics.length,
        byStatus: errorsByStatus,
      },
      routes,
    };
  }

  /**
   * Get recent metrics within time window
   */
  private getRecentMetrics(timeWindowMs: number): PerformanceMetrics[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.metrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Calculate percentile
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Emit performance alert
   */
  private emitAlert(alert: PerformanceAlert): void {
    this.emit('alert', alert);
    
    logger.warn('Performance alert', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      metrics: alert.metrics,
    });
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      const removeCount = this.metrics.length - this.maxMetricsHistory;
      this.metrics.splice(0, removeCount);
      
      logger.debug(`Cleaned up ${removeCount} old performance metrics`);
    }
  }

  /**
   * Get empty stats structure
   */
  private getEmptyStats(): PerformanceStats {
    return {
      requests: { total: 0, perSecond: 0, perMinute: 0, perHour: 0 },
      responseTime: { average: 0, p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0 },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      errors: { total: 0, rate: 0, byStatus: {} },
      routes: {},
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  public exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const stats = this.getStats();
    
    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(stats);
    }
    
    return JSON.stringify(stats, null, 2);
  }

  /**
   * Format metrics in Prometheus format
   */
  private formatPrometheusMetrics(stats: PerformanceStats): string {
    const metrics: string[] = [];
    
    // Request metrics
    metrics.push(`# HELP castmatch_requests_total Total number of requests`);
    metrics.push(`# TYPE castmatch_requests_total counter`);
    metrics.push(`castmatch_requests_total ${stats.requests.total}`);
    
    // Response time metrics
    metrics.push(`# HELP castmatch_response_time_seconds Response time in seconds`);
    metrics.push(`# TYPE castmatch_response_time_seconds histogram`);
    metrics.push(`castmatch_response_time_seconds_sum ${stats.responseTime.average * stats.requests.total / 1000}`);
    metrics.push(`castmatch_response_time_seconds_count ${stats.requests.total}`);
    
    // Memory metrics
    metrics.push(`# HELP castmatch_memory_usage_bytes Memory usage in bytes`);
    metrics.push(`# TYPE castmatch_memory_usage_bytes gauge`);
    metrics.push(`castmatch_memory_usage_bytes{type="rss"} ${stats.memory.rss}`);
    metrics.push(`castmatch_memory_usage_bytes{type="heapUsed"} ${stats.memory.heapUsed}`);
    metrics.push(`castmatch_memory_usage_bytes{type="heapTotal"} ${stats.memory.heapTotal}`);
    
    // Error metrics
    metrics.push(`# HELP castmatch_errors_total Total number of errors`);
    metrics.push(`# TYPE castmatch_errors_total counter`);
    metrics.push(`castmatch_errors_total ${stats.errors.total}`);
    
    return metrics.join('\n');
  }

  /**
   * Stop monitoring and cleanup
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    logger.info('Performance monitoring stopped');
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// ==================== MIDDLEWARE ====================

/**
 * Express middleware for performance tracking
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const startCpuUsage = process.cpuUsage();
  const startMemory = process.memoryUsage();

  // Track database query time if available
  let dbQueryStartTime: number | undefined;
  const originalQuery = (req as any).dbPool?.query;
  if (originalQuery) {
    (req as any).dbPool.query = function(...args: any[]) {
      dbQueryStartTime = Date.now();
      return originalQuery.apply(this, args);
    };
  }

  // Hook into response completion
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(body: any) {
    recordMetrics();
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    recordMetrics();
    return originalJson.call(this, body);
  };

  function recordMetrics() {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    const cpuUsage = process.cpuUsage(startCpuUsage);
    
    // Calculate content length
    let contentLength: number | undefined;
    const contentLengthHeader = res.get('Content-Length');
    if (contentLengthHeader) {
      contentLength = parseInt(contentLengthHeader);
    }

    const metric: PerformanceMetrics = {
      responseTime,
      dbQueryTime: dbQueryStartTime ? endTime - dbQueryStartTime : undefined,
      memoryUsage: endMemory,
      cpuUsage,
      route: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      timestamp: new Date(startTime),
      userId: (req as any).user?.id,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      contentLength,
      compression: res.get('Content-Encoding'),
    };

    performanceMonitor.addMetric(metric);
  }

  next();
};

/**
 * Performance dashboard endpoint handler
 */
export const performanceDashboardHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const timeWindow = req.query.window ? parseInt(req.query.window as string) * 1000 : undefined;
    const format = req.query.format as 'json' | 'prometheus' || 'json';
    
    if (format === 'prometheus') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(performanceMonitor.exportMetrics('prometheus'));
      return;
    }

    const stats = performanceMonitor.getStats(timeWindow);
    
    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        timeWindow: timeWindow ? `${timeWindow / 1000}s` : 'all',
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    logger.error('Failed to get performance stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance statistics',
    });
  }
};

/**
 * Performance benchmark handler
 */
export const performanceBenchmarkHandler = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const iterations = parseInt(req.query.iterations as string) || 1000;
    const testType = req.query.type as string || 'cpu';
    
    let results: any = {};

    switch (testType) {
      case 'cpu':
        results = await runCpuBenchmark(iterations);
        break;
      case 'memory':
        results = await runMemoryBenchmark(iterations);
        break;
      case 'database':
        results = await runDatabaseBenchmark(req, iterations);
        break;
      default:
        results = await runComprehensiveBenchmark(req, iterations);
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      benchmark: {
        type: testType,
        iterations,
        totalTime,
        results,
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
      },
    });

  } catch (error) {
    logger.error('Benchmark failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Benchmark execution failed',
    });
  }
};

// ==================== BENCHMARK FUNCTIONS ====================

async function runCpuBenchmark(iterations: number): Promise<any> {
  const startTime = Date.now();
  const startCpu = process.cpuUsage();
  
  // CPU-intensive calculation
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
  }
  
  const endTime = Date.now();
  const cpuUsage = process.cpuUsage(startCpu);
  
  return {
    executionTime: endTime - startTime,
    iterationsPerSecond: Math.round(iterations / ((endTime - startTime) / 1000)),
    cpuUsage,
    result: result.toFixed(2),
  };
}

async function runMemoryBenchmark(iterations: number): Promise<any> {
  const startMemory = process.memoryUsage();
  const startTime = Date.now();
  
  // Memory allocation test
  const arrays: number[][] = [];
  for (let i = 0; i < iterations; i++) {
    arrays.push(new Array(1000).fill(Math.random()));
  }
  
  const midMemory = process.memoryUsage();
  
  // Cleanup
  arrays.length = 0;
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  return {
    executionTime: endTime - startTime,
    memoryAllocated: midMemory.heapUsed - startMemory.heapUsed,
    memoryFreed: midMemory.heapUsed - endMemory.heapUsed,
    peakMemory: midMemory.heapUsed,
    finalMemory: endMemory.heapUsed,
  };
}

async function runDatabaseBenchmark(req: Request, iterations: number): Promise<any> {
  const startTime = Date.now();
  const queries: number[] = [];
  
  try {
    for (let i = 0; i < Math.min(iterations, 100); i++) { // Limit DB queries to 100
      const queryStart = Date.now();
      
      // Simple health check query
      await (req as any).dbPool?.query('SELECT 1 as health_check');
      
      const queryTime = Date.now() - queryStart;
      queries.push(queryTime);
    }
    
    const totalTime = Date.now() - startTime;
    queries.sort((a, b) => a - b);
    
    return {
      executionTime: totalTime,
      totalQueries: queries.length,
      averageQueryTime: queries.reduce((sum, time) => sum + time, 0) / queries.length,
      medianQueryTime: queries[Math.floor(queries.length / 2)],
      minQueryTime: Math.min(...queries),
      maxQueryTime: Math.max(...queries),
      queriesPerSecond: Math.round(queries.length / (totalTime / 1000)),
    };
  } catch (error) {
    return {
      error: 'Database benchmark failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runComprehensiveBenchmark(req: Request, iterations: number): Promise<any> {
  const startTime = Date.now();
  
  // Run all benchmarks with reduced iterations
  const reducedIterations = Math.floor(iterations / 3);
  
  const [cpu, memory, database] = await Promise.all([
    runCpuBenchmark(reducedIterations),
    runMemoryBenchmark(reducedIterations),
    runDatabaseBenchmark(req, Math.min(reducedIterations, 50)),
  ]);
  
  return {
    executionTime: Date.now() - startTime,
    cpu,
    memory,
    database,
  };
}

export default performanceMonitor;