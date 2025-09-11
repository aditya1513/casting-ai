/**
 * Two-Factor Authentication Service
 * Handles TOTP-based 2FA and backup codes for enhanced security
 */

import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { CacheManager } from '../config/redis';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { logger } from '../utils/logger';
import { AppError, ValidationError, AuthenticationError } from '../utils/errors';
import { TwoFactorMethod, UserRole } from '@prisma/client';

interface Setup2FAResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface Verify2FARequest {
  userId: string;
  token: string;
  method: TwoFactorMethod;
}

interface Enable2FARequest {
  userId: string;
  secret: string;
  token: string;
  method: TwoFactorMethod;
}

export class TwoFactorService {
  private readonly APP_NAME = 'CastMatch';
  private readonly SECRET_LENGTH = 32;
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;
  private readonly TOKEN_WINDOW = 2; // Allow 2 time windows for token validation
  private readonly SMS_CODE_LENGTH = 6;
  private readonly SMS_CODE_EXPIRY = 5; // minutes

  /**
   * Generate TOTP secret
   */
  private generateSecret(): speakeasy.GeneratedSecret {
    return speakeasy.generateSecret({
      name: this.APP_NAME,
      length: this.SECRET_LENGTH,
    });
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = crypto
        .randomBytes(this.BACKUP_CODE_LENGTH)
        .toString('hex')
        .toUpperCase()
        .substring(0, this.BACKUP_CODE_LENGTH);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Encrypt secret for storage
   */
  private encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!', 'utf8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secret from storage
   */
  private decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!', 'utf8');
    
    const parts = encryptedSecret.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted secret format');
    }
    const iv = Buffer.from(parts[0]!, 'hex');
    const authTag = Buffer.from(parts[1]!, 'hex');
    const encrypted = parts[2]!;
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted: string = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Setup 2FA for user
   */
  async setup2FA(userId: string, method: TwoFactorMethod = TwoFactorMethod.TOTP): Promise<Setup2FAResponse> {
    try {
      // Check if 2FA is already enabled
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          twoFactorEnabled: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      if (user.twoFactorEnabled) {
        throw new ValidationError('Two-factor authentication is already enabled');
      }

      // Generate secret and backup codes
      const secret = this.generateSecret();
      const backupCodes = this.generateBackupCodes();
      
      // Generate QR code
      const otpAuthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: `${user.email}`,
        issuer: this.APP_NAME,
        encoding: 'base32',
      });
      
