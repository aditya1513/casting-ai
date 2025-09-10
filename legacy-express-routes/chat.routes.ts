import { Router, Request, Response } from 'express';
import { claudeService } from '../services/claude.service';
import { agentClaudeService } from '../services/agent-claude.service';
import { conversationService } from '../services/conversation.service';
import { authenticate } from '../middleware/auth.unified';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Chat endpoint for AI conversations with structured outputs
 * Supports both Claude AI and fallback to structured AI chat service
 */
router.post('/ai/chat', 
  authenticate,
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('conversationId').optional().isString(),
    body('projectId').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { message, conversationId, projectId } = req.body;
      const userId = (req as any).user?.id || 'anonymous';

      logger.info(`Processing chat message for user ${userId}`);

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversation(conversationId, userId);
      } else {
        conversation = await conversationService.createConversation({
          userId,
          title: message.substring(0, 50) + '...',
          projectId
        });
      }

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      // Build context for Claude service
      const context = {
        userId,
        conversationId: conversation.id,
        role: (req as any).user?.role,
        projectContext: projectId ? { projectId } : undefined,
        preferences: req.body.preferences || {}
      };

      // Process message through enhanced Agent Claude service
      const claudeResponse = await agentClaudeService.processMessage(message, context);

      // Format response for frontend
      res.json({
        success: true,
        data: {
          message: claudeResponse.content,
          messageId: claudeResponse.messageId,
          conversationId: claudeResponse.conversationId,
          usage: claudeResponse.usage,
          metadata: claudeResponse.metadata
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Chat API Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Streaming chat endpoint for real-time Claude AI responses
 * Uses Server-Sent Events (SSE) for real-time streaming
 */
router.post('/ai/chat/stream',
  authenticate,
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('conversationId').optional().isString(),
    body('projectId').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        }));
        return;
      }

      const { message, conversationId, projectId } = req.body;
      const userId = (req as any).user?.id || 'anonymous';

      logger.info(`Starting stream for user ${userId}, conversation ${conversationId}`);

      // Set up SSE headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection confirmation
      res.write(`data: ${JSON.stringify({ type: 'connected', content: 'Stream started' })}\n\n`);

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await conversationService.getConversation(conversationId, userId);
      } else {
        conversation = await conversationService.createConversation({
          userId,
          title: message.substring(0, 50) + '...',
          projectId
        });
        
        // Send conversation ID to client
        res.write(`data: ${JSON.stringify({ 
          type: 'conversation_created', 
          content: { conversationId: conversation.id } 
        })}\n\n`);
      }

      if (!conversation) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          content: 'Conversation not found' 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Build context for Claude service
      const context = {
        userId,
        conversationId: conversation.id,
        role: (req as any).user?.role,
        projectContext: projectId ? { projectId } : undefined,
        preferences: req.body.preferences || {}
      };

      // Stream enhanced Agent Claude response
      try {
        for await (const chunk of agentClaudeService.streamResponse(message, context)) {
          // Send chunk to client
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          
          // Handle client disconnect
          if (req.socket?.destroyed) {
            logger.info('Client disconnected during stream');
            break;
          }
        }
      } catch (streamError) {
        logger.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          content: streamError instanceof Error ? streamError.message : 'Streaming failed' 
        })}\n\n`);
      }

      // Send completion signal
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      logger.error('Stream Chat API Error:', error);
      
      // If headers not sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          error: 'Failed to stream chat response',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      } else {
        // If headers already sent, send error through stream
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          content: error instanceof Error ? error.message : 'Unknown error' 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  }
);

/**
 * Get conversation history endpoint
 */
router.get('/ai/chat/history/:conversationId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const userId = (req as any).user?.id;
      const { page = 1, limit = 50 } = req.query;

      // Get conversation with messages
      const conversation = await conversationService.getConversationWithMessages(
        conversationId,
        userId,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt
          },
          messages: conversation.messages || [],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: conversation.messageCount || 0
          }
        }
      });
      
    } catch (error) {
      logger.error('Chat History Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get chat history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get user's conversations list
 */
router.get('/ai/conversations',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20 } = req.query;

      const conversations = await conversationService.getUserConversations(
        userId,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.json({
        success: true,
        data: conversations
      });
      
    } catch (error) {
      logger.error('Get Conversations Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Delete a conversation
 */
router.delete('/ai/conversations/:conversationId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const userId = (req as any).user?.id;

      const deleted = await conversationService.deleteConversation(conversationId, userId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
      
    } catch (error) {
      logger.error('Delete Conversation Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Enhanced Claude service health check (includes agents)
 */
router.get('/ai/health',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const health = await agentClaudeService.healthCheck();
      
      res.json({
        success: true,
        data: {
          ...health,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Health Check Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get available agents and their capabilities
 */
router.get('/ai/agents',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const agents = agentClaudeService.getAvailableAgents();
      
      res.json({
        success: true,
        data: {
          agents,
          count: Object.keys(agents).length,
          categories: {
            core: Object.keys(agents).slice(0, 8),
            advanced: Object.keys(agents).slice(8)
          }
        }
      });
      
    } catch (error) {
      logger.error('Get Agents Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUBLIC Demo endpoint - bypasses authentication for testing real Claude agents
 * This is for development/demo purposes only
 */
router.post('/conversations/messages', 
  [
    body('content').notEmpty().withMessage('Content is required'),
    body('conversationId').optional().isString(),
    body('projectId').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { content, conversationId, projectId } = req.body;
      const userId = req.body.userId || 'demo-user';

      logger.info(`Processing public chat message for demo user`);

      // Build context for Claude service
      const context = {
        userId,
        conversationId: conversationId || `demo-${Date.now()}`,
        role: 'casting_director',
        projectContext: projectId ? { projectId } : undefined,
        preferences: {}
      };

      // Process message through enhanced Agent Claude service
      const claudeResponse = await agentClaudeService.processMessage(content, context);

      // Format response for frontend
      res.json({
        success: true,
        content: claudeResponse.content,
        messageId: claudeResponse.messageId,
        conversationId: claudeResponse.conversationId,
        usage: claudeResponse.usage,
        metadata: claudeResponse.metadata,
        source: 'real_claude_agents',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Public Chat API Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;