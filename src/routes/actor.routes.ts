/**
 * Actor Routes
 * Actor profile and portfolio management
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/actors
 * @desc    Get all actors (with filters)
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({ message: 'Get actors endpoint' });
});

/**
 * @route   GET /api/actors/:id
 * @desc    Get actor by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  res.json({ message: 'Get actor by ID endpoint' });
});

/**
 * @route   PUT /api/actors/profile
 * @desc    Update actor profile
 * @access  Private (Actor only)
 */
router.put('/profile', authenticate, authorize('ACTOR'), (req, res) => {
  res.json({ message: 'Update actor profile endpoint' });
});

export default router;