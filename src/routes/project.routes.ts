/**
 * Project Routes
 * Casting project management
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/projects
 * @desc    Get all projects
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({ message: 'Get projects endpoint' });
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Public
 */
router.get('/:id', (req, res) => {
  res.json({ message: 'Get project by ID endpoint' });
});

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private (Casting Director/Producer)
 */
router.post('/', authenticate, authorize('CASTING_DIRECTOR', 'PRODUCER'), (req, res) => {
  res.json({ message: 'Create project endpoint' });
});

export default router;