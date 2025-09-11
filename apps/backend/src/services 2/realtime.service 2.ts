/**
 * Real-time Service
 * WebSocket subscriptions and Server-Sent Events for real-time updates
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config/config';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

// ==================== TYPES ====================

export interface RealtimeUser {
  id: string;
  socketId: string;
  role: string;
  lastSeen: Date;
  subscriptions: Set<string>;
}

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  channel?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionFilter {
  userId?: string;
  role?: string;
  conversationId?: string;
  projectId?: string;
  auditionId?: string;
}

// ==================== REALTIME SERVICE ====================

export class RealtimeService extends EventEmitter {
  private io: SocketIOServer;
  private connectedUsers: Map<string, RealtimeUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> Set of socketIds
  private redis?: Redis;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(server: HttpServer) {
    super();
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true,
    });

    // Initialize Redis for pub/sub if available
    if (config.redis?.url) {
      this.redis = new Redis(config.redis.url);
      this.setupRedisSubscriptions();
    }

    this.setupSocketHandlers();
    this.startHealthCheck();
    
    logger.info('✅ Real-time service initialized');
  }

  /**
   * Setup Redis pub/sub for multi-instance scaling
   */
  private setupRedisSubscriptions(): void {
    if (!this.redis) return;

    this.redis.subscribe('castmatch:realtime:*');
    
    this.redis.on('message', (channel: string, message: string) => {
      try {
        const event: RealtimeEvent = JSON.parse(message);
        const channelName = channel.split(':')[2]; // Extract channel name
        
        this.broadcastToChannel(channelName, event);
        
        logger.debug('Redis message broadcast', {
          channel: channelName,
          eventType: event.type,
          timestamp: event.timestamp,
        });
      } catch (error) {
        logger.error('Failed to process Redis message:', error);
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Authentication middleware for socket connections
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token (implement your JWT verification logic here)
        const user = await this.verifySocketToken(token);
        
        if (!user) {
          return next(new Error('Invalid authentication token'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: any): void {
    const user = socket.data.user;
    const socketId = socket.id;

    logger.info('User connected via WebSocket', {
      userId: user.id,
      socketId,
      role: user.role,
      ip: socket.handshake.address,
    });

    // Store user connection
    const realtimeUser: RealtimeUser = {
      id: user.id,
      socketId,
      role: user.role,
      lastSeen: new Date(),
      subscriptions: new Set(),
    };

    this.connectedUsers.set(socketId, realtimeUser);
    
    // Add to user sockets mapping
    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    this.userSockets.get(user.id)!.add(socketId);

    // Join user to their personal room
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    // Setup event handlers
    this.setupSocketEventHandlers(socket, realtimeUser);

    // Send connection confirmation
    socket.emit('connected', {
      status: 'connected',
      userId: user.id,
      timestamp: new Date().toISOString(),
      capabilities: this.getCapabilitiesForUser(user),
    });

    // Update metrics
    this.emit('user:connected', { userId: user.id, socketId });
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketEventHandlers(socket: any, user: RealtimeUser): void {
    // Subscribe to channels
    socket.on('subscribe', (data: { channels: string[], filters?: SubscriptionFilter }) => {
      this.handleSubscription(socket, user, data.channels, data.filters);
    });

    // Unsubscribe from channels
    socket.on('unsubscribe', (data: { channels: string[] }) => {
      this.handleUnsubscription(socket, user, data.channels);
    });

    // Send message to conversation
    socket.on('message:send', (data: { conversationId: string, content: string, metadata?: any }) => {
      this.handleMessageSend(socket, user, data);
    });

    // Typing indicators
    socket.on('typing:start', (data: { conversationId: string }) => {
      this.handleTypingStart(socket, user, data.conversationId);
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      this.handleTypingStop(socket, user, data.conversationId);
    });

    // Presence updates
    socket.on('presence:update', (data: { status: string, metadata?: any }) => {
      this.handlePresenceUpdate(socket, user, data);
    });

    // Heartbeat/ping
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback('pong');
      }
      user.lastSeen = new Date();
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, user, reason);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        userId: user.id,
        socketId: socket.id,
        error: error.message,
      });
    });
  }

  /**
   * Handle channel subscription
   */
  private handleSubscription(socket: any, user: RealtimeUser, channels: string[], filters?: SubscriptionFilter): void {
    const allowedChannels = this.getAllowedChannels(user, filters);
    
    channels.forEach(channel => {
      if (allowedChannels.includes(channel)) {
        socket.join(channel);
        user.subscriptions.add(channel);
        
        if (!this.subscriptions.has(channel)) {
          this.subscriptions.set(channel, new Set());
        }
        this.subscriptions.get(channel)!.add(socket.id);
        
        logger.debug('User subscribed to channel', {
          userId: user.id,
          channel,
          totalSubscriptions: user.subscriptions.size,
        });
      } else {
        socket.emit('subscription:error', {
          channel,
          error: 'Access denied or invalid channel',
        });
      }
    });

    socket.emit('subscription:confirmed', {
      subscribedChannels: Array.from(user.subscriptions),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle channel unsubscription
   */
  private handleUnsubscription(socket: any, user: RealtimeUser, channels: string[]): void {
    channels.forEach(channel => {
      socket.leave(channel);
      user.subscriptions.delete(channel);
      this.subscriptions.get(channel)?.delete(socket.id);
    });

    socket.emit('unsubscription:confirmed', {
      unsubscribedChannels: channels,
      remainingChannels: Array.from(user.subscriptions),
    });
  }

  /**
   * Handle message sending
   */
  private handleMessageSend(socket: any, user: RealtimeUser, data: any): void {
    const { conversationId, content, metadata = {} } = data;
    
    // Validate permissions
    if (!this.canAccessConversation(user, conversationId)) {
      socket.emit('message:error', {
        error: 'Access denied to conversation',
        conversationId,
      });
      return;
    }

    const messageEvent: RealtimeEvent = {
      type: 'message:new',
      data: {
        conversationId,
        content,
        senderId: user.id,
        senderRole: user.role,
        metadata,
        id: `temp_${Date.now()}`, // Temporary ID until DB insertion
      },
      timestamp: new Date(),
      userId: user.id,
      channel: `conversation:${conversationId}`,
    };

    // Broadcast to conversation participants
    this.broadcastToChannel(`conversation:${conversationId}`, messageEvent);
    
    // Emit to persistence service
    this.emit('message:persist', messageEvent);

    logger.debug('Message sent via WebSocket', {
      userId: user.id,
      conversationId,
      contentLength: content.length,
    });
  }

  /**
   * Handle typing start
   */
  private handleTypingStart(socket: any, user: RealtimeUser, conversationId: string): void {
    const typingEvent: RealtimeEvent = {
      type: 'typing:start',
      data: {
        conversationId,
        userId: user.id,
        userRole: user.role,
      },
      timestamp: new Date(),
      channel: `conversation:${conversationId}`,
    };

    // Broadcast to others in conversation (exclude sender)
    socket.to(`conversation:${conversationId}`).emit('typing:start', typingEvent.data);
  }

  /**
   * Handle typing stop
   */
  private handleTypingStop(socket: any, user: RealtimeUser, conversationId: string): void {
    const typingEvent: RealtimeEvent = {
      type: 'typing:stop',
      data: {
        conversationId,
        userId: user.id,
      },
      timestamp: new Date(),
      channel: `conversation:${conversationId}`,
    };

    socket.to(`conversation:${conversationId}`).emit('typing:stop', typingEvent.data);
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(socket: any, user: RealtimeUser, data: any): void {
    user.lastSeen = new Date();
    
    const presenceEvent: RealtimeEvent = {
      type: 'presence:update',
      data: {
        userId: user.id,
        status: data.status,
        metadata: data.metadata,
        lastSeen: user.lastSeen,
      },
      timestamp: new Date(),
    };

    // Broadcast to user's connections and relevant channels
    this.broadcastToUser(user.id, presenceEvent);
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: any, user: RealtimeUser, reason: string): void {
    logger.info('User disconnected from WebSocket', {
      userId: user.id,
      socketId: socket.id,
      reason,
      connectionDuration: Date.now() - user.lastSeen.getTime(),
    });

    // Clean up subscriptions
    user.subscriptions.forEach(channel => {
      this.subscriptions.get(channel)?.delete(socket.id);
    });

    // Remove from user sockets mapping
    this.userSockets.get(user.id)?.delete(socket.id);
    if (this.userSockets.get(user.id)?.size === 0) {
      this.userSockets.delete(user.id);
    }

    // Remove from connected users
    this.connectedUsers.delete(socket.id);

    // Emit disconnect event
    this.emit('user:disconnected', {
      userId: user.id,
      socketId: socket.id,
      reason,
    });
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Broadcast event to specific channel
   */
  public broadcastToChannel(channel: string, event: RealtimeEvent): void {
    this.io.to(channel).emit(event.type, event.data);
    
    // Also publish to Redis for multi-instance scaling
    if (this.redis) {
      this.redis.publish(`castmatch:realtime:${channel}`, JSON.stringify(event));
    }

    logger.debug('Broadcast to channel', {
      channel,
      eventType: event.type,
      subscriberCount: this.subscriptions.get(channel)?.size || 0,
    });
  }

  /**
   * Broadcast event to specific user (all their connections)
   */
  public broadcastToUser(userId: string, event: RealtimeEvent): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event.type, event.data);
      });
    }

    logger.debug('Broadcast to user', {
      userId,
      eventType: event.type,
      socketCount: userSockets?.size || 0,
    });
  }

  /**
   * Broadcast to users with specific role
   */
  public broadcastToRole(role: string, event: RealtimeEvent): void {
    this.io.to(`role:${role}`).emit(event.type, event.data);
    
    logger.debug('Broadcast to role', {
      role,
      eventType: event.type,
    });
  }

  /**
   * Get real-time statistics
   */
  public getStats(): any {
    const connectedUsersCount = this.connectedUsers.size;
    const totalConnections = this.userSockets.size;
    const channelCount = this.subscriptions.size;
    
    const roleDistribution = Array.from(this.connectedUsers.values()).reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      connections: {
        total: connectedUsersCount,
        unique_users: totalConnections,
        channels: channelCount,
      },
      roles: roleDistribution,
      subscriptions: {
        total: Array.from(this.subscriptions.values()).reduce((sum, set) => sum + set.size, 0),
        by_channel: Object.fromEntries(
          Array.from(this.subscriptions.entries()).map(([channel, sockets]) => [channel, sockets.size])
        ),
      },
      health: {
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async verifySocketToken(token: string): Promise<any> {
    // Implement JWT verification logic here
    // This is a placeholder - integrate with your auth service
    try {
      // Example: const decoded = jwt.verify(token, config.jwt.secret);
      // return await getUserById(decoded.userId);
      return null; // Replace with actual implementation
    } catch (error) {
      return null;
    }
  }

  private getCapabilitiesForUser(user: any): string[] {
    const capabilities = ['messaging', 'presence', 'typing_indicators'];
    
    if (['casting_director', 'producer', 'admin'].includes(user.role)) {
      capabilities.push('broadcast', 'bulk_notifications');
    }
    
    return capabilities;
  }

  private getAllowedChannels(user: RealtimeUser, filters?: SubscriptionFilter): string[] {
    const channels: string[] = [
      `user:${user.id}`,
      `role:${user.role}`,
    ];

    // Add conversation-specific channels based on user access
    if (filters?.conversationId) {
      channels.push(`conversation:${filters.conversationId}`);
    }

    // Add project-specific channels for casting directors/producers
    if (['casting_director', 'producer', 'admin'].includes(user.role)) {
      if (filters?.projectId) {
        channels.push(`project:${filters.projectId}`);
      }
      if (filters?.auditionId) {
        channels.push(`audition:${filters.auditionId}`);
      }
    }

    return channels;
  }

  private canAccessConversation(user: RealtimeUser, conversationId: string): boolean {
    // Implement conversation access logic
    // This should check if the user has access to the conversation
    return true; // Placeholder
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      
      // Clean up stale connections
      this.connectedUsers.forEach((user, socketId) => {
        if (now - user.lastSeen.getTime() > staleThreshold) {
          logger.warn('Removing stale WebSocket connection', {
            userId: user.id,
            socketId,
            lastSeen: user.lastSeen,
          });
          
          this.connectedUsers.delete(socketId);
          this.userSockets.get(user.id)?.delete(socketId);
        }
      });
    }, 60000); // Check every minute
  }

  /**
   * Cleanup resources
   */
  public async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.redis) {
      await this.redis.disconnect();
    }
    
    this.io.close();
    logger.info('Real-time service closed');
  }
}

