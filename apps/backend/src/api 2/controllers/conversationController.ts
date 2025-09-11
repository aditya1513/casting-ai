/**
 * CastMatch Conversational AI Controller
 * Handles Claude-powered casting conversations with memory
 */

import { Request, Response } from 'express';
import { AnthropicConversationService, ConversationContext, ConversationMessage } from '../../services/anthropic-conversation.service';

// In-memory storage for demo (would be Redis in production)
const conversationSessions = new Map<string, ConversationContext>();

const conversationService = new AnthropicConversationService();

/**
 * Start a new conversation session
 */
export const startConversation = async (req: Request, res: Response) => {
  try {
    const { userId = 'demo-user' } = req.body;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const context: ConversationContext = {
      userId,
      sessionId,
      messages: [],
      metadata: {
        location: 'Mumbai',
        language: 'English',
        conversationStage: 'greeting',
        preferredGenres: [],
      }
    };
    
    conversationSessions.set(sessionId, context);
    
    res.status(200).json({
      success: true,
      sessionId,
      message: 'Conversation started successfully',
      context: {
        location: context.metadata.location,
        language: context.metadata.language,
        stage: context.metadata.conversationStage
      }
    });
    
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation',
    });
  }
};

/**
 * Send a message and get Claude response
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, message, userId = 'demo-user' } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and message are required',
      });
    }
    
    let context = conversationSessions.get(sessionId);
    
    // Create new session if not found
    if (!context) {
      context = {
        userId,
        sessionId,
        messages: [],
        metadata: {
          location: 'Mumbai',
          language: 'English',
          conversationStage: 'greeting',
          preferredGenres: [],
        }
      };
      conversationSessions.set(sessionId, context);
    }
    
    // Add user message to context
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    context.messages.push(userMessage);
    
    // Update conversation stage based on message
    context = conversationService.updateConversationStage(message, context);
    
    // Generate Claude response
    const response = await conversationService.generateResponse(context, message);
    
    // Add Claude response to context
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date()
    };
    context.messages.push(assistantMessage);
    
    // Update stored context
    conversationSessions.set(sessionId, context);
    
    res.status(200).json({
      success: true,
      sessionId,
      response: response.content,
      metadata: {
        conversationStage: context.metadata.conversationStage,
        isComplete: response.isComplete,
        usage: response.usage,
        messageCount: context.messages.length
      },
      context: {
        projectType: context.metadata.castingProject,
        stage: context.metadata.conversationStage
      }
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
};

/**
 * Get conversation history
 */
export const getConversationHistory = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }
    
    const context = conversationSessions.get(sessionId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    res.status(200).json({
      success: true,
      sessionId,
      messages: context.messages,
      metadata: context.metadata,
      summary: {
        totalMessages: context.messages.length,
        conversationStage: context.metadata.conversationStage,
        projectType: context.metadata.castingProject || 'General inquiry',
        startTime: context.messages[0]?.timestamp,
        lastActivity: context.messages[context.messages.length - 1]?.timestamp
      }
    });
    
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation history',
    });
  }
};

/**
 * Update conversation metadata (preferences, project details)
 */
export const updateConversationMetadata = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { castingProject, preferredGenres, location, language } = req.body;
    
    const context = conversationSessions.get(sessionId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    // Update metadata
    if (castingProject) context.metadata.castingProject = castingProject;
    if (preferredGenres) context.metadata.preferredGenres = preferredGenres;
    if (location) context.metadata.location = location;
    if (language) context.metadata.language = language;
    
    conversationSessions.set(sessionId, context);
    
    res.status(200).json({
      success: true,
      message: 'Metadata updated successfully',
      metadata: context.metadata
    });
    
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update metadata',
    });
  }
};

/**
 * End conversation and cleanup
 */
export const endConversation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const context = conversationSessions.get(sessionId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    // In production, we'd save to database before cleanup
    const summary = {
      sessionId,
      totalMessages: context.messages.length,
      duration: context.messages.length > 0 
        ? new Date().getTime() - new Date(context.messages[0].timestamp!).getTime()
        : 0,
      conversationStage: context.metadata.conversationStage,
      projectType: context.metadata.castingProject || 'General inquiry'
    };
    
    // Clean up session
    conversationSessions.delete(sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Conversation ended successfully',
      summary
    });
    
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end conversation',
    });
  }
};

/**
 * Get active conversations count and health metrics
 */
export const getConversationMetrics = async (req: Request, res: Response) => {
  try {
    const activeSessions = conversationSessions.size;
    const sessions = Array.from(conversationSessions.values());
    
    const metrics = {
      activeSessions,
      totalMessages: sessions.reduce((total, session) => total + session.messages.length, 0),
      averageMessagesPerSession: sessions.length > 0 
        ? sessions.reduce((total, session) => total + session.messages.length, 0) / sessions.length 
        : 0,
      conversationStages: {
        greeting: sessions.filter(s => s.metadata.conversationStage === 'greeting').length,
        discovery: sessions.filter(s => s.metadata.conversationStage === 'discovery').length,
        recommendation: sessions.filter(s => s.metadata.conversationStage === 'recommendation').length,
        refinement: sessions.filter(s => s.metadata.conversationStage === 'refinement').length,
      },
      projectTypes: {
        'Web Series': sessions.filter(s => s.metadata.castingProject === 'Web Series').length,
        'Film': sessions.filter(s => s.metadata.castingProject === 'Film').length,
        'Commercial': sessions.filter(s => s.metadata.castingProject === 'Commercial').length,
        'General': sessions.filter(s => !s.metadata.castingProject).length,
      }
    };
    
    res.status(200).json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting conversation metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation metrics',
    });
  }
};

/**
 * Test Claude integration
 */
export const testClaudeIntegration = async (req: Request, res: Response) => {
  try {
    const testMessage = "Hello, I'm testing the Claude integration for CastMatch.";
    
    const testContext: ConversationContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      messages: [],
      metadata: {
        location: 'Mumbai',
        language: 'English',
        conversationStage: 'greeting',
        preferredGenres: ['Drama'],
      }
    };
    
    const response = await conversationService.generateResponse(testContext, testMessage);
    
    res.status(200).json({
      success: true,
      message: 'Claude integration test successful',
      testResponse: response.content,
      metadata: {
        isComplete: response.isComplete,
        usage: response.usage,
        apiKey: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'
      }
    });
    
  } catch (error) {
    console.error('Error testing Claude integration:', error);
    res.status(500).json({
      success: false,
      error: 'Claude integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export {
  startConversation,
  sendMessage,
  getConversationHistory,
  updateConversationMetadata,
  endConversation,
  getConversationMetrics,
  testClaudeIntegration
};