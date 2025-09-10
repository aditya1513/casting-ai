/**
 * Audition Routes
 * Audition scheduling and management
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/auditions
 * @desc    Get user's auditions
 * @access  Private
 */
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Get auditions endpoint' });
});

/**
 * @route   POST /api/auditions
 * @desc    Schedule audition
 * @access  Private (Casting Director)
 */
router.post('/', authenticate, authorize('CASTING_DIRECTOR'), (req, res) => {
  res.json({ message: 'Schedule audition endpoint' });
});

export default router;