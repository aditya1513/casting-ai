/**
 * Memory System Controller
 * Comprehensive controller for managing all memory operations in CastMatch
 * Integrates episodic, semantic, procedural, and consolidation services
 */

import { Request, Response, NextFunction } from 'express';
import { 
  memorySystem
} from '../services/memory/index';
import type { 
  EpisodicMemory,
  EpisodicMemoryQuery,
  SemanticEntity,
  SemanticRelation,
  ProceduralPattern,
  WorkflowExecution
} from '../services/memory/index';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getSocketServer } from '../websocket/socketServer';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    email: string;
    role: string;
    sessionId?: string;
  };
}

/**
 * Helper to get userId from request
 */
const getUserId = (req: AuthRequest): string => {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) throw new AppError('User not authenticated', 401);
  return userId;
};

/**
 * Helper to emit WebSocket events for memory updates
 */
const emitMemoryUpdate = (userId: string, event: string, data: any) => {
  try {
    const wsServer = getSocketServer();
    if (wsServer) {
      wsServer.emitToUser(userId, event, data);
    }
  } catch (error) {
    logger.warn('Failed to emit WebSocket event:', error);
  }
};

// ==================== EPISODIC MEMORY CONTROLLERS ====================

/**
 * Store episodic memory
 * @route POST /api/memory/episodic
 */
