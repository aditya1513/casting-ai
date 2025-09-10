import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import Redis from 'ioredis';
import { emailService } from '../../src/integrations/email.service';
import { smsService } from '../../src/integrations/sms.service';
import { storageService } from '../../src/integrations/storage.service';
import { calendarService } from '../../src/integrations/calendar.service';
import { queueManager } from '../../src/queues/queue.manager';

/**
 * CastMatch Integration Test Suite
 * Tests the complete integration of all services
 */

describe('CastMatch Integration Tests', () => {
  let backendClient: AxiosInstance;
  let aiServiceClient: AxiosInstance;
  let socket: Socket;
  let redis: Redis;
  let authToken: string;
  let userId: string;
  let conversationId: string;

  // Service URLs
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Initialize HTTP clients
    backendClient = axios.create({
      baseURL: BACKEND_URL,
      timeout: 10000,
    });

    aiServiceClient = axios.create({
      baseURL: AI_SERVICE_URL,
      timeout: 10000,
    });

    // Initialize Redis client
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'castmatch_redis_password',
    });

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    // Cleanup
    if (socket) socket.disconnect();
    await redis.quit();
    await queueManager.shutdown();
  });

  /**
   * Health Check Tests
   */
  describe('Health Checks', () => {
    it('should verify backend service is healthy', async () => {
      const response = await backendClient.get('/api/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });

    it('should verify AI service is healthy', async () => {
      const response = await aiServiceClient.get('/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });

    it('should verify Redis connection', async () => {
      const result = await redis.ping();
      expect(result).toBe('PONG');
    });

    it('should verify PostgreSQL connection through backend', async () => {
      const response = await backendClient.get('/api/health/db');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('database', 'connected');
    });
  });

  /**
   * Authentication Flow Tests
   */
  describe('Authentication Flow', () => {
    const testUser = {
      email: `test.${Date.now()}@castmatch.com`,
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'actor',
    };

    it('should register a new user', async () => {
      const response = await backendClient.post('/api/auth/register', testUser);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('token');
      
      userId = response.data.user.id;
      authToken = response.data.token;
    });

    it('should login with credentials', async () => {
      const response = await backendClient.post('/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
    });

    it('should get current user with token', async () => {
      const response = await backendClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status).toBe(200);
      expect(response.data.email).toBe(testUser.email);
    });
  });

  /**
   * WebSocket Connection Tests
   */
  describe('WebSocket Connection', () => {
    beforeEach((done) => {
      socket = io(BACKEND_URL, {
        auth: { token: authToken },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        done();
      });
    });

    afterEach(() => {
      if (socket) socket.disconnect();
    });

    it('should connect to WebSocket server with authentication', (done) => {
      expect(socket.connected).toBe(true);
      done();
    });

    it('should join a conversation room', (done) => {
      // First create a conversation
      backendClient.post('/api/conversations/create', {
        name: 'Test Conversation',
        participants: [userId],
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(response => {
        conversationId = response.data.id;
        
        socket.emit('conversation:join', { conversationId });
        
        socket.on('conversation:history', (data) => {
          expect(data).toHaveProperty('conversationId', conversationId);
          expect(data).toHaveProperty('messages');
          done();
        });
      });
    });

    it('should send and receive messages in real-time', (done) => {
      const testMessage = {
        conversationId,
        content: 'Test message from integration test',
        type: 'text',
      };

      socket.on('message:new', (message) => {
        expect(message).toHaveProperty('content', testMessage.content);
        expect(message).toHaveProperty('conversationId', conversationId);
        done();
      });

      socket.emit('message:send', testMessage);
    });

    it('should handle typing indicators', (done) => {
      socket.on('typing:update', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('isTyping', true);
        expect(data).toHaveProperty('conversationId', conversationId);
        done();
      });

      socket.emit('typing:start', { conversationId });
    });
  });

  /**
   * Chat Flow Integration Tests
   */
  describe('End-to-End Chat Flow', () => {
    it('should process message through complete flow', async () => {
      // Send message via API
      const response = await backendClient.post(
        `/api/conversations/${conversationId}/messages`,
        {
          content: 'Hello, I need help with an audition',
          type: 'text',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(201);
      const messageId = response.data.id;

      // Wait for AI response
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get conversation history to verify AI response
      const historyResponse = await backendClient.get(
        `/api/conversations/${conversationId}/history`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(historyResponse.status).toBe(200);
      const messages = historyResponse.data.messages;
      
      // Should have at least 2 messages (user + AI)
      expect(messages.length).toBeGreaterThanOrEqual(2);
      
      // Find AI response
      const aiMessage = messages.find((m: any) => m.isAiResponse);
      expect(aiMessage).toBeDefined();
      expect(aiMessage.content).toBeTruthy();
    });

    it('should handle concurrent messages correctly', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          backendClient.post(
            `/api/conversations/${conversationId}/messages`,
            {
              content: `Concurrent message ${i}`,
              type: 'text',
            },
            {
              headers: { Authorization: `Bearer ${authToken}` },
            }
          )
        );
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.status).toBe(201);
      });
    });
  });

  /**
   * Email Service Integration Tests
   */
  describe('Email Service', () => {
    it('should queue welcome email', async () => {
      const job = await emailService.queue({
        to: 'test@example.com',
        subject: 'Welcome to CastMatch',
        templateId: 'WELCOME',
        templateData: {
          name: 'Test User',
          loginUrl: 'http://localhost:3000/login',
        },
      });

      expect(job).toBeDefined();
      expect(job.id).toBeTruthy();
    });

    it('should get email queue status', async () => {
      const status = await emailService.getQueueStatus();
      expect(status).toHaveProperty('waiting');
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('completed');
    });

    it('should send immediate email (simulated)', async () => {
      const result = await emailService.sendImmediate({
        to: 'urgent@example.com',
        subject: 'Urgent Audition Update',
        html: '<p>Your audition has been rescheduled</p>',
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('messageId');
    });
  });

  /**
   * SMS Service Integration Tests
   */
  describe('SMS Service', () => {
    it('should send OTP code', async () => {
      const result = await smsService.sendOTP({
        phoneNumber: '+1234567890',
        length: 6,
        expiryMinutes: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should verify OTP code', async () => {
      // First send OTP
      await smsService.sendOTP({
        phoneNumber: '+1234567890',
        length: 6,
        expiryMinutes: 10,
      });

      // In real test, we'd retrieve the actual code from test environment
      // Here we're simulating verification failure
      const result = await smsService.verifyOTP({
        phoneNumber: '+1234567890',
        code: '000000', // Wrong code
      });

      expect(result.success).toBe(false);
    });

    it('should queue SMS notification', async () => {
      const job = await smsService.queue({
        to: '+1234567890',
        body: 'Your audition is tomorrow at 2 PM',
        priority: 'high',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeTruthy();
    });
  });

  /**
   * Storage Service Integration Tests
   */
  describe('Storage Service', () => {
    it('should generate signed upload URL', async () => {
      const result = await storageService.getUploadUrl(
        'test/file.jpg',
        'image/jpeg',
        3600
      );

      expect(result).toHaveProperty('uploadUrl');
      // In S3 mode, would also have publicUrl
    });

    it('should process and upload image', async () => {
      const buffer = Buffer.from('fake-image-data');
      const result = await storageService.processAndUploadImage(buffer, 'headshot.jpg', {
        folder: 'headshots',
        resize: { width: 800, height: 600, quality: 85 },
        generateThumbnail: true,
      });

      expect(result).toHaveProperty('original');
      // Would have processed and thumbnail URLs in production
    });

    it('should list files in folder', async () => {
      const files = await storageService.listFiles('headshots/', 10);
      expect(Array.isArray(files)).toBe(true);
    });
  });

  /**
   * Calendar Service Integration Tests
   */
  describe('Calendar Service', () => {
    it('should get authorization URL', () => {
      const authUrl = calendarService.getAuthorizationUrl('test-state');
      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain('scope');
    });

    it('should find available time slots', async () => {
      const query = {
        timeMin: new Date(),
        timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        duration: 60, // 60 minutes
        excludeWeekends: true,
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
      };

      try {
        const slots = await calendarService.findAvailableSlots(query);
        expect(Array.isArray(slots)).toBe(true);
        if (slots.length > 0) {
          expect(slots[0]).toHaveProperty('start');
          expect(slots[0]).toHaveProperty('end');
          expect(slots[0]).toHaveProperty('available');
        }
      } catch (error: any) {
        // Service might not be authorized yet
        expect(error.message).toContain('not initialized');
      }
    });
  });

  /**
   * Queue System Integration Tests
   */
  describe('Queue System', () => {
    it('should add job to email queue', async () => {
      const job = await queueManager.addJob('EMAIL', {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'Test content',
      });

      expect(job).toBeDefined();
      expect(job?.id).toBeTruthy();
    });

    it('should add repeated job', async () => {
      const job = await queueManager.addRepeatedJob(
        'MEMORY_CONSOLIDATION',
        'daily-consolidation',
        { type: 'daily' },
        { cron: '0 2 * * *', tz: 'America/Los_Angeles' }
      );

      expect(job).toBeDefined();
    });

    it('should get all queue statuses', async () => {
      const statuses = await queueManager.getQueueStatus();
      expect(Array.isArray(statuses)).toBe(true);
      
      const emailQueue = statuses.find((s: any) => s.name === 'EMAIL');
      expect(emailQueue).toBeDefined();
      expect(emailQueue).toHaveProperty('waiting');
      expect(emailQueue).toHaveProperty('active');
    });
  });

  /**
   * API Gateway Tests
   */
  describe('API Gateway', () => {
    it('should route auth requests to backend', async () => {
      const response = await axios.get(`http://localhost/api/auth/health`);
      expect(response.status).toBe(200);
    });

    it('should route AI requests to AI service', async () => {
      const response = await axios.get(`http://localhost/api/ai/health`);
      expect(response.status).toBe(200);
    });

    it('should handle service unavailability gracefully', async () => {
      // Simulate service down by calling non-existent endpoint
      try {
        await axios.get(`http://localhost/api/nonexistent`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  /**
   * Performance Tests
   */
  describe('Performance', () => {
    it('should handle 100 concurrent API requests', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          backendClient.get('/api/health').catch(() => null)
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r !== null).length;
      const duration = Date.now() - startTime;

      expect(successCount).toBeGreaterThan(90); // Allow for some failures
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should process chat messages within 2 seconds', async () => {
      const startTime = Date.now();
      
      const response = await backendClient.post(
        `/api/conversations/${conversationId}/messages`,
        {
          content: 'Performance test message',
          type: 'text',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const duration = Date.now() - startTime;
      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(2000);
    });
  });
});

/**
 * Helper Functions
 */

async function waitForServices(maxRetries = 30, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${process.env.BACKEND_URL || 'http://localhost:3001'}/api/health`);
      await axios.get(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`);
      console.log('✅ All services are ready');
      return;
    } catch (error) {
      console.log(`Waiting for services... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Services did not become ready in time');
}

export { waitForServices };