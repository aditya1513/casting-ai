/**
 * Third-Party API Rate Limit Manager
 * Manages rate limits for external API integrations (Google, Zoom, WhatsApp, etc.)
 * 
 * Phase 3 Production Deployment - Third-party API Management
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export interface ThirdPartyAPI {
  id: string;
  name: string;
  baseUrl: string;
  limits: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
    concurrent?: number;
  };
  retryStrategy: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  headers?: Record<string, string>;
  authentication?: {
    type: 'oauth2' | 'apiKey' | 'bearer';
    config: Record<string, any>;
  };
  webhookEndpoint?: string;
  healthCheckUrl?: string;
  quotaResetTime?: string; // Time when daily quota resets (e.g., "00:00 UTC")
}

export interface APICallMetrics {
  apiId: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rateLimitedCalls: number;
  averageResponseTime: number;
  lastCallTime: Date;
  quotaUsed: {
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  remainingQuota: {
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

export interface RateLimitStatus {
  apiId: string;
  isAvailable: boolean;
  nextAvailableTime?: Date;
  reason?: string;
  currentUsage: Record<string, number>;
  limits: Record<string, number>;
  resetTimes: Record<string, Date>;
}

export class ThirdPartyRateLimitManager extends EventEmitter {
  private redis: Redis;
  private apis: Map<string, ThirdPartyAPI> = new Map();
  private metrics: Map<string, APICallMetrics> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.initializeAPIs();
    this.startHealthChecking();
  }

  /**
   * Initialize third-party API configurations
   */
  private initializeAPIs(): void {
    const apis: ThirdPartyAPI[] = [
      // Google Workspace APIs
      {
        id: 'google-calendar',
        name: 'Google Calendar API',
        baseUrl: 'https://www.googleapis.com/calendar/v3',
        limits: {
          perSecond: 10,
          perMinute: 600,
          perDay: 1000000,
          concurrent: 10,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'oauth2',
          config: {
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scope: 'https://www.googleapis.com/auth/calendar',
          },
        },
        quotaResetTime: '00:00 PST',
      },
      
      {
        id: 'google-drive',
        name: 'Google Drive API',
        baseUrl: 'https://www.googleapis.com/drive/v3',
        limits: {
          perSecond: 10,
          perMinute: 600,
          perDay: 1000000000, // 1 billion
          concurrent: 10,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'oauth2',
          config: {
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scope: 'https://www.googleapis.com/auth/drive',
          },
        },
        quotaResetTime: '00:00 PST',
      },
      
      // Zoom API
      {
        id: 'zoom',
        name: 'Zoom API',
        baseUrl: 'https://api.zoom.us/v2',
        limits: {
          perSecond: 10,
          perMinute: 60,
          perHour: 1000,
          perDay: 10000,
          concurrent: 5,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 2000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'oauth2',
          config: {
            authUrl: 'https://zoom.us/oauth/authorize',
            tokenUrl: 'https://zoom.us/oauth/token',
          },
        },
        webhookEndpoint: '/webhooks/zoom',
        healthCheckUrl: 'https://api.zoom.us/v2/users/me',
      },
      
      // Microsoft Teams API
      {
        id: 'teams',
        name: 'Microsoft Teams API',
        baseUrl: 'https://graph.microsoft.com/v1.0',
        limits: {
          perSecond: 4,
          perMinute: 240,
          perHour: 10000,
          concurrent: 4,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 60000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'oauth2',
          config: {
            authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            scope: 'https://graph.microsoft.com/.default',
          },
        },
      },
      
      // WhatsApp Business API
      {
        id: 'whatsapp',
        name: 'WhatsApp Business API',
        baseUrl: 'https://graph.facebook.com/v17.0',
        limits: {
          perSecond: 80,
          perMinute: 4800,
          perHour: 288000,
          perDay: 1000000,
          concurrent: 20,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'bearer',
          config: {
            tokenEnvVar: 'WHATSAPP_ACCESS_TOKEN',
          },
        },
        webhookEndpoint: '/webhooks/whatsapp',
      },
      
      // Twilio SMS API
      {
        id: 'twilio',
        name: 'Twilio SMS API',
        baseUrl: 'https://api.twilio.com/2010-04-01',
        limits: {
          perSecond: 100,
          perMinute: 6000,
          concurrent: 10,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'apiKey',
          config: {
            accountSidEnvVar: 'TWILIO_ACCOUNT_SID',
            authTokenEnvVar: 'TWILIO_AUTH_TOKEN',
          },
        },
      },
      
      // MSG91 SMS API (India specific)
      {
        id: 'msg91',
        name: 'MSG91 SMS API',
        baseUrl: 'https://api.msg91.com/api/v5',
        limits: {
          perSecond: 30,
          perMinute: 1800,
          perHour: 100000,
          concurrent: 10,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'apiKey',
          config: {
            authKeyEnvVar: 'MSG91_AUTH_KEY',
          },
        },
      },
      
      // SendGrid Email API
      {
        id: 'sendgrid',
        name: 'SendGrid Email API',
        baseUrl: 'https://api.sendgrid.com/v3',
        limits: {
          perSecond: 100,
          perMinute: 6000,
          perDay: 100000,
          concurrent: 10,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'bearer',
          config: {
            apiKeyEnvVar: 'SENDGRID_API_KEY',
          },
        },
      },
      
      // AWS S3 API
      {
        id: 'aws-s3',
        name: 'AWS S3 API',
        baseUrl: 'https://s3.amazonaws.com',
        limits: {
          perSecond: 3500, // GET requests
          perMinute: 210000,
          concurrent: 100,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 20000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'apiKey',
          config: {
            accessKeyEnvVar: 'AWS_ACCESS_KEY_ID',
            secretKeyEnvVar: 'AWS_SECRET_ACCESS_KEY',
          },
        },
      },
      
      // Stripe Payment API
      {
        id: 'stripe',
        name: 'Stripe API',
        baseUrl: 'https://api.stripe.com/v1',
        limits: {
          perSecond: 100,
          perMinute: 6000,
          concurrent: 25,
        },
        retryStrategy: {
          maxRetries: 3,
          initialDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 2,
        },
        authentication: {
          type: 'bearer',
          config: {
            secretKeyEnvVar: 'STRIPE_SECRET_KEY',
          },
        },
        webhookEndpoint: '/webhooks/stripe',
      },
    ];

    // Load APIs into map
    apis.forEach(api => {
      this.apis.set(api.id, api);
      this.initializeAPIMetrics(api);
      this.createCircuitBreaker(api);
    });

    logger.info(`Initialized ${this.apis.size} third-party API configurations`);
  }

  /**
   * Initialize metrics for an API
   */
  private initializeAPIMetrics(api: ThirdPartyAPI): void {
    this.metrics.set(api.id, {
      apiId: api.id,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rateLimitedCalls: 0,
      averageResponseTime: 0,
      lastCallTime: new Date(),
      quotaUsed: {
        perSecond: 0,
        perMinute: 0,
        perHour: 0,
        perDay: 0,
      },
      remainingQuota: {
        perSecond: api.limits.perSecond || Infinity,
        perMinute: api.limits.perMinute || Infinity,
        perHour: api.limits.perHour || Infinity,
        perDay: api.limits.perDay || Infinity,
      },
    });
  }

  /**
   * Create circuit breaker for an API
   */
  private createCircuitBreaker(api: ThirdPartyAPI): void {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
    });

    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${api.name}`);
      this.emit('circuitBreakerOpen', { apiId: api.id, apiName: api.name });
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${api.name}`);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${api.name}`);
      this.emit('circuitBreakerClose', { apiId: api.id, apiName: api.name });
    });

    this.circuitBreakers.set(api.id, breaker);
  }

  /**
   * Check if API call is allowed based on rate limits
   */
  async canMakeAPICall(apiId: string): Promise<RateLimitStatus> {
    const api = this.apis.get(apiId);
    if (!api) {
      throw new AppError(`Unknown API: ${apiId}`, 400);
    }

    const breaker = this.circuitBreakers.get(apiId);
    if (breaker && breaker.isOpen()) {
      return {
        apiId,
        isAvailable: false,
        reason: 'Circuit breaker is open',
        nextAvailableTime: new Date(Date.now() + 60000),
        currentUsage: {},
        limits: api.limits,
        resetTimes: {},
      };
    }

    const now = Date.now();
    const usage: Record<string, number> = {};
    const resetTimes: Record<string, Date> = {};
    let isAvailable = true;
    let nextAvailableTime: Date | undefined;
    let reason: string | undefined;

    // Check each rate limit window
    const windows = [
      { key: 'perSecond', duration: 1000 },
      { key: 'perMinute', duration: 60000 },
      { key: 'perHour', duration: 3600000 },
      { key: 'perDay', duration: 86400000 },
    ];

    for (const window of windows) {
      if (!api.limits[window.key]) continue;

      const windowKey = `api:${apiId}:${window.key}:${Math.floor(now / window.duration)}`;
      const currentUsage = await this.redis.get(windowKey);
      const used = parseInt(currentUsage || '0');
      usage[window.key] = used;

      const limit = api.limits[window.key]!;
      resetTimes[window.key] = new Date(Math.ceil(now / window.duration) * window.duration);

      if (used >= limit) {
        isAvailable = false;
        reason = `${window.key} limit exceeded (${used}/${limit})`;
        const resetTime = resetTimes[window.key];
        if (!nextAvailableTime || resetTime < nextAvailableTime) {
          nextAvailableTime = resetTime;
        }
      }
    }

    // Check concurrent calls limit
    if (api.limits.concurrent) {
      const concurrentKey = `api:${apiId}:concurrent`;
      const concurrent = await this.redis.get(concurrentKey);
      const currentConcurrent = parseInt(concurrent || '0');
      usage.concurrent = currentConcurrent;

      if (currentConcurrent >= api.limits.concurrent) {
        isAvailable = false;
        reason = `Concurrent limit exceeded (${currentConcurrent}/${api.limits.concurrent})`;
        nextAvailableTime = new Date(now + 1000); // Check again in 1 second
      }
    }

    return {
      apiId,
      isAvailable,
      nextAvailableTime,
      reason,
      currentUsage: usage,
      limits: api.limits,
      resetTimes,
    };
  }

  /**
   * Record API call and update rate limit counters
   */
  async recordAPICall(
    apiId: string,
    success: boolean,
    responseTime: number,
    statusCode?: number
  ): Promise<void> {
    const api = this.apis.get(apiId);
    if (!api) return;

    const now = Date.now();
    const metrics = this.metrics.get(apiId)!;
    const breaker = this.circuitBreakers.get(apiId);

    // Update metrics
    metrics.totalCalls++;
    if (success) {
      metrics.successfulCalls++;
      breaker?.recordSuccess();
    } else {
      metrics.failedCalls++;
      breaker?.recordFailure();
      
      if (statusCode === 429) {
        metrics.rateLimitedCalls++;
        logger.warn(`Rate limited by ${api.name}`, { apiId, statusCode });
      }
    }

    // Update average response time
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalCalls - 1) + responseTime) / metrics.totalCalls;
    metrics.lastCallTime = new Date();

    // Update rate limit counters
    const windows = [
      { key: 'perSecond', duration: 1000 },
      { key: 'perMinute', duration: 60000 },
      { key: 'perHour', duration: 3600000 },
      { key: 'perDay', duration: 86400000 },
    ];

    const pipeline = this.redis.pipeline();
    for (const window of windows) {
      if (!api.limits[window.key]) continue;

      const windowKey = `api:${apiId}:${window.key}:${Math.floor(now / window.duration)}`;
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, Math.ceil(window.duration / 1000));
    }

    // Update concurrent calls
    if (api.limits.concurrent) {
      const concurrentKey = `api:${apiId}:concurrent`;
      if (success || statusCode) {
        // Call completed, decrement concurrent counter
        pipeline.decr(concurrentKey);
      } else {
        // Call started, increment concurrent counter
        pipeline.incr(concurrentKey);
        pipeline.expire(concurrentKey, 60); // Expire after 1 minute to prevent stuck counters
      }
    }

    await pipeline.exec();

    // Store metrics in Redis
    await this.redis.hset(`api:metrics:${apiId}`, {
      totalCalls: metrics.totalCalls,
      successfulCalls: metrics.successfulCalls,
      failedCalls: metrics.failedCalls,
      rateLimitedCalls: metrics.rateLimitedCalls,
      averageResponseTime: metrics.averageResponseTime.toFixed(2),
      lastCallTime: metrics.lastCallTime.toISOString(),
    });

    // Emit metrics event
    this.emit('apiCallRecorded', {
      apiId,
      success,
      responseTime,
      statusCode,
      metrics,
    });
  }

  /**
   * Execute API call with retry and rate limiting
   */
  async executeAPICall<T>(
    apiId: string,
    callFn: () => Promise<T>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
    }
  ): Promise<T> {
    const api = this.apis.get(apiId);
    if (!api) {
      throw new AppError(`Unknown API: ${apiId}`, 400);
    }

    // Check rate limits
    const status = await this.canMakeAPICall(apiId);
    if (!status.isAvailable) {
      const waitTime = status.nextAvailableTime 
        ? status.nextAvailableTime.getTime() - Date.now()
        : 60000;

      if (options?.priority === 'high' && waitTime < 5000) {
        // Wait for high priority calls if wait time is short
        await this.delay(waitTime);
        return this.executeAPICall(apiId, callFn, options);
      }

      throw new AppError(
        `API rate limit exceeded: ${status.reason}. Retry after ${Math.ceil(waitTime / 1000)} seconds`,
        429
      );
    }

    // Execute with retry
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= api.retryStrategy.maxRetries; attempt++) {
      try {
        // Mark call as started (increment concurrent)
        await this.recordAPICall(apiId, false, 0);

        // Execute the call
        const result = await this.withTimeout(
          callFn(),
          options?.timeout || 30000
        );

        // Record successful call
        const responseTime = Date.now() - startTime;
        await this.recordAPICall(apiId, true, responseTime);

        return result;
      } catch (error: any) {
        lastError = error;
        const responseTime = Date.now() - startTime;
        
        // Check if it's a rate limit error from the API
        const statusCode = error.response?.status || error.statusCode;
        await this.recordAPICall(apiId, false, responseTime, statusCode);

        if (statusCode === 429) {
          // API returned rate limit error
          const retryAfter = this.parseRetryAfter(error.response?.headers);
          if (retryAfter) {
            await this.delay(retryAfter * 1000);
            continue;
          }
        }

        // Calculate backoff delay
        if (attempt < api.retryStrategy.maxRetries) {
          const delay = Math.min(
            api.retryStrategy.initialDelay * Math.pow(api.retryStrategy.backoffMultiplier, attempt),
            api.retryStrategy.maxDelay
          );
          
          logger.warn(`API call failed, retrying in ${delay}ms`, {
            apiId,
            attempt: attempt + 1,
            error: error.message,
          });
          
          await this.delay(delay);
        }
      }
    }

    throw lastError || new AppError(`API call failed after ${api.retryStrategy.maxRetries} retries`, 500);
  }

  /**
   * Get metrics for all APIs
   */
  async getMetrics(): Promise<APICallMetrics[]> {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for specific API
   */
  async getAPIMetrics(apiId: string): Promise<APICallMetrics | null> {
    return this.metrics.get(apiId) || null;
  }

  /**
   * Reset rate limit counters for an API (admin function)
   */
  async resetRateLimits(apiId: string): Promise<void> {
    const api = this.apis.get(apiId);
    if (!api) {
      throw new AppError(`Unknown API: ${apiId}`, 400);
    }

    const pattern = `api:${apiId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // Reset metrics
    this.initializeAPIMetrics(api);
    
    // Reset circuit breaker
    const breaker = this.circuitBreakers.get(apiId);
    breaker?.reset();

    logger.info(`Reset rate limits for ${api.name}`);
    this.emit('rateLimitsReset', { apiId, apiName: api.name });
  }

  /**
   * Health check for all APIs
   */
  private async performHealthChecks(): Promise<void> {
    for (const [apiId, api] of this.apis.entries()) {
      if (!api.healthCheckUrl) continue;

      try {
        const startTime = Date.now();
        // Perform health check (simplified - would use actual HTTP client)
        const isHealthy = true; // Placeholder
        const responseTime = Date.now() - startTime;

        this.emit('healthCheck', {
          apiId,
          apiName: api.name,
          isHealthy,
          responseTime,
        });
      } catch (error) {
        logger.error(`Health check failed for ${api.name}`, error);
        this.emit('healthCheck', {
          apiId,
          apiName: api.name,
          isHealthy: false,
          error,
        });
      }
    }
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    // Perform health checks every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        logger.error('Health check cycle failed', error);
      });
    }, 300000);
  }

  /**
   * Parse Retry-After header
   */
  private parseRetryAfter(headers?: Record<string, any>): number | null {
    if (!headers) return null;
    
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (!retryAfter) return null;

    // Check if it's a number (delay in seconds) or a date
    const parsed = parseInt(retryAfter);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // Try to parse as date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
    }

    return null;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility function for timeouts
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new AppError('API call timeout', 408)), ms)
      ),
    ]);
  }

  /**
   * Stop the manager
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'halfOpen' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt?: Date;
  private readonly config: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };

  constructor(config: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  }) {
    super();
    this.config = config;
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  recordSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'halfOpen') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'closed';
        this.emit('close');
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
      this.emit('open');

      // Schedule half-open state
      setTimeout(() => {
        this.state = 'halfOpen';
        this.emit('halfOpen');
      }, this.config.recoveryTimeout);
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = undefined;
  }
}

export default ThirdPartyRateLimitManager;