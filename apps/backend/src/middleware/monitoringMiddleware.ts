/**
 * Comprehensive Monitoring Middleware
 * Implements request/response logging, performance monitoring, and health metrics
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  error?: string;
  timestamp: Date;
}

interface SystemHealthMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  lastUpdate: Date;
}

class MonitoringService {
  private metrics: RequestMetrics[] = [];
  private healthMetrics: SystemHealthMetrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    lastUpdate: new Date()
  };

  // Keep only last 1000 requests in memory
  private readonly MAX_METRICS = 1000;

  recordRequest(metrics: RequestMetrics) {
    this.metrics.push(metrics);
    
    // Trim old metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Update health metrics
    this.updateHealthMetrics(metrics);

    // Log significant events
    this.logSignificantEvents(metrics);
  }

  private updateHealthMetrics(metrics: RequestMetrics) {
    this.healthMetrics.requestCount++;
    if (metrics.statusCode >= 400) {
      this.healthMetrics.errorCount++;
    }

    // Update average response time (rolling average)
    const currentAvg = this.healthMetrics.averageResponseTime;
    const newAvg = currentAvg === 0 
      ? metrics.responseTime 
      : (currentAvg * 0.9) + (metrics.responseTime * 0.1);
    
    this.healthMetrics.averageResponseTime = newAvg;
    this.healthMetrics.memoryUsage = process.memoryUsage();
    this.healthMetrics.uptime = process.uptime();
    this.healthMetrics.lastUpdate = new Date();
  }

  private logSignificantEvents(metrics: RequestMetrics) {
    // Log slow requests (>5 seconds)
    if (metrics.responseTime > 5000) {
      logger.warn('Slow request detected', {
        path: metrics.path,
        method: metrics.method,
        responseTime: metrics.responseTime,
        userId: metrics.userId,
        ip: metrics.ip
      });
    }

    // Log errors
    if (metrics.statusCode >= 500) {
      logger.error('Server error occurred', {
        path: metrics.path,
        method: metrics.method,
        statusCode: metrics.statusCode,
        error: metrics.error,
        userId: metrics.userId,
        ip: metrics.ip
      });
    }

    // Log security-related events
    if (metrics.statusCode === 401 || metrics.statusCode === 403) {
      logger.warn('Authentication/Authorization failure', {
        path: metrics.path,
        method: metrics.method,
        statusCode: metrics.statusCode,
        ip: metrics.ip,
        userAgent: metrics.userAgent
      });
    }
  }

  getHealthMetrics(): SystemHealthMetrics {
    return { ...this.healthMetrics };
  }

  getRecentMetrics(limit: number = 100): RequestMetrics[] {
    return this.metrics.slice(-limit);
  }

  getErrorRate(): number {
    if (this.healthMetrics.requestCount === 0) return 0;
    return (this.healthMetrics.errorCount / this.healthMetrics.requestCount) * 100;
  }

  getTopErrors(limit: number = 10): Array<{ path: string; count: number }> {
    const errorPaths = this.metrics
      .filter(m => m.statusCode >= 400)
      .reduce((acc, m) => {
        const key = `${m.method} ${m.path}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(errorPaths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([path, count]) => ({ path, count }));
  }

  getSlowestEndpoints(limit: number = 10): Array<{ path: string; avgResponseTime: number }> {
    const pathTimes = this.metrics.reduce((acc, m) => {
      const key = `${m.method} ${m.path}`;
      if (!acc[key]) {
        acc[key] = { total: 0, count: 0 };
      }
      acc[key].total += m.responseTime;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(pathTimes)
      .map(([path, data]) => ({
        path,
        avgResponseTime: data.total / data.count
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit);
  }

  // Memory leak detection
  checkMemoryHealth(): { healthy: boolean; warning?: string } {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;

    // Warning thresholds
    if (heapUsedMB > 500) {
      return { 
        healthy: false, 
        warning: `High heap usage: ${heapUsedMB.toFixed(2)}MB` 
      };
    }

    if (rssMB > 1000) {
      return { 
        healthy: false, 
        warning: `High RSS memory usage: ${rssMB.toFixed(2)}MB` 
      };
    }

    const heapUtilization = (heapUsedMB / heapTotalMB) * 100;
    if (heapUtilization > 85) {
      return { 
        healthy: false, 
        warning: `High heap utilization: ${heapUtilization.toFixed(1)}%` 
      };
    }

    return { healthy: true };
  }
}

const monitoringService = new MonitoringService();

export const requestMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const originalSend = res.send;

  // Capture response
  res.send = function(body: any) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    const metrics: RequestMetrics = {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userId: (req as any).user?.id,
      timestamp: new Date()
    };

    // Add error details if available
    if (res.statusCode >= 400 && body) {
      try {
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        metrics.error = parsedBody.error || parsedBody.message;
      } catch (e) {
        metrics.error = 'Unknown error';
      }
    }

    monitoringService.recordRequest(metrics);

    return originalSend.call(this, body);
  };

  next();
};

// Health check endpoint handler
export const healthCheckHandler = (req: Request, res: Response) => {
  const healthMetrics = monitoringService.getHealthMetrics();
  const memoryHealth = monitoringService.checkMemoryHealth();
  const errorRate = monitoringService.getErrorRate();

  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    metrics: {
      requests: {
        total: healthMetrics.requestCount,
        errors: healthMetrics.errorCount,
        errorRate: parseFloat(errorRate.toFixed(2))
      },
      performance: {
        averageResponseTime: parseFloat(healthMetrics.averageResponseTime.toFixed(2)),
        slowRequestThreshold: 5000
      },
      memory: {
        usage: healthMetrics.memoryUsage,
        healthy: memoryHealth.healthy,
        warning: memoryHealth.warning
      },
      system: {
        uptime: healthMetrics.uptime,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }
  };

  // Determine overall health status
  if (!memoryHealth.healthy || errorRate > 10) {
    status.status = 'degraded';
  }

  if (errorRate > 25) {
    status.status = 'unhealthy';
  }

  const statusCode = status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(status);
};

// Detailed monitoring dashboard endpoint
export const monitoringDashboardHandler = (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  
  const dashboard = {
    overview: monitoringService.getHealthMetrics(),
    errorRate: monitoringService.getErrorRate(),
    topErrors: monitoringService.getTopErrors(),
    slowestEndpoints: monitoringService.getSlowestEndpoints(),
    recentRequests: monitoringService.getRecentMetrics(limit),
    memoryHealth: monitoringService.checkMemoryHealth(),
    timestamp: new Date().toISOString()
  };

  res.json(dashboard);
};

// Export the monitoring service for use in other modules
export { monitoringService };