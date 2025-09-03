/**
 * Application Routes
 * Casting application management
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/applications
 * @desc    Get user's applications
 * @access  Private
 */
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Get applications endpoint' });
});

/**
 * @route   POST /api/applications
 * @desc    Submit application for role
 * @access  Private (Actor only)
 */
router.post('/', authenticate, authorize('ACTOR'), (req, res) => {
  res.json({ message: 'Submit application endpoint' });
});

export default router;