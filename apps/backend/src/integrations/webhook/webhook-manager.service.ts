/**
 * Webhook Management System
 * Centralized webhook handling with security, validation, and retry mechanisms
 */

import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { CacheManager, CacheKeys } from '../../config/redis';
import Bull, { Queue, Job } from 'bull';
// import { prisma } from '../../config/database'; // REMOVED: Using Drizzle instead
import { z } from 'zod';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastTriggered?: Date;
  failureCount?: number;
}

interface WebhookEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
  version?: string;
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  response?: {
    status: number;
    body?: any;
    headers?: Record<string, string>;
  };
  error?: string;
  deliveredAt?: Date;
  nextRetryAt?: Date;
}

interface WebhookSignature {
  algorithm: 'sha256' | 'sha512' | 'sha1';
  header: string;
  format?: 'hex' | 'base64';
}

interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Webhook event schemas for validation
const webhookEventSchemas = {
  'payment.captured': z.object({
    paymentId: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    customerId: z.string().optional(),
  }),
  'subscription.created': z.object({
    subscriptionId: z.string(),
    planId: z.string(),
    customerId: z.string(),
    status: z.string(),
    currentPeriodEnd: z.string(),
  }),
  'meeting.created': z.object({
    meetingId: z.string(),
    provider: z.enum(['zoom', 'meet', 'teams']),
    startTime: z.string(),
    duration: z.number(),
    hostEmail: z.string(),
  }),
  'audition.scheduled': z.object({
    auditionId: z.string(),
    projectId: z.string(),
    talentId: z.string(),
    scheduledAt: z.string(),
    location: z.string().optional(),
  }),
  'talent.applied': z.object({
    talentId: z.string(),
    projectId: z.string(),
    roleId: z.string(),
    appliedAt: z.string(),
  }),
  'notification.sent': z.object({
    notificationId: z.string(),
    type: z.string(),
    recipient: z.string(),
    channel: z.enum(['email', 'sms', 'push', 'in-app']),
    status: z.string(),
  }),
};

export class WebhookManagerService {
  private webhookQueue: Queue;
  private retryQueue: Queue;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private rateLimiter: RateLimiterRedis;
  private readonly defaultRetryPolicy: RetryPolicy = {
    maxAttempts: 5,
    initialDelay: 5000,
    maxDelay: 3600000, // 1 hour
    backoffMultiplier: 2,
  };
  private readonly signatureConfig: WebhookSignature = {
    algorithm: 'sha256',
    header: 'X-CastMatch-Signature',
    format: 'hex',
  };

  constructor() {
    this.initializeQueues();
    this.initializeRateLimiter();
    this.loadEndpoints();
  }

  /**
   * Initialize processing queues
   */
  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.webhookQueue = new Bull('webhook-delivery-queue', redisConfig);
    this.retryQueue = new Bull('webhook-retry-queue', redisConfig);

    // Process webhook deliveries
    this.webhookQueue.process(async (job: Job) => {
      const { endpoint, event } = job.data;
      try {
        await this.deliverWebhookInternal(endpoint, event);
        return { success: true, deliveredAt: new Date() };
      } catch (error) {
        logger.error('Webhook delivery failed', { 
          error, 
          jobId: job.id,
          endpointId: endpoint.id 
        });
        throw error;
      }
    });

    // Process retries
    this.retryQueue.process(async (job: Job) => {
      const { delivery, endpoint, event } = job.data;
      try {
        await this.retryWebhookInternal(delivery, endpoint, event);
        return { success: true, retriedAt: new Date() };
      } catch (error) {
        logger.error('Webhook retry failed', { 
          error, 
          jobId: job.id,
          deliveryId: delivery.id 
        });
        throw error;
      }
    });

    // Handle failed jobs
    this.webhookQueue.on('failed', async (job, err) => {
      const { endpoint, event } = job.data;
      await this.handleDeliveryFailure(endpoint, event, err);
    });

