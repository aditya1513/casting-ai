/**
 * Profile Controller
 * Handles profile management operations
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbDirect } from '../utils/db-direct';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';
import { generateResetToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';
import { EmailService } from '../services/email.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: any;
    sessionId?: string;
  };
}

export class ProfileController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Get user profile
   * @route GET /api/profile
   */
  public getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const profile = await dbDirect.getUserProfile(userId);

      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      // Remove sensitive information
      const { password, ...sanitizedProfile } = profile;

      res.status(200).json({
        success: true,
        data: {
          profile: sanitizedProfile
        },
        message: 'Profile retrieved successfully'
      });

      logger.info('Profile retrieved', { userId });
    } catch (error) {
      logger.error('Get profile error', { userId: req.user?.id, error });
      throw error;
    }
  };

  /**
   * Update user profile
   * @route PUT /api/profile
   */
  public updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profileData = req.body;

      // Remove undefined values
      const cleanProfileData = Object.keys(profileData).reduce((acc, key) => {
        if (profileData[key] !== undefined) {
          acc[key] = profileData[key];
        }
        return acc;
      }, {} as any);

      // Calculate profile completion
      const requiredFields = ['display_name', 'first_name', 'last_name', 'bio'];
      const completedFields = requiredFields.filter(field => 
        cleanProfileData[field] || profileData[field]
      ).length;
      const isProfileComplete = completedFields >= requiredFields.length * 0.75;
      
      cleanProfileData.is_profile_complete = isProfileComplete;

      const updatedProfile = await dbDirect.updateUserProfile(userId, cleanProfileData);

      if (!updatedProfile) {
        throw new BadRequestError('Failed to update profile');
      }

      res.status(200).json({
        success: true,
        data: {
          profile: updatedProfile
        },
        message: 'Profile updated successfully'
      });

      logger.info('Profile updated', { userId, updatedFields: Object.keys(cleanProfileData) });
    } catch (error) {
      logger.error('Update profile error', { userId: req.user?.id, error });
      throw error;
    }
  };

  /**
   * Upload profile avatar
   * @route POST /api/profile/avatar
   */
  public uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      
      // In a real implementation, you would:
      // 1. Validate file type and size
      // 2. Upload to cloud storage (S3, Cloudinary, etc.)
      // 3. Generate optimized versions
      // 4. Update profile with new image URL

      // For now, we'll simulate this process
      if (!req.file) {
        throw new BadRequestError('Avatar image is required');
      }

      // Simulate avatar URL (in production, this would be the actual uploaded URL)
      const avatarUrl = `https://cdn.castmatch.com/avatars/${userId}/${Date.now()}.jpg`;

      const updatedProfile = await dbDirect.updateUserProfile(userId, {
        profile_image_url: avatarUrl
      });

      res.status(200).json({
        success: true,
        data: {
          profile_image_url: avatarUrl,
          profile: updatedProfile
        },
        message: 'Avatar uploaded successfully'
      });

      logger.info('Avatar uploaded', { userId, avatarUrl });
    } catch (error) {
      logger.error('Upload avatar error', { userId: req.user?.id, error });
      throw error;
    }
  };

  /**
   * Get social accounts
   * @route GET /api/profile/social
   */
  public getSocialAccounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const socialAccounts = await dbDirect.getSocialAccounts(userId);

      // Remove sensitive tokens from response
      const sanitizedAccounts = socialAccounts.map(account => ({
        id: account.id,
        provider: account.provider,
        provider_display_name: account.provider_display_name,
        is_primary: account.is_primary,
        created_at: account.created_at
      }));

      res.status(200).json({
        success: true,
        data: {
          social_accounts: sanitizedAccounts
        },
        message: 'Social accounts retrieved successfully'
      });

      logger.info('Social accounts retrieved', { userId, accountCount: socialAccounts.length });
    } catch (error) {
      logger.error('Get social accounts error', { userId: req.user?.id, error });
      throw error;
    }
  };

  /**
   * Link social account
   * @route POST /api/profile/social
   */
  public linkSocialAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { provider, access_token, provider_account_id, provider_display_name, is_primary } = req.body;

      // Check if account is already linked
      const existingAccount = await dbDirect.findSocialAccount(provider, provider_account_id);
      
      if (existingAccount) {
        throw new ConflictError('This social account is already linked to another user');
      }

      // Check if user already has an account for this provider
      const userExistingAccount = await dbDirect.getSocialAccounts(userId);
      const providerAccount = userExistingAccount.find(acc => acc.provider === provider);

      if (providerAccount) {
        throw new ConflictError(`You already have a ${provider} account linked`);
      }

      const socialData = {
        id: uuidv4(),
        provider,
        provider_account_id,
        provider_display_name: provider_display_name || `${provider} Account`,
        access_token,
        refresh_token: null,
        expires_at: null,
        is_primary: is_primary || false
      };

      const linkedAccount = await dbDirect.linkSocialAccount(userId, socialData);

      // Remove sensitive data from response
      const { access_token: _, refresh_token: __, ...sanitizedAccount } = linkedAccount;

      res.status(201).json({
        success: true,
        data: {
          social_account: sanitizedAccount
        },
        message: `${provider} account linked successfully`
      });

      logger.info('Social account linked', { userId, provider });
    } catch (error) {
      logger.error('Link social account error', { userId: req.user?.id, error });
      throw error;
    }
  };

  /**
   * Unlink social account
   * @route DELETE /api/profile/social
   */
  public unlinkSocialAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { provider } = req.body;

      const unlinkedAccount = await dbDirect.unlinkSocialAccount(userId, provider);

      if (!unlinkedAccount) {
        throw new NotFoundError(`No ${provider} account found to unlink`);
      }

      res.status(200).json({
        success: true,
        data: {
          provider
        },
        message: `${provider} account unlinked successfully`
      });

      logger.info('Social account unlinked', { userId, provider });
    } catch (error) {
      logger.error('Unlink social account error', { userId: req.user?.id, error });
      throw error;
    }
  };

  /**
   * Request password reset
   * @route POST /api/profile/forgot-password
   */
  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      const user = await dbDirect.findUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
        return;
      }

      // Generate reset token
      const resetToken = generateResetToken(user.id, email);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await dbDirect.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send reset email
      await this.emailService.sendPasswordResetEmail({
        to: email,
        name: user.firstName || 'User',
        resetToken,
        expiryHours: 1
      });

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });

      logger.info('Password reset requested', { email });
    } catch (error) {
      logger.error('Forgot password error', { email: req.body?.email, error });
      throw error;
    }
  };

  /**
   * Reset password with token
   * @route POST /api/profile/reset-password
   */
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;

      const resetTokenRecord = await dbDirect.findPasswordResetToken(token);

      if (!resetTokenRecord) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user password
      await dbDirect.updateUser(resetTokenRecord.user_id, {
        password: hashedPassword
      });

      // Mark token as used
      await dbDirect.markPasswordResetTokenUsed(token);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

      logger.info('Password reset completed', { userId: resetTokenRecord.user_id });
    } catch (error) {
      logger.error('Reset password error', { error });
      throw error;
    }
  };
}