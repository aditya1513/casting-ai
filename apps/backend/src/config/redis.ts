/**
 * Redis Configuration using Dragonfly
 * Dragonfly is a modern Redis-compatible data store
 */

import { config } from './config';
import { logger } from '../utils/logger';
import Redis from 'ioredis';

// Dragonfly Redis client
class DragonflyClient {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      // Create Redis client that connects to Dragonfly
      this.client = new Redis({
        host: 'localhost',
        port: 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        showFriendlyErrorStack: true,
      });

      // Event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('🐉 Connected to Dragonfly successfully');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Dragonfly connection error:', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Dragonfly connection closed');
      });

      // Attempt to connect
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to initialize Dragonfly client:', error);
      // Fallback to in-memory cache if Dragonfly is not available
      this.client = null;
      this.createFallbackClient();
    }
  }

  private createFallbackClient(): void {
    logger.warn('Using in-memory fallback cache (Dragonfly not available)');
    const memoryStore = new Map<string, { value: string, expiry?: number }>();

    // Create mock client with same interface
    this.client = {
      async get(key: string): Promise<string | null> {
        const item = memoryStore.get(key);
        if (!item) return null;
        
        if (item.expiry && Date.now() > item.expiry) {
          memoryStore.delete(key);
          return null;
        }
        
        return item.value;
      },

      async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
        const expiry = (mode === 'EX' && duration) ? Date.now() + (duration * 1000) : undefined;
        memoryStore.set(key, { value, expiry });
        return 'OK';
      },

      async setex(key: string, seconds: number, value: string): Promise<string> {
        const expiry = Date.now() + (seconds * 1000);
        memoryStore.set(key, { value, expiry });
        return 'OK';
      },

      async del(...keys: string[]): Promise<number> {
        let deletedCount = 0;
        keys.forEach(key => {
          if (memoryStore.delete(key)) deletedCount++;
        });
        return deletedCount;
      },

      async exists(...keys: string[]): Promise<number> {
        let existsCount = 0;
        keys.forEach(key => {
          const item = memoryStore.get(key);
          if (item && (!item.expiry || Date.now() <= item.expiry)) {
            existsCount++;
          }
        });
        return existsCount;
      },

      async keys(pattern: string): Promise<string[]> {
        // Simple pattern matching for fallback
        const keys = Array.from(memoryStore.keys());
        if (pattern === '*') return keys;
        
        const regex = new RegExp(pattern.replace('*', '.*'));
        return keys.filter(key => regex.test(key));
      },

      async quit(): Promise<string> {
        memoryStore.clear();
        return 'OK';
      },

      async disconnect(): Promise<void> {
        memoryStore.clear();
      }
    } as any;
  }

  // Redis-compatible methods
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return await this.client.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, value, mode || 'EX', duration || 3600);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.client) return;
    await this.client.setex(key, seconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (!this.client) return 0;
    return await this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    if (!this.client) return 0;
    return await this.client.exists(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    return await this.client.keys(pattern);
  }

  async quit(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// Create Dragonfly client instance
export const redis = new DragonflyClient();

// Cache management utilities
export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const count = await redis.exists(key);
      return count > 0;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }
}

// Cache key constants
export const CacheKeys = {
  userSession: (userId: string, sessionId: string) => `session:${userId}:${sessionId}`,
  talentProfile: (talentId: string) => `talent:${talentId}`,
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  rateLimit: (identifier: string) => `rate_limit:${identifier}`,
  searchResults: (query: string) => `search:${Buffer.from(query).toString('base64')}`,
  aiResponse: (contextHash: string) => `ai_response:${contextHash}`,
} as const;

// Export compatibility aliases
export const redisClient = redis;
export const RedisClient = DragonflyClient;

// Default export
export default redis;