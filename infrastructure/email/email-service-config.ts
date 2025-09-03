/**
 * CastMatch Email Service Configuration
 * Supports multiple providers with automatic failover
 */

import { SendGridService } from './providers/sendgrid';
import { SESService } from './providers/ses';
import { SMTPService } from './providers/smtp';
import { EmailProvider, EmailMessage, EmailResult } from './types';

export interface EmailServiceConfig {
  providers: {
    primary: EmailProvider;
    secondary?: EmailProvider;
    tertiary?: EmailProvider;
  };
  defaults: {
    fromEmail: string;
    fromName: string;
    replyTo?: string;
  };
  rateLimit: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
  };
  retry: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  monitoring: {
    webhookUrl?: string;
    metricsEnabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export class EmailService {
  private config: EmailServiceConfig;
  private providers: Map<string, EmailProvider>;
  private metrics: EmailMetrics;
  private rateLimiter: RateLimiter;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.providers = new Map();
    this.metrics = new EmailMetrics();
    this.rateLimiter = new RateLimiter(config.rateLimit);
    
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize SendGrid (Primary)
    if (process.env.SENDGRID_API_KEY) {
      this.providers.set('sendgrid', new SendGridService({
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: this.config.defaults.fromEmail,
        fromName: this.config.defaults.fromName,
        webhookSecret: process.env.SENDGRID_WEBHOOK_SECRET,
        sandboxMode: process.env.NODE_ENV === 'development',
      }));
    }

    // Initialize AWS SES (Secondary)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.providers.set('ses', new SESService({
        region: process.env.AWS_REGION || 'us-west-2',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        fromEmail: this.config.defaults.fromEmail,
        configurationSet: 'castmatch-transactional',
      }));
    }

    // Initialize SMTP (Tertiary/Fallback)
    if (process.env.SMTP_HOST) {
      this.providers.set('smtp', new SMTPService({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
        fromEmail: this.config.defaults.fromEmail,
        fromName: this.config.defaults.fromName,
      }));
    }
  }

  /**
   * Send email with automatic failover
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    // Check rate limits
    if (!await this.rateLimiter.allow()) {
      throw new Error('Rate limit exceeded');
    }

    // Add defaults
    const enrichedMessage: EmailMessage = {
      ...message,
      from: message.from || this.config.defaults.fromEmail,
      replyTo: message.replyTo || this.config.defaults.replyTo,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
    };

    // Try providers in order
    const providerOrder = ['sendgrid', 'ses', 'smtp'];
    let lastError: Error | null = null;

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const result = await this.sendWithRetry(provider, enrichedMessage);
        
        // Track metrics
        this.metrics.recordSuccess(providerName, result);
        
        // Log success
        if (this.config.monitoring.logLevel === 'debug') {
          console.log(`Email sent successfully via ${providerName}:`, result);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        this.metrics.recordFailure(providerName, error as Error);
        
        // Log failure
        console.error(`Failed to send via ${providerName}:`, error);
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All email providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Send with retry logic
   */
  private async sendWithRetry(
    provider: EmailProvider,
    message: EmailMessage
  ): Promise<EmailResult> {
    let attempt = 0;
    let backoff = this.config.retry.backoffMs;

    while (attempt < this.config.retry.maxAttempts) {
      try {
        return await provider.send(message);
      } catch (error) {
        attempt++;
        
        if (attempt >= this.config.retry.maxAttempts) {
          throw error;
        }
        
        // Exponential backoff
        await this.sleep(backoff);
        backoff = Math.min(backoff * 2, this.config.retry.maxBackoffMs);
      }
    }

    throw new Error('Max retry attempts reached');
  }

  /**
   * Send bulk emails
   */
  async sendBulk(messages: EmailMessage[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    const batchSize = 100;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(msg => this.send(msg))
      );
      
      results.push(...batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            messageId: '',
            error: result.reason.message,
            recipient: batch[index].to,
          };
        }
      }));
      
      // Rate limiting between batches
      await this.sleep(1000);
    }
    
    return results;
  }

  /**
   * Send templated email
   */
  async sendTemplate(
    templateId: string,
    recipient: string,
    data: Record<string, any>
  ): Promise<EmailResult> {
    const template = await this.loadTemplate(templateId);
    
    const message: EmailMessage = {
      to: recipient,
      subject: this.interpolate(template.subject, data),
      html: this.interpolate(template.html, data),
      text: this.interpolate(template.text, data),
      category: template.category,
      tags: template.tags,
    };
    
    return this.send(message);
  }

  /**
   * Track email events (opens, clicks, bounces)
   */
  async trackEvent(event: EmailEvent): Promise<void> {
    // Update metrics
    this.metrics.recordEvent(event);
    
    // Handle specific event types
    switch (event.type) {
      case 'bounce':
        await this.handleBounce(event);
        break;
      case 'complaint':
        await this.handleComplaint(event);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(event);
        break;
    }
    
    // Send to webhook if configured
    if (this.config.monitoring.webhookUrl) {
      await this.sendWebhook(event);
    }
  }

  /**
   * Handle email bounce
   */
  private async handleBounce(event: EmailEvent): Promise<void> {
    // Add to suppression list
    await this.addToSuppressionList(event.recipient, 'bounce');
    
    // Update user status in database
    await this.updateUserEmailStatus(event.recipient, 'bounced');
    
    // Alert if hard bounce
    if (event.bounceType === 'hard') {
      console.error(`Hard bounce detected for ${event.recipient}`);
    }
  }

  /**
   * Handle spam complaint
   */
  private async handleComplaint(event: EmailEvent): Promise<void> {
    // Add to suppression list immediately
    await this.addToSuppressionList(event.recipient, 'complaint');
    
    // Update user preferences
    await this.updateUserEmailStatus(event.recipient, 'complained');
    
    // Log for compliance
    console.warn(`Spam complaint received from ${event.recipient}`);
  }

  /**
   * Handle unsubscribe
   */
  private async handleUnsubscribe(event: EmailEvent): Promise<void> {
    // Update user preferences
    await this.updateUserEmailPreferences(event.recipient, {
      marketing: false,
      transactional: true, // Keep transactional emails
    });
    
    console.info(`User unsubscribed: ${event.recipient}`);
  }

  /**
   * Get email statistics
   */
  async getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<EmailStatistics> {
    return this.metrics.getStatistics(startDate, endDate);
  }

  /**
   * Validate email deliverability
   */
  async validateEmail(email: string): Promise<EmailValidation> {
    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid format' };
    }
    
    // Check suppression list
    if (await this.isInSuppressionList(email)) {
      return { valid: false, reason: 'In suppression list' };
    }
    
    // Check domain MX records
    const domain = email.split('@')[1];
    if (!await this.verifyMXRecords(domain)) {
      return { valid: false, reason: 'Invalid domain' };
    }
    
    // Check disposable email providers
    if (await this.isDisposableEmail(email)) {
      return { valid: false, reason: 'Disposable email' };
    }
    
    return { valid: true };
  }

  /**
   * Helper methods
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@castmatch.com`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private async loadTemplate(templateId: string): Promise<EmailTemplate> {
    // Load from database or file system
    // Implementation depends on template storage strategy
    throw new Error('Template loading not implemented');
  }

  private async addToSuppressionList(
    email: string,
    reason: string
  ): Promise<void> {
    // Add to internal suppression list
    // Implementation depends on database schema
  }

  private async isInSuppressionList(email: string): Promise<boolean> {
    // Check internal suppression list
    return false;
  }

  private async updateUserEmailStatus(
    email: string,
    status: string
  ): Promise<void> {
    // Update user record in database
  }

  private async updateUserEmailPreferences(
    email: string,
    preferences: any
  ): Promise<void> {
    // Update user preferences in database
  }

  private async verifyMXRecords(domain: string): Promise<boolean> {
    // DNS lookup for MX records
    return true;
  }

  private async isDisposableEmail(email: string): Promise<boolean> {
    // Check against list of disposable email providers
    return false;
  }

  private async sendWebhook(event: EmailEvent): Promise<void> {
    // Send event to configured webhook
  }
}

/**
 * Rate Limiter
 */
