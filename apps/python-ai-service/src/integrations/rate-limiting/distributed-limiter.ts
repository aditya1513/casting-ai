/**
 * Distributed Rate Limiter with Redis Cluster Support
 * Handles production scale with multiple nodes and failover
 * 
 * Phase 3 Production Deployment - Distributed Rate Limiting
 */

import Redis, { Cluster } from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import crypto from 'crypto';

export interface DistributedRateLimitConfig {
  useCluster: boolean;
  redis?: Redis;
  cluster?: Cluster;
  keyPrefix: string;
  slidingWindow: boolean;
  tokenBucket: boolean;
}

export interface RateLimitAlgorithm {
  type: 'sliding-window' | 'token-bucket' | 'fixed-window' | 'leaky-bucket';
  config: Record<string, any>;
}

/**
 * Distributed Rate Limiter with multiple algorithm support
 */
export class DistributedRateLimiter {
  private redis?: Redis;
  private cluster?: Cluster;
  private useCluster: boolean;
  private keyPrefix: string;
  private scripts: Map<string, string> = new Map();

  constructor(config: DistributedRateLimitConfig) {
    this.useCluster = config.useCluster;
    this.redis = config.redis;
    this.cluster = config.cluster;
    this.keyPrefix = config.keyPrefix || 'drl:';
    this.loadLuaScripts();
  }

  /**
   * Load Lua scripts for atomic operations
   */
  private loadLuaScripts(): void {
    // Sliding window rate limit script
    this.scripts.set('slidingWindow', `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      
      local clearBefore = now - window
      
      -- Remove old entries
      redis.call('zremrangebyscore', key, 0, clearBefore)
      
      -- Count current entries
      local current = redis.call('zcard', key)
      
      if current < limit then
        -- Add current request
        redis.call('zadd', key, now, now)
        redis.call('expire', key, window)
        return {1, limit - current - 1}
      else
        return {0, 0}
      end
    `);

    // Token bucket script
    this.scripts.set('tokenBucket', `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refillRate = tonumber(ARGV[3])
      local tokens = tonumber(ARGV[4])
      
      local bucket = redis.call('hmget', key, 'tokens', 'lastRefill')
      local currentTokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time passed
      local timePassed = now - lastRefill
      local tokensToAdd = math.floor(timePassed * refillRate / 1000)
      currentTokens = math.min(capacity, currentTokens + tokensToAdd)
      
      if currentTokens >= tokens then
        -- Consume tokens
        currentTokens = currentTokens - tokens
        redis.call('hmset', key, 'tokens', currentTokens, 'lastRefill', now)
        redis.call('expire', key, 3600)
        return {1, currentTokens}
      else
        -- Not enough tokens
        redis.call('hmset', key, 'tokens', currentTokens, 'lastRefill', now)
        redis.call('expire', key, 3600)
        return {0, currentTokens}
      end
    `);

    // Leaky bucket script
    this.scripts.set('leakyBucket', `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local leakRate = tonumber(ARGV[3])
      
      local bucket = redis.call('hmget', key, 'volume', 'lastLeak')
      local currentVolume = tonumber(bucket[1]) or 0
      local lastLeak = tonumber(bucket[2]) or now
      
      -- Calculate volume leaked since last check
      local timePassed = now - lastLeak
      local volumeLeaked = timePassed * leakRate / 1000
      currentVolume = math.max(0, currentVolume - volumeLeaked)
      
      if currentVolume < capacity then
        -- Add to bucket
        currentVolume = currentVolume + 1
        redis.call('hmset', key, 'volume', currentVolume, 'lastLeak', now)
        redis.call('expire', key, 3600)
        return {1, capacity - currentVolume}
      else
        -- Bucket is full
        return {0, 0}
      end
    `);

    // Distributed lock for critical sections
    this.scripts.set('distributedLock', `
      local key = KEYS[1]
      local token = ARGV[1]
      local ttl = tonumber(ARGV[2])
      
      if redis.call('set', key, token, 'nx', 'ex', ttl) then
        return 1
      else
        return 0
      end
    `);

    // Release distributed lock
    this.scripts.set('releaseLock', `
      local key = KEYS[1]
      local token = ARGV[1]
      
      if redis.call('get', key) == token then
        return redis.call('del', key)
      else
        return 0
      end
    `);
  }

