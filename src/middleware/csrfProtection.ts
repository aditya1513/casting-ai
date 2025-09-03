import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';

// Redis client for CSRF token storage
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_BODY_NAME = '_token';

// Generate secure random token
const generateToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

// Custom CSRF protection middleware
export const customCSRFProtection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip CSRF protection for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Skip for API key authenticated requests
    if (req.get('X-API-Key')) {
      return next();
    }
    
    // Skip for OAuth endpoints
    if (req.path.includes('/auth/oauth') || req.path.includes('/auth/callback')) {
      return next();
    }
    
    // Get CSRF token from header or body
    const token = req.get(CSRF_HEADER_NAME) || req.body[CSRF_BODY_NAME];
    
    if (!token) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        message: 'CSRF token is required for this request',
      });
    }
    
    // Validate token format
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token format',
        message: 'CSRF token format is invalid',
      });
    }
    
    // Check if token exists and is valid
    const sessionId = req.session?.id || req.sessionID;
    const storedToken = await redis.get(`csrf:${sessionId}`);
    
    if (!storedToken || storedToken !== token) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        message: 'CSRF token is invalid or expired',
      });
    }
    
    // Token is valid, proceed
    next();
  } catch (error) {
    console.error('CSRF protection error:', error);
    return res.status(500).json({
      success: false,
      error: 'CSRF protection error',
      message: 'An error occurred while validating CSRF token',
    });
  }
};

// Generate and store CSRF token
export const generateCSRFToken = async (req: Request): Promise<string> => {
  const token = generateToken();
  const sessionId = req.session?.id || req.sessionID;
  
  // Store token in Redis with expiry
  await redis.setex(`csrf:${sessionId}`, CSRF_TOKEN_EXPIRY, token);
  
  return token;
};

// Middleware to provide CSRF token to client
export const provideCSRFToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await generateCSRFToken(req);
    
    // Add token to response headers
    res.set('X-CSRF-Token', token);
    
    // Add token to response locals for template rendering
    res.locals.csrfToken = token;
    
    next();
  } catch (error) {
    console.error('Error providing CSRF token:', error);
    next(error);
  }
};

// Double submit cookie pattern for SPA applications
export const doubleSubmitCookie = (req: Request, res: Response, next: NextFunction): void | Response => {
  try {
    // Generate token for new sessions
    if (!req.cookies['XSRF-TOKEN'] || req.method === 'POST' && req.path === '/auth/csrf') {
      const token = generateToken();
      
      // Set secure cookie
      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Allow JavaScript access for SPA
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_EXPIRY * 1000,
      });
      
      // Store server-side copy
      const sessionId = req.session?.id || req.sessionID;
      redis.setex(`csrf:${sessionId}`, CSRF_TOKEN_EXPIRY, token);
      
      if (req.path === '/auth/csrf') {
        return res.json({ 
          success: true, 
          csrfToken: token,
          message: 'CSRF token generated successfully',
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Double submit cookie error:', error);
    next(error);
  }
};

// Validate double submit cookie
export const validateDoubleSubmitCookie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Skip for API key authenticated requests
    if (req.get('X-API-Key')) {
      return next();
    }
    
    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.get('X-XSRF-TOKEN') || req.get('X-CSRF-Token');
    
    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF protection failed',
        message: 'CSRF tokens are missing',
      });
    }
    
    if (cookieToken !== headerToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token mismatch',
        message: 'CSRF tokens do not match',
      });
    }
    
    // Additional server-side validation
    const sessionId = req.session?.id || req.sessionID;
    const storedToken = await redis.get(`csrf:${sessionId}`);
    
    if (!storedToken || storedToken !== cookieToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token invalid',
        message: 'CSRF token is invalid or expired',
      });
    }
    
    next();
  } catch (error) {
    console.error('Double submit validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'CSRF validation error',
      message: 'An error occurred while validating CSRF protection',
    });
  }
};

// Standard csurf middleware with custom configuration
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY * 1000,
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req: Request) => {
    return req.get(CSRF_HEADER_NAME) || 
           req.body[CSRF_BODY_NAME] || 
           req.query[CSRF_BODY_NAME];
  },
});

// CSRF error handler
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void | Response => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token',
      code: 'INVALID_CSRF_TOKEN',
    });
  }
  
  next(err);
};

// Refresh CSRF token
export const refreshCSRFToken = async (req: Request, res: Response) => {
  try {
    const token = await generateCSRFToken(req);
    
    res.json({
      success: true,
      csrfToken: token,
      expiresIn: CSRF_TOKEN_EXPIRY,
      message: 'CSRF token refreshed successfully',
    });
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'Failed to refresh CSRF token',
    });
  }
};

// Clean up expired CSRF tokens
export const cleanupExpiredTokens = async () => {
  try {
    const keys = await redis.keys('csrf:*');
    const pipeline = redis.pipeline();
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        pipeline.del(key);
      }
    }
    
    await pipeline.exec();
    console.log(`Cleaned up ${keys.length} expired CSRF tokens`);
  } catch (error) {
    console.error('Error cleaning up CSRF tokens:', error);
  }
};

// CSRF protection for specific routes
export const protectedRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/password-reset',
  '/api/users',
  '/api/profiles',
  '/api/castings',
  '/api/applications',
  '/api/admin',
];

// Check if route needs CSRF protection
export const requiresCSRFProtection = (path: string): boolean => {
  return protectedRoutes.some(route => path.startsWith(route));
};

// Advanced CSRF protection with rate limiting
export const advancedCSRFProtection = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    // Check for repeated CSRF failures
    const clientId = req.ip + ':' + (req.user?.id || 'anonymous');
    const failureKey = `csrf_failures:${clientId}`;
    const failures = await redis.get(failureKey);
    
    if (failures && parseInt(failures) >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many CSRF failures',
        message: 'Account temporarily locked due to security violations',
      });
    }
    
    // Run CSRF validation
    await new Promise<void>((resolve, reject) => {
      customCSRFProtection(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Reset failure count on success
    await redis.del(failureKey);
    next();
  } catch (error) {
    // Increment failure count
    const clientId = req.ip + ':' + (req.user?.id || 'anonymous');
    const failureKey = `csrf_failures:${clientId}`;
    await redis.incr(failureKey);
    await redis.expire(failureKey, 3600); // 1 hour expiry
    
    return res.status(403).json({
      success: false,
      error: 'CSRF validation failed',
      message: 'Security validation failed',
    });
  }
};

export default {
  customCSRFProtection,
  generateCSRFToken,
  provideCSRFToken,
  doubleSubmitCookie,
  validateDoubleSubmitCookie,
  csrfProtection,
  csrfErrorHandler,
  refreshCSRFToken,
  cleanupExpiredTokens,
  requiresCSRFProtection,
  advancedCSRFProtection,
};