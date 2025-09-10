/**
 * Social Authentication Routes
 * OAuth endpoints for Google, GitHub, and other providers
 */

import { Router } from 'express';
import passport from '../config/passport';
import { socialAuthController } from '../controllers/social-auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const linkAccountSchema = z.object({
  body: z.object({
    provider: z.enum(['GOOGLE', 'GITHUB', 'FACEBOOK', 'LINKEDIN']),
  }),
});

const unlinkAccountSchema = z.object({
  params: z.object({
    provider: z.enum(['GOOGLE', 'GITHUB', 'FACEBOOK', 'LINKEDIN']),
  }),
});

// =============================================================================
// Google OAuth Routes
// =============================================================================

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  socialAuthController.handleOAuthCallback
);

// =============================================================================
// GitHub OAuth Routes
// =============================================================================

/**
 * @route   GET /api/auth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth callback
 * @access  Public
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  socialAuthController.handleOAuthCallback
);

// =============================================================================
// Social Account Management Routes (Protected)
// =============================================================================

/**
 * @route   GET /api/auth/social/accounts
 * @desc    Get user's linked social accounts
 * @access  Private
 */
router.get(
  '/accounts',
  authenticate,
  socialAuthController.getLinkedAccounts
);

/**
 * @route   POST /api/auth/social/link
 * @desc    Link a social account to existing user
 * @access  Private
 */
router.post(
  '/link',
  authenticate,
  validateRequest(linkAccountSchema),
  socialAuthController.linkAccount
);

/**
 * @route   DELETE /api/auth/social/unlink/:provider
 * @desc    Unlink a social account from user
 * @access  Private
 */
router.delete(
  '/unlink/:provider',
  authenticate,
  validateRequest(unlinkAccountSchema),
  socialAuthController.unlinkAccount
);

// =============================================================================
// OAuth State Management Routes
// =============================================================================

/**
 * @route   POST /api/auth/social/state
 * @desc    Generate OAuth state for CSRF protection
 * @access  Public
 */
router.post('/state', socialAuthController.generateOAuthState);

/**
 * @route   POST /api/auth/social/validate-state
 * @desc    Validate OAuth state
 * @access  Public
 */
router.post('/validate-state', socialAuthController.validateOAuthState);

export default router;