/**
 * Rate limiter middleware for AI Agents Server
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config.js';
import { RateLimitError } from './errorHandler.js';

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  keyFunction: (req: Request) => req.ip || 'unknown',
  points: config.rateLimitPerMinute, // Number of requests
  duration: 60, // Per 60 seconds (1 minute)
  execEvenly: true, // Spread requests evenly across duration
});

// Additional rate limiter for expensive AI operations
const aiRateLimiter = new RateLimiterMemory({
  keyFunction: (req: Request) => req.ip || 'unknown',
  points: 10, // 10 AI requests per minute
  duration: 60,
  execEvenly: true,
});

export { rateLimiter as rateLimiterMiddleware };

// General rate limiting middleware
export const generalRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    next(new RateLimitError(`Rate limit exceeded. Try again in ${secs} seconds.`));
  }
};

// AI operations rate limiting middleware  
export const aiRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await aiRateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    next(new RateLimitError(`AI rate limit exceeded. Try again in ${secs} seconds.`));
  }
};

export default generalRateLimit;