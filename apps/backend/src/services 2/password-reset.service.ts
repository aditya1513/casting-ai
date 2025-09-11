/**
 * Password Reset Service
 * Handles secure password reset functionality with token generation and validation
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { CacheManager } from '../config/redis';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import { AppError, ValidationError, AuthenticationError } from '../utils/errors';
import { addHours, isAfter } from 'date-fns';

interface PasswordResetRequest {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
  ipAddress?: string;
  userAgent?: string;
}

interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export class PasswordResetService {
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_EXPIRY_HOURS = 2;
  private readonly MAX_RESET_ATTEMPTS = 5;
  private readonly RESET_COOLDOWN_MINUTES = 5;
  private readonly PASSWORD_MIN_LENGTH = 8;
  private readonly PASSWORD_HISTORY_COUNT = 5;

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(`Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`);
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new ValidationError(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
      throw new ValidationError('Password is too common. Please choose a stronger password');
    }
  }

  /**
   * Check if password was previously used
   */
  private async checkPasswordHistory(userId: string, newPasswordHash: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        passwordHistory: true,
      },
    });

    if (!user) return false;

    // Check current password
    if (user.password && await bcrypt.compare(newPasswordHash, user.password)) {
      return true;
    }

    // Check password history
    for (const oldHash of user.passwordHistory || []) {
      if (await bcrypt.compare(newPasswordHash, oldHash)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Rate limit check for password reset requests
   */
  private async checkRateLimit(email: string): Promise<void> {
    const cacheKey = `password_reset_attempts:${email}`;
    const attempts = await CacheManager.get<number>(cacheKey) || 0;

    if (attempts >= this.MAX_RESET_ATTEMPTS) {
      throw new ValidationError(
        `Too many password reset attempts. Please try again later.`
      );
    }

    await CacheManager.set(cacheKey, attempts + 1, this.RESET_COOLDOWN_MINUTES * 60);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    const { email, ipAddress, userAgent } = request;

    try {
      // Rate limiting
      await this.checkRateLimit(email);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          isDeleted: true,
        },
      });

      // Always respond with success to prevent email enumeration
      if (!user || !user.isActive || user.isDeleted) {
        logger.warn('Password reset requested for non-existent or inactive user', { email });
        return;
      }

      // Check for existing valid token
      const existingReset = await prisma.passwordReset.findFirst({
        where: {
          userId: user.id,
          expiresAt: {
            gt: new Date(),
          },
          usedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingReset) {
        const timeSinceLastRequest = Date.now() - existingReset.createdAt.getTime();
        const cooldownMs = this.RESET_COOLDOWN_MINUTES * 60 * 1000;

        if (timeSinceLastRequest < cooldownMs) {
          logger.warn('Password reset requested too soon', {
            userId: user.id,
            timeSinceLastRequest,
          });
          return;
        }
      }

      // Generate reset token
      const resetToken = this.generateSecureToken();
      const hashedToken = this.hashToken(resetToken);
      const expiresAt = addHours(new Date(), this.TOKEN_EXPIRY_HOURS);

      // Save reset token
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          hashedToken,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
      
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.firstName || 'User',
        resetUrl,
        expiryHours: this.TOKEN_EXPIRY_HOURS,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'password_reset_requested',
          resource: 'user',
          resourceId: user.id,
          ipAddress,
          userAgent,
          status: 'success',
        },
      });

      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Password reset request failed', error);
      
      // Don't expose specific errors to prevent information leakage
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Generic error for other cases
      throw new AppError('Failed to process password reset request', 500);
    }
  }

  /**
   * Validate reset token
   */
  async validateResetToken(token: string): Promise<{ isValid: boolean; userId?: string }> {
    try {
      const hashedToken = this.hashToken(token);

      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token,
          hashedToken,
          expiresAt: {
            gt: new Date(),
          },
          usedAt: null,
        },
        select: {
          userId: true,
          expiresAt: true,
        },
      });

      if (!resetRecord) {
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: resetRecord.userId,
      };
    } catch (error) {
      logger.error('Token validation failed', error);
      return { isValid: false };
    }
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(request: PasswordResetConfirm): Promise<void> {
    const { token, newPassword, confirmPassword, ipAddress, userAgent } = request;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new ValidationError('Passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Validate token
    const hashedToken = this.hashToken(token);
    
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        hashedToken,
        expiresAt: {
          gt: new Date(),
        },
        usedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            password: true,
            passwordHistory: true,
          },
        },
      },
    });

    if (!resetRecord) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Check password history
    const wasUsedBefore = await this.checkPasswordHistory(resetRecord.userId, newPassword);
    if (wasUsedBefore) {
      throw new ValidationError('This password has been used before. Please choose a different password');
    }

    // Update user password in transaction
    await prisma.$transaction(async (tx) => {
      // Get current password for history
      const currentUser = await tx.user.findUnique({
        where: { id: resetRecord.userId },
        select: { password: true, passwordHistory: true },
      });

      // Update password history
      const passwordHistory = currentUser?.passwordHistory || [];
      if (currentUser?.password) {
        passwordHistory.unshift(currentUser.password);
        // Keep only last N passwords
        passwordHistory.splice(this.PASSWORD_HISTORY_COUNT);
      }

      // Update user password
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          passwordHistory,
          lastPasswordChange: new Date(),
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          // Invalidate all refresh tokens
          refreshToken: null,
        },
      });

      // Mark token as used
      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: {
          usedAt: new Date(),
          ipAddress,
          userAgent,
        },
      });

      // Invalidate all other reset tokens for this user
      await tx.passwordReset.updateMany({
        where: {
          userId: resetRecord.userId,
          usedAt: null,
          id: {
            not: resetRecord.id,
          },
        },
        data: {
          usedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: 'password_reset_completed',
          resource: 'user',
          resourceId: resetRecord.userId,
          ipAddress,
          userAgent,
          status: 'success',
        },
      });

      // Invalidate all sessions for this user
      await tx.loginSession.updateMany({
        where: {
          userId: resetRecord.userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    // Clear rate limit on successful reset
    await CacheManager.delete(`password_reset_attempts:${resetRecord.user.email}`);

    // Send confirmation email
    await emailService.sendPasswordChangedEmail({
      to: resetRecord.user.email,
      name: resetRecord.user.firstName || 'User',
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    logger.info('Password reset completed', {
      userId: resetRecord.userId,
      email: resetRecord.user.email,
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(request: PasswordChangeRequest): Promise<void> {
    const { userId, currentPassword, newPassword, confirmPassword } = request;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new ValidationError('New passwords do not match');
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        passwordHistory: true,
        firstName: true,
      },
    });

    if (!user || !user.password) {
      throw new AuthenticationError('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Check password history
    const wasUsedBefore = await this.checkPasswordHistory(userId, newPassword);
    if (wasUsedBefore) {
      throw new ValidationError('This password has been used before. Please choose a different password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password history
    const passwordHistory = user.passwordHistory || [];
    passwordHistory.unshift(user.password);
    passwordHistory.splice(this.PASSWORD_HISTORY_COUNT);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordHistory,
        lastPasswordChange: new Date(),
        // Don't invalidate refresh tokens for password change
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'password_changed',
        resource: 'user',
        resourceId: userId,
        status: 'success',
      },
    });

    // Send confirmation email
    await emailService.sendPasswordChangedEmail({
      to: user.email,
      name: user.firstName || 'User',
      timestamp: new Date().toISOString(),
    });

    logger.info('Password changed successfully', {
      userId,
      email: user.email,
    });
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            usedAt: {
              not: null,
            },
            createdAt: {
              lt: addHours(new Date(), -24), // Delete used tokens after 24 hours
            },
          },
        ],
      },
    });

    logger.info('Cleaned up expired password reset tokens', {
      deletedCount: result.count,
    });
  }
}

export const passwordResetService = new PasswordResetService();