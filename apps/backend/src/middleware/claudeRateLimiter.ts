/**
 * Claude API Rate Limiter Middleware
 * Implements rate limiting for Claude API calls to prevent abuse
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { config } from '../config/config';

interface RateLimitConfig {
  points: number;        // Number of requests
  duration: number;      // Per duration in seconds
  blockDuration: number; // Block duration in seconds when limit exceeded
  keyPrefix: string;
}

// Different rate limit tiers based on user role
const rateLimitTiers: Record<string, RateLimitConfig> = {
  admin: {
    points: 100,
    duration: 60, // 100 requests per minute
    blockDuration: 10,
    keyPrefix: 'claude_admin',
  },
  producer: {
    points: 60,
    duration: 60, // 60 requests per minute
    blockDuration: 30,
    keyPrefix: 'claude_producer',
  },
  casting_director: {
    points: 50,
    duration: 60, // 50 requests per minute
    blockDuration: 30,
    keyPrefix: 'claude_cd',
  },
  assistant: {
    points: 30,
    duration: 60, // 30 requests per minute
    blockDuration: 60,
    keyPrefix: 'claude_assistant',
  },
  actor: {
    points: 20,
    duration: 60, // 20 requests per minute
    blockDuration: 60,
    keyPrefix: 'claude_actor',
  },
  default: {
    points: 10,
    duration: 60, // 10 requests per minute
    blockDuration: 120,
    keyPrefix: 'claude_default',
  },
};

// Create rate limiters for each tier
const rateLimiters: Map<string, RateLimiterRedis> = new Map();

// Initialize rate limiters
Object.entries(rateLimitTiers).forEach(([role, config]) => {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: config.keyPrefix,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
    execEvenly: true, // Spread requests evenly
  });
  
  rateLimiters.set(role, limiter);
});

// Daily usage limiter (all users combined)
const dailyUsageLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'claude_daily',
  points: 10000, // 10k requests per day total
  duration: 86400, // 24 hours in seconds
  blockDuration: 3600, // Block for 1 hour when daily limit reached
});

// Per-conversation rate limiter
const conversationLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'claude_conv',
  points: 100, // 100 messages per conversation per hour
  duration: 3600, // 1 hour
  blockDuration: 300, // Block for 5 minutes
});

/**
 * Claude rate limiter middleware
 */
export const claudeRateLimiter = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip rate limiting in test environment
    if (config.env === 'test') {
      return next();
    }
    
    const userId = req.user?.userId || req.ip;
    const userRole = req.user?.role || 'default';
    const conversationId = req.params.id || req.body.conversationId;
    
    // Get the appropriate rate limiter for user role
    const roleLimiter = rateLimiters.get(userRole) || rateLimiters.get('default')!;
    
    // Check rate limits in parallel
    const [roleLimit, dailyLimit, convLimit] = await Promise.allSettled([
      roleLimiter.consume(userId, 1),
      dailyUsageLimiter.consume('global', 1),
      conversationId ? conversationLimiter.consume(conversationId, 1) : Promise.resolve(null),
    ]);
    
    // Check if any rate limit was exceeded
    let limitExceeded = false;
    let errorMessage = '';
    let retryAfter = 0;
    
    if (roleLimit.status === 'rejected') {
      const error = roleLimit.reason as RateLimiterRes;
      limitExceeded = true;
      retryAfter = Math.round(error.msBeforeNext / 1000) || 60;
      errorMessage = `Rate limit exceeded for your account tier. Please wait ${retryAfter} seconds.`;
    } else if (dailyLimit.status === 'rejected') {
      const error = dailyLimit.reason as RateLimiterRes;
      limitExceeded = true;
      retryAfter = Math.round(error.msBeforeNext / 1000) || 3600;
      errorMessage = `Daily API limit reached. Service will reset in ${Math.round(retryAfter / 60)} minutes.`;
    } else if (convLimit.status === 'rejected') {
      const error = convLimit.reason as RateLimiterRes;
      limitExceeded = true;
      retryAfter = Math.round(error.msBeforeNext / 1000) || 300;
      errorMessage = `Too many messages in this conversation. Please wait ${retryAfter} seconds.`;
    }
    
    if (limitExceeded) {
      // Log rate limit event
      logger.warn(`Claude rate limit exceeded for user ${userId} (${userRole})`);
      
      // Set rate limit headers
      res.set({
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(rateLimitTiers[userRole]?.points || 10),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
      });
      
      return res.status(429).json({
        success: false,
        message: errorMessage,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    }
    
    // Add rate limit info to response headers
    if (roleLimit.status === 'fulfilled') {
      const remaining = roleLimit.value.remainingPoints || 0;
      const limit = rateLimitTiers[userRole]?.points || 10;
      
      res.set({
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': new Date(Date.now() + rateLimitTiers[userRole]?.duration * 1000).toISOString(),
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error in Claude rate limiter:', error);
    // Don't block the request on rate limiter errors
    next();
  }
};

/**
 * Get current rate limit status for a user
 */
export const getRateLimitStatus = async (userId: string, role: string = 'default') => {
  try {
    const roleLimiter = rateLimiters.get(role) || rateLimiters.get('default')!;
    const tierConfig = rateLimitTiers[role] || rateLimitTiers.default;
    
    const [roleStatus, dailyStatus] = await Promise.all([
      roleLimiter.get(userId),
      dailyUsageLimiter.get('global'),
    ]);
    
    return {
      tier: role,
      limits: {
        perMinute: {
          limit: tierConfig.points,
          remaining: roleStatus ? tierConfig.points - roleStatus.consumedPoints : tierConfig.points,
          resetsIn: roleStatus ? Math.round(roleStatus.msBeforeNext / 1000) : 0,
        },
        daily: {
          limit: 10000,
          remaining: dailyStatus ? 10000 - dailyStatus.consumedPoints : 10000,
          resetsIn: dailyStatus ? Math.round(dailyStatus.msBeforeNext / 1000) : 0,
        },
      },
    };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    return null;
  }
};

/**
 * Reset rate limits for a user (admin only)
 */
export const resetRateLimit = async (userId: string, role: string = 'default') => {
  try {
    const roleLimiter = rateLimiters.get(role) || rateLimiters.get('default')!;
    await roleLimiter.delete(userId);
    
    logger.info(`Rate limits reset for user ${userId} (${role})`);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limits:', error);
    return false;
  }
};

/**
 * Middleware for checking rate limit status endpoint
 */
export const rateLimitStatus = async (
  req: Request & { user?: any },
  res: Response
) => {
  const userId = req.user?.userId;
  const role = req.user?.role || 'default';
  
  const status = await getRateLimitStatus(userId, role);
  
  if (!status) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get rate limit status',
    });
  }
  
  res.json({
    success: true,
    data: status,
  });
};

// Export for use in other modules
export default claudeRateLimiter;