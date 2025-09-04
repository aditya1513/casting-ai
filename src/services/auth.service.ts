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
import { emailService } from './email.service';
import crypto from 'crypto';

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
   * Generate email verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate email verification link
   */
  private generateVerificationLink(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/auth/verify-email?token=${token}`;
  }

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
      
      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      const hashedVerificationToken = await hashPassword(verificationToken);
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with verification token
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role: role as UserRole,
          isEmailVerified: false,
          isPhoneVerified: false,
          resetToken: hashedVerificationToken, // Reusing reset token field for email verification
          resetTokenExpiry: tokenExpiry,
        }
      });

      // Send verification email
      try {
        await emailService.sendVerificationEmail({
          to: user.email,
          name: `${firstName} ${lastName}`,
          verificationLink: this.generateVerificationLink(verificationToken),
        });
        logger.info(`Verification email sent to ${user.email}`);
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
        // Continue with registration even if email fails
      }
      
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
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find all users with non-expired tokens
      const users = await prisma.user.findMany({
        where: {
          resetToken: { not: null },
          resetTokenExpiry: { gt: new Date() },
        }
      });

      // Find the user with matching token
      let matchedUser = null;
      for (const user of users) {
        if (user.resetToken && await comparePassword(token, user.resetToken)) {
          matchedUser = user;
          break;
        }
      }

      if (!matchedUser) {
        return { success: false, message: 'Invalid or expired verification token' };
      }

      // Update user as verified
      await prisma.user.update({
        where: { id: matchedUser.id },
        data: {
          isEmailVerified: true,
          resetToken: null,
          resetTokenExpiry: null,
        }
      });

      logger.info(`Email verified for user: ${matchedUser.email}`);
      return { success: true, message: 'Email successfully verified' };
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (user.isEmailVerified) {
        return { success: false, message: 'Email already verified' };
      }

      // Generate new verification token
      const verificationToken = this.generateVerificationToken();
      const hashedVerificationToken = await hashPassword(verificationToken);
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashedVerificationToken,
          resetTokenExpiry: tokenExpiry,
        }
      });

      // Send verification email
      await emailService.sendVerificationEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`,
        verificationLink: this.generateVerificationLink(verificationToken),
      });

      logger.info(`Verification email resent to ${user.email}`);
      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      logger.error('Failed to resend verification email:', error);
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