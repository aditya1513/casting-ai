import twilio from 'twilio';
import { logger } from '../utils/logger';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';

/**
 * SMS Service Integration with Twilio
 * Handles OTP, notifications, and urgent alerts
 */

export interface SMSOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  type?: 'otp' | 'notification' | 'alert' | 'marketing';
  maxRetries?: number;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
  timestamp: Date;
  cost?: number;
}

export interface OTPOptions {
  phoneNumber: string;
  length?: number;
  expiryMinutes?: number;
  template?: string;
}

export interface OTPVerifyOptions {
  phoneNumber: string;
  code: string;
}

// SMS Templates
const SMS_TEMPLATES = {
  OTP: {
    id: 'otp',
    template: 'Your CastMatch verification code is: {{code}}. This code expires in {{expiry}} minutes.',
  },
  AUDITION_REMINDER: {
    id: 'audition_reminder',
    template: 'CastMatch: Reminder - Your audition for {{project}} is tomorrow at {{time}}. Location: {{location}}',
  },
  URGENT_NOTIFICATION: {
    id: 'urgent_notification',
    template: 'CastMatch URGENT: {{message}}',
  },
  BOOKING_CONFIRMATION: {
    id: 'booking_confirmation',
    template: 'CastMatch: You\'re booked! {{project}} on {{date}}. Check your email for details.',
  },
  SCHEDULE_CHANGE: {
    id: 'schedule_change',
    template: 'CastMatch: Schedule change for {{project}}. New time: {{time}}. Reply CONFIRM to accept.',
  },
};

class SMSService {
  private twilioClient: twilio.Twilio | null = null;
  private smsQueue: Queue<SMSOptions>;
  private redis: Redis;
  private phoneNumber: string;
  private isInitialized: boolean = false;
  private otpCache: Map<string, { code: string; expiry: Date; attempts: number }> = new Map();

