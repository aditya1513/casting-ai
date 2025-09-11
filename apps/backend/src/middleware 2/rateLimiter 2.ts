/**
 * Rate Limiting Middleware
 * Prevent abuse and ensure fair usage of API endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/config';
import { redis } from '../config/redis';
import { AppError } from '../utils/errors';

/**
 * Redis store for rate limiting
 */
class RedisStore {
  constructor(private client: typeof redis) {}
  
  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const multi = this.client.multi();
    const ttl = config.security.rateLimitWindow * 60; // Convert to seconds
    
    multi.incr(key);
    multi.expire(key, ttl);
    
    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 1;
    
    return {
      totalHits,
      resetTime: new Date(Date.now() + ttl * 1000),
    };
  }
  
  async decrement(key: string): Promise<void> {
    await this.client.decr(key);
  }
  
  async resetKey(key: string): Promise<void> {
    await this.client.del(key);
  }
}

/**
 * Create rate limiter with custom configuration
 */
const createRateLimiter = (
  maxRequests: number = config.security.rateLimitMaxRequests,
  windowMinutes: number = config.security.rateLimitWindow
) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(redis) as any,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      throw new AppError(
        'Rate limit exceeded. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        {
          retryAfter: res.getHeader('Retry-After'),
          limit: res.getHeader('X-RateLimit-Limit'),
        }
      );
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health' || req.path === '/api/health/ready';
    },
  });
};

/**
 * Global rate limiter
 */
export const rateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = createRateLimiter(5, 15); // 5 requests per 15 minutes

/**
 * Auth rate limiter
 */
export const authRateLimiter = createRateLimiter(10, 15); // 10 requests per 15 minutes

/**
 * File upload rate limiter
 */
export const uploadRateLimiter = createRateLimiter(20, 60); // 20 uploads per hour

/**
 * Search rate limiter
 */
export const searchRateLimiter = createRateLimiter(30, 1); // 30 searches per minute

/**
 * Custom rate limiter for specific endpoints
 */
export const customRateLimiter = (max: number, windowMinutes: number) => {
  return createRateLimiter(max, windowMinutes);
};