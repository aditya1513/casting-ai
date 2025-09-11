/**
 * SMS Service
 * Multi-provider SMS integration with automatic failover
 */

import twilio from 'twilio';
import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { CacheManager } from '../config/redis';
import Bull, { Queue, Job } from 'bull';

// Types
interface SMSOptions {
  to: string | string[];
  message: string;
  from?: string;
  priority?: boolean;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
  mediaUrl?: string[];
  statusCallback?: string;
}

interface SMSProvider {
  name: 'twilio' | 'textlocal' | 'msg91' | 'sns';
  isActive: boolean;
  priority: number;
  sendSMS: (options: SMSOptions) => Promise<SMSResponse>;
  getBalance?: () => Promise<number>;
  validateNumber?: (phone: string) => Promise<boolean>;
}

interface SMSResponse {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  to: string;
  provider: string;
  cost?: number;
  error?: string;
}

interface SMSTemplate {
  name: string;
  content: string;
  variables: string[];
  category: 'transactional' | 'promotional' | 'otp';
}

export class SMSService {
  private providers: Map<string, SMSProvider> = new Map();
  private smsQueue: Queue<SMSOptions>;
  private templates: Map<string, SMSTemplate> = new Map();
  private currentProvider: SMSProvider | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 30000; // 30 seconds
  
  constructor() {
    this.initializeProviders();
    this.initializeQueue();
    this.loadTemplates();
  }
  
