/**
 * Batch Operations Routes
 * High-performance bulk operations endpoints with rate limiting and validation
 */

import { Router } from 'express';
import {
  batchCreateTalents,
  batchCreateMemories,
  batchCreateConversations,
  batchUpdate,
  batchDelete,
  getBatchStats,
} from '../controllers/batch.controller';
import { authenticate } from '../middleware/auth.unified';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

// ==================== MIDDLEWARE ====================

/**
 * Batch operation rate limiter - stricter limits for bulk operations
 */
const batchRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 batch requests per window
  message: {
    error: 'Too many batch requests, please try again later',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin/Producer only middleware for sensitive batch operations
 */
const requireBatchPermissions = (req: any, res: any, next: any) => {
  const userRole = req.user?.role;
  
  if (!['admin', 'producer', 'casting_director'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions for batch operations',
      requiredRoles: ['admin', 'producer', 'casting_director'],
    });
  }
  
  next();
};

/**
 * Batch operation logging middleware
 */
const batchLogger = (operationType: string) => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalSend = res.json;
    
    res.json = function(data: any) {
      const duration = Date.now() - startTime;
      
      logger.info(`Batch operation completed`, {
        operation: operationType,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        duration: `${duration}ms`,
        success: data.success || false,
        recordCount: data.data?.summary?.totalRequested || 0,
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// ==================== ROUTES ====================

/**
 * @route   POST /api/batch/talents
 * @desc    Create multiple talents in bulk
 * @access  Private (Casting Directors, Producers, Admin)
 * @limits  10 requests per 15 minutes, max 100 talents per request
 */
router.post(
  '/talents',
  authenticate,
  requireBatchPermissions,
  batchRateLimiter,
  batchLogger('create_talents'),
  batchCreateTalents
);

/**
 * @route   POST /api/batch/memories
 * @desc    Create multiple memories in bulk
 * @access  Private (Any authenticated user)
 * @limits  10 requests per 15 minutes, max 500 memories per request
 */
router.post(
  '/memories',
  authenticate,
  batchRateLimiter,
  batchLogger('create_memories'),
  batchCreateMemories
);

/**
 * @route   POST /api/batch/conversations
 * @desc    Create multiple conversations with initial messages
 * @access  Private (Any authenticated user)
 * @limits  10 requests per 15 minutes, max 50 conversations per request
 */
router.post(
  '/conversations',
  authenticate,
  batchRateLimiter,
  batchLogger('create_conversations'),
  batchCreateConversations
);

/**
 * @route   PATCH /api/batch/update
 * @desc    Update multiple records across different tables
 * @access  Private (Casting Directors, Producers, Admin)
 * @limits  10 requests per 15 minutes, max 200 updates per request
 */
router.patch(
  '/update',
  authenticate,
  requireBatchPermissions,
  batchRateLimiter,
  batchLogger('batch_update'),
  batchUpdate
);

/**
 * @route   DELETE /api/batch/delete
 * @desc    Delete multiple records (with safety checks)
 * @access  Private (Admin only)
 * @limits  5 requests per 15 minutes, max 100 deletions per request
 */
router.delete(
  '/delete',
  authenticate,
  (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for batch deletions',
      });
    }
    next();
  },
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5, // Even stricter for deletions
    message: 'Too many batch delete requests',
  }),
  batchLogger('batch_delete'),
  batchDelete
);

/**
 * @route   GET /api/batch/stats
 * @desc    Get batch operation statistics and database health
 * @access  Private (Any authenticated user)
 * @limits  Standard rate limits
 */
router.get(
  '/stats',
  authenticate,
  rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 requests per 5 minutes
  }),
  getBatchStats
);

// ==================== BULK SEARCH ROUTES ====================

/**
 * @route   POST /api/batch/search/talents
 * @desc    Bulk search talents with multiple criteria
 * @access  Private (Casting Directors, Producers, Admin)
 */