// ==================== SERVER-SENT EVENTS ====================

/**
 * Server-Sent Events handler for HTTP-based real-time updates
 */
export class SSEService {
  private connections: Map<string, { res: Response; user: any; lastPing: Date }> = new Map();

  /**
   * Handle SSE connection
   */
  public handleConnection(req: Request, res: Response): void {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const connectionId = `${user.id}_${Date.now()}`;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Store connection
    this.connections.set(connectionId, {
      res,
      user,
      lastPing: new Date(),
    });

    // Send initial connection event
    this.sendEvent(res, 'connected', {
      connectionId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Setup keep-alive ping
    const pingInterval = setInterval(() => {
      this.sendEvent(res, 'ping', { timestamp: new Date().toISOString() });
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(pingInterval);
      this.connections.delete(connectionId);
      
      logger.info('SSE client disconnected', {
        userId: user.id,
        connectionId,
      });
    });

    logger.info('SSE client connected', {
      userId: user.id,
      connectionId,
    });
  }

  /**
   * Send event to specific SSE connection
   */
  private sendEvent(res: Response, event: string, data: any): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error('Failed to send SSE event:', error);
    }
  }

  /**
   * Broadcast to all SSE connections for a user
   */
  public broadcastToUser(userId: string, event: string, data: any): void {
    this.connections.forEach((connection, connectionId) => {
      if (connection.user.id === userId) {
        this.sendEvent(connection.res, event, data);
      }
    });
  }

  /**
   * Broadcast to all SSE connections with a specific role
   */
  public broadcastToRole(role: string, event: string, data: any): void {
    this.connections.forEach((connection) => {
      if (connection.user.role === role) {
        this.sendEvent(connection.res, event, data);
      }
    });
  }

  /**
   * Get SSE connection statistics
   */
  public getStats(): any {
    return {
      totalConnections: this.connections.size,
      connectionsByRole: Array.from(this.connections.values()).reduce((acc, conn) => {
        acc[conn.user.role] = (acc[conn.user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

// Export singleton instances
export let realtimeService: RealtimeService;
export let sseService: SSEService;

export const initializeRealtimeServices = (server: HttpServer): void => {
  realtimeService = new RealtimeService(server);
  sseService = new SSEService();
};