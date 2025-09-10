/**
 * User Routes
 * User management endpoints
 */

import { Router } from 'express';
import { clerkAuth, requireAuth } from '../middleware/clerk-auth';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', requireAuth, (req, res) => {
  res.json({ 
    message: 'User profile endpoint',
    user: req.auth?.user
  });
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', requireAuth, (req, res) => {
  res.json({ 
    message: 'Update profile endpoint',
    userId: req.auth?.userId 
  });
});

export default router;