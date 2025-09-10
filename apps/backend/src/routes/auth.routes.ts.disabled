/**
 * Authentication Routes
 * User authentication and authorization endpoints
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { oauthController } from '../controllers/oauth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

const router: ExpressRouter = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
// router.post(
//   '/forgot-password',
//   authRateLimiter,
//   validate(forgotPasswordSchema),
//   authController.forgotPassword
// );

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
// router.post(
//   '/reset-password',
//   authRateLimiter,
//   validate(resetPasswordSchema),
//   authController.resetPassword
// );

// Social auth routes removed for MVP

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
// router.post(
//   '/change-password',
//   authenticate,
//   validate(changePasswordSchema),
//   authController.changePassword
// );

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email address with token
 * @access  Public
 */
router.get(
  '/verify-email',
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  authRateLimiter,
  authController.resendVerificationEmail
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  authController.me
);

// OAuth 2.0 Routes

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get('/google', oauthController.googleAuth);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', oauthController.googleCallback);

/**
 * @route   GET /api/auth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 */
router.get('/github', oauthController.githubAuth);

/**
 * @route   GET /api/auth/github/callback
 * @desc    Handle GitHub OAuth callback
 * @access  Public
 */
router.get('/github/callback', oauthController.githubCallback);

/**
 * @route   POST /api/auth/link/:provider
 * @desc    Link social account to existing user
 * @access  Private
 */
router.post('/link/:provider', authenticate, oauthController.linkSocialAccount);

/**
 * @route   DELETE /api/auth/unlink/:provider
 * @desc    Unlink social account from user
 * @access  Private
 */
router.delete('/unlink/:provider', authenticate, oauthController.unlinkSocialAccount);

export default router;