  /**
   * Initialize SMS providers
   */
  private async initializeProviders(): Promise<void> {
    try {
      // Twilio (Primary)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        
        this.providers.set('twilio', {
          name: 'twilio',
          isActive: true,
          priority: 1,
          sendSMS: async (options: SMSOptions) => {
            const recipients = Array.isArray(options.to) ? options.to : [options.to];
            const results: SMSResponse[] = [];
            
            for (const to of recipients) {
              try {
                const message = await twilioClient.messages.create({
                  body: options.message,
                  to: this.formatPhoneNumber(to),
                  from: options.from || process.env.TWILIO_PHONE_NUMBER,
                  mediaUrl: options.mediaUrl,
                  statusCallback: options.statusCallback,
                });
                
                results.push({
                  messageId: message.sid,
                  status: message.status as any,
                  to,
                  provider: 'twilio',
                  cost: message.price ? parseFloat(message.price) : undefined,
                });
              } catch (error: any) {
                logger.error('Twilio SMS failed:', error);
                results.push({
                  messageId: '',
                  status: 'failed',
                  to,
                  provider: 'twilio',
                  error: error.message,
                });
              }
            }
            
            return results[0]; // Return first result for single recipient
          },
          getBalance: async () => {
            const account = await twilioClient.balance.fetch();
            return parseFloat(account.balance);
          },
          validateNumber: async (phone: string) => {
            try {
              const lookup = await twilioClient.lookups.v1
                .phoneNumbers(phone)
                .fetch();
              return lookup.phoneNumber !== null;
            } catch {
              return false;
            }
          },
        });
        
        this.currentProvider = this.providers.get('twilio')!;
        logger.info('Twilio SMS provider initialized');
      }
      
      // TextLocal (Secondary - for India)
      if (process.env.TEXTLOCAL_API_KEY) {
        this.providers.set('textlocal', {
          name: 'textlocal',
          isActive: true,
          priority: 2,
          sendSMS: async (options: SMSOptions) => {
            const recipients = Array.isArray(options.to) ? options.to : [options.to];
            
            const response = await axios.post(
              'https://api.textlocal.in/send/',
              null,
              {
                params: {
                  apikey: process.env.TEXTLOCAL_API_KEY,
                  numbers: recipients.join(','),
                  message: options.message,
                  sender: options.from || process.env.TEXTLOCAL_SENDER,
                },
              }
            );
            
            if (response.data.status === 'success') {
              return {
                messageId: response.data.batch_id,
                status: 'sent',
                to: recipients[0],
                provider: 'textlocal',
                cost: response.data.cost,
              };
            } else {
              throw new Error(response.data.errors?.[0]?.message || 'SMS failed');
            }
          },
          getBalance: async () => {
            const response = await axios.post(
              'https://api.textlocal.in/balance/',
              null,
              {
                params: {
                  apikey: process.env.TEXTLOCAL_API_KEY,
                },
              }
            );
            return response.data.balance.sms;
          },
        });
        
        logger.info('TextLocal SMS provider initialized');
      }
      
      // MSG91 (Tertiary - for India)
      if (process.env.MSG91_AUTH_KEY) {
        this.providers.set('msg91', {
          name: 'msg91',
          isActive: true,
          priority: 3,
          sendSMS: async (options: SMSOptions) => {
            const recipients = Array.isArray(options.to) ? options.to : [options.to];
            
            const response = await axios.post(
              'https://api.msg91.com/api/v5/flow/',
              {
                flow_id: process.env.MSG91_FLOW_ID,
                sender: options.from || process.env.MSG91_SENDER,
                mobiles: recipients.join(','),
                message: options.message,
              },
              {
                headers: {
                  authkey: process.env.MSG91_AUTH_KEY,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            return {
              messageId: response.data.request_id,
              status: 'sent',
              to: recipients[0],
              provider: 'msg91',
            };
          },
        });
        
        logger.info('MSG91 SMS provider initialized');
      }
      
      // AWS SNS (Quaternary)
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SNS_ENABLED === 'true') {
        const AWS = require('aws-sdk');
        AWS.config.update({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
        });
        
        const sns = new AWS.SNS();
        
        this.providers.set('sns', {
          name: 'sns',
          isActive: true,
          priority: 4,
          sendSMS: async (options: SMSOptions) => {
            const recipients = Array.isArray(options.to) ? options.to : [options.to];
            const results: SMSResponse[] = [];
            
            for (const to of recipients) {
              try {
                const params = {
                  Message: options.message,
                  PhoneNumber: this.formatPhoneNumber(to),
                  MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': {
                      DataType: 'String',
                      StringValue: options.priority ? 'Transactional' : 'Promotional',
                    },
                  },
                };
                
                const result = await sns.publish(params).promise();
                
                results.push({
                  messageId: result.MessageId,
                  status: 'sent',
                  to,
                  provider: 'sns',
                });
              } catch (error: any) {
                logger.error('AWS SNS SMS failed:', error);
                results.push({
                  messageId: '',
                  status: 'failed',
                  to,
                  provider: 'sns',
                  error: error.message,
                });
              }
            }
            
            return results[0];
          },
        });
        
        logger.info('AWS SNS SMS provider initialized');
      }
      
    } catch (error) {
      logger.error('Failed to initialize SMS providers:', error);
    }
  }
  
  /**
   * Initialize SMS queue
   */
  private initializeQueue(): void {
    this.smsQueue = new Bull<SMSOptions>('sms-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: this.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.retryDelay,
        },
      },
    });
    
    // Process SMS jobs
    this.smsQueue.process(async (job: Job<SMSOptions>) => {
      return await this.processSMSJob(job);
    });
    
    // Handle failed jobs
    this.smsQueue.on('failed', (job, err) => {
      logger.error(`SMS job ${job.id} failed:`, err);
      this.logSMSFailure(job.data, err.message);
    });
  }
  
  /**
   * Load SMS templates
   */
  private async loadTemplates(): Promise<void> {
    const defaultTemplates: SMSTemplate[] = [
      {
        name: 'otp',
        content: 'Your CastMatch verification code is {{code}}. Valid for {{validity}} minutes.',
        variables: ['code', 'validity'],
        category: 'otp',
      },
      {
        name: 'welcome',
        content: 'Welcome to CastMatch, {{name}}! Complete your profile to start your casting journey.',
        variables: ['name'],
        category: 'transactional',
      },
      {
        name: 'audition-reminder',
        content: 'Reminder: Your audition for {{role}} is scheduled for {{date}} at {{time}}. Location: {{location}}',
        variables: ['role', 'date', 'time', 'location'],
        category: 'transactional',
      },
      {
        name: 'password-reset',
        content: 'CastMatch: Your password reset code is {{code}}. Do not share this code with anyone.',
        variables: ['code'],
        category: 'transactional',
      },
      {
        name: 'casting-invitation',
        content: 'You have been invited to audition for {{role}} in {{project}}. Check your CastMatch app for details.',
        variables: ['role', 'project'],
        category: 'transactional',
      },
    ];
    
    for (const template of defaultTemplates) {
      this.templates.set(template.name, template);
    }
    
    // Load custom templates from database
    try {
      const customTemplates = await prisma.smsTemplate.findMany({
        where: { isActive: true },
      });
      
      for (const template of customTemplates) {
        this.templates.set(template.name, {
          name: template.name,
          content: template.content,
          variables: template.variables as string[],
          category: template.category as any,
        });
      }
    } catch (error) {
      logger.error('Failed to load custom SMS templates:', error);
    }
  }
  
  /**
   * Send SMS
   */
  async sendSMS(options: SMSOptions): Promise<SMSResponse> {
    try {
      // Validate options
      this.validateSMSOptions(options);
      
      // Check if SMS should be queued
      if (options.scheduledFor && options.scheduledFor > new Date()) {
        return await this.queueSMS(options);
      }
      
      // Check rate limits
      await this.checkRateLimit(options.to);
      
      // Send SMS with retry logic
      const result = await this.sendWithRetry(options);
      
      // Log successful send
      await this.logSMSSuccess(options, result);
      
      return result;
      
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      
      // Queue for retry if immediate send fails
      if (options.priority) {
        await this.queueSMS(options);
      }
      
      throw error;
    }
  }
  
  /**
   * Send OTP
   */
  async sendOTP(phone: string, code: string, validity = 10): Promise<SMSResponse> {
    const message = this.processTemplate('otp', {
      code,
      validity: validity.toString(),
    });
    
    return await this.sendSMS({
      to: phone,
      message,
      priority: true,
      metadata: {
        type: 'otp',
        code,
        expiresAt: new Date(Date.now() + validity * 60 * 1000),
      },
    });
  }
  
  /**
   * Send bulk SMS
   */
  async sendBulkSMS(
    recipients: string[],
    message: string,
    options: Partial<SMSOptions> = {}
  ): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    // Split into batches
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const result = await this.sendSMS({
          ...options,
          to: batch,
          message,
        });
        
        results.push(result);
      } catch (error) {
        logger.error(`Bulk SMS batch ${i / batchSize} failed:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Queue SMS for delayed sending
   */
  private async queueSMS(options: SMSOptions): Promise<SMSResponse> {
    const jobOptions: any = {
      priority: options.priority ? 1 : 2,
    };
    
    if (options.scheduledFor) {
      jobOptions.delay = options.scheduledFor.getTime() - Date.now();
    }
    
    const job = await this.smsQueue.add(options, jobOptions);
    
    logger.info(`SMS queued with job ID: ${job.id}`);
    
    return {
      messageId: `queued:${job.id}`,
      status: 'queued',
      to: Array.isArray(options.to) ? options.to[0] : options.to,
      provider: 'queue',
    };
  }
  
  /**
   * Process queued SMS job
   */
  private async processSMSJob(job: Job<SMSOptions>): Promise<SMSResponse> {
    return await this.sendWithRetry(job.data);
  }
  
  /**
   * Send SMS with retry logic
   */
  private async sendWithRetry(
    options: SMSOptions,
    retryCount = 0
  ): Promise<SMSResponse> {
    try {
      if (!this.currentProvider) {
        throw new Error('No SMS provider available');
      }
      
      return await this.currentProvider.sendSMS(options);
      
    } catch (error) {
      logger.error(`SMS send attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount < this.maxRetries) {
        const fallbackProvider = await this.getFallbackProvider();
        if (fallbackProvider) {
          this.currentProvider = fallbackProvider;
          return await this.sendWithRetry(options, retryCount + 1);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Get fallback SMS provider
   */
  private async getFallbackProvider(): Promise<SMSProvider | null> {
    const providers = Array.from(this.providers.values())
      .filter(p => p.isActive && p !== this.currentProvider)
      .sort((a, b) => a.priority - b.priority);
    
    for (const provider of providers) {
      try {
        // Test provider if balance check is available
        if (provider.getBalance) {
          const balance = await provider.getBalance();
          if (balance > 0) {
            return provider;
          }
        } else {
          return provider;
        }
      } catch (error) {
        logger.error(`Fallback provider ${provider.name} unavailable:`, error);
        provider.isActive = false;
      }
    }
    
    return null;
  }
  
  /**
   * Process SMS template
   */
  private processTemplate(templateName: string, data: Record<string, string>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`SMS template "${templateName}" not found`);
    }
    
    let message = template.content;
    
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    return message;
  }
  
  /**
   * Validate SMS options
   */
  private validateSMSOptions(options: SMSOptions): void {
    if (!options.to) {
      throw new Error('SMS recipient is required');
    }
    
    if (!options.message) {
      throw new Error('SMS message is required');
    }
    
    if (options.message.length > 1600) {
      throw new Error('SMS message exceeds maximum length (1600 characters)');
    }
    
    // Validate phone numbers
    const phones = Array.isArray(options.to) ? options.to : [options.to];
    for (const phone of phones) {
      if (!this.isValidPhoneNumber(phone)) {
        throw new Error(`Invalid phone number: ${phone}`);
      }
    }
  }
  
  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation - should start with + and contain only digits
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }
  
  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let formatted = phone.replace(/[^\d+]/g, '');
    
    // Add + if not present
    if (!formatted.startsWith('+')) {
      // Assume US number if no country code
      if (formatted.length === 10) {
        formatted = '+1' + formatted;
      } else if (formatted.length === 11 && formatted.startsWith('1')) {
        formatted = '+' + formatted;
      }
      // For Indian numbers
      else if (formatted.length === 10 && formatted.startsWith('9')) {
        formatted = '+91' + formatted;
      }
    }
    
    return formatted;
  }
  
  /**
   * Check rate limits
   */
  private async checkRateLimit(to: string | string[]): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];
    
    for (const recipient of recipients) {
      const key = `sms:ratelimit:${recipient}`;
      const count = await CacheManager.get<number>(key);
      
      if (count && count >= 5) {
        throw new Error(`SMS rate limit exceeded for ${recipient}`);
      }
      
      await CacheManager.increment(key, 3600); // 1 hour TTL
    }
  }
  
  /**
   * Log successful SMS
   */
  private async logSMSSuccess(options: SMSOptions, result: SMSResponse): Promise<void> {
    try {
      await prisma.smsLog.create({
        data: {
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          message: options.message.substring(0, 160), // Store first 160 chars
          status: result.status,
          provider: result.provider,
          messageId: result.messageId,
          cost: result.cost,
          metadata: options.metadata as any,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to log SMS success:', error);
    }
  }
  
  /**
   * Log SMS failure
   */
  private async logSMSFailure(options: SMSOptions, error: string): Promise<void> {
    try {
      await prisma.smsLog.create({
        data: {
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          message: options.message.substring(0, 160),
          status: 'failed',
          provider: this.currentProvider?.name || 'unknown',
          error,
          metadata: options.metadata as any,
        },
      });
    } catch (err) {
      logger.error('Failed to log SMS failure:', err);
    }
  }
  
  /**
   * Get SMS balance
   */
  async getBalance(): Promise<Record<string, number>> {
    const balances: Record<string, number> = {};
    
    for (const [name, provider] of this.providers) {
      if (provider.getBalance) {
        try {
          balances[name] = await provider.getBalance();
        } catch (error) {
          logger.error(`Failed to get balance for ${name}:`, error);
          balances[name] = -1;
        }
      }
    }
    
    return balances;
  }
  
  /**
   * Validate phone number
   */
  async validatePhoneNumber(phone: string): Promise<boolean> {
    for (const provider of this.providers.values()) {
      if (provider.validateNumber) {
        try {
          return await provider.validateNumber(phone);
        } catch (error) {
          logger.error(`Phone validation failed with ${provider.name}:`, error);
        }
      }
    }
    
    // Fallback to basic validation
    return this.isValidPhoneNumber(phone);
  }
  
  /**
   * Get SMS statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<any> {
    const stats = await prisma.smsLog.groupBy({
      by: ['status', 'provider'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      _sum: {
        cost: true,
      },
    });
    
    return stats;
  }

  /**
   * Send 2FA code via SMS
   */
  async send2FACode(to: string, code: string): Promise<void> {
    await this.sendSMS({
      to,
      message: `Your CastMatch verification code is: ${code}. This code expires in 5 minutes.`,
      priority: true,
    });
  }
}

// Export singleton instance
export const smsService = new SMSService();