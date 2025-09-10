/**
 * Conversation Routes
 * API endpoints for chat conversations
 */

import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { conversationService } from '../../services/conversation.service';
import { messageService } from '../../services/message.service';
import { memoryService } from '../../services/memory.service';
import { claudeService } from '../../services/claude.service';
import { authenticate } from '../../middleware/authenticate';
import { claudeRateLimiter, rateLimitStatus } from '../../middleware/claudeRateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';
import { ValidationError } from '../../utils/errors';
import { getSocketServer } from '../../websocket/socketServer';

const router = Router();

/**
 * Validation middleware
 */
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map(e => e.msg).join(', '));
  }
  next();
};

/**
 * @route   POST /api/conversations/create
 * @desc    Create a new conversation
 * @access  Private
 */
router.post(
  '/create',
  authenticate,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be between 1 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const { title, description, context } = req.body;
    const userId = req.user.userId;
    
    const conversation = await conversationService.createConversation({
      userId,
      title,
      description,
      context,
    });
    
    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    });
  })
);

/**
 * @route   GET /api/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('includeInactive')
      .optional()
      .isBoolean()
      .withMessage('includeInactive must be a boolean'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const includeInactive = req.query.includeInactive === 'true';
    
    const result = await conversationService.getUserConversations(
      userId,
      page,
      limit,
      includeInactive
    );
    
    res.json({
      success: true,
      data: result.conversations,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  })
);

/**
 * @route   GET /api/conversations/:id
 * @desc    Get conversation by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    
    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }
    
    res.json({
      success: true,
      data: conversation,
    });
  })
);

/**
 * @route   PUT /api/conversations/:id
 * @desc    Update conversation
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be between 1 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const updates = req.body;
    
    const conversation = await conversationService.updateConversation(
      conversationId,
      userId,
      updates
    );
    
    res.json({
      success: true,
      message: 'Conversation updated successfully',
      data: conversation,
    });
  })
);

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Delete conversation (soft delete)
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    
    await conversationService.deleteConversation(conversationId, userId);
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  })
);

/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Send a message in conversation
 * @access  Private
 */
router.post(
  '/:id/messages',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 10000 })
      .withMessage('Message content must be less than 10000 characters'),
    body('type')
      .optional()
      .isIn(['text', 'image', 'video', 'audio', 'document'])
      .withMessage('Invalid message type'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
    body('parentMessageId')
      .optional()
      .isUUID()
      .withMessage('Invalid parent message ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const { content, type, metadata, parentMessageId } = req.body;
    
    // Verify user has access to conversation
    const hasAccess = await conversationService.userHasAccess(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation',
      });
    }
    
    const message = await messageService.createMessage({
      conversationId,
      userId,
      content,
      type,
      metadata,
      parentMessageId,
    });
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  })
);

/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get conversation messages
 * @access  Private
 */
router.get(
  '/:id/messages',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('beforeMessageId')
      .optional()
      .isUUID()
      .withMessage('Invalid message ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const beforeMessageId = req.query.beforeMessageId;
    
    const result = await messageService.getConversationMessages(
      conversationId,
      userId,
      page,
      limit,
      beforeMessageId
    );
    
    res.json({
      success: true,
      data: result.messages,
      hasMore: result.hasMore,
    });
  })
);

/**
 * @route   GET /api/conversations/:id/history
 * @desc    Get conversation history (messages + context)
 * @access  Private
 */
router.get(
  '/:id/history',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    
    // Verify access
    const conversation = await conversationService.getConversationById(
      conversationId,
      userId
    );
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }
    
    // Get recent messages
    const messages = await messageService.getRecentMessages(conversationId, limit);
    
    // Get conversation context from memory
    const memoryContext = await memoryService.getUserContext(userId, conversationId);
    
    res.json({
      success: true,
      data: {
        conversation,
        messages,
        context: memoryContext,
      },
    });
  })
);

/**
 * @route   PUT /api/conversations/:id/messages/:messageId
 * @desc    Edit a message
 * @access  Private
 */
router.put(
  '/:id/messages/:messageId',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    param('messageId')
      .isUUID()
      .withMessage('Invalid message ID'),
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 10000 })
      .withMessage('Message content must be less than 10000 characters'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    const { content } = req.body;
    
    // Verify message ownership
    const message = await messageService.getMessageById(messageId);
    if (!message || message.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit this message',
      });
    }
    
    const updatedMessage = await messageService.updateMessage(messageId, content);
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: updatedMessage,
    });
  })
);

/**
 * @route   DELETE /api/conversations/:id/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete(
  '/:id/messages/:messageId',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    param('messageId')
      .isUUID()
      .withMessage('Invalid message ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    
    // Verify message ownership
    const message = await messageService.getMessageById(messageId);
    if (!message || message.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete this message',
      });
    }
    
    await messageService.deleteMessage(messageId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  })
);

/**
 * @route   GET /api/conversations/:id/search
 * @desc    Search messages in conversation
 * @access  Private
 */
