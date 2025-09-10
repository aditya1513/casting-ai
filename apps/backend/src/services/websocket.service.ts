/**
 * WebSocket Service
 * Handles real-time communication for notifications, messages, and live updates
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';
import { logger } from '../utils/logger';
import { NotificationType, NotificationChannel } from './notification.service';
import Bull, { Queue, Job } from 'bull';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

interface WebSocketMessage {
  type: 'notification' | 'message' | 'update' | 'presence' | 'typing' | 'event';
  payload: any;
  metadata?: {
    timestamp: Date;
    messageId: string;
    correlationId?: string;
  };
}

interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  activeRoom?: string;
  device?: string;
}

interface TypingIndicator {
  userId: string;
  roomId: string;
  isTyping: boolean;
}

interface RoomSubscription {
  roomId: string;
  userId: string;
  joinedAt: Date;
  role?: 'admin' | 'moderator' | 'member';
}

export class WebSocketService {
  private io: SocketServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private presenceData: Map<string, PresenceData> = new Map();
  private roomSubscriptions: Map<string, Set<string>> = new Map(); // roomId -> Set of userIds
  private typingStatus: Map<string, Map<string, boolean>> = new Map(); // roomId -> Map<userId, isTyping>
  private messageQueue!: Queue;
  private heartbeatInterval = 30000; // 30 seconds
  private reconnectGracePeriod = 60000; // 60 seconds

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e6, // 1MB
    });

    this.initializeMessageQueue();
    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  /**
   * Initialize message queue for reliable delivery
   */
  private initializeMessageQueue(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.messageQueue = new Bull('websocket-message-queue', redisConfig);

    this.messageQueue.process(async (job: Job) => {
      const { userId, message } = job.data;
      await this.sendToUser(userId, message);
      return { delivered: true };
    });
  }

  /**
   * Setup Socket.IO middleware for authentication
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = verify(token, process.env.JWT_SECRET!) as any;
        
        // Verify user exists and is active
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) {
          return next(new Error('Invalid user or account inactive'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        socket.sessionId = decoded.sessionId;

        next();
      } catch (error) {
        logger.error('WebSocket authentication error', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers for socket connections
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      const userId = socket.userId!;
      
      logger.info('WebSocket client connected', { 
        userId, 
        socketId: socket.id,
        userRole: socket.userRole,
      });

      // Register user socket
      await this.registerUserSocket(userId, socket.id);

      // Update presence
      await this.updatePresence(userId, 'online', socket.id);

      // Send pending notifications
      await this.sendPendingNotifications(userId);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join role-based room
      if (socket.userRole) {
        socket.join(`role:${socket.userRole}`);
      }

      // Handle room subscriptions
      socket.on('subscribe', async (roomId: string) => {
        await this.subscribeToRoom(socket, roomId);
      });

      socket.on('unsubscribe', async (roomId: string) => {
        await this.unsubscribeFromRoom(socket, roomId);
      });

      // Handle messages
      socket.on('message', async (data: WebSocketMessage) => {
        await this.handleMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing:start', async (roomId: string) => {
        await this.handleTypingStart(socket, roomId);
      });

      socket.on('typing:stop', async (roomId: string) => {
        await this.handleTypingStop(socket, roomId);
      });

      // Handle presence updates
      socket.on('presence:update', async (status: PresenceData['status']) => {
        await this.updatePresence(userId, status, socket.id);
      });

      // Handle heartbeat
      socket.on('heartbeat', async () => {
        await this.handleHeartbeat(socket);
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, reason);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error', { error, userId, socketId: socket.id });
      });

      // Send connection success
      socket.emit('connected', {
        socketId: socket.id,
        userId,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Register user socket connection
   */
  private async registerUserSocket(userId: string, socketId: string): Promise<void> {
    // Add to user sockets map
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    
    // Add to socket users map
    this.socketUsers.set(socketId, userId);

    // Store in Redis for multi-server support
    await CacheManager.set(
      CacheKeys.userSocket(userId, socketId),
      { connected: true, timestamp: new Date() },
      this.reconnectGracePeriod / 1000
    );
  }

  /**
   * Handle user disconnection
   */
  private async handleDisconnect(socket: AuthenticatedSocket, reason: string): Promise<void> {
    const userId = socket.userId!;
    const socketId = socket.id;

    logger.info('WebSocket client disconnected', { userId, socketId, reason });

    // Remove from maps
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        // User has no more connections, update presence after grace period
        setTimeout(async () => {
          const stillConnected = this.userSockets.has(userId);
          if (!stillConnected) {
            await this.updatePresence(userId, 'offline', socketId);
          }
        }, this.reconnectGracePeriod);
      }
    }
    
    this.socketUsers.delete(socketId);

    // Remove from Redis
    await CacheManager.del(CacheKeys.userSocket(userId, socketId));
  }

  /**
   * Update user presence status
   */
  private async updatePresence(
    userId: string, 
    status: PresenceData['status'],
    socketId?: string
  ): Promise<void> {
    const presence: PresenceData = {
      userId,
      status,
      lastSeen: new Date(),
      device: socketId ? 'web' : undefined,
    };

    this.presenceData.set(userId, presence);

    // Store in Redis
    await CacheManager.set(
      CacheKeys.userPresence(userId),
      presence,
      300 // 5 minutes
    );

    // Broadcast presence update to relevant users
    this.broadcastPresenceUpdate(userId, presence);
  }

  /**
   * Broadcast presence update to relevant users
   */
  private broadcastPresenceUpdate(userId: string, presence: PresenceData): void {
    // Get user's connections/friends (implement based on your requirements)
    // For now, broadcast to all connected users in the same rooms
    this.roomSubscriptions.forEach((users, roomId) => {
      if (users.has(userId)) {
        this.io.to(roomId).emit('presence:update', presence);
      }
    });
  }

  /**
   * Subscribe to a room
   */
  private async subscribeToRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    const userId = socket.userId!;

    // Check permissions (implement based on your requirements)
    const hasAccess = await this.checkRoomAccess(userId, roomId);
    
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to room' });
      return;
    }

    // Join socket room
    socket.join(roomId);

    // Add to room subscriptions
    if (!this.roomSubscriptions.has(roomId)) {
      this.roomSubscriptions.set(roomId, new Set());
    }
    this.roomSubscriptions.get(roomId)!.add(userId);

    // Store subscription
    await CacheManager.set(
      CacheKeys.roomSubscription(roomId, userId),
      { joinedAt: new Date() },
      86400 // 24 hours
    );

    // Notify room members
    socket.to(roomId).emit('user:joined', { userId, roomId });

    // Send room state to user
    const roomState = await this.getRoomState(roomId);
    socket.emit('room:state', roomState);
  }

  /**
   * Unsubscribe from a room
   */
  private async unsubscribeFromRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    const userId = socket.userId!;

    // Leave socket room
    socket.leave(roomId);

    // Remove from room subscriptions
    const roomUsers = this.roomSubscriptions.get(roomId);
    if (roomUsers) {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) {
        this.roomSubscriptions.delete(roomId);
      }
    }

    // Remove subscription from cache
    await CacheManager.del(CacheKeys.roomSubscription(roomId, userId));

    // Notify room members
    socket.to(roomId).emit('user:left', { userId, roomId });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(socket: AuthenticatedSocket, data: WebSocketMessage): Promise<void> {
    const userId = socket.userId!;

    // Validate message
    if (!data.type || !data.payload) {
      socket.emit('error', { message: 'Invalid message format' });
      return;
    }

    // Add metadata
    const message: WebSocketMessage = {
      ...data,
      metadata: {
        timestamp: new Date(),
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        correlationId: data.metadata?.correlationId,
      },
    };

    // Process based on message type
    switch (message.type) {
      case 'notification':
        await this.handleNotificationMessage(socket, message);
        break;
      
      case 'message':
        await this.handleChatMessage(socket, message);
        break;
      
      case 'update':
        await this.handleUpdateMessage(socket, message);
        break;
      
      case 'event':
        await this.handleEventMessage(socket, message);
        break;
      
      default:
        socket.emit('error', { message: 'Unknown message type' });
    }
  }

  /**
   * Handle notification messages
   */
  private async handleNotificationMessage(socket: AuthenticatedSocket, message: WebSocketMessage): Promise<void> {
    // Process and forward notification
    const { targetUserId, notification } = message.payload;
    
    if (targetUserId) {
      await this.sendToUser(targetUserId, {
        type: 'notification',
        payload: notification,
        metadata: message.metadata,
      });
    }
  }

  /**
   * Handle chat messages
   */
  private async handleChatMessage(socket: AuthenticatedSocket, message: WebSocketMessage): Promise<void> {
    const { roomId, content } = message.payload;
    const userId = socket.userId!;

    // Validate room access
    if (!await this.checkRoomAccess(userId, roomId)) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }

    // Broadcast to room
    this.io.to(roomId).emit('message', {
      ...message,
      payload: {
        ...message.payload,
        userId,
        timestamp: message.metadata?.timestamp,
      },
    });

    // Store message (implement based on your requirements)
    await this.storeMessage(roomId, userId, content);
  }

  /**
   * Handle update messages
   */
  private async handleUpdateMessage(socket: AuthenticatedSocket, message: WebSocketMessage): Promise<void> {
    const { entityType, entityId, updates } = message.payload;
    
    // Broadcast updates to relevant users
    const affectedUsers = await this.getAffectedUsers(entityType, entityId);
    
    for (const userId of affectedUsers) {
      await this.sendToUser(userId, {
        type: 'update',
        payload: { entityType, entityId, updates },
        metadata: message.metadata,
      });
    }
  }

  /**
   * Handle event messages
   */
  private async handleEventMessage(socket: AuthenticatedSocket, message: WebSocketMessage): Promise<void> {
    const { eventType, eventData, targetRoom } = message.payload;
    
    if (targetRoom) {
      this.io.to(targetRoom).emit('event', {
        type: eventType,
        data: eventData,
        metadata: message.metadata,
      });
    }
  }

  /**
   * Handle typing start
   */
  private async handleTypingStart(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    const userId = socket.userId!;

    if (!this.typingStatus.has(roomId)) {
      this.typingStatus.set(roomId, new Map());
    }
    
    this.typingStatus.get(roomId)!.set(userId, true);

    // Broadcast to room except sender
    socket.to(roomId).emit('typing:update', {
      roomId,
      userId,
      isTyping: true,
    });

    // Auto-stop typing after 5 seconds
    setTimeout(() => {
      this.handleTypingStop(socket, roomId);
    }, 5000);
  }

  /**
   * Handle typing stop
   */
  private async handleTypingStop(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    const userId = socket.userId!;

    const roomTyping = this.typingStatus.get(roomId);
    if (roomTyping) {
      roomTyping.delete(userId);
    }

    // Broadcast to room except sender
    socket.to(roomId).emit('typing:update', {
      roomId,
      userId,
      isTyping: false,
    });
  }

  /**
   * Handle heartbeat
   */
  private async handleHeartbeat(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId!;
    
    // Update last seen
    await this.updatePresence(userId, 'online', socket.id);
    
    // Send acknowledgment
    socket.emit('heartbeat:ack', { timestamp: new Date() });
  }

  /**
   * Send pending notifications to user
   */
  private async sendPendingNotifications(userId: string): Promise<void> {
    try {
      // Get unread notifications from database
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      });

      // Send each notification
      for (const notification of notifications) {
        await this.sendToUser(userId, {
          type: 'notification',
          payload: notification,
          metadata: {
            timestamp: notification.createdAt,
            messageId: notification.id,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to send pending notifications', { error, userId });
    }
  }

  /**
   * Public method to send notification to user
   */
  public async sendToUser(userId: string, message: any): Promise<void> {
    const userSocketSet = this.userSockets.get(userId);
    
    if (userSocketSet && userSocketSet.size > 0) {
      // User is online, send directly
      userSocketSet.forEach(socketId => {
        this.io.to(socketId).emit('notification', message);
      });
    } else {
      // User is offline, queue for later delivery
      await this.messageQueue.add(
        { userId, message },
        {
          delay: 1000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );
    }
  }

  /**
   * Public method to broadcast to room
   */
  public async broadcastToRoom(roomId: string, message: any): Promise<void> {
    this.io.to(roomId).emit('broadcast', message);
  }

  /**
   * Public method to broadcast to role
   */
  public async broadcastToRole(role: string, message: any): Promise<void> {
    this.io.to(`role:${role}`).emit('broadcast', message);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    setInterval(() => {
      this.io.emit('heartbeat', { timestamp: new Date() });
    }, this.heartbeatInterval);
  }

  /**
   * Check if user has access to room
   */
  private async checkRoomAccess(userId: string, roomId: string): Promise<boolean> {
    // Implement your access control logic here
    // For example, check if user is member of project/casting call
    return true; // Placeholder
  }

  /**
   * Get room state
   */
  private async getRoomState(roomId: string): Promise<any> {
    const users = this.roomSubscriptions.get(roomId) || new Set();
    const typing = this.typingStatus.get(roomId) || new Map();
    
    return {
      roomId,
      users: Array.from(users),
      typing: Array.from(typing.entries()).filter(([_, isTyping]) => isTyping).map(([userId]) => userId),
      memberCount: users.size,
    };
  }

  /**
   * Store message in database
   */
  private async storeMessage(roomId: string, userId: string, content: string): Promise<void> {
    // Implement message storage based on your requirements
    // This is a placeholder
  }

  /**
   * Get affected users for entity updates
   */
  private async getAffectedUsers(entityType: string, entityId: string): Promise<string[]> {
    // Implement logic to determine which users should receive updates
    // based on entity type and ID
    return []; // Placeholder
  }

  /**
   * Get service statistics
   */
  public getStatistics(): any {
    return {
      connectedUsers: this.userSockets.size,
      totalSockets: this.socketUsers.size,
      activeRooms: this.roomSubscriptions.size,
      onlineUsers: Array.from(this.presenceData.values()).filter(p => p.status === 'online').length,
    };
  }
}

export default WebSocketService;