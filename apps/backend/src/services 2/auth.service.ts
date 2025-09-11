/**
 * Authentication Service - MVP Version with OTP Support
 * Simple authentication operations with OTP verification
 */

import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface OTPData {
  email: string;
  otp: string;
  expires: Date;
  attempts: number;
}

// In-memory OTP storage for MVP (use Redis in production)
const otpStore: Map<string, OTPData> = new Map();

export class AuthService {
  /**
   * Generate and send OTP for email verification
   */
  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new AppError('Invalid email format', 400);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Generate 6-digit OTP
      const otp = this.generateOTP();
      const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP
      otpStore.set(email, {
        email,
        otp,
        expires,
        attempts: 0
      });

      // Send OTP email
      await emailService.sendOTPEmail(email, otp);

      logger.info(`OTP sent to ${email}`);
      
      return {
        success: true,
        message: 'Verification code sent successfully'
      };
    } catch (error) {
      logger.error('Send OTP error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and create user account
   */
  async verifyOTP(email: string, otp: string, password?: string): Promise<any> {
    try {
      const otpData = otpStore.get(email);
      
      if (!otpData) {
        throw new AppError('No verification code found. Please request a new one.', 400);
      }

      // Check if OTP expired
      if (new Date() > otpData.expires) {
        otpStore.delete(email);
        throw new AppError('Verification code has expired. Please request a new one.', 400);
      }

      // Check attempts limit
      if (otpData.attempts >= 3) {
        otpStore.delete(email);
        throw new AppError('Too many failed attempts. Please request a new verification code.', 429);
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        otpData.attempts++;
        throw new AppError('Invalid verification code', 400);
      }

      // OTP is valid - create user account
      const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          emailVerified: true,
          role: 'ACTOR', // Default role
          firstName: '',
          lastName: '',
        }
      });

      // Clean up OTP
      otpStore.delete(email);

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      logger.info(`User registered successfully: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        }
      };
    } catch (error) {
      logger.error('Verify OTP error:', error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(data: LoginInput): Promise<any> {
    try {
      const { email, password } = data;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      if (!user.password) {
        throw new AppError('Please sign up first', 400);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      if (!user.emailVerified) {
        throw new AppError('Please verify your email first', 401);
      }

      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        tokens: {
          accessToken,
          refreshToken,
        }
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register user (for backward compatibility)
   */
  async register(data: RegisterInput): Promise<any> {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: (data.role || 'ACTOR') as any,
          emailVerified: false,
        }
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AppError('User with this email already exists', 409);
      }
      logger.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<any> {
    try {
      // Simple refresh token validation (implement proper JWT validation in production)
      const userId = this.verifyRefreshToken(refreshToken);
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const newAccessToken = this.generateAccessToken(user.id);
      
      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<void> {
    // Simple logout - in production, invalidate tokens/sessions
    logger.info(`User logged out: ${sessionId}`);
  }

  /**
   * Verify email (placeholder)
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Use OTP verification instead'
    };
  }

  /**
   * Resend verification email (placeholder)
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    return this.sendOTP(email);
  }

  // Helper methods
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateAccessToken(userId: string): string {
    // Simple token generation (implement proper JWT in production)
    return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  }

  private generateRefreshToken(userId: string): string {
    // Simple refresh token generation (implement proper JWT in production)
    return Buffer.from(`refresh:${userId}:${Date.now()}`).toString('base64');
  }

  private verifyRefreshToken(token: string): string {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const parts = decoded.split(':');
      if (parts.length !== 3 || parts[0] !== 'refresh') {
        throw new Error('Invalid refresh token format');
      }
      return parts[1];
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();