  /**
   * Get Redis client (cluster or single)
   */
  private getClient(): Redis | Cluster {
    if (this.useCluster && this.cluster) {
      return this.cluster;
    }
    if (this.redis) {
      return this.redis;
    }
    throw new AppError('No Redis client configured', 500);
  }

  /**
   * Execute Lua script
   */
  private async executeScript(
    scriptName: string,
    keys: string[],
    args: (string | number)[]
  ): Promise<any> {
    const client = this.getClient();
    const script = this.scripts.get(scriptName);
    
    if (!script) {
      throw new AppError(`Script ${scriptName} not found`, 500);
    }

    try {
      // Use EVALSHA for better performance (script caching)
      const sha = crypto.createHash('sha1').update(script).digest('hex');
      
      try {
        return await client.evalsha(sha, keys.length, ...keys, ...args);
      } catch (error: any) {
        if (error.message.includes('NOSCRIPT')) {
          // Script not cached, load it
          return await client.eval(script, keys.length, ...keys, ...args);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Script execution failed: ${scriptName}`, error);
      throw new AppError('Rate limit check failed', 500);
    }
  }

  /**
   * Sliding window rate limiter
   */
  async slidingWindowLimit(
    key: string,
    windowMs: number,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const fullKey = `${this.keyPrefix}sw:${key}`;
    const now = Date.now();
    
    const result = await this.executeScript(
      'slidingWindow',
      [fullKey],
      [now, windowMs, limit]
    );

    return {
      allowed: result[0] === 1,
      remaining: result[1],
    };
  }

  /**
   * Token bucket rate limiter
   */
  async tokenBucketLimit(
    key: string,
    capacity: number,
    refillRate: number,
    tokens: number = 1
  ): Promise<{ allowed: boolean; tokensRemaining: number }> {
    const fullKey = `${this.keyPrefix}tb:${key}`;
    const now = Date.now();
    
    const result = await this.executeScript(
      'tokenBucket',
      [fullKey],
      [now, capacity, refillRate, tokens]
    );

    return {
      allowed: result[0] === 1,
      tokensRemaining: result[1],
    };
  }

  /**
   * Leaky bucket rate limiter
   */
  async leakyBucketLimit(
    key: string,
    capacity: number,
    leakRate: number
  ): Promise<{ allowed: boolean; capacityRemaining: number }> {
    const fullKey = `${this.keyPrefix}lb:${key}`;
    const now = Date.now();
    
    const result = await this.executeScript(
      'leakyBucket',
      [fullKey],
      [now, capacity, leakRate]
    );

    return {
      allowed: result[0] === 1,
      capacityRemaining: result[1],
    };
  }

  /**
   * Fixed window rate limiter (simple counter)
   */
  async fixedWindowLimit(
    key: string,
    windowMs: number,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const client = this.getClient();
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const fullKey = `${this.keyPrefix}fw:${key}:${window}`;
    const ttl = Math.ceil(windowMs / 1000);

    const pipeline = client.pipeline();
    pipeline.incr(fullKey);
    pipeline.expire(fullKey, ttl);
    
    const results = await pipeline.exec();
    
    if (!results || results.some(r => r[0] !== null)) {
      throw new AppError('Rate limit check failed', 500);
    }

    const count = results[0][1] as number;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetTime = new Date((window + 1) * windowMs);

    return { allowed, remaining, resetTime };
  }

  /**
   * Distributed lock acquisition
   */
  async acquireLock(
    key: string,
    ttlSeconds: number = 10
  ): Promise<{ acquired: boolean; token?: string }> {
    const fullKey = `${this.keyPrefix}lock:${key}`;
    const token = crypto.randomBytes(16).toString('hex');
    
    const result = await this.executeScript(
      'distributedLock',
      [fullKey],
      [token, ttlSeconds]
    );

    return {
      acquired: result === 1,
      token: result === 1 ? token : undefined,
    };
  }

  /**
   * Release distributed lock
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const fullKey = `${this.keyPrefix}lock:${key}`;
    
    const result = await this.executeScript(
      'releaseLock',
      [fullKey],
      [token]
    );

    return result === 1;
  }

  /**
   * Create middleware with specific algorithm
   */
  createMiddleware(options: {
    algorithm: RateLimitAlgorithm;
    keyGenerator: (req: Request) => string;
    skip?: (req: Request) => boolean;
    onLimitExceeded?: (req: Request, res: Response) => void;
  }): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if should skip
        if (options.skip && options.skip(req)) {
          return next();
        }

        const key = options.keyGenerator(req);
        let result: { allowed: boolean; remaining?: number; resetTime?: Date };

        // Apply the appropriate algorithm
        switch (options.algorithm.type) {
          case 'sliding-window':
            const swResult = await this.slidingWindowLimit(
              key,
              options.algorithm.config.windowMs,
              options.algorithm.config.limit
            );
            result = { allowed: swResult.allowed, remaining: swResult.remaining };
            break;

          case 'token-bucket':
            const tbResult = await this.tokenBucketLimit(
              key,
              options.algorithm.config.capacity,
              options.algorithm.config.refillRate,
              options.algorithm.config.tokens || 1
            );
            result = { allowed: tbResult.allowed, remaining: tbResult.tokensRemaining };
            break;

          case 'leaky-bucket':
            const lbResult = await this.leakyBucketLimit(
              key,
              options.algorithm.config.capacity,
              options.algorithm.config.leakRate
            );
            result = { allowed: lbResult.allowed, remaining: lbResult.capacityRemaining };
            break;

          case 'fixed-window':
          default:
            result = await this.fixedWindowLimit(
              key,
              options.algorithm.config.windowMs,
              options.algorithm.config.limit
            );
            break;
        }

        // Set headers
        if (result.remaining !== undefined) {
          res.set('X-RateLimit-Remaining', result.remaining.toString());
        }
        if (result.resetTime) {
          res.set('X-RateLimit-Reset', result.resetTime.toISOString());
        }

        if (!result.allowed) {
          if (options.onLimitExceeded) {
            options.onLimitExceeded(req, res);
          } else {
            res.status(429).json({
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: result.resetTime,
            });
          }
          return;
        }

        next();
      } catch (error) {
        logger.error('Distributed rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  /**
   * Get current usage for a key
   */
  async getUsage(
    key: string,
    algorithm: 'sliding-window' | 'token-bucket' | 'fixed-window'
  ): Promise<Record<string, any>> {
    const client = this.getClient();
    
    switch (algorithm) {
      case 'sliding-window':
        const swKey = `${this.keyPrefix}sw:${key}`;
        const count = await client.zcard(swKey);
        return { count };

      case 'token-bucket':
        const tbKey = `${this.keyPrefix}tb:${key}`;
        const bucket = await client.hgetall(tbKey);
        return {
          tokens: parseInt(bucket.tokens || '0'),
          lastRefill: new Date(parseInt(bucket.lastRefill || '0')),
        };

      case 'fixed-window':
        // Would need window information to get current count
        return {};

      default:
        return {};
    }
  }

  /**
   * Reset limits for a key
   */
  async resetLimits(key: string): Promise<void> {
    const client = this.getClient();
    const patterns = [
      `${this.keyPrefix}sw:${key}*`,
      `${this.keyPrefix}tb:${key}*`,
      `${this.keyPrefix}fw:${key}*`,
      `${this.keyPrefix}lb:${key}*`,
    ];

    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }
  }

  /**
   * Health check for Redis connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    try {
      const start = Date.now();
      const client = this.getClient();
      await client.ping();
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { healthy: false };
    }
  }
}

/**
 * Create Redis Cluster instance for production
 */
export function createRedisCluster(nodes: Array<{ host: string; port: number }>): Cluster {
  return new Redis.Cluster(nodes, {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    },
    clusterRetryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 100, 2000);
    },
    enableOfflineQueue: true,
    scaleReads: 'slave',
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
    slotsRefreshTimeout: 10000,
    clusterRetryStrategy: (times) => {
      const delay = Math.min(100 * Math.pow(2, times), 10000);
      logger.warn(`Redis cluster retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
    natMap: process.env.REDIS_NAT_MAP ? JSON.parse(process.env.REDIS_NAT_MAP) : undefined,
  });
}

/**
 * Create single Redis instance for development/staging
 */
export function createRedisClient(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 50, 2000);
    },
    enableOfflineQueue: true,
    connectTimeout: 20000,
    commandTimeout: 5000,
    lazyConnect: true,
  });
}

export default DistributedRateLimiter;