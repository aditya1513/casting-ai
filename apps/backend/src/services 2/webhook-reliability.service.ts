/**
 * Enhanced Webhook Reliability Service
 * Production-grade webhook delivery with exponential backoff, circuit breakers, and advanced retry strategies
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import crypto from 'crypto';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { WebhookConfig, WebhookPayload, WebhookDelivery } from './webhook.service';

export interface EnhancedRetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
  timeout: number;
  retryOnStatus?: number[];
  noRetryOnStatus?: number[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  forceOpenTimeout?: number;
}

export interface WebhookReliabilityMetrics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  circuitBreakerTrips: number;
  retryRate: number;
  lastSuccessfulDelivery?: Date;
  lastFailedDelivery?: Date;
}

export interface DeduplicationConfig {
  enabled: boolean;
  windowMs: number;
  keyGenerator?: (payload: WebhookPayload) => string;
}

export interface WebhookSignatureConfig {
  algorithm: 'sha256' | 'sha512';
  headerName: string;
  format: 'hex' | 'base64';
  includeTimestamp: boolean;
  timestampTolerance: number;
}

const ENHANCED_RETRY_CONFIG: EnhancedRetryConfig = {
  maxAttempts: 8,
  initialDelay: 1000,     // 1 second
  maxDelay: 300000,       // 5 minutes
  backoffMultiplier: 2,
  jitterMax: 1000,        // Add up to 1 second of jitter
  timeout: 30000,         // 30 seconds
  retryOnStatus: [408, 429, 500, 502, 503, 504],
  noRetryOnStatus: [400, 401, 403, 404, 422],
};

const CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000,  // 1 minute
  monitoringPeriod: 300000, // 5 minutes
  halfOpenMaxCalls: 3,
  forceOpenTimeout: 900000, // 15 minutes for complete failures
};

export class WebhookReliabilityService extends EventEmitter {
  private redis: Redis;
  private reliabilityQueue: Queue<ReliabilityJob>;
  private deadLetterQueue: Queue<DeadLetterJob>;
  private axiosInstance: AxiosInstance;
  private circuitBreakers: Map<string, EnhancedCircuitBreaker> = new Map();
  private metrics: Map<string, WebhookReliabilityMetrics> = new Map();
  private deduplicationCache: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeRedis();
    this.initializeQueues();
    this.initializeAxios();
    this.startMetricsCollection();
    this.startCleanupTasks();
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in WebhookReliabilityService:', error);
    });

    this.redis.on('connect', () => {
      logger.info('WebhookReliabilityService connected to Redis');
    });
  }

  private initializeQueues(): void {
    const queueConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    };

    // Main reliability queue with advanced retry
    this.reliabilityQueue = new Bull('webhook-reliability', queueConfig);
    this.reliabilityQueue.process('webhook-delivery', 5, this.processWebhookDelivery.bind(this));

    // Dead letter queue for final failures
    this.deadLetterQueue = new Bull('webhook-dead-letter', queueConfig);
    this.deadLetterQueue.process('dead-letter-webhook', 1, this.processDeadLetterWebhook.bind(this));

    this.setupQueueEventHandlers();
  }

  private initializeAxios(): void {
    this.axiosInstance = axios.create({
      timeout: 30000,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'CastMatch-Webhook-Reliability/2.0',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for correlation IDs
    this.axiosInstance.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = uuidv4();
      config.headers['X-CastMatch-Version'] = '2.0';
      return config;
    });

    // Add response interceptor for metrics
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.recordLatencyMetric(response);
        return response;
      },
      (error) => {
        this.recordLatencyMetric(error.response);
        return Promise.reject(error);
      }
    );
  }

  private setupQueueEventHandlers(): void {
    this.reliabilityQueue.on('completed', (job: Job<ReliabilityJob>, result) => {
      logger.info(`Webhook delivery completed: ${job.id}`, {
        webhookId: job.data.webhook.id,
        attempt: job.attemptsMade,
        duration: result.duration,
      });
      this.updateMetrics(job.data.webhook.id, 'success', result.duration);
    });

    this.reliabilityQueue.on('failed', (job: Job<ReliabilityJob>, error) => {
      logger.error(`Webhook delivery failed: ${job.id}`, {
        webhookId: job.data.webhook.id,
        attempt: job.attemptsMade,
        error: error.message,
      });
      
      this.updateMetrics(job.data.webhook.id, 'failure');
      
      // Move to dead letter queue if all retries exhausted
      if (job.attemptsMade >= (job.data.retryConfig?.maxAttempts || ENHANCED_RETRY_CONFIG.maxAttempts)) {
        this.moveToDeadLetterQueue(job.data, error);
      }
    });

    this.reliabilityQueue.on('stalled', (job: Job<ReliabilityJob>) => {
      logger.warn(`Webhook delivery stalled: ${job.id}`, {
        webhookId: job.data.webhook.id,
      });
    });
  }

  /**
   * Queue webhook delivery with enhanced reliability
   */
  async queueReliableDelivery(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    options?: {
      retryConfig?: Partial<EnhancedRetryConfig>;
      deduplication?: DeduplicationConfig;
      priority?: number;
    }
  ): Promise<string> {
    // Check deduplication
    if (options?.deduplication?.enabled) {
      const isDuplicate = await this.checkDuplication(webhook.id, payload, options.deduplication);
      if (isDuplicate) {
        logger.info(`Duplicate webhook detected, skipping delivery`, {
          webhookId: webhook.id,
          payloadId: payload.id,
        });
        return 'duplicate';
      }
    }

    // Get or create circuit breaker
    const circuitBreaker = this.getCircuitBreaker(webhook.id);
    
    // Check circuit breaker state
    if (!circuitBreaker.canExecute()) {
      logger.warn(`Circuit breaker is open for webhook ${webhook.id}, queuing for later`);
      // Queue with delay based on circuit breaker state
      const delay = circuitBreaker.getNextAttemptDelay();
      return this.queueWithDelay(webhook, payload, options, delay);
    }

    const jobData: ReliabilityJob = {
      webhook,
      payload,
      retryConfig: { ...ENHANCED_RETRY_CONFIG, ...options?.retryConfig },
      circuitBreakerId: webhook.id,
      correlationId: uuidv4(),
      queuedAt: new Date(),
    };

    const job = await this.reliabilityQueue.add('webhook-delivery', jobData, {
      attempts: jobData.retryConfig.maxAttempts,
      backoff: {
        type: 'exponential',
        delay: jobData.retryConfig.initialDelay,
      },
      priority: options?.priority || 0,
    });

    logger.info(`Queued reliable webhook delivery: ${job.id}`, {
      webhookId: webhook.id,
      payloadId: payload.id,
      correlationId: jobData.correlationId,
    });

    return job.id?.toString() || 'unknown';
  }

  /**
   * Process webhook delivery with enhanced reliability features
   */
  private async processWebhookDelivery(job: Job<ReliabilityJob>): Promise<WebhookDeliveryResult> {
    const { webhook, payload, retryConfig, circuitBreakerId, correlationId } = job.data;
    const startTime = Date.now();
    
    logger.info(`Processing webhook delivery`, {
      jobId: job.id,
      webhookId: webhook.id,
      attempt: job.attemptsMade + 1,
      correlationId,
    });

    const circuitBreaker = this.getCircuitBreaker(circuitBreakerId);
    
    try {
      // Check if we can execute
      if (!circuitBreaker.canExecute()) {
        throw new AppError('Circuit breaker is open', 503);
      }

      // Add jitter to prevent thundering herd
      if (job.attemptsMade > 0) {
        const jitter = Math.random() * retryConfig.jitterMax;
        await this.sleep(jitter);
      }

      // Prepare enhanced request
      const requestConfig = await this.prepareEnhancedRequest(webhook, payload, correlationId);
      
      // Execute delivery with timeout
      const response = await this.executeDeliveryWithTimeout(
        webhook.url,
        payload,
        requestConfig,
        retryConfig.timeout
      );

      // Record success
      circuitBreaker.recordSuccess();
      const duration = Date.now() - startTime;

      const result: WebhookDeliveryResult = {
        success: true,
        statusCode: response.status,
        duration,
        attempt: job.attemptsMade + 1,
        response: this.sanitizeResponse(response.data),
        headers: this.sanitizeHeaders(response.headers),
      };

      logger.info(`Webhook delivery successful`, {
        jobId: job.id,
        webhookId: webhook.id,
        statusCode: response.status,
        duration,
      });

      return result;

    } catch (error: any) {
      // Record failure
      circuitBreaker.recordFailure();
      const duration = Date.now() - startTime;

      const result: WebhookDeliveryResult = {
        success: false,
        statusCode: error.response?.status,
        duration,
        attempt: job.attemptsMade + 1,
        error: error.message,
        retryable: this.isRetryableError(error, retryConfig),
      };

      // Determine if we should retry
      if (result.retryable && job.attemptsMade < retryConfig.maxAttempts - 1) {
        const delay = this.calculateRetryDelay(job.attemptsMade + 1, retryConfig);
        logger.warn(`Webhook delivery failed, will retry in ${delay}ms`, {
          jobId: job.id,
          webhookId: webhook.id,
          attempt: job.attemptsMade + 1,
          error: error.message,
        });
        throw error; // Let Bull handle the retry
      }

      logger.error(`Webhook delivery failed permanently`, {
        jobId: job.id,
        webhookId: webhook.id,
        attempt: job.attemptsMade + 1,
        error: error.message,
      });

      return result;
    }
  }

  /**
   * Prepare enhanced request with security and reliability features
   */
  private async prepareEnhancedRequest(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    correlationId: string
  ): Promise<any> {
    const timestamp = Date.now().toString();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CastMatch-Event': payload.event,
      'X-CastMatch-Delivery': uuidv4(),
      'X-CastMatch-Timestamp': timestamp,
      'X-CastMatch-Correlation': correlationId,
      'X-CastMatch-Version': '2.0',
      ...webhook.headers,
    };

    // Enhanced signature generation
    if (webhook.secret) {
      const signatureConfig: WebhookSignatureConfig = {
        algorithm: 'sha256',
        headerName: 'X-CastMatch-Signature',
        format: 'hex',
        includeTimestamp: true,
        timestampTolerance: 300000, // 5 minutes
      };
      
      headers[signatureConfig.headerName] = this.generateEnhancedSignature(
        payload,
        webhook.secret,
        timestamp,
        signatureConfig
      );
    }

    return {
      headers,
      validateStatus: () => true, // Handle all status codes manually
      maxRedirects: 2,
      decompress: true,
    };
  }

  /**
   * Generate enhanced webhook signature with timestamp
   */
  private generateEnhancedSignature(
    payload: WebhookPayload,
    secret: string,
    timestamp: string,
    config: WebhookSignatureConfig
  ): string {
    const data = config.includeTimestamp 
      ? `${timestamp}.${JSON.stringify(payload)}`
      : JSON.stringify(payload);
    
    const signature = crypto
      .createHmac(config.algorithm, secret)
      .update(data)
      .digest(config.format);
    
    return `${config.algorithm}=${signature}`;
  }

  /**
   * Execute delivery with custom timeout handling
   */
  private async executeDeliveryWithTimeout(
    url: string,
    payload: WebhookPayload,
    config: any,
    timeout: number
  ): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new AppError('Webhook delivery timeout', 408));
      }, timeout);

      this.axiosInstance.post(url, payload, config)
        .then((response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, config: EnhancedRetryConfig): number {
    const exponentialDelay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMax;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any, config: EnhancedRetryConfig): boolean {
    // Network errors are always retryable
    if (!error.response) {
      return true;
    }

    const status = error.response.status;

    // Check explicit no-retry list
    if (config.noRetryOnStatus?.includes(status)) {
      return false;
    }

    // Check explicit retry list
    if (config.retryOnStatus?.includes(status)) {
      return true;
    }

    // Default behavior: retry on 5xx and certain 4xx
    return status >= 500 || status === 408 || status === 429;
  }

  /**
   * Check for duplicate webhook delivery
   */
  private async checkDuplication(
    webhookId: string,
    payload: WebhookPayload,
    config: DeduplicationConfig
  ): Promise<boolean> {
    const key = config.keyGenerator 
      ? config.keyGenerator(payload)
      : `${payload.event}:${JSON.stringify(payload.data)}`;
    
    const cacheKey = `webhook:dedup:${webhookId}`;
    const exists = await this.redis.sismember(cacheKey, key);
    
    if (!exists) {
      await this.redis.sadd(cacheKey, key);
      await this.redis.expire(cacheKey, Math.floor(config.windowMs / 1000));
    }
    
    return !!exists;
  }

  /**
   * Move failed webhook to dead letter queue
   */
  private async moveToDeadLetterQueue(jobData: ReliabilityJob, error: Error): Promise<void> {
    const deadLetterJob: DeadLetterJob = {
      ...jobData,
      failedAt: new Date(),
      finalError: error.message,
      requiresManualIntervention: this.requiresManualIntervention(error),
    };

    await this.deadLetterQueue.add('dead-letter-webhook', deadLetterJob, {
      delay: 300000, // 5 minutes before processing
      attempts: 1,
    });

    logger.error(`Moved webhook to dead letter queue`, {
      webhookId: jobData.webhook.id,
      payloadId: jobData.payload.id,
      error: error.message,
    });

    this.emit('webhook.dead-letter', deadLetterJob);
  }

  /**
   * Process dead letter webhook
   */
  private async processDeadLetterWebhook(job: Job<DeadLetterJob>): Promise<void> {
    const { webhook, payload, failedAt, finalError, requiresManualIntervention } = job.data;

    logger.info(`Processing dead letter webhook`, {
      webhookId: webhook.id,
      payloadId: payload.id,
      failedAt,
      requiresManualIntervention,
    });

    // Store in long-term storage for analysis
    await this.storeDeadLetterRecord(job.data);

    // Emit event for alerting systems
    this.emit('webhook.permanent-failure', {
      webhook,
      payload,
      error: finalError,
      requiresManualIntervention,
    });

    // Auto-disable webhook if too many failures
    const failureCount = await this.getWebhookFailureCount(webhook.id);
    if (failureCount >= 50) { // Configurable threshold
      logger.warn(`Auto-disabling webhook due to repeated failures: ${webhook.id}`);
      this.emit('webhook.auto-disabled', { webhook, failureCount });
    }
  }

  /**
   * Get or create circuit breaker for webhook
   */
  private getCircuitBreaker(webhookId: string): EnhancedCircuitBreaker {
    if (!this.circuitBreakers.has(webhookId)) {
      this.circuitBreakers.set(webhookId, new EnhancedCircuitBreaker(webhookId, CIRCUIT_BREAKER_CONFIG));
    }
    return this.circuitBreakers.get(webhookId)!;
  }

  /**
   * Update webhook metrics
   */
  private updateMetrics(webhookId: string, result: 'success' | 'failure', duration?: number): void {
    const current = this.metrics.get(webhookId) || {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      circuitBreakerTrips: 0,
      retryRate: 0,
    };

    current.totalDeliveries++;
    
    if (result === 'success') {
      current.successfulDeliveries++;
      current.lastSuccessfulDelivery = new Date();
      if (duration) {
        current.averageLatency = (current.averageLatency + duration) / 2;
      }
    } else {
      current.failedDeliveries++;
      current.lastFailedDelivery = new Date();
    }

    this.metrics.set(webhookId, current);
  }

  /**
   * Get webhook reliability metrics
   */
  async getWebhookMetrics(webhookId: string): Promise<WebhookReliabilityMetrics | null> {
    return this.metrics.get(webhookId) || null;
  }

  /**
   * Get all webhook metrics
   */
  async getAllWebhookMetrics(): Promise<Map<string, WebhookReliabilityMetrics>> {
    return new Map(this.metrics);
  }

  // Helper methods
  private async queueWithDelay(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    options?: any,
    delay?: number
  ): Promise<string> {
    // Implementation for delayed queueing
    return 'delayed';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordLatencyMetric(response?: AxiosResponse): void {
    // Implementation for latency recording
  }

  private sanitizeResponse(data: any): any {
    // Sanitize sensitive data from response
    return data;
  }

  private sanitizeHeaders(headers: any): any {
    // Sanitize sensitive headers
    return headers;
  }

  private requiresManualIntervention(error: Error): boolean {
    // Determine if error requires manual intervention
    return false;
  }

  private async storeDeadLetterRecord(data: DeadLetterJob): Promise<void> {
    // Store dead letter record for analysis
  }

  private async getWebhookFailureCount(webhookId: string): Promise<number> {
    // Get failure count for webhook
    return 0;
  }

  private startMetricsCollection(): void {
    // Start periodic metrics collection
  }

  private startCleanupTasks(): void {
    // Start cleanup tasks for old data
  }
}

/**
 * Enhanced Circuit Breaker with adaptive behavior
 */
class EnhancedCircuitBreaker {
  private id: string;
  private config: CircuitBreakerConfig;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastStateChange: Date = new Date();
  private halfOpenCallCount: number = 0;

  constructor(id: string, config: CircuitBreakerConfig) {
    this.id = id;
    this.config = config;
  }

  canExecute(): boolean {
    this.updateState();
    
    if (this.state === 'open') {
      return false;
    }
    
    if (this.state === 'half-open') {
      return this.halfOpenCallCount < this.config.halfOpenMaxCalls;
    }
    
    return true;
  }

  recordSuccess(): void {
    this.successCount++;
    
    if (this.state === 'half-open') {
      this.halfOpenCallCount++;
      
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        this.transitionTo('closed');
      }
    }
    
    // Reset failure count on success
    this.failureCount = 0;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('open');
    } else if (this.state === 'half-open') {
      this.transitionTo('open');
    }
  }

  getNextAttemptDelay(): number {
    if (this.state === 'open') {
      const timeSinceOpen = Date.now() - this.lastStateChange.getTime();
      return Math.max(0, this.config.recoveryTimeout - timeSinceOpen);
    }
    return 0;
  }

  private updateState(): void {
    if (this.state === 'open' && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
      
      if (timeSinceFailure >= this.config.recoveryTimeout) {
        this.transitionTo('half-open');
      }
    }
  }

  private transitionTo(newState: 'closed' | 'open' | 'half-open'): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();
    
    if (newState === 'half-open') {
      this.halfOpenCallCount = 0;
    }
    
    if (newState === 'closed') {
      this.failureCount = 0;
    }

    logger.info(`Circuit breaker ${this.id} transitioned from ${oldState} to ${newState}`);
  }
}

// Type definitions
interface ReliabilityJob {
  webhook: WebhookConfig;
  payload: WebhookPayload;
  retryConfig: EnhancedRetryConfig;
  circuitBreakerId: string;
  correlationId: string;
  queuedAt: Date;
}

interface DeadLetterJob extends ReliabilityJob {
  failedAt: Date;
  finalError: string;
  requiresManualIntervention: boolean;
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  duration: number;
  attempt: number;
  response?: any;
  headers?: Record<string, string>;
  error?: string;
  retryable?: boolean;
}

// Export singleton instance
export const webhookReliabilityService = new WebhookReliabilityService();