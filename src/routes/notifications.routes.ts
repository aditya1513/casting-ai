/**
 * Notification Routes
 * API endpoints for managing notifications, preferences, and push subscriptions
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { notificationService, NotificationType, NotificationChannel, NotificationPriority } from '../services/notification.service';
import { pushNotificationService } from '../services/push-notification.service';
import { communicationWorkflowService } from '../services/communication-workflow.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const notificationPreferencesSchema = z.object({
  channels: z.record(z.boolean()).optional(),
  types: z.record(z.object({
    enabled: z.boolean(),
    channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  })).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
  }).optional(),
  frequency: z.object({
    digest: z.boolean(),
    digestInterval: z.enum(['daily', 'weekly', 'monthly']),
    realTime: z.boolean(),
  }).optional(),
});

const sendNotificationSchema = z.object({
  userId: z.string(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
  actionUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
});

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      types,
    } = req.query;

    const typeArray = types ? (Array.isArray(types) ? types : [types]) : [];
    
    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      unreadOnly: unreadOnly === 'true',
      types: typeArray as NotificationType[],
    });

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error('Failed to get user notifications', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications',
    });
  }
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await notificationService.markAsRead(userId, id);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });

  } catch (error) {
    logger.error('Failed to mark notification as read', { 
      error, 
      userId: req.user.id,
      notificationId: req.params.id 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });

  } catch (error) {
    logger.error('Failed to mark all notifications as read', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
    });
  }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // This would typically get from the notification service
    // For now, return default preferences
    const preferences = {
      channels: {
        in_app: true,
        email: true,
        sms: false,
        push: true,
        websocket: true,
      },
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

    res.json({
      success: true,
      data: preferences,
    });

  } catch (error) {
    logger.error('Failed to get notification preferences', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification preferences',
    });
  }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', 
  authMiddleware, 
  validate(notificationPreferencesSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      await notificationService.updateUserPreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: preferences,
      });

    } catch (error) {
      logger.error('Failed to update notification preferences', { 
        error, 
        userId: req.user.id,
        preferences: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
      });
    }
  }
);

/**
 * Subscribe to push notifications
 * POST /api/notifications/push/subscribe
 */
router.post('/push/subscribe',
  authMiddleware,
  validate(pushSubscriptionSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const subscription = req.body;

      await pushNotificationService.subscribe(userId, subscription);

      res.json({
        success: true,
        message: 'Successfully subscribed to push notifications',
      });

    } catch (error) {
      logger.error('Failed to subscribe to push notifications', { 
        error, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to subscribe to push notifications',
      });
    }
  }
);

/**
 * Unsubscribe from push notifications
 * POST /api/notifications/push/unsubscribe
 */
router.post('/push/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required',
      });
    }

    await pushNotificationService.unsubscribe(userId, endpoint);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });

  } catch (error) {
    logger.error('Failed to unsubscribe from push notifications', { 
      error, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from push notifications',
    });
  }
});

/**
 * Get VAPID public key for push subscription
 * GET /api/notifications/push/vapid-key
 */
router.get('/push/vapid-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();

    if (!publicKey) {
      return res.status(503).json({
        success: false,
        error: 'Push notifications not configured',
      });
    }

    res.json({
      success: true,
      data: {
        publicKey,
      },
    });

  } catch (error) {
    logger.error('Failed to get VAPID public key', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get VAPID public key',
    });
  }
});

/**
 * Send test notification (admin only)
 * POST /api/notifications/test
 */
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Send test push notification
    await pushNotificationService.sendTestNotification(userId);

    // Send test in-app notification
    await notificationService.sendNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title: 'Test Notification',
      message: 'This is a test notification from CastMatch!',
      channels: [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
      priority: NotificationPriority.NORMAL,
    });

    res.json({
      success: true,
      message: 'Test notifications sent successfully',
    });

  } catch (error) {
    logger.error('Failed to send test notification', { error, userId: req.user.id });
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
    });
  }
});

/**
 * Trigger communication workflow (admin only)
 * POST /api/notifications/workflow
 */
router.post('/workflow',
  authMiddleware,
  async (req, res) => {
    try {
      const { userId, workflowType, data } = req.body;

      if (!userId || !workflowType) {
        return res.status(400).json({
          success: false,
          error: 'userId and workflowType are required',
        });
      }

      // Trigger appropriate workflow based on type
      switch (workflowType) {
        case 'welcome':
          await communicationWorkflowService.sendWelcomeEmail(userId, data?.verificationUrl);
          break;
        case 'password-reset':
          await communicationWorkflowService.sendPasswordResetEmail(
            userId,
            data?.resetUrl,
            data?.expiryHours
          );
          break;
        case 'email-verification':
          await communicationWorkflowService.sendEmailVerification(userId, data?.verificationUrl);
          break;
        case 'profile-completion':
          await communicationWorkflowService.sendProfileCompletionReminder(userId);
          break;
        case 'onboarding':
          await communicationWorkflowService.startOnboardingSequence(userId);
          break;
        case 'oauth-integration':
          await communicationWorkflowService.sendOAuthIntegrationNotification(
            userId,
            data?.provider,
            data?.providerData
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid workflow type',
          });
      }

      res.json({
        success: true,
        message: `${workflowType} workflow triggered successfully`,
      });

    } catch (error) {
      logger.error('Failed to trigger workflow', { 
        error, 
        workflowType: req.body.workflowType,
        userId: req.body.userId 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger workflow',
      });
    }
  }
);

export default router;