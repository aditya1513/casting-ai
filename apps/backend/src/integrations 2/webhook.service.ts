/**
 * Webhook Handler Infrastructure
 * Manages incoming and outgoing webhooks with retry logic and event broadcasting
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// Webhook Types
export type WebhookEvent = 
  | 'audition.created'
  | 'audition.updated'
  | 'audition.cancelled'
  | 'talent.registered'
  | 'talent.approved'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'payment.completed'
  | 'payment.failed'
  | 'calendar.event.changed'
  | 'meeting.started'
  | 'meeting.ended'
  | 'recording.completed'
  | 'notification.delivered'
  | 'notification.failed';

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
  headers?: Record<string, string>;
  retryConfig?: RetryConfig;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastTriggered?: Date;
  failureCount?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeout: number;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payloadId: string;
  attempt: number;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  response?: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

export interface WebhookSignature {
  algorithm: 'sha256' | 'sha512';
  header: string;
  format: 'hex' | 'base64';
}

export interface IncomingWebhook {
  provider: string;
  event: string;
  signature?: string;
  timestamp?: string;
  data: any;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  timeout: 30000,
};

class WebhookService extends EventEmitter {
  private webhookQueue: Queue<{ webhook: WebhookConfig; payload: WebhookPayload }>;
  private redis: Redis;
  private axiosInstance: AxiosInstance;
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveryHistory: Map<string, WebhookDelivery[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    super();

    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    // Initialize webhook queue
    this.webhookQueue = new Bull('webhook-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Initialize axios with defaults
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'CastMatch-Webhook/1.0',
      },
    });

    // Process webhook queue
    this.processQueue();

    // Load webhooks from storage
    this.loadWebhooks();
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): Promise<WebhookConfig> {
    const webhook: WebhookConfig = {
      ...config,
      id: uuidv4(),
      createdAt: new Date(),
      failureCount: 0,
      retryConfig: config.retryConfig || DEFAULT_RETRY_CONFIG,
    };

    // Validate URL
    try {
      new URL(config.url);
    } catch (error) {
      throw new AppError('Invalid webhook URL', 400);
    }

    // Store webhook
    this.webhooks.set(webhook.id, webhook);
    await this.saveWebhook(webhook);

    // Initialize circuit breaker
    this.circuitBreakers.set(webhook.id, new CircuitBreaker(webhook.id));

    logger.info(`Registered webhook: ${webhook.id}`, {
      url: webhook.url,
      events: webhook.events,
    });

    return webhook;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const updated = {
      ...webhook,
      ...updates,
      id: webhook.id,
      createdAt: webhook.createdAt,
    };

    this.webhooks.set(id, updated);
    await this.saveWebhook(updated);

    logger.info(`Updated webhook: ${id}`);
    return updated;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    this.webhooks.delete(id);
    this.circuitBreakers.delete(id);
    await this.redis.hdel('webhooks', id);

    logger.info(`Deleted webhook: ${id}`);
  }

  /**
   * Trigger webhook event
   */
  async trigger(event: WebhookEvent, data: any, metadata?: Record<string, any>): Promise<void> {
    const payload: WebhookPayload = {
      id: uuidv4(),
      event,
      timestamp: new Date(),
      data,
      metadata,
    };

    // Find all webhooks subscribed to this event
    const subscribedWebhooks = Array.from(this.webhooks.values()).filter(
      webhook => webhook.active && webhook.events.includes(event)
    );

    logger.info(`Triggering event ${event} for ${subscribedWebhooks.length} webhooks`);

    // Queue delivery for each webhook
    for (const webhook of subscribedWebhooks) {
      await this.queueDelivery(webhook, payload);
    }

    // Emit event for internal listeners
    this.emit(event, payload);
  }

  /**
   * Queue webhook delivery
   */
  private async queueDelivery(webhook: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const job = await this.webhookQueue.add(
      { webhook, payload },
      {
        attempts: webhook.retryConfig?.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: webhook.retryConfig?.initialDelay || DEFAULT_RETRY_CONFIG.initialDelay,
        },
      }
    );

    logger.info(`Queued webhook delivery: ${job.id}`, {
      webhookId: webhook.id,
      event: payload.event,
    });
  }

  /**
   * Process webhook queue
   */
  private processQueue(): void {
    this.webhookQueue.process(async (job: Job<{ webhook: WebhookConfig; payload: WebhookPayload }>) => {
      const { webhook, payload } = job.data;
      return await this.deliverWebhook(webhook, payload, job.attemptsMade);
    });

    this.webhookQueue.on('completed', (job, result) => {
      logger.info(`Webhook delivery completed: ${job.id}`, result);
    });

    this.webhookQueue.on('failed', (job, err) => {
      logger.error(`Webhook delivery failed: ${job.id}`, err);
      this.handleDeliveryFailure(job.data.webhook, job.data.payload, err);
    });

    this.webhookQueue.on('stalled', (job) => {
      logger.warn(`Webhook delivery stalled: ${job.id}`);
    });
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attempt: number
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: uuidv4(),
      webhookId: webhook.id,
      payloadId: payload.id,
      attempt,
      status: 'pending',
      timestamp: new Date(),
    };

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(webhook.id);
    if (circuitBreaker && !circuitBreaker.isOpen()) {
      delivery.status = 'failed';
      delivery.error = 'Circuit breaker is open';
      await this.saveDelivery(delivery);
      throw new Error('Circuit breaker is open');
    }

    try {
      const startTime = Date.now();
      
      // Prepare request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CastMatch-Event': payload.event,
        'X-CastMatch-Delivery': delivery.id,
        'X-CastMatch-Timestamp': payload.timestamp.toISOString(),
        ...webhook.headers,
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        headers['X-CastMatch-Signature'] = this.generateSignature(payload, webhook.secret);
      }

      // Make HTTP request
      const response = await this.axiosInstance.post(
        webhook.url,
        payload,
        {
          headers,
          timeout: webhook.retryConfig?.timeout || DEFAULT_RETRY_CONFIG.timeout,
          validateStatus: () => true, // Don't throw on non-2xx status
        }
      );

      delivery.duration = Date.now() - startTime;
      delivery.statusCode = response.status;
      delivery.response = response.data;

      if (response.status >= 200 && response.status < 300) {
        delivery.status = 'success';
        webhook.lastTriggered = new Date();
        webhook.failureCount = 0;
        
        // Reset circuit breaker on success
        circuitBreaker?.reset();
      } else {
        delivery.status = 'failed';
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
        webhook.failureCount = (webhook.failureCount || 0) + 1;
        
        // Record failure in circuit breaker
        circuitBreaker?.recordFailure();
        
        // Throw error to trigger retry
        throw new Error(delivery.error);
      }

      await this.saveDelivery(delivery);
      return delivery;
    } catch (error: any) {
      delivery.status = 'failed';
      delivery.error = error.message;
      delivery.duration = Date.now() - delivery.timestamp.getTime();
      
      // Record failure
      webhook.failureCount = (webhook.failureCount || 0) + 1;
      circuitBreaker?.recordFailure();
      
      await this.saveDelivery(delivery);
      
      // Check if we should retry
      if (this.shouldRetry(error, attempt, webhook.retryConfig)) {
        throw error; // Bull will handle retry
      }
      
      return delivery;
    }
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const data = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    return `sha256=${signature}`;
  }

  /**
   * Verify incoming webhook signature
   */
  verifySignature(
    body: string | Buffer,
    signature: string,
    secret: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): boolean {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(body)
      .digest('hex');
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle incoming webhook from external service
   */
  async handleIncomingWebhook(webhook: IncomingWebhook): Promise<void> {
    logger.info(`Received incoming webhook from ${webhook.provider}`, {
      event: webhook.event,
    });

    // Route to appropriate handler based on provider
    switch (webhook.provider) {
      case 'google':
        await this.handleGoogleWebhook(webhook);
        break;
      case 'zoom':
        await this.handleZoomWebhook(webhook);
        break;
      case 'stripe':
        await this.handleStripeWebhook(webhook);
        break;
      case 'twilio':
        await this.handleTwilioWebhook(webhook);
        break;
      case 'sendgrid':
        await this.handleSendGridWebhook(webhook);
        break;
      default:
        logger.warn(`Unknown webhook provider: ${webhook.provider}`);
    }
  }

  /**
   * Handle Google webhook
   */
  private async handleGoogleWebhook(webhook: IncomingWebhook): Promise<void> {
    // Process Google Calendar or Meet webhooks
    const event = webhook.data;
    
    if (event.kind === 'calendar#event') {
      await this.trigger('calendar.event.changed', event);
    }
  }

  /**
   * Handle Zoom webhook
   */
  private async handleZoomWebhook(webhook: IncomingWebhook): Promise<void> {
    // Process Zoom webhooks
    switch (webhook.event) {
      case 'meeting.started':
        await this.trigger('meeting.started', webhook.data);
        break;
      case 'meeting.ended':
        await this.trigger('meeting.ended', webhook.data);
        break;
      case 'recording.completed':
        await this.trigger('recording.completed', webhook.data);
        break;
    }
  }

  /**
   * Handle Stripe webhook
   */
  private async handleStripeWebhook(webhook: IncomingWebhook): Promise<void> {
    // Process Stripe payment webhooks
    switch (webhook.event) {
      case 'payment_intent.succeeded':
        await this.trigger('payment.completed', webhook.data);
        break;
      case 'payment_intent.payment_failed':
        await this.trigger('payment.failed', webhook.data);
        break;
    }
  }

  /**
   * Handle Twilio webhook
   */
  private async handleTwilioWebhook(webhook: IncomingWebhook): Promise<void> {
    // Process Twilio SMS/WhatsApp webhooks
    const status = webhook.data.MessageStatus || webhook.data.SmsStatus;
    
    if (status === 'delivered') {
      await this.trigger('notification.delivered', webhook.data);
    } else if (status === 'failed' || status === 'undelivered') {
      await this.trigger('notification.failed', webhook.data);
    }
  }

  /**
   * Handle SendGrid webhook
   */
  private async handleSendGridWebhook(webhook: IncomingWebhook): Promise<void> {
    // Process SendGrid email webhooks
    for (const event of webhook.data) {
      if (event.event === 'delivered') {
        await this.trigger('notification.delivered', event);
      } else if (event.event === 'bounce' || event.event === 'dropped') {
        await this.trigger('notification.failed', event);
      }
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any, attempt: number, config?: RetryConfig): boolean {
    const maxAttempts = config?.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts;
    
    if (attempt >= maxAttempts) {
      return false;
    }

    // Don't retry on client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }

    // Retry on network errors, timeouts, and server errors
    return true;
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    error: Error
  ): Promise<void> {
    logger.error(`Webhook delivery failed for ${webhook.id}`, {
      url: webhook.url,
      event: payload.event,
      error: error.message,
    });

    // Disable webhook after too many failures
    if (webhook.failureCount && webhook.failureCount >= 10) {
      webhook.active = false;
      await this.saveWebhook(webhook);
      logger.warn(`Disabled webhook ${webhook.id} due to repeated failures`);
    }

    // Emit failure event
    this.emit('webhook.delivery.failed', {
      webhook,
      payload,
      error,
    });
  }

  /**
   * Save webhook to storage
   */
  private async saveWebhook(webhook: WebhookConfig): Promise<void> {
    await this.redis.hset('webhooks', webhook.id, JSON.stringify(webhook));
  }

  /**
   * Save delivery record
   */
  private async saveDelivery(delivery: WebhookDelivery): Promise<void> {
    const key = `webhook:deliveries:${delivery.webhookId}`;
    await this.redis.lpush(key, JSON.stringify(delivery));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 deliveries
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 days
    
    // Update in-memory history
    const history = this.deliveryHistory.get(delivery.webhookId) || [];
    history.unshift(delivery);
    if (history.length > 100) history.pop();
    this.deliveryHistory.set(delivery.webhookId, history);
  }

  /**
   * Load webhooks from storage
   */
  private async loadWebhooks(): Promise<void> {
    try {
      const webhooks = await this.redis.hgetall('webhooks');
      
      for (const [id, data] of Object.entries(webhooks)) {
        const webhook = JSON.parse(data);
        this.webhooks.set(id, webhook);
        this.circuitBreakers.set(id, new CircuitBreaker(id));
      }
      
      logger.info(`Loaded ${this.webhooks.size} webhooks`);
    } catch (error) {
      logger.error('Failed to load webhooks:', error);
    }
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(id: string): Promise<WebhookConfig | undefined> {
    return this.webhooks.get(id);
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<WebhookConfig[]> {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get delivery history for webhook
   */
  async getDeliveryHistory(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    // Try in-memory first
    const cached = this.deliveryHistory.get(webhookId);
    if (cached && cached.length >= limit) {
      return cached.slice(0, limit);
    }

    // Load from Redis
    const key = `webhook:deliveries:${webhookId}`;
    const deliveries = await this.redis.lrange(key, 0, limit - 1);
    return deliveries.map(d => JSON.parse(d));
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string): Promise<WebhookDelivery> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const testPayload: WebhookPayload = {
      id: uuidv4(),
      event: 'audition.created',
      timestamp: new Date(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
    };

    return await this.deliverWebhook(webhook, testPayload, 1);
  }
}

/**
 * Circuit Breaker for webhook endpoints
 */
class CircuitBreaker {
  private id: string;
  private failureCount: number = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold: number = 5;
  private readonly timeout: number = 60000; // 1 minute
  private readonly halfOpenRequests: number = 3;
  private halfOpenAttempts: number = 0;

  constructor(id: string) {
    this.id = id;
  }

  isOpen(): boolean {
    this.updateState();
    return this.state === 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.warn(`Circuit breaker opened for webhook ${this.id}`);
    }
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      
      if (this.halfOpenAttempts >= this.halfOpenRequests) {
        this.reset();
      }
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.state = 'closed';
    this.halfOpenAttempts = 0;
    logger.info(`Circuit breaker reset for webhook ${this.id}`);
  }

  private updateState(): void {
    if (this.state === 'open' && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
      
      if (timeSinceFailure >= this.timeout) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        logger.info(`Circuit breaker half-open for webhook ${this.id}`);
      }
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();