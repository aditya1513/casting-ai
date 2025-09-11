/**
 * Redis Caching Layer with Upstash
 * Based on Drizzle documentation: https://orm.drizzle.team/docs/cache
 */

import { Redis } from 'ioredis';

// Initialize Redis connection (Dragonfly compatible)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
});

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.warn('Cache GET error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn('Cache DEL error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Cache INVALIDATE error:', error);
    }
  }

  // Specific cache methods for our app
  async getDashboardStats(userId: string) {
    return await this.get(`dashboard:stats:${userId}`);
  }

  async setDashboardStats(userId: string, stats: any, ttl: number = 300) {
    await this.set(`dashboard:stats:${userId}`, stats, ttl);
  }

  async invalidateDashboardStats(userId: string) {
    await this.del(`dashboard:stats:${userId}`);
  }

  async getTalentSearch(query: string, location?: string, skills?: string[]) {
    const key = `talents:search:${query}:${location}:${skills?.join(',')}`;
    return await this.get(key);
  }

  async setTalentSearch(query: string, location: string | undefined, skills: string[] | undefined, results: any, ttl: number = 600) {
    const key = `talents:search:${query}:${location}:${skills?.join(',')}`;
    await this.set(key, results, ttl);
  }

  async invalidateUserData(userId: string) {
    await this.invalidatePattern(`*:${userId}:*`);
    await this.invalidatePattern(`*:${userId}`);
  }

  async getProjectList(userId: string, limit: number, offset: number) {
    return await this.get(`projects:list:${userId}:${limit}:${offset}`);
  }

  async setProjectList(userId: string, limit: number, offset: number, projects: any, ttl: number = 180) {
    await this.set(`projects:list:${userId}:${limit}:${offset}`, projects, ttl);
  }

  async invalidateProjects(userId: string) {
    await this.invalidatePattern(`projects:*:${userId}:*`);
  }
}

export const cacheService = CacheService.getInstance();