/**
 * Email Service Test Suite
 * Comprehensive tests for email functionality
 */

import { EmailService } from '../../src/services/email.service';
import { CacheManager } from '../../src/config/redis';

// Mock external dependencies
jest.mock('@sendgrid/mail');
jest.mock('mailgun.js');
jest.mock('resend');
jest.mock('nodemailer');
jest.mock('../../src/config/redis');
jest.mock('../../src/utils/logger');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockSendGridSend: jest.Mock;
  let mockMailgunCreate: jest.Mock;
  let mockResendSend: jest.Mock;
  let mockNodemailerSend: jest.Mock;

  beforeEach(() => {
    // Reset environment variables
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.MAILGUN_API_KEY = 'test-mailgun-key';
    process.env.MAILGUN_DOMAIN = 'test.mailgun.org';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.EMAIL_FROM = 'test@castmatch.com';
    process.env.EMAIL_FROM_NAME = 'CastMatch Test';
    process.env.FRONTEND_URL = 'http://localhost:3001';

    // Mock implementations
    mockSendGridSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
    mockMailgunCreate = jest.fn().mockResolvedValue({ id: 'test-mailgun-id' });
    mockResendSend = jest.fn().mockResolvedValue({ data: { id: 'test-resend-id' } });
    mockNodemailerSend = jest.fn().mockResolvedValue({ messageId: 'test-nodemailer-id' });

    // Mock SendGrid
    const mockSendGrid = {
      setApiKey: jest.fn(),
      send: mockSendGridSend,
    };
    require('@sendgrid/mail').default = mockSendGrid;

    // Mock Mailgun
    const mockMailgun = {
      client: jest.fn(() => ({
        messages: {
          create: mockMailgunCreate,
        },
      })),
    };
    require('mailgun.js').default = jest.fn(() => mockMailgun);

    // Mock Resend
    const mockResend = jest.fn(() => ({
      emails: {
        send: mockResendSend,
      },
    }));
    require('resend').Resend = mockResend;

    // Mock Nodemailer
    const mockNodemailer = {
      createTransporter: jest.fn(() => ({
        sendMail: mockNodemailerSend,
      })),
      getTestMessageUrl: jest.fn(() => 'http://test-preview-url.com'),
    };
    require('nodemailer').default = mockNodemailer;

    // Mock CacheManager
    const mockCacheManager = {
      set: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
    };
    (CacheManager as any) = mockCacheManager;

    emailService = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Provider Selection', () => {
    it('should use SendGrid when configured', () => {
      process.env.SENDGRID_API_KEY = 'test-key';
      delete process.env.MAILGUN_API_KEY;
      delete process.env.RESEND_API_KEY;
      
      const service = new EmailService();
      expect((service as any).provider).toBe('sendgrid');
    });

    it('should use Mailgun when SendGrid not configured', () => {
      delete process.env.SENDGRID_API_KEY;
      process.env.MAILGUN_API_KEY = 'test-key';
      process.env.MAILGUN_DOMAIN = 'test.com';
      
      const service = new EmailService();
      expect((service as any).provider).toBe('mailgun');
    });

    it('should use Resend when SendGrid and Mailgun not configured', () => {
      delete process.env.SENDGRID_API_KEY;
      delete process.env.MAILGUN_API_KEY;
      process.env.RESEND_API_KEY = 'test-key';
      
      const service = new EmailService();
      expect((service as any).provider).toBe('resend');
    });

    it('should fallback to SMTP when no providers configured', () => {
      delete process.env.SENDGRID_API_KEY;
      delete process.env.MAILGUN_API_KEY;
      delete process.env.RESEND_API_KEY;
      
      const service = new EmailService();
      expect((service as any).provider).toBe('smtp');
    });
  });

  describe('sendEmail', () => {
    it('should send email with SendGrid provider', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test Text',
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: {
          email: 'test@castmatch.com',
          name: 'CastMatch Test',
        },
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test Text',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      });
    });

    it('should handle SendGrid errors gracefully', async () => {
      mockSendGridSend.mockRejectedValue(new Error('SendGrid error'));

      await expect(emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        priority: 'high',
      })).rejects.toThrow('SendGrid error');
    });

    it('should add email to queue for non-high priority', async () => {
      const mockQueue = {
        add: jest.fn().mockResolvedValue(true),
      };
      (emailService as any).emailQueue = mockQueue;

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        priority: 'normal',
      });

      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('Template Processing', () => {
    it('should compile templates with variables', async () => {
      const mockTemplate = {
        html: '<h1>Hello {{name}}</h1>',
        text: 'Hello {{name}}',
      };

      (emailService as any).templateCache.set('test-template', mockTemplate);

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'test-template',
        templateData: { name: 'John Doe' },
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Hello John Doe</h1>',
          text: 'Hello John Doe',
        })
      );
    });

    it('should handle nested template variables', async () => {
      const mockTemplate = {
        html: '<h1>Hello {{user.firstName}} {{user.lastName}}</h1>',
        text: 'Hello {{user.firstName}} {{user.lastName}}',
      };

      (emailService as any).templateCache.set('test-template', mockTemplate);

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'test-template',
        templateData: { user: { firstName: 'John', lastName: 'Doe' } },
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Hello John Doe</h1>',
          text: 'Hello John Doe',
        })
      );
    });
  });

  describe('Welcome Email', () => {
    it('should send welcome email for actor role', async () => {
      await emailService.sendWelcomeEmailWithTemplate({
        to: 'actor@example.com',
        name: 'John Actor',
        role: 'ACTOR',
        verificationToken: 'test-token',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'actor@example.com',
          subject: 'Welcome to CastMatch - Your Journey Begins!',
        })
      );
    });

    it('should send welcome email for casting director role', async () => {
      await emailService.sendWelcomeEmailWithTemplate({
        to: 'director@example.com',
        name: 'Jane Director',
        role: 'CASTING_DIRECTOR',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'director@example.com',
          subject: 'Welcome to CastMatch - Your Journey Begins!',
        })
      );
    });
  });

  describe('Password Reset Email', () => {
    it('should send password reset email with token', async () => {
      await emailService.sendPasswordResetEmailWithTemplate({
        to: 'user@example.com',
        name: 'John User',
        resetToken: 'reset-token-123',
        expiryHours: 2,
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your CastMatch Password',
        })
      );
    });
  });

  describe('Email Verification', () => {
    it('should send email verification with token', async () => {
      await emailService.sendEmailVerificationWithTemplate(
        'user@example.com',
        'John User',
        'verify-token-123'
      );

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verify Your CastMatch Email Address',
        })
      );
    });
  });

  describe('OAuth Integration Notifications', () => {
    it('should send Google OAuth linked notification', async () => {
      await emailService.sendOAuthLinkedNotification(
        'user@example.com',
        'John User',
        'google',
        { email: 'john@gmail.com' }
      );

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Google Account Successfully Linked',
        })
      );
    });

    it('should send GitHub OAuth linked notification', async () => {
      await emailService.sendOAuthLinkedNotification(
        'user@example.com',
        'John User',
        'github',
        { username: 'johndoe' }
      );

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Github Account Successfully Linked',
        })
      );
    });
  });

  describe('Profile Completion Reminders', () => {
    it('should send profile completion reminder', async () => {
      await emailService.sendProfileCompletionReminder(
        'user@example.com',
        'John User',
        {
          completionPercentage: 75,
          completedItems: ['Basic Info', 'Photos'],
          pendingItems: ['Experience', 'Skills'],
          unsubscribeToken: 'unsub-token',
        }
      );

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Complete Your Profile - 75% Done',
        })
      );
    });
  });

  describe('Security Alerts', () => {
    it('should send login security alert', async () => {
      await emailService.sendSecurityAlert({
        to: 'user@example.com',
        name: 'John User',
        alertType: 'login',
        ipAddress: '192.168.1.1',
        location: 'Mumbai, India',
        timestamp: new Date(),
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Security Alert: New login to your account',
        })
      );
    });

    it('should send password change security alert', async () => {
      await emailService.sendSecurityAlert({
        to: 'user@example.com',
        name: 'John User',
        alertType: 'password_change',
        timestamp: new Date(),
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Security Alert: Your password was changed',
        })
      );
    });
  });

  describe('2FA Code Email', () => {
    it('should send 2FA verification code', async () => {
      await emailService.send2FACode('user@example.com', 'John User', '123456');

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '123456 is your CastMatch verification code',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle template loading errors gracefully', async () => {
      // Mock file system error
      jest.spyOn(require('fs/promises'), 'readFile').mockRejectedValue(new Error('File not found'));

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'non-existent-template',
        templateData: { name: 'John' },
        priority: 'high',
      });

      // Should use default template
      expect(mockSendGridSend).toHaveBeenCalled();
    });

    it('should track email delivery', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        priority: 'high',
      });

      expect(CacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('email_delivery_log'),
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          provider: 'sendgrid',
        }),
        86400
      );
    });
  });

  describe('Email Options', () => {
    it('should handle attachments', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        attachments: [
          {
            filename: 'test.pdf',
            content: Buffer.from('test content'),
            contentId: 'test-attachment',
          },
        ],
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'test.pdf',
              content: 'dGVzdCBjb250ZW50', // base64 encoded
              type: 'application/octet-stream',
              disposition: 'attachment',
              contentId: 'test-attachment',
            },
          ],
        })
      );
    });

    it('should handle categories', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        categories: ['welcome', 'onboarding'],
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['welcome', 'onboarding'],
        })
      );
    });

    it('should handle custom arguments', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        customArgs: { userId: '123', campaignId: 'welcome' },
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          customArgs: { userId: '123', campaignId: 'welcome' },
        })
      );
    });

    it('should handle reply-to address', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        replyTo: 'support@castmatch.com',
        priority: 'high',
      });

      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'support@castmatch.com',
        })
      );
    });
  });
});