/**
 * Authentication Controller - MVP Version
 * Simplified authentication endpoints
 */

import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'REGISTRATION_FAILED',
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
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'LOGIN_FAILED',
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
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'TOKEN_REFRESH_FAILED',
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
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.sessionId) {
        throw new AppError('Session not found', 400);
      }
      
      await authService.logout(req.user.sessionId);
      
      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'LOGOUT_FAILED',
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
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new AppError('Verification token is required', 400);
      }
      
      const result = await authService.verifyEmail(token);
      
      if (!result.success) {
        throw new AppError(result.message, 400);
      }
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'EMAIL_VERIFICATION_FAILED',
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
   * Resend verification email
   */
  async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw new AppError('Email is required', 400);
      }
      
      const result = await authService.resendVerificationEmail(email);
      
      if (!result.success) {
        throw new AppError(result.message, 400);
      }
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Resend verification error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'RESEND_VERIFICATION_FAILED',
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
   * Get current user (placeholder for MVP)
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError('User not authenticated', 401);
      }
      
      const user = await authService.getUserById(req.user.id);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get user error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'GET_USER_FAILED',
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

  // Placeholder methods for features not in MVP
  async forgotPassword(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        message: 'Feature not implemented in MVP',
        code: 'NOT_IMPLEMENTED',
        statusCode: 501,
      },
    });
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        message: 'Feature not implemented in MVP',
        code: 'NOT_IMPLEMENTED',
        statusCode: 501,
      },
    });
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        message: 'Feature not implemented in MVP',
        code: 'NOT_IMPLEMENTED',
        statusCode: 501,
      },
    });
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        message: 'Feature not implemented in MVP',
        code: 'NOT_IMPLEMENTED',
        statusCode: 501,
      },
    });
  }

  // Alias for me method to maintain compatibility
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    return this.me(req, res);
  }
}