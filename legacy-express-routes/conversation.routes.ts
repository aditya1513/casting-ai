/**
 * CastMatch Conversation Routes
 * Claude-powered casting conversation endpoints
 */

import { Router } from 'express';
import {
  startConversation,
  sendMessage,
  getConversationHistory,
  updateConversationMetadata,
  endConversation,
  getConversationMetrics,
  testClaudeIntegration
} from '../api/controllers/conversationController';

const router = Router();

/**
 * @route   POST /api/conversation/start
 * @desc    Start a new conversation session
 * @access  Public (for demo - would be authenticated in production)
 */
router.post('/start', startConversation);

/**
 * @route   POST /api/conversation/message
 * @desc    Send a message and get Claude response
 * @access  Public (for demo)
 */
router.post('/message', sendMessage);

/**
 * @route   GET /api/conversation/:sessionId/history
 * @desc    Get conversation history for a session
 * @access  Public (for demo)
 */
router.get('/:sessionId/history', getConversationHistory);

/**
 * @route   PUT /api/conversation/:sessionId/metadata
 * @desc    Update conversation metadata (project type, preferences)
 * @access  Public (for demo)
 */
router.put('/:sessionId/metadata', updateConversationMetadata);

/**
 * @route   DELETE /api/conversation/:sessionId
 * @desc    End conversation and cleanup session
 * @access  Public (for demo)
 */
router.delete('/:sessionId', endConversation);

/**
 * @route   GET /api/conversation/metrics
 * @desc    Get conversation metrics and health status
 * @access  Public (for demo)
 */
router.get('/metrics', getConversationMetrics);

/**
 * @route   GET /api/conversation/test-claude
 * @desc    Test Claude integration
 * @access  Public (for demo)
 */
router.get('/test-claude', testClaudeIntegration);

export default router;