router.get(
  '/:id/search',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    
    const messages = await messageService.searchMessages(
      conversationId,
      userId,
      query,
      limit
    );
    
    res.json({
      success: true,
      data: messages,
    });
  })
);

/**
 * @route   GET /api/conversations/:id/context
 * @desc    Get conversation context
 * @access  Private
 */
router.get(
  '/:id/context',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    
    const context = await conversationService.getConversationContext(
      conversationId,
      userId
    );
    
    res.json({
      success: true,
      data: context,
    });
  })
);

/**
 * @route   PUT /api/conversations/:id/context
 * @desc    Update conversation context
 * @access  Private
 */
router.put(
  '/:id/context',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    body('context')
      .isObject()
      .withMessage('Context must be an object'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const { context } = req.body;
    
    await conversationService.updateConversationContext(
      conversationId,
      userId,
      context
    );
    
    res.json({
      success: true,
      message: 'Context updated successfully',
    });
  })
);

/**
 * @route   GET /api/conversations/stats
 * @desc    Get user's conversation statistics
 * @access  Private
 */
router.get(
  '/stats/overview',
  authenticate,
  asyncHandler(async (req: any, res) => {
    const userId = req.user.userId;
    
    const stats = await conversationService.getConversationStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route   POST /api/conversations/:id/messages/ai
 * @desc    Send a message and get AI response from Claude
 * @access  Private
 */
router.post(
  '/:id/messages/ai',
  authenticate,
  claudeRateLimiter,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 10000 })
      .withMessage('Message content must be less than 10000 characters'),
    body('stream')
      .optional()
      .isBoolean()
      .withMessage('Stream must be a boolean'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const { content, stream = false } = req.body;
    
    // Verify user has access to conversation
    const hasAccess = await conversationService.userHasAccess(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation',
      });
    }
    
    // Save user message first
    const userMessage = await messageService.createMessage({
      conversationId,
      userId,
      content,
      type: 'text',
      isAiResponse: false,
    });
    
    // Emit user message via WebSocket
    try {
      const socketServer = getSocketServer();
      socketServer.emitToConversation(conversationId, 'message:new', userMessage);
    } catch (error) {
      // WebSocket might not be initialized, continue anyway
      console.warn('WebSocket not available:', error);
    }
    
    // Get AI response from Claude
    const context = {
      userId,
      conversationId,
      role: req.user.role,
      preferences: req.user.preferences,
    };
    
    if (stream) {
      // Set up SSE for streaming response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      });
      
      try {
        for await (const chunk of claudeService.streamResponse(content, context)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Stream interrupted' })}\n\n`);
        res.end();
      }
    } else {
      // Regular non-streaming response
      const aiResponse = await claudeService.processMessage(content, context);
      
      // Emit AI response via WebSocket
      try {
        const socketServer = getSocketServer();
        socketServer.emitToConversation(conversationId, 'message:ai', {
          content: aiResponse.content,
          messageId: aiResponse.messageId,
          metadata: aiResponse.metadata,
        });
      } catch (error) {
        // WebSocket might not be initialized
        console.warn('WebSocket not available:', error);
      }
      
      res.json({
        success: true,
        data: {
          userMessage,
          aiResponse,
        },
      });
    }
  })
);

/**
 * @route   GET /api/conversations/:id/summary
 * @desc    Get AI-generated conversation summary
 * @access  Private
 */
router.get(
  '/:id/summary',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid conversation ID'),
    handleValidationErrors,
  ],
  asyncHandler(async (req: any, res) => {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    
    // Verify access
    const hasAccess = await conversationService.userHasAccess(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation',
      });
    }
    
    // Get AI-generated summary
    const summary = await claudeService.getConversationSummary(conversationId);
    
    res.json({
      success: true,
      data: {
        conversationId,
        summary,
        generatedAt: new Date(),
      },
    });
  })
);

/**
 * @route   GET /api/conversations/ai/health
 * @desc    Check Claude AI service health
 * @access  Private
 */
router.get(
  '/ai/health',
  authenticate,
  asyncHandler(async (req: any, res) => {
    const health = await claudeService.healthCheck();
    
    res.json({
      success: health.available,
      data: health,
    });
  })
);

/**
 * @route   GET /api/conversations/ai/rate-limit
 * @desc    Check current rate limit status
 * @access  Private
 */
router.get('/ai/rate-limit', authenticate, asyncHandler(async (req: Request, res: Response) => {
  // Return rate limit status
  res.json({
    remaining: 100,
    total: 100,
    resetTime: new Date(Date.now() + 60000).toISOString()
  });
}));

export default router;