      const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);
      
      // Store temporary setup data in cache (expires in 10 minutes)
      const setupKey = `2fa_setup:${userId}`;
      await CacheManager.set(setupKey, {
        secret: secret.base32,
        backupCodes,
        method,
      }, 600);
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2fa_setup_initiated',
          resource: 'user',
          resourceId: userId,
          status: 'success',
          metadata: { method },
        },
      });

      logger.info('2FA setup initiated', { userId, method });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32,
      };
    } catch (error) {
      logger.error('2FA setup failed', error);
      throw error;
    }
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(request: Enable2FARequest): Promise<void> {
    const { userId, secret, token, method } = request;

    try {
      // Verify the token first
      const isValid = this.verifyTOTPToken(token, secret);
      
      if (!isValid) {
        throw new ValidationError('Invalid verification code');
      }

      // Get setup data from cache
      const setupKey = `2fa_setup:${userId}`;
      const setupData = await CacheManager.get<any>(setupKey);
      
      if (!setupData || setupData.secret !== secret) {
        throw new ValidationError('Invalid or expired setup session');
      }

      // Encrypt secret for storage
      const encryptedSecret = this.encryptSecret(secret);
      
      // Hash backup codes for storage
      const hashedBackupCodes = setupData.backupCodes.map((code: string) => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Enable 2FA for user
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: method,
          twoFactorSecret: encryptedSecret,
          twoFactorBackup: hashedBackupCodes,
        },
      });

      // Clear setup data from cache
      await CacheManager.delete(setupKey);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2fa_enabled',
          resource: 'user',
          resourceId: userId,
          status: 'success',
          metadata: { method },
        },
      });

      // Send confirmation email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (user) {
        await emailService.send2FAEnabledEmail({
          to: user.email,
          name: user.firstName || 'User',
          method,
          backupCodes: setupData.backupCodes,
        });
      }

      logger.info('2FA enabled successfully', { userId, method });
    } catch (error) {
      logger.error('Failed to enable 2FA', error);
      throw error;
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password?: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          password: true,
          twoFactorEnabled: true,
        },
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      if (!user.twoFactorEnabled) {
        throw new ValidationError('Two-factor authentication is not enabled');
      }

      // Verify password if provided (for extra security)
      if (password && user.password) {
        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          throw new AuthenticationError('Invalid password');
        }
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorSecret: null,
          twoFactorBackup: [],
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2fa_disabled',
          resource: 'user',
          resourceId: userId,
          status: 'success',
        },
      });

      logger.info('2FA disabled', { userId });
    } catch (error) {
      logger.error('Failed to disable 2FA', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  private verifyTOTPToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.TOKEN_WINDOW,
    });
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(request: Verify2FARequest): Promise<boolean> {
    const { userId, token, method } = request;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackup: true,
          twoFactorMethod: true,
        },
      });

      if (!user || !user.twoFactorEnabled) {
        throw new ValidationError('2FA is not enabled for this user');
      }

      if (user.twoFactorMethod !== method) {
        throw new ValidationError('Invalid 2FA method');
      }

      let isValid = false;

      switch (method) {
        case TwoFactorMethod.TOTP:
          if (!user.twoFactorSecret) {
            throw new ValidationError('2FA secret not found');
          }
          const decryptedSecret = this.decryptSecret(user.twoFactorSecret);
          isValid = this.verifyTOTPToken(token, decryptedSecret);
          break;

        case TwoFactorMethod.SMS:
          // Verify SMS code from cache
          const smsKey = `2fa_sms:${userId}`;
          const storedCode = await CacheManager.get<string>(smsKey);
          
          if (!storedCode) {
            throw new ValidationError('SMS code expired or not found');
          }
          
          isValid = storedCode === token;
          
          if (isValid) {
            await CacheManager.delete(smsKey);
          }
          break;

        case TwoFactorMethod.EMAIL:
          // Verify email code from cache
          const emailKey = `2fa_email:${userId}`;
          const storedEmailCode = await CacheManager.get<string>(emailKey);
          
          if (!storedEmailCode) {
            throw new ValidationError('Email code expired or not found');
          }
          
          isValid = storedEmailCode === token;
          
          if (isValid) {
            await CacheManager.delete(emailKey);
          }
          break;

        default:
          throw new ValidationError('Unsupported 2FA method');
      }

      // If regular token fails, check backup codes
      if (!isValid && user.twoFactorBackup.length > 0) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const backupIndex = user.twoFactorBackup.indexOf(hashedToken);
        
        if (backupIndex !== -1) {
          isValid = true;
          
          // Remove used backup code
          const updatedBackupCodes = [...user.twoFactorBackup];
          updatedBackupCodes.splice(backupIndex, 1);
          
          await prisma.user.update({
            where: { id: userId },
            data: {
              twoFactorBackup: updatedBackupCodes,
            },
          });
          
          logger.info('Backup code used for 2FA', { userId });
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: '2fa_verification',
          resource: 'user',
          resourceId: userId,
          status: isValid ? 'success' : 'failure',
          metadata: { method },
        },
      });

      return isValid;
    } catch (error) {
      logger.error('2FA verification failed', error);
      throw error;
    }
  }

  /**
   * Send 2FA code via SMS
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in cache
      const smsKey = `2fa_sms:${userId}`;
      await CacheManager.set(smsKey, code, this.SMS_CODE_EXPIRY * 60);
      
      // Send SMS
      await smsService.send2FACode(phoneNumber, code);
      
      logger.info('2FA SMS code sent', { userId });
    } catch (error) {
      logger.error('Failed to send 2FA SMS', error);
      throw new AppError('Failed to send SMS code', 500);
    }
  }

  /**
   * Send 2FA code via email
   */
  async sendEmailCode(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in cache
      const emailKey = `2fa_email:${userId}`;
      await CacheManager.set(emailKey, code, this.SMS_CODE_EXPIRY * 60);
      
      // Send email
      await emailService.send2FACodeEmail(
        user.email,
        user.firstName || 'User',
        code
      );
      
      logger.info('2FA email code sent', { userId });
    } catch (error) {
      logger.error('Failed to send 2FA email', error);
      throw new AppError('Failed to send email code', 500);
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          email: true,
          firstName: true,
        },
      });

      if (!user || !user.twoFactorEnabled) {
        throw new ValidationError('2FA is not enabled');
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Hash codes for storage
      const hashedBackupCodes = backupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackup: hashedBackupCodes,
        },
      });

      // Send email with new codes
      await emailService.sendBackupCodesEmail({
        to: user.email,
        name: user.firstName || 'User',
        backupCodes,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'backup_codes_regenerated',
          resource: 'user',
          resourceId: userId,
          status: 'success',
        },
      });

      logger.info('Backup codes regenerated', { userId });

      return backupCodes;
    } catch (error) {
      logger.error('Failed to regenerate backup codes', error);
      throw error;
    }
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorBackup: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    return {
      enabled: user.twoFactorEnabled,
      method: user.twoFactorMethod,
      backupCodesRemaining: user.twoFactorBackup.length,
    };
  }
}

export const twoFactorService = new TwoFactorService();