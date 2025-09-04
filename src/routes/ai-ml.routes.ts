/**
 * AI/ML Routes
 * Comprehensive endpoints for all AI-powered features
 * Including semantic search, script analysis, talent matching, and recommendations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

// Services
import { mlEngineService } from '../services/ml-engine.service';
import { scriptAnalysisService, ScriptFormat } from '../services/script-analysis.service';
import { hybridSearchService, SearchMode } from '../services/hybrid-search.service';
import { vectorService } from '../services/vector.service';
import { embeddingService } from '../services/embedding.service';
import { aiMatchingService } from '../services/ai-matching.service';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimetypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    
    if (allowedMimetypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

const router = Router();

/**
 * @route   POST /api/ai/search
 * @desc    Hybrid search for talents
 * @access  Public
 */
router.post(
  '/search',
  [
    body('query').notEmpty().withMessage('Search query is required'),
    body('mode').optional().isIn(['semantic', 'keyword', 'hybrid', 'smart']),
    body('filters').optional().isObject(),
    body('limit').optional().isInt({ min: 1, max: 100 }),
    body('offset').optional().isInt({ min: 0 }),
  ],
  rateLimiter({ windowMs: 60000, max: 30 }), // 30 searches per minute
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const {
      query,
      mode = 'smart',
      filters = {},
      limit = 20,
      offset = 0,
      options = {},
    } = req.body;

    const results = await hybridSearchService.search(
      query,
      filters,
      {
        mode: mode as SearchMode,
        limit,
        offset,
        ...options,
      }
    );

    res.json({
      success: true,
      data: results,
      meta: {
        query,
        mode,
        total: results.total,
        processingTime: results.processingTime,
      },
    });
  })
);

/**
 * @route   POST /api/ai/match-talents
 * @desc    AI-powered talent matching for a role
 * @access  Protected
 */
router.post(
  '/match-talents',
  authenticate,
  [
    body('roleDescription').notEmpty().withMessage('Role description is required'),
    body('requirements').optional().isArray(),
    body('preferences').optional().isArray(),
    body('filters').optional().isObject(),
    body('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const {
      roleDescription,
      requirements = [],
      preferences = [],
      filters = {},
      weights,
      limit = 20,
      offset = 0,
    } = req.body;

    const matchResults = await aiMatchingService.findMatchingTalents({
      query: roleDescription,
      roleDescription,
      requirements,
      preferences,
      filters,
      weights,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: matchResults.results,
      meta: {
        total: matchResults.total,
        processingTime: matchResults.processingTime,
        filters,
      },
    });
  })
);

/**
 * @route   POST /api/ai/analyze-script
 * @desc    Analyze script and extract casting requirements
 * @access  Protected
 */
router.post(
  '/analyze-script',
  authenticate,
  upload.single('script'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('Script file is required', 400);
    }

    const format = req.body.format || this.detectFormat(req.file.originalname);
    const options = {
      extractCharacters: req.body.extractCharacters !== 'false',
      extractScenes: req.body.extractScenes !== 'false',
      generateCastingReqs: req.body.generateCastingReqs !== 'false',
      analyzeSentiment: req.body.analyzeSentiment !== 'false',
    };

    const analysis = await scriptAnalysisService.analyzeScript(
      req.file.buffer,
      format as ScriptFormat,
      options
    );

    res.json({
      success: true,
      data: analysis,
      meta: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        format,
      },
    });
  })
);

/**
 * @route   POST /api/ai/score-talent
 * @desc    Score a talent for a specific role
 * @access  Protected
 */
