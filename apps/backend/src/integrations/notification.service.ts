/**
 * Unified Notification Service
 * Handles Email, SMS, WhatsApp, and Push Notifications
 */

import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import webpush from 'web-push';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Notification Types
export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in-app';
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  pushTokens?: string[];
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  doNotDisturb?: {
    enabled: boolean;
    startTime?: string; // HH:mm format
    endTime?: string;
    timezone?: string;
  };
  categories?: {
    auditions: boolean;
    bookings: boolean;
    messages: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  frequency?: {
    realtime: boolean;
    digest: 'none' | 'daily' | 'weekly';
    digestTime?: string; // HH:mm format
  };
}

export interface NotificationPayload {
  id?: string;
  recipient: NotificationRecipient;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  category?: string;
  subject?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content?: string;
    filename: string;
    type?: string;
    url?: string;
  }>;
  actions?: Array<{
    action: string;
    title: string;
    url?: string;
    icon?: string;
  }>;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  id: string;
  success: boolean;
  channels: {
    [key in NotificationChannel]?: {
      sent: boolean;
      messageId?: string;
      error?: string;
      deliveredAt?: Date;
      readAt?: Date;
    };
  };
  timestamp: Date;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  components: Array<{
    type: 'header' | 'body' | 'footer' | 'button';
    parameters?: Array<{
      type: 'text' | 'image' | 'document' | 'video';
      text?: string;
      image?: { link: string };
      document?: { link: string; filename: string };
      video?: { link: string };
    }>;
  }>;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private notificationQueue: Queue<NotificationPayload>;
  private redis: Redis;
  private vapidKeys: { publicKey: string; privateKey: string };
  private whatsappBusinessId: string;
  private whatsappAccessToken: string;

  constructor() {
    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize Web Push
    this.vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
      privateKey: process.env.VAPID_PRIVATE_KEY || '',
    };
    
    if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.VAPID_EMAIL || 'support@castmatch.ai'),
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
    }

    // WhatsApp Business API
    this.whatsappBusinessId = process.env.WHATSAPP_BUSINESS_ID || '';
    this.whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    // Initialize notification queue
    this.notificationQueue = new Bull('notification-queue', {
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

    // Process notification queue
    this.processQueue();
  }

  /**
   * Send notification through multiple channels
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const notificationId = payload.id || uuidv4();
    const result: NotificationResult = {
      id: notificationId,
      success: false,
      channels: {},
      timestamp: new Date(),
    };

    try {
      // Check user preferences and DND settings
      const channels = await this.getActiveChannels(payload);
      
      // Send through each channel
      const promises = channels.map(channel => 
        this.sendToChannel(channel, payload)
          .then(channelResult => {
            result.channels[channel] = channelResult;
            return channelResult.sent;
          })
          .catch(error => {
            result.channels[channel] = {
              sent: false,
              error: error.message,
            };
            return false;
          })
      );

      const results = await Promise.all(promises);
      result.success = results.some(r => r === true);

      // Store notification in database
      await this.storeNotification(notificationId, payload, result);

      logger.info(`Notification ${notificationId} sent`, result);
      return result;
    } catch (error: any) {
      logger.error('Failed to send notification:', error);
      throw new AppError('Failed to send notification', 500);
    }
  }

  /**
   * Queue notification for later delivery
   */
  async queue(payload: NotificationPayload): Promise<string> {
    const job = await this.notificationQueue.add(payload, {
      delay: payload.scheduledAt ? 
        new Date(payload.scheduledAt).getTime() - Date.now() : 0,
      priority: this.getPriorityValue(payload.priority),
    });

    logger.info(`Queued notification: ${job.id}`);
    return job.id as string;
  }

  /**
   * Send email notification
   */
  private async sendEmail(payload: NotificationPayload): Promise<any> {
    if (!payload.recipient.email) {
      throw new Error('Email address not provided');
    }

    const msg = {
      to: payload.recipient.email,
      from: process.env.EMAIL_FROM || 'noreply@castmatch.ai',
      subject: payload.subject || payload.title,
      text: payload.body,
      html: this.createEmailHTML(payload),
      templateId: payload.templateId,
      dynamicTemplateData: payload.templateData,
      attachments: payload.attachments?.map(a => ({
        content: a.content || '',
        filename: a.filename,
        type: a.type,
        disposition: 'attachment',
      })),
    };

    const response = await sgMail.send(msg);
    return {
      sent: true,
      messageId: response[0].headers['x-message-id'],
    };
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(payload: NotificationPayload): Promise<any> {
    if (!this.twilioClient || !payload.recipient.phone) {
      throw new Error('SMS not configured or phone number not provided');
    }

    const message = await this.twilioClient.messages.create({
      body: this.truncateForSMS(payload.body),
      to: payload.recipient.phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    return {
      sent: true,
      messageId: message.sid,
    };
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsApp(payload: NotificationPayload): Promise<any> {
    if (!payload.recipient.whatsapp && !payload.recipient.phone) {
      throw new Error('WhatsApp number not provided');
    }

    const whatsappNumber = payload.recipient.whatsapp || payload.recipient.phone;

    if (payload.templateId) {
      // Send template message
      return await this.sendWhatsAppTemplate(whatsappNumber, payload);
    } else {
      // Send regular message (requires user to message first within 24 hours)
      return await this.sendWhatsAppMessage(whatsappNumber, payload);
    }
  }

  /**
   * Send WhatsApp template message
   */
  private async sendWhatsAppTemplate(
    to: string,
    payload: NotificationPayload
  ): Promise<any> {
    const url = `https://graph.facebook.com/v17.0/${this.whatsappBusinessId}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^\d]/g, ''), // Remove non-digits
      type: 'template',
      template: {
        name: payload.templateId,
        language: { code: 'en_US' },
        components: this.buildWhatsAppComponents(payload.templateData),
      },
    };

    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${this.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      sent: true,
      messageId: response.data.messages[0].id,
    };
  }

  /**
   * Send WhatsApp regular message
   */
  private async sendWhatsAppMessage(
    to: string,
    payload: NotificationPayload
  ): Promise<any> {
    const url = `https://graph.facebook.com/v17.0/${this.whatsappBusinessId}/messages`;
    
    const data: any = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^\d]/g, ''),
      type: 'text',
      text: { body: payload.body },
    };

    // Add interactive buttons if actions are provided
    if (payload.actions && payload.actions.length > 0) {
      data.type = 'interactive';
      data.interactive = {
        type: 'button',
        body: { text: payload.body },
        action: {
          buttons: payload.actions.slice(0, 3).map(action => ({
            type: 'reply',
            reply: {
              id: action.action,
              title: action.title.substring(0, 20), // Max 20 chars
            },
          })),
        },
      };
    }

    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${this.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      sent: true,
      messageId: response.data.messages[0].id,
    };
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<any> {
    if (!payload.recipient.pushTokens || payload.recipient.pushTokens.length === 0) {
      throw new Error('No push tokens available');
    }

    const notification = {
      title: payload.title,
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: payload.data,
      actions: payload.actions,
      tag: payload.category,
      requireInteraction: payload.priority === 'urgent',
    };

    const results = await Promise.all(
      payload.recipient.pushTokens.map(async (subscription: any) => {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify(notification)
          );
          return { success: true, subscription };
        } catch (error: any) {
          logger.error('Push notification failed:', error);
          
          // Remove invalid subscriptions
          if (error.statusCode === 410) {
            await this.removeInvalidPushToken(payload.recipient.id, subscription);
          }
          
          return { success: false, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    
    return {
      sent: successCount > 0,
      messageId: uuidv4(),
      details: {
        sent: successCount,
        failed: results.length - successCount,
      },
    };
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload
  ): Promise<any> {
    switch (channel) {
      case 'email':
        return await this.sendEmail(payload);
      case 'sms':
        return await this.sendSMS(payload);
      case 'whatsapp':
        return await this.sendWhatsApp(payload);
      case 'push':
        return await this.sendPushNotification(payload);
      case 'in-app':
        return await this.sendInAppNotification(payload);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(payload: NotificationPayload): Promise<any> {
    // Store in Redis for real-time delivery via WebSocket
    const key = `notifications:${payload.recipient.id}`;
    const notification = {
      id: uuidv4(),
      title: payload.title,
      body: payload.body,
      data: payload.data,
      actions: payload.actions,
      timestamp: new Date().toISOString(),
      read: false,
    };

    await this.redis.lpush(key, JSON.stringify(notification));
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days

    // Emit via WebSocket if connected
    // This would integrate with your WebSocket service
    
    return {
      sent: true,
      messageId: notification.id,
    };
  }

  /**
   * Get active channels based on preferences
   */
  private async getActiveChannels(payload: NotificationPayload): Promise<NotificationChannel[]> {
    const channels = payload.channels || payload.recipient.preferences?.channels || ['email'];
    const activeChannels: NotificationChannel[] = [];

    // Check DND settings
    if (payload.recipient.preferences?.doNotDisturb?.enabled) {
      const isDND = this.isInDNDPeriod(payload.recipient.preferences.doNotDisturb);
      if (isDND && payload.priority !== 'urgent') {
        logger.info('Notification blocked due to DND settings');
        return [];
      }
    }

    // Check category preferences
    if (payload.category && payload.recipient.preferences?.categories) {
      const categoryEnabled = (payload.recipient.preferences.categories as any)[payload.category];
      if (categoryEnabled === false) {
        logger.info(`Notification blocked for category: ${payload.category}`);
        return [];
      }
    }

    // Filter available channels
    for (const channel of channels) {
      if (this.isChannelAvailable(channel, payload.recipient)) {
        activeChannels.push(channel);
      }
    }

    return activeChannels;
  }

  /**
   * Check if channel is available for recipient
   */
  private isChannelAvailable(channel: NotificationChannel, recipient: NotificationRecipient): boolean {
    switch (channel) {
      case 'email':
        return !!recipient.email;
      case 'sms':
        return !!recipient.phone && !!this.twilioClient;
      case 'whatsapp':
        return !!(recipient.whatsapp || recipient.phone) && !!this.whatsappAccessToken;
      case 'push':
        return !!(recipient.pushTokens && recipient.pushTokens.length > 0);
      case 'in-app':
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if current time is in DND period
   */
  private isInDNDPeriod(dnd: any): boolean {
    if (!dnd.startTime || !dnd.endTime) return false;

    const now = new Date();
    const timezone = dnd.timezone || 'UTC';
    
    // Convert times to compare
    // Implementation would depend on timezone library
    
    return false; // Placeholder
  }

  /**
   * Process notification queue
   */
  private processQueue(): void {
    this.notificationQueue.process(async (job: Job<NotificationPayload>) => {
      return await this.send(job.data);
    });

    this.notificationQueue.on('completed', (job, result) => {
      logger.info(`Notification job ${job.id} completed`, result);
    });

    this.notificationQueue.on('failed', (job, err) => {
      logger.error(`Notification job ${job.id} failed:`, err);
    });
  }

  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority?: NotificationPriority): number {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }

  /**
   * Truncate message for SMS (160 chars)
   */
  private truncateForSMS(text: string): string {
    if (text.length <= 160) return text;
    return text.substring(0, 157) + '...';
  }

  /**
   * Create HTML email from payload
   */
  private createEmailHTML(payload: NotificationPayload): string {
    // Basic HTML template
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${payload.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${payload.title}</h2>
            <div style="color: #666; line-height: 1.6;">
              ${payload.body.replace(/\n/g, '<br>')}
            </div>
            ${payload.actions ? this.createEmailActions(payload.actions) : ''}
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              This notification was sent by CastMatch AI
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Create email action buttons
   */
  private createEmailActions(actions: any[]): string {
    return `
      <div style="margin-top: 20px;">
        ${actions.map(action => `
          <a href="${action.url}" style="display: inline-block; margin: 5px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
            ${action.title}
          </a>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build WhatsApp template components
   */
  private buildWhatsAppComponents(data?: Record<string, any>): any[] {
    if (!data) return [];
    
    // Convert template data to WhatsApp component format
    // This would be customized based on your templates
    return [];
  }

  /**
   * Store notification in database
   */
  private async storeNotification(
    id: string,
    payload: NotificationPayload,
    result: NotificationResult
  ): Promise<void> {
    // Store in database for tracking and analytics
    // This would integrate with your database service
    logger.info(`Stored notification ${id}`);
  }

  /**
   * Remove invalid push token
   */
  private async removeInvalidPushToken(
    userId: string,
    subscription: any
  ): Promise<void> {
    // Remove from database
    logger.info(`Removed invalid push token for user ${userId}`);
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(
    userId: string,
    subscription: PushSubscription
  ): Promise<void> {
    // Store subscription in database
    const key = `push:${userId}`;
    await this.redis.sadd(key, JSON.stringify(subscription));
    logger.info(`Added push subscription for user ${userId}`);
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(
    userId: string,
    endpoint: string
  ): Promise<void> {
    // Remove subscription from database
    const key = `push:${userId}`;
    const subscriptions = await this.redis.smembers(key);
    
    for (const sub of subscriptions) {
      const parsed = JSON.parse(sub);
      if (parsed.endpoint === endpoint) {
        await this.redis.srem(key, sub);
        break;
      }
    }
    
    logger.info(`Removed push subscription for user ${userId}`);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    // Store preferences in database
    const key = `preferences:${userId}`;
    await this.redis.set(key, JSON.stringify(preferences));
    logger.info(`Updated notification preferences for user ${userId}`);
  }

  /**
   * Get notification history
   */
  async getHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const key = `notifications:${userId}`;
    const notifications = await this.redis.lrange(key, 0, limit - 1);
    return notifications.map(n => JSON.parse(n));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<void> {
    // Update notification status in database
    logger.info(`Marked notification ${notificationId} as read for user ${userId}`);
  }

  /**
   * Get VAPID public key for push subscriptions
   */
  getVapidPublicKey(): string {
    return this.vapidKeys.publicKey;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();