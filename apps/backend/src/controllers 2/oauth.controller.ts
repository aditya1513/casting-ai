/**
 * OAuth Controller
 * Handles OAuth 2.0 authentication with Google and GitHub
 */

import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { oauthConfig, generateAuthorizationUrl, validateOAuthConfig } from '../config/oauth.config';
import { socialAuthService } from '../services/social-auth.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthProvider, UserRole } from '@prisma/client';
import { CacheManager, CacheKeys } from '../config/redis';

export class OAuthController {
  /**
   * Initiate Google OAuth flow
   */
  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      if (!validateOAuthConfig('google')) {
        throw new AppError('Google OAuth not configured', 500);
      }

      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in cache for verification (expires in 10 minutes)
      await CacheManager.set(
        CacheKeys.oauthState(state),
        { provider: 'google', timestamp: Date.now() },
        600
      );

      const authUrl = generateAuthorizationUrl('google', state);
      res.redirect(authUrl);
    } catch (error) {
      logger.error('Google OAuth initiation error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=OAuth initialization failed`);
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        throw new AppError('Invalid OAuth callback parameters', 400);
      }

      // Verify state to prevent CSRF
      const storedState = await CacheManager.get(CacheKeys.oauthState(state));
      if (!storedState || storedState.provider !== 'google') {
        throw new AppError('Invalid or expired state', 400);
      }

      // Delete state from cache
      await CacheManager.delete(CacheKeys.oauthState(state));

      // Exchange code for access token
      const tokenResponse = await axios.post(oauthConfig.google.tokenURL, {
        code,
        client_id: oauthConfig.google.clientId,
        client_secret: oauthConfig.google.clientSecret,
        redirect_uri: oauthConfig.google.redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Get user profile from Google
      const profileResponse = await axios.get(oauthConfig.google.userInfoURL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleProfile = profileResponse.data;

      // Process social login
      const authResult = await socialAuthService.authenticateWithProvider({
        id: googleProfile.id,
        email: googleProfile.email,
        name: googleProfile.name,
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        avatar: googleProfile.picture,
        provider: AuthProvider.GOOGLE,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        profile: googleProfile,
      });

      // Redirect to frontend with tokens
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', authResult.tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', authResult.tokens.refreshToken);
      redirectUrl.searchParams.set('provider', 'google');
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
    }
  }

  /**
   * Initiate GitHub OAuth flow
   */
  async githubAuth(req: Request, res: Response): Promise<void> {
    try {
      if (!validateOAuthConfig('github')) {
        throw new AppError('GitHub OAuth not configured', 500);
      }

      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in cache for verification (expires in 10 minutes)
      await CacheManager.set(
        CacheKeys.oauthState(state),
        { provider: 'github', timestamp: Date.now() },
        600
      );

      const authUrl = generateAuthorizationUrl('github', state);
      res.redirect(authUrl);
    } catch (error) {
      logger.error('GitHub OAuth initiation error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=OAuth initialization failed`);
    }
  }

  /**
   * Handle GitHub OAuth callback
   */
  async githubCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        throw new AppError('Invalid OAuth callback parameters', 400);
      }

      // Verify state to prevent CSRF
      const storedState = await CacheManager.get(CacheKeys.oauthState(state));
      if (!storedState || storedState.provider !== 'github') {
        throw new AppError('Invalid or expired state', 400);
      }

      // Delete state from cache
      await CacheManager.delete(CacheKeys.oauthState(state));

      // Exchange code for access token
      const tokenResponse = await axios.post(
        oauthConfig.github.tokenURL,
        {
          client_id: oauthConfig.github.clientId,
          client_secret: oauthConfig.github.clientSecret,
          code,
          redirect_uri: oauthConfig.github.redirectUri,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user profile from GitHub
      const profileResponse = await axios.get(oauthConfig.github.userInfoURL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const githubProfile = profileResponse.data;

      // Get primary email if not public
      let email = githubProfile.email;
      if (!email) {
        const emailsResponse = await axios.get(oauthConfig.github.emailsURL, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
        email = primaryEmail?.email;
      }

      if (!email) {
        throw new AppError('No email address found in GitHub account', 400);
      }

      // Process social login
      const authResult = await socialAuthService.authenticateWithProvider({
        id: githubProfile.id.toString(),
        email,
        name: githubProfile.name || githubProfile.login,
        firstName: githubProfile.name?.split(' ')[0],
        lastName: githubProfile.name?.split(' ').slice(1).join(' '),
        avatar: githubProfile.avatar_url,
        provider: AuthProvider.GITHUB,
        accessToken: access_token,
        profile: githubProfile,
      });

      // Redirect to frontend with tokens
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', authResult.tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', authResult.tokens.refreshToken);
      redirectUrl.searchParams.set('provider', 'github');
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
    }
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!['google', 'github'].includes(provider)) {
        throw new AppError('Invalid provider', 400);
      }

      // Generate state for CSRF protection with user context
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state with user ID for account linking
      await CacheManager.set(
        CacheKeys.oauthState(state),
        { provider, userId, action: 'link', timestamp: Date.now() },
        600
      );

      const authUrl = generateAuthorizationUrl(provider as 'google' | 'github', state);
      res.json({
        success: true,
        data: { authUrl },
      });
    } catch (error) {
      logger.error('Link social account error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'LINK_ACCOUNT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Unlink social account from user
   */
  async unlinkSocialAccount(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await socialAuthService.unlinkProvider(userId, provider as AuthProvider);

      res.json({
        success: true,
        message: 'Social account unlinked successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Unlink social account error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'UNLINK_ACCOUNT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }
}

export const oauthController = new OAuthController();