router.post(
  '/score-talent',
  authenticate,
  [
    body('talentId').notEmpty().withMessage('Talent ID is required'),
    body('roleRequirements').notEmpty().isObject(),
    body('options').optional().isObject(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const { talentId, roleRequirements, options = {} } = req.body;

    // Get talent data
    const talent = await prisma.talent.findUnique({
      where: { id: talentId },
      include: {
        skills: true,
        media: true,
        reviews: true,
      },
    });

    if (!talent) {
      throw new AppError('Talent not found', 404);
    }

    // Convert to ML format
    const talentFeatures = {
      skills: talent.skills.map((s: any) => s.name),
      experience: talent.yearsOfExperience || 0,
      rating: talent.rating || 0,
      completedProjects: talent.completedProjects || 0,
      languages: talent.languages || [],
      location: talent.location || '',
      availability: talent.availability || 'unavailable',
      demographics: {
        age: talent.age,
        gender: talent.gender,
      },
    };

    const score = await mlEngineService.scoreTalent(
      talentFeatures,
      roleRequirements,
      options
    );

    res.json({
      success: true,
      data: {
        talentId,
        ...score,
      },
    });
  })
);

/**
 * @route   GET /api/ai/similar-talents/:talentId
 * @desc    Find similar talents
 * @access  Public
 */
router.get(
  '/similar-talents/:talentId',
  [
    param('talentId').notEmpty().withMessage('Talent ID is required'),
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  rateLimiter({ windowMs: 60000, max: 20 }),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const { talentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const similarTalents = await aiMatchingService.findSimilarTalents(
      talentId,
      { limit, includeOriginal: false }
    );

    res.json({
      success: true,
      data: similarTalents,
      meta: {
        originalTalent: talentId,
        count: similarTalents.length,
      },
    });
  })
);

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get personalized talent recommendations
 * @access  Protected
 */
router.get(
  '/recommendations',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = (req as any).user.id;

    const recommendations = await mlEngineService.getPersonalizedRecommendations(
      userId,
      limit
    );

    res.json({
      success: true,
      data: recommendations,
      meta: {
        userId,
        count: recommendations.length,
      },
    });
  })
);

/**
 * @route   POST /api/ai/diversity-analysis
 * @desc    Analyze diversity metrics for talent selection
 * @access  Protected
 */
router.post(
  '/diversity-analysis',
  authenticate,
  [
    body('talentIds').isArray().withMessage('Talent IDs array is required'),
    body('talentIds.*').notEmpty().withMessage('Invalid talent ID'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const { talentIds } = req.body;

    // Get talent data
    const talents = await prisma.talent.findMany({
      where: { id: { in: talentIds } },
      include: { skills: true },
    });

    // Convert to ML format
    const talentFeatures = talents.map((talent: any) => ({
      skills: talent.skills.map((s: any) => s.name),
      experience: talent.yearsOfExperience || 0,
      rating: talent.rating || 0,
      completedProjects: talent.completedProjects || 0,
      languages: talent.languages || [],
      location: talent.location || '',
      availability: talent.availability || 'unavailable',
      demographics: {
        age: talent.age,
        gender: talent.gender,
        ethnicity: talent.ethnicity,
      },
    }));

    const metrics = await mlEngineService.calculateDiversityMetrics(talentFeatures);

    res.json({
      success: true,
      data: metrics,
      meta: {
        talentCount: talentIds.length,
      },
    });
  })
);

/**
 * @route   POST /api/ai/embeddings/generate
 * @desc    Generate embeddings for text
 * @access  Protected (Admin only)
 */
router.post(
  '/embeddings/generate',
  authenticate,
  [
    body('text').notEmpty().withMessage('Text is required'),
    body('model').optional().isString(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const { text, model } = req.body;

    const embedding = await embeddingService.generateEmbedding(text, { model });

    res.json({
      success: true,
      data: {
        embedding: embedding.slice(0, 10), // Return only first 10 dimensions for preview
        dimension: embedding.length,
        model: model || 'text-embedding-ada-002',
      },
    });
  })
);

/**
 * @route   POST /api/ai/index/talent
 * @desc    Index or re-index a talent for search
 * @access  Protected
 */