router.post('/search/talents', authenticate, requireBatchPermissions, async (req, res) => {
  try {
    const { queries, options = {} } = req.body;
    
    if (!Array.isArray(queries) || queries.length === 0 || queries.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queries array (must be 1-20 items)',
      });
    }

    const startTime = Date.now();
    const results = [];

    // Process each search query
    for (const query of queries) {
      try {
        // Build dynamic search query based on criteria
        let sqlQuery = 'SELECT id, email, first_name, last_name, role, profile_picture, bio, created_at FROM users WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (query.role) {
          sqlQuery += ` AND role = $${paramIndex}`;
          params.push(query.role);
          paramIndex++;
        }

        if (query.search) {
          sqlQuery += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
          params.push(`%${query.search}%`);
          paramIndex++;
        }

        if (query.isActive !== undefined) {
          sqlQuery += ` AND is_active = $${paramIndex}`;
          params.push(query.isActive);
          paramIndex++;
        }

        if (query.createdAfter) {
          sqlQuery += ` AND created_at >= $${paramIndex}`;
          params.push(query.createdAfter);
          paramIndex++;
        }

        sqlQuery += ` ORDER BY created_at DESC LIMIT ${query.limit || 50}`;

        const searchResults = await req.dbPool.query(sqlQuery, params);
        
        results.push({
          query: query,
          results: searchResults.rows,
          count: searchResults.rows.length,
        });

      } catch (error) {
        results.push({
          query: query,
          error: error instanceof Error ? error.message : 'Search failed',
          results: [],
          count: 0,
        });
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info('Batch talent search completed', {
      queriesCount: queries.length,
      totalResults: results.reduce((sum, r) => sum + r.count, 0),
      processingTime: `${processingTime}ms`,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: {
        searches: results,
        summary: {
          totalQueries: queries.length,
          totalResults: results.reduce((sum, r) => sum + r.count, 0),
          successfulQueries: results.filter(r => !r.error).length,
          failedQueries: results.filter(r => r.error).length,
        },
        performance: {
          processingTime,
          averageTimePerQuery: Math.round(processingTime / queries.length),
        },
      },
    });

  } catch (error) {
    logger.error('Batch talent search failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Batch search operation failed',
    });
  }
});

/**
 * @route   POST /api/batch/export
 * @desc    Export data in bulk with filtering options
 * @access  Private (Admin, Producers)
 */
router.post('/export', authenticate, requireBatchPermissions, async (req, res) => {
  try {
    const { table, filters = {}, format = 'json', limit = 1000 } = req.body;
    
    if (!['users', 'conversations', 'messages', 'memories'].includes(table)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table name',
      });
    }

    if (limit > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Export limit cannot exceed 5000 records',
      });
    }

    const startTime = Date.now();
    let query = `SELECT * FROM ${table} WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.dateFrom) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const results = await req.dbPool.query(query, params);
    const processingTime = Date.now() - startTime;

    logger.info('Bulk export completed', {
      table,
      recordCount: results.rows.length,
      processingTime: `${processingTime}ms`,
      userId: req.user.id,
    });

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${table}_export_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');

    res.json({
      success: true,
      data: {
        table,
        records: results.rows,
        summary: {
          totalRecords: results.rows.length,
          exportedAt: new Date().toISOString(),
          filters: filters,
        },
        performance: {
          processingTime,
        },
      },
    });

  } catch (error) {
    logger.error('Bulk export failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Bulk export operation failed',
    });
  }
});

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/batch/health
 * @desc    Batch operations health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'batch-operations',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /talents': 'Create talents in bulk',
      'POST /memories': 'Create memories in bulk',
      'POST /conversations': 'Create conversations in bulk',
      'PATCH /update': 'Update multiple records',
      'DELETE /delete': 'Delete multiple records',
      'GET /stats': 'Get operation statistics',
      'POST /search/talents': 'Bulk search talents',
      'POST /export': 'Export data in bulk',
    },
    limits: {
      talents: '100 per request',
      memories: '500 per request',
      conversations: '50 per request',
      updates: '200 per request',
      deletions: '100 per request',
      searches: '20 queries per request',
      exports: '5000 records per request',
    },
    rateLimits: {
      general: '10 requests per 15 minutes',
      deletions: '5 requests per 15 minutes',
      stats: '20 requests per 5 minutes',
    },
  });
});

export default router;