/**
 * Talent CRUD Routes
 * Comprehensive routes for talent profile management
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { talentCrudController } from '../controllers/talent-crud.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  createTalentSchema,
  updateTalentSchema,
  searchTalentsSchema,
  getTalentByIdSchema,
  deleteTalentSchema,
} from '../validators/talent-crud.validator';

const router: ExpressRouter = Router();

/**
 * @route   GET /api/talents
 * @desc    Get all talents with pagination
 * @access  Public
 */
router.get(
  '/',
  rateLimiter,
  talentCrudController.searchTalents
);

/**
 * @route   GET /api/talents/search
 * @desc    Search talents with filters
 * @access  Public
 */
router.get(
  '/search',
  rateLimiter,
  validate(searchTalentsSchema),
  talentCrudController.searchTalents
);

/**
 * @route   GET /api/talents/me
 * @desc    Get current user's talent profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  talentCrudController.getMyTalentProfile
);

/**
 * @route   POST /api/talents
 * @desc    Create new talent profile
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createTalentSchema),
  talentCrudController.createTalent
);

/**
 * @route   GET /api/talents/:id
 * @desc    Get talent profile by ID
 * @access  Public
 */
router.get(
  '/:id',
  validate(getTalentByIdSchema),
  talentCrudController.getTalent
);

/**
 * @route   PUT /api/talents/:id
 * @desc    Update talent profile
 * @access  Private (owner only)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateTalentSchema),
  talentCrudController.updateTalent
);

/**
 * @route   DELETE /api/talents/:id
 * @desc    Delete talent profile (soft delete)
 * @access  Private (owner only)
 */
router.delete(
  '/:id',
  authenticate,
  validate(deleteTalentSchema),
  talentCrudController.deleteTalent
);

/**
 * @route   GET /api/talents/:id/stats
 * @desc    Get talent statistics
 * @access  Public
 */
router.get(
  '/:id/stats',
  validate(getTalentByIdSchema),
  talentCrudController.getTalentStats
);

export default router;