/**
 * Profile Routes
 * User profile management endpoints
 */

import { Router } from 'express';
import multer from 'multer';
import { ProfileController } from '../controllers/profile.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  updateProfileSchema,
  linkSocialAccountSchema,
  unlinkSocialAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/profile.validator';

const router = Router();
const profileController = new ProfileController();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any, false);
    }
  },
});

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  profileController.getProfile
);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/',
  authenticate,
  validate(updateProfileSchema),
  profileController.updateProfile
);

/**
 * @route   POST /api/profile/avatar
 * @desc    Upload profile avatar
 * @access  Private
 */
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  profileController.uploadAvatar
);

/**
 * @route   GET /api/profile/social
 * @desc    Get linked social accounts
 * @access  Private
 */
router.get(
  '/social',
  authenticate,
  profileController.getSocialAccounts
);

/**
 * @route   POST /api/profile/social
 * @desc    Link social account
 * @access  Private
 */
router.post(
  '/social',
  authenticate,
  validate(linkSocialAccountSchema),
  profileController.linkSocialAccount
);

/**
 * @route   DELETE /api/profile/social
 * @desc    Unlink social account
 * @access  Private
 */
router.delete(
  '/social',
  authenticate,
  validate(unlinkSocialAccountSchema),
  profileController.unlinkSocialAccount
);

/**
 * @route   POST /api/profile/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  profileController.forgotPassword
);

/**
 * @route   POST /api/profile/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  profileController.resetPassword
);

export default router;