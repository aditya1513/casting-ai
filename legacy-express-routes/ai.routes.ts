import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.simple';
import { RecommendationService } from '../services/ai-ml/recommendation.service.simple';
import { vectorDatabaseService } from '../services/ai-ml/vectorDatabase.service';
import { embeddingService } from '../services/ai-ml/embedding.service';
import { securityIntelligenceService } from '../services/ai-ml/securityIntelligence.service';
import { userBehaviorAnalytics } from '../services/ai-ml/userBehaviorAnalytics.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Type guard function to validate and ensure string parameters are valid
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Valid string value
 * @throws Error if value is invalid
 */
const validateString = (value: string | undefined, fieldName: string): string => {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName} parameter: must be a non-empty string`);
  }
  return value;
};

/**
 * Type guard function to validate and parse integer parameters
 * @param value - The value to validate and parse
 * @param fieldName - Name of the field for error messages
 * @param defaultValue - Default value if undefined
 * @returns Valid integer value
 * @throws Error if value is invalid
 */
const validateInteger = (value: string | undefined, fieldName: string, defaultValue?: number): number => {
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName} parameter: must be a valid integer`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName} parameter: must be a valid integer`);
  }
  return parsed;
};

/**
 * Type guard function to validate and parse float parameters
 * @param value - The value to validate and parse
 * @param fieldName - Name of the field for error messages
 * @returns Valid float value
 * @throws Error if value is invalid
 */
const validateFloat = (value: string | undefined, fieldName: string): number => {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName} parameter: must be a valid number`);
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName} parameter: must be a valid number`);
  }
  return parsed;
};

/**
 * Type guard function to validate boolean parameters
 * @param value - The value to validate and parse
 * @param fieldName - Name of the field for error messages
 * @param defaultValue - Default value if undefined
 * @returns Valid boolean value
 */
const validateBoolean = (value: string | undefined, fieldName: string, defaultValue: boolean = false): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName} parameter: must be a valid boolean`);
  }
  return value === 'true';
};

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  next();
};

/**
 * @route   GET /api/ai/recommendations/talent/:roleId
 * @desc    Get talent recommendations for a specific role
 * @access  Private
 */
