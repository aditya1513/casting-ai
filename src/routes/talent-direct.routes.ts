/**
 * Direct Talent Routes
 * Workaround for Prisma P1010 error
 */

import { Router } from 'express';
import { talentDirectController } from '../controllers/talent-direct.controller';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /api/talents-direct
 * @desc    List all talents (direct SQL)
 * @access  Public
 */
router.get('/', rateLimiter, talentDirectController.listTalents);

/**
 * @route   GET /api/talents-direct/search
 * @desc    Search talents (direct SQL)
 * @access  Public
 */
router.get('/search', rateLimiter, talentDirectController.searchTalents);

/**
 * @route   POST /api/talents-direct/sample
 * @desc    Create sample talent for testing
 * @access  Public (for testing only)
 */
router.post('/sample', rateLimiter, talentDirectController.createSampleTalent);

/**
 * @route   GET /api/talents-direct/:id
 * @desc    Get talent by ID (direct SQL)
 * @access  Public
 */
router.get('/:id', rateLimiter, talentDirectController.getTalentById);

export default router;