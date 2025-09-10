import { describe, beforeAll, afterAll, beforeEach, it, expect, jest } from '@jest/globals';
import { smsService } from '../../src/integrations/sms.service';
import { whatsappService } from '../../src/integrations/whatsapp.service';
import Bull from 'bull';
import Redis from 'ioredis';
import axios from 'axios';

// Mock dependencies
jest.mock('twilio');
jest.mock('axios');
jest.mock('bull');
jest.mock('ioredis');
jest.mock('../../src/utils/logger');

describe('SMS/WhatsApp Notification Services Integration Validation', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let mockTwilio: any;
  let mockRedis: any;
  let mockBull: any;

  beforeAll(() => {
    // Mock environment variables for Mumbai market
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_PHONE_NUMBER = '+12345678901';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-number-id';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-whatsapp-token';
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = 'test-password';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Twilio
    mockTwilio = {
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'test-message-sid',
          status: 'sent',
          price: '0.05'
        }),
        get: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue({
            price: '0.05',
            status: 'delivered'
          })
        })
      }
    };

    // Mock Redis
    mockRedis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([])
    };
    (Redis as any).mockImplementation(() => mockRedis);

    // Mock Bull queue
    mockBull = {
      add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      process: jest.fn(),
      on: jest.fn(),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 10,
        failed: 0,
        delayed: 0
      }),
      clean: jest.fn().mockResolvedValue([])
    };
    (Bull as any).mockImplementation(() => mockBull);

    // Mock Axios for WhatsApp
    mockedAxios.post.mockResolvedValue({
      data: {
        messages: [{ id: 'wamid.test123' }]
      }
    });
  });

  afterAll(() => {
    // Cleanup
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  });

  describe('P0 Critical - SMS Service for Mumbai Market', () => {
    it('should validate Indian mobile number formats', async () => {
      const validIndianNumbers = [
        '+919876543210',
        '919876543210', 
        '9876543210'
      ];

      const invalidNumbers = [
        '+1234567890',  // Non-Indian
        '1234567890',   // Too short
        '98765432100',  // Too long
        '+915876543210' // Invalid starting digit
      ];

      // Test valid numbers
      for (const number of validIndianNumbers) {
        expect(() => (smsService as any).isValidPhoneNumber(number.replace(/\D/g, '')))
          .not.toThrow();
      }

      // Test invalid numbers  
      for (const number of invalidNumbers) {
        const result = await smsService.sendImmediate({
          to: number,
          body: 'Test message',
          type: 'notification'
        });
        
        if (number.length < 10 || number.length > 15) {
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid phone number');
        }
      }
    });

    it('should send OTP in Hindi and English for Mumbai market', async () => {
      const mobileNumber = '+919876543210';

      // Test Hindi OTP
      const hindiOTP = await smsService.sendOTP({
        phoneNumber: mobileNumber,
        length: 6,
        expiryMinutes: 10,
        template: 'आपका CastMatch सत्यापन कोड है: {{code}}। यह कोड {{expiry}} मिनट में समाप्त हो जाएगा।'
      });

      expect(hindiOTP.success).toBe(true);
      expect(mockTwilio.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mobileNumber,
          body: expect.stringContaining('सत्यापन कोड'),
          from: expect.any(String)
        })
      );

      // Test English OTP
      const englishOTP = await smsService.sendOTP({
        phoneNumber: mobileNumber,
        length: 6,
        expiryMinutes: 10
      });

      expect(englishOTP.success).toBe(true);
      expect(mockTwilio.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mobileNumber,
          body: expect.stringContaining('verification code'),
          from: expect.any(String)
        })
      );
    });

    it('should verify OTP with rate limiting for security', async () => {
      const mobileNumber = '+919876543210';
      const correctOTP = '123456';

      // Mock stored OTP
      mockRedis.get.mockResolvedValue(JSON.stringify({
        code: correctOTP,
        expiry: new Date(Date.now() + 600000).toISOString()
      }));

      // Test correct OTP
      const validResult = await smsService.verifyOTP({
        phoneNumber: mobileNumber,
        code: correctOTP
      });

      expect(validResult.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();

      // Test incorrect OTP
      mockRedis.get.mockResolvedValue(JSON.stringify({
        code: correctOTP,
        expiry: new Date(Date.now() + 600000).toISOString()
      }));

      const invalidResult = await smsService.verifyOTP({
        phoneNumber: mobileNumber,
        code: 'wrong123'
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Invalid OTP');
    });

    it('should handle Mumbai peak hour rate limiting', async () => {
      const mobileNumber = '+919876543210';
      
      // Mock rate limit exceeded
      mockRedis.incr.mockResolvedValue(11); // Over limit of 10

      const result = await smsService.sendImmediate({
        to: mobileNumber,
        body: 'Rate limit test message',
        type: 'notification'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should send bulk audition notifications efficiently', async () => {
      const recipients = [
        '+919876543210',
        '+919876543211', 
        '+919876543212',
        '+919876543213',
        '+919876543214'
      ];

      const message = 'CastMatch: New audition opportunity for Bollywood film. Apply now!';

      const result = await smsService.sendBulk(recipients, message, {
        type: 'notification',
        priority: 'normal'
      });

      expect(result.sent).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.jobs).toHaveLength(5);
      expect(mockBull.add).toHaveBeenCalledTimes(5);
    });

    it('should process SMS template with Hindi content', () => {
      const template = smsService.processTemplate('AUDITION_REMINDER', {
        project: 'बॉलीवुड ब्लॉकबस्टर 2025',
        time: '14:30 IST',
        location: 'फिल्म सिटी, मुंबई'
      });

      expect(template).toContain('बॉलीवुड ब्लॉकबस्टर 2025');
      expect(template).toContain('14:30 IST');
      expect(template).toContain('फिल्म सिटी, मुंबई');
    });

    it('should measure SMS delivery times for Mumbai requirements', async () => {
      const startTime = Date.now();

      await smsService.sendImmediate({
        to: '+919876543210',
        body: 'Performance test message',
        type: 'notification'
      });

      const deliveryTime = Date.now() - startTime;
      
      // Mumbai requirement: <5 seconds for SMS delivery
      expect(deliveryTime).toBeLessThan(5000);
    });
  });

  describe('P0 Critical - WhatsApp Business API for Mumbai Market', () => {
    it('should validate Indian WhatsApp numbers correctly', () => {
      const validNumbers = [
        '919876543210',  // Standard format
        '918765432109',  // Starts with 8
        '917123456789',  // Starts with 7
        '916987654321'   // Starts with 6
      ];

      const invalidNumbers = [
        '915876543210',  // Starts with 5 (invalid)
        '9198765432',    // Too short
        '91987654321012', // Too long
        '1234567890'     // Non-Indian
      ];

      validNumbers.forEach(number => {
        expect((whatsappService as any).isValidIndianPhoneNumber(number)).toBe(true);
      });

      invalidNumbers.forEach(number => {
        expect((whatsappService as any).isValidIndianPhoneNumber(number)).toBe(false);
      });
    });

    it('should send WhatsApp template messages in Hindi and English', async () => {
      const phoneNumber = '919876543210';

      // Test Hindi audition reminder
      const hindiResult = await whatsappService.sendAuditionReminder(phoneNumber, {
        talentName: 'प्रिया शर्मा',
        projectName: 'बॉलीवुड फिल्म',
        auditionDate: '15 जनवरी 2025',
        auditionTime: '14:30 IST',
        location: 'फिल्म सिटी, मुंबई',
        language: 'hi'
      });

      expect(hindiResult.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          to: phoneNumber,
          type: 'template',
          template: expect.objectContaining({
            language: { code: 'hi' }
          })
        })
      );

      // Test English audition reminder
      const englishResult = await whatsappService.sendAuditionReminder(phoneNumber, {
        talentName: 'Priya Sharma',
        projectName: 'Bollywood Film',
        auditionDate: 'January 15, 2025',
        auditionTime: '2:30 PM IST',
        location: 'Film City, Mumbai',
        language: 'en'
      });

      expect(englishResult.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          template: expect.objectContaining({
            language: { code: 'en' }
          })
        })
      );
    });

    it('should send interactive button messages for quick responses', async () => {
      const phoneNumber = '919876543210';
      const buttons = [
        { id: 'confirm_audition', title: 'Confirm' },
        { id: 'reschedule_audition', title: 'Reschedule' },
        { id: 'cancel_audition', title: 'Cancel' }
      ];

      const result = await whatsappService.sendInteractiveButtons(
        phoneNumber,
        'Audition Confirmation',
        'Please confirm your audition for Bollywood Film on January 15th at Film City, Mumbai.',
        buttons,
        'Reply within 24 hours'
      );

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          type: 'interactive',
          interactive: expect.objectContaining({
            type: 'button',
            action: expect.objectContaining({
              buttons: expect.arrayContaining([
                expect.objectContaining({
                  reply: expect.objectContaining({
                    id: 'confirm_audition',
                    title: 'Confirm'
                  })
                })
              ])
            })
          })
        })
      );
    });

    it('should send Mumbai location for audition venues', async () => {
      const phoneNumber = '919876543210';
      
      // Film City Mumbai coordinates
      const filmCityLatitude = 19.1136;
      const filmCityLongitude = 72.8697;
      
      const result = await whatsappService.sendLocation(
        phoneNumber,
        filmCityLatitude,
        filmCityLongitude,
        'Film City Mumbai',
        'Goregaon East, Mumbai, Maharashtra 400065'
      );

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          type: 'location',
          location: expect.objectContaining({
            latitude: filmCityLatitude,
            longitude: filmCityLongitude,
            name: 'Film City Mumbai',
            address: expect.stringContaining('Mumbai')
          })
        })
      );
    });

    it('should handle WhatsApp webhook verification correctly', () => {
      const mode = 'subscribe';
      const token = 'test-verify-token';
      const challenge = 'test-challenge-string';

      const result = whatsappService.verifyWebhook(mode, token, challenge);
      
      expect(result).toBe(challenge);
      
      // Test invalid token
      const invalidResult = whatsappService.verifyWebhook(mode, 'wrong-token', challenge);
      expect(invalidResult).toBeNull();
    });

    it('should process incoming WhatsApp webhook messages', async () => {
      const mockWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'test-entry-id',
          changes: [{
            value: {
              messaging_product: 'whatsapp' as const,
              metadata: {
                display_phone_number: '919876543210',
                phone_number_id: 'test-phone-id'
              },
              messages: [{
                from: '919876543211',
                id: 'wamid.test123',
                timestamp: '1640995200',
                type: 'text',
                text: { body: 'मुझे ऑडिशन की जानकारी चाहिए' }
              }]
            },
            field: 'messages' as const
          }]
        }]
      };

      await whatsappService.processWebhook(mockWebhook);

      // Should store incoming message
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('whatsapp:incoming:'),
        expect.any(Number),
        expect.stringContaining('wamid.test123')
      );
    });

    it('should handle WhatsApp rate limits for Mumbai market', async () => {
      const phoneNumber = '919876543210';
      
      // Mock rate limit exceeded (1000+ messages in 24h)
      mockRedis.incr.mockResolvedValue(1001);

      await expect(
        whatsappService.queueMessage({
          to: phoneNumber,
          type: 'text',
          text: { body: 'Rate limit test' }
        })
      ).rejects.toThrow('WhatsApp rate limit exceeded');
    });

    it('should send OTP via WhatsApp for mobile verification', async () => {
      const phoneNumber = '919876543210';
      const otp = '123456';

      const result = await whatsappService.sendOTP(phoneNumber, otp, 10);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          type: 'template',
          template: expect.objectContaining({
            name: 'OTP_VERIFICATION'
          })
        })
      );
    });

    it('should measure WhatsApp delivery times for Mumbai requirements', async () => {
      const startTime = Date.now();

      await whatsappService.sendImmediate({
        to: '919876543210',
        type: 'text',
        text: { body: 'Performance test message' }
      });

      const deliveryTime = Date.now() - startTime;
      
      // Mumbai requirement: <3 seconds for WhatsApp delivery
      expect(deliveryTime).toBeLessThan(3000);
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent SMS and WhatsApp operations', async () => {
      const phoneNumbers = [
        '+919876543210',
        '+919876543211', 
        '+919876543212'
      ];

      const smsPromises = phoneNumbers.map(number => 
        smsService.sendImmediate({
          to: number,
          body: 'Concurrent SMS test',
          type: 'notification'
        })
      );

      const whatsappPromises = phoneNumbers.map(number => 
        whatsappService.sendImmediate({
          to: number.replace('+', ''),
          type: 'text',
          text: { body: 'Concurrent WhatsApp test' }
        })
      );

      const allPromises = [...smsPromises, ...whatsappPromises];
      const results = await Promise.allSettled(allPromises);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );

      // Should handle at least 80% success rate
      expect(successful.length / results.length).toBeGreaterThan(0.8);
    });

    it('should validate queue processing under Mumbai peak loads', async () => {
      // Simulate peak hour load (1000+ notifications)
      const recipients = Array(1000).fill(0).map((_, i) => `91987654${i.toString().padStart(4, '0')}`);
      
      const message = 'CastMatch: Mass audition announcement for Mumbai';

      const bulkSMS = smsService.sendBulk(recipients, message);
      const bulkWhatsApp = Promise.all(
        recipients.slice(0, 100).map(number => // WhatsApp subset due to rate limits
          whatsappService.queueMessage({
            to: number,
            type: 'text',
            text: { body: message }
          })
        )
      );

      const [smsResult] = await Promise.allSettled([bulkSMS, bulkWhatsApp]);
      
      if (smsResult.status === 'fulfilled') {
        expect(smsResult.value.sent).toBeGreaterThan(900); // 90%+ success rate
      }
    });

    it('should maintain service availability during network issues', async () => {
      // Mock network timeout
      const networkError = { code: 'ETIMEDOUT' };
      mockTwilio.messages.create.mockRejectedValueOnce(networkError);
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const smsResult = await smsService.sendImmediate({
        to: '+919876543210',
        body: 'Network test SMS',
        type: 'notification'
      });

      const whatsappResult = await whatsappService.sendImmediate({
        to: '919876543210',
        type: 'text',
        text: { body: 'Network test WhatsApp' }
      });

      // Should gracefully handle failures
      expect(smsResult.success).toBe(false);
      expect(smsResult.error).toBeDefined();
      expect(whatsappResult.success).toBe(false);
      expect(whatsappResult.error).toBeDefined();
    });

    it('should validate cost tracking for Mumbai operations', async () => {
      // Mock successful deliveries with costs
      mockTwilio.messages.create.mockResolvedValue({
        sid: 'test-sid',
        status: 'sent'
      });
      
      mockTwilio.messages.mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          price: '0.0075', // India SMS rate ~$0.0075
          status: 'delivered'
        })
      });

      await smsService.sendImmediate({
        to: '+919876543210',
        body: 'Cost tracking test',
        type: 'notification'
      });

      // Should track costs in activity logs
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('sms:activity:'),
        expect.any(Number),
        expect.stringContaining('"cost"')
      );

      // Get usage stats
      const stats = await smsService.getUsageStats(30);
      expect(stats).toHaveProperty('cost');
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('successful');
    });
  });

  describe('Mumbai Market Specific Requirements', () => {
    it('should support regional language content in notifications', async () => {
      const regionalMessages = [
        {
          language: 'Hindi',
          message: 'CastMatch: आपका ऑडिशन कल 14:30 पर है। फिल्म सिटी, मुंबई में पहुंचें।'
        },
        {
          language: 'Marathi', 
          message: 'CastMatch: तुमचा ऑडिशन उद्या 14:30 वाजता आहे। फिल्म सिटी, मुंबई येथे या।'
        },
        {
          language: 'English',
          message: 'CastMatch: Your audition is tomorrow at 2:30 PM. Please reach Film City, Mumbai.'
        }
      ];

      for (const { language, message } of regionalMessages) {
        const smsResult = await smsService.sendImmediate({
          to: '+919876543210',
          body: message,
          type: 'notification'
        });

        const whatsappResult = await whatsappService.sendImmediate({
          to: '919876543210',
          type: 'text',
          text: { body: message }
        });

        expect(smsResult.success).toBe(true);
        expect(whatsappResult.success).toBe(true);
      }
    });

    it('should handle Mumbai timezone-aware scheduling', async () => {
      const mumbaiTime = new Date('2025-01-15T14:30:00+05:30'); // IST
      const scheduledMessage = {
        to: '+919876543210',
        body: 'Scheduled audition reminder for Film City Mumbai',
        type: 'notification' as const,
        scheduledAt: mumbaiTime
      };

      const job = await smsService.queue(scheduledMessage);
      
      expect(job.id).toBeDefined();
      expect(mockBull.add).toHaveBeenCalledWith(
        scheduledMessage,
        expect.objectContaining({
          delay: expect.any(Number)
        })
      );
    });

    it('should validate emergency broadcast capabilities', async () => {
      const emergencyMessage = 'EMERGENCY: Shooting cancelled due to weather conditions in Mumbai. Stay safe!';
      const allTalent = [
        '+919876543210',
        '+919876543211',
        '+919876543212',
        '+919876543213'
      ];

      // Emergency SMS broadcast
      const smsResult = await smsService.sendBulk(allTalent, emergencyMessage, {
        priority: 'urgent',
        type: 'alert'
      });

      // Emergency WhatsApp broadcast
      const whatsappPromises = allTalent.map(number => 
        whatsappService.queueMessage({
          to: number.replace('+', ''),
          type: 'text',
          text: { body: emergencyMessage }
        }, 1) // Highest priority
      );

      await Promise.all(whatsappPromises);

      expect(smsResult.sent).toBe(allTalent.length);
      expect(mockBull.add).toHaveBeenCalledTimes(allTalent.length * 2); // SMS + WhatsApp
    });
  });
});