router.get('/recommendations/talent/:roleId',
  authenticate,
  [
    param('roleId').isUUID().withMessage('Role ID must be a valid UUID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('minScore').optional().isFloat({ min: 0, max: 1 }).withMessage('Min score must be between 0 and 1'),
    query('location').optional().isString().withMessage('Location must be a string'),
    query('skills').optional().isString().withMessage('Skills must be comma-separated string'),
    query('categories').optional().isString().withMessage('Categories must be comma-separated string'),
    query('includeMetrics').optional().isBoolean().withMessage('Include metrics must be boolean')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;
      if (!roleId) {
        res.status(400).json({
          success: false,
          message: 'Role ID is required'
        });
        return;
      }
      const {
        limit,
        minScore,
        location,
        skills,
        categories,
        includeMetrics
      } = req.query;

      // Parse filter parameters with type guards
      const filters: any = {};
      const safeLimit = validateInteger(limit as string | undefined, 'limit', 10);
      const safeIncludeMetrics = validateBoolean(includeMetrics as string | undefined, 'includeMetrics', false);
      
      if (minScore !== undefined) {
        filters.minScore = validateFloat(minScore as string | undefined, 'minScore');
      }
      if (location !== undefined) {
        const safeLocation = validateString(location as string | undefined, 'location');
        filters.location = safeLocation.split(',').map(l => l.trim());
      }
      if (skills !== undefined) {
        const safeSkills = validateString(skills as string | undefined, 'skills');
        filters.skills = safeSkills.split(',').map(s => s.trim());
      }
      if (categories !== undefined) {
        const safeCategories = validateString(categories as string | undefined, 'categories');
        filters.categories = safeCategories.split(',').map(c => c.trim());
      }

      const result = await RecommendationService.getTalentRecommendations(
        roleId,
        safeLimit,
        0 // offset
      );

      res.json({
        success: true,
        data: result,
        message: `Found ${result.recommendations.length} talent recommendations`
      });

    } catch (error) {
      logger.error('Error getting talent recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get talent recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/recommendations/roles/:userId
 * @desc    Get role recommendations for a specific user
 * @access  Private
 */
router.get('/recommendations/roles/:userId',
  authenticate,
  [
    param('userId').isUUID().withMessage('User ID must be a valid UUID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('minScore').optional().isFloat({ min: 0, max: 1 }).withMessage('Min score must be between 0 and 1'),
    query('categories').optional().isString().withMessage('Categories must be comma-separated string'),
    query('budgetMin').optional().isInt({ min: 0 }).withMessage('Budget min must be non-negative integer'),
    query('budgetMax').optional().isInt({ min: 0 }).withMessage('Budget max must be non-negative integer'),
    query('includeMetrics').optional().isBoolean().withMessage('Include metrics must be boolean')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }
      const {
        limit,
        minScore,
        categories,
        budgetMin,
        budgetMax,
        includeMetrics
      } = req.query;

      // Check authorization - users can only get their own recommendations unless admin
      if (!req.user?.id || (req.user.id !== userId && req.user.role !== 'ADMIN')) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to access these recommendations'
        });
        return;
      }

      // Parse filter parameters with type guards
      const filters: any = {};
      const safeLimit = validateInteger(limit as string | undefined, 'limit', 10);
      const safeIncludeMetrics = validateBoolean(includeMetrics as string | undefined, 'includeMetrics', false);
      
      if (minScore !== undefined) {
        filters.minScore = validateFloat(minScore as string | undefined, 'minScore');
      }
      if (categories !== undefined) {
        const safeCategories = validateString(categories as string | undefined, 'categories');
        filters.categories = safeCategories.split(',').map(c => c.trim());
      }
      if (budgetMin !== undefined && budgetMax !== undefined) {
        const safeBudgetMin = validateInteger(budgetMin as string | undefined, 'budgetMin');
        const safeBudgetMax = validateInteger(budgetMax as string | undefined, 'budgetMax');
        filters.budgetRange = {
          min: safeBudgetMin,
          max: safeBudgetMax
        };
      }

      const result = await recommendationService.getRoleRecommendations(userId, {
        limit: safeLimit,
        filters,
        includeMetrics: safeIncludeMetrics
      });

      res.json({
        success: true,
        data: result,
        message: `Found ${result.recommendations.length} role recommendations`
      });

    } catch (error) {
      logger.error('Error getting role recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get role recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/recommendations/content/:userId
 * @desc    Get content recommendations for a user
 * @access  Private
 */
router.get('/recommendations/content/:userId',
  authenticate,
  [
    param('userId').isUUID().withMessage('User ID must be a valid UUID'),
    query('type').optional().isIn(['script', 'project', 'all']).withMessage('Type must be script, project, or all'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('minScore').optional().isFloat({ min: 0, max: 1 }).withMessage('Min score must be between 0 and 1'),
    query('categories').optional().isString().withMessage('Categories must be comma-separated string')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }
      const {
        type,
        limit,
        minScore,
        categories
      } = req.query;

      // Check authorization
      if (!req.user?.id || (req.user.id !== userId && req.user.role !== 'ADMIN')) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to access these recommendations'
        });
        return;
      }

      // Parse parameters with type guards
      const safeType = (type as string | undefined) || 'all';
      const safeLimit = validateInteger(limit as string | undefined, 'limit', 10);
      
      const filters: any = {};
      if (minScore !== undefined) {
        filters.minScore = validateFloat(minScore as string | undefined, 'minScore');
      }
      if (categories !== undefined) {
        const safeCategories = validateString(categories as string | undefined, 'categories');
        filters.categories = safeCategories.split(',').map(c => c.trim());
      }

      const result = await recommendationService.getContentRecommendations(
        userId, 
        safeType as 'script' | 'project' | 'all',
        {
          limit: safeLimit,
          filters,
          includeMetrics: true
        }
      );

      res.json({
        success: true,
        data: result,
        message: `Found ${result.recommendations.length} content recommendations`
      });

    } catch (error) {
      logger.error('Error getting content recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get content recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   POST /api/ai/embeddings/user/:userId
 * @desc    Update user profile embedding
 * @access  Private
 */
router.post('/embeddings/user/:userId',
  authenticate,
  [
    param('userId').isUUID().withMessage('User ID must be a valid UUID')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }

      // Check authorization
      if (!req.user?.id || (req.user.id !== userId && req.user.role !== 'ADMIN')) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to update this user embedding'
        });
        return;
      }

      await recommendationService.updateUserEmbedding(userId);

      res.json({
        success: true,
        message: 'User embedding updated successfully'
      });

    } catch (error) {
      logger.error('Error updating user embedding:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user embedding',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   POST /api/ai/search/profiles
 * @desc    Search similar user profiles
 * @access  Private
 */
router.post('/search/profiles',
  authenticate,
  [
    body('query').notEmpty().withMessage('Query is required'),
    body('topK').optional().isInt({ min: 1, max: 50 }).withMessage('TopK must be between 1 and 50'),
    body('filters').optional().isObject().withMessage('Filters must be an object')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, topK = 10, filters = {} } = req.body;

      const results = await vectorDatabaseService.searchSimilarProfiles(query, {
        topK,
        filter: filters,
        includeMetadata: true
      });

      res.json({
        success: true,
        data: {
          results,
          count: results.length,
          query
        },
        message: `Found ${results.length} similar profiles`
      });

    } catch (error) {
      logger.error('Error searching profiles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search profiles',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   POST /api/ai/search/content
 * @desc    Search content using vector similarity
 * @access  Private
 */
router.post('/search/content',
  authenticate,
  [
    body('query').notEmpty().withMessage('Query is required'),
    body('topK').optional().isInt({ min: 1, max: 50 }).withMessage('TopK must be between 1 and 50'),
    body('contentType').optional().isIn(['role', 'script', 'project']).withMessage('Content type must be role, script, or project'),
    body('filters').optional().isObject().withMessage('Filters must be an object')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, topK = 10, contentType, filters = {} } = req.body;

      const results = await vectorDatabaseService.searchContent(query, {
        topK,
        filter: filters,
        contentType
      });

      res.json({
        success: true,
        data: {
          results,
          count: results.length,
          query,
          contentType
        },
        message: `Found ${results.length} similar content items`
      });

    } catch (error) {
      logger.error('Error searching content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search content',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/analytics/user/:userId
 * @desc    Get user behavior analytics
 * @access  Private
 */
router.get('/analytics/user/:userId',
  authenticate,
  [
    param('userId').isUUID().withMessage('User ID must be a valid UUID'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }
      const { days } = req.query;

      // Check authorization
      if (!req.user?.id || (req.user.id !== userId && req.user.role !== 'ADMIN')) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to access these analytics'
        });
        return;
      }

      // Parse parameters with type guards
      const safeDays = validateInteger(days as string | undefined, 'days', 7);

      // We've already verified req.user.id exists above, so we can safely use it
      const currentUserId = req.user.id;
      
      const journey = await userBehaviorAnalytics.analyzeUserJourney(currentUserId);
      const churnPrediction = await userBehaviorAnalytics.predictChurn(currentUserId);

      res.json({
        success: true,
        data: {
          journey,
          churnPrediction,
          period: `${safeDays} days`
        },
        message: 'User analytics retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/security/risk/:userId
 * @desc    Get user risk assessment
 * @access  Private (Admin only)
 */
router.get('/security/risk/:userId',
  authenticate,
  [
    param('userId').isUUID().withMessage('User ID must be a valid UUID')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can access security risk assessments
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required for security risk assessments'
        });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
        return;
      }
      const riskAssessment = await securityIntelligenceService.assessUserRisk(userId);

      res.json({
        success: true,
        data: riskAssessment,
        message: 'Risk assessment completed'
      });

    } catch (error) {
      logger.error('Error assessing user risk:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assess user risk',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   POST /api/ai/security/profile-check
 * @desc    Check profile for fake indicators
 * @access  Private (Admin only)
 */
router.post('/security/profile-check',
  authenticate,
  [
    body('userId').isUUID().withMessage('User ID must be a valid UUID'),
    body('profileData').isObject().withMessage('Profile data is required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can perform security checks
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required for security profile checks'
        });
        return;
      }

      const { userId, profileData } = req.body;
      const fakeProfileCheck = await securityIntelligenceService.detectFakeProfile(userId, profileData);

      res.json({
        success: true,
        data: fakeProfileCheck,
        message: 'Profile security check completed'
      });

    } catch (error) {
      logger.error('Error checking profile security:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check profile security',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/analytics/engagement
 * @desc    Get platform engagement metrics
 * @access  Private (Admin only)
 */
router.get('/analytics/engagement',
  authenticate,
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can access platform-wide analytics
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required for platform analytics'
        });
        return;
      }

      const { startDate: startDateParam, endDate: endDateParam } = req.query;
      
      // Parse dates with type guards
      const startDate = startDateParam ? new Date(validateString(startDateParam as string | undefined, 'startDate')) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = endDateParam ? new Date(validateString(endDateParam as string | undefined, 'endDate')) : new Date();

      const metrics = await userBehaviorAnalytics.calculateEngagementMetrics(startDate, endDate);

      res.json({
        success: true,
        data: metrics,
        message: 'Engagement metrics retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get engagement metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/analytics/feature/:featureName
 * @desc    Get feature usage analytics
 * @access  Private (Admin only)
 */
router.get('/analytics/feature/:featureName',
  authenticate,
  [
    param('featureName').notEmpty().withMessage('Feature name is required'),
    query('timeRange').optional().isInt({ min: 1, max: 365 }).withMessage('Time range must be between 1 and 365 days')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can access feature analytics
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required for feature analytics'
        });
        return;
      }

      const { featureName } = req.params;
      if (!featureName) {
        res.status(400).json({
          success: false,
          message: 'Feature name is required'
        });
        return;
      }
      const { timeRange } = req.query;

      // Parse parameters with type guards
      const safeTimeRange = validateInteger(timeRange as string | undefined, 'timeRange', 30);

      const analytics = await userBehaviorAnalytics.getFeatureUsageAnalytics(
        featureName,
        safeTimeRange
      );

      res.json({
        success: true,
        data: analytics,
        message: `Feature analytics for ${featureName} retrieved successfully`
      });

    } catch (error) {
      logger.error('Error getting feature analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get feature analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/ai/health
 * @desc    Get AI services health status
 * @access  Private (Admin only)
 */
router.get('/health',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can check AI service health
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required for health checks'
        });
        return;
      }

      const [
        vectorDbHealth,
        embeddingHealth,
        recommendationHealth,
        securityHealth
      ] = await Promise.all([
        vectorDatabaseService.healthCheck(),
        embeddingService.healthCheck(),
        recommendationService.healthCheck(),
        securityIntelligenceService.healthCheck()
      ]);

      const overallStatus = [vectorDbHealth, embeddingHealth, recommendationHealth, securityHealth]
        .every(service => service.status === 'healthy') ? 'healthy' : 'unhealthy';

      res.json({
        success: true,
        data: {
          overall: overallStatus,
          services: {
            vectorDatabase: vectorDbHealth,
            embedding: embeddingHealth,
            recommendation: recommendationHealth,
            security: securityHealth
          }
        },
        message: `AI services are ${overallStatus}`
      });

    } catch (error) {
      logger.error('Error checking AI services health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check AI services health',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   POST /api/ai/embeddings/batch-update
 * @desc    Batch update user embeddings
 * @access  Private (Admin only)
 */
router.post('/embeddings/batch-update',
  authenticate,
  [
    body('userIds').isArray().withMessage('User IDs must be an array'),
    body('userIds.*').isUUID().withMessage('Each user ID must be a valid UUID')
  ],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can perform batch operations
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required for batch operations'
        });
        return;
      }

      const { userIds } = req.body;

      if (userIds.length > 100) {
        res.status(400).json({
          success: false,
          message: 'Maximum 100 users can be updated in one batch'
        });
        return;
      }

      // Start batch update in background
      recommendationService.batchUpdateUserEmbeddings(userIds).catch(error => {
        logger.error('Batch embedding update failed:', error);
      });

      res.json({
        success: true,
        message: `Batch update started for ${userIds.length} users`,
        data: {
          userCount: userIds.length,
          status: 'processing'
        }
      });

    } catch (error) {
      logger.error('Error starting batch embedding update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start batch embedding update',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;