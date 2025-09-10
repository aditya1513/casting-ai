/**
 * Clerk Authentication Middleware
 * Integrates Clerk authentication for backend API routes
 */

import { Request, Response, NextFunction } from 'express';
import { ensureClerkClient } from '../config/clerk';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Interface for authenticated user attached to request
 */
export interface ClerkUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  emailAddresses?: Array<{ emailAddress: string; id: string }>;
}

/**
 * Extend Express Request to include Clerk user
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
        user?: ClerkUser;
      };
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 */
const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Clerk authentication middleware
 * Verifies Clerk session token and attaches user info to request
 */
export const clerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      throw new AppError('No authentication token provided', 401);
    }

    // Verify the token with Clerk
    try {
      const client = ensureClerkClient();
      const session = await client.sessions.verifySession(token, {});
      
      if (!session || !session.userId) {
        throw new AppError('Invalid session token', 401);
      }

      // Get user information
      const user = await client.users.getUser(session.userId);
      
      // Attach auth info to request
      req.auth = {
        userId: session.userId,
        sessionId: session.id,
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddresses: user.emailAddresses.map(addr => ({
            emailAddress: addr.emailAddress,
            id: addr.id
          })),
          // Extract role from user metadata if available
          role: user.publicMetadata?.role as string || 'USER'
        }
      };

      logger.debug('User authenticated via Clerk', { 
        userId: session.userId, 
        email: req.auth.user?.email 
      });

      next();
    } catch (clerkError) {
      logger.error('Clerk authentication failed:', clerkError);
      throw new AppError('Authentication failed', 401);
    }
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Unexpected auth error:', error);
      next(new AppError('Authentication error', 500));
    }
  }
};

/**
 * Optional Clerk authentication
 * Doesn't fail if no token provided, but verifies if present
 */
export const optionalClerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      return next(); // Continue without authentication
    }

    // Try to verify token, but don't fail if invalid
    try {
      const client = ensureClerkClient();
      const session = await client.sessions.verifySession(token, {});
      
      if (session && session.userId) {
        const user = await client.users.getUser(session.userId);
        
        req.auth = {
          userId: session.userId,
          sessionId: session.id,
          user: {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddresses: user.emailAddresses.map(addr => ({
              emailAddress: addr.emailAddress,
              id: addr.id
            })),
            role: user.publicMetadata?.role as string || 'USER'
          }
        };
      }
    } catch (clerkError) {
      logger.debug('Optional auth failed:', clerkError);
      // Continue without authentication
    }

    next();
  } catch (error) {
    logger.debug('Optional auth error:', error);
    next(); // Continue without authentication
  }
};

/**
 * Require specific role
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth?.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (req.auth.user.role !== role) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Require any of the specified roles
 */
export const requireAnyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth?.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!req.auth.user.role || !roles.includes(req.auth.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Require user to be authenticated (alias for clerkAuth)
 */
export const requireAuth = clerkAuth;

/**
 * Check if user owns the resource
 */
export const requireOwnership = (getUserId: (req: Request) => string | Promise<string>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.user) {
        return next(new AppError('Authentication required', 401));
      }

      // Admin can access everything
      if (req.auth.user.role === 'ADMIN') {
        return next();
      }

      const resourceUserId = await getUserId(req);
      
      if (req.auth.userId !== resourceUserId) {
        return next(new AppError('Access denied', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Export middleware functions
export default {
  clerkAuth,
  optionalClerkAuth,
  requireAuth,
  requireRole,
  requireAnyRole,
  requireOwnership
};