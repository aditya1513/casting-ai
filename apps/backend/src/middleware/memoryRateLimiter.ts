/**
 * Memory System Rate Limiter Middleware
 * Implements specific rate limiting for different memory operations
 * Protects the memory system from abuse and ensures fair usage
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Create Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 5, // Use DB 5 for rate limiting
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('error', (err) => {
  logger.error('Rate limiter Redis error:', err);
});

/**
 * Helper function to get user identifier from request
 */
const getUserIdentifier = (req: Request): string => {
  const user = (req as any).user;
  if (user?.id || user?.userId) {
    return user.id || user.userId;
  }
  // Fallback to IP address if user not authenticated
  return req.ip || 'unknown';
};

/**
 * Create rate limiter with custom configuration
 */
const createMemoryRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    
    // Use Redis store for distributed rate limiting
    store: new RedisStore({
      client: redisClient,
      prefix: 'memory:rl:',
    }),
    
    // Custom key generator based on user ID
    keyGenerator: (req: Request) => {
      const userId = getUserIdentifier(req);
      const endpoint = req.route?.path || req.path;
      return `${userId}:${endpoint}`;
    },
    
    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      const userId = getUserIdentifier(req);
      logger.warn(`Memory rate limit exceeded for user ${userId}`, {
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
      });
      
      res.status(429).json({
        success: false,
        error: 'Too many memory operations',
        message: options.message,
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    
    // Skip rate limiting for certain conditions
    skip: (req: Request) => {
      // Skip for admin users
      const user = (req as any).user;
      if (user?.role === 'admin') {
        return true;
      }
      
      // Skip for health checks
      if (req.path === '/health' || req.path === '/api/health') {
        return true;
      }
      
      return false;
    },
  });
};

/**
 * Rate limiters for different memory operations
 */
export const memoryRateLimiter = {
  // Store operations: More restrictive as they consume storage
  store: createMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 stores per minute
    message: 'Too many memory store operations. Please wait before storing more memories.',
  }),
  
  // Query operations: More lenient for reading
  query: createMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 queries per minute
    message: 'Too many memory query operations. Please wait before querying again.',
  }),
  
  // Delete operations: Restrictive to prevent data loss
  delete: createMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 deletes per minute
    message: 'Too many memory delete operations. Please wait before deleting more memories.',
  }),
  
  // Consolidation operations: Very restrictive as they're resource-intensive
  consolidate: createMemoryRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 consolidations per hour
    message: 'Memory consolidation is resource-intensive. Please wait before consolidating again.',
  }),
  
  // Export operations: Restrictive to prevent data harvesting
  export: createMemoryRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 exports per hour
    message: 'Too many memory export operations. Please wait before exporting again.',
  }),
  
  // Import operations: Restrictive to prevent spam
  import: createMemoryRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 imports per hour
    message: 'Too many memory import operations. Please wait before importing again.',
  }),
  
  // Execute workflow operations: Restrictive as they trigger actions
  execute: createMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 executions per minute
    message: 'Too many workflow executions. Please wait before executing more workflows.',
  }),
  
  // Global fallback limiter for any memory endpoint
  global: createMemoryRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 total operations per minute
    message: 'Too many memory operations. Please slow down your requests.',
  }),
};

/**
 * Burst protection middleware
 * Prevents rapid-fire requests even within rate limits
 */
export const memoryBurstProtection = rateLimit({
  windowMs: 1000, // 1 second
  max: 5, // Maximum 5 requests per second
  message: 'Request rate too high. Please space out your requests.',
  standardHeaders: false,
  legacyHeaders: false,
  
  store: new RedisStore({
    client: redisClient,
    prefix: 'memory:burst:',
  }),
  
  keyGenerator: (req: Request) => {
    const userId = getUserIdentifier(req);
    return `${userId}:burst`;
  },
  
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.role === 'admin';
  },
});

/**
 * Adaptive rate limiting based on system load
 * Dynamically adjusts limits based on Redis memory usage
 */
export class AdaptiveMemoryRateLimiter {
  private static instance: AdaptiveMemoryRateLimiter;
  private loadFactor: number = 1.0;
  private checkInterval: NodeJS.Timeout;
  
  private constructor() {
    // Check system load every 30 seconds
    this.checkInterval = setInterval(() => {
      this.updateLoadFactor();
    }, 30000);
  }
  
  public static getInstance(): AdaptiveMemoryRateLimiter {
    if (!AdaptiveMemoryRateLimiter.instance) {
      AdaptiveMemoryRateLimiter.instance = new AdaptiveMemoryRateLimiter();
    }
    return AdaptiveMemoryRateLimiter.instance;
  }
  
  private async updateLoadFactor() {
    try {
      const info = await redisClient.info('memory');
      const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
      const maxMemory = parseInt(info.match(/maxmemory:(\d+)/)?.[1] || '0');
      
      if (maxMemory > 0) {
        const memoryUsage = usedMemory / maxMemory;
        
        // Adjust load factor based on memory usage
        if (memoryUsage > 0.9) {
          this.loadFactor = 0.5; // Reduce limits by 50%
        } else if (memoryUsage > 0.8) {
          this.loadFactor = 0.7; // Reduce limits by 30%
        } else if (memoryUsage > 0.7) {
          this.loadFactor = 0.85; // Reduce limits by 15%
        } else {
          this.loadFactor = 1.0; // Normal limits
        }
        
        if (this.loadFactor < 1.0) {
          logger.warn(`Memory rate limits reduced to ${this.loadFactor * 100}% due to high memory usage`);
        }
      }
    } catch (error) {
      logger.error('Error updating adaptive rate limit load factor:', error);
    }
  }
  
  public getAdjustedLimit(baseLimit: number): number {
    return Math.ceil(baseLimit * this.loadFactor);
  }
  
  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Initialize adaptive rate limiter
const adaptiveRateLimiter = AdaptiveMemoryRateLimiter.getInstance();

// Cleanup on process exit
process.on('SIGINT', () => {
  adaptiveRateLimiter.cleanup();
  redisClient.quit();
});

process.on('SIGTERM', () => {
  adaptiveRateLimiter.cleanup();
  redisClient.quit();
});

export default memoryRateLimiter;