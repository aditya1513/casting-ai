/**
 * Dead Letter Queue Service
 * Production-grade dead letter queue for failed integration operations with automatic recovery and analysis
 */

import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import axios, { AxiosError } from 'axios';

export interface DeadLetterMessage {
  id: string;
  originalQueue: string;
  operationType: 'webhook' | 'oauth' | 'email' | 'sms' | 'calendar' | 'storage' | 'video_conference';
  provider: string;
  payload: any;
  error: {
    message: string;
    stack?: string;
    code?: string | number;
    statusCode?: number;
    retryable: boolean;
  };
  metadata: {
    userId?: string;
    correlationId?: string;
    originalJobId?: string;
    attempts: number;
    firstFailedAt: Date;
    lastAttemptAt: Date;
    priority: number;
    tags: string[];
  };
  classification: {
    category: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    requiresManualIntervention: boolean;
  };
  recovery: {
    autoRetryEnabled: boolean;
    maxAutoRetries: number;
    nextRetryAt?: Date;
    retryStrategy: 'exponential' | 'linear' | 'fixed' | 'manual';
    currentRetryCount: number;
  };
  resolution?: {
    status: 'pending' | 'retrying' | 'resolved' | 'abandoned' | 'manual';
    resolvedAt?: Date;
    resolvedBy?: string;
    resolutionMethod?: string;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DeadLetterQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix?: string;
  };
  processing: {
    concurrency: number;
    processingInterval: number;
    batchSize: number;
  };
  retention: {
    maxMessages: number;
    retentionDays: number;
    archiveResolved: boolean;
  };
  recovery: {
    enableAutoRecovery: boolean;
    maxAutoRetries: number;
    retryIntervals: number[];
    recoveryStrategies: Record<string, RecoveryStrategy>;
  };
  alerts: {
    enableAlerts: boolean;
    alertThresholds: {
      messageCountHigh: number;
      messageCountCritical: number;
      errorRateHigh: number;
      errorRateCritical: number;
    };
    channels: ('email' | 'slack' | 'webhook')[];
  };
  analysis: {
    enablePatternAnalysis: boolean;
    patternDetectionWindow: number;
    anomalyDetectionEnabled: boolean;
  };
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  condition: (message: DeadLetterMessage) => boolean;
  handler: (message: DeadLetterMessage) => Promise<boolean>;
  retryDelay: number;
  maxRetries: number;
}

export interface DeadLetterStats {
  totalMessages: number;
  messagesByStatus: Record<string, number>;
  messagesByProvider: Record<string, number>;
  messagesByCategory: Record<string, number>;
  averageResolutionTime: number;
  autoRecoveryRate: number;
  manualInterventionRate: number;
  recentTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export interface DeadLetterAlert {
  id: string;
  type: 'high_volume' | 'error_spike' | 'recovery_failure' | 'manual_intervention_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedMessages: string[];
  metadata: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
}

const DEFAULT_CONFIG: Partial<DeadLetterQueueConfig> = {
  processing: {
    concurrency: 3,
    processingInterval: 30000, // 30 seconds
    batchSize: 10,
  },
  retention: {
    maxMessages: 10000,
    retentionDays: 30,
    archiveResolved: true,
  },
  recovery: {
    enableAutoRecovery: true,
    maxAutoRetries: 5,
    retryIntervals: [300000, 900000, 1800000, 3600000, 7200000], // 5m, 15m, 30m, 1h, 2h
  },
  alerts: {
    enableAlerts: true,
    alertThresholds: {
      messageCountHigh: 100,
      messageCountCritical: 500,
      errorRateHigh: 0.1, // 10%
      errorRateCritical: 0.25, // 25%
    },
    channels: ['email', 'webhook'],
  },
  analysis: {
    enablePatternAnalysis: true,
    patternDetectionWindow: 3600000, // 1 hour
    anomalyDetectionEnabled: true,
  },
};

export class DeadLetterQueueService extends EventEmitter {
  private redis: Redis;
  private processingQueue: Queue<ProcessingJob>;
  private config: DeadLetterQueueConfig;
  private messages: Map<string, DeadLetterMessage> = new Map();
  private stats: DeadLetterStats = {
    totalMessages: 0,
    messagesByStatus: {},
    messagesByProvider: {},
    messagesByCategory: {},
    averageResolutionTime: 0,
    autoRecoveryRate: 0,
    manualInterventionRate: 0,
    recentTrends: {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0),
      weekly: new Array(4).fill(0),
    },
  };
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private alerts: DeadLetterAlert[] = [];
  private processingInterval?: NodeJS.Timeout;

