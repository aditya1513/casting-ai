/**
 * Push Notification Service
 * Handles browser push notifications for real-time alerts
 */

import webpush from 'web-push';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

export class PushNotificationService {
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        `mailto:${process.env.SMTP_FROM || 'noreply@castmatch.com'}`,
        vapidPublicKey,
        vapidPrivateKey
      );
      this.isConfigured = true;
      logger.info('Push notification service initialized with VAPID keys');
    } else {
      logger.warn('Push notifications not configured - missing VAPID keys');
    }
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(userId: string, subscription: PushSubscriptionData): Promise<void> {
    try {
      if (!this.isConfigured) {
        throw new Error('Push notifications not configured');
      }

      // Store subscription in database
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
          updatedAt: new Date(),
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true,
        },
      });

      // Cache active subscription count
      const activeCount = await prisma.pushSubscription.count({
        where: {
          userId,
          isActive: true,
        },
      });

      await CacheManager.set(
        CacheKeys.userPushSubscriptionCount(userId),
        activeCount,
        3600
      );

      logger.info('Push subscription created/updated', { userId, endpoint: subscription.endpoint });

    } catch (error) {
      logger.error('Failed to subscribe to push notifications', { error, userId });
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    try {
      await prisma.pushSubscription.updateMany({
        where: {
          userId,
          endpoint,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Update cache
      const activeCount = await prisma.pushSubscription.count({
        where: {
          userId,
          isActive: true,
        },
      });

      await CacheManager.set(
        CacheKeys.userPushSubscriptionCount(userId),
        activeCount,
        3600
      );

      logger.info('Push subscription deactivated', { userId, endpoint });

    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', { error, userId, endpoint });
      throw error;
    }
  }

  /**
   * Send push notification to user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('Push notifications not configured - skipping');
        return;
      }

      // Get user's active subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (subscriptions.length === 0) {
        logger.info('No active push subscriptions for user', { userId });
        return;
      }

      // Prepare notification payload
      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        image: payload.image,
        data: {
          ...payload.data,
          timestamp: Date.now(),
          userId,
        },
        actions: payload.actions || [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
        tag: payload.tag || `notification-${Date.now()}`,
        requireInteraction: payload.requireInteraction || false,
        vibrate: [200, 100, 200],
        silent: false,
      });

      // Send to all subscriptions
      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            notificationPayload,
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: payload.requireInteraction ? 'high' : 'normal',
            }
          );

          logger.debug('Push notification sent', { 
            userId, 
            endpoint: subscription.endpoint,
            title: payload.title 
          });

        } catch (error: any) {
          if (error.statusCode === 410) {
            // Subscription no longer valid
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false },
            });
            logger.info('Deactivated expired push subscription', { 
              userId, 
              endpoint: subscription.endpoint 
            });
          } else {
            logger.error('Failed to send push notification to subscription', {
              error,
              userId,
              endpoint: subscription.endpoint,
            });
          }
        }
      });

      await Promise.allSettled(sendPromises);

      logger.info('Push notifications sent', { 
        userId, 
        subscriptionCount: subscriptions.length,
        title: payload.title 
      });

    } catch (error) {
      logger.error('Failed to send push notifications', { error, userId, payload: payload.title });
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    const sendPromises = userIds.map(userId => this.sendToUser(userId, payload));
    await Promise.allSettled(sendPromises);
  }

  /**
   * Get VAPID public key for client subscription
   */
  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  /**
   * Get user's subscription count
   */
  async getUserSubscriptionCount(userId: string): Promise<number> {
    const cached = await CacheManager.get<number>(
      CacheKeys.userPushSubscriptionCount(userId)
    );

    if (cached !== null) {
      return cached;
    }

    const count = await prisma.pushSubscription.count({
      where: {
        userId,
        isActive: true,
      },
    });

    await CacheManager.set(
      CacheKeys.userPushSubscriptionCount(userId),
      count,
      3600
    );

    return count;
  }

  /**
   * Clean up expired subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<void> {
    try {
      const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const result = await prisma.pushSubscription.deleteMany({
        where: {
          isActive: false,
          updatedAt: {
            lt: expiredDate,
          },
        },
      });

      logger.info('Cleaned up expired push subscriptions', { count: result.count });

    } catch (error) {
      logger.error('Failed to cleanup expired push subscriptions', error);
    }
  }

  /**
   * Test push notification for debugging
   */
  async sendTestNotification(userId: string): Promise<void> {
    await this.sendToUser(userId, {
      title: 'CastMatch Test Notification',
      body: 'This is a test push notification from CastMatch!',
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'test',
        url: '/dashboard',
      },
      actions: [
        { action: 'view', title: 'View Dashboard' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: false,
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();