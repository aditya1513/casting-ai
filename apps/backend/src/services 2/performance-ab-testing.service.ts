/**
 * Performance Monitoring and A/B Testing Service
 * Tracks ML model performance, runs experiments, and provides analytics
 */

import { prisma } from '../config/database';
import { CacheManager } from '../config/redis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { performance } from 'perf_hooks';
import * as crypto from 'crypto';

/**
 * Experiment configuration
 */
export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number; // Traffic allocation percentage
    config: any; // Variant-specific configuration
  }>;
  metrics: string[]; // Metrics to track
  startDate: Date;
  endDate?: Date;
  enabled: boolean;
  targetAudience?: {
    segments?: string[];
    percentage?: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * ML Model metrics
 */
export interface ModelMetrics {
  modelName: string;
  version: string;
  timestamp: Date;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    latency: number;
    throughput: number;
  };
  predictionCount: number;
  errorRate: number;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  experimentId: string;
  variantId: string;
  metrics: Map<string, {
    count: number;
    sum: number;
    mean: number;
    min: number;
    max: number;
    stdDev: number;
  }>;
  conversions: number;
  sampleSize: number;
  confidence: number;
  isSignificant: boolean;
}

class PerformanceABTestingService {
  private experiments: Map<string, ExperimentConfig> = new Map();
  private metricsBuffer: PerformanceMetrics[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startMetricsFlush();
    this.loadExperiments();
  }

  /**
   * Start periodic metrics flush
   */
  private startMetricsFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Load active experiments from database
   */
  private async loadExperiments(): Promise<void> {
    try {
      const experiments = await prisma.experiment.findMany({
        where: {
          enabled: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
      });

      experiments.forEach(exp => {
        this.experiments.set(exp.id, exp as any);
      });

      logger.info(`Loaded ${experiments.length} active experiments`);
    } catch (error) {
      logger.error('Failed to load experiments:', error);
    }
  }

  /**
   * Track API performance
   */
  async trackPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      endpoint,
      method,
      responseTime,
      statusCode,
      userId,
      metadata,
    };

    this.metricsBuffer.push(metric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flushMetrics();
    }

    // Real-time alerting for slow responses
    if (responseTime > 5000) {
      logger.warn(`Slow API response: ${endpoint} took ${responseTime}ms`);
      await this.createAlert('SLOW_RESPONSE', {
        endpoint,
        responseTime,
        threshold: 5000,
      });
    }

