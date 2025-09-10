/**
 * Episodic Memory Service
 * Manages short-term conversational memory and interaction history
 * Part of the advanced CastMatch memory architecture
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface EpisodicMemory {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  interaction: {
    userInput: string;
    aiResponse: string;
    context?: Record<string, any>;
  };
  metadata: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    topics?: string[];
    entities?: string[];
    importance: number; // 0-1 score
  };
  ttl?: number; // Time to live in seconds
}

export interface EpisodicMemoryQuery {
  userId?: string;
  sessionId?: string;
  startTime?: Date;
  endTime?: Date;
  topics?: string[];
  minImportance?: number;
  limit?: number;
}

export class EpisodicMemoryService {
  private redis: Redis;
  private readonly DEFAULT_TTL = 900; // 15 minutes for working memory
  private readonly EXTENDED_TTL = 3600; // 1 hour for important memories
  private readonly NAMESPACE = 'episodic:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1, // Use DB 1 for episodic memory
    });

    this.redis.on('connect', () => {
      logger.info('Episodic memory service connected to Redis');
    });

    this.redis.on('error', (err) => {
      logger.error('Episodic memory Redis error:', err);
    });
  }

  /**
   * Store a new episodic memory
   */
  async store(memory: Omit<EpisodicMemory, 'id'>): Promise<EpisodicMemory> {
    try {
      const id = uuidv4();
      const fullMemory: EpisodicMemory = {
        id,
        ...memory,
        timestamp: memory.timestamp || new Date(),
      };

      // Determine TTL based on importance
      const ttl = fullMemory.metadata.importance > 0.7 
        ? this.EXTENDED_TTL 
        : memory.ttl || this.DEFAULT_TTL;

      // Store in Redis with expiration
      const key = `${this.NAMESPACE}${fullMemory.userId}:${id}`;
      await this.redis.setex(
        key,
        ttl,
        JSON.stringify(fullMemory)
      );

      // Add to user's session index
      const sessionKey = `${this.NAMESPACE}session:${fullMemory.sessionId}`;
      await this.redis.zadd(
        sessionKey,
        Date.now(),
        id
      );
      await this.redis.expire(sessionKey, ttl);

      // Add to user's memory index
      const userIndexKey = `${this.NAMESPACE}index:${fullMemory.userId}`;
      await this.redis.zadd(
        userIndexKey,
        Date.now(),
        id
      );
      await this.redis.expire(userIndexKey, this.EXTENDED_TTL);

      // Index by topics if present
      if (fullMemory.metadata.topics) {
        for (const topic of fullMemory.metadata.topics) {
          const topicKey = `${this.NAMESPACE}topic:${topic}`;
          await this.redis.sadd(topicKey, id);
          await this.redis.expire(topicKey, ttl);
        }
      }

      logger.info(`Stored episodic memory ${id} for user ${fullMemory.userId}`);
      return fullMemory;
    } catch (error) {
      logger.error('Failed to store episodic memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve a specific episodic memory
   */
  async retrieve(userId: string, memoryId: string): Promise<EpisodicMemory | null> {
    try {
      const key = `${this.NAMESPACE}${userId}:${memoryId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data) as EpisodicMemory;
    } catch (error) {
      logger.error('Failed to retrieve episodic memory:', error);
      throw error;
    }
  }

  /**
   * Query episodic memories based on criteria
   */
  async query(query: EpisodicMemoryQuery): Promise<EpisodicMemory[]> {
    try {
      const memories: EpisodicMemory[] = [];
      let memoryIds: string[] = [];

      // Get memory IDs based on query type
      if (query.sessionId) {
        const sessionKey = `${this.NAMESPACE}session:${query.sessionId}`;
        memoryIds = await this.redis.zrange(sessionKey, 0, -1);
      } else if (query.userId) {
        const userIndexKey = `${this.NAMESPACE}index:${query.userId}`;
        memoryIds = await this.redis.zrange(userIndexKey, 0, -1);
      }

      // Filter by topics if specified
      if (query.topics && query.topics.length > 0) {
        const topicMemoryIds = new Set<string>();
        for (const topic of query.topics) {
          const topicKey = `${this.NAMESPACE}topic:${topic}`;
          const ids = await this.redis.smembers(topicKey);
          ids.forEach(id => topicMemoryIds.add(id));
        }
        memoryIds = memoryIds.filter(id => topicMemoryIds.has(id));
      }

      // Retrieve and filter memories
      for (const memoryId of memoryIds) {
        const key = `${this.NAMESPACE}${query.userId || '*'}:${memoryId}`;
        const keys = await this.redis.keys(key);
        
        for (const memKey of keys) {
          const data = await this.redis.get(memKey);
          if (data) {
            const memory = JSON.parse(data) as EpisodicMemory;
            
            // Apply filters
            if (query.startTime && new Date(memory.timestamp) < query.startTime) continue;
            if (query.endTime && new Date(memory.timestamp) > query.endTime) continue;
            if (query.minImportance && memory.metadata.importance < query.minImportance) continue;
            
            memories.push(memory);
            
            if (query.limit && memories.length >= query.limit) {
              return memories;
            }
          }
        }
      }

      // Sort by timestamp (most recent first)
      memories.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return query.limit ? memories.slice(0, query.limit) : memories;
    } catch (error) {
      logger.error('Failed to query episodic memories:', error);
      throw error;
    }
  }

  /**
   * Get recent memories for a session (last N interactions)
   */
  async getRecentSessionMemories(
    sessionId: string, 
    limit: number = 10
  ): Promise<EpisodicMemory[]> {
    try {
      const sessionKey = `${this.NAMESPACE}session:${sessionId}`;
      const memoryIds = await this.redis.zrevrange(sessionKey, 0, limit - 1);
      
      const memories: EpisodicMemory[] = [];
      for (const memoryId of memoryIds) {
        const pattern = `${this.NAMESPACE}*:${memoryId}`;
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            memories.push(JSON.parse(data) as EpisodicMemory);
          }
        }
      }

      return memories;
    } catch (error) {
      logger.error('Failed to get recent session memories:', error);
      throw error;
    }
  }

  /**
   * Update memory importance (for consolidation)
   */
  async updateImportance(
    userId: string, 
    memoryId: string, 
    importance: number
  ): Promise<void> {
    try {
      const key = `${this.NAMESPACE}${userId}:${memoryId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      const memory = JSON.parse(data) as EpisodicMemory;
      memory.metadata.importance = importance;

      // Extend TTL if importance increased
      const ttl = importance > 0.7 ? this.EXTENDED_TTL : this.DEFAULT_TTL;
      await this.redis.setex(key, ttl, JSON.stringify(memory));

      logger.info(`Updated importance for memory ${memoryId} to ${importance}`);
    } catch (error) {
      logger.error('Failed to update memory importance:', error);
      throw error;
    }
  }

  /**
   * Clear all memories for a user (privacy/reset)
   */
  async clearUserMemories(userId: string): Promise<void> {
    try {
      const pattern = `${this.NAMESPACE}${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Clear user index
      const userIndexKey = `${this.NAMESPACE}index:${userId}`;
      await this.redis.del(userIndexKey);

      logger.info(`Cleared all memories for user ${userId}`);
    } catch (error) {
      logger.error('Failed to clear user memories:', error);
      throw error;
    }
  }

  /**
   * Get memory statistics for monitoring
   */
  async getStats(userId?: string): Promise<{
    totalMemories: number;
    averageImportance: number;
    topTopics: string[];
    memoryDistribution: Record<string, number>;
  }> {
    try {
      const pattern = userId 
        ? `${this.NAMESPACE}${userId}:*`
        : `${this.NAMESPACE}*`;
      
      const keys = await this.redis.keys(pattern);
      let totalImportance = 0;
      const topicCounts: Record<string, number> = {};
      const hourlyDistribution: Record<string, number> = {};

      for (const key of keys) {
        if (key.includes(':index:') || key.includes(':session:') || key.includes(':topic:')) {
          continue;
        }

        const data = await this.redis.get(key);
        if (data) {
          const memory = JSON.parse(data) as EpisodicMemory;
          totalImportance += memory.metadata.importance;
          
          // Count topics
          if (memory.metadata.topics) {
            for (const topic of memory.metadata.topics) {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
          }

          // Track hourly distribution
          const hour = new Date(memory.timestamp).getHours();
          const hourKey = `${hour}:00`;
          hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + 1;
        }
      }

      // Get top topics
      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);

      return {
        totalMemories: keys.length,
        averageImportance: keys.length > 0 ? totalImportance / keys.length : 0,
        topTopics,
        memoryDistribution: hourlyDistribution,
      };
    } catch (error) {
      logger.error('Failed to get memory stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired memories (called periodically)
   */
  async cleanup(): Promise<void> {
    // Redis handles expiration automatically
    // This method is for any additional cleanup logic
    logger.info('Episodic memory cleanup completed (Redis TTL-based)');
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('Episodic memory service disconnected');
  }
}

// Export singleton instance
export const episodicMemoryService = new EpisodicMemoryService();