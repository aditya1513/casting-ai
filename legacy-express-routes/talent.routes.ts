/**
 * Talent Routes
 * API endpoints for talent search, discovery, and management
 */

import { Router } from 'express';
import { TalentController } from '../controllers/talent.controller';
import { validators } from '../validators/talent.validator';
import { 
  authenticate, 
  optionalAuth,
  authorize,
  userRateLimit 
} from '../middleware/auth.unified';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Public endpoints (no authentication required)
 */

// Search talents with filters
router.get(
  '/search',
  rateLimiter, // General rate limiting
  validators.searchTalents,
  optionalAuth, // Optional auth for tracking views
  TalentController.searchTalents
);

// Get featured talents (cached for performance)
router.get(
  '/featured',
  rateLimiter,
  validators.featuredTalents,
  TalentController.getFeaturedTalents
);

// Get search suggestions for autocomplete
router.get(
  '/suggestions',
  rateLimiter,
  validators.suggestions,
  TalentController.getSearchSuggestions
);

// Get talent profile by ID
router.get(
  '/:id',
  rateLimiter,
  validators.talentId,
  optionalAuth, // Optional auth for tracking views
  TalentController.getTalentById
);

// Get similar talents
router.get(
  '/:id/similar',
  rateLimiter,
  validators.talentId,
  TalentController.getSimilarTalents
);

// Get talent availability
router.get(
  '/:id/availability',
  rateLimiter,
  validators.talentId,
  TalentController.getTalentAvailability
);

// Get talent statistics (public aggregated data)
router.get(
  '/:id/stats',
  rateLimiter,
  validators.talentId,
  TalentController.getTalentStats
);

/**
 * Protected endpoints (authentication required)
 */

// Save a search for the authenticated user
router.post(
  '/searches/save',
  authenticate,
  userRateLimit(10, 1), // 10 saves per minute
  validators.saveSearch,
  TalentController.saveSearch
);

// Get user's saved searches
router.get(
  '/searches',
  authenticate,
  TalentController.getSavedSearches
);

// Delete a saved search
router.delete(
  '/searches/:id',
  authenticate,
  validators.talentId,
  TalentController.deleteSavedSearch
);

// Toggle bookmark for a talent
router.post(
  '/:id/bookmark',
  authenticate,
  validators.talentId,
  userRateLimit(30, 1), // 30 bookmarks per minute
  TalentController.toggleBookmark
);

// Get user's bookmarked talents
router.get(
  '/bookmarks',
  authenticate,
  validators.pagination,
  TalentController.getBookmarkedTalents
);

/**
 * Restricted endpoints (specific roles required)
 */

// Export talents data (for casting directors and admins only)
router.get(
  '/export',
  authenticate,
  authorize('CASTING_DIRECTOR', 'ADMIN'),
  userRateLimit(5, 10), // 5 exports per 10 minutes
  validators.exportTalents,
  TalentController.exportTalents
);

export default router;