    // Alert on high error rate
    if (statusCode >= 500) {
      await this.trackErrorRate(endpoint);
    }
  }

  /**
   * Track ML model performance
   */
  async trackModelPerformance(metrics: ModelMetrics): Promise<void> {
    try {
      // Store in database
      await prisma.modelPerformance.create({
        data: {
          modelName: metrics.modelName,
          version: metrics.version,
          accuracy: metrics.metrics.accuracy,
          precision: metrics.metrics.precision,
          recall: metrics.metrics.recall,
          f1Score: metrics.metrics.f1Score,
          latency: metrics.metrics.latency,
          throughput: metrics.metrics.throughput,
          predictionCount: metrics.predictionCount,
          errorRate: metrics.errorRate,
          timestamp: metrics.timestamp,
        },
      });

      // Check for model degradation
      await this.checkModelDegradation(metrics);

      // Update cache with latest metrics
      await CacheManager.set(
        `model_metrics:${metrics.modelName}:${metrics.version}`,
        JSON.stringify(metrics),
        3600
      );
    } catch (error) {
      logger.error('Failed to track model performance:', error);
    }
  }

  /**
   * Check for model performance degradation
   */
  private async checkModelDegradation(metrics: ModelMetrics): Promise<void> {
    const historicalMetrics = await prisma.modelPerformance.findMany({
      where: {
        modelName: metrics.modelName,
        version: metrics.version,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    if (historicalMetrics.length < 10) return;

    // Calculate baseline metrics
    const baseline = {
      accuracy: historicalMetrics.reduce((sum, m) => sum + (m.accuracy || 0), 0) / historicalMetrics.length,
      latency: historicalMetrics.reduce((sum, m) => sum + m.latency, 0) / historicalMetrics.length,
      errorRate: historicalMetrics.reduce((sum, m) => sum + m.errorRate, 0) / historicalMetrics.length,
    };

    // Check for degradation
    const degradationThreshold = 0.1; // 10% degradation
    
    if (metrics.metrics.accuracy && baseline.accuracy > 0) {
      const accuracyDrop = (baseline.accuracy - metrics.metrics.accuracy) / baseline.accuracy;
      if (accuracyDrop > degradationThreshold) {
        await this.createAlert('MODEL_DEGRADATION', {
          modelName: metrics.modelName,
          metric: 'accuracy',
          baseline: baseline.accuracy,
          current: metrics.metrics.accuracy,
          dropPercentage: accuracyDrop * 100,
        });
      }
    }

    // Check latency increase
    const latencyIncrease = (metrics.metrics.latency - baseline.latency) / baseline.latency;
    if (latencyIncrease > 0.5) { // 50% increase
      await this.createAlert('MODEL_LATENCY', {
        modelName: metrics.modelName,
        baseline: baseline.latency,
        current: metrics.metrics.latency,
        increasePercentage: latencyIncrease * 100,
      });
    }
  }

  /**
   * Get variant for A/B test
   */
  async getExperimentVariant(
    experimentId: string,
    userId: string
  ): Promise<{
    variantId: string;
    variantConfig: any;
  } | null> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.enabled) {
      return null;
    }

    // Check if experiment has ended
    if (experiment.endDate && experiment.endDate < new Date()) {
      return null;
    }

    // Check target audience
    if (experiment.targetAudience) {
      const isTargeted = await this.checkTargetAudience(userId, experiment.targetAudience);
      if (!isTargeted) {
        return null;
      }
    }

    // Check if user already has a variant assignment
    const cacheKey = `experiment:${experimentId}:user:${userId}`;
    const cached = await CacheManager.get(cacheKey);
    if (cached) {
      const variantId = cached;
      const variant = experiment.variants.find(v => v.id === variantId);
      return variant ? { variantId, variantConfig: variant.config } : null;
    }

    // Assign variant based on weights
    const variantId = this.assignVariant(userId, experiment.variants);
    const variant = experiment.variants.find(v => v.id === variantId);
    
    if (!variant) {
      return null;
    }

    // Cache assignment
    await CacheManager.set(cacheKey, variantId, 86400 * 30); // 30 days

    // Track assignment
    await this.trackExperimentAssignment(experimentId, userId, variantId);

    return {
      variantId,
      variantConfig: variant.config,
    };
  }

  /**
   * Assign variant based on user ID and weights
   */
  private assignVariant(
    userId: string,
    variants: Array<{ id: string; weight: number }>
  ): string {
    // Use consistent hashing for assignment
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
    
    let cumulativeWeight = 0;
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    
    for (const variant of variants) {
      cumulativeWeight += variant.weight / totalWeight;
      if (hashValue <= cumulativeWeight) {
        return variant.id;
      }
    }
    
    return variants[variants.length - 1].id;
  }

  /**
   * Track experiment assignment
   */
  private async trackExperimentAssignment(
    experimentId: string,
    userId: string,
    variantId: string
  ): Promise<void> {
    try {
      await prisma.experimentAssignment.create({
        data: {
          experimentId,
          userId,
          variantId,
          assignedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to track experiment assignment:', error);
    }
  }

  /**
   * Track experiment conversion
   */
  async trackConversion(
    experimentId: string,
    userId: string,
    eventName: string,
    value?: number
  ): Promise<void> {
    try {
      // Get user's variant
      const cacheKey = `experiment:${experimentId}:user:${userId}`;
      const variantId = await CacheManager.get(cacheKey);
      
      if (!variantId) {
        return;
      }

      await prisma.experimentConversion.create({
        data: {
          experimentId,
          userId,
          variantId,
          eventName,
          value,
          timestamp: new Date(),
        },
      });

      // Update experiment metrics
      await this.updateExperimentMetrics(experimentId, variantId, eventName, value);
    } catch (error) {
      logger.error('Failed to track conversion:', error);
    }
  }

  /**
   * Update experiment metrics
   */
  private async updateExperimentMetrics(
    experimentId: string,
    variantId: string,
    eventName: string,
    value?: number
  ): Promise<void> {
    const metricsKey = `experiment_metrics:${experimentId}:${variantId}:${eventName}`;
    const metrics = await CacheManager.get(metricsKey);
    
    let data = metrics ? JSON.parse(metrics) : {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: [],
    };

    data.count++;
    if (value !== undefined) {
      data.sum += value;
      data.min = Math.min(data.min, value);
      data.max = Math.max(data.max, value);
      data.values.push(value);
      
      // Keep only last 1000 values for std dev calculation
      if (data.values.length > 1000) {
        data.values = data.values.slice(-1000);
      }
    }

    await CacheManager.set(metricsKey, JSON.stringify(data), 3600);
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<ExperimentResults[]> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new AppError('Experiment not found', 404);
    }

    const results: ExperimentResults[] = [];

    for (const variant of experiment.variants) {
      // Get assignments
      const assignments = await prisma.experimentAssignment.count({
        where: {
          experimentId,
          variantId: variant.id,
        },
      });

      // Get conversions
      const conversions = await prisma.experimentConversion.findMany({
        where: {
          experimentId,
          variantId: variant.id,
        },
      });

      // Calculate metrics
      const metricsMap = new Map();
      
      for (const metric of experiment.metrics) {
        const metricConversions = conversions.filter(c => c.eventName === metric);
        const values = metricConversions.map(c => c.value || 0);
        
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const mean = sum / values.length;
          const stdDev = Math.sqrt(
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
          );
          
          metricsMap.set(metric, {
            count: metricConversions.length,
            sum,
            mean,
            min: Math.min(...values),
            max: Math.max(...values),
            stdDev,
          });
        }
      }

      // Calculate statistical significance
      const confidence = this.calculateConfidence(
        assignments,
        conversions.length,
        experiment.variants
      );

      results.push({
        experimentId,
        variantId: variant.id,
        metrics: metricsMap,
        conversions: conversions.length,
        sampleSize: assignments,
        confidence,
        isSignificant: confidence >= 0.95,
      });
    }

    return results;
  }

  /**
   * Calculate statistical confidence
   */
  private calculateConfidence(
    sampleSize: number,
    conversions: number,
    variants: any[]
  ): number {
    if (sampleSize < 100) {
      return 0;
    }

    // Simplified confidence calculation
    // In production, use proper statistical tests (chi-square, t-test, etc.)
    const conversionRate = conversions / sampleSize;
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
    const zScore = 1.96; // 95% confidence
    const marginOfError = zScore * standardError;
    
    // Confidence based on margin of error
    const confidence = Math.max(0, Math.min(1, 1 - marginOfError));
    
    return confidence;
  }

  /**
   * Check target audience
   */
  private async checkTargetAudience(
    userId: string,
    targetAudience: any
  ): Promise<boolean> {
    // Implementation would check user segments, demographics, etc.
    // For now, use random sampling based on percentage
    if (targetAudience.percentage) {
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
      return hashValue <= targetAudience.percentage / 100;
    }
    
    return true;
  }

  /**
   * Track error rate
   */
  private async trackErrorRate(endpoint: string): Promise<void> {
    const key = `error_rate:${endpoint}:${new Date().getHours()}`;
    const count = await CacheManager.incr(key);
    
    // Set expiry for 24 hours
    if (count === 1) {
      await CacheManager.expire(key, 86400);
    }
    
    // Alert if error rate is high
    if (count > 10) {
      await this.createAlert('HIGH_ERROR_RATE', {
        endpoint,
        count,
        timeWindow: '1 hour',
      });
    }
  }

  /**
   * Create alert
   */
  private async createAlert(
    type: string,
    data: any
  ): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          type,
          severity: this.getAlertSeverity(type),
          message: this.formatAlertMessage(type, data),
          data: JSON.stringify(data),
          timestamp: new Date(),
        },
      });

      // Send notification for critical alerts
      if (this.getAlertSeverity(type) === 'CRITICAL') {
        // Implementation would send email/SMS/Slack notification
        logger.error(`CRITICAL ALERT: ${type}`, data);
      }
    } catch (error) {
      logger.error('Failed to create alert:', error);
    }
  }

  /**
   * Get alert severity
   */
  private getAlertSeverity(type: string): string {
    const severityMap: Record<string, string> = {
      'MODEL_DEGRADATION': 'CRITICAL',
      'HIGH_ERROR_RATE': 'HIGH',
      'MODEL_LATENCY': 'MEDIUM',
      'SLOW_RESPONSE': 'LOW',
    };
    
    return severityMap[type] || 'LOW';
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(type: string, data: any): string {
    switch (type) {
      case 'MODEL_DEGRADATION':
        return `Model ${data.modelName} ${data.metric} degraded by ${data.dropPercentage.toFixed(2)}%`;
      case 'HIGH_ERROR_RATE':
        return `High error rate on ${data.endpoint}: ${data.count} errors in ${data.timeWindow}`;
      case 'MODEL_LATENCY':
        return `Model ${data.modelName} latency increased by ${data.increasePercentage.toFixed(2)}%`;
      case 'SLOW_RESPONSE':
        return `Slow response on ${data.endpoint}: ${data.responseTime}ms (threshold: ${data.threshold}ms)`;
      default:
        return `Alert: ${type}`;
    }
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await prisma.performanceMetric.createMany({
        data: metrics.map(m => ({
          endpoint: m.endpoint,
          method: m.method,
          responseTime: m.responseTime,
          statusCode: m.statusCode,
          userId: m.userId,
          metadata: m.metadata ? JSON.stringify(m.metadata) : null,
          timestamp: m.timestamp,
        })),
      });

      logger.info(`Flushed ${metrics.length} performance metrics`);
    } catch (error) {
      logger.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer if flush failed
      this.metricsBuffer.unshift(...metrics);
    }
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData(timeRange: { start: Date; end: Date }): Promise<{
    apiMetrics: any;
    modelMetrics: any;
    experiments: any;
    alerts: any;
  }> {
    const [apiMetrics, modelMetrics, experiments, alerts] = await Promise.all([
      this.getAPIMetrics(timeRange),
      this.getModelMetrics(timeRange),
      this.getActiveExperiments(),
      this.getRecentAlerts(),
    ]);

    return {
      apiMetrics,
      modelMetrics,
      experiments,
      alerts,
    };
  }

  /**
   * Get API metrics
   */
  private async getAPIMetrics(timeRange: { start: Date; end: Date }): Promise<any> {
    const metrics = await prisma.performanceMetric.groupBy({
      by: ['endpoint', 'method'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _avg: {
        responseTime: true,
      },
      _count: true,
    });

    return metrics;
  }

  /**
   * Get model metrics
   */
  private async getModelMetrics(timeRange: { start: Date; end: Date }): Promise<any> {
    const metrics = await prisma.modelPerformance.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return metrics;
  }

  /**
   * Get active experiments
   */
  private async getActiveExperiments(): Promise<any> {
    return Array.from(this.experiments.values()).map(exp => ({
      id: exp.id,
      name: exp.name,
      variants: exp.variants.length,
      metrics: exp.metrics,
      enabled: exp.enabled,
    }));
  }

  /**
   * Get recent alerts
   */
  private async getRecentAlerts(): Promise<any> {
    return await prisma.alert.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  /**
   * Cleanup old data
   */
  async cleanup(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    try {
      const [metrics, models, experiments] = await Promise.all([
        prisma.performanceMetric.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.modelPerformance.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.experimentConversion.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
      ]);

      logger.info(`Cleanup complete: ${metrics.count} metrics, ${models.count} model metrics, ${experiments.count} experiment conversions deleted`);
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushMetrics(); // Final flush
    }
  }
}

// Export singleton instance
export const performanceABTestingService = new PerformanceABTestingService();