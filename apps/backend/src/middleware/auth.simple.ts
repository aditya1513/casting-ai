/**
 * Simple Auth Middleware
 * Temporary simple auth for enabling routes while Clerk integration is finalized
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Define UserRole type based on our Drizzle schema
export type UserRole = 'ACTOR' | 'CASTING_DIRECTOR' | 'PRODUCER' | 'AGENT' | 'MANAGER' | 'ADMIN';

/**
 * Simple authentication middleware - allows all requests for now
 * TODO: Replace with proper Clerk integration
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // For now, create a mock user to unblock routes
    // TODO: Integrate with Clerk authentication
    req.user = {
      id: 'temp-user-id',
      email: 'temp@example.com',
      role: 'CASTING_DIRECTOR' as UserRole,
      sessionId: 'temp-session-id',
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Please log in to access this resource'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // For now, just continue without authentication
    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next(); // Continue anyway for optional auth
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({ 
          error: 'Authorization failed',
          message: 'You do not have permission to access this resource'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ 
        error: 'Authorization check failed',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * User-specific rate limiting placeholder
 */
export const userRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // TODO: Implement user-specific rate limiting
  next();
};

// Export types
export { UserRole };