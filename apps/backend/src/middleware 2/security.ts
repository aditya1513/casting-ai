/**
 * Security Middleware for Production Hardening
 * Based on documentation learnings
 */

import { Context, Next } from 'hono';
import { logger } from '../utils/logger';

// Rate limiting store (simple in-memory for demo, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 60000) => {
  return async (c: Context, next: Next) => {
    const clientIP = c.req.header('x-forwarded-for') || 
                     c.req.header('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const key = `rate_limit:${clientIP}`;
    
    const current = rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      // Reset or initialize
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    } else if (current.count >= maxRequests) {
      // Rate limited
      logger.warn(`Rate limit exceeded for IP: ${clientIP}`, {
        ip: clientIP,
        requests: current.count,
        service: 'castmatch-backend'
      });
      
      return c.json({ 
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds.`
      }, 429);
    } else {
      // Increment counter
      current.count++;
    }

    await next();
  };
};

export const securityHeaders = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    // Security headers based on OWASP recommendations
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HSTS for HTTPS
    if (c.req.header('x-forwarded-proto') === 'https') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Content Security Policy for API
    c.header('Content-Security-Policy', "default-src 'self'; script-src 'none'; object-src 'none';");
  };
};

export const requestLogging = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header('user-agent') || 'unknown';
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    await next();
    
    const duration = Date.now() - start;
    const status = c.res.status;

    logger.info(`${method} ${url}`, {
      method,
      url,
      status,
      duration: `${duration}ms`,
      userAgent,
      ip,
      service: 'castmatch-backend'
    });

    // Log errors
    if (status >= 400) {
      logger.error(`HTTP Error ${status} on ${method} ${url}`, {
        method,
        url,
        status,
        duration: `${duration}ms`,
        ip,
        service: 'castmatch-backend'
      });
    }
  };
};

export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error: any) {
      logger.error('Unhandled error in request:', {
        error: error.message,
        stack: error.stack,
        url: c.req.url,
        method: c.req.method,
        service: 'castmatch-backend'
      });

      // Don't expose internal errors in production
      const isDev = process.env.NODE_ENV === 'development';
      
      return c.json({
        error: 'Internal Server Error',
        message: isDev ? error.message : 'Something went wrong',
        ...(isDev && { stack: error.stack })
      }, 500);
    }
  };
};