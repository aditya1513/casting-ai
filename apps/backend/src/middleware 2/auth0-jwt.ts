/**
 * Auth0 JWT Validation Middleware
 * Validates JWT tokens from Auth0 and sets user context
 */

import { Request, Response, NextFunction } from 'express';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { logger } from '../utils/logger';

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  logger.error('Auth0 configuration missing: AUTH0_DOMAIN and AUTH0_AUDIENCE are required');
}

// Create JWKS client
const jwksClient = jwksRsa({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// JWT verification middleware - create base middleware first
const baseAuth0JWT = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

// Create conditional middleware that skips certain paths
export const auth0JWT = (req: any, res: any, next: any) => {
  // Skip JWT validation for these paths
  const skipPaths = [
    '/api/health',
    '/api/vector-migration',
    '/api/metrics',
    '/api/monitoring',
    '/api/auth'
  ];
  
  // Check if the request path should skip authentication
  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
  
  if (shouldSkip) {
    return next();
  }
  
  // Apply JWT validation for protected routes
  return baseAuth0JWT(req, res, next);
};

// Optional middleware to extract user info from Auth0 token
export const extractAuth0User = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    // Extract user info from Auth0 JWT payload
    const auth0User = req.user as any;
    req.user = {
      id: auth0User.sub, // Auth0 user ID
      email: auth0User.email,
      name: auth0User.name,
      role: auth0User['https://castmatch.app/role'] || 'actor', // Custom claim for role
      permissions: auth0User.permissions || [],
      emailVerified: auth0User.email_verified,
    };
  }
  next();
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = user.role || 'actor';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: requiredPermissions,
        current: userPermissions,
      });
    }

    next();
  };
};

// Error handler for JWT middleware
export const jwtErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn('JWT validation failed:', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: err.message,
    });
  }

  next(err);
};