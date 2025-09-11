/**
 * Notification Service
 * Real-time notifications with WebSocket, push notifications, and in-app messaging
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { prisma } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import Bull, { Queue, Job } from 'bull';
import webpush from 'web-push';

// Types
export enum NotificationType {
  // Casting Related
  NEW_CASTING_CALL = 'new_casting_call',
  CASTING_INVITATION = 'casting_invitation',
  AUDITION_SCHEDULED = 'audition_scheduled',
  AUDITION_REMINDER = 'audition_reminder',
  AUDITION_RESULT = 'audition_result',
  ROLE_OFFERED = 'role_offered',
  ROLE_REJECTED = 'role_rejected',
  
  // Profile Related
  PROFILE_VIEWED = 'profile_viewed',
  PROFILE_LIKED = 'profile_liked',
  PROFILE_SHARED = 'profile_shared',
  PROFILE_INCOMPLETE = 'profile_incomplete',
  
  // Communication
  NEW_MESSAGE = 'new_message',
  MESSAGE_REQUEST = 'message_request',
  VIDEO_CALL_REQUEST = 'video_call_request',
  
  // System
  WELCOME = 'welcome',
  ACCOUNT_VERIFIED = 'account_verified',
  PASSWORD_CHANGED = 'password_changed',
  SECURITY_ALERT = 'security_alert',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  
  // Social
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  MENTION = 'mention',
  COMMENT = 'comment',
  
  // Updates
  SYSTEM_UPDATE = 'system_update',
  FEATURE_ANNOUNCEMENT = 'feature_announcement',
  MAINTENANCE_NOTICE = 'maintenance_notice',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBSOCKET = 'websocket',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  imageUrl?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
  scheduledFor?: Date;
}

interface NotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]: boolean;
  };
  types: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;
    timezone: string;
  };
  frequency?: {
    digest: boolean;
    digestInterval: 'daily' | 'weekly' | 'monthly';
    realTime: boolean;
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationService {
  private io: SocketServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();
  private notificationQueue: Queue<NotificationPayload>;
  private digestQueue: Queue<any>;
  
  constructor() {
    this.initializeQueues();
    this.configurePushNotifications();
  }
  
  /**
   * Initialize Socket.IO server
   */
  initializeWebSocket(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    this.io.use(async (socket, next) => {
      try {
        // Authenticate socket connection
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        // Verify token and get user
        const userId = await this.verifySocketToken(token);
        if (!userId) {
          return next(new Error('Invalid token'));
        }
        
        socket.data.userId = userId;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
    
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      
      // Track user socket
      this.addUserSocket(userId, socket.id);
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      
      // Handle real-time events
      this.handleSocketEvents(socket);
      
      // Send pending notifications
      this.sendPendingNotifications(userId);
      
      logger.info(`User ${userId} connected via WebSocket`);
      
      socket.on('disconnect', () => {
        this.removeUserSocket(userId, socket.id);
        logger.info(`User ${userId} disconnected from WebSocket`);
      });
    });
  }
  
  /**
   * Initialize notification queues
   */
  private initializeQueues(): void {
    // Main notification queue
    this.notificationQueue = new Bull<NotificationPayload>('notification-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
    
    // Digest queue for batched notifications
    this.digestQueue = new Bull('digest-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });
    
    // Process notification jobs
    this.notificationQueue.process(async (job: Job<NotificationPayload>) => {
      return await this.processNotification(job.data);
    });
    
    // Process digest jobs
    this.digestQueue.process(async (job: Job<any>) => {
      return await this.processDigest(job.data);
    });
    
    // Schedule recurring digest jobs
    this.scheduleDigests();
  }
  
  /**
   * Configure web push notifications
   */
  private configurePushNotifications(): void {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + process.env.SMTP_FROM,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }
  
  /**
   * Send notification through multiple channels
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(payload.userId);
      
      // Check if notification type is enabled
      if (!this.isNotificationEnabled(payload.type, preferences)) {
        logger.info(`Notification ${payload.type} disabled for user ${payload.userId}`);
        return;
      }
      
      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Queue for later delivery
        const deliveryTime = this.getNextDeliveryTime(preferences);
        await this.queueNotification(payload, deliveryTime);
        return;
      }
      
      // Determine channels to use
      const channels = payload.channels || this.getChannelsForType(payload.type, preferences);
      
      // Send through each channel
      const promises = channels.map(channel => {
        switch (channel) {
          case NotificationChannel.IN_APP:
            return this.sendInAppNotification(payload);
          case NotificationChannel.WEBSOCKET:
            return this.sendWebSocketNotification(payload);
          case NotificationChannel.EMAIL:
            return this.sendEmailNotification(payload);
          case NotificationChannel.SMS:
            return this.sendSMSNotification(payload);
          case NotificationChannel.PUSH:
            return this.sendPushNotification(payload);
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.allSettled(promises);
      
      // Log notification
      await this.logNotification(payload);
      
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }
  
  /**
   * Send in-app notification
   */
  private async sendInAppNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Store notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data as any,
          actionUrl: payload.actionUrl,
          imageUrl: payload.imageUrl,
          priority: payload.priority || NotificationPriority.NORMAL,
          expiresAt: payload.expiresAt,
          metadata: payload.metadata as any,
        },
      });
      
      // Update unread count in cache
      await CacheManager.increment(
        CacheKeys.userNotificationCount(payload.userId)
      );
      
      logger.info(`In-app notification created: ${notification.id}`);
      
    } catch (error) {
      logger.error('Failed to send in-app notification:', error);
      throw error;
    }
  }
  
  /**
   * Send WebSocket notification
   */
  private async sendWebSocketNotification(payload: NotificationPayload): Promise<void> {
    if (!this.io) {
      logger.warn('WebSocket server not initialized');
      return;
    }
    
    try {
      // Emit to user's room
      this.io.to(`user:${payload.userId}`).emit('notification', {
        id: `ws_${Date.now()}`,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        actionUrl: payload.actionUrl,
        imageUrl: payload.imageUrl,
        priority: payload.priority,
        timestamp: new Date(),
      });
      
      logger.info(`WebSocket notification sent to user ${payload.userId}`);
      
    } catch (error) {
      logger.error('Failed to send WebSocket notification:', error);
      throw error;
    }
  }
  
  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, actor: true, castingDirector: true, producer: true },
      });
      
      if (!user?.email) {
        logger.warn(`No email found for user ${payload.userId}`);
        return;
      }
      
      // Determine user name
      let firstName = 'User';
      if (user.actor) {
        firstName = user.actor.firstName;
      } else if (user.castingDirector) {
        firstName = user.castingDirector.firstName;
      } else if (user.producer) {
        firstName = user.producer.firstName;
      }
      
      // Send email based on notification type
      await emailService.sendEmail({
        to: user.email,
        subject: payload.title,
        template: this.getEmailTemplateForType(payload.type),
        templateData: {
          firstName,
          title: payload.title,
          message: payload.message,
          actionUrl: payload.actionUrl,
          currentYear: new Date().getFullYear(),
          ...payload.data,
        },
        priority: payload.priority === NotificationPriority.URGENT ? 'high' : 'normal',
        metadata: {
          notificationType: payload.type,
          userId: payload.userId,
        },
        categories: ['notification', payload.type],
      });
      
      logger.info(`Email notification sent to user ${payload.userId}`);
      
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }
  
  /**
   * Send SMS notification
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check if SMS service is available
      const smsService = await this.getSMSService();
      if (!smsService) {
        logger.warn('SMS service not configured');
        return;
      }
      
      // Get user phone number
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { phone: true },
      });
      
      if (!user?.phone) {
        logger.warn(`No phone number found for user ${payload.userId}`);
        return;
      }
      
      // Send SMS
      await smsService.sendSMS({
        to: user.phone,
        message: `${payload.title}\n\n${payload.message}`,
        priority: payload.priority === NotificationPriority.URGENT,
      });
      
      logger.info(`SMS notification sent to user ${payload.userId}`);
      
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      throw error;
    }
  }
  
  /**
   * Send push notification
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user's push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId: payload.userId,
          isActive: true,
        },
      });
      
      if (subscriptions.length === 0) {
        logger.info(`No push subscriptions for user ${payload.userId}`);
        return;
      }
      
      // Prepare push payload
      const pushPayload = {
        title: payload.title,
        body: payload.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        image: payload.imageUrl,
        data: {
          type: payload.type,
          actionUrl: payload.actionUrl,
          ...payload.data,
        },
        actions: this.getPushActions(payload.type),
      };
      
      // Send to all subscriptions
      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(pushPayload)
          );
        } catch (error: any) {
          // Remove invalid subscription
          if (error.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          throw error;
        }
      });
      
      await Promise.allSettled(promises);
      
      logger.info(`Push notifications sent to user ${payload.userId}`);
      
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }
  
  /**
   * Queue notification for delayed delivery
   */
  private async queueNotification(
    payload: NotificationPayload,
    deliveryTime: Date
  ): Promise<void> {
    const delay = deliveryTime.getTime() - Date.now();
    
    await this.notificationQueue.add(payload, {
      delay,
      priority: payload.priority === NotificationPriority.URGENT ? 1 : 2,
    });
    
    logger.info(`Notification queued for delivery at ${deliveryTime}`);
  }
  
  /**
   * Process queued notification
   */
  private async processNotification(payload: NotificationPayload): Promise<void> {
    await this.sendNotification(payload);
  }
  
  /**
   * Send batch notifications (for digest)
   */
  async sendBatchNotifications(
    notifications: NotificationPayload[]
  ): Promise<void> {
    // Group by user
    const userNotifications = new Map<string, NotificationPayload[]>();
    
    for (const notification of notifications) {
      const userList = userNotifications.get(notification.userId) || [];
      userList.push(notification);
      userNotifications.set(notification.userId, userList);
    }
    
    // Send digest to each user
    for (const [userId, userNotifs] of userNotifications) {
      await this.sendDigestEmail(userId, userNotifs);
    }
  }
  
  /**
   * Send digest email
   */
  private async sendDigestEmail(
    userId: string,
    notifications: NotificationPayload[]
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    
    if (!user?.email) return;
    
    await emailService.sendEmail({
      to: user.email,
      subject: `Your CastMatch Activity Digest - ${notifications.length} updates`,
      template: 'digest',
      templateData: {
        notifications: notifications.map(n => ({
          title: n.title,
          message: n.message,
          actionUrl: n.actionUrl,
          time: new Date(n.metadata?.createdAt || Date.now()),
        })),
        count: notifications.length,
        currentYear: new Date().getFullYear(),
      },
      categories: ['digest', 'summary'],
    });
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    
    // Update unread count
    await CacheManager.decrement(
      CacheKeys.userNotificationCount(userId)
    );
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    
    // Reset unread count
    await CacheManager.delete(
      CacheKeys.userNotificationCount(userId)
    );
  }
  
  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<any> {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      types = [],
    } = options;
    
    const where: any = {
      userId,
      isRead: unreadOnly ? false : undefined,
      type: types.length > 0 ? { in: types } : undefined,
    };
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);
    
    return {
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
  
  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const cached = await CacheManager.get<NotificationPreferences>(
      CacheKeys.userNotificationPreferences(userId)
    );
    
    if (cached) return cached;
    
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    
    const defaultPreferences: NotificationPreferences = {
      userId,
      channels: {
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.EMAIL]: true,
        [NotificationChannel.SMS]: false,
        [NotificationChannel.PUSH]: true,
        [NotificationChannel.WEBSOCKET]: true,
      },
      types: this.getDefaultTypePreferences(),
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      },
      frequency: {
        digest: false,
        digestInterval: 'daily',
        realTime: true,
      },
    };
    
    const userPreferences = preferences
      ? { ...defaultPreferences, ...preferences }
      : defaultPreferences;
    
    // Cache preferences
    await CacheManager.set(
      CacheKeys.userNotificationPreferences(userId),
      userPreferences,
      3600
    );
    
    return userPreferences;
  }
  
  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: preferences as any,
      create: {
        userId,
        ...preferences,
      } as any,
    });
    
    // Clear cache
    await CacheManager.delete(
      CacheKeys.userNotificationPreferences(userId)
    );
  }
  
  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(
    userId: string,
    subscription: PushSubscription
  ): Promise<void> {
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint,
        },
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }
  
  /**
   * Helper Methods
   */
  
  private handleSocketEvents(socket: Socket): void {
    // Mark notification as read
    socket.on('notification:read', async (notificationId: string) => {
      await this.markAsRead(socket.data.userId, notificationId);
    });
    
    // Mark all as read
    socket.on('notification:read-all', async () => {
      await this.markAllAsRead(socket.data.userId);
    });
    
    // Update preferences
    socket.on('notification:preferences', async (preferences: any) => {
      await this.updateUserPreferences(socket.data.userId, preferences);
    });
  }
  
  private async sendPendingNotifications(userId: string): Promise<void> {
    const unreadCount = await CacheManager.get<number>(
      CacheKeys.userNotificationCount(userId)
    );
    
    if (unreadCount && unreadCount > 0) {
      this.io?.to(`user:${userId}`).emit('notification:unread-count', unreadCount);
    }
  }
  
  private addUserSocket(userId: string, socketId: string): void {
    const userSockets = this.userSockets.get(userId) || new Set();
    userSockets.add(socketId);
    this.userSockets.set(userId, userSockets);
  }
  
  private removeUserSocket(userId: string, socketId: string): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }
  
  private async verifySocketToken(token: string): Promise<string | null> {
    // Implement token verification logic
    // This should match your authentication system
    return null; // Placeholder
  }
  
  private isNotificationEnabled(
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    return preferences.types[type]?.enabled ?? true;
  }
  
  private getChannelsForType(
    type: NotificationType,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    return preferences.types[type]?.channels || [
      NotificationChannel.IN_APP,
      NotificationChannel.WEBSOCKET,
    ];
  }
  
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours?.enabled) return false;
    
    // Implement quiet hours logic based on timezone
    return false; // Placeholder
  }
  
  private getNextDeliveryTime(preferences: NotificationPreferences): Date {
    // Calculate next delivery time after quiet hours
    return new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now
  }
  
  private getEmailTemplateForType(type: NotificationType): string {
    const templateMap: Record<NotificationType, string> = {
      [NotificationType.NEW_CASTING_CALL]: 'new-casting-call',
      [NotificationType.CASTING_INVITATION]: 'casting-invitation',
      [NotificationType.AUDITION_SCHEDULED]: 'audition-scheduled',
      [NotificationType.WELCOME]: 'welcome',
      // Add more mappings as needed
    } as any;
    
    return templateMap[type] || 'default-notification';
  }
  
  private getPushActions(type: NotificationType): any[] {
    // Define actions based on notification type
    switch (type) {
      case NotificationType.NEW_MESSAGE:
        return [
          { action: 'reply', title: 'Reply' },
          { action: 'view', title: 'View' },
        ];
      case NotificationType.CASTING_INVITATION:
        return [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' },
        ];
      default:
        return [{ action: 'view', title: 'View' }];
    }
  }
  
  private getDefaultTypePreferences(): any {
    const allTypes = Object.values(NotificationType);
    const preferences: any = {};
    
    for (const type of allTypes) {
      preferences[type] = {
        enabled: true,
        channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
      };
    }
    
    return preferences;
  }
  
  private async getSMSService(): Promise<any> {
    // Return SMS service instance if configured
    // This is a placeholder for actual SMS service integration
    return null;
  }
  
  private async logNotification(payload: NotificationPayload): Promise<void> {
    // Log notification for analytics
    try {
      await prisma.notificationLog.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          channels: payload.channels?.join(',') || '',
          metadata: payload.metadata as any,
        },
      });
    } catch (error) {
      logger.error('Failed to log notification:', error);
    }
  }
  
  private scheduleDigests(): void {
    // Schedule daily digest at 9 AM
    this.digestQueue.add(
      { type: 'daily' },
      {
        repeat: {
          cron: '0 9 * * *',
        },
      }
    );
    
    // Schedule weekly digest on Mondays at 9 AM
    this.digestQueue.add(
      { type: 'weekly' },
      {
        repeat: {
          cron: '0 9 * * 1',
        },
      }
    );
  }
  
  private async processDigest(data: any): Promise<void> {
    // Process digest notifications
    logger.info('Processing digest:', data);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();