/**
 * Memory System Routes
 * Comprehensive API endpoints for managing the advanced memory architecture
 * Supports episodic, semantic, procedural memory and consolidation operations
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { clerkAuth } from '../middleware/clerk-auth';
import { asyncHandler } from '../utils/asyncHandler';
import { memoryRateLimiter } from '../middleware/memoryRateLimiter';
import * as memoryController from '../controllers/memory.controller';

const router = Router();

// Apply authentication to all memory routes
router.use(clerkAuth);

// ==================== VALIDATION MIDDLEWARE ====================

const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

// ==================== EPISODIC MEMORY ROUTES ====================

/**
 * @route   POST /api/memory/episodic
 * @desc    Store a new episodic memory
 * @access  Protected
 */
router.post(
  '/episodic',
  memoryRateLimiter.store,
  [
    body('userInput').notEmpty().withMessage('User input is required'),
    body('aiResponse').notEmpty().withMessage('AI response is required'),
    body('context').optional().isObject(),
    body('sentiment').optional().isIn(['positive', 'negative', 'neutral']),
    body('topics').optional().isArray(),
    body('entities').optional().isArray(),
    body('importance').optional().isFloat({ min: 0, max: 1 }),
    body('ttl').optional().isInt({ min: 60 }),
  ],
  validateRequest,
  asyncHandler(memoryController.storeEpisodicMemory)
);

/**
 * @route   GET /api/memory/episodic
 * @desc    Query episodic memories
 * @access  Protected
 */
