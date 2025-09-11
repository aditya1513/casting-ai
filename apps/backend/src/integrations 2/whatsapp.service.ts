/**
 * WhatsApp Business API Integration Service
 * Critical for Mumbai market - WhatsApp is the primary communication channel in India
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import crypto from 'crypto';

export interface WhatsAppMessage {
  to: string; // Phone number with country code (91 for India)
  type: 'text' | 'template' | 'media' | 'interactive' | 'location';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string; // 'hi' for Hindi, 'en' for English
    };
    components?: Array<{
      type: 'header' | 'body' | 'footer' | 'button';
      parameters?: Array<{
        type: 'text' | 'currency' | 'date_time';
        text?: string;
        currency?: { fallback_value: string; code: string; amount_1000: number };
        date_time?: { fallback_value: string };
      }>;
    }>;
  };
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
  };
  interactive?: {
    type: 'button' | 'list';
    header?: { type: 'text' | 'image' | 'video'; text?: string; image?: { link: string }; };
    body: { text: string };
    footer?: { text: string };
    action: {
      buttons?: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  context?: {
    message_id: string; // Reply to specific message
  };
}

export interface WhatsAppWebhook {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          context?: { from: string; id: string };
          text?: { body: string };
          image?: { mime_type: string; sha256: string; id: string };
          audio?: { mime_type: string; sha256: string; id: string; voice: boolean };
          video?: { mime_type: string; sha256: string; id: string };
          document?: { mime_type: string; sha256: string; id: string; filename: string };
          interactive?: {
            type: 'button_reply' | 'list_reply';
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description: string };
          };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{ code: number; title: string; message: string }>;
        }>;
      };
      field: 'messages';
    }>;
  }>;
}

interface WhatsAppTemplateData {
  name: string;
  language: string;
  components?: Record<string, any>[];
}

// WhatsApp templates for Mumbai casting industry
const WHATSAPP_TEMPLATES = {
  AUDITION_REMINDER_HINDI: {
    name: 'audition_reminder_hindi',
    language: 'hi',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{talent_name}}' },
          { type: 'text', text: '{{project_name}}' },
          { type: 'text', text: '{{audition_date}}' },
          { type: 'text', text: '{{audition_time}}' },
          { type: 'text', text: '{{location}}' }
        ]
      }
    ]
  },
  AUDITION_REMINDER_ENGLISH: {
    name: 'audition_reminder_english',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{talent_name}}' },
          { type: 'text', text: '{{project_name}}' },
          { type: 'text', text: '{{audition_date}}' },
          { type: 'text', text: '{{audition_time}}' },
          { type: 'text', text: '{{location}}' }
        ]
      }
    ]
  },
  CASTING_OPPORTUNITY: {
    name: 'casting_opportunity',
    language: 'hi_IN',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{project_name}}' },
          { type: 'text', text: '{{role_description}}' },
          { type: 'text', text: '{{requirements}}' }
        ]
      }
    ]
  },
  BOOKING_CONFIRMATION: {
    name: 'booking_confirmation',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{talent_name}}' },
          { type: 'text', text: '{{project_name}}' },
          { type: 'text', text: '{{shoot_date}}' },
          { type: 'text', text: '{{location}}' }
        ]
      }
    ]
  },
  OTP_VERIFICATION: {
    name: 'otp_verification',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{otp_code}}' },
          { type: 'text', text: '{{expiry_minutes}}' }
        ]
      }
    ]
  }
};

export class WhatsAppService {
  private axiosInstance: AxiosInstance;
  private phoneNumberId: string;
  private accessToken: string;
  private webhookVerifyToken: string;
  private messageQueue: Queue<WhatsAppMessage & { metadata?: any }>;
  private redis: Redis;
  private isInitialized: boolean = false;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    // Initialize Axios instance
    this.axiosInstance = axios.create({
      baseURL: `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Initialize message queue
    this.messageQueue = new Bull('whatsapp-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    // Process message queue
    this.processQueue();

    this.initialize();
  }

  private async initialize() {
    if (this.phoneNumberId && this.accessToken) {
      this.isInitialized = true;
      logger.info('WhatsApp Business API service initialized for Mumbai market');
    } else {
      logger.warn('WhatsApp credentials not provided. Messages will be logged only.');
    }
  }

  private processQueue() {
    this.messageQueue.process(async (job: Job<WhatsAppMessage & { metadata?: any }>) => {
      const { data } = job;
      logger.info(`Processing WhatsApp message job ${job.id}:`, {
        to: data.to,
        type: data.type,
      });

      try {
        const result = await this.sendImmediate(data);
        return result;
      } catch (error: any) {
        logger.error(`WhatsApp job ${job.id} failed:`, error);
        
        // Store failed message for manual retry
        await this.logFailedMessage(data, error.message);
        throw error;
      }
    });

    // Queue event listeners
    this.messageQueue.on('completed', (job: Job, result: any) => {
      logger.info(`WhatsApp job ${job.id} completed:`, result);
    });

    this.messageQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`WhatsApp job ${job.id} failed after all attempts:`, err);
    });
  }

  /**
   * Queue a WhatsApp message for sending
   */
  async queueMessage(message: WhatsAppMessage, priority?: number): Promise<Job> {
    // Validate phone number for Indian market
    if (!this.isValidIndianPhoneNumber(message.to)) {
      throw new Error(`Invalid Indian phone number: ${message.to}`);
    }

    // Check rate limits (WhatsApp Business has strict limits)
    const rateLimitKey = `whatsapp:ratelimit:${message.to}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, 86400); // 24 hours window
    }

    // WhatsApp Business limit: 1000 messages per 24h per recipient for non-template messages
    if (count > 1000 && message.type !== 'template') {
      throw new Error('WhatsApp rate limit exceeded for recipient');
    }

    const job = await this.messageQueue.add(message, {
      priority: priority || 50,
    });

    logger.info(`WhatsApp message queued with job ID ${job.id}`);
    return job;
  }

  /**
   * Send WhatsApp message immediately
   */
  async sendImmediate(message: WhatsAppMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isInitialized) {
      return await this.simulateMessage(message);
    }

    try {
      const response = await this.axiosInstance.post('/messages', message);
      
      const messageId = response.data.messages?.[0]?.id;
      
      // Log successful message
      await this.logMessageActivity(message, {
        success: true,
        messageId,
        timestamp: new Date(),
      });

      logger.info(`WhatsApp message sent successfully:`, { messageId, to: message.to });
      
      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error('WhatsApp message failed:', error);
      
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      // Log failed message
      await this.logMessageActivity(message, {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send templated message (for notifications outside 24h window)
   */
  async sendTemplate(
    to: string,
    templateData: WhatsAppTemplateData,
    parameters: Record<string, string> = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = WHATSAPP_TEMPLATES[templateData.name as keyof typeof WHATSAPP_TEMPLATES];
    if (!template) {
      throw new Error(`Template ${templateData.name} not found`);
    }

    // Process template parameters
    const components = template.components?.map(component => {
      if (component.type === 'body' && component.parameters) {
        return {
          ...component,
          parameters: component.parameters.map((param: any) => {
            const key = param.text.replace(/[{}]/g, '');
            return {
              ...param,
              text: parameters[key] || param.text,
            };
          }),
        };
      }
      return component;
    });

    const message: WhatsAppMessage = {
      to,
      type: 'template',
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
        components,
      },
    };

    return await this.sendImmediate(message);
  }

  /**
   * Send audition reminder in Hindi/English based on user preference
   */
  async sendAuditionReminder(
    phoneNumber: string,
    data: {
      talentName: string;
      projectName: string;
      auditionDate: string;
      auditionTime: string;
      location: string;
      language: 'hi' | 'en';
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const templateName = data.language === 'hi' ? 'AUDITION_REMINDER_HINDI' : 'AUDITION_REMINDER_ENGLISH';
    
    return await this.sendTemplate(phoneNumber, {
      name: templateName,
      language: data.language === 'hi' ? 'hi' : 'en',
    }, {
      talent_name: data.talentName,
      project_name: data.projectName,
      audition_date: data.auditionDate,
      audition_time: data.auditionTime,
      location: data.location,
    });
  }

  /**
   * Send interactive button message for quick responses
   */
  async sendInteractiveButtons(
    to: string,
    headerText: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    footerText?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message: WhatsAppMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: headerText,
        },
        body: {
          text: bodyText,
        },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    };

    return await this.sendImmediate(message);
  }

  /**
   * Send OTP via WhatsApp
   */
  async sendOTP(phoneNumber: string, otp: string, expiryMinutes: number = 10): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    return await this.sendTemplate(phoneNumber, {
      name: 'OTP_VERIFICATION',
      language: 'en',
    }, {
      otp_code: otp,
      expiry_minutes: expiryMinutes.toString(),
    });
  }

  /**
   * Send media message (images, videos, documents)
   */
  async sendMedia(
    to: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    mediaUrl: string,
    caption?: string,
    filename?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message: WhatsAppMessage = {
      to,
      type: 'media',
      media: {
        type: mediaType,
        link: mediaUrl,
        caption,
        filename,
      },
    };

    return await this.sendImmediate(message);
  }

  /**
   * Send location (for audition venues in Mumbai)
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message: WhatsAppMessage = {
      to,
      type: 'location',
      location: {
        latitude,
        longitude,
        name,
        address,
      },
    };

    return await this.sendImmediate(message);
  }

  /**
   * Handle WhatsApp webhook verification
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      logger.info('WhatsApp webhook verified successfully');
      return challenge;
    }
    return null;
  }

  /**
   * Process incoming WhatsApp webhook
   */
  async processWebhook(webhook: WhatsAppWebhook): Promise<void> {
    try {
      for (const entry of webhook.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const { value } = change;
            
            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await this.handleIncomingMessage(message, value.metadata);
              }
            }

            // Process message statuses
            if (value.statuses) {
              for (const status of value.statuses) {
                await this.handleMessageStatus(status);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: any, metadata: any): Promise<void> {
    logger.info('Received WhatsApp message:', {
      from: message.from,
      type: message.type,
      messageId: message.id,
    });

    // Store incoming message
    const incomingMessage = {
      messageId: message.id,
      from: message.from,
      to: metadata.phone_number_id,
      type: message.type,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      content: message.text?.body || message.interactive || message.image || message.audio || message.video || message.document,
      context: message.context,
    };

    await this.redis.setex(
      `whatsapp:incoming:${message.id}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(incomingMessage)
    );

    // Handle different message types
    switch (message.type) {
      case 'text':
        await this.handleTextMessage(message.from, message.text.body);
        break;
      case 'interactive':
        await this.handleInteractiveMessage(message.from, message.interactive);
        break;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        await this.handleMediaMessage(message.from, message);
        break;
    }
  }

  /**
   * Handle message delivery status
   */
  private async handleMessageStatus(status: any): Promise<void> {
    logger.info('WhatsApp message status update:', {
      messageId: status.id,
      status: status.status,
      recipientId: status.recipient_id,
    });

    // Update message status in database/cache
    const statusUpdate = {
      messageId: status.id,
      status: status.status,
      timestamp: new Date(parseInt(status.timestamp) * 1000),
      recipientId: status.recipient_id,
      errors: status.errors,
    };

    await this.redis.setex(
      `whatsapp:status:${status.id}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(statusUpdate)
    );
  }

  /**
   * Handle text message replies
   */
  private async handleTextMessage(from: string, text: string): Promise<void> {
    // Auto-respond to common queries in Hindi/English
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('audition') || lowerText.includes('ऑडिशन')) {
      await this.sendImmediate({
        to: from,
        type: 'text',
        text: {
          body: 'Thank you for your message about auditions. Our team will get back to you soon. / ऑडिशन के बारे में आपके संदेश के लिए धन्यवाद। हमारी टीम जल्द ही आपसे संपर्क करेगी।',
        },
      });
    }
    
    // Log for human review
    await this.redis.setex(
      `whatsapp:text:${from}:${Date.now()}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify({ from, text, timestamp: new Date() })
    );
  }

  /**
   * Handle interactive message responses
   */
  private async handleInteractiveMessage(from: string, interactive: any): Promise<void> {
    const responseId = interactive.button_reply?.id || interactive.list_reply?.id;
    const responseTitle = interactive.button_reply?.title || interactive.list_reply?.title;

    logger.info('Interactive response received:', { from, responseId, responseTitle });

    // Process specific responses
    switch (responseId) {
      case 'confirm_audition':
        await this.handleAuditionConfirmation(from, true);
        break;
      case 'reschedule_audition':
        await this.handleAuditionReschedule(from);
        break;
      case 'cancel_audition':
        await this.handleAuditionConfirmation(from, false);
        break;
    }
  }

  /**
   * Handle media messages (profile photos, portfolios, etc.)
   */
  private async handleMediaMessage(from: string, media: any): Promise<void> {
    logger.info('Media message received:', { from, type: media.type, mediaId: media.id });
    
    // Download and process media if needed
    // This would integrate with your file storage service
    
    // Send confirmation
    await this.sendImmediate({
      to: from,
      type: 'text',
      text: {
        body: 'Thank you for sharing the media. We have received it successfully. / मीडिया साझा करने के लिए धन्यवाद। हमें यह सफलतापूर्वक प्राप्त हुआ है।',
      },
    });
  }

  /**
   * Handle audition confirmation
   */
  private async handleAuditionConfirmation(from: string, confirmed: boolean): Promise<void> {
    const message = confirmed 
      ? 'Great! Your audition is confirmed. We look forward to seeing you. / बेहतरीन! आपका ऑडिशन कन्फर्म है। हम आपको देखने के लिए उत्सुक हैं।'
      : 'We understand. Your audition has been cancelled. Feel free to apply for other opportunities. / हम समझते हैं। आपका ऑडिशन रद्द कर दिया गया है। अन्य अवसरों के लिए आवेदन करने में संकोच न करें।';

    await this.sendImmediate({
      to: from,
      type: 'text',
      text: { body: message },
    });

    // Update database with confirmation status
    await this.redis.setex(
      `audition:confirmation:${from}`,
      7 * 24 * 60 * 60,
      JSON.stringify({ confirmed, timestamp: new Date() })
    );
  }

  /**
   * Handle audition reschedule request
   */
  private async handleAuditionReschedule(from: string): Promise<void> {
    await this.sendImmediate({
      to: from,
      type: 'text',
      text: {
        body: 'Our casting coordinator will contact you shortly to reschedule your audition. / हमारे कास्टिंग कॉर्डिनेटर आपके ऑडिशन को रीशेड्यूल करने के लिए जल्द ही आपसे संपर्क करेंगे।',
      },
    });

    // Notify casting team
    await this.redis.setex(
      `audition:reschedule:${from}`,
      7 * 24 * 60 * 60,
      JSON.stringify({ requestTime: new Date() })
    );
  }

  /**
   * Validate Indian phone number
   */
  private isValidIndianPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Indian mobile numbers: +91 followed by 10 digits
    // Format: 91XXXXXXXXXX (total 12 digits)
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      const mobileNumber = cleaned.substring(2);
      // Indian mobile numbers start with 6, 7, 8, or 9
      return /^[6-9]\d{9}$/.test(mobileNumber);
    }
    
    // Alternative format: 10 digits starting with 6-9
    if (cleaned.length === 10) {
      return /^[6-9]\d{9}$/.test(cleaned);
    }
    
    return false;
  }

  /**
   * Simulate message sending for testing
   */
  private async simulateMessage(message: WhatsAppMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    logger.info('Simulating WhatsApp message:', {
      to: message.to,
      type: message.type,
      body: message.text?.body?.substring(0, 50) + '...',
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      messageId: `simulated-wa-${Date.now()}`,
    };
  }

  /**
   * Log message activity
   */
  private async logMessageActivity(message: WhatsAppMessage, result: any): Promise<void> {
    const activity = {
      to: message.to,
      type: message.type,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      timestamp: result.timestamp,
    };

    await this.redis.setex(
      `whatsapp:activity:${Date.now()}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(activity)
    );
  }

  /**
   * Log failed message for manual retry
   */
  private async logFailedMessage(message: WhatsAppMessage, error: string): Promise<void> {
    const failed = {
      message,
      error,
      timestamp: new Date(),
    };

    await this.redis.setex(
      `whatsapp:failed:${Date.now()}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(failed)
    );
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const jobCounts = await this.messageQueue.getJobCounts();
    return {
      waiting: jobCounts.waiting,
      active: jobCounts.active,
      completed: jobCounts.completed,
      failed: jobCounts.failed,
      delayed: jobCounts.delayed,
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(days: number = 30): Promise<{
    total: number;
    successful: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const keys = await this.redis.keys('whatsapp:activity:*');
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    let total = 0;
    let successful = 0;
    let failed = 0;
    const byType: Record<string, number> = {};

    for (const key of keys) {
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp < cutoff) continue;

      const data = await this.redis.get(key);
      if (!data) continue;

      const activity = JSON.parse(data);
      total++;
      
      if (activity.success) {
        successful++;
      } else {
        failed++;
      }

      byType[activity.type] = (byType[activity.type] || 0) + 1;
    }

    return { total, successful, failed, byType };
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();

// Export templates
export { WHATSAPP_TEMPLATES };