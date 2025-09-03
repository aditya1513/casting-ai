/**
 * Embedding Job Service
 * Background job for generating and updating talent embeddings
 */

import { aiMatchingService } from './ai-matching.service';
import { vectorService } from './vector.service';
import { embeddingService, TalentProfileData } from './embedding.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { CacheManager } from '../config/redis';
import Bull from 'bull';
import { redis } from '../config/redis';

/**
 * Job types for embedding operations
 */
export enum EmbeddingJobType {
  UPDATE_SINGLE = 'update_single_embedding',
  UPDATE_BATCH = 'update_batch_embeddings',
  UPDATE_ALL = 'update_all_embeddings',
  DELETE_EMBEDDING = 'delete_embedding',
  SYNC_EMBEDDINGS = 'sync_embeddings',
}

/**
 * Job data interfaces
 */
export interface UpdateSingleJobData {
  talentId: string;
  priority?: boolean;
}

export interface UpdateBatchJobData {
  talentIds: string[];
  batchSize?: number;
}

export interface UpdateAllJobData {
  batchSize?: number;
  filter?: {
    verified?: boolean;
    isActive?: boolean;
    updatedAfter?: Date;
  };
}

export interface DeleteEmbeddingJobData {
  talentId: string;
}

class EmbeddingJobService {
  private queue: Bull.Queue;
  private isProcessing: boolean = false;