    this.retryQueue.on('failed', async (job, err) => {
      const { delivery } = job.data;
      await this.handleRetryFailure(delivery, err);
    });
  }

  /**
   * Initialize rate limiter
   */
  private initializeRateLimiter(): void {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'webhook-rate-limit',
      points: 100, // Number of requests
      duration: 60, // Per minute
      blockDuration: 60, // Block for 1 minute if exceeded
    });
  }

  /**
   * Load webhook endpoints from database
   */
  private async loadEndpoints(): Promise<void> {
    try {
      // This would load from your database
      // For now, loading from environment/config
      
      const defaultEndpoints: WebhookEndpoint[] = [
        {
          id: 'default-payment',
          url: process.env.PAYMENT_WEBHOOK_URL || '',
          events: ['payment.*', 'subscription.*', 'refund.*'],
          secret: process.env.PAYMENT_WEBHOOK_SECRET || '',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'default-calendar',
          url: process.env.CALENDAR_WEBHOOK_URL || '',
          events: ['meeting.*', 'audition.*'],
          secret: process.env.CALENDAR_WEBHOOK_SECRET || '',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      defaultEndpoints.forEach(endpoint => {
        if (endpoint.url) {
          this.endpoints.set(endpoint.id, endpoint);
        }
      });

      logger.info(`Loaded ${this.endpoints.size} webhook endpoints`);
    } catch (error) {
      logger.error('Failed to load webhook endpoints', error);
    }
  }

  /**
   * Register a new webhook endpoint
   */
  async registerEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt'>): Promise<WebhookEndpoint> {
    try {
      const id = crypto.randomBytes(16).toString('hex');
      const secret = crypto.randomBytes(32).toString('hex');
      
      const newEndpoint: WebhookEndpoint = {
        ...endpoint,
        id,
        secret: endpoint.secret || secret,
        createdAt: new Date(),
        failureCount: 0,
      };

      // Validate URL
      await this.validateEndpointUrl(newEndpoint.url);

      // Store in database and cache
      this.endpoints.set(id, newEndpoint);
      await CacheManager.set(
        CacheKeys.webhookEndpoint(id),
        newEndpoint,
        86400 * 30 // 30 days
      );

      // Send test event
      await this.sendTestWebhook(newEndpoint);

      logger.info('Webhook endpoint registered', { 
        endpointId: id, 
        url: endpoint.url,
        events: endpoint.events 
      });

      return newEndpoint;
    } catch (error) {
      logger.error('Failed to register webhook endpoint', { endpoint, error });
      throw error;
    }
  }

  /**
   * Update webhook endpoint
   */
  async updateEndpoint(
    endpointId: string, 
    updates: Partial<Omit<WebhookEndpoint, 'id' | 'createdAt'>>
  ): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const updatedEndpoint = {
      ...endpoint,
      ...updates,
    };

    if (updates.url && updates.url !== endpoint.url) {
      await this.validateEndpointUrl(updates.url);
    }

    this.endpoints.set(endpointId, updatedEndpoint);
    await CacheManager.set(
      CacheKeys.webhookEndpoint(endpointId),
      updatedEndpoint,
      86400 * 30
    );

    logger.info('Webhook endpoint updated', { endpointId, updates });
  }

  /**
   * Delete webhook endpoint
   */
  async deleteEndpoint(endpointId: string): Promise<void> {
    this.endpoints.delete(endpointId);
    await CacheManager.del(CacheKeys.webhookEndpoint(endpointId));
    
    logger.info('Webhook endpoint deleted', { endpointId });
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(event: WebhookEvent): Promise<void> {
    try {
      // Validate event payload if schema exists
      if (webhookEventSchemas[event.type]) {
        webhookEventSchemas[event.type].parse(event.payload);
      }

      // Find matching endpoints
      const matchingEndpoints = Array.from(this.endpoints.values()).filter(endpoint => {
        if (!endpoint.isActive) return false;
        
        return endpoint.events.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(event.type);
          }
          return pattern === event.type;
        });
      });

      // Queue deliveries for each matching endpoint
      for (const endpoint of matchingEndpoints) {
        await this.webhookQueue.add(
          { endpoint, event },
          {
            attempts: this.defaultRetryPolicy.maxAttempts,
            backoff: {
              type: 'exponential',
              delay: this.defaultRetryPolicy.initialDelay,
            },
            removeOnComplete: true,
            removeOnFail: false,
          }
        );
      }

      logger.info('Webhook event triggered', { 
        eventType: event.type, 
        endpointCount: matchingEndpoints.length 
      });

      // Store event for audit
      await this.storeWebhookEvent(event);

    } catch (error) {
      logger.error('Failed to trigger webhook event', { event, error });
      throw error;
    }
  }

  /**
   * Deliver webhook internally
   */
  private async deliverWebhookInternal(
    endpoint: WebhookEndpoint, 
    event: WebhookEvent
  ): Promise<void> {
    // Check rate limit
    await this.checkRateLimit(endpoint.id);

    // Prepare payload
    const payload = {
      id: event.id,
      type: event.type,
      data: event.payload,
      timestamp: event.timestamp,
      source: event.source,
      version: event.version || '1.0',
    };

    // Generate signature
    const signature = this.generateSignature(payload, endpoint.secret);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      [this.signatureConfig.header]: signature,
      'X-CastMatch-Event': event.type,
      'X-CastMatch-Event-ID': event.id,
      'X-CastMatch-Timestamp': event.timestamp.toISOString(),
      ...endpoint.headers,
    };

    // Deliver webhook
    const startTime = Date.now();
    
    try {
      const response = await axios.post(endpoint.url, payload, {
        headers,
        timeout: 30000, // 30 seconds
        validateStatus: () => true, // Don't throw on non-2xx
      });

      const duration = Date.now() - startTime;

      // Log delivery
      await this.logDelivery({
        endpointId: endpoint.id,
        eventId: event.id,
        status: response.status >= 200 && response.status < 300 ? 'success' : 'failed',
        response: {
          status: response.status,
          body: response.data,
          headers: response.headers as any,
        },
        duration,
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info('Webhook delivered successfully', {
          endpointId: endpoint.id,
          eventType: event.type,
          status: response.status,
          duration,
        });
        
        // Update endpoint last triggered time
        endpoint.lastTriggered = new Date();
        endpoint.failureCount = 0;
        this.endpoints.set(endpoint.id, endpoint);
      } else {
        throw new Error(`Webhook delivery failed with status ${response.status}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logDelivery({
        endpointId: endpoint.id,
        eventId: event.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Update failure count
      endpoint.failureCount = (endpoint.failureCount || 0) + 1;
      this.endpoints.set(endpoint.id, endpoint);

      // Disable endpoint if too many failures
      if (endpoint.failureCount >= 10) {
        await this.disableEndpoint(endpoint.id);
      }

      throw error;
    }
  }

  /**
   * Retry webhook internally
   */
  private async retryWebhookInternal(
    delivery: WebhookDelivery,
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): Promise<void> {
    delivery.attempts++;
    delivery.status = 'retrying';

    try {
      await this.deliverWebhookInternal(endpoint, event);
      delivery.status = 'success';
      delivery.deliveredAt = new Date();
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Schedule next retry if within limits
      if (delivery.attempts < this.defaultRetryPolicy.maxAttempts) {
        const delay = Math.min(
          this.defaultRetryPolicy.initialDelay * Math.pow(this.defaultRetryPolicy.backoffMultiplier, delivery.attempts - 1),
          this.defaultRetryPolicy.maxDelay
        );
        
        delivery.nextRetryAt = new Date(Date.now() + delay);
        
        await this.retryQueue.add(
          { delivery, endpoint, event },
          {
            delay,
            attempts: 1,
          }
        );
      }
    }

    // Update delivery record
    await this.updateDeliveryRecord(delivery);
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: any, secret: string): string {
    const message = JSON.stringify(payload);
    const signature = crypto
      .createHmac(this.signatureConfig.algorithm, secret)
      .update(message)
      .digest(this.signatureConfig.format || 'hex');
    
    return `${this.signatureConfig.algorithm}=${signature}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: any, 
    signature: string, 
    secret: string
  ): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret);
      
      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Validate endpoint URL
   */
  private async validateEndpointUrl(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);
      
      // Check for HTTPS in production
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        throw new Error('HTTPS is required for webhook URLs in production');
      }

      // Check if URL is reachable
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: () => true,
      });

      if (response.status >= 500) {
        throw new Error('Endpoint URL is not reachable');
      }
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send test webhook
   */
  private async sendTestWebhook(endpoint: WebhookEndpoint): Promise<void> {
    const testEvent: WebhookEvent = {
      id: `test-${Date.now()}`,
      type: 'test.ping',
      payload: {
        message: 'This is a test webhook from CastMatch',
        timestamp: new Date(),
      },
      timestamp: new Date(),
      source: 'webhook-manager',
      version: '1.0',
    };

    try {
      await this.deliverWebhookInternal(endpoint, testEvent);
      logger.info('Test webhook sent successfully', { endpointId: endpoint.id });
    } catch (error) {
      logger.warn('Test webhook failed', { endpointId: endpoint.id, error });
    }
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(endpointId: string): Promise<void> {
    try {
      await this.rateLimiter.consume(endpointId, 1);
    } catch (error) {
      throw new Error('Rate limit exceeded for endpoint');
    }
  }

  /**
   * Log webhook delivery
   */
  private async logDelivery(data: {
    endpointId: string;
    eventId: string;
    status: string;
    response?: any;
    error?: string;
    duration: number;
  }): Promise<void> {
    const delivery = {
      ...data,
      timestamp: new Date(),
    };

    await CacheManager.set(
      CacheKeys.webhookDelivery(`${data.endpointId}-${data.eventId}`),
      delivery,
      86400 * 7 // 7 days
    );

    // Also log to database for permanent record
    // await prisma.webhookDelivery.create({ data: delivery });
  }

  /**
   * Store webhook event
   */
  private async storeWebhookEvent(event: WebhookEvent): Promise<void> {
    await CacheManager.set(
      CacheKeys.webhookEvent(event.id),
      event,
      86400 * 30 // 30 days
    );

    // Also store in database
    // await prisma.webhookEvent.create({ data: event });
  }

  /**
   * Update delivery record
   */
  private async updateDeliveryRecord(delivery: WebhookDelivery): Promise<void> {
    await CacheManager.set(
      CacheKeys.webhookDelivery(`${delivery.endpointId}-${delivery.eventId}`),
      delivery,
      86400 * 7
    );

    // Update in database
    // await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: delivery });
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    endpoint: WebhookEndpoint, 
    event: WebhookEvent, 
    error: Error
  ): Promise<void> {
    logger.error('Webhook delivery failed permanently', {
      endpointId: endpoint.id,
      eventType: event.type,
      error: error.message,
    });

    // Send alert if critical event
    if (event.type.startsWith('payment.') || event.type.startsWith('subscription.')) {
      await this.sendWebhookFailureAlert(endpoint, event, error);
    }
  }

  /**
   * Handle retry failure
   */
  private async handleRetryFailure(
    delivery: WebhookDelivery, 
    error: Error
  ): Promise<void> {
    logger.error('Webhook retry failed permanently', {
      deliveryId: delivery.id,
      endpointId: delivery.endpointId,
      attempts: delivery.attempts,
      error: error.message,
    });
  }

  /**
   * Send webhook failure alert
   */
  private async sendWebhookFailureAlert(
    endpoint: WebhookEndpoint,
    event: WebhookEvent,
    error: Error
  ): Promise<void> {
    const { emailService } = await import('../../services/email.service');
    
    await emailService.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@castmatch.ai',
      subject: 'Critical Webhook Delivery Failure',
      html: `
        <h2>Webhook Delivery Failed</h2>
        <p><strong>Endpoint:</strong> ${endpoint.url}</p>
        <p><strong>Event Type:</strong> ${event.type}</p>
        <p><strong>Event ID:</strong> ${event.id}</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Failure Count:</strong> ${endpoint.failureCount}</p>
        <p>Please investigate this issue immediately.</p>
      `,
      text: `Webhook delivery failed for endpoint ${endpoint.url}. Event: ${event.type}. Error: ${error.message}`,
      priority: 'high',
    });
  }

  /**
   * Disable endpoint
   */
  private async disableEndpoint(endpointId: string): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      endpoint.isActive = false;
      this.endpoints.set(endpointId, endpoint);
      await CacheManager.set(
        CacheKeys.webhookEndpoint(endpointId),
        endpoint,
        86400 * 30
      );
      
      logger.warn('Webhook endpoint disabled due to excessive failures', { 
        endpointId,
        failureCount: endpoint.failureCount 
      });
    }
  }

  /**
   * Get webhook statistics
   */
  async getStatistics(endpointId?: string): Promise<{
    totalEvents: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    endpointStatus: Map<string, any>;
  }> {
    // This would aggregate data from database/cache
    // Placeholder implementation
    
    const stats = {
      totalEvents: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageDeliveryTime: 0,
      endpointStatus: new Map(),
    };

    if (endpointId) {
      const endpoint = this.endpoints.get(endpointId);
      if (endpoint) {
        stats.endpointStatus.set(endpointId, {
          url: endpoint.url,
          isActive: endpoint.isActive,
          failureCount: endpoint.failureCount,
          lastTriggered: endpoint.lastTriggered,
        });
      }
    } else {
      this.endpoints.forEach((endpoint, id) => {
        stats.endpointStatus.set(id, {
          url: endpoint.url,
          isActive: endpoint.isActive,
          failureCount: endpoint.failureCount,
          lastTriggered: endpoint.lastTriggered,
        });
      });
    }

    return stats;
  }

  /**
   * Replay webhook event
   */
  async replayEvent(eventId: string, endpointId?: string): Promise<void> {
    const event = await CacheManager.get(CacheKeys.webhookEvent(eventId));
    
    if (!event) {
      throw new Error('Event not found');
    }

    if (endpointId) {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint) {
        throw new Error('Endpoint not found');
      }
      
      await this.webhookQueue.add(
        { endpoint, event },
        {
          attempts: this.defaultRetryPolicy.maxAttempts,
          backoff: {
            type: 'exponential',
            delay: this.defaultRetryPolicy.initialDelay,
          },
        }
      );
    } else {
      await this.triggerEvent(event);
    }

    logger.info('Webhook event replayed', { eventId, endpointId });
  }

  /**
   * List all endpoints
   */
  listEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Get endpoint by ID
   */
  getEndpoint(endpointId: string): WebhookEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }
}

// Extend CacheKeys
declare module '../../config/redis' {
  interface CacheKeysInterface {
    webhookEndpoint(endpointId: string): string;
    webhookEvent(eventId: string): string;
    webhookDelivery(key: string): string;
  }
}

const originalCacheKeys = CacheKeys as any;
originalCacheKeys.webhookEndpoint = (endpointId: string) => `webhook:endpoint:${endpointId}`;
originalCacheKeys.webhookEvent = (eventId: string) => `webhook:event:${eventId}`;
originalCacheKeys.webhookDelivery = (key: string) => `webhook:delivery:${key}`;

export const webhookManagerService = new WebhookManagerService();