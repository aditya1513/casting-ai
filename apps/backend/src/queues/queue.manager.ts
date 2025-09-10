import Bull, { Queue, Job, JobOptions, QueueScheduler, QueueEvents } from 'bull';
import { logger } from '../utils/logger';
import Redis from 'ioredis';
import { emailService } from '../integrations/email.service';
import { smsService } from '../integrations/sms.service';

/**
 * Queue Manager - Central management for all Bull queues
 * Handles job scheduling, processing, and monitoring
 */

export interface QueueConfig {
  name: string;
  concurrency?: number;
  defaultJobOptions?: JobOptions;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
}

// Queue definitions
const QUEUE_CONFIGS: Record<string, QueueConfig> = {
  EMAIL: {
    name: 'email-queue',
    concurrency: 5,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
  SMS: {
    name: 'sms-queue',
    concurrency: 3,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  },
  MEMORY_CONSOLIDATION: {
    name: 'memory-consolidation-queue',
    concurrency: 2,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
    },
  },
  SEARCH_INDEXING: {
    name: 'search-indexing-queue',
    concurrency: 3,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    },
  },
  NOTIFICATION_DISPATCH: {
    name: 'notification-dispatch-queue',
    concurrency: 10,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
    },
  },
  FILE_PROCESSING: {
    name: 'file-processing-queue',
    concurrency: 2,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  },
  CALENDAR_SYNC: {
    name: 'calendar-sync-queue',
    concurrency: 2,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
    },
  },
};

class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private schedulers: Map<string, QueueScheduler> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redis: Redis;
  private redisSubscriber: Redis;
  private isInitialized: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    this.redisSubscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize all queues
      for (const [key, config] of Object.entries(QUEUE_CONFIGS)) {
        await this.createQueue(key, config);
      }

      // Set up job processors
      this.setupProcessors();

      this.isInitialized = true;
      logger.info('Queue manager initialized with all queues');
    } catch (error) {
      logger.error('Error initializing queue manager:', error);
    }
  }

  private async createQueue(key: string, config: QueueConfig) {
    // Create queue
    const queue = new Bull(config.name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      },
      defaultJobOptions: config.defaultJobOptions,
    });

    // Create scheduler for delayed/repeated jobs
    const scheduler = new QueueScheduler(config.name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      },
    });

    // Create queue events for monitoring
    const queueEvents = new QueueEvents(config.name, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      },
    });

    // Set up event listeners
    this.setupQueueEventListeners(key, queueEvents);

    // Store references
    this.queues.set(key, queue);
    this.schedulers.set(key, scheduler);
    this.queueEvents.set(key, queueEvents);

    logger.info(`Queue ${config.name} created`);
  }

  private setupQueueEventListeners(queueKey: string, queueEvents: QueueEvents) {
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.debug(`[${queueKey}] Job ${jobId} completed`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`[${queueKey}] Job ${jobId} failed: ${failedReason}`);
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug(`[${queueKey}] Job ${jobId} progress: ${data}`);
    });

    queueEvents.on('stalled', ({ jobId }) => {
      logger.warn(`[${queueKey}] Job ${jobId} stalled`);
    });
  }

  private setupProcessors() {
    // Email queue processor
    const emailQueue = this.queues.get('EMAIL');
    if (emailQueue) {
      emailQueue.process(QUEUE_CONFIGS.EMAIL.concurrency || 5, async (job: Job) => {
        return this.processEmailJob(job);
      });
    }

    // SMS queue processor
    const smsQueue = this.queues.get('SMS');
    if (smsQueue) {
      smsQueue.process(QUEUE_CONFIGS.SMS.concurrency || 3, async (job: Job) => {
        return this.processSMSJob(job);
      });
    }

    // Memory consolidation processor
    const memoryQueue = this.queues.get('MEMORY_CONSOLIDATION');
    if (memoryQueue) {
      memoryQueue.process(QUEUE_CONFIGS.MEMORY_CONSOLIDATION.concurrency || 2, async (job: Job) => {
        return this.processMemoryConsolidationJob(job);
      });
    }

    // Search indexing processor
    const searchQueue = this.queues.get('SEARCH_INDEXING');
    if (searchQueue) {
      searchQueue.process(QUEUE_CONFIGS.SEARCH_INDEXING.concurrency || 3, async (job: Job) => {
        return this.processSearchIndexingJob(job);
      });
    }

    // Notification dispatch processor
    const notificationQueue = this.queues.get('NOTIFICATION_DISPATCH');
    if (notificationQueue) {
      notificationQueue.process(QUEUE_CONFIGS.NOTIFICATION_DISPATCH.concurrency || 10, async (job: Job) => {
        return this.processNotificationJob(job);
      });
    }

    // File processing processor
    const fileQueue = this.queues.get('FILE_PROCESSING');
    if (fileQueue) {
      fileQueue.process(QUEUE_CONFIGS.FILE_PROCESSING.concurrency || 2, async (job: Job) => {
        return this.processFileJob(job);
      });
    }

    // Calendar sync processor
    const calendarQueue = this.queues.get('CALENDAR_SYNC');
    if (calendarQueue) {
      calendarQueue.process(QUEUE_CONFIGS.CALENDAR_SYNC.concurrency || 2, async (job: Job) => {
        return this.processCalendarSyncJob(job);
      });
    }
  }

  // Job Processors

  private async processEmailJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing email job ${job.id}`);
      const result = await emailService.sendImmediate(job.data);
      
      return {
        success: result.success,
        data: result,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`Email job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processSMSJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing SMS job ${job.id}`);
      const result = await smsService.sendImmediate(job.data);
      
      return {
        success: result.success,
        data: result,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`SMS job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processMemoryConsolidationJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing memory consolidation job ${job.id}`);
      
      // TODO: Implement actual memory consolidation logic
      // This would typically:
      // 1. Fetch recent conversations from Redis
      // 2. Analyze and extract key information
      // 3. Update long-term memory in PostgreSQL
      // 4. Clear processed short-term memories
      
      await job.progress(50);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await job.progress(100);
      
      return {
        success: true,
        data: { consolidated: true, memories: 0 },
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`Memory consolidation job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processSearchIndexingJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing search indexing job ${job.id}`);
      
      // TODO: Implement actual search indexing logic
      // This would typically:
      // 1. Fetch updated records from database
      // 2. Transform data for search index
      // 3. Update search index (Elasticsearch/Algolia)
      // 4. Mark records as indexed
      
      await job.progress(50);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await job.progress(100);
      
      return {
        success: true,
        data: { indexed: true, documents: 0 },
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`Search indexing job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processNotificationJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing notification job ${job.id}`);
      const { type, recipient, data } = job.data;
      
      let result;
      switch (type) {
        case 'email':
          result = await emailService.sendImmediate(data);
          break;
        case 'sms':
          result = await smsService.sendImmediate(data);
          break;
        case 'push':
          // TODO: Implement push notification
          result = { success: true };
          break;
        case 'in-app':
          // TODO: Implement in-app notification via WebSocket
          result = { success: true };
          break;
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }
      
      return {
        success: result.success,
        data: result,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`Notification job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processFileJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing file job ${job.id}`);
      const { operation, fileData } = job.data;
      
      // TODO: Implement file processing operations
      // - Image resizing
      // - Video transcoding
      // - Document parsing
      // - Virus scanning
      
      await job.progress(50);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await job.progress(100);
      
      return {
        success: true,
        data: { processed: true, operation },
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`File processing job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processCalendarSyncJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    try {
      logger.info(`Processing calendar sync job ${job.id}`);
      
      // TODO: Implement calendar sync logic
      // This would typically:
      // 1. Connect to Google Calendar API
      // 2. Fetch updated events
      // 3. Sync with local database
      // 4. Handle conflicts
      
      await job.progress(50);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await job.progress(100);
      
      return {
        success: true,
        data: { synced: true, events: 0 },
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error(`Calendar sync job ${job.id} failed:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  // Public Methods

  /**
   * Add job to queue
   */
  async addJob(
    queueKey: keyof typeof QUEUE_CONFIGS,
    data: any,
    options?: JobOptions
  ): Promise<Job | null> {
    const queue = this.queues.get(queueKey);
    if (!queue) {
      logger.error(`Queue ${queueKey} not found`);
      return null;
    }

    try {
      const job = await queue.add(data, options);
      logger.info(`Job ${job.id} added to queue ${queueKey}`);
      return job;
    } catch (error) {
      logger.error(`Error adding job to queue ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Add bulk jobs to queue
   */
  async addBulkJobs(
    queueKey: keyof typeof QUEUE_CONFIGS,
    jobs: Array<{ data: any; opts?: JobOptions }>
  ): Promise<Job[]> {
    const queue = this.queues.get(queueKey);
    if (!queue) {
      logger.error(`Queue ${queueKey} not found`);
      return [];
    }

    try {
      const addedJobs = await queue.addBulk(jobs);
      logger.info(`${addedJobs.length} jobs added to queue ${queueKey}`);
      return addedJobs;
    } catch (error) {
      logger.error(`Error adding bulk jobs to queue ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Add repeated job (cron)
   */
  async addRepeatedJob(
    queueKey: keyof typeof QUEUE_CONFIGS,
    name: string,
    data: any,
    repeat: { cron: string; tz?: string }
  ): Promise<Job | null> {
    const queue = this.queues.get(queueKey);
    if (!queue) {
      logger.error(`Queue ${queueKey} not found`);
      return null;
    }

    try {
      const job = await queue.add(name, data, { repeat });
      logger.info(`Repeated job ${job.id} added to queue ${queueKey}`);
      return job;
    } catch (error) {
      logger.error(`Error adding repeated job to queue ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(queueKey?: keyof typeof QUEUE_CONFIGS) {
    if (queueKey) {
      const queue = this.queues.get(queueKey);
      if (!queue) return null;
      
      const jobCounts = await queue.getJobCounts();
      return {
        name: queueKey,
        ...jobCounts,
      };
    }

    // Get all queue statuses
    const statuses = [];
    for (const [key, queue] of this.queues) {
      const jobCounts = await queue.getJobCounts();
      statuses.push({
        name: key,
        ...jobCounts,
      });
    }
    return statuses;
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueues(grace: number = 3600000) {
    for (const [key, queue] of this.queues) {
      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      logger.info(`Queue ${key} cleaned`);
    }
  }

  /**
   * Pause/resume queue
   */
  async pauseQueue(queueKey: keyof typeof QUEUE_CONFIGS) {
    const queue = this.queues.get(queueKey);
    if (queue) {
      await queue.pause();
      logger.info(`Queue ${queueKey} paused`);
    }
  }

  async resumeQueue(queueKey: keyof typeof QUEUE_CONFIGS) {
    const queue = this.queues.get(queueKey);
    if (queue) {
      await queue.resume();
      logger.info(`Queue ${queueKey} resumed`);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down queue manager...');
    
    // Close all queues
    for (const [key, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${key} closed`);
    }

    // Close all schedulers
    for (const [key, scheduler] of this.schedulers) {
      await scheduler.close();
      logger.info(`Scheduler ${key} closed`);
    }

    // Close all event listeners
    for (const [key, queueEvents] of this.queueEvents) {
      await queueEvents.close();
      logger.info(`Queue events ${key} closed`);
    }

    // Close Redis connections
    this.redis.disconnect();
    this.redisSubscriber.disconnect();

    logger.info('Queue manager shutdown complete');
  }
}

// Export singleton instance
export const queueManager = new QueueManager();

// Export types
export { QUEUE_CONFIGS };