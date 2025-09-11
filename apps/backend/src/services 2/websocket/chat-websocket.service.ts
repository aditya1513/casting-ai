/**
 * Real-time Chat WebSocket Service for CastMatch
 * Integrates with Enhanced AI System for conversational casting workflows
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../../utils/logger';
import { enhancedAgentSystem, EnhancedAgentType } from '../ai/enhanced-agent-system';
import { redisClient } from '../../config/redis';

interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    agentType?: EnhancedAgentType;
    workflowStep?: string;
    talentCards?: any[];
    castingData?: any;
  };
}

interface UserSession {
  userId: string;
  socketId: string;
  sessionId?: string;
  currentAgent?: EnhancedAgentType;
  isActive: boolean;
  lastActivity: Date;
}

export class ChatWebSocketService {
  private io: SocketIOServer;
  private userSessions = new Map<string, UserSession>();
  private socketToUser = new Map<string, string>();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    logger.info('🔌 Chat WebSocket Service initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // User authentication and session setup
      socket.on('authenticate', async (data: { userId: string; token?: string }) => {
        try {
          await this.authenticateUser(socket, data);
        } catch (error) {
          logger.error('Authentication failed:', error);
          socket.emit('authentication_error', { message: 'Authentication failed' });
        }
      });

      // Join conversation room
      socket.on('join_conversation', async (data: { sessionId?: string, workflowType?: string }) => {
        try {
          await this.joinConversation(socket, data);
        } catch (error) {
          logger.error('Failed to join conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Send message with AI processing
      socket.on('send_message', async (data: { content: string; projectId?: string }) => {
        try {
          await this.handleUserMessage(socket, data);
        } catch (error) {
          logger.error('Message handling failed:', error);
          socket.emit('error', { message: 'Failed to process message' });
        }
      });

      // Quick actions (casting workflows)
      socket.on('quick_action', async (data: { action: string; context?: any }) => {
        try {
          await this.handleQuickAction(socket, data);
        } catch (error) {
          logger.error('Quick action failed:', error);
          socket.emit('error', { message: 'Failed to execute action' });
        }
      });

      // Typing indicators
      socket.on('typing_start', () => {
        const userId = this.socketToUser.get(socket.id);
        if (userId) {
          socket.broadcast.emit('user_typing', { userId, isTyping: true });
        }
      });

      socket.on('typing_stop', () => {
        const userId = this.socketToUser.get(socket.id);
        if (userId) {
          socket.broadcast.emit('user_typing', { userId, isTyping: false });
        }
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async authenticateUser(socket: Socket, data: { userId: string; token?: string }) {
    // Basic authentication - in production, verify JWT token
    const { userId } = data;
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Update user session
    const userSession: UserSession = {
      userId,
      socketId: socket.id,
      isActive: true,
      lastActivity: new Date(),
    };

    this.userSessions.set(userId, userSession);
    this.socketToUser.set(socket.id, userId);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Store session in Redis for persistence
    await redisClient.setex(
      `chat_session:${userId}`,
      3600, // 1 hour TTL
      JSON.stringify(userSession)
    );

    socket.emit('authenticated', { userId, status: 'connected' });
    logger.info(`User ${userId} authenticated on socket ${socket.id}`);
  }

  private async joinConversation(socket: Socket, data: { sessionId?: string, workflowType?: string }) {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      throw new Error('User not authenticated');
    }

    let sessionId = data.sessionId;

    // Create new AI session if none provided
    if (!sessionId) {
      const workflowType = data.workflowType || 'general_conversation';
      const initialAgent = this.getInitialAgentForWorkflow(workflowType);
      
      sessionId = await enhancedAgentSystem.createSession(
        userId,
        workflowType,
        initialAgent
      );
    }

    // Update user session
    const userSession = this.userSessions.get(userId);
    if (userSession) {
      userSession.sessionId = sessionId;
      userSession.currentAgent = EnhancedAgentType.CASTING_DIRECTOR; // Default
      this.userSessions.set(userId, userSession);
    }

    // Join conversation room
    socket.join(`conversation:${sessionId}`);

    // Load conversation history
    const history = await this.getConversationHistory(sessionId);

    socket.emit('conversation_joined', {
      sessionId,
      history,
      currentAgent: userSession?.currentAgent,
    });

    logger.info(`User ${userId} joined conversation ${sessionId}`);
  }

  private async handleUserMessage(socket: Socket, data: { content: string; projectId?: string }) {
    const userId = this.socketToUser.get(socket.id);
    const userSession = this.userSessions.get(userId!);
    
    if (!userId || !userSession?.sessionId) {
      throw new Error('No active conversation');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create user message
    const userMessage: ChatMessage = {
      id: messageId,
      sessionId: userSession.sessionId,
      userId,
      type: 'user',
      content: data.content,
      timestamp: new Date(),
    };

    // Broadcast user message to conversation room
    this.io.to(`conversation:${userSession.sessionId}`).emit('message', userMessage);

    // Store message
    await this.storeMessage(userMessage);

    // Show AI typing indicator
    this.io.to(`conversation:${userSession.sessionId}`).emit('ai_typing', { isTyping: true });

    try {
      // Process with Enhanced AI System
      const aiResponse = await enhancedAgentSystem.runAgentWorkflow(
        userSession.sessionId,
        data.content,
        {
          maxTurns: 5,
          parallelTools: true,
          guardrails: true,
          chainOfThought: true,
        }
      );

      // Create AI response message
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: userSession.sessionId,
        userId: 'ai',
        type: 'ai',
        content: aiResponse.output,
        timestamp: new Date(),
        metadata: {
          agentType: userSession.currentAgent,
          workflowStep: 'response',
          talentCards: this.extractTalentCards(aiResponse.output),
          castingData: this.extractCastingData(aiResponse.output),
        },
      };

      // Stop typing indicator
      this.io.to(`conversation:${userSession.sessionId}`).emit('ai_typing', { isTyping: false });

      // Broadcast AI response
      this.io.to(`conversation:${userSession.sessionId}`).emit('message', aiMessage);

      // Store AI message
      await this.storeMessage(aiMessage);

      // Handle agent handoffs if occurred
      if (aiResponse.agentHandoffs > 0) {
        socket.emit('agent_handoff', {
          newAgent: userSession.currentAgent,
          reason: 'workflow_optimization',
        });
      }

    } catch (error) {
      logger.error('AI processing failed:', error);
      
      // Stop typing indicator
      this.io.to(`conversation:${userSession.sessionId}`).emit('ai_typing', { isTyping: false });

      // Send error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        sessionId: userSession.sessionId,
        userId: 'ai',
        type: 'system',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };

      this.io.to(`conversation:${userSession.sessionId}`).emit('message', errorMessage);
    }
  }

  private async handleQuickAction(socket: Socket, data: { action: string; context?: any }) {
    const userId = this.socketToUser.get(socket.id);
    const userSession = this.userSessions.get(userId!);
    
    if (!userId || !userSession?.sessionId) {
      throw new Error('No active conversation');
    }

    // Map quick actions to enhanced AI workflows
    const quickActionMessages: { [key: string]: string } = {
      'find-male-lead': 'Find me suitable male lead actors for romantic drama in Mumbai Dreams',
      'schedule-auditions': 'Help me schedule auditions for this week with optimization',
      'analyze-script': 'Analyze the script and suggest character requirements with talent recommendations',
      'budget-planning': 'Help me optimize the casting budget with AI recommendations',
      'complete-casting': 'Run a complete casting workflow from script analysis to talent selection',
      'talent-discovery': 'Discover new talent matching current project requirements',
      'schedule-optimization': 'Optimize audition schedules with conflict resolution',
    };

    const message = quickActionMessages[data.action];
    if (message) {
      // Trigger the same flow as a regular message
      await this.handleUserMessage(socket, { content: message });

      // Emit quick action confirmation
      socket.emit('quick_action_executed', {
        action: data.action,
        message: 'Quick action triggered successfully',
      });
    }
  }

  private handleDisconnect(socket: Socket) {
    const userId = this.socketToUser.get(socket.id);
    
    if (userId) {
      const userSession = this.userSessions.get(userId);
      if (userSession) {
        userSession.isActive = false;
        userSession.lastActivity = new Date();
        this.userSessions.set(userId, userSession);
      }

      this.socketToUser.delete(socket.id);
      logger.info(`User ${userId} disconnected from socket ${socket.id}`);
    }
  }

  private getInitialAgentForWorkflow(workflowType: string): EnhancedAgentType {
    const workflowAgentMap: { [key: string]: EnhancedAgentType } = {
      'general_conversation': EnhancedAgentType.CASTING_DIRECTOR,
      'casting_workflow': EnhancedAgentType.CASTING_DIRECTOR,
      'talent_discovery': EnhancedAgentType.TALENT_SCOUT,
      'script_analysis': EnhancedAgentType.SCRIPT_ANALYST,
      'schedule_optimization': EnhancedAgentType.SCHEDULE_COORDINATOR,
      'production_management': EnhancedAgentType.PRODUCTION_MANAGER,
      'communication': EnhancedAgentType.COMMUNICATION_SPECIALIST,
    };

    return workflowAgentMap[workflowType] || EnhancedAgentType.CASTING_DIRECTOR;
  }

  private async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const historyData = await redisClient.get(`conversation_history:${sessionId}`);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      logger.error('Failed to load conversation history:', error);
      return [];
    }
  }

  private async storeMessage(message: ChatMessage) {
    try {
      // Store in Redis for real-time access
      const historyKey = `conversation_history:${message.sessionId}`;
      const existingHistory = await this.getConversationHistory(message.sessionId);
      
      existingHistory.push(message);
      
      // Keep only last 100 messages
      if (existingHistory.length > 100) {
        existingHistory.splice(0, existingHistory.length - 100);
      }

      await redisClient.setex(
        historyKey,
        7200, // 2 hours TTL
        JSON.stringify(existingHistory)
      );

      // TODO: Store in persistent database for long-term history
      
    } catch (error) {
      logger.error('Failed to store message:', error);
    }
  }

  private extractTalentCards(content: string): any[] {
    // Parse AI response for talent recommendations
    // This is a simplified implementation - in production, use structured output
    const talentMatches = content.match(/TALENT_CARD:\s*({[^}]+})/g);
    
    if (talentMatches) {
      return talentMatches.map(match => {
        try {
          return JSON.parse(match.replace('TALENT_CARD:', '').trim());
        } catch {
          return null;
        }
      }).filter(Boolean);
    }

    return [];
  }

  private extractCastingData(content: string): any {
    // Extract structured casting data from AI response
    // This is a simplified implementation
    const castingMatch = content.match(/CASTING_DATA:\s*({[^}]+})/);
    
    if (castingMatch) {
      try {
        return JSON.parse(castingMatch[1]);
      } catch {
        return null;
      }
    }

    return null;
  }

  // Public methods for external use
  public sendMessageToUser(userId: string, message: any) {
    this.io.to(`user:${userId}`).emit('message', message);
  }

  public sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public broadcastToConversation(sessionId: string, event: string, data: any) {
    this.io.to(`conversation:${sessionId}`).emit(event, data);
  }

  public getActiveUsers(): string[] {
    return Array.from(this.userSessions.keys()).filter(userId => 
      this.userSessions.get(userId)?.isActive
    );
  }

  public getUserSession(userId: string): UserSession | undefined {
    return this.userSessions.get(userId);
  }
}

// Singleton instance
let chatWebSocketService: ChatWebSocketService | null = null;

export const initializeChatWebSocket = (httpServer: HTTPServer): ChatWebSocketService => {
  if (!chatWebSocketService) {
    chatWebSocketService = new ChatWebSocketService(httpServer);
  }
  return chatWebSocketService;
};

export const getChatWebSocketService = (): ChatWebSocketService => {
  if (!chatWebSocketService) {
    throw new Error('Chat WebSocket service not initialized');
  }
  return chatWebSocketService;
};