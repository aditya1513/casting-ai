/**
 * Simple Talent Routes (No Redis/Auth dependencies)
 * Basic routes for talent profile management
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { talentCrudController } from '../controllers/talent-crud.controller';

const router: ExpressRouter = Router();

/**
 * @route   GET /api/talents
 * @desc    Get all talents with pagination (simplified)
 * @access  Public
 */
router.get(
  '/',
  talentCrudController.searchTalents
);

/**
 * @route   GET /api/talents/search
 * @desc    Search talents with filters (simplified)
 * @access  Public  
 */
router.get(
  '/search',
  talentCrudController.searchTalents
);

/**
 * @route   GET /api/talents/:id
 * @desc    Get talent profile by ID (simplified)
 * @access  Public
 */
router.get(
  '/:id',
  talentCrudController.getTalent
);

/**
 * @route   GET /api/talents/:id/stats
 * @desc    Get talent statistics (simplified)
 * @access  Public
 */
router.get(
  '/:id/stats',
  talentCrudController.getTalentStats
);

export default router;