  constructor(config: DeadLetterQueueConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as DeadLetterQueueConfig;
    this.initializeRedis();
    this.initializeQueue();
    this.initializeRecoveryStrategies();
    this.startProcessing();
    this.loadExistingMessages();
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      keyPrefix: this.config.redis.keyPrefix || 'dlq:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in DeadLetterQueue:', error);
    });

    this.redis.on('connect', () => {
      logger.info('DeadLetterQueue connected to Redis');
    });
  }

  private initializeQueue(): void {
    this.processingQueue = new Bull('dlq-processing', {
      redis: {
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        keyPrefix: 'dlq:queue:',
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.processingQueue.process('process-dlq-message', 
      this.config.processing.concurrency,
      this.processDeadLetterMessage.bind(this)
    );

    this.setupQueueEventHandlers();
  }

  private initializeRecoveryStrategies(): void {
    // Network error recovery strategy
    this.recoveryStrategies.set('network-retry', {
      name: 'Network Retry Strategy',
      description: 'Retry network-related failures with exponential backoff',
      condition: (message) => message.classification.category === 'network',
      handler: async (message) => await this.retryNetworkOperation(message),
      retryDelay: 300000, // 5 minutes
      maxRetries: 3,
    });

    // OAuth token refresh strategy
    this.recoveryStrategies.set('oauth-refresh', {
      name: 'OAuth Token Refresh Strategy',
      description: 'Refresh OAuth tokens and retry operation',
      condition: (message) => 
        message.classification.category === 'auth' && 
        message.operationType === 'oauth' &&
        message.error.statusCode === 401,
      handler: async (message) => await this.refreshTokenAndRetry(message),
      retryDelay: 60000, // 1 minute
      maxRetries: 2,
    });

    // Webhook endpoint health check strategy
    this.recoveryStrategies.set('webhook-health-check', {
      name: 'Webhook Health Check Strategy',
      description: 'Check webhook endpoint health before retry',
      condition: (message) => 
        message.operationType === 'webhook' &&
        ['network', 'server'].includes(message.classification.category),
      handler: async (message) => await this.checkWebhookHealthAndRetry(message),
      retryDelay: 600000, // 10 minutes
      maxRetries: 5,
    });

    // Email service fallback strategy
    this.recoveryStrategies.set('email-fallback', {
      name: 'Email Service Fallback Strategy',
      description: 'Use alternative email service provider',
      condition: (message) => 
        message.operationType === 'email' &&
        message.classification.category === 'server',
      handler: async (message) => await this.retryWithFallbackEmailProvider(message),
      retryDelay: 300000, // 5 minutes
      maxRetries: 2,
    });

    // SMS service fallback strategy
    this.recoveryStrategies.set('sms-fallback', {
      name: 'SMS Service Fallback Strategy',
      description: 'Use alternative SMS service provider',
      condition: (message) => 
        message.operationType === 'sms' &&
        message.classification.category === 'server',
      handler: async (message) => await this.retryWithFallbackSMSProvider(message),
      retryDelay: 300000, // 5 minutes
      maxRetries: 2,
    });

    logger.info(`Initialized ${this.recoveryStrategies.size} recovery strategies`);
  }

  private setupQueueEventHandlers(): void {
    this.processingQueue.on('completed', (job: Job<ProcessingJob>, result) => {
      logger.info(`DLQ processing completed: ${job.id}`, {
        messageId: job.data.messageId,
        result,
      });
    });

    this.processingQueue.on('failed', (job: Job<ProcessingJob>, error) => {
      logger.error(`DLQ processing failed: ${job.id}`, {
        messageId: job.data.messageId,
        error: error.message,
      });
    });
  }

  /**
   * Add message to dead letter queue
   */
  async addMessage(
    originalQueue: string,
    operationType: DeadLetterMessage['operationType'],
    provider: string,
    payload: any,
    error: Error | AxiosError,
    metadata: Partial<DeadLetterMessage['metadata']> = {}
  ): Promise<string> {
    const messageId = uuidv4();
    const now = new Date();

    // Classify the error
    const classification = this.classifyError(error, operationType, provider);

    // Determine recovery settings
    const recovery = this.determineRecoverySettings(classification, operationType);

    const message: DeadLetterMessage = {
      id: messageId,
      originalQueue,
      operationType,
      provider,
      payload,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        statusCode: (error as AxiosError).response?.status,
        retryable: this.isRetryableError(error),
      },
      metadata: {
        correlationId: uuidv4(),
        attempts: 1,
        firstFailedAt: now,
        lastAttemptAt: now,
        priority: 1,
        tags: [],
        ...metadata,
      },
      classification,
      recovery,
      resolution: {
        status: 'pending',
      },
      createdAt: now,
      updatedAt: now,
    };

    // Store message
    await this.storeMessage(message);
    this.messages.set(messageId, message);

    // Update stats
    this.updateStats(message);

    // Check for alerts
    await this.checkAlerts();

    // Queue for processing if auto-retry is enabled
    if (recovery.autoRetryEnabled) {
      await this.scheduleRetry(message);
    }

    logger.info(`Added message to dead letter queue`, {
      messageId,
      operationType,
      provider,
      category: classification.category,
      severity: classification.severity,
    });

    this.emit('messageAdded', message);
    return messageId;
  }

  /**
   * Process dead letter message for recovery
   */
  private async processDeadLetterMessage(job: Job<ProcessingJob>): Promise<any> {
    const { messageId, strategyName } = job.data;
    
    const message = this.messages.get(messageId);
    if (!message) {
      throw new AppError(`Message not found: ${messageId}`, 404);
    }

    const strategy = this.recoveryStrategies.get(strategyName);
    if (!strategy) {
      throw new AppError(`Recovery strategy not found: ${strategyName}`, 404);
    }

    logger.info(`Processing DLQ message with strategy`, {
      messageId,
      strategy: strategyName,
      attempt: message.recovery.currentRetryCount + 1,
    });

    try {
      // Update message status
      message.resolution!.status = 'retrying';
      message.updatedAt = new Date();

      // Execute recovery strategy
      const recovered = await strategy.handler(message);

      if (recovered) {
        // Mark as resolved
        message.resolution!.status = 'resolved';
        message.resolution!.resolvedAt = new Date();
        message.resolution!.resolutionMethod = strategyName;
        message.updatedAt = new Date();

        await this.storeMessage(message);

        logger.info(`DLQ message recovered successfully`, {
          messageId,
          strategy: strategyName,
        });

        this.emit('messageRecovered', message);
        return { success: true, method: strategyName };

      } else {
        // Recovery failed, increment retry count
        message.recovery.currentRetryCount++;
        message.metadata.lastAttemptAt = new Date();

        // Check if max retries exceeded
        if (message.recovery.currentRetryCount >= message.recovery.maxAutoRetries) {
          message.resolution!.status = 'manual';
          message.classification.requiresManualIntervention = true;
          
          logger.warn(`DLQ message requires manual intervention`, {
            messageId,
            maxRetries: message.recovery.maxAutoRetries,
          });

          await this.createAlert({
            type: 'manual_intervention_needed',
            severity: message.classification.severity,
            message: `Message ${messageId} requires manual intervention after ${message.recovery.currentRetryCount} failed recovery attempts`,
            affectedMessages: [messageId],
            metadata: {
              operationType: message.operationType,
              provider: message.provider,
              category: message.classification.category,
            },
          });

          this.emit('manualInterventionRequired', message);
        } else {
          // Schedule next retry
          message.resolution!.status = 'pending';
          await this.scheduleRetry(message);
        }

        message.updatedAt = new Date();
        await this.storeMessage(message);

        return { success: false, willRetry: message.recovery.currentRetryCount < message.recovery.maxAutoRetries };
      }

    } catch (error: any) {
      logger.error(`Recovery strategy failed`, {
        messageId,
        strategy: strategyName,
        error: error.message,
      });

      // Update message with error details
      message.resolution!.status = 'pending';
      message.resolution!.notes = `Recovery strategy failed: ${error.message}`;
      message.updatedAt = new Date();
      await this.storeMessage(message);

      throw error;
    }
  }

  /**
   * Classify error for appropriate handling
   */
  private classifyError(
    error: Error | AxiosError,
    operationType: DeadLetterMessage['operationType'],
    provider: string
  ): DeadLetterMessage['classification'] {
    let category: DeadLetterMessage['classification']['category'] = 'unknown';
    let severity: DeadLetterMessage['classification']['severity'] = 'medium';
    let businessImpact: DeadLetterMessage['classification']['businessImpact'] = 'low';
    let requiresManualIntervention = false;

    // Network/connection errors
    if (error.message.includes('ENOTFOUND') || 
        error.message.includes('ECONNREFUSED') || 
        error.message.includes('timeout')) {
      category = 'network';
      severity = 'medium';
    }

    // HTTP status code based classification
    if ((error as AxiosError).response) {
      const status = (error as AxiosError).response!.status;
      
      if (status >= 400 && status < 500) {
        category = 'client';
        if (status === 401 || status === 403) {
          category = 'auth';
          severity = 'high';
        } else if (status === 422) {
          category = 'validation';
          severity = 'low';
          requiresManualIntervention = true;
        }
      } else if (status >= 500) {
        category = 'server';
        severity = 'high';
      }
    }

    // Operation type specific classification
    switch (operationType) {
      case 'webhook':
        if (category === 'network' || category === 'server') {
          businessImpact = 'medium';
        }
        break;
      case 'oauth':
        businessImpact = 'high';
        if (category === 'auth') {
          severity = 'high';
        }
        break;
      case 'email':
      case 'sms':
        businessImpact = 'medium';
        break;
      case 'calendar':
        businessImpact = 'high';
        break;
      case 'video_conference':
        businessImpact = 'critical';
        severity = 'high';
        break;
    }

    // Provider specific adjustments
    if (provider === 'stripe' || provider === 'zoom') {
      businessImpact = 'high';
    }

    return {
      category,
      severity,
      businessImpact,
      requiresManualIntervention,
    };
  }

  /**
   * Determine recovery settings based on classification
   */
  private determineRecoverySettings(
    classification: DeadLetterMessage['classification'],
    operationType: DeadLetterMessage['operationType']
  ): DeadLetterMessage['recovery'] {
    let autoRetryEnabled = this.config.recovery.enableAutoRecovery;
    let maxAutoRetries = this.config.recovery.maxAutoRetries;
    let retryStrategy: DeadLetterMessage['recovery']['retryStrategy'] = 'exponential';

    // Disable auto-retry for validation errors
    if (classification.category === 'validation') {
      autoRetryEnabled = false;
      retryStrategy = 'manual';
    }

    // Reduce retries for client errors
    if (classification.category === 'client') {
      maxAutoRetries = Math.min(2, maxAutoRetries);
    }

    // Increase retries for network issues
    if (classification.category === 'network') {
      maxAutoRetries = Math.max(5, maxAutoRetries);
    }

    // Critical operations get more retries
    if (classification.businessImpact === 'critical') {
      maxAutoRetries = Math.max(7, maxAutoRetries);
    }

    return {
      autoRetryEnabled,
      maxAutoRetries,
      retryStrategy,
      currentRetryCount: 0,
    };
  }

  /**
   * Schedule retry for message
   */
  private async scheduleRetry(message: DeadLetterMessage): Promise<void> {
    if (!message.recovery.autoRetryEnabled) {
      return;
    }

    // Find applicable recovery strategies
    const applicableStrategies = Array.from(this.recoveryStrategies.entries())
      .filter(([_, strategy]) => strategy.condition(message));

    if (applicableStrategies.length === 0) {
      logger.warn(`No recovery strategy found for message ${message.id}`);
      return;
    }

    // Use the first applicable strategy (they're prioritized)
    const [strategyName, strategy] = applicableStrategies[0];

    // Calculate delay based on retry count
    const retryIndex = Math.min(
      message.recovery.currentRetryCount,
      this.config.recovery.retryIntervals.length - 1
    );
    const delay = this.config.recovery.retryIntervals[retryIndex] || strategy.retryDelay;

    // Schedule the job
    const job = await this.processingQueue.add('process-dlq-message', {
      messageId: message.id,
      strategyName,
    }, {
      delay,
      attempts: 1,
    });

    message.recovery.nextRetryAt = new Date(Date.now() + delay);
    await this.storeMessage(message);

    logger.info(`Scheduled retry for DLQ message`, {
      messageId: message.id,
      strategy: strategyName,
      delayMs: delay,
      attempt: message.recovery.currentRetryCount + 1,
    });
  }

  // Recovery strategy implementations
  private async retryNetworkOperation(message: DeadLetterMessage): Promise<boolean> {
    try {
      // Simple retry for network operations
      if (message.operationType === 'webhook') {
        const response = await axios.post(message.payload.url, message.payload.data, {
          timeout: 30000,
          headers: message.payload.headers,
        });
        return response.status >= 200 && response.status < 300;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async refreshTokenAndRetry(message: DeadLetterMessage): Promise<boolean> {
    try {
      // This would integrate with the OAuth token manager
      // For now, return false to indicate manual intervention needed
      logger.info(`OAuth token refresh needed for message ${message.id}`);
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkWebhookHealthAndRetry(message: DeadLetterMessage): Promise<boolean> {
    try {
      // Health check the webhook endpoint
      const healthResponse = await axios.get(message.payload.url, {
        timeout: 10000,
        validateStatus: () => true,
      });
      
      if (healthResponse.status >= 200 && healthResponse.status < 300) {
        // Endpoint is healthy, retry the original request
        return await this.retryNetworkOperation(message);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async retryWithFallbackEmailProvider(message: DeadLetterMessage): Promise<boolean> {
    // This would integrate with email service fallback logic
    logger.info(`Email fallback needed for message ${message.id}`);
    return false;
  }

  private async retryWithFallbackSMSProvider(message: DeadLetterMessage): Promise<boolean> {
    // This would integrate with SMS service fallback logic
    logger.info(`SMS fallback needed for message ${message.id}`);
    return false;
  }

  /**
   * Store message in Redis
   */
  private async storeMessage(message: DeadLetterMessage): Promise<void> {
    await this.redis.hset(`message:${message.id}`, {
      data: JSON.stringify(message),
      updatedAt: Date.now(),
    });
    
    // Add to indexes
    await this.redis.sadd('messages:all', message.id);
    await this.redis.sadd(`messages:provider:${message.provider}`, message.id);
    await this.redis.sadd(`messages:type:${message.operationType}`, message.id);
    await this.redis.sadd(`messages:status:${message.resolution?.status}`, message.id);
  }

  /**
   * Load existing messages from Redis
   */
  private async loadExistingMessages(): Promise<void> {
    try {
      const messageIds = await this.redis.smembers('messages:all');
      
      for (const messageId of messageIds) {
        const stored = await this.redis.hget(`message:${messageId}`, 'data');
        if (stored) {
          const message = JSON.parse(stored);
          // Convert date strings back to Date objects
          message.createdAt = new Date(message.createdAt);
          message.updatedAt = new Date(message.updatedAt);
          message.metadata.firstFailedAt = new Date(message.metadata.firstFailedAt);
          message.metadata.lastAttemptAt = new Date(message.metadata.lastAttemptAt);
          if (message.recovery.nextRetryAt) {
            message.recovery.nextRetryAt = new Date(message.recovery.nextRetryAt);
          }
          if (message.resolution?.resolvedAt) {
            message.resolution.resolvedAt = new Date(message.resolution.resolvedAt);
          }
          
          this.messages.set(messageId, message);
        }
      }
      
      logger.info(`Loaded ${this.messages.size} existing DLQ messages`);
    } catch (error) {
      logger.error('Failed to load existing DLQ messages:', error);
    }
  }

  /**
   * Get messages with filtering and pagination
   */
  async getMessages(options: {
    status?: string;
    provider?: string;
    operationType?: string;
    severity?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ messages: DeadLetterMessage[]; total: number }> {
    let filteredMessages = Array.from(this.messages.values());

    // Apply filters
    if (options.status) {
      filteredMessages = filteredMessages.filter(m => m.resolution?.status === options.status);
    }
    if (options.provider) {
      filteredMessages = filteredMessages.filter(m => m.provider === options.provider);
    }
    if (options.operationType) {
      filteredMessages = filteredMessages.filter(m => m.operationType === options.operationType);
    }
    if (options.severity) {
      filteredMessages = filteredMessages.filter(m => m.classification.severity === options.severity);
    }

    // Sort
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    filteredMessages.sort((a, b) => {
      const aVal = a[sortBy] instanceof Date ? (a[sortBy] as Date).getTime() : a[sortBy];
      const bVal = b[sortBy] instanceof Date ? (b[sortBy] as Date).getTime() : b[sortBy];
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    const total = filteredMessages.length;
    
    // Paginate
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const messages = filteredMessages.slice(offset, offset + limit);

    return { messages, total };
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(): Promise<DeadLetterStats> {
    await this.updateStats();
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(newMessage?: DeadLetterMessage): void {
    if (newMessage) {
      this.stats.totalMessages++;
      this.updateStatusCount(newMessage.resolution?.status || 'pending');
      this.updateProviderCount(newMessage.provider);
      this.updateCategoryCount(newMessage.classification.category);
    }

    // Recalculate comprehensive stats
    const allMessages = Array.from(this.messages.values());
    this.stats.totalMessages = allMessages.length;

    // Reset counters
    this.stats.messagesByStatus = {};
    this.stats.messagesByProvider = {};
    this.stats.messagesByCategory = {};

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let autoRecoveredCount = 0;
    let manualCount = 0;

    for (const message of allMessages) {
      // Status counts
      const status = message.resolution?.status || 'pending';
      this.stats.messagesByStatus[status] = (this.stats.messagesByStatus[status] || 0) + 1;

      // Provider counts
      this.stats.messagesByProvider[message.provider] = 
        (this.stats.messagesByProvider[message.provider] || 0) + 1;

      // Category counts
      this.stats.messagesByCategory[message.classification.category] = 
        (this.stats.messagesByCategory[message.classification.category] || 0) + 1;

      // Resolution time and recovery rates
      if (message.resolution?.status === 'resolved' && message.resolution.resolvedAt) {
        resolvedCount++;
        const resolutionTime = message.resolution.resolvedAt.getTime() - message.createdAt.getTime();
        totalResolutionTime += resolutionTime;

        if (message.resolution.resolutionMethod !== 'manual') {
          autoRecoveredCount++;
        }
      }

      if (message.resolution?.status === 'manual' || message.classification.requiresManualIntervention) {
        manualCount++;
      }
    }

    this.stats.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
    this.stats.autoRecoveryRate = this.stats.totalMessages > 0 ? autoRecoveredCount / this.stats.totalMessages : 0;
    this.stats.manualInterventionRate = this.stats.totalMessages > 0 ? manualCount / this.stats.totalMessages : 0;
  }

  private updateStatusCount(status: string): void {
    this.stats.messagesByStatus[status] = (this.stats.messagesByStatus[status] || 0) + 1;
  }

  private updateProviderCount(provider: string): void {
    this.stats.messagesByProvider[provider] = (this.stats.messagesByProvider[provider] || 0) + 1;
  }

  private updateCategoryCount(category: string): void {
    this.stats.messagesByCategory[category] = (this.stats.messagesByCategory[category] || 0) + 1;
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(): Promise<void> {
    if (!this.config.alerts.enableAlerts) {
      return;
    }

    const pendingMessages = Array.from(this.messages.values())
      .filter(m => m.resolution?.status === 'pending').length;

    // High message count alert
    if (pendingMessages >= this.config.alerts.alertThresholds.messageCountCritical) {
      await this.createAlert({
        type: 'high_volume',
        severity: 'critical',
        message: `Critical: ${pendingMessages} messages in dead letter queue`,
        affectedMessages: [],
        metadata: { count: pendingMessages },
      });
    } else if (pendingMessages >= this.config.alerts.alertThresholds.messageCountHigh) {
      await this.createAlert({
        type: 'high_volume',
        severity: 'high',
        message: `High: ${pendingMessages} messages in dead letter queue`,
        affectedMessages: [],
        metadata: { count: pendingMessages },
      });
    }
  }

  /**
   * Create alert
   */
  private async createAlert(alertData: Omit<DeadLetterAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const alert: DeadLetterAlert = {
      ...alertData,
      id: uuidv4(),
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.unshift(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(0, 500);
    }

    logger.warn('DLQ alert created', alert);
    this.emit('alert', alert);
  }

  /**
   * Helper methods
   */
  private isRetryableError(error: Error | AxiosError): boolean {
    // Network errors are generally retryable
    if (!('response' in error) || !error.response) {
      return true;
    }

    const status = error.response.status;
    
    // Don't retry client errors (except 408, 429)
    if (status >= 400 && status < 500) {
      return status === 408 || status === 429;
    }

    // Retry server errors
    return status >= 500;
  }

  private startProcessing(): void {
    // Start periodic processing for scheduled retries
    this.processingInterval = setInterval(async () => {
      try {
        const now = new Date();
        const readyMessages = Array.from(this.messages.values()).filter(message =>
          message.resolution?.status === 'pending' &&
          message.recovery.nextRetryAt &&
          message.recovery.nextRetryAt <= now
        );

        for (const message of readyMessages) {
          await this.scheduleRetry(message);
        }
      } catch (error) {
        logger.error('DLQ processing interval error:', error);
      }
    }, this.config.processing.processingInterval);
  }

  /**
   * Get recent alerts
   */
  async getAlerts(limit: number = 50): Promise<DeadLetterAlert[]> {
    return this.alerts.slice(0, limit);
  }

  /**
   * Manually retry message
   */
  async manualRetry(messageId: string, strategy?: string): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new AppError(`Message not found: ${messageId}`, 404);
    }

    // Find strategy or use first applicable one
    let selectedStrategy: string;
    if (strategy && this.recoveryStrategies.has(strategy)) {
      selectedStrategy = strategy;
    } else {
      const applicableStrategies = Array.from(this.recoveryStrategies.entries())
        .filter(([_, s]) => s.condition(message));
      
      if (applicableStrategies.length === 0) {
        throw new AppError('No applicable recovery strategy found', 400);
      }
      
      selectedStrategy = applicableStrategies[0][0];
    }

    // Queue for immediate processing
    await this.processingQueue.add('process-dlq-message', {
      messageId,
      strategyName: selectedStrategy,
    });

    logger.info(`Manually queued message for retry`, {
      messageId,
      strategy: selectedStrategy,
    });

    return true;
  }

  /**
   * Abandon message (mark as permanently failed)
   */
  async abandonMessage(messageId: string, reason: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new AppError(`Message not found: ${messageId}`, 404);
    }

    message.resolution!.status = 'abandoned';
    message.resolution!.resolvedAt = new Date();
    message.resolution!.notes = reason;
    message.updatedAt = new Date();

    await this.storeMessage(message);

    logger.info(`Message abandoned`, {
      messageId,
      reason,
    });

    this.emit('messageAbandoned', message);
  }

  /**
   * Clean up old messages
   */
  async cleanup(): Promise<{ removed: number; archived: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.retentionDays);

    let removed = 0;
    let archived = 0;

    for (const [messageId, message] of this.messages.entries()) {
      if (message.createdAt < cutoffDate) {
        if (this.config.retention.archiveResolved && message.resolution?.status === 'resolved') {
          // Archive resolved messages
          await this.redis.hset(`archived:${messageId}`, {
            data: JSON.stringify(message),
            archivedAt: Date.now(),
          });
          archived++;
        }

        // Remove from active storage
        await this.redis.del(`message:${messageId}`);
        await this.redis.srem('messages:all', messageId);
        await this.redis.srem(`messages:provider:${message.provider}`, messageId);
        await this.redis.srem(`messages:type:${message.operationType}`, messageId);
        await this.redis.srem(`messages:status:${message.resolution?.status}`, messageId);
        
        this.messages.delete(messageId);
        removed++;
      }
    }

    logger.info(`DLQ cleanup completed`, { removed, archived });
    return { removed, archived };
  }

  /**
   * Stop processing
   */
  async stop(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    await this.processingQueue.close();
    this.redis.disconnect();
    
    logger.info('DeadLetterQueue service stopped');
  }
}

// Job type for processing queue
interface ProcessingJob {
  messageId: string;
  strategyName: string;
}

export default DeadLetterQueueService;