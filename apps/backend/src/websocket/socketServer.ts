/**
 * WebSocket Server Configuration
 * Socket.io server for real-time communication
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { verifySocketToken } from '../utils/jwt';
import { CacheManager, CacheKeys } from '../config/redis';
import { conversationService } from '../services/conversation.service';
import { messageService } from '../services/message.service';

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

interface SocketData {
  user: SocketUser;
  conversationId?: string;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  metadata?: any;
}

interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

interface JoinConversationPayload {
  conversationId: string;
}

export class WebSocketServer {
  private io: SocketServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: config.cors.origins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    this.initialize();
  }
  
  private initialize() {
    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        const decoded = await verifySocketToken(token);
        if (!decoded) {
          return next(new Error('Invalid token'));
        }
        
        // Attach user data to socket
        (socket as any).data = {
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          },
        } as SocketData;
        
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
    
    // Connection handler
    this.io.on('connection', async (socket: Socket) => {
      const socketData = (socket as any).data as SocketData;
      const userId = socketData.user.id;
      
      logger.info(`User ${userId} connected via socket ${socket.id}`);
      
      // Track user socket
      this.addUserSocket(userId, socket.id);
      
      // Store user presence in Redis
      await this.updateUserPresence(userId, true);
      
      // Join user's personal room
      socket.join(`user:${userId}`);
      
      // Socket event handlers
      this.setupEventHandlers(socket);
      
      // Handle disconnect
      socket.on('disconnect', async () => {
        logger.info(`User ${userId} disconnected from socket ${socket.id}`);
        
        // Remove socket tracking
        this.removeUserSocket(userId, socket.id);
        
        // Update presence if no more sockets
        const userSockets = this.userSockets.get(userId);
        if (!userSockets || userSockets.size === 0) {
          await this.updateUserPresence(userId, false);
        }
      });
    });
    
    logger.info('✅ WebSocket server initialized');
  }
  
  private setupEventHandlers(socket: Socket) {
    const socketData = (socket as any).data as SocketData;
    const userId = socketData.user.id;
    
    // Join conversation room
    socket.on('conversation:join', async (payload: JoinConversationPayload) => {
      try {
        const { conversationId } = payload;
        
        // Verify user has access to conversation
        const hasAccess = await conversationService.userHasAccess(userId, conversationId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        // Leave previous conversation room if any
        if (socketData.conversationId) {
          socket.leave(`conversation:${socketData.conversationId}`);
        }
        
        // Join new conversation room
        socket.join(`conversation:${conversationId}`);
        socketData.conversationId = conversationId;
        
        // Mark messages as read
        await messageService.markConversationAsRead(conversationId, userId);
        
        // Send recent messages
        const messages = await messageService.getRecentMessages(conversationId, 50);
        socket.emit('conversation:history', { conversationId, messages });
        
        logger.info(`User ${userId} joined conversation ${conversationId}`);
      } catch (error) {
        logger.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });
    
    // Send message
    socket.on('message:send', async (payload: SendMessagePayload) => {
      try {
        const { conversationId, content, type = 'text', metadata } = payload;
        
        // Verify access
        const hasAccess = await conversationService.userHasAccess(userId, conversationId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        // Create message
        const message = await messageService.createMessage({
          conversationId,
          userId,
          content,
          type,
          metadata,
          isAiResponse: false,
        });
        
        // Broadcast to conversation room
        this.io.to(`conversation:${conversationId}`).emit('message:new', message);
        
        // Update conversation last message timestamp
        await conversationService.updateLastMessage(conversationId);
        
        logger.info(`Message sent in conversation ${conversationId} by user ${userId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Send message to AI
    socket.on('message:send:ai', async (payload: SendMessagePayload & { requestAiResponse?: boolean }) => {
      try {
        const { conversationId, content, type = 'text', metadata, requestAiResponse = true } = payload;
        
        // Verify access
        const hasAccess = await conversationService.userHasAccess(userId, conversationId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }
        
        // Create user message
        const userMessage = await messageService.createMessage({
          conversationId,
          userId,
          content,
          type,
          metadata,
          isAiResponse: false,
        });
        
        // Broadcast user message
        this.io.to(`conversation:${conversationId}`).emit('message:new', userMessage);
        
        if (requestAiResponse) {
          // Notify that AI is typing
          this.io.to(`conversation:${conversationId}`).emit('ai:typing', {
            conversationId,
            isTyping: true,
          });
          
          // Import Claude service dynamically to avoid circular dependency
          const { claudeService } = await import('../services/claude.service');
          
          // Get AI response
          const context = {
            userId,
            conversationId,
            role: socketData.user.role,
          };
          
          try {
            // Stream AI response
            for await (const chunk of claudeService.streamResponse(content, context)) {
              if (chunk.type === 'text') {
                this.io.to(`conversation:${conversationId}`).emit('ai:stream', {
                  conversationId,
                  content: chunk.content,
                  type: chunk.type,
                });
              } else if (chunk.type === 'done') {
                this.io.to(`conversation:${conversationId}`).emit('ai:typing', {
                  conversationId,
                  isTyping: false,
                });
              } else if (chunk.type === 'error') {
                socket.emit('error', { message: chunk.content });
              }
            }
          } catch (error) {
            logger.error('Error getting AI response:', error);
            this.io.to(`conversation:${conversationId}`).emit('ai:typing', {
              conversationId,
              isTyping: false,
            });
            socket.emit('error', { message: 'Failed to get AI response' });
          }
        }
        
        // Update conversation last message timestamp
        await conversationService.updateLastMessage(conversationId);
        
      } catch (error) {
        logger.error('Error in AI message handler:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });
    
    // Typing indicator
    socket.on('typing:start', async (payload: TypingPayload) => {
      try {
        const { conversationId } = payload;
        
        // Verify access
        const hasAccess = await conversationService.userHasAccess(userId, conversationId);
        if (!hasAccess) return;
        
        // Broadcast to others in conversation
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          userId,
          isTyping: true,
          conversationId,
        });
        
        // Set typing timeout in Redis (auto-clear after 5 seconds)
        await CacheManager.set(
          `typing:${conversationId}:${userId}`,
          true,
          5
        );
      } catch (error) {
        logger.error('Error handling typing start:', error);
      }
    });
    
    socket.on('typing:stop', async (payload: TypingPayload) => {
      try {
        const { conversationId } = payload;
        
        // Verify access
        const hasAccess = await conversationService.userHasAccess(userId, conversationId);
        if (!hasAccess) return;
        
        // Broadcast to others in conversation
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          userId,
          isTyping: false,
          conversationId,
        });
        
        // Clear typing status
        await CacheManager.delete(`typing:${conversationId}:${userId}`);
      } catch (error) {
        logger.error('Error handling typing stop:', error);
      }
    });
    
    // Mark message as read
    socket.on('message:read', async (payload: { messageId: string }) => {
      try {
        const { messageId } = payload;
        
        await messageService.markAsRead(messageId, userId);
        
        // Notify sender that message was read
        const message = await messageService.getMessageById(messageId);
        if (message && message.userId !== userId) {
          this.emitToUser(message.userId, 'message:read:receipt', {
            messageId,
            readBy: userId,
            readAt: new Date(),
          });
        }
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });
    
    // Delete message
    socket.on('message:delete', async (payload: { messageId: string }) => {
      try {
        const { messageId } = payload;
        
        // Get message to verify ownership
        const message = await messageService.getMessageById(messageId);
        if (!message || message.userId !== userId) {
          socket.emit('error', { message: 'Cannot delete this message' });
          return;
        }
        
        // Soft delete the message
        await messageService.deleteMessage(messageId);
        
        // Notify conversation participants
        this.io.to(`conversation:${message.conversationId}`).emit('message:deleted', {
          messageId,
          conversationId: message.conversationId,
        });
      } catch (error) {
        logger.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });
    
    // Edit message
    socket.on('message:edit', async (payload: { messageId: string; content: string }) => {
      try {
        const { messageId, content } = payload;
        
        // Get message to verify ownership
        const message = await messageService.getMessageById(messageId);
        if (!message || message.userId !== userId) {
          socket.emit('error', { message: 'Cannot edit this message' });
          return;
        }
        
        // Update message
        const updatedMessage = await messageService.updateMessage(messageId, content);
        
        // Notify conversation participants
        this.io.to(`conversation:${message.conversationId}`).emit('message:edited', updatedMessage);
      } catch (error) {
        logger.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });
  }
  
  // Helper methods
  
  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }
  
  private removeUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }
  
  private async updateUserPresence(userId: string, isOnline: boolean) {
    try {
      await CacheManager.set(
        CacheKeys.userPresence(userId),
        {
          isOnline,
          lastSeen: new Date(),
        },
        isOnline ? 0 : 300 // Keep offline status for 5 minutes
      );
    } catch (error) {
      logger.error('Error updating user presence:', error);
    }
  }
  
  // Public methods for external use
  
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  public emitToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }
  
  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }
  
  public async getOnlineUsers(): Promise<string[]> {
    const onlineUsers: string[] = [];
    for (const [userId] of this.userSockets) {
      onlineUsers.push(userId);
    }
    return onlineUsers;
  }
  
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
  
  public getIO(): SocketServer {
    return this.io;
  }
}

// Export singleton instance
let socketServer: WebSocketServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketServer => {
  if (!socketServer) {
    socketServer = new WebSocketServer(httpServer);
  }
  return socketServer;
};

export const getSocketServer = (): WebSocketServer => {
  if (!socketServer) {
    throw new Error('WebSocket server not initialized');
  }
  return socketServer;
};