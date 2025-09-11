/**
 * Social Authentication Controller
 * Handles OAuth authentication flows
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { dbDirect } from '../utils/db-direct';
import { logger } from '../utils/logger';
import { ValidationError, AuthenticationError, ConflictError } from '../utils/errors';
import { generateAccessToken, generateRefreshToken, generateSessionId, getTokenExpiry } from '../utils/jwt';
import { config } from '../config/config';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: any;
    sessionId?: string;
  };
}

export class SocialAuthController {
  /**
   * Google OAuth callback
   * @route POST /api/auth/google
   */
  public googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { access_token, code } = req.body;

      if (!access_token && !code) {
        throw new ValidationError('Access token or authorization code is required');
      }

      let userInfo: GoogleUserInfo;

      if (access_token) {
        // Direct access token approach
        userInfo = await this.getGoogleUserInfo(access_token);
      } else {
        // Authorization code flow (more secure)
        const tokenResponse = await this.exchangeGoogleCode(code);
        userInfo = await this.getGoogleUserInfo(tokenResponse.access_token);
      }

      const result = await this.handleSocialAuth({
        provider: 'GOOGLE',
        providerId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        profileImage: userInfo.picture,
        accessToken: access_token || undefined
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Google authentication successful'
      });

      logger.info('Google OAuth successful', { email: userInfo.email });
    } catch (error) {
      logger.error('Google OAuth error', { error });
      throw error;
    }
  };

  /**
   * GitHub OAuth callback
   * @route POST /api/auth/github
   */
  public githubCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { access_token, code } = req.body;

      if (!access_token && !code) {
        throw new ValidationError('Access token or authorization code is required');
      }

      let userInfo: GitHubUserInfo;

      if (access_token) {
        // Direct access token approach
        userInfo = await this.getGitHubUserInfo(access_token);
      } else {
        // Authorization code flow
        const tokenResponse = await this.exchangeGitHubCode(code);
        userInfo = await this.getGitHubUserInfo(tokenResponse.access_token);
      }

      const result = await this.handleSocialAuth({
        provider: 'GITHUB',
        providerId: userInfo.id.toString(),
        email: userInfo.email,
        name: userInfo.name,
        profileImage: userInfo.avatar_url,
        accessToken: access_token || undefined
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'GitHub authentication successful'
      });

      logger.info('GitHub OAuth successful', { email: userInfo.email });
    } catch (error) {
      logger.error('GitHub OAuth error', { error });
      throw error;
    }
  };

  /**
   * Link social account to existing user
   * @route POST /api/auth/link-social
   */
  public linkSocial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { provider, access_token, provider_account_id } = req.body;

      // Verify the social account
      let userInfo: any;
      
      if (provider === 'GOOGLE') {
        userInfo = await this.getGoogleUserInfo(access_token);
        if (userInfo.id !== provider_account_id) {
          throw new ValidationError('Invalid Google account');
        }
      } else if (provider === 'GITHUB') {
        userInfo = await this.getGitHubUserInfo(access_token);
        if (userInfo.id.toString() !== provider_account_id) {
          throw new ValidationError('Invalid GitHub account');
        }
      } else {
        throw new ValidationError('Unsupported social provider');
      }

      // Check if account is already linked
      const existingAccount = await dbDirect.findSocialAccount(provider, provider_account_id);
      
      if (existingAccount) {
        throw new ConflictError('This social account is already linked');
      }

      // Link the account
      const socialData = {
        id: uuidv4(),
        provider,
        provider_account_id,
        provider_display_name: userInfo.name || `${provider} Account`,
        access_token,
        refresh_token: null,
        expires_at: null,
        is_primary: false
      };

      const linkedAccount = await dbDirect.linkSocialAccount(userId, socialData);

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
   * @route DELETE /api/auth/unlink-social
   */
  public unlinkSocial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { provider } = req.body;

      const unlinkedAccount = await dbDirect.unlinkSocialAccount(userId, provider);

      if (!unlinkedAccount) {
        throw new ValidationError(`No ${provider} account found to unlink`);
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
   * Handle social authentication logic
   */
  private async handleSocialAuth(socialData: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    accessToken?: string;
  }) {
    // Check if social account already exists
    const existingSocialAccount = await dbDirect.findSocialAccount(socialData.provider, socialData.providerId);

    let user: any;

    if (existingSocialAccount) {
      // User exists with this social account
      user = await dbDirect.findUserById(existingSocialAccount.user_id);
      if (!user) {
        throw new AuthenticationError('Invalid social account');
      }
    } else {
      // Check if user exists by email
      const existingUser = await dbDirect.findUserByEmail(socialData.email);

      if (existingUser) {
        // User exists but doesn't have this social account linked
        user = existingUser;
        
        // Link the social account
        const socialAccountData = {
          id: uuidv4(),
          provider: socialData.provider,
          provider_account_id: socialData.providerId,
          provider_display_name: socialData.name,
          access_token: socialData.accessToken || null,
          refresh_token: null,
          expires_at: null,
          is_primary: false
        };

        await dbDirect.linkSocialAccount(user.id, socialAccountData);
      } else {
        // Create new user
        const userId = uuidv4();
        
        user = await dbDirect.createUser({
          id: userId,
          email: socialData.email,
          password: null, // Social auth users don't have passwords
          role: 'TALENT' // Default role
        });

        // Create user profile
        await dbDirect.updateUserProfile(userId, {
          display_name: socialData.name,
          first_name: socialData.firstName || null,
          last_name: socialData.lastName || null,
          profile_image_url: socialData.profileImage || null,
          is_profile_complete: false
        });

        // Create social account
        const socialAccountData = {
          id: uuidv4(),
          provider: socialData.provider,
          provider_account_id: socialData.providerId,
          provider_display_name: socialData.name,
          access_token: socialData.accessToken || null,
          refresh_token: null,
          expires_at: null,
          is_primary: true
        };

        await dbDirect.createSocialAccount(socialAccountData);
      }
    }

    // Generate tokens
    const sessionId = generateSessionId();
    const accessToken = generateAccessToken(user.id, user.email, user.role, sessionId);
    const refreshToken = generateRefreshToken(user.id, sessionId);

    // Store session
    const refreshExpiry = getTokenExpiry(config.jwt.refreshExpiry);
    await dbDirect.createUserSession({
      id: sessionId,
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: refreshExpiry
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: config.jwt.accessExpiry
      },
      session_id: sessionId
    };
  }

  /**
   * Get Google user information
   */
  private async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get(`https://www.googleapis.com/oauth2/v2/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Google API error', { error: error.response?.data });
      throw new AuthenticationError('Invalid Google access token');
    }
  }

  /**
   * Exchange Google authorization code for tokens
   */
  private async exchangeGoogleCode(code: string) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      return response.data;
    } catch (error: any) {
      logger.error('Google token exchange error', { error: error.response?.data });
      throw new ValidationError('Invalid authorization code');
    }
  }

  /**
   * Get GitHub user information
   */
  private async getGitHubUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'CastMatch'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('GitHub API error', { error: error.response?.data });
      throw new AuthenticationError('Invalid GitHub access token');
    }
  }

  /**
   * Exchange GitHub authorization code for tokens
   */
  private async exchangeGitHubCode(code: string) {
    try {
      const response = await axios.post('https://github.com/login/oauth/access_token', {
        code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        redirect_uri: process.env.GITHUB_REDIRECT_URI
      }, {
        headers: {
          Accept: 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('GitHub token exchange error', { error: error.response?.data });
      throw new ValidationError('Invalid authorization code');
    }
  }
}