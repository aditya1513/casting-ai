/**
 * Dragonfly Configuration
 * Drop-in replacement for Redis with better performance
 */

import { config } from './config';
import { logger } from '../utils/logger';

// Mock implementation for now - will be replaced with actual Dragonfly client
export class DragonflyClient {
  private connected = false;
  private store = new Map<string, { value: string, expiry?: number }>();

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Dragonfly...');
      // TODO: Implement actual Dragonfly connection
      this.connected = true;
      logger.info('Connected to Dragonfly successfully');
    } catch (error) {
      logger.error('Failed to connect to Dragonfly:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        // TODO: Implement actual disconnect
        this.connected = false;
        logger.info('Disconnected from Dragonfly');
      }
    } catch (error) {
      logger.error('Error disconnecting from Dragonfly:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    // Mock implementation with in-memory store
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    // Mock implementation
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    // Mock implementation
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    // Mock implementation
    const item = this.store.get(key);
    if (!item) return false;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  async incr(key: string): Promise<number> {
    // Mock implementation
    const current = await this.get(key);
    const newValue = (current ? parseInt(current) : 0) + 1;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    // Mock implementation
    const item = this.store.get(key);
    if (item) {
      item.expiry = Date.now() + (seconds * 1000);
    }
  }

  // Redis compatibility methods
  multi(): DragonflyMulti {
    return new DragonflyMulti(this);
  }

  async quit(): Promise<void> {
    await this.disconnect();
  }
}

// Mock Multi/Pipeline implementation for Redis compatibility
class DragonflyMulti {
  private commands: Array<() => Promise<any>> = [];

  constructor(private client: DragonflyClient) {}

  incr(key: string): DragonflyMulti {
    this.commands.push(() => this.client.incr(key));
    return this;
  }

  expire(key: string, seconds: number): DragonflyMulti {
    this.commands.push(() => this.client.expire(key, seconds));
    return this;
  }

  async exec(): Promise<any[]> {
    const results = [];
    for (const command of this.commands) {
      try {
        const result = await command();
        results.push([null, result]);
      } catch (error) {
        results.push([error, null]);
      }
    }
    return results;
  }
}

// Create Dragonfly client instance
export const dragonfly = new DragonflyClient();

// Cache management utilities
export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await dragonfly.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await dragonfly.set(key, JSON.stringify(value), ttl);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await dragonfly.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      return await dragonfly.exists(key);
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }
}

// Cache key constants
export const CacheKeys = {
  USER_SESSION: (userId: string) => `session:${userId}`,
  TALENT_PROFILE: (talentId: string) => `talent:${talentId}`,
  CONVERSATION: (conversationId: string) => `conversation:${conversationId}`,
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
  SEARCH_RESULTS: (query: string) => `search:${Buffer.from(query).toString('base64')}`,
  AI_RESPONSE: (contextHash: string) => `ai_response:${contextHash}`,
} as const;

// Initialize Dragonfly connection on import
dragonfly.connect().catch((error) => {
  logger.error('Failed to initialize Dragonfly connection:', error);
});

// Export as redis for backward compatibility during migration
export const redis = dragonfly;
export default dragonfly;