router.get(
  '/episodic',
  memoryRateLimiter.query,
  [
    query('sessionId').optional().isString(),
    query('startTime').optional().isISO8601(),
    query('endTime').optional().isISO8601(),
    query('topics').optional().isString(),
    query('minImportance').optional().isFloat({ min: 0, max: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  asyncHandler(memoryController.queryEpisodicMemories)
);

/**
 * @route   GET /api/memory/episodic/context
 * @desc    Get recent context from episodic memory
 * @access  Protected
 */
router.get(
  '/episodic/context',
  memoryRateLimiter.query,
  [
    query('sessionId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  asyncHandler(memoryController.getEpisodicContext)
);

/**
 * @route   DELETE /api/memory/episodic/session/:sessionId
 * @desc    Clear memories for a specific session
 * @access  Protected
 */
router.delete(
  '/episodic/session/:sessionId',
  memoryRateLimiter.delete,
  [
    param('sessionId').notEmpty().withMessage('Session ID is required'),
  ],
  validateRequest,
  asyncHandler(memoryController.clearSessionMemories)
);

// ==================== SEMANTIC MEMORY ROUTES ====================

/**
 * @route   POST /api/memory/semantic/entity
 * @desc    Store a semantic entity
 * @access  Protected
 */
router.post(
  '/semantic/entity',
  memoryRateLimiter.store,
  [
    body('type').isIn(['person', 'project', 'skill', 'preference', 'concept']).withMessage('Valid entity type required'),
    body('name').notEmpty().withMessage('Entity name is required'),
    body('description').optional().isString(),
    body('attributes').optional().isObject(),
    body('embedding').optional().isArray(),
    body('confidence').optional().isFloat({ min: 0, max: 1 }),
  ],
  validateRequest,
  asyncHandler(memoryController.storeSemanticEntity)
);

/**
 * @route   POST /api/memory/semantic/relation
 * @desc    Create a semantic relation between entities
 * @access  Protected
 */
router.post(
  '/semantic/relation',
  memoryRateLimiter.store,
  [
    body('sourceId').notEmpty().withMessage('Source entity ID is required'),
    body('targetId').notEmpty().withMessage('Target entity ID is required'),
    body('relationType').notEmpty().withMessage('Relation type is required'),
    body('strength').optional().isFloat({ min: 0, max: 1 }),
    body('metadata').optional().isObject(),
  ],
  validateRequest,
  asyncHandler(memoryController.createSemanticRelation)
);

/**
 * @route   GET /api/memory/semantic/graph
 * @desc    Get the user's knowledge graph
 * @access  Protected
 */
router.get(
  '/semantic/graph',
  memoryRateLimiter.query,
  [
    query('entityTypes').optional().isString(),
    query('minConfidence').optional().isFloat({ min: 0, max: 1 }),
  ],
  validateRequest,
  asyncHandler(memoryController.getKnowledgeGraph)
);

/**
 * @route   GET /api/memory/semantic/entities
 * @desc    Query semantic entities
 * @access  Protected
 */
router.get(
  '/semantic/entities',
  memoryRateLimiter.query,
  [
    query('type').optional().isIn(['person', 'project', 'skill', 'preference', 'concept']),
    query('namePattern').optional().isString(),
    query('attributes').optional().isJSON(),
    query('minConfidence').optional().isFloat({ min: 0, max: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validateRequest,
  asyncHandler(memoryController.querySemanticEntities)
);

/**
 * @route   GET /api/memory/semantic/related/:entityId
 * @desc    Find entities related to a specific entity
 * @access  Protected
 */
router.get(
  '/semantic/related/:entityId',
  memoryRateLimiter.query,
  [
    param('entityId').notEmpty().withMessage('Entity ID is required'),
    query('depth').optional().isInt({ min: 1, max: 5 }),
    query('relationTypes').optional().isString(),
  ],
  validateRequest,
  asyncHandler(memoryController.findRelatedEntities)
);

// ==================== PROCEDURAL MEMORY ROUTES ====================

/**
 * @route   POST /api/memory/procedural/pattern
 * @desc    Store a procedural pattern
 * @access  Protected
 */
router.post(
  '/procedural/pattern',
  memoryRateLimiter.store,
  [
    body('patternType').isIn(['workflow', 'preference', 'behavior', 'response_template']).withMessage('Valid pattern type required'),
    body('name').notEmpty().withMessage('Pattern name is required'),
    body('description').notEmpty().withMessage('Pattern description is required'),
    body('trigger').isObject().withMessage('Trigger configuration is required'),
    body('trigger.conditions').isArray().withMessage('Trigger conditions are required'),
    body('trigger.confidence').isFloat({ min: 0, max: 1 }).withMessage('Trigger confidence is required'),
    body('action').isObject().withMessage('Action configuration is required'),
    body('action.type').isIn(['response', 'workflow', 'api_call', 'memory_update']).withMessage('Valid action type required'),
    body('context').isObject().withMessage('Context configuration is required'),
    body('context.domain').notEmpty().withMessage('Context domain is required'),
    body('context.tags').isArray().withMessage('Context tags are required'),
    body('confidence').optional().isFloat({ min: 0, max: 1 }),
  ],
  validateRequest,
  asyncHandler(memoryController.storeProceduralPattern)
);

/**
 * @route   POST /api/memory/procedural/execute
 * @desc    Execute a workflow pattern
 * @access  Protected
 */
router.post(
  '/procedural/execute',
  memoryRateLimiter.execute,
  [
    body('patternId').notEmpty().withMessage('Pattern ID is required'),
    body('input').isObject().withMessage('Input parameters are required'),
  ],
  validateRequest,
  asyncHandler(memoryController.executeWorkflow)
);

/**
 * @route   POST /api/memory/procedural/match
 * @desc    Match patterns against context
 * @access  Protected
 */
router.post(
  '/procedural/match',
  memoryRateLimiter.query,
  [
    body('context').isObject().withMessage('Context is required'),
  ],
  validateRequest,
  asyncHandler(memoryController.matchPatterns)
);

/**
 * @route   GET /api/memory/procedural/pattern/:patternId/performance
 * @desc    Get performance metrics for a pattern
 * @access  Protected
 */
router.get(
  '/procedural/pattern/:patternId/performance',
  memoryRateLimiter.query,
  [
    param('patternId').notEmpty().withMessage('Pattern ID is required'),
  ],
  validateRequest,
  asyncHandler(memoryController.getPatternPerformance)
);

/**
 * @route   POST /api/memory/procedural/pattern/:patternId/feedback
 * @desc    Submit feedback for a pattern execution
 * @access  Protected
 */
router.post(
  '/procedural/pattern/:patternId/feedback',
  memoryRateLimiter.store,
  [
    param('patternId').notEmpty().withMessage('Pattern ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString(),
  ],
  validateRequest,
  asyncHandler(memoryController.updatePatternFeedback)
);

// ==================== CONSOLIDATION ROUTES ====================

/**
 * @route   POST /api/memory/consolidate
 * @desc    Trigger memory consolidation process
 * @access  Protected
 */
router.post(
  '/consolidate',
  memoryRateLimiter.consolidate,
  [
    body('includeEpisodic').optional().isBoolean(),
    body('includeSemantic').optional().isBoolean(),
    body('includeProcedural').optional().isBoolean(),
    body('minImportance').optional().isFloat({ min: 0, max: 1 }),
    body('maxAge').optional().isInt({ min: 3600000 }), // Minimum 1 hour
  ],
  validateRequest,
  asyncHandler(memoryController.consolidateMemories)
);

/**
 * @route   GET /api/memory/stats
 * @desc    Get memory statistics
 * @access  Protected
 */
router.get(
  '/stats',
  memoryRateLimiter.query,
  asyncHandler(memoryController.getMemoryStatistics)
);

/**
 * @route   GET /api/memory/analyze
 * @desc    Analyze memory patterns
 * @access  Protected
 */
router.get(
  '/analyze',
  memoryRateLimiter.query,
  [
    query('timeframe').optional().isIn(['1d', '7d', '30d', '90d']),
  ],
  validateRequest,
  asyncHandler(memoryController.analyzeMemoryPatterns)
);

/**
 * @route   GET /api/memory/export
 * @desc    Export user memories
 * @access  Protected
 */
router.get(
  '/export',
  memoryRateLimiter.export,
  [
    query('format').optional().isIn(['json', 'csv', 'pdf']),
    query('includeTypes').optional().isString(),
  ],
  validateRequest,
  asyncHandler(memoryController.exportMemories)
);

/**
 * @route   POST /api/memory/import
 * @desc    Import memories
 * @access  Protected
 */
router.post(
  '/import',
  memoryRateLimiter.import,
  [
    body('data').notEmpty().withMessage('Import data is required'),
    body('format').optional().isIn(['json', 'csv']),
    body('merge').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(memoryController.importMemories)
);

/**
 * @route   DELETE /api/memory/all
 * @desc    Clear all user memories (requires confirmation)
 * @access  Protected
 */
router.delete(
  '/all',
  memoryRateLimiter.delete,
  [
    body('confirm').isBoolean().equals('true').withMessage('Confirmation required'),
    body('types').optional().isArray(),
  ],
  validateRequest,
  asyncHandler(memoryController.clearAllMemories)
);

// ==================== LEGACY COMPATIBILITY ROUTES ====================
// These routes maintain backward compatibility with the old memory service

/**
 * @route   POST /api/memory
 * @desc    Store a memory (legacy compatibility)
 * @access  Protected
 */
router.post(
  '/',
  memoryRateLimiter.store,
  [
    body('key').notEmpty().withMessage('Memory key is required'),
    body('value').notEmpty().withMessage('Memory value is required'),
    body('type').optional().isIn(['short_term', 'long_term', 'episodic', 'semantic']),
    body('category').optional().isString(),
    body('importance').optional().isFloat({ min: 0, max: 10 }),
    body('conversationId').optional().isString(),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    // Map legacy format to new episodic memory
    req.body.userInput = req.body.key;
    req.body.aiResponse = req.body.value;
    req.body.importance = req.body.importance ? req.body.importance / 10 : 0.5;
    return memoryController.storeEpisodicMemory(req, res, () => {});
  })
);

/**
 * @route   GET /api/memory/:key
 * @desc    Retrieve a specific memory by key (legacy compatibility)
 * @access  Protected
 */
router.get(
  '/:key',
  memoryRateLimiter.query,
  [
    param('key').notEmpty().withMessage('Memory key is required'),
  ],
  validateRequest,
  asyncHandler(async (req: any, res: any) => {
    // Map to episodic memory query
    req.query.limit = '1';
    const memories = await memoryController.queryEpisodicMemories(req, res, () => {});
    if (memories && memories.length > 0) {
      res.json({
        success: true,
        data: memories[0],
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Memory not found',
      });
    }
  })
);

export default router;