class RateLimiter {
  private config: EmailServiceConfig['rateLimit'];
  private buckets: Map<string, number[]>;

  constructor(config: EmailServiceConfig['rateLimit']) {
    this.config = config;
    this.buckets = new Map();
  }

  async allow(): Promise<boolean> {
    const now = Date.now();
    
    // Check per-second limit
    if (!this.checkLimit('second', now, 1000, this.config.maxPerSecond)) {
      return false;
    }
    
    // Check per-minute limit
    if (!this.checkLimit('minute', now, 60000, this.config.maxPerMinute)) {
      return false;
    }
    
    // Check per-hour limit
    if (!this.checkLimit('hour', now, 3600000, this.config.maxPerHour)) {
      return false;
    }
    
    return true;
  }

  private checkLimit(
    bucketName: string,
    now: number,
    windowMs: number,
    maxCount: number
  ): boolean {
    const bucket = this.buckets.get(bucketName) || [];
    const windowStart = now - windowMs;
    
    // Remove old entries
    const filtered = bucket.filter(time => time > windowStart);
    
    if (filtered.length >= maxCount) {
      return false;
    }
    
    // Add current request
    filtered.push(now);
    this.buckets.set(bucketName, filtered);
    
    return true;
  }
}

/**
 * Email Metrics
 */
