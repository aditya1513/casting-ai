import { getSocketServer } from '../websocket/socketServer';
import { aiServiceClient } from '../middleware/api-gateway';
import { logger } from '../utils/logger';
import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { queueManager } from '../queues/queue.manager';
import Redis from 'ioredis';
import EventEmitter from 'events';

/**
 * Chat Integration Service
 * Orchestrates real-time chat flow between Frontend ↔ Backend ↔ AI Service
 */

export interface ChatMessage {
  conversationId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  metadata?: Record<string, any>;
  isAiResponse: boolean;
  timestamp: Date;
}

export interface ChatContext {
  conversationId: string;
  userId: string;
  sessionId: string;
  history: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface AIProcessingRequest {
  message: string;
  context: ChatContext;
  mode?: 'chat' | 'search' | 'analysis';
  temperature?: number;
  maxTokens?: number;
}

export interface AIProcessingResponse {
  response: string;
  confidence?: number;
  suggestions?: string[];
  metadata?: Record<string, any>;
  memoryUpdated?: boolean;
}

class ChatIntegrationService extends EventEmitter {
  private redis: Redis;
  private processingQueue: Map<string, boolean> = new Map();
  private streamBuffers: Map<string, string> = new Map();

  constructor() {
    super();
    
    // Initialize Redis for session management
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    this.initialize();
  }

  private async initialize() {
    // Set up WebSocket event listeners for chat messages
    this.setupWebSocketHandlers();
    
    // Set up AI service response handlers
    this.setupAIResponseHandlers();
    
    logger.info('Chat integration service initialized');
  }

  private setupWebSocketHandlers() {
    // This would be called when the WebSocket server is initialized
    // to add custom chat message handling
  }

  private setupAIResponseHandlers() {
    // Handle streaming responses from AI service
    this.on('ai:stream:start', this.handleStreamStart.bind(this));
    this.on('ai:stream:chunk', this.handleStreamChunk.bind(this));
    this.on('ai:stream:end', this.handleStreamEnd.bind(this));
    this.on('ai:stream:error', this.handleStreamError.bind(this));
  }

