/**
 * Redis Configuration
 * Redis client initialization for caching and session management
 */

import Redis from 'ioredis';
import { config } from './config';
import { logger } from '../utils/logger';

/**
 * Initialize Redis client with retry strategy
 */
// Only include password if it's set and not empty
const redisOptions: any = {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

// Only add password if it's provided and Redis requires it
if (config.redis.password && config.redis.password !== '') {
  redisOptions.password = config.redis.password;
}

export const redis = new Redis(config.redis.url, redisOptions);

// Event handlers
redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('❌ Redis error:', error);
});

redis.on('ready', () => {
  logger.info('✅ Redis ready to accept commands');
});

redis.on('close', () => {
  logger.info('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.info(`Reconnecting to Redis after ${delay}ms`);
});

/**
 * Cache manager utility class
 */
export class CacheManager {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  
  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Set value in cache with TTL
   */
  static async set(key: string, value: any, ttl: number = CacheManager.DEFAULT_TTL): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await redis.setex(key, ttl, serialized);
      return result === 'OK';
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Delete value from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Delete value from cache (alias for delete)
   */
  static async del(key: string): Promise<boolean> {
    return CacheManager.delete(key);
  }
  
  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await redis.del(...keys);
      return result;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }
  
  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Get TTL for a key
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }
  
  /**
   * Increment a counter
   */
  static async increment(key: string, ttl?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttl && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }
  
  /**
   * Decrement a counter
   */
  static async decrement(key: string): Promise<number> {
    try {
      const result = await redis.decr(key);
      return Math.max(0, result); // Don't go below 0
    } catch (error) {
      logger.error(`Cache decrement error for key ${key}:`, error);
      return 0;
    }
  }
  
  /**
   * Flush all cache
   */
  static async flush(): Promise<boolean> {
    try {
      if (config.isProduction) {
        logger.warn('Cache flush attempted in production - skipping');
        return false;
      }
      const result = await redis.flushdb();
      return result === 'OK';
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  // User related
  user: (id: string) => `user:${id}`,
  userSession: (userId: string, sessionId: string) => `session:${userId}:${sessionId}`,
  userRefreshToken: (userId: string) => `refresh:${userId}`,
  
  // Actor related
  actor: (id: string) => `actor:${id}`,
  actorProfile: (userId: string) => `actor:profile:${userId}`,
  actorMedia: (actorId: string) => `actor:media:${actorId}`,
  
  // Talent related
  talent: (id: string) => `talent:${id}`,
  talentProfile: (userId: string) => `talent:profile:${userId}`,
  talentMedia: (talentId: string) => `talent:media:${talentId}`,
  
  // Project related
  project: (id: string) => `project:${id}`,
  projectList: (page: number, limit: number) => `projects:list:${page}:${limit}`,
  projectRoles: (projectId: string) => `project:roles:${projectId}`,
  
  // Search related
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
  
  // Stats and counts
  actorStats: (actorId: string) => `stats:actor:${actorId}`,
  projectStats: (projectId: string) => `stats:project:${projectId}`,
  
  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  
  // Email delivery logging
  emailDeliveryLog: (id: string) => `email:delivery:${id}`,
  
  // Notification related
  userNotificationCount: (userId: string) => `notifications:unread:${userId}`,
  userNotificationPreferences: (userId: string) => `notifications:prefs:${userId}`,
  
  // WebSocket related
  userSocket: (userId: string, socketId: string) => `ws:user:${userId}:${socketId}`,
  userPresence: (userId: string) => `ws:presence:${userId}`,
  roomSubscription: (roomId: string, userId: string) => `ws:room:${roomId}:${userId}`,
  
  // OAuth related
  oauthState: (state: string) => `oauth:state:${state}`,
} as const;

// Export redis as redisClient for backward compatibility
export const redisClient = redis;