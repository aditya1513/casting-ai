import { logger } from '../utils/logger';
import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import Bull, { Queue, Job } from 'bull';
import { config } from '../config/config';
import Redis from 'ioredis';

/**
 * Email Service Integration
 * Supports SendGrid and Resend with fallback and queue processing
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'sendgrid' | 'resend' | 'fallback';
  timestamp: Date;
}

// Email templates
const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  WELCOME: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to CastMatch!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to CastMatch!</h1>
        <p>Hi {{name}},</p>
        <p>We're thrilled to have you join our casting platform!</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile</li>
          <li>Upload your headshots and resume</li>
          <li>Start applying to auditions</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Get Started</a>
        <p>Best regards,<br>The CastMatch Team</p>
      </div>
    `,
    text: 'Welcome to CastMatch! We are thrilled to have you join our casting platform.'
  },
  PASSWORD_RESET: {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The CastMatch Team</p>
      </div>
    `,
    text: 'Reset your password by clicking this link: {{resetUrl}}'
  },
  AUDITION_INVITATION: {
    id: 'audition_invitation',
    name: 'Audition Invitation',
    subject: 'You\'ve Been Invited to Audition!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Audition Invitation</h1>
        <p>Hi {{name}},</p>
        <p>Great news! You've been invited to audition for <strong>{{projectName}}</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Role:</strong> {{roleName}}</p>
          <p><strong>Date:</strong> {{auditionDate}}</p>
          <p><strong>Time:</strong> {{auditionTime}}</p>
          <p><strong>Location:</strong> {{location}}</p>
        </div>
        <p>Please prepare the following:</p>
        <ul>
          {{#each requirements}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
        <a href="{{confirmUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Confirm Attendance</a>
        <a href="{{declineUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin-left: 10px;">Decline</a>
        <p>Best of luck!<br>The CastMatch Team</p>
      </div>
    `,
    text: 'You have been invited to audition for {{projectName}}. Date: {{auditionDate}} at {{auditionTime}}'
  },
  AUDITION_REMINDER: {
    id: 'audition_reminder',
    name: 'Audition Reminder',
    subject: 'Reminder: Your Audition is Tomorrow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Audition Reminder</h1>
        <p>Hi {{name}},</p>
        <p>This is a friendly reminder about your upcoming audition:</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Project:</strong> {{projectName}}</p>
          <p><strong>Role:</strong> {{roleName}}</p>
          <p><strong>Date:</strong> {{auditionDate}}</p>
          <p><strong>Time:</strong> {{auditionTime}}</p>
          <p><strong>Location:</strong> {{location}}</p>
        </div>
        <p>Don't forget to bring:</p>
        <ul>
          {{#each requirements}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
        <p>Break a leg!<br>The CastMatch Team</p>
      </div>
    `,
    text: 'Reminder: Your audition for {{projectName}} is tomorrow at {{auditionTime}}'
  }
};

class EmailService {
  private sendgridClient: typeof sgMail | null = null;
  private resendClient: Resend | null = null;
  private emailQueue: Queue<EmailOptions>;
  private redis: Redis;
  private provider: 'sendgrid' | 'resend' = 'sendgrid';
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@castmatch.com';
    
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
      maxRetriesPerRequest: 3,
    });

    // Initialize email queue
    this.emailQueue = new Bull('email-queue', {
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
          delay: 2000,
        },
      },
    });

    // Initialize email providers
    this.initializeProviders();

    // Process email queue
    this.processQueue();
  }

  private initializeProviders() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendgridClient = sgMail;
      this.provider = 'sendgrid';
      logger.info('SendGrid email provider initialized');
    }

    // Initialize Resend as fallback
    if (process.env.RESEND_API_KEY) {
      this.resendClient = new Resend(process.env.RESEND_API_KEY);
      if (!this.sendgridClient) {
        this.provider = 'resend';
      }
      logger.info('Resend email provider initialized');
    }

    if (!this.sendgridClient && !this.resendClient) {
      logger.warn('No email provider configured. Email sending will be simulated.');
    }
  }

  private processQueue() {
    this.emailQueue.process(async (job: Job<EmailOptions>) => {
      const { data } = job;
      logger.info(`Processing email job ${job.id}:`, {
        to: data.to,
        subject: data.subject,
        priority: data.priority,
      });

      try {
        const result = await this.sendImmediate(data);
        if (!result.success) {
          throw new Error(result.error || 'Email sending failed');
        }
        return result;
      } catch (error: any) {
        logger.error(`Email job ${job.id} failed:`, error);
        throw error;
      }
    });

    // Queue event listeners
    this.emailQueue.on('completed', (job: Job, result: EmailResult) => {
      logger.info(`Email job ${job.id} completed:`, result);
    });

    this.emailQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`Email job ${job.id} failed:`, err);
    });

    this.emailQueue.on('stalled', (job: Job) => {
      logger.warn(`Email job ${job.id} stalled`);
    });
  }

  /**
   * Queue an email for sending
   */
  async queue(options: EmailOptions): Promise<Job<EmailOptions>> {
    // Apply template if specified
    if (options.templateId) {
      const template = EMAIL_TEMPLATES[options.templateId];
      if (template) {
        options.subject = options.subject || template.subject;
        options.html = this.processTemplate(template.html, options.templateData || {});
        options.text = options.text || this.processTemplate(template.text || '', options.templateData || {});
      }
    }

    // Set default from address
    if (!options.from) {
      options.from = this.fromEmail;
    }

    // Add to queue with priority
    const priority = this.getPriorityValue(options.priority);
    const delay = options.scheduledAt ? new Date(options.scheduledAt).getTime() - Date.now() : 0;

    const job = await this.emailQueue.add(options, {
      priority,
      delay: delay > 0 ? delay : 0,
    });

    logger.info(`Email queued with job ID ${job.id}`);
    return job;
  }

  /**
   * Send email immediately (bypassing queue)
   */
  async sendImmediate(options: EmailOptions): Promise<EmailResult> {
    // Apply template if specified
    if (options.templateId) {
      const template = EMAIL_TEMPLATES[options.templateId];
      if (template) {
        options.subject = options.subject || template.subject;
        options.html = this.processTemplate(template.html, options.templateData || {});
        options.text = options.text || this.processTemplate(template.text || '', options.templateData || {});
      }
    }

    // Set default from address
    if (!options.from) {
      options.from = this.fromEmail;
    }

    let result: EmailResult = {
      success: false,
      provider: this.provider,
      timestamp: new Date(),
    };

    // Try primary provider
    try {
      if (this.provider === 'sendgrid' && this.sendgridClient) {
        result = await this.sendViaSendGrid(options);
      } else if (this.provider === 'resend' && this.resendClient) {
        result = await this.sendViaResend(options);
      } else {
        result = await this.simulateSend(options);
      }
    } catch (error: any) {
      logger.error(`Primary email provider failed:`, error);
      
      // Try fallback provider
      if (this.provider === 'sendgrid' && this.resendClient) {
        logger.info('Trying Resend as fallback');
        result = await this.sendViaResend(options);
      } else if (this.provider === 'resend' && this.sendgridClient) {
        logger.info('Trying SendGrid as fallback');
        result = await this.sendViaSendGrid(options);
      } else {
        result.error = error.message;
      }
    }

    // Log email activity
    await this.logEmailActivity(options, result);

    return result;
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
    if (!this.sendgridClient) {
      throw new Error('SendGrid client not initialized');
    }

    const msg = {
      to: options.to,
      from: options.from!,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    const response = await this.sendgridClient.send(msg);
    
    return {
      success: true,
      messageId: response[0].headers['x-message-id'] as string,
      provider: 'sendgrid',
      timestamp: new Date(),
    };
  }

  private async sendViaResend(options: EmailOptions): Promise<EmailResult> {
    if (!this.resendClient) {
      throw new Error('Resend client not initialized');
    }

    const response = await this.resendClient.emails.send({
      from: options.from!,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html || '',
      text: options.text,
    });

    return {
      success: true,
      messageId: response.id,
      provider: 'resend',
      timestamp: new Date(),
    };
  }

  private async simulateSend(options: EmailOptions): Promise<EmailResult> {
    logger.info('Simulating email send:', {
      to: options.to,
      subject: options.subject,
      from: options.from,
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      messageId: `simulated-${Date.now()}`,
      provider: 'fallback',
      timestamp: new Date(),
    };
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    
    // Simple template replacement
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, data[key]);
    });

    // Handle arrays for simple loops
    const arrayMatches = processed.match(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g);
    if (arrayMatches) {
      arrayMatches.forEach(match => {
        const arrayName = match.match(/{{#each (\w+)}}/)?.[1];
        const content = match.match(/{{#each \w+}}([\s\S]*?){{\/each}}/)?.[1];
        
        if (arrayName && content && Array.isArray(data[arrayName])) {
          const items = data[arrayName].map((item: any) => 
            content.replace(/{{this}}/g, item)
          ).join('');
          processed = processed.replace(match, items);
        }
      });
    }

    return processed;
  }

  private getPriorityValue(priority?: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  private async logEmailActivity(options: EmailOptions, result: EmailResult) {
    const activity = {
      to: options.to,
      subject: options.subject,
      provider: result.provider,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      timestamp: result.timestamp,
      metadata: options.metadata,
    };

    // Store in Redis with expiry
    const key = `email:activity:${Date.now()}`;
    await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(activity)); // 7 days expiry
  }

  /**
   * Get email queue status
   */
  async getQueueStatus() {
    const jobCounts = await this.emailQueue.getJobCounts();
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
    await this.emailQueue.clean(grace, 'completed');
    await this.emailQueue.clean(grace, 'failed');
  }

  /**
   * Pause/resume email queue
   */
  async pauseQueue() {
    await this.emailQueue.pause();
  }

  async resumeQueue() {
    await this.emailQueue.resume();
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types and templates
export { EMAIL_TEMPLATES };