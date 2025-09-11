import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

// Redis client for rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Rate limiting store
const redisStore = new RedisStore({
  sendCommand: (...args: any[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
});

// General API rate limiting
export const generalRateLimit = rateLimit({
  store: redisStore,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60, // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use IP address with optional user ID for authenticated users
    return req.user?.id ? `${req.ip}:${req.user.id}` : (req.ip || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
    });
  },
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  store: redisStore,
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '5') * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'), // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 5 * 60, // 5 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Combine IP and email for login attempts
    const email = req.body?.email || req.query?.email || '';
    return `auth:${req.ip}:${email}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts. Please try again in 5 minutes.',
      retryAfter: 5 * 60,
    });
  },
});

// Registration rate limiting (per IP)
export const registrationRateLimit = rateLimit({
  store: redisStore,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Registration rate limit exceeded',
    retryAfter: 60 * 60, // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `register:${req.ip}`,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Registration rate limit exceeded',
      message: 'Too many registration attempts from this IP. Please try again in an hour.',
      retryAfter: 60 * 60,
    });
  },
});

// Password reset rate limiting
export const passwordResetRateLimit = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 password reset requests per 15 minutes
  message: {
    error: 'Password reset rate limit exceeded',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || req.query?.email || '';
    return `password-reset:${req.ip}:${email}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Password reset rate limit exceeded',
      message: 'Too many password reset requests. Please try again in 15 minutes.',
      retryAfter: 15 * 60,
    });
  },
});

// File upload rate limiting
export const uploadRateLimit = rateLimit({
  store: redisStore,
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    error: 'Upload rate limit exceeded',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `upload:${req.ip}:${req.user?.id || 'anonymous'}`,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Upload rate limit exceeded',
      message: 'Too many file uploads. Please try again in a minute.',
      retryAfter: 60,
    });
  },
});

// API key rate limiting (higher limits for API keys)
export const apiKeyRateLimit = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes for API keys
  message: {
    error: 'API key rate limit exceeded',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `api-key:${req.get('X-API-Key') || req.ip}`,
  skip: (req: Request) => !req.get('X-API-Key'), // Only apply to requests with API keys
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'API key rate limit exceeded',
      message: 'API rate limit exceeded. Please reduce request frequency.',
      retryAfter: 15 * 60,
    });
  },
});

// Dynamic rate limiting based on user role
export const dynamicRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.role;
  
  // Apply different rate limits based on user role
  let rateLimitMiddleware;
  
  switch (userRole) {
    case 'ADMIN':
    case 'MODERATOR':
      // No rate limiting for admins and moderators
      return next();
      
    case 'PRODUCER':
    case 'DIRECTOR':
      rateLimitMiddleware = rateLimit({
        store: redisStore,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // 500 requests per 15 minutes for premium users
        keyGenerator: (req: Request) => `premium:${req.user?.id}`,
        message: { error: 'Producer/Director rate limit exceeded' },
      });
      break;
      
    case 'CASTING_DIRECTOR':
    case 'AGENT':
      rateLimitMiddleware = rateLimit({
        store: redisStore,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // 200 requests per 15 minutes for professional users
        keyGenerator: (req: Request) => `professional:${req.user?.id}`,
        message: { error: 'Professional user rate limit exceeded' },
      });
      break;
      
    default:
      // Regular users get standard rate limiting
      rateLimitMiddleware = generalRateLimit;
  }
  
  return rateLimitMiddleware(req, res, next);
};

// Rate limiting for search endpoints (to prevent abuse)
export const searchRateLimit = rateLimit({
  store: redisStore,
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    error: 'Search rate limit exceeded',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `search:${req.ip}:${req.user?.id || 'anonymous'}`,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Search rate limit exceeded',
      message: 'Too many search requests. Please try again in a minute.',
      retryAfter: 60,
    });
  },
});

// Sliding window rate limiter for critical operations
export const criticalOperationRateLimit = rateLimit({
  store: redisStore,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 critical operations per hour
  message: {
    error: 'Critical operation rate limit exceeded',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `critical:${req.user?.id || req.ip}`,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Critical operation rate limit exceeded',
      message: 'Too many critical operations. Please try again later.',
      retryAfter: 60 * 60,
    });
  },
});

// Rate limit monitoring and metrics
export const rateLimitMetrics = {
  // Get current rate limit status for a key
  async getStatus(key: string) {
    try {
      const current = await redis.get(`rl:${key}`);
      const ttl = await redis.ttl(`rl:${key}`);
      return {
        current: current ? parseInt(current) : 0,
        ttl: ttl > 0 ? ttl : 0,
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return { current: 0, ttl: 0 };
    }
  },
  
  // Reset rate limit for a specific key (admin function)
  async resetLimit(key: string) {
    try {
      await redis.del(`rl:${key}`);
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  },
  
  // Get top rate limited IPs/users
  async getTopRateLimited() {
    try {
      const keys = await redis.keys('rl:*');
      const results = await Promise.all(
        keys.map(async (key) => {
          const count = await redis.get(key);
          return { key: key.replace('rl:', ''), count: parseInt(count || '0') };
        })
      );
      return results.sort((a, b) => b.count - a.count).slice(0, 10);
    } catch (error) {
      console.error('Error getting top rate limited:', error);
      return [];
    }
  },
};

export default {
  generalRateLimit,
  authRateLimit,
  registrationRateLimit,
  passwordResetRateLimit,
  uploadRateLimit,
  apiKeyRateLimit,
  dynamicRateLimit,
  searchRateLimit,
  criticalOperationRateLimit,
  rateLimitMetrics,
};