  constructor() {
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    // Initialize SMS queue
    this.smsQueue = new Bull('sms-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
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

    // Initialize Twilio
    this.initializeTwilio();

    // Process SMS queue
    this.processQueue();

    // Clean expired OTPs periodically
    setInterval(() => this.cleanExpiredOTPs(), 60000); // Every minute
  }

  private initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.isInitialized = true;
        logger.info('Twilio SMS service initialized');
      } catch (error: any) {
        logger.error('Failed to initialize Twilio:', error);
      }
    } else {
      logger.warn('Twilio credentials not provided. SMS sending will be simulated.');
    }
  }

  private processQueue() {
    this.smsQueue.process(async (job: Job<SMSOptions>) => {
      const { data } = job;
      logger.info(`Processing SMS job ${job.id}:`, {
        to: data.to,
        type: data.type,
        priority: data.priority,
      });

      try {
        const result = await this.sendImmediate(data);
        if (!result.success) {
          throw new Error(result.error || 'SMS sending failed');
        }
        return result;
      } catch (error: any) {
        logger.error(`SMS job ${job.id} failed:`, error);
        
        // Retry with exponential backoff for urgent messages
        if (data.priority === 'urgent' && job.attemptsMade < (data.maxRetries || 3)) {
          throw error; // Let Bull handle retry
        }
        
        // Log failed SMS for manual review
        await this.logFailedSMS(data, error.message);
        throw error;
      }
    });

    // Queue event listeners
    this.smsQueue.on('completed', (job: Job, result: SMSResult) => {
      logger.info(`SMS job ${job.id} completed:`, result);
    });

    this.smsQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`SMS job ${job.id} failed after all attempts:`, err);
    });

    this.smsQueue.on('stalled', (job: Job) => {
      logger.warn(`SMS job ${job.id} stalled`);
    });
  }

  /**
   * Queue an SMS for sending
   */
  async queue(options: SMSOptions): Promise<Job<SMSOptions>> {
    // Validate phone number
    if (!this.isValidPhoneNumber(options.to)) {
      throw new Error(`Invalid phone number: ${options.to}`);
    }

    // Set default from number
    if (!options.from) {
      options.from = this.phoneNumber;
    }

    // Add to queue with priority
    const priority = this.getPriorityValue(options.priority);
    const delay = options.scheduledAt ? new Date(options.scheduledAt).getTime() - Date.now() : 0;

    const job = await this.smsQueue.add(options, {
      priority,
      delay: delay > 0 ? delay : 0,
    });

    logger.info(`SMS queued with job ID ${job.id}`);
    return job;
  }

  /**
   * Send SMS immediately (bypassing queue)
   */
  async sendImmediate(options: SMSOptions): Promise<SMSResult> {
    // Validate phone number
    if (!this.isValidPhoneNumber(options.to)) {
      return {
        success: false,
        error: `Invalid phone number: ${options.to}`,
        timestamp: new Date(),
      };
    }

    // Check rate limiting
    const rateLimitKey = `sms:ratelimit:${options.to}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, 3600); // 1 hour window
    }
    
    // Limit: 10 SMS per hour per number (except OTP)
    if (count > 10 && options.type !== 'otp') {
      return {
        success: false,
        error: 'Rate limit exceeded',
        timestamp: new Date(),
      };
    }

    // Set default from number
    if (!options.from) {
      options.from = this.phoneNumber;
    }

    let result: SMSResult;

    try {
      if (this.twilioClient && this.isInitialized) {
        result = await this.sendViaTwilio(options);
      } else {
        result = await this.simulateSend(options);
      }
    } catch (error: any) {
      logger.error('SMS sending failed:', error);
      result = {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }

    // Log SMS activity
    await this.logSMSActivity(options, result);

    return result;
  }

  private async sendViaTwilio(options: SMSOptions): Promise<SMSResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: options.body,
        from: options.from!,
        to: options.to,
        ...(options.mediaUrl && { mediaUrl: options.mediaUrl }),
      });

      // Get message details for cost calculation
      const messageDetails = await this.twilioClient.messages(message.sid).fetch();

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        timestamp: new Date(),
        cost: parseFloat(messageDetails.price || '0'),
      };
    } catch (error: any) {
      throw new Error(`Twilio error: ${error.message}`);
    }
  }

  private async simulateSend(options: SMSOptions): Promise<SMSResult> {
    logger.info('Simulating SMS send:', {
      to: options.to,
      body: options.body.substring(0, 50) + '...',
      from: options.from,
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
      status: 'sent',
      timestamp: new Date(),
      cost: 0,
    };
  }

  /**
   * Send OTP code
   */
  async sendOTP(options: OTPOptions): Promise<{ success: boolean; error?: string }> {
    const code = this.generateOTP(options.length || 6);
    const expiryMinutes = options.expiryMinutes || 10;
    const expiry = new Date(Date.now() + expiryMinutes * 60000);

    // Store OTP in cache
    this.otpCache.set(options.phoneNumber, {
      code,
      expiry,
      attempts: 0,
    });

    // Also store in Redis for distributed systems
    const redisKey = `otp:${options.phoneNumber}`;
    await this.redis.setex(
      redisKey,
      expiryMinutes * 60,
      JSON.stringify({ code, expiry: expiry.toISOString() })
    );

    // Prepare SMS body
    let body = options.template || SMS_TEMPLATES.OTP.template;
    body = body.replace('{{code}}', code);
    body = body.replace('{{expiry}}', expiryMinutes.toString());

    // Send OTP SMS with high priority
    const result = await this.sendImmediate({
      to: options.phoneNumber,
      body,
      type: 'otp',
      priority: 'high',
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    logger.info(`OTP sent to ${options.phoneNumber}`);
    return { success: true };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(options: OTPVerifyOptions): Promise<{ success: boolean; error?: string }> {
    // Check local cache first
    const cached = this.otpCache.get(options.phoneNumber);
    
    if (!cached) {
      // Try Redis
      const redisKey = `otp:${options.phoneNumber}`;
      const redisData = await this.redis.get(redisKey);
      
      if (!redisData) {
        return { success: false, error: 'OTP not found or expired' };
      }

      const { code, expiry } = JSON.parse(redisData);
      
      if (new Date(expiry) < new Date()) {
        await this.redis.del(redisKey);
        return { success: false, error: 'OTP expired' };
      }

      if (code !== options.code) {
        return { success: false, error: 'Invalid OTP' };
      }

      // Valid OTP from Redis
      await this.redis.del(redisKey);
      return { success: true };
    }

    // Check expiry
    if (cached.expiry < new Date()) {
      this.otpCache.delete(options.phoneNumber);
      return { success: false, error: 'OTP expired' };
    }

    // Check attempts
    cached.attempts++;
    if (cached.attempts > 3) {
      this.otpCache.delete(options.phoneNumber);
      return { success: false, error: 'Too many failed attempts' };
    }

    // Verify code
    if (cached.code !== options.code) {
      return { success: false, error: 'Invalid OTP' };
    }

    // Success - remove OTP
    this.otpCache.delete(options.phoneNumber);
    const redisKey = `otp:${options.phoneNumber}`;
    await this.redis.del(redisKey);

    logger.info(`OTP verified for ${options.phoneNumber}`);
    return { success: true };
  }

  /**
   * Send bulk SMS (for notifications)
   */
  async sendBulk(
    recipients: string[],
    body: string,
    options?: Partial<SMSOptions>
  ): Promise<{ sent: number; failed: number; jobs: Job[] }> {
    const jobs: Job[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const job = await this.queue({
          to: recipient,
          body,
          ...options,
          priority: options?.priority || 'normal',
        });
        jobs.push(job);
        sent++;
      } catch (error: any) {
        logger.error(`Failed to queue SMS for ${recipient}:`, error);
        failed++;
      }
    }

    return { sent, failed, jobs };
  }

  /**
   * Process template
   */
  processTemplate(templateId: string, data: Record<string, any>): string {
    const template = SMS_TEMPLATES[templateId as keyof typeof SMS_TEMPLATES];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let processed = template.template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, data[key]);
    });

    return processed;
  }

  /**
   * Validate phone number
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should be enhanced with libphonenumber
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Generate OTP code
   */
  private generateOTP(length: number): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Clean expired OTPs from cache
   */
  private cleanExpiredOTPs() {
    const now = new Date();
    for (const [phone, data] of this.otpCache.entries()) {
      if (data.expiry < now) {
        this.otpCache.delete(phone);
      }
    }
  }

  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority?: 'urgent' | 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 3;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  /**
   * Log SMS activity
   */
  private async logSMSActivity(options: SMSOptions, result: SMSResult) {
    const activity = {
      to: options.to,
      type: options.type,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      cost: result.cost,
      timestamp: result.timestamp,
      metadata: options.metadata,
    };

    // Store in Redis with expiry
    const key = `sms:activity:${Date.now()}`;
    await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(activity)); // 30 days expiry
  }

  /**
   * Log failed SMS for manual review
   */
  private async logFailedSMS(options: SMSOptions, error: string) {
    const failed = {
      to: options.to,
      body: options.body,
      type: options.type,
      error,
      timestamp: new Date(),
      metadata: options.metadata,
    };

    const key = `sms:failed:${Date.now()}`;
    await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(failed)); // 7 days expiry
  }

  /**
   * Get SMS queue status
   */
  async getQueueStatus() {
    const jobCounts = await this.smsQueue.getJobCounts();
    return {
      waiting: jobCounts.waiting,
      active: jobCounts.active,
      completed: jobCounts.completed,
      failed: jobCounts.failed,
      delayed: jobCounts.delayed,
    };
  }

  /**
   * Clean completed jobs from queue
   */
  async cleanQueue(grace: number = 3600000) {
    await this.smsQueue.clean(grace, 'completed');
    await this.smsQueue.clean(grace, 'failed');
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(days: number = 30): Promise<{
    total: number;
    successful: number;
    failed: number;
    cost: number;
  }> {
    const keys = await this.redis.keys('sms:activity:*');
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    let total = 0;
    let successful = 0;
    let failed = 0;
    let cost = 0;

    for (const key of keys) {
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp < cutoff) continue;

      const data = await this.redis.get(key);
      if (!data) continue;

      const activity = JSON.parse(data);
      total++;
      if (activity.success) {
        successful++;
        cost += activity.cost || 0;
      } else {
        failed++;
      }
    }

    return { total, successful, failed, cost };
  }
}

// Export singleton instance
export const smsService = new SMSService();

// Export types and templates
export { SMS_TEMPLATES };