class EmailMetrics {
  private metrics: Map<string, any>;

  constructor() {
    this.metrics = new Map();
  }

  recordSuccess(provider: string, result: EmailResult): void {
    const key = `${provider}:success`;
    const count = this.metrics.get(key) || 0;
    this.metrics.set(key, count + 1);
  }

  recordFailure(provider: string, error: Error): void {
    const key = `${provider}:failure`;
    const count = this.metrics.get(key) || 0;
    this.metrics.set(key, count + 1);
  }

  recordEvent(event: EmailEvent): void {
    const key = `event:${event.type}`;
    const count = this.metrics.get(key) || 0;
    this.metrics.set(key, count + 1);
  }

  async getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<EmailStatistics> {
    // Aggregate metrics for date range
    return {
      sent: this.metrics.get('total:sent') || 0,
      delivered: this.metrics.get('total:delivered') || 0,
      opened: this.metrics.get('event:open') || 0,
      clicked: this.metrics.get('event:click') || 0,
      bounced: this.metrics.get('event:bounce') || 0,
      complained: this.metrics.get('event:complaint') || 0,
      unsubscribed: this.metrics.get('event:unsubscribe') || 0,
    };
  }
}

/**
 * Type Definitions
 */
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  category?: string;
  tags?: string[];
}

interface EmailEvent {
  type: 'open' | 'click' | 'bounce' | 'complaint' | 'unsubscribe';
  recipient: string;
  timestamp: string;
  messageId?: string;
  bounceType?: 'hard' | 'soft';
  url?: string;
}

interface EmailValidation {
  valid: boolean;
  reason?: string;
}

interface EmailStatistics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}

/**
 * Export configured instance
 */
export const emailService = new EmailService({
  providers: {
    primary: 'sendgrid' as any,
    secondary: 'ses' as any,
    tertiary: 'smtp' as any,
  },
  defaults: {
    fromEmail: 'noreply@castmatch.com',
    fromName: 'CastMatch',
    replyTo: 'support@castmatch.com',
  },
  rateLimit: {
    maxPerSecond: 10,
    maxPerMinute: 300,
    maxPerHour: 10000,
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    maxBackoffMs: 10000,
  },
  monitoring: {
    webhookUrl: process.env.EMAIL_WEBHOOK_URL,
    metricsEnabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});