  /**
   * Process incoming chat message through the complete flow
   */
  async processChatMessage(message: ChatMessage): Promise<void> {
    const { conversationId, userId, content } = message;
    const processingKey = `${conversationId}:${userId}`;

    // Check if already processing for this conversation
    if (this.processingQueue.get(processingKey)) {
      logger.warn(`Already processing message for conversation ${conversationId}`);
      return;
    }

    this.processingQueue.set(processingKey, true);

    try {
      // Step 1: Save user message to database
      const savedMessage = await messageService.createMessage({
        conversationId,
        userId,
        content,
        type: message.type,
        metadata: message.metadata,
        isAiResponse: false,
      });

      // Step 2: Emit typing indicator for AI
      const socketServer = getSocketServer();
      socketServer.emitToConversation(conversationId, 'typing:update', {
        userId: 'ai-assistant',
        isTyping: true,
        conversationId,
      });

      // Step 3: Get conversation context
      const context = await this.buildChatContext(conversationId, userId);

      // Step 4: Send to AI service for processing
      const aiRequest: AIProcessingRequest = {
        message: content,
        context,
        mode: 'chat',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const aiResponse = await this.sendToAIService(aiRequest, conversationId);

      // Step 5: Save AI response to database
      const aiMessage = await messageService.createMessage({
        conversationId,
        userId: 'ai-assistant',
        content: aiResponse.response,
        type: 'text',
        metadata: {
          confidence: aiResponse.confidence,
          suggestions: aiResponse.suggestions,
          ...aiResponse.metadata,
        },
        isAiResponse: true,
      });

      // Step 6: Stop typing indicator
      socketServer.emitToConversation(conversationId, 'typing:update', {
        userId: 'ai-assistant',
        isTyping: false,
        conversationId,
      });

      // Step 7: Emit AI response to conversation
      socketServer.emitToConversation(conversationId, 'message:new', aiMessage);

      // Step 8: Update conversation metadata
      await conversationService.updateLastMessage(conversationId);

      // Step 9: Queue memory consolidation if needed
      if (aiResponse.memoryUpdated) {
        await queueManager.addJob('MEMORY_CONSOLIDATION', {
          conversationId,
          userId,
          messages: [savedMessage, aiMessage],
        });
      }

      // Step 10: Log analytics
      await this.logChatAnalytics({
        conversationId,
        userId,
        messageLength: content.length,
        responseLength: aiResponse.response.length,
        processingTime: Date.now() - savedMessage.createdAt.getTime(),
        confidence: aiResponse.confidence,
      });

    } catch (error) {
      logger.error('Error processing chat message:', error);
      
      // Send error message to user
      const socketServer = getSocketServer();
      socketServer.emitToUser(userId, 'message:error', {
        conversationId,
        error: 'Failed to process message. Please try again.',
      });
      
      // Stop typing indicator
      socketServer.emitToConversation(conversationId, 'typing:update', {
        userId: 'ai-assistant',
        isTyping: false,
        conversationId,
      });
    } finally {
      this.processingQueue.delete(processingKey);
    }
  }

  /**
   * Send message to AI service for processing
   */
  private async sendToAIService(
    request: AIProcessingRequest,
    conversationId: string
  ): Promise<AIProcessingResponse> {
    try {
      // Check if we should use streaming
      const useStreaming = request.mode === 'chat' && !request.context.metadata?.disableStreaming;

      if (useStreaming) {
        return await this.sendStreamingRequest(request, conversationId);
      } else {
        return await this.sendStandardRequest(request);
      }
    } catch (error: any) {
      logger.error('Error sending to AI service:', error);
      
      // Fallback response
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        confidence: 0,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Send standard (non-streaming) request to AI service
   */
  private async sendStandardRequest(request: AIProcessingRequest): Promise<AIProcessingResponse> {
    const response = await aiServiceClient.post('/chat/process', request);
    return response;
  }

  /**
   * Send streaming request to AI service
   */
  private async sendStreamingRequest(
    request: AIProcessingRequest,
    conversationId: string
  ): Promise<AIProcessingResponse> {
    return new Promise((resolve, reject) => {
      const streamKey = `stream:${conversationId}`;
      this.streamBuffers.set(streamKey, '');

      // Make streaming request
      aiServiceClient.post('/chat/stream', request)
        .then((streamResponse: any) => {
          if (streamResponse.streamId) {
            // Handle server-sent events or WebSocket stream
            this.handleStreamResponse(streamResponse.streamId, conversationId, resolve, reject);
          } else {
            // Fallback to standard response
            resolve(streamResponse);
          }
        })
        .catch(reject);
    });
  }

  /**
   * Handle streaming response from AI service
   */
  private handleStreamResponse(
    streamId: string,
    conversationId: string,
    resolve: Function,
    reject: Function
  ) {
    const streamKey = `stream:${conversationId}`;
    const socketServer = getSocketServer();
    
    // Set up SSE or WebSocket connection to AI service
    // This is a simplified example - actual implementation would use SSE or WebSocket
    const checkInterval = setInterval(async () => {
      try {
        const status = await aiServiceClient.get(`/chat/stream/${streamId}/status`);
        
        if (status.completed) {
          clearInterval(checkInterval);
          const fullResponse = this.streamBuffers.get(streamKey) || '';
          this.streamBuffers.delete(streamKey);
          
          resolve({
            response: fullResponse,
            confidence: status.confidence,
            metadata: status.metadata,
            memoryUpdated: status.memoryUpdated,
          });
        } else if (status.chunk) {
          // Emit chunk to frontend
          socketServer.emitToConversation(conversationId, 'message:stream:chunk', {
            chunk: status.chunk,
            streamId,
          });
          
          // Append to buffer
          const current = this.streamBuffers.get(streamKey) || '';
          this.streamBuffers.set(streamKey, current + status.chunk);
        }
      } catch (error) {
        clearInterval(checkInterval);
        reject(error);
      }
    }, 100); // Check every 100ms

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Stream timeout'));
    }, 30000);
  }

  /**
   * Build chat context from conversation history
   */
  private async buildChatContext(conversationId: string, userId: string): Promise<ChatContext> {
    // Get session ID from Redis
    const sessionKey = `session:${userId}:${conversationId}`;
    let sessionId = await this.redis.get(sessionKey);
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await this.redis.setex(sessionKey, 3600, sessionId); // 1 hour expiry
    }

    // Get recent conversation history
    const recentMessages = await messageService.getRecentMessages(conversationId, 20);
    
    // Get conversation metadata
    const conversation = await conversationService.getConversationById(conversationId);
    
    // Build context
    const context: ChatContext = {
      conversationId,
      userId,
      sessionId,
      history: recentMessages.map(msg => ({
        conversationId,
        userId: msg.userId,
        content: msg.content,
        type: msg.type as any,
        metadata: msg.metadata,
        isAiResponse: msg.isAiResponse,
        timestamp: msg.createdAt,
      })),
      metadata: conversation?.metadata,
    };

    return context;
  }

  /**
   * Stream event handlers
   */
  private handleStreamStart(data: { streamId: string; conversationId: string }) {
    const socketServer = getSocketServer();
    socketServer.emitToConversation(data.conversationId, 'message:stream:start', {
      streamId: data.streamId,
    });
  }

