/**
 * Authentication Service - MVP Version
 * Simplified authentication with email/password only
 */

import { prisma } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';
import {
  hashPassword,
  comparePassword,
  validatePassword,
} from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSessionId,
} from '../utils/jwt';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  BadRequestError,
} from '../utils/errors';
import { logger } from '../utils/logger';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';
import { UserRole } from '@prisma/client';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    isEmailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(userData: RegisterInput): Promise<AuthResponse> {
    const { email, password, firstName, lastName, role } = userData;
    
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (existingUser) {
        throw new BadRequestError('User already exists');
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role: role as UserRole,
          isEmailVerified: false,
          isPhoneVerified: false,
        }
      });
      
      // Generate tokens
      const sessionId = generateSessionId();
      const accessToken = generateAccessToken(user.id, user.email, user.role, sessionId);
      const refreshToken = generateRefreshToken(user.id, sessionId);
      
      // Create session with only the token field (using refreshToken as the main token)
      await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          token: refreshToken, // Store refresh token as the main session token
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });
      
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600, // 1 hour
        }
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const { email, password } = credentials;
    
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Verify password
      if (!user.password || !await comparePassword(password, user.password)) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Generate tokens
      const sessionId = generateSessionId();
      const accessToken = generateAccessToken(user.id, user.email, user.role, sessionId);
      const refreshToken = generateRefreshToken(user.id, sessionId);
      
      // Create session
      await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          token: refreshToken, // Store refresh token as the main session token
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });
      
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600, // 1 hour
        }
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const session = await prisma.session.findFirst({
        where: {
          token: refreshToken,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });
      
      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      // Generate new access token
      const accessToken = generateAccessToken(session.user.id, session.user.email, session.user.role, session.id);
      
      return {
        accessToken,
        expiresIn: 3600, // 1 hour
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<void> {
    try {
      // Delete session instead of updating isActive (which doesn't exist)
      await prisma.session.delete({
        where: { id: sessionId }
      });
      
      // Clear from cache
      await CacheManager.delete(CacheKeys.userSession('*', sessionId));
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
      }
    });
  }
}

export const authService = new AuthService();