router.post(
  '/index/talent/:talentId',
  authenticate,
  [
    param('talentId').notEmpty().withMessage('Talent ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation error', 400, errors.array());
    }

    const { talentId } = req.params;

    // Get talent data
    const talent = await prisma.talent.findUnique({
      where: { id: talentId },
      include: { skills: true, user: true },
    });

    if (!talent) {
      throw new AppError('Talent not found', 404);
    }

    // Generate profile text
    const profileData = {
      id: talent.id,
      displayName: talent.displayName,
      bio: talent.bio,
      skills: talent.skills.map((s: any) => s.name),
      languages: talent.languages,
      experience: talent.experience,
      location: talent.location,
      yearsOfExperience: talent.yearsOfExperience,
      rating: talent.rating,
    };

    // Generate embedding
    const embedding = await embeddingService.generateTalentEmbedding(profileData);

    // Store in vector database
    await vectorService.upsertTalentEmbedding(
      talent.id,
      embedding,
      {
        talentId: talent.id,
        userId: talent.userId,
        displayName: talent.displayName,
        gender: talent.gender,
        location: talent.location,
        languages: talent.languages,
        skills: talent.skills.map((s: any) => s.name),
        experienceLevel: talent.experienceLevel,
        rating: talent.rating,
        yearsOfExperience: talent.yearsOfExperience,
        availability: talent.availability,
        lastActive: talent.updatedAt.toISOString(),
        verified: talent.verified,
      }
    );

    // Index for keyword search
    await hybridSearchService.indexContent({
      id: talent.id,
      type: 'talent',
      text: embeddingService.buildTalentProfileText(profileData),
      metadata: profileData,
    });

    res.json({
      success: true,
      message: 'Talent indexed successfully',
      data: { talentId },
    });
  })
);

/**
 * @route   POST /api/ai/batch-index
 * @desc    Batch index multiple talents
 * @access  Protected (Admin only)
 */
router.post(
  '/batch-index',
  authenticate,
  [
    body('talentIds').optional().isArray(),
    body('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const { talentIds, limit = 50 } = req.body;

    // Get talents to index
    const whereClause = talentIds ? { id: { in: talentIds } } : {};
    const talents = await prisma.talent.findMany({
      where: whereClause,
      include: { skills: true, user: true },
      take: limit,
    });

    let processed = 0;
    const errors: any[] = [];

    for (const talent of talents) {
      try {
        // Generate profile data
        const profileData = {
          id: talent.id,
          displayName: talent.displayName,
          bio: talent.bio,
          skills: talent.skills.map((s: any) => s.name),
          languages: talent.languages,
          experience: talent.experience,
          location: talent.location,
          yearsOfExperience: talent.yearsOfExperience,
          rating: talent.rating,
        };

        // Generate embedding
        const embedding = await embeddingService.generateTalentEmbedding(profileData);

        // Store in vector database
        await vectorService.upsertTalentEmbedding(
          talent.id,
          embedding,
          {
            talentId: talent.id,
            userId: talent.userId,
            displayName: talent.displayName,
            gender: talent.gender,
            location: talent.location,
            languages: talent.languages,
            skills: talent.skills.map((s: any) => s.name),
            experienceLevel: talent.experienceLevel,
            rating: talent.rating,
            yearsOfExperience: talent.yearsOfExperience,
            availability: talent.availability,
            lastActive: talent.updatedAt.toISOString(),
            verified: talent.verified,
          }
        );

        processed++;
      } catch (error) {
        errors.push({ talentId: talent.id, error: (error as Error).message });
        logger.error(`Failed to index talent ${talent.id}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        processed,
        failed: errors.length,
        errors: errors.slice(0, 10), // Return first 10 errors
      },
    });
  })
);

/**
 * @route   GET /api/ai/stats
 * @desc    Get AI/ML system statistics
 * @access  Protected (Admin only)
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await vectorService.getIndexStats();

    res.json({
      success: true,
      data: {
        vector: stats,
        models: {
          embedding: embeddingService.getModelInfo(
            embeddingService.constructor.prototype.defaultModel
          ),
        },
      },
    });
  })
);

/**
 * Helper function to detect script format
 */
function detectFormat(filename: string): ScriptFormat {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return ScriptFormat.PDF;
    case 'docx':
      return ScriptFormat.DOCX;
    case 'txt':
      return ScriptFormat.PLAIN_TEXT;
    case 'fountain':
      return ScriptFormat.FOUNTAIN;
    default:
      return ScriptFormat.PLAIN_TEXT;
  }
}

// Error handling middleware
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      });
    }
  }
  
  next(error);
});

export default router;