  private handleStreamChunk(data: { streamId: string; conversationId: string; chunk: string }) {
    const socketServer = getSocketServer();
    socketServer.emitToConversation(data.conversationId, 'message:stream:chunk', {
      streamId: data.streamId,
      chunk: data.chunk,
    });
  }

  private handleStreamEnd(data: { streamId: string; conversationId: string; fullResponse: string }) {
    const socketServer = getSocketServer();
    socketServer.emitToConversation(data.conversationId, 'message:stream:end', {
      streamId: data.streamId,
      fullResponse: data.fullResponse,
    });
  }

  private handleStreamError(data: { streamId: string; conversationId: string; error: string }) {
    const socketServer = getSocketServer();
    socketServer.emitToConversation(data.conversationId, 'message:stream:error', {
      streamId: data.streamId,
      error: data.error,
    });
  }

  /**
   * Log chat analytics
   */
  private async logChatAnalytics(analytics: {
    conversationId: string;
    userId: string;
    messageLength: number;
    responseLength: number;
    processingTime: number;
    confidence?: number;
  }) {
    try {
      const key = `analytics:chat:${Date.now()}`;
      await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(analytics)); // 7 days
      
      // Update daily statistics
      const dailyKey = `analytics:chat:daily:${new Date().toISOString().split('T')[0]}`;
      await this.redis.hincrby(dailyKey, 'messageCount', 1);
      await this.redis.hincrby(dailyKey, 'totalProcessingTime', analytics.processingTime);
      await this.redis.expire(dailyKey, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      logger.error('Error logging chat analytics:', error);
    }
  }

  /**
   * Get chat statistics
   */
  async getChatStatistics(days: number = 7): Promise<{
    totalMessages: number;
    averageProcessingTime: number;
    averageConfidence: number;
    dailyStats: Array<{ date: string; messageCount: number }>;
  }> {
    const stats = {
      totalMessages: 0,
      totalProcessingTime: 0,
      totalConfidence: 0,
      confidenceCount: 0,
      dailyStats: [] as Array<{ date: string; messageCount: number }>,
    };

    // Get daily statistics
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dailyKey = `analytics:chat:daily:${dateStr}`;
      
      const messageCount = await this.redis.hget(dailyKey, 'messageCount');
      const processingTime = await this.redis.hget(dailyKey, 'totalProcessingTime');
      
      if (messageCount) {
        stats.totalMessages += parseInt(messageCount);
        stats.dailyStats.push({ date: dateStr, messageCount: parseInt(messageCount) });
      }
      
      if (processingTime) {
        stats.totalProcessingTime += parseInt(processingTime);
      }
    }

    // Get detailed analytics for confidence
    const keys = await this.redis.keys('analytics:chat:*');
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    for (const key of keys) {
      if (key.includes('daily')) continue;
      
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp < cutoff) continue;
      
      const data = await this.redis.get(key);
      if (data) {
        const analytics = JSON.parse(data);
        if (analytics.confidence !== undefined) {
          stats.totalConfidence += analytics.confidence;
          stats.confidenceCount++;
        }
      }
    }

    return {
      totalMessages: stats.totalMessages,
      averageProcessingTime: stats.totalMessages > 0 ? stats.totalProcessingTime / stats.totalMessages : 0,
      averageConfidence: stats.confidenceCount > 0 ? stats.totalConfidence / stats.confidenceCount : 0,
      dailyStats: stats.dailyStats.reverse(),
    };
  }

  /**
   * Handle system messages (notifications, alerts)
   */
  async sendSystemMessage(
    conversationId: string,
    message: string,
    type: 'info' | 'warning' | 'error' = 'info'
  ) {
    const socketServer = getSocketServer();
    
    const systemMessage = {
      id: `system-${Date.now()}`,
      conversationId,
      content: message,
      type: 'system',
      metadata: { systemType: type },
      timestamp: new Date(),
    };

    socketServer.emitToConversation(conversationId, 'message:system', systemMessage);
  }

  /**
   * Broadcast announcement to all active conversations
   */
  async broadcastAnnouncement(message: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    const socketServer = getSocketServer();
    
    const announcement = {
      id: `announcement-${Date.now()}`,
      content: message,
      priority,
      timestamp: new Date(),
    };

    socketServer.broadcastToAll('announcement', announcement);
    
    // Log announcement
    await this.redis.lpush('announcements:history', JSON.stringify(announcement));
    await this.redis.ltrim('announcements:history', 0, 99); // Keep last 100
  }
}

// Export singleton instance
export const chatIntegrationService = new ChatIntegrationService();

// Export types
export { ChatIntegrationService };