export const storeEpisodicMemory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const sessionId = req.user?.sessionId || req.body.sessionId || 'default';
    
    const memory: Omit<EpisodicMemory, 'id'> = {
      userId,
      sessionId,
      timestamp: new Date(),
      interaction: {
        userInput: req.body.userInput,
        aiResponse: req.body.aiResponse,
        context: req.body.context,
      },
      metadata: {
        sentiment: req.body.sentiment,
        topics: req.body.topics || [],
        entities: req.body.entities || [],
        importance: req.body.importance || 0.5,
      },
      ttl: req.body.ttl,
    };

    const storedMemory = await memorySystem.episodic.store(memory);
    
    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:episodic:stored', storedMemory);
    
    logger.info(`Episodic memory stored for user ${userId}`, { memoryId: storedMemory.id });

    res.status(201).json({
      success: true,
      data: storedMemory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Query episodic memories
 * @route GET /api/memory/episodic
 */
export const queryEpisodicMemories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    
    const query: EpisodicMemoryQuery = {
      userId,
      sessionId: req.query.sessionId as string,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      topics: req.query.topics ? (req.query.topics as string).split(',') : undefined,
      minImportance: req.query.minImportance ? parseFloat(req.query.minImportance as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const memories = await memorySystem.episodic.query(query);

    res.json({
      success: true,
      data: memories,
      meta: {
        count: memories.length,
        query,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent context from episodic memory
 * @route GET /api/memory/episodic/context
 */
export const getEpisodicContext = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const sessionId = req.query.sessionId as string || req.user?.sessionId || 'default';
    const limit = parseInt(req.query.limit as string) || 10;

    const context = await memorySystem.episodic.getRecentContext(userId, sessionId, limit);

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear session memories
 * @route DELETE /api/memory/episodic/session/:sessionId
 */
export const clearSessionMemories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    await memorySystem.episodic.clearSession(userId, sessionId);
    
    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:episodic:cleared', { sessionId });

    logger.info(`Session memories cleared for user ${userId}, session ${sessionId}`);

    res.json({
      success: true,
      message: 'Session memories cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SEMANTIC MEMORY CONTROLLERS ====================

/**
 * Store semantic entity
 * @route POST /api/memory/semantic/entity
 */
export const storeSemanticEntity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    
    const entity = await memorySystem.semantic.storeEntity(userId, {
      type: req.body.type,
      name: req.body.name,
      description: req.body.description,
      attributes: req.body.attributes || {},
      embedding: req.body.embedding,
      confidence: req.body.confidence || 0.8,
    });

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:semantic:entity:stored', entity);

    logger.info(`Semantic entity stored for user ${userId}`, { entityId: entity.id });

    res.status(201).json({
      success: true,
      data: entity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create semantic relation
 * @route POST /api/memory/semantic/relation
 */
export const createSemanticRelation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    
    const relation = await memorySystem.semantic.createRelation(userId, {
      sourceId: req.body.sourceId,
      targetId: req.body.targetId,
      relationType: req.body.relationType,
      strength: req.body.strength || 0.5,
      metadata: req.body.metadata,
    });

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:semantic:relation:created', relation);

    logger.info(`Semantic relation created for user ${userId}`, { relationId: relation.id });

    res.status(201).json({
      success: true,
      data: relation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get knowledge graph
 * @route GET /api/memory/semantic/graph
 */
export const getKnowledgeGraph = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const entityTypes = req.query.entityTypes ? 
      (req.query.entityTypes as string).split(',') as any[] : undefined;
    const minConfidence = req.query.minConfidence ? 
      parseFloat(req.query.minConfidence as string) : undefined;

    const graph = await memorySystem.semantic.getKnowledgeGraph(userId, {
      entityTypes,
      minConfidence,
    });

    res.json({
      success: true,
      data: {
        entities: Array.from(graph.entities.values()),
        relations: Array.from(graph.relations.values()),
        userId: graph.userId,
      },
      meta: {
        entityCount: graph.entities.size,
        relationCount: graph.relations.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Query entities
 * @route GET /api/memory/semantic/entities
 */
export const querySemanticEntities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    
    const entities = await memorySystem.semantic.queryEntities(userId, {
      type: req.query.type as any,
      namePattern: req.query.namePattern as string,
      attributes: req.query.attributes ? JSON.parse(req.query.attributes as string) : undefined,
      minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    });

    res.json({
      success: true,
      data: entities,
      meta: {
        count: entities.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find related entities
 * @route GET /api/memory/semantic/related/:entityId
 */
export const findRelatedEntities = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { entityId } = req.params;
    const depth = parseInt(req.query.depth as string) || 1;
    const relationTypes = req.query.relationTypes ? 
      (req.query.relationTypes as string).split(',') : undefined;

    const related = await memorySystem.semantic.findRelatedEntities(
      userId,
      entityId,
      depth,
      relationTypes
    );

    res.json({
      success: true,
      data: related,
      meta: {
        sourceEntityId: entityId,
        depth,
        count: related.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== PROCEDURAL MEMORY CONTROLLERS ====================

/**
 * Store procedural pattern
 * @route POST /api/memory/procedural/pattern
 */
export const storeProceduralPattern = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    
    const pattern: Omit<ProceduralPattern, 'id'> = {
      userId,
      patternType: req.body.patternType,
      name: req.body.name,
      description: req.body.description,
      trigger: req.body.trigger,
      action: req.body.action,
      context: req.body.context,
      performance: {
        executionCount: 0,
        successRate: 1.0,
        averageExecutionTime: 0,
        feedback: [],
      },
      learningMetadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        isActive: true,
        confidence: req.body.confidence || 0.7,
      },
    };

    const storedPattern = await memorySystem.procedural.storePattern(pattern);

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:procedural:pattern:stored', storedPattern);

    logger.info(`Procedural pattern stored for user ${userId}`, { patternId: storedPattern.id });

    res.status(201).json({
      success: true,
      data: storedPattern,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute workflow
 * @route POST /api/memory/procedural/execute
 */
export const executeWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { patternId, input } = req.body;

    const execution = await memorySystem.procedural.executeWorkflow(
      userId,
      patternId,
      input
    );

    // Emit WebSocket event for workflow start
    emitMemoryUpdate(userId, 'memory:procedural:workflow:started', execution);

    // Monitor workflow execution
    const monitorExecution = async () => {
      let status = execution.status;
      while (status === 'running') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updated = await memorySystem.procedural.getWorkflowExecution(execution.id);
        if (updated && updated.status !== status) {
          status = updated.status;
          emitMemoryUpdate(userId, 'memory:procedural:workflow:updated', updated);
        }
      }
    };

    // Start monitoring in background
    monitorExecution().catch(err => 
      logger.error('Error monitoring workflow execution:', err)
    );

    res.status(202).json({
      success: true,
      data: execution,
      message: 'Workflow execution started',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Match patterns
 * @route POST /api/memory/procedural/match
 */
export const matchPatterns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { context } = req.body;

    const patterns = await memorySystem.procedural.matchPatterns(userId, context);

    res.json({
      success: true,
      data: patterns,
      meta: {
        count: patterns.length,
        context,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pattern performance
 * @route GET /api/memory/procedural/pattern/:patternId/performance
 */
export const getPatternPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { patternId } = req.params;

    const pattern = await memorySystem.procedural.getPattern(userId, patternId);
    
    if (!pattern) {
      throw new AppError('Pattern not found', 404);
    }

    res.json({
      success: true,
      data: pattern.performance,
      meta: {
        patternId,
        patternName: pattern.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pattern feedback
 * @route POST /api/memory/procedural/pattern/:patternId/feedback
 */
export const updatePatternFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { patternId } = req.params;
    const { rating, comment } = req.body;

    await memorySystem.procedural.updatePatternFeedback(
      userId,
      patternId,
      rating,
      comment
    );

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:procedural:feedback:updated', { 
      patternId, 
      rating, 
      comment 
    });

    res.json({
      success: true,
      message: 'Pattern feedback updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CONSOLIDATION CONTROLLERS ====================

/**
 * Trigger memory consolidation
 * @route POST /api/memory/consolidate
 */
export const consolidateMemories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const options = {
      includeEpisodic: req.body.includeEpisodic !== false,
      includeSemantic: req.body.includeSemantic !== false,
      includeProcedural: req.body.includeProcedural !== false,
      minImportance: req.body.minImportance || 0.5,
      maxAge: req.body.maxAge || 86400000, // 24 hours default
    };

    const result = await memorySystem.consolidation.consolidateUserMemories(userId, options);

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:consolidated', result);

    logger.info(`Memory consolidation completed for user ${userId}`, result);

    res.json({
      success: true,
      data: result,
      message: 'Memory consolidation completed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get memory statistics
 * @route GET /api/memory/stats
 */
export const getMemoryStatistics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const stats = await memorySystem.consolidation.getMemoryStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze memory patterns
 * @route GET /api/memory/analyze
 */
export const analyzeMemoryPatterns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const timeframe = req.query.timeframe as string || '7d';

    const analysis = await memorySystem.consolidation.analyzeMemoryPatterns(userId, timeframe);

    res.json({
      success: true,
      data: analysis,
      meta: {
        timeframe,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export memories
 * @route GET /api/memory/export
 */
export const exportMemories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const format = req.query.format as string || 'json';
    const includeTypes = req.query.includeTypes ? 
      (req.query.includeTypes as string).split(',') : ['episodic', 'semantic', 'procedural'];

    const exported = await memorySystem.consolidation.exportMemories(userId, {
      format,
      includeTypes,
    });

    if (format === 'json') {
      res.json({
        success: true,
        data: exported,
        meta: {
          userId,
          exportedAt: new Date(),
          includeTypes,
        },
      });
    } else {
      // For other formats like CSV or PDF, set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="memories-${userId}-${Date.now()}.${format}"`);
      res.send(exported);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Import memories
 * @route POST /api/memory/import
 */
export const importMemories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { data, format = 'json', merge = true } = req.body;

    const result = await memorySystem.consolidation.importMemories(userId, {
      data,
      format,
      merge,
    });

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:imported', result);

    logger.info(`Memories imported for user ${userId}`, result);

    res.json({
      success: true,
      data: result,
      message: 'Memories imported successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all memories (with confirmation)
 * @route DELETE /api/memory/all
 */
export const clearAllMemories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { confirm, types } = req.body;

    if (confirm !== true) {
      throw new AppError('Confirmation required to clear all memories', 400);
    }

    const result = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
    };

    if (!types || types.includes('episodic')) {
      result.episodic = await memorySystem.episodic.clearUserMemories(userId);
    }

    if (!types || types.includes('semantic')) {
      result.semantic = await memorySystem.semantic.clearUserData(userId);
    }

    if (!types || types.includes('procedural')) {
      result.procedural = await memorySystem.procedural.clearUserPatterns(userId);
    }

    // Emit WebSocket event
    emitMemoryUpdate(userId, 'memory:cleared', result);

    logger.warn(`All memories cleared for user ${userId}`, result);

    res.json({
      success: true,
      data: result,
      message: 'All memories cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};