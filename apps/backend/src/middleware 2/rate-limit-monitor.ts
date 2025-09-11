/**
 * Enhanced Rate Limiting Middleware with Real-time Monitoring
 * Production-grade rate limiting with adaptive limits, monitoring dashboard, and alerting
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface RateLimitRule {
  id: string;
  name: string;
  keyGenerator: (req: Request) => string;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  adaptiveEnabled?: boolean;
  burstAllowance?: number;
  headers?: boolean;
  message?: string | ((req: Request, rateLimitInfo: RateLimitInfo) => string);
  onLimitReached?: (req: Request, rateLimitInfo: RateLimitInfo) => void;
  whitelist?: (req: Request) => boolean;
  priority?: number;
}

export interface RateLimitConfig {
  rules: RateLimitRule[];
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix?: string;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThreshold: number;
    retentionDays: number;
  };
  adaptive: {
    enabled: boolean;
    errorThreshold: number;
    adjustmentFactor: number;
    minLimit: number;
    maxLimit: number;
  };
}

export interface RateLimitInfo {
  rule: RateLimitRule;
  key: string;
  current: number;
  remaining: number;
  resetTime: Date;
  windowMs: number;
  adaptedLimit?: number;
  burstUsed?: number;
  isBlocked: boolean;
}

export interface RateLimitMetrics {
  ruleId: string;
  ruleName: string;
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  currentLimit: number;
  adaptedLimit?: number;
  averageUsage: number;
  peakUsage: number;
  blockRate: number;
  lastResetTime: Date;
  topBlocked: Array<{
    key: string;
    count: number;
    lastBlocked: Date;
  }>;
}

export interface RateLimitAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  alertType: 'threshold_exceeded' | 'burst_detected' | 'anomaly_detected' | 'rule_exhausted';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
}

export interface AdaptiveSettings {
  errorRate: number;
  responseTime: number;
  lastAdjustment: Date;
  adjustmentDirection: 'increase' | 'decrease' | 'stable';
  consecutiveAdjustments: number;
}

const DEFAULT_CONFIG: Partial<RateLimitConfig> = {
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    alertThreshold: 0.8, // 80% of limit
    retentionDays: 7,
  },
  adaptive: {
    enabled: true,
    errorThreshold: 0.1, // 10% error rate
    adjustmentFactor: 0.1, // 10% adjustment
    minLimit: 10,
    maxLimit: 10000,
  },
};

export class RateLimitMonitorMiddleware extends EventEmitter {
  private redis: Redis;
  private config: RateLimitConfig;
  private rules: Map<string, RateLimitRule> = new Map();
  private metrics: Map<string, RateLimitMetrics> = new Map();
  private adaptiveSettings: Map<string, AdaptiveSettings> = new Map();
  private alerts: RateLimitAlert[] = [];
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as RateLimitConfig;
    this.initializeRedis();
    this.loadRules();
    this.startMonitoring();
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      keyPrefix: this.config.redis.keyPrefix || 'ratelimit:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in RateLimitMonitor:', error);
    });

    this.redis.on('connect', () => {
      logger.info('RateLimitMonitor connected to Redis');
    });
  }

  private loadRules(): void {
    // Sort rules by priority (higher priority first)
    const sortedRules = [...this.config.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const rule of sortedRules) {
      this.rules.set(rule.id, rule);
      this.initializeRuleMetrics(rule);
    }

    logger.info(`Loaded ${this.rules.size} rate limiting rules`);
  }

  private initializeRuleMetrics(rule: RateLimitRule): void {
    this.metrics.set(rule.id, {
      ruleId: rule.id,
      ruleName: rule.name,
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      currentLimit: rule.maxRequests,
      averageUsage: 0,
      peakUsage: 0,
      blockRate: 0,
      lastResetTime: new Date(),
      topBlocked: [],
    });

    if (this.config.adaptive.enabled) {
      this.adaptiveSettings.set(rule.id, {
        errorRate: 0,
        responseTime: 0,
        lastAdjustment: new Date(),
        adjustmentDirection: 'stable',
        consecutiveAdjustments: 0,
      });
    }
  }

  /**
   * Create rate limiting middleware for specific rules
   */
  createMiddleware(ruleIds?: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const applicableRules = ruleIds 
      ? Array.from(this.rules.values()).filter(rule => ruleIds.includes(rule.id))
      : Array.from(this.rules.values());

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const requestId = uuidv4();
        const startTime = Date.now();
        
        // Track request in req object for later use
        (req as any).rateLimitInfo = {
          requestId,
          startTime,
          rules: [],
        };

        // Check each applicable rule
        for (const rule of applicableRules) {
          // Check whitelist first
          if (rule.whitelist && rule.whitelist(req)) {
            continue;
          }

          const rateLimitInfo = await this.checkRateLimit(req, rule);
          (req as any).rateLimitInfo.rules.push(rateLimitInfo);

          if (rateLimitInfo.isBlocked) {
            await this.handleRateLimitExceeded(req, res, rateLimitInfo);
            return;
          }
        }

        // Add response monitoring
        this.addResponseMonitoring(req, res);
        next();

      } catch (error) {
        logger.error('Rate limit middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Check rate limit for a specific rule
   */
  private async checkRateLimit(req: Request, rule: RateLimitRule): Promise<RateLimitInfo> {
    const key = rule.keyGenerator(req);
    const windowKey = `${rule.id}:${key}:${Math.floor(Date.now() / rule.windowMs)}`;
    
    // Get current limit (may be adapted)
    const currentLimit = await this.getCurrentLimit(rule.id);
    
    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, Math.ceil(rule.windowMs / 1000));
    pipeline.get(`burst:${rule.id}:${key}`);
    
    const results = await pipeline.exec();
    
    if (!results || results.some(result => result[0] !== null)) {
      throw new AppError('Rate limit check failed', 500);
    }

    const currentCount = results[0][1] as number;
    const burstCount = parseInt(results[2][1] as string || '0');
    
    // Check burst allowance if configured
    let isBlocked = currentCount > currentLimit;
    let burstUsed = 0;

    if (rule.burstAllowance && isBlocked && burstCount < rule.burstAllowance) {
      // Allow burst request
      await this.redis.incr(`burst:${rule.id}:${key}`);
      await this.redis.expire(`burst:${rule.id}:${key}`, Math.ceil(rule.windowMs / 1000));
      burstUsed = burstCount + 1;
      isBlocked = false;
    }

    const resetTime = new Date(Math.ceil(Date.now() / rule.windowMs) * rule.windowMs);
    
    const rateLimitInfo: RateLimitInfo = {
      rule,
      key,
      current: currentCount,
      remaining: Math.max(0, currentLimit - currentCount),
      resetTime,
      windowMs: rule.windowMs,
      adaptedLimit: currentLimit !== rule.maxRequests ? currentLimit : undefined,
      burstUsed: burstUsed > 0 ? burstUsed : undefined,
      isBlocked,
    };

    // Update metrics
    await this.updateMetrics(rule.id, rateLimitInfo);
    
    // Check for alerts
    await this.checkAlerts(rateLimitInfo);

    return rateLimitInfo;
  }

  /**
   * Get current limit (potentially adapted)
   */
  private async getCurrentLimit(ruleId: string): Promise<number> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return 0;
    }

    if (!this.config.adaptive.enabled || !rule.adaptiveEnabled) {
      return rule.maxRequests;
    }

    const adaptedLimitKey = `adapted:${ruleId}`;
    const adaptedLimit = await this.redis.get(adaptedLimitKey);
    
    if (adaptedLimit) {
      return parseInt(adaptedLimit);
    }

    return rule.maxRequests;
  }

  /**
   * Handle rate limit exceeded
   */
  private async handleRateLimitExceeded(
    req: Request,
    res: Response,
    rateLimitInfo: RateLimitInfo
  ): Promise<void> {
    const { rule, current, remaining, resetTime, adaptedLimit } = rateLimitInfo;
    
    // Set rate limit headers
    if (rule.headers !== false) {
      res.set({
        'X-RateLimit-Limit': (adaptedLimit || rule.maxRequests).toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString(),
        'X-RateLimit-Window': rule.windowMs.toString(),
        'Retry-After': Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString(),
      });
    }

    // Log rate limit exceeded
    logger.warn('Rate limit exceeded', {
      rule: rule.name,
      key: rateLimitInfo.key,
      current,
      limit: adaptedLimit || rule.maxRequests,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Call custom handler if provided
    if (rule.onLimitReached) {
      rule.onLimitReached(req, rateLimitInfo);
    }

    // Emit event
    this.emit('rateLimitExceeded', {
      rule,
      req,
      rateLimitInfo,
    });

    // Send response
    const message = typeof rule.message === 'function' 
      ? rule.message(req, rateLimitInfo)
      : rule.message || 'Too many requests, please try again later.';

    res.status(429).json({
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000),
      limit: adaptedLimit || rule.maxRequests,
      remaining,
      resetTime: resetTime.toISOString(),
    });
  }

  /**
   * Add response monitoring for adaptive rate limiting
   */
  private addResponseMonitoring(req: Request, res: Response): void {
    if (!this.config.adaptive.enabled) {
      return;
    }

    const startTime = (req as any).rateLimitInfo.startTime;
    const rules = (req as any).rateLimitInfo.rules as RateLimitInfo[];

    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const isError = res.statusCode >= 400;

      for (const rateLimitInfo of rules) {
        await this.updateAdaptiveMetrics(rateLimitInfo.rule.id, responseTime, isError);
      }
    });
  }

  /**
   * Update rule metrics
   */
  private async updateMetrics(ruleId: string, rateLimitInfo: RateLimitInfo): Promise<void> {
    const metrics = this.metrics.get(ruleId);
    if (!metrics) {
      return;
    }

    metrics.totalRequests++;
    
    if (rateLimitInfo.isBlocked) {
      metrics.blockedRequests++;
      
      // Update top blocked
      const existing = metrics.topBlocked.find(item => item.key === rateLimitInfo.key);
      if (existing) {
        existing.count++;
        existing.lastBlocked = new Date();
      } else {
        metrics.topBlocked.push({
          key: rateLimitInfo.key,
          count: 1,
          lastBlocked: new Date(),
        });
        // Keep only top 10
        metrics.topBlocked.sort((a, b) => b.count - a.count);
        if (metrics.topBlocked.length > 10) {
          metrics.topBlocked = metrics.topBlocked.slice(0, 10);
        }
      }
    } else {
      metrics.allowedRequests++;
    }

    metrics.blockRate = metrics.blockedRequests / metrics.totalRequests;
    metrics.peakUsage = Math.max(metrics.peakUsage, rateLimitInfo.current);
    metrics.currentLimit = rateLimitInfo.adaptedLimit || rateLimitInfo.rule.maxRequests;

    // Store metrics in Redis for persistence
    await this.redis.hset(`metrics:${ruleId}`, {
      totalRequests: metrics.totalRequests,
      blockedRequests: metrics.blockedRequests,
      allowedRequests: metrics.allowedRequests,
      blockRate: metrics.blockRate.toFixed(4),
      peakUsage: metrics.peakUsage,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Update adaptive metrics and adjust limits
   */
  private async updateAdaptiveMetrics(ruleId: string, responseTime: number, isError: boolean): Promise<void> {
    const settings = this.adaptiveSettings.get(ruleId);
    const rule = this.rules.get(ruleId);
    
    if (!settings || !rule || !rule.adaptiveEnabled) {
      return;
    }

    // Update running averages
    const alpha = 0.1; // Smoothing factor
    settings.responseTime = (1 - alpha) * settings.responseTime + alpha * responseTime;
    settings.errorRate = (1 - alpha) * settings.errorRate + alpha * (isError ? 1 : 0);

    // Check if adjustment is needed
    const shouldAdjust = await this.shouldAdjustLimit(ruleId, settings);
    
    if (shouldAdjust) {
      await this.adjustLimit(ruleId, settings);
    }
  }

  /**
   * Determine if limit should be adjusted
   */
  private async shouldAdjustLimit(ruleId: string, settings: AdaptiveSettings): Promise<boolean> {
    // Don't adjust too frequently
    const timeSinceLastAdjustment = Date.now() - settings.lastAdjustment.getTime();
    if (timeSinceLastAdjustment < 300000) { // 5 minutes
      return false;
    }

    // Check error rate threshold
    if (settings.errorRate > this.config.adaptive.errorThreshold) {
      return true;
    }

    // Check response time (simple threshold for now)
    if (settings.responseTime > 5000) { // 5 seconds
      return true;
    }

    return false;
  }

  /**
   * Adjust rate limit based on metrics
   */
  private async adjustLimit(ruleId: string, settings: AdaptiveSettings): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return;
    }

    const currentLimit = await this.getCurrentLimit(ruleId);
    let newLimit = currentLimit;
    let direction: 'increase' | 'decrease' | 'stable' = 'stable';

    // Decrease limit if error rate is high
    if (settings.errorRate > this.config.adaptive.errorThreshold) {
      newLimit = Math.max(
        this.config.adaptive.minLimit,
        Math.floor(currentLimit * (1 - this.config.adaptive.adjustmentFactor))
      );
      direction = 'decrease';
    }
    // Increase limit if error rate is low and response time is good
    else if (settings.errorRate < this.config.adaptive.errorThreshold / 2 && settings.responseTime < 1000) {
      newLimit = Math.min(
        this.config.adaptive.maxLimit,
        Math.ceil(currentLimit * (1 + this.config.adaptive.adjustmentFactor))
      );
      direction = 'increase';
    }

    if (newLimit !== currentLimit) {
      await this.redis.setex(`adapted:${ruleId}`, 3600, newLimit.toString()); // 1 hour TTL
      
      settings.lastAdjustment = new Date();
      settings.adjustmentDirection = direction;
      settings.consecutiveAdjustments = settings.adjustmentDirection === direction 
        ? settings.consecutiveAdjustments + 1 
        : 1;

      // Update metrics
      const metrics = this.metrics.get(ruleId);
      if (metrics) {
        metrics.adaptedLimit = newLimit;
      }

      logger.info(`Adjusted rate limit for rule ${rule.name}`, {
        ruleId,
        oldLimit: currentLimit,
        newLimit,
        direction,
        errorRate: settings.errorRate,
        responseTime: settings.responseTime,
      });

      // Emit event
      this.emit('limitAdjusted', {
        ruleId,
        ruleName: rule.name,
        oldLimit: currentLimit,
        newLimit,
        direction,
        metrics: {
          errorRate: settings.errorRate,
          responseTime: settings.responseTime,
        },
      });
    }
  }

  /**
   * Check for alerting conditions
   */
  private async checkAlerts(rateLimitInfo: RateLimitInfo): Promise<void> {
    const { rule, current, remaining, isBlocked } = rateLimitInfo;
    const currentLimit = rateLimitInfo.adaptedLimit || rule.maxRequests;
    
    // Threshold exceeded alert
    const usageRatio = current / currentLimit;
    if (usageRatio >= this.config.monitoring.alertThreshold) {
      await this.createAlert({
        ruleId: rule.id,
        ruleName: rule.name,
        alertType: 'threshold_exceeded',
        severity: usageRatio >= 0.95 ? 'critical' : usageRatio >= 0.9 ? 'high' : 'medium',
        message: `Rate limit usage at ${Math.round(usageRatio * 100)}% for rule ${rule.name}`,
        metadata: {
          current,
          limit: currentLimit,
          usageRatio,
          key: rateLimitInfo.key,
        },
      });
    }

    // Burst detected alert
    if (rateLimitInfo.burstUsed) {
      await this.createAlert({
        ruleId: rule.id,
        ruleName: rule.name,
        alertType: 'burst_detected',
        severity: 'medium',
        message: `Burst allowance used for rule ${rule.name}`,
        metadata: {
          burstUsed: rateLimitInfo.burstUsed,
          burstAllowance: rule.burstAllowance,
          key: rateLimitInfo.key,
        },
      });
    }

    // Rule exhausted alert
    if (isBlocked && remaining === 0) {
      await this.createAlert({
        ruleId: rule.id,
        ruleName: rule.name,
        alertType: 'rule_exhausted',
        severity: 'high',
        message: `Rate limit completely exhausted for rule ${rule.name}`,
        metadata: {
          limit: currentLimit,
          key: rateLimitInfo.key,
        },
      });
    }
  }

  /**
   * Create alert
   */
  private async createAlert(alertData: Omit<RateLimitAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const alert: RateLimitAlert = {
      ...alertData,
      id: uuidv4(),
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.unshift(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    // Store in Redis
    await this.redis.lpush('alerts', JSON.stringify(alert));
    await this.redis.ltrim('alerts', 0, 999);

    logger.warn('Rate limit alert created', alert);
    this.emit('alert', alert);
  }

  /**
   * Get comprehensive metrics for all rules
   */
  async getMetrics(): Promise<RateLimitMetrics[]> {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for specific rule
   */
  async getRuleMetrics(ruleId: string): Promise<RateLimitMetrics | null> {
    return this.metrics.get(ruleId) || null;
  }

  /**
   * Get recent alerts
   */
  async getAlerts(limit: number = 100): Promise<RateLimitAlert[]> {
    return this.alerts.slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info(`Alert acknowledged: ${alertId}`);
    }
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(): Promise<{
    metrics: RateLimitMetrics[];
    alerts: RateLimitAlert[];
    adaptiveSettings: Array<{
      ruleId: string;
      ruleName: string;
      settings: AdaptiveSettings;
    }>;
  }> {
    const adaptiveData = Array.from(this.adaptiveSettings.entries()).map(([ruleId, settings]) => ({
      ruleId,
      ruleName: this.rules.get(ruleId)?.name || 'Unknown',
      settings,
    }));

    return {
      metrics: await this.getMetrics(),
      alerts: await this.getAlerts(50),
      adaptiveSettings: adaptiveData,
    };
  }

  /**
   * Start monitoring and metrics collection
   */
  private startMonitoring(): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.metricsInterval = setInterval(async () => {
      try {
        // Collect and persist metrics
        for (const [ruleId, metrics] of this.metrics.entries()) {
          await this.redis.hset(`metrics:${ruleId}`, {
            timestamp: Date.now(),
            ...metrics,
          });
        }

        // Emit metrics event
        this.emit('metricsCollected', this.metrics);
        
      } catch (error) {
        logger.error('Metrics collection error:', error);
      }
    }, this.config.monitoring.metricsInterval);

    logger.info('Rate limit monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.redis.disconnect();
  }
}

// Predefined rate limit rules
export const createStandardRules = (): RateLimitRule[] => [
  // Global rate limit
  {
    id: 'global',
    name: 'Global API Limit',
    keyGenerator: (req) => req.ip || 'unknown',
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    adaptiveEnabled: true,
    headers: true,
    priority: 1,
  },
  
  // Authenticated user limit
  {
    id: 'authenticated',
    name: 'Authenticated User Limit',
    keyGenerator: (req) => (req as any).user?.id || req.ip || 'unknown',
    windowMs: 60000, // 1 minute
    maxRequests: 500,
    adaptiveEnabled: true,
    burstAllowance: 50,
    whitelist: (req) => (req as any).user?.role === 'admin',
    priority: 2,
  },

  // OAuth endpoints
  {
    id: 'oauth',
    name: 'OAuth Endpoints',
    keyGenerator: (req) => req.ip || 'unknown',
    windowMs: 300000, // 5 minutes
    maxRequests: 10,
    headers: true,
    message: 'Too many authentication attempts, please try again later.',
    priority: 3,
  },

  // Webhook endpoints
  {
    id: 'webhook',
    name: 'Webhook Endpoints',
    keyGenerator: (req) => req.get('X-Webhook-Provider') || req.ip || 'unknown',
    windowMs: 60000, // 1 minute
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    priority: 3,
  },

  // AI/ML endpoints (more restrictive)
  {
    id: 'ai-ml',
    name: 'AI/ML Endpoints',
    keyGenerator: (req) => (req as any).user?.id || req.ip || 'unknown',
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    adaptiveEnabled: true,
    headers: true,
    priority: 4,
  },
];

export default RateLimitMonitorMiddleware;