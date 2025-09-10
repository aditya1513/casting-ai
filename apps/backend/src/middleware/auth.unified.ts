/**
 * Unified Auth Middleware
 * Provides a unified interface that works with both simple auth (development) 
 * and Clerk auth (production) based on environment configuration
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// Import both auth systems
import { authenticate as simpleAuth, optionalAuth as simpleOptionalAuth, authorize as simpleAuthorize, UserRole as SimpleUserRole } from './auth.simple';
import { clerkAuth, optionalClerkAuth, requireAnyRole as clerkRequireAnyRole } from './clerk-auth';

/**
 * Define UserRole type based on our Drizzle schema
 */
export type UserRole = 'ACTOR' | 'CASTING_DIRECTOR' | 'PRODUCER' | 'AGENT' | 'MANAGER' | 'ADMIN';

/**
 * Unified user interface that works with both auth systems
 */
export interface UnifiedUser {
  id: string;
  email?: string;
  role: UserRole;
  sessionId?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Extend Express Request to include unified auth
 */
declare global {
  namespace Express {
    interface Request {
      user?: UnifiedUser;
      auth?: {
        userId: string;
        sessionId?: string;
        user?: any;
      };
    }
  }
}

/**
 * Convert Clerk user to unified user format
 */
const convertClerkUser = (req: Request): UnifiedUser | undefined => {
  if (!req.auth?.user) return undefined;
  
  const clerkUser = req.auth.user;
  return {
    id: clerkUser.id,
    email: clerkUser.email,
    role: (clerkUser.role as UserRole) || 'ACTOR',
    sessionId: req.auth.sessionId,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName
  };
};

/**
 * Unified authentication middleware
 * Uses Clerk in production, simple auth in development
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use Clerk auth if configured, otherwise use simple auth
    if (config.clerk && config.isProduction) {
      await clerkAuth(req, res, (error) => {
        if (error) return next(error);
        
        // Convert Clerk user to unified format
        req.user = convertClerkUser(req);
        next();
      });
    } else {
      // Use simple auth for development
      logger.debug('Using simple auth for development environment');
      await simpleAuth(req, res, next);
    }
  } catch (error) {
    logger.error('Unified auth error:', error);
    res.status(500).json({
      error: 'Authentication service error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Optional unified authentication
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (config.clerk && config.isProduction) {
      await optionalClerkAuth(req, res, (error) => {
        if (error) {
          logger.debug('Optional Clerk auth failed:', error);
        }
        
        // Convert Clerk user to unified format if available
        req.user = convertClerkUser(req);
        next();
      });
    } else {
      // Use simple optional auth for development
      await simpleOptionalAuth(req, res, next);
    }
  } catch (error) {
    logger.error('Unified optional auth error:', error);
    next(); // Continue without authentication for optional auth
  }
};

/**
 * Unified role-based authorization
 */
export const authorize = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (config.clerk && config.isProduction) {
        // Use Clerk role authorization
        const roleStrings = roles.map(role => role.toString());
        await clerkRequireAnyRole(roleStrings)(req, res, next);
      } else {
        // Use simple authorization for development
        await simpleAuthorize(roles as SimpleUserRole[])(req, res, next);
      }
    } catch (error) {
      logger.error('Unified authorization error:', error);
      res.status(500).json({
        error: 'Authorization service error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * User-specific rate limiting
 * TODO: Implement proper rate limiting based on user ID
 */
export const userRateLimit = (maxRequests: number, windowMinutes: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: Implement user-specific rate limiting with Redis
    // For now, just continue
    logger.debug(`Rate limiting: ${maxRequests} requests per ${windowMinutes} minutes`);
    next();
  };
};

/**
 * Require specific roles (alias for authorize)
 */
export const requireRoles = authorize;

/**
 * Check authentication status
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user?.id || !!req.auth?.userId;
};

/**
 * Get current user ID
 */
export const getCurrentUserId = (req: Request): string | null => {
  return req.user?.id || req.auth?.userId || null;
};

/**
 * Get current user role
 */
export const getCurrentUserRole = (req: Request): UserRole | null => {
  return req.user?.role || (req.auth?.user?.role as UserRole) || null;
};

/**
 * Check if user has role
 */
export const hasRole = (req: Request, role: UserRole): boolean => {
  const userRole = getCurrentUserRole(req);
  return userRole === role || userRole === 'ADMIN'; // Admin has all permissions
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (req: Request, roles: UserRole[]): boolean => {
  const userRole = getCurrentUserRole(req);
  if (!userRole) return false;
  
  return roles.includes(userRole) || userRole === 'ADMIN'; // Admin has all permissions
};

// Export types and utilities
export { UserRole };

export default {
  authenticate,
  optionalAuth,
  authorize,
  requireRoles,
  userRateLimit,
  isAuthenticated,
  getCurrentUserId,
  getCurrentUserRole,
  hasRole,
  hasAnyRole
};