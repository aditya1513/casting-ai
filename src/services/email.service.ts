/**
 * Enhanced Email Service with Resend Integration
 * Handles email notifications with professional templates and delivery tracking
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { CacheManager, CacheKeys } from '../config/redis';
import sgMail from '@sendgrid/mail';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
// import { IMailgunClient } from 'mailgun.js';
import Bull, { Queue, Job } from 'bull';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  priority?: 'normal' | 'high';
  metadata?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentId?: string;
  }>;
  replyTo?: string;
  categories?: string[];
  customArgs?: Record<string, string>;
}

interface PasswordResetEmailData {
  to: string;
  name: string;
  resetToken: string;
  expiryHours: number;
}

interface PasswordResetConfirmationData {
  to: string;
  name: string;
}

interface WelcomeEmailData {
  to: string;
  name: string;
  role: string;
  verificationToken?: string;
}

interface AccountSecurityAlertData {
  to: string;
  name: string;
  alertType: 'login' | 'password_change' | 'account_locked' | '2fa_enabled' | '2fa_disabled';
  ipAddress?: string;
  location?: string;
  timestamp: Date;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private sendgrid: typeof sgMail | null = null;
  private mailgun: any | null = null;
  private emailQueue!: Queue;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private readonly provider: 'resend' | 'sendgrid' | 'mailgun' | 'smtp';
  private templateCache = new Map<string, { html: string; text: string }>();
  private retryAttempts = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@castmatch.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'CastMatch';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    // Determine which provider to use based on environment variables
    if (process.env.SENDGRID_API_KEY) {
      this.provider = 'sendgrid';
    } else if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      this.provider = 'mailgun';
    } else if (process.env.RESEND_API_KEY) {
      this.provider = 'resend';
    } else {
      this.provider = 'smtp';
    }

    this.initializeEmailProvider();
    this.initializeEmailQueue();
  }

  private initializeEmailProvider(): void {
    switch (this.provider) {
      case 'sendgrid':
        // Configure SendGrid
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        this.sendgrid = sgMail;
        logger.info('Email service initialized with SendGrid');
        break;
        
      case 'mailgun':
        // Configure Mailgun
        const mailgun = new Mailgun(formData);
        this.mailgun = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY!,
          url: process.env.MAILGUN_EU ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
        });
        logger.info('Email service initialized with Mailgun');
        break;
        
      case 'resend':
        // Configure Resend
        this.resend = new Resend(process.env.RESEND_API_KEY!);
        logger.info('Email service initialized with Resend');
        break;
        
      default:
      // Configure SMTP fallback
      if (process.env.NODE_ENV === 'production') {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
      } else {
        // Development configuration with Gmail SMTP
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
      }
        logger.info('Email service initialized with SMTP');
        break;
    }
    
    // Initialize email queue
    this.initializeEmailQueue();
  }

  /**
   * Initialize email queue for batch processing and retry logic
   */
  private initializeEmailQueue(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.emailQueue = new Bull('email-queue', redisConfig);

    // Process email queue
    this.emailQueue.process(async (job: Job) => {
      const { options } = job.data;
      try {
        await this.sendEmailInternal(options);
        return { success: true, messageId: job.id };
      } catch (error) {
        logger.error('Email queue processing error', { error, jobId: job.id });
        throw error;
      }
    });

    // Handle failed jobs
    this.emailQueue.on('failed', (job, err) => {
      logger.error('Email job failed', {
        jobId: job.id,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    // Handle completed jobs
    this.emailQueue.on('completed', (job) => {
      logger.info('Email job completed', { jobId: job.id });
    });
  }

  /**
   * Send email with template support and delivery tracking
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    // Add to queue for batch processing if not high priority
    if (options.priority !== 'high') {
      await this.emailQueue.add(
        { options },
        {
          attempts: this.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: this.retryDelay,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      return;
    }

    // Send immediately for high priority emails
    await this.sendEmailInternal(options);
  }

  /**
   * Internal method to send email with retry logic
   */
  private async sendEmailInternal(options: EmailOptions): Promise<void> {
    try {
      let html = options.html;
      let text = options.text;

      // Load template if specified
      if (options.template && options.templateData) {
        const template = await this.getTemplate(options.template);
        html = this.compileTemplate(template.html, options.templateData);
        text = this.compileTemplate(template.text, options.templateData);
      }

      // Send with appropriate provider
      switch (this.provider) {
        case 'sendgrid':
          await this.sendWithSendGrid({
            ...options,
            html: html!,
            text: text!,
          });
          break;
          
        case 'mailgun':
          await this.sendWithMailgun({
            ...options,
            html: html!,
            text: text!,
          });
          break;
          
        case 'resend':
          await this.sendWithResend({
            ...options,
            html: html!,
            text: text!,
          });
          break;
          
        default:
          await this.sendWithSMTP({
            ...options,
            html: html!,
            text: text!,
          });
      }

      // Track email delivery
      await this.trackEmailDelivery({
        to: options.to,
        subject: options.subject,
        template: options.template,
        metadata: options.metadata,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        template: options.template,
        provider: this.provider,
      });

    } catch (error) {
      logger.error('Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
        template: options.template,
      });
      throw error;
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendWithSendGrid(options: EmailOptions & { html: string; text: string }): Promise<void> {
    if (!this.sendgrid) {
      throw new Error('SendGrid not configured');
    }

    const msg: any = {
      to: options.to,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    // Add reply-to if specified
    if (options.replyTo) {
      msg.replyTo = options.replyTo;
    }

    // Add attachments if specified
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content ? att.content.toString('base64') : undefined,
        type: 'application/octet-stream',
        disposition: 'attachment',
        contentId: att.contentId,
      }));
    }

    // Add categories for tracking
    if (options.categories && options.categories.length > 0) {
      msg.categories = options.categories;
    }

    // Add custom arguments for tracking
    if (options.customArgs) {
      msg.customArgs = options.customArgs;
    }

    // Set priority
    if (options.priority === 'high') {
      msg.headers = {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      };
    }

    try {
      await this.sendgrid.send(msg);
    } catch (error: any) {
      if (error.response) {
        logger.error('SendGrid error response', { body: error.response.body });
      }
      throw new Error(`SendGrid error: ${error.message}`);
    }
  }

  /**
   * Send email via Mailgun
   */
  private async sendWithMailgun(options: EmailOptions & { html: string; text: string }): Promise<void> {
    if (!this.mailgun) {
      throw new Error('Mailgun not configured');
    }

    const messageData: any = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    // Add reply-to if specified
    if (options.replyTo) {
      messageData['h:Reply-To'] = options.replyTo;
    }

    // Add tags (Mailgun's version of categories)
    if (options.categories && options.categories.length > 0) {
      messageData['o:tag'] = options.categories;
    }

    // Add custom variables
    if (options.customArgs) {
      Object.keys(options.customArgs).forEach(key => {
        messageData[`v:${key}`] = options.customArgs![key];
      });
    }

    // Set priority
    if (options.priority === 'high') {
      messageData['h:X-Priority'] = '1';
      messageData['h:Importance'] = 'high';
    }

    // Add attachments if specified
    if (options.attachments && options.attachments.length > 0) {
      messageData.attachment = options.attachments.map(att => ({
        filename: att.filename,
        data: att.content,
      }));
    }

    try {
      await this.mailgun.messages.create(process.env.MAILGUN_DOMAIN!, messageData);
    } catch (error: any) {
      throw new Error(`Mailgun error: ${error.message}`);
    }
  }

  /**
   * Send email via Resend
   */
  private async sendWithResend(options: EmailOptions & { html: string; text: string }): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend not configured');
    }

    const emailData: any = {
      from: this.fromEmail,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    // Add reply-to if specified
    if (options.replyTo) {
      emailData.reply_to = [options.replyTo];
    }

    // Add attachments if specified
    if (options.attachments && options.attachments.length > 0) {
      emailData.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content ? att.content.toString('base64') : undefined,
        path: att.path,
      }));
    }

    // Add tags (Resend equivalent of SendGrid categories)
    if (options.categories && options.categories.length > 0) {
      emailData.tags = options.categories.map(category => ({ name: category, value: 'true' }));
    }

    // Add headers for high priority emails
    if (options.priority === 'high') {
      emailData.headers = {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      };
    }

    const { data, error } = await this.resend.emails.send(emailData);
    
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    // Return void to match the method signature
    // data contains the email ID from Resend for logging/tracking if needed
  }

  /**
   * Send email via SMTP
   */
  private async sendWithSMTP(options: EmailOptions & { html: string; text: string }): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not configured');
    }

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments,
      priority: (options.priority === 'high' ? 'high' : 'normal') as 'high' | 'normal' | 'low',
    };

    const info = await this.transporter.sendMail(mailOptions);

    // Log preview URL in development
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info as any);
      if (previewUrl) {
        logger.info('Email preview URL', { url: previewUrl });
      }
    }
  }

  /**
   * Get and cache email template
   */
  private async getTemplate(templateName: string): Promise<{ html: string; text: string }> {
    const cacheKey = `email_template_${templateName}`;
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      const templateDir = path.join(__dirname, '../templates/emails');
      const htmlPath = path.join(templateDir, `${templateName}.html`);
      const textPath = path.join(templateDir, `${templateName}.txt`);

      const [html, text] = await Promise.all([
        fs.readFile(htmlPath, 'utf-8').catch(() => this.getDefaultTemplate(templateName).html),
        fs.readFile(textPath, 'utf-8').catch(() => this.getDefaultTemplate(templateName).text),
      ]);

      const template = { html, text };
      this.templateCache.set(cacheKey, template);
      return template;
    } catch (error) {
      logger.warn(`Template ${templateName} not found, using default`, error);
      return this.getDefaultTemplate(templateName);
    }
  }

  /**
   * Compile template with data
   */
  private compileTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
      
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Track email delivery for analytics
   */
  private async trackEmailDelivery(data: {
    to: string;
    subject: string;
    template?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const trackingData = {
        ...data,
        timestamp: new Date(),
        provider: this.provider,
      };

      await CacheManager.set(
        CacheKeys.emailDeliveryLog(Date.now().toString()),
        trackingData,
        86400 // 24 hours
      );
    } catch (error) {
      logger.warn('Failed to track email delivery', error);
    }
  }

  /**
   * Get default template for emergency fallback
   */
  private getDefaultTemplate(templateName: string): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CastMatch</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CastMatch</h1>
          <p>{{title}}</p>
        </div>
        <div class="content">
          <p>{{message}}</p>
          {{#actionUrl}}<a href="{{actionUrl}}" class="button">Take Action</a>{{/actionUrl}}
        </div>
        <div class="footer">
          <p>© {{currentYear}} CastMatch. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      CastMatch - {{title}}
      
      {{message}}
      
      {{#actionUrl}}Visit: {{actionUrl}}{{/actionUrl}}
      
      © {{currentYear}} CastMatch. All rights reserved.
    `;

    return { html, text };
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${data.resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CastMatch</h1>
            <p>AI-Powered Casting Platform</p>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in ${data.expiryHours} hours for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <h3>Security Tips:</h3>
            <ul>
              <li>Never share your password with anyone</li>
              <li>Use a strong, unique password for your account</li>
              <li>Enable two-factor authentication for extra security</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CastMatch. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${data.name},

      We received a request to reset your password. Visit the link below to create a new password:

      ${resetUrl}

      This link will expire in ${data.expiryHours} hours.

      If you didn't request this password reset, please ignore this email.

      Best regards,
      The CastMatch Team
    `;

    await this.sendEmail({
      to: data.to,
      subject: 'Reset Your CastMatch Password',
      html,
      text,
    });
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(data: PasswordResetConfirmationData): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .success { background: #d4edda; border: 1px solid #28a745; padding: 10px; border-radius: 5px; margin: 20px 0; color: #155724; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CastMatch</h1>
            <p>Password Reset Successful</p>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            
            <div class="success">
              <strong>Success!</strong> Your password has been reset successfully.
            </div>
            
            <p>You can now log in to your account with your new password.</p>
            
            <div style="text-align: center;">
              <a href="${this.frontendUrl}/auth/login" class="button">Go to Login</a>
            </div>
            
            <h3>Security Notice:</h3>
            <p>For security reasons, all your active sessions have been logged out. You'll need to log in again on all your devices.</p>
            
            <p>If you didn't make this change, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CastMatch. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${data.name},

      Your password has been reset successfully. You can now log in to your account with your new password.

      For security reasons, all your active sessions have been logged out.

      If you didn't make this change, please contact our support team immediately.

      Best regards,
      The CastMatch Team
    `;

    await this.sendEmail({
      to: data.to,
      subject: 'Password Reset Successful - CastMatch',
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const verificationUrl = data.verificationToken
      ? `${this.frontendUrl}/auth/verify-email?token=${data.verificationToken}`
      : null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CastMatch</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to CastMatch!</h1>
            <p>Your journey in the Mumbai OTT industry starts here</p>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Welcome to CastMatch, the AI-powered casting platform for Mumbai's OTT industry!</p>
            
            ${verificationUrl ? `
              <p>Please verify your email address to unlock all features:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </div>
            ` : ''}
            
            <div class="features">
              <h3>As a ${data.role}, you can:</h3>
              <ul>
                ${data.role === 'ACTOR' ? `
                  <li>Create and showcase your professional portfolio</li>
                  <li>Apply for casting calls from top OTT productions</li>
                  <li>Get AI-powered role recommendations</li>
                  <li>Track your audition progress</li>
                ` : ''}
                ${data.role === 'CASTING_DIRECTOR' ? `
                  <li>Post casting calls for your projects</li>
                  <li>Use AI to find perfect talent matches</li>
                  <li>Manage auditions and callbacks efficiently</li>
                  <li>Collaborate with production teams</li>
                ` : ''}
                ${data.role === 'PRODUCER' ? `
                  <li>Oversee casting for multiple projects</li>
                  <li>Access detailed talent analytics</li>
                  <li>Manage production budgets and schedules</li>
                  <li>Connect with verified industry professionals</li>
                ` : ''}
              </ul>
            </div>
            
            <h3>Get Started:</h3>
            <ol>
              <li>Complete your profile to increase visibility</li>
              <li>Upload professional photos and showreels</li>
              <li>Set your availability and preferences</li>
              <li>Start connecting with the industry!</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${this.frontendUrl}/dashboard" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CastMatch. All rights reserved.</p>
            <p>Need help? Contact us at support@castmatch.ai</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to CastMatch, ${data.name}!

      Your journey in the Mumbai OTT industry starts here.

      ${verificationUrl ? `Please verify your email: ${verificationUrl}` : ''}

      Get started by completing your profile and exploring opportunities.

      Best regards,
      The CastMatch Team
    `;

    await this.sendEmail({
      to: data.to,
      subject: 'Welcome to CastMatch - AI-Powered Casting Platform',
      html,
      text,
    });
  }

  /**
   * Send account security alert
   */
  async sendSecurityAlert(data: AccountSecurityAlertData): Promise<void> {
    const alertMessages = {
      login: 'New login to your account',
      password_change: 'Your password was changed',
      account_locked: 'Your account has been locked',
      '2fa_enabled': 'Two-factor authentication enabled',
      '2fa_disabled': 'Two-factor authentication disabled',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .alert { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Security Alert</h1>
            <p>CastMatch Account Activity</p>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            
            <div class="alert">
              <strong>Alert:</strong> ${alertMessages[data.alertType]}
            </div>
            
            <div class="details">
              <h3>Details:</h3>
              <p><strong>Time:</strong> ${data.timestamp.toLocaleString()}</p>
              ${data.ipAddress ? `<p><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
              ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
            </div>
            
            <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately:</p>
            
            <div style="text-align: center;">
              <a href="${this.frontendUrl}/settings/security" class="button">Secure My Account</a>
            </div>
            
            <h3>Security Recommendations:</h3>
            <ul>
              <li>Change your password immediately if you didn't authorize this action</li>
              <li>Enable two-factor authentication for extra security</li>
              <li>Review your recent account activity</li>
              <li>Check which devices have access to your account</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CastMatch. All rights reserved.</p>
            <p>This is an automated security alert. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: data.to,
      subject: `Security Alert: ${alertMessages[data.alertType]}`,
      html,
      text: `Security Alert: ${alertMessages[data.alertType]}. Please check your account.`,
    });
  }

  /**
   * Send two-factor authentication code
   */
  async send2FACode(to: string, name: string, code: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Your Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hello ${name},</h2>
        <p>Your CastMatch verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: `${code} is your CastMatch verification code`,
      html,
      text: `Your CastMatch verification code is: ${code}. This code will expire in 10 minutes.`,
    });
  }

  /**
   * New template-based email methods
   */
  async sendWelcomeEmailWithTemplate(data: WelcomeEmailData & { templateData?: Record<string, any> }): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: 'Welcome to CastMatch - Your Journey Begins!',
      template: 'welcome',
      templateData: {
        firstName: data.name,
        role: data.role,
        isActor: data.role === 'ACTOR',
        isCastingDirector: data.role === 'CASTING_DIRECTOR',
        isProducer: data.role === 'PRODUCER',
        verificationRequired: !!data.verificationToken,
        verificationUrl: data.verificationToken ? `${this.frontendUrl}/auth/verify-email?token=${data.verificationToken}` : null,
        dashboardUrl: `${this.frontendUrl}/dashboard`,
        currentYear: new Date().getFullYear(),
        facebookUrl: 'https://facebook.com/castmatch',
        twitterUrl: 'https://twitter.com/castmatch',
        instagramUrl: 'https://instagram.com/castmatch',
        linkedinUrl: 'https://linkedin.com/company/castmatch',
        ...data.templateData,
      },
      categories: ['welcome', 'onboarding'],
    });
  }

  async sendPasswordResetEmailWithTemplate(data: PasswordResetEmailData): Promise<void> {
    await this.sendEmail({
      to: data.to,
      subject: 'Reset Your CastMatch Password',
      template: 'password-reset',
      templateData: {
        firstName: data.name,
        resetUrl: `${this.frontendUrl}/auth/reset-password?token=${data.resetToken}`,
        expiryHours: data.expiryHours,
        currentYear: new Date().getFullYear(),
      },
      priority: 'high',
      categories: ['security', 'password-reset'],
    });
  }

  async sendEmailVerificationWithTemplate(to: string, name: string, verificationToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Verify Your CastMatch Email Address',
      template: 'email-verification',
      templateData: {
        firstName: name,
        email: to,
        verificationUrl: `${this.frontendUrl}/auth/verify-email?token=${verificationToken}`,
        currentYear: new Date().getFullYear(),
      },
      priority: 'high',
      categories: ['verification', 'onboarding'],
    });
  }

  async sendOAuthLinkedNotification(to: string, name: string, provider: string, providerData: any): Promise<void> {
    const template = provider === 'google' ? 'oauth-google-linked' : 'oauth-github-linked';
    
    const templateData: any = {
      firstName: name,
      settingsUrl: `${this.frontendUrl}/settings/integrations`,
      dashboardUrl: `${this.frontendUrl}/dashboard`,
      profileUrl: `${this.frontendUrl}/profile`,
      currentYear: new Date().getFullYear(),
    };

    if (provider === 'google') {
      templateData.googleEmail = providerData.email;
    } else if (provider === 'github') {
      templateData.githubUsername = providerData.username;
    }

    await this.sendEmail({
      to,
      subject: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Account Successfully Linked`,
      template,
      templateData,
      categories: ['oauth', 'integration'],
    });
  }

  async sendProfileCompletionReminder(to: string, name: string, completionData: any): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Complete Your Profile - ${completionData.completionPercentage}% Done`,
      template: 'profile-completion-reminder',
      templateData: {
        firstName: name,
        completionPercentage: completionData.completionPercentage,
        completedItems: completionData.completedItems || [],
        pendingItems: completionData.pendingItems || [],
        profileUrl: `${this.frontendUrl}/profile/edit`,
        guideUrl: `${this.frontendUrl}/help/profile-guide`,
        unsubscribeUrl: `${this.frontendUrl}/unsubscribe?token=${completionData.unsubscribeToken}`,
        currentYear: new Date().getFullYear(),
      },
      categories: ['profile', 'reminder'],
    });
  }

  /**
   * Send 2FA enabled notification email
   */
  async send2FAEnabledEmail(to: string, name: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Two-Factor Authentication Enabled',
      html: `<h1>2FA Enabled</h1><p>Hello ${name}, two-factor authentication has been enabled for your account.</p>`,
      text: `Hello ${name}, two-factor authentication has been enabled for your account.`,
    });
  }

  /**
   * Send 2FA code via email
   */
  async send2FACodeEmail(to: string, name: string, code: string): Promise<void> {
    await this.send2FACode(to, name, code);
  }

  /**
   * Send backup codes email
   */
  async sendBackupCodesEmail(to: string, name: string, backupCodes: string[]): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Two-Factor Authentication Backup Codes',
      html: `<h1>Backup Codes</h1><p>Hello ${name}, here are your backup codes: ${backupCodes.join(', ')}</p>`,
      text: `Hello ${name}, here are your backup codes: ${backupCodes.join(', ')}`,
    });
  }

  /**
   * ===============================
   * AUDITION EMAIL METHODS
   * ===============================
   */

  /**
   * Send audition confirmation email
   */
  async sendAuditionConfirmationEmail(data: {
    to: string;
    talentName: string;
    projectTitle: string;
    characterName?: string;
    auditionDate: Date;
    location: string;
    confirmationCode: string;
    meetingLink?: string;
    specialInstructions?: string;
    venueAddress?: string;
    contactPerson?: string;
    contactPhone?: string;
  }): Promise<void> {
    const { generateAuditionConfirmationEmail } = await import('../templates/audition-emails');
    const emailContent = generateAuditionConfirmationEmail(data);

    await this.sendEmail({
      to: data.to,
      subject: `Audition Confirmed: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}`,
      html: emailContent.html,
      text: emailContent.text,
      attachments: emailContent.attachments,
      priority: 'high',
      categories: ['audition', 'confirmation'],
      metadata: {
        projectTitle: data.projectTitle,
        auditionDate: data.auditionDate.toISOString(),
        confirmationCode: data.confirmationCode,
      },
    });
  }

  /**
   * Send audition reminder email
   */
  async sendAuditionReminderEmail(data: {
    to: string;
    talentName: string;
    projectTitle: string;
    characterName?: string;
    auditionDate: Date;
    location: string;
    confirmationCode: string;
    meetingLink?: string;
    reminderType: '24h' | '2h' | '30m';
  }): Promise<void> {
    const { generateAuditionReminderEmail } = await import('../templates/audition-emails');
    const emailContent = generateAuditionReminderEmail(data);

    const reminderSubjects = {
      '24h': '🕐 Audition Tomorrow',
      '2h': '⏰ Audition in 2 Hours',
      '30m': '🚨 Audition Starting Soon'
    };

    await this.sendEmail({
      to: data.to,
      subject: `${reminderSubjects[data.reminderType]}: ${data.projectTitle}`,
      html: emailContent.html,
      text: emailContent.text,
      priority: data.reminderType === '30m' ? 'high' : 'normal',
      categories: ['audition', 'reminder', data.reminderType],
      metadata: {
        projectTitle: data.projectTitle,
        auditionDate: data.auditionDate.toISOString(),
        reminderType: data.reminderType,
        confirmationCode: data.confirmationCode,
      },
    });
  }

  /**
   * Send audition reschedule email
   */
  async sendAuditionRescheduleEmail(data: {
    to: string;
    talentName: string;
    projectTitle: string;
    characterName?: string;
    oldDate: Date;
    newDate: Date;
    location: string;
    confirmationCode: string;
    reason?: string;
    meetingLink?: string;
  }): Promise<void> {
    const { generateAuditionRescheduleEmail } = await import('../templates/audition-emails');
    const emailContent = generateAuditionRescheduleEmail(data);

    await this.sendEmail({
      to: data.to,
      subject: `Audition Rescheduled: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}`,
      html: emailContent.html,
      text: emailContent.text,
      attachments: emailContent.attachments,
      priority: 'high',
      categories: ['audition', 'reschedule'],
      metadata: {
        projectTitle: data.projectTitle,
        oldDate: data.oldDate.toISOString(),
        newDate: data.newDate.toISOString(),
        confirmationCode: data.confirmationCode,
        reason: data.reason,
      },
    });
  }

  /**
   * Send audition cancellation email
   */
  async sendAuditionCancellationEmail(data: {
    to: string;
    talentName: string;
    projectTitle: string;
    characterName?: string;
    auditionDate: Date;
    reason?: string;
    contactPerson?: string;
    contactPhone?: string;
  }): Promise<void> {
    const { generateAuditionCancellationEmail } = await import('../templates/audition-emails');
    const emailContent = generateAuditionCancellationEmail(data);

    await this.sendEmail({
      to: data.to,
      subject: `Audition Cancelled: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}`,
      html: emailContent.html,
      text: emailContent.text,
      priority: 'high',
      categories: ['audition', 'cancellation'],
      metadata: {
        projectTitle: data.projectTitle,
        auditionDate: data.auditionDate.toISOString(),
        reason: data.reason,
      },
    });
  }

  /**
   * Send waitlist notification email
   */
  async sendWaitlistNotificationEmail(data: {
    to: string;
    talentName: string;
    projectTitle: string;
    characterName?: string;
    auditionDate: Date;
    position: number;
    estimatedWaitTime?: string;
  }): Promise<void> {
    const subject = `Added to Waitlist: ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .waitlist-position { background: #fff3e0; border: 2px solid #ff9800; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .position-number { font-size: 48px; font-weight: bold; color: #ff9800; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 CastMatch</h1>
            <p>Waitlist Notification</p>
          </div>
          <div class="content">
            <h2>Hello ${data.talentName},</h2>
            
            <p>You've been added to the waitlist for the audition:</p>
            
            <h3>${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}</h3>
            <p><strong>Audition Date:</strong> ${new Date(data.auditionDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            
            <div class="waitlist-position">
              <p class="position-number">#${data.position}</p>
              <p style="margin: 10px 0 0 0;"><strong>Your Position on Waitlist</strong></p>
              ${data.estimatedWaitTime ? `<p>Estimated wait time: ${data.estimatedWaitTime}</p>` : ''}
            </div>
            
            <p>We'll notify you immediately if a spot becomes available. Please keep this time slot free in your schedule.</p>
            
            <p>Thank you for your patience and continued interest!</p>
          </div>
          <div style="text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} CastMatch. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      CastMatch - Waitlist Notification
      
      Hello ${data.talentName},
      
      You've been added to the waitlist for:
      ${data.projectTitle}${data.characterName ? ` - ${data.characterName}` : ''}
      
      Audition Date: ${new Date(data.auditionDate).toLocaleDateString()}
      Your Position: #${data.position}
      ${data.estimatedWaitTime ? `Estimated wait: ${data.estimatedWaitTime}` : ''}
      
      We'll notify you if a spot becomes available.
      Please keep this time slot free.
      
      Thank you!
      CastMatch Team
    `;

    await this.sendEmail({
      to: data.to,
      subject,
      html,
      text,
      categories: ['audition', 'waitlist'],
      metadata: {
        projectTitle: data.projectTitle,
        auditionDate: data.auditionDate.toISOString(),
        waitlistPosition: data.position,
      },
    });
  }

  /**
   * Send waitlist confirmation (when moved from waitlist to confirmed)
   */
  async sendWaitlistConfirmationEmail(data: {
    to: string;
    talentName: string;
    projectTitle: string;
    characterName?: string;
    auditionDate: Date;
    location: string;
    confirmationCode: string;
    meetingLink?: string;
  }): Promise<void> {
    // Reuse the confirmation email template
    await this.sendAuditionConfirmationEmail({
      ...data,
      specialInstructions: '🎉 Great news! A spot opened up and you\'ve been moved from the waitlist to confirmed. Please arrive on time for your audition.',
    });
  }

  /**
   * Send bulk audition announcement email
   */
  async sendAuditionAnnouncementEmail(data: {
    recipients: string[];
    projectTitle: string;
    description: string;
    castingDirector: string;
    auditionDates: Date[];
    applicationDeadline: Date;
    requirements: string[];
    applyUrl: string;
  }): Promise<void> {
    const subject = `New Audition Opportunity: ${data.projectTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
          .requirements { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .deadline { background: #fff3e0; border: 2px solid #ff9800; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 CastMatch</h1>
            <p>New Audition Opportunity</p>
          </div>
          <div class="content">
            <h2>${data.projectTitle}</h2>
            
            <p>${data.description}</p>
            
            <p><strong>Casting Director:</strong> ${data.castingDirector}</p>
            
            <div class="deadline">
              <h3 style="margin-top: 0; color: #e65100;">⏰ Application Deadline</h3>
              <p style="font-size: 18px; font-weight: bold; margin: 0;">
                ${new Date(data.applicationDeadline).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric'
                })}
              </p>
            </div>
            
            <h3>📅 Audition Dates:</h3>
            <ul>
              ${data.auditionDates.map(date => 
                `<li>${new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric'
                })}</li>`
              ).join('')}
            </ul>
            
            <div class="requirements">
              <h3 style="margin-top: 0;">📋 Requirements:</h3>
              <ul>
                ${data.requirements.map(req => `<li>${req}</li>`).join('')}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${data.applyUrl}" class="button">Apply Now</a>
            </div>
            
            <p>Don't miss this exciting opportunity! Apply before the deadline.</p>
            
            <p>Best of luck!</p>
          </div>
          <div style="text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} CastMatch. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to all recipients (could be batched for large lists)
    for (const recipient of data.recipients) {
      await this.sendEmail({
        to: recipient,
        subject,
        html,
        text: `New audition opportunity: ${data.projectTitle}. Apply by ${new Date(data.applicationDeadline).toLocaleDateString()}. Visit: ${data.applyUrl}`,
        categories: ['audition', 'announcement', 'opportunity'],
        metadata: {
          projectTitle: data.projectTitle,
          applicationDeadline: data.applicationDeadline.toISOString(),
          castingDirector: data.castingDirector,
        },
      });
    }
  }
}

export const emailService = new EmailService();