  constructor() {
    // Initialize Bull queue with Redis connection
    this.queue = new Bull('embedding-jobs', {
      redis: {
        port: 6379,
        host: 'localhost',
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupJobProcessors();
    this.setupEventHandlers();
  }

  /**
   * Setup job processors
   */
  private setupJobProcessors() {
    // Process single talent embedding update
    this.queue.process(EmbeddingJobType.UPDATE_SINGLE, async (job) => {
      const { talentId, priority } = job.data as UpdateSingleJobData;
      
      logger.info(`Processing single embedding update for talent: ${talentId}`);
      
      try {
        await aiMatchingService.updateTalentEmbedding(talentId);
        
        // Clear related caches
        await CacheManager.delete(`talent:${talentId}`);
        await CacheManager.clearPattern(`search:*`);
        
        return { success: true, talentId };
      } catch (error) {
        logger.error(`Failed to update embedding for talent ${talentId}:`, error);
        throw error;
      }
    });

    // Process batch embedding update
    this.queue.process(EmbeddingJobType.UPDATE_BATCH, async (job) => {
      const { talentIds, batchSize = 10 } = job.data as UpdateBatchJobData;
      
      logger.info(`Processing batch embedding update for ${talentIds.length} talents`);
      
      const results = {
        successful: [] as string[],
        failed: [] as { talentId: string; error: string }[],
      };
      
      // Process in batches
      for (let i = 0; i < talentIds.length; i += batchSize) {
        const batch = talentIds.slice(i, i + batchSize);
        
        // Update job progress
        job.progress(Math.round((i / talentIds.length) * 100));
        
        await Promise.all(
          batch.map(async (talentId) => {
            try {
              await aiMatchingService.updateTalentEmbedding(talentId);
              results.successful.push(talentId);
            } catch (error: any) {
              results.failed.push({
                talentId,
                error: error.message || 'Unknown error',
              });
            }
          })
        );
      }
      
      // Clear search cache
      await CacheManager.clearPattern('search:*');
      
      return results;
    });

    // Process full database embedding update
    this.queue.process(EmbeddingJobType.UPDATE_ALL, async (job) => {
      const { batchSize = 50, filter } = job.data as UpdateAllJobData;
      
      logger.info('Processing full database embedding update');
      
      // Build filter conditions
      const whereClause: any = {};
      if (filter?.verified !== undefined) {
        whereClause.isVerified = filter.verified;
      }
      if (filter?.isActive !== undefined) {
        whereClause.isActive = filter.isActive;
      }
      if (filter?.updatedAfter) {
        whereClause.updatedAt = { gte: filter.updatedAfter };
      }
      
      // Get total count for progress tracking
      const totalCount = await prisma.talent.count({ where: whereClause });
      
      const result = await aiMatchingService.updateAllTalentEmbeddings({
        batchSize,
        onProgress: (processed, total) => {
          // Update job progress
          job.progress(Math.round((processed / total) * 100));
          
          // Log progress every 10%
          const percentage = Math.round((processed / total) * 100);
          if (percentage % 10 === 0) {
            logger.info(`Embedding update progress: ${percentage}% (${processed}/${total})`);
          }
        },
      });
      
      // Clear all caches after full update
      await CacheManager.clearPattern('*');
      
      return result;
    });

    // Process embedding deletion
    this.queue.process(EmbeddingJobType.DELETE_EMBEDDING, async (job) => {
      const { talentId } = job.data as DeleteEmbeddingJobData;
      
      logger.info(`Deleting embedding for talent: ${talentId}`);
      
      try {
        await vectorService.deleteTalentEmbedding(talentId);
        await CacheManager.delete(`talent:${talentId}`);
        
        return { success: true, talentId };
      } catch (error) {
        logger.error(`Failed to delete embedding for talent ${talentId}:`, error);
        throw error;
      }
    });

    // Process embedding synchronization
    this.queue.process(EmbeddingJobType.SYNC_EMBEDDINGS, async (job) => {
      logger.info('Starting embedding synchronization');
      
      // Get all talents that need embedding updates
      const talentsNeedingUpdate = await prisma.talent.findMany({
        where: {
          OR: [
            { embeddingId: null },
            { embeddingUpdatedAt: null },
            {
              embeddingUpdatedAt: {
                lt: prisma.talent.fields.updatedAt,
              },
            },
          ],
          isActive: true,
        },
        select: {
          id: true,
          updatedAt: true,
          embeddingUpdatedAt: true,
        },
      });
      
      logger.info(`Found ${talentsNeedingUpdate.length} talents needing embedding updates`);
      
      // Queue individual update jobs
      const jobs = talentsNeedingUpdate.map(talent => ({
        name: EmbeddingJobType.UPDATE_SINGLE,
        data: { talentId: talent.id },
        opts: {
          delay: Math.random() * 5000, // Spread out jobs over 5 seconds
          priority: talent.embeddingId ? 2 : 1, // Prioritize new embeddings
        },
      }));
      
      await this.queue.addBulk(jobs as any);
      
      return {
        queued: talentsNeedingUpdate.length,
        talentIds: talentsNeedingUpdate.map(t => t.id),
      };
    });
  }

  /**
   * Setup event handlers for job monitoring
   */
  private setupEventHandlers() {
    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed:`, { type: job.name, result });
    });

    this.queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, { type: job.name, error: error.message });
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled:`, { type: job.name });
    });

    this.queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Queue a single talent embedding update
   */
  async queueSingleUpdate(talentId: string, priority: boolean = false): Promise<Bull.Job> {
    const job = await this.queue.add(
      EmbeddingJobType.UPDATE_SINGLE,
      { talentId, priority },
      {
        priority: priority ? 1 : 3,
        delay: priority ? 0 : 1000,
      }
    );
    
    logger.info(`Queued single embedding update: ${talentId}`);
    return job;
  }

  /**
   * Queue batch talent embedding updates
   */
  async queueBatchUpdate(talentIds: string[], batchSize: number = 10): Promise<Bull.Job> {
    const job = await this.queue.add(
      EmbeddingJobType.UPDATE_BATCH,
      { talentIds, batchSize },
      {
        priority: 2,
      }
    );
    
    logger.info(`Queued batch embedding update for ${talentIds.length} talents`);
    return job;
  }

  /**
   * Queue full database embedding update
   */
  async queueFullUpdate(options?: UpdateAllJobData): Promise<Bull.Job> {
    // Check if a full update is already running
    const activeJobs = await this.queue.getActive();
    const isFullUpdateRunning = activeJobs.some(
      job => job.name === EmbeddingJobType.UPDATE_ALL
    );
    
    if (isFullUpdateRunning) {
      throw new Error('Full embedding update is already in progress');
    }
    
    const job = await this.queue.add(
      EmbeddingJobType.UPDATE_ALL,
      options || {},
      {
        priority: 4, // Lowest priority
        attempts: 1, // Don't retry full updates
      }
    );
    
    logger.info('Queued full database embedding update');
    return job;
  }

  /**
   * Queue embedding deletion
   */
  async queueDeletion(talentId: string): Promise<Bull.Job> {
    const job = await this.queue.add(
      EmbeddingJobType.DELETE_EMBEDDING,
      { talentId },
      {
        priority: 1, // High priority for deletions
      }
    );
    
    logger.info(`Queued embedding deletion: ${talentId}`);
    return job;
  }

  /**
   * Queue embedding synchronization
   */
  async queueSync(): Promise<Bull.Job> {
    const job = await this.queue.add(
      EmbeddingJobType.SYNC_EMBEDDINGS,
      {},
      {
        priority: 3,
      }
    );
    
    logger.info('Queued embedding synchronization');
    return job;
  }

  /**
   * Get job statistics
   */
  async getJobStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Clear completed jobs
   */
  async clearCompletedJobs(): Promise<void> {
    await this.queue.clean(0, 'completed');
    logger.info('Cleared completed embedding jobs');
  }

  /**
   * Clear failed jobs
   */
  async clearFailedJobs(): Promise<void> {
    await this.queue.clean(0, 'failed');
    logger.info('Cleared failed embedding jobs');
  }

  /**
   * Pause job processing
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.isProcessing = false;
    logger.info('Embedding job processing paused');
  }

  /**
   * Resume job processing
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.isProcessing = true;
    logger.info('Embedding job processing resumed');
  }

  /**
   * Schedule periodic sync job
   */
  async schedulePeriodicSync(cronExpression: string = '0 */6 * * *'): Promise<void> {
    // Every 6 hours by default
    await this.queue.add(
      EmbeddingJobType.SYNC_EMBEDDINGS,
      {},
      {
        repeat: {
          cron: cronExpression,
        },
      }
    );
    
    logger.info(`Scheduled periodic embedding sync with cron: ${cronExpression}`);
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    logger.info('Embedding job queue closed');
  }
}

// Export singleton instance
export const embeddingJobService = new EmbeddingJobService();