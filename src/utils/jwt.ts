/**
 * JWT Utility Functions
 * Token generation and verification utilities
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { UserRole } from '@prisma/client';

/**
 * JWT token payload interfaces with enhanced security claims
 */
interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  type: 'access';
  iat?: number; // Issued at
  exp?: number; // Expires at
  iss?: string; // Issuer
  aud?: string; // Audience
  jti?: string; // JWT ID for tracking
  scope?: string[]; // Permissions scope
}

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  jti?: string;
}

interface ResetTokenPayload {
  userId: string;
  email: string;
  type: 'reset';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;
}

interface VerificationTokenPayload {
  userId: string;
  email: string;
  type: 'verification';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;
}

/**
 * Generate access token with enhanced security claims
 */
export const generateAccessToken = (
  userId: string,
  email: string,
  role: UserRole,
  sessionId: string,
  additionalClaims: Partial<AccessTokenPayload> = {}
): string => {
  const jwtId = `at_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Define role-based scopes
  const getRoleScopes = (userRole: UserRole): string[] => {
    const baseScopes = ['profile:read'];
    
    switch (userRole) {
      case 'ACTOR':
        return [...baseScopes, 'actor:profile', 'auditions:apply', 'submissions:create'];
      case 'CASTING_DIRECTOR':
        return [...baseScopes, 'casting:manage', 'auditions:create', 'applications:review'];
      case 'PRODUCER':
        return [...baseScopes, 'projects:manage', 'casting:oversee', 'analytics:view'];
      default:
        return baseScopes;
    }
  };
  
  const payload: AccessTokenPayload = {
    userId,
    email,
    role,
    sessionId,
    type: 'access',
    jti: jwtId,
    scope: getRoleScopes(role),
    ...additionalClaims,
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '1h',
  });
};

/**
 * Generate refresh token with enhanced security
 */
export const generateRefreshToken = (
  userId: string, 
  sessionId: string,
  additionalClaims: Partial<RefreshTokenPayload> = {}
): string => {
  const jwtId = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const payload: RefreshTokenPayload = {
    userId,
    sessionId,
    type: 'refresh',
    jti: jwtId,
    ...additionalClaims,
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '7d',
  });
};

/**
 * Generate password reset token with enhanced security
 */
export const generateResetToken = (userId: string, email: string): string => {
  const jwtId = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const payload: ResetTokenPayload = {
    userId,
    email,
    type: 'reset',
    jti: jwtId,
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '1h', // Short-lived for security
    issuer: 'castmatch-api',
    audience: ['castmatch-web', 'castmatch-mobile'],
    algorithm: 'HS256',
    notBefore: 0, // Can be used immediately
  });
};

/**
 * Generate email verification token with enhanced security
 */
export const generateVerificationToken = (userId: string, email: string): string => {
  const jwtId = `vt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const payload: VerificationTokenPayload = {
    userId,
    email,
    type: 'verification',
    jti: jwtId,
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '24h', // 24 hours to verify email
    issuer: 'castmatch-api',
    audience: ['castmatch-web', 'castmatch-mobile'],
    algorithm: 'HS256',
  });
};

/**
 * Verify and decode token with enhanced validation
 */
export const verifyToken = <T = any>(
  token: string, 
  options: {
    ignoreExpiration?: boolean;
    audience?: string | string[];
    maxAge?: string;
  } = {}
): T => {
  const defaultAudience = ['castmatch-web', 'castmatch-mobile', 'castmatch-api'];
  
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'castmatch-api',
    audience: options.audience as string | undefined || 'castmatch-web',
    algorithms: ['HS256'],
    ignoreExpiration: options.ignoreExpiration || false,
    maxAge: options.maxAge,
    clockTolerance: 30, // 30 seconds clock tolerance
  }) as T;
};

/**
 * Verify token and extract claims safely
 */
export const verifyTokenSafe = <T = any>(
  token: string,
  options: {
    ignoreExpiration?: boolean;
    audience?: string | string[];
    maxAge?: string;
  } = {}
): { success: boolean; payload?: T; error?: string } => {
  try {
    const payload = verifyToken<T>(token, options);
    return { success: true, payload };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Token verification failed'
    };
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

/**
 * Generate session ID
 */
export const generateSessionId = (): string => {
  return uuidv4();
};

/**
 * Calculate token expiry date
 */
export const getTokenExpiry = (expiryString: string | undefined): Date => {
  if (!expiryString) {
    throw new Error('Expiry string is required');
  }
  const now = new Date();
  const match = expiryString!.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    throw new Error('Invalid expiry format');
  }
  
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  
  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    default:
      throw new Error('Invalid time unit');
  }
  
  return now;
};