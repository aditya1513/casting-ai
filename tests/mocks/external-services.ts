/**
 * External Services Mock
 * Mock implementations for external APIs and services
 */

import { jest } from '@jest/globals';
import nock from 'nock';

// Email Service Mocks
export const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-message-id'
  }),

  sendPasswordResetEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-reset-id'
  }),

  sendWelcomeEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-welcome-id'
  }),

  sendNotificationEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-notification-id'
  })
};

// SMS Service Mocks
export const mockSMSService = {
  sendVerificationSMS: jest.fn().mockResolvedValue({
    success: true,
    sid: 'mock-sms-sid'
  }),

  send2FASMS: jest.fn().mockResolvedValue({
    success: true,
    sid: 'mock-2fa-sid'
  })
};

// File Storage Service Mocks
export const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue({
    success: true,
    url: 'https://mock-bucket.s3.amazonaws.com/uploads/mock-file.jpg',
    key: 'uploads/mock-file.jpg'
  }),

  deleteFile: jest.fn().mockResolvedValue({
    success: true
  }),

  generatePresignedUrl: jest.fn().mockResolvedValue({
    success: true,
    url: 'https://mock-bucket.s3.amazonaws.com/presigned-url'
  }),

  getFileMetadata: jest.fn().mockResolvedValue({
    success: true,
    size: 1024,
    contentType: 'image/jpeg',
    lastModified: new Date()
  })
};

// Analytics Service Mocks
export const mockAnalyticsService = {
  track: jest.fn().mockResolvedValue(undefined),
  identify: jest.fn().mockResolvedValue(undefined),
  page: jest.fn().mockResolvedValue(undefined),
  group: jest.fn().mockResolvedValue(undefined)
};

// Push Notification Service Mocks
export const mockPushNotificationService = {
  sendToUser: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-push-id'
  }),

  sendToMultipleUsers: jest.fn().mockResolvedValue({
    success: true,
    successCount: 5,
    failureCount: 0
  }),

  subscribeToTopic: jest.fn().mockResolvedValue({
    success: true
  })
};

// AI/ML Service Mocks
export const mockAIService = {
  generateRecommendations: jest.fn().mockResolvedValue({
    recommendations: [
      { userId: 'user1', score: 0.95, reasons: ['Similar skills', 'Location match'] },
      { userId: 'user2', score: 0.87, reasons: ['Experience match', 'Language skills'] }
    ]
  }),

  analyzeProfile: jest.fn().mockResolvedValue({
    completionScore: 85,
    suggestedImprovements: ['Add more experience details', 'Upload portfolio images'],
    skillsMatch: 0.92
  }),

  moderateContent: jest.fn().mockResolvedValue({
    isAppropriate: true,
    confidence: 0.98,
    flaggedTerms: []
  })
};

// Payment Service Mocks
export const mockPaymentService = {
  createPaymentIntent: jest.fn().mockResolvedValue({
    success: true,
    clientSecret: 'pi_mock_client_secret',
    paymentIntentId: 'pi_mock_payment_intent'
  }),

  confirmPayment: jest.fn().mockResolvedValue({
    success: true,
    status: 'succeeded',
    paymentId: 'pay_mock_payment'
  }),

  refundPayment: jest.fn().mockResolvedValue({
    success: true,
    refundId: 'ref_mock_refund'
  })
};

// OAuth Provider Mocks
export const setupOAuthMocks = () => {
  // Google OAuth
  nock('https://oauth2.googleapis.com')
    .persist()
    .post('/token')
    .reply(200, {
      access_token: 'mock-google-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-google-refresh-token',
      scope: 'openid email profile'
    });

  nock('https://www.googleapis.com')
    .persist()
    .get('/oauth2/v2/userinfo')
    .reply(200, {
      id: '12345678901234567890',
      email: 'mockuser@gmail.com',
      verified_email: true,
      name: 'Mock Google User',
      given_name: 'Mock',
      family_name: 'User',
      picture: 'https://lh3.googleusercontent.com/mock-photo'
    });

  // GitHub OAuth
  nock('https://github.com')
    .persist()
    .post('/login/oauth/access_token')
    .reply(200, 'access_token=mock-github-token&scope=user%3Aemail&token_type=bearer');

  nock('https://api.github.com')
    .persist()
    .get('/user')
    .reply(200, {
      id: 123456,
      login: 'mockuser',
      name: 'Mock GitHub User',
      email: 'mockuser@github.com',
      avatar_url: 'https://avatars.githubusercontent.com/u/123456'
    });

  nock('https://api.github.com')
    .persist()
    .get('/user/emails')
    .reply(200, [
      {
        email: 'mockuser@github.com',
        primary: true,
        verified: true,
        visibility: 'public'
      }
    ]);
};

// Redis Cache Mocks
export const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  flushall: jest.fn().mockResolvedValue('OK'),
  
  // Hash operations
  hget: jest.fn().mockResolvedValue(null),
  hset: jest.fn().mockResolvedValue(1),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),

  // List operations
  lpush: jest.fn().mockResolvedValue(1),
  rpop: jest.fn().mockResolvedValue(null),
  llen: jest.fn().mockResolvedValue(0),

  // Set operations
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),

  // Connection
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG')
};

// Queue Service Mocks
export const mockQueueService = {
  add: jest.fn().mockResolvedValue({
    id: 'mock-job-id',
    data: {},
    opts: {}
  }),

  process: jest.fn().mockImplementation((jobName, processor) => {
    // Mock job processing
    return Promise.resolve();
  }),

  getJob: jest.fn().mockResolvedValue({
    id: 'mock-job-id',
    data: {},
    progress: 100,
    finishedOn: Date.now()
  }),

  removeJob: jest.fn().mockResolvedValue(undefined)
};

// External API Mocks for Testing Network Failures
export const setupNetworkFailureMocks = () => {
  nock('https://api.external-service.com')
    .get('/endpoint')
    .replyWithError({
      message: 'Network error',
      code: 'ECONNREFUSED'
    });

  nock('https://api.slow-service.com')
    .get('/endpoint')
    .delay(30000) // 30 second delay
    .reply(200, { data: 'delayed response' });

  nock('https://api.rate-limited.com')
    .get('/endpoint')
    .reply(429, {
      error: 'Rate limit exceeded',
      retry_after: 60
    });
};

// WebSocket Mock
export const mockWebSocketService = {
  emit: jest.fn().mockResolvedValue(undefined),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  
  // Connection simulation
  connect: jest.fn().mockImplementation((callback) => {
    callback();
  }),

  disconnect: jest.fn().mockImplementation((callback) => {
    callback();
  })
};

// Database Transaction Mocks
export const mockDatabaseService = {
  transaction: jest.fn().mockImplementation(async (callback) => {
    const mockTx = {
      user: {
        create: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
        update: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
        delete: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'mock-user-id' })
      },
      profile: {
        create: jest.fn().mockResolvedValue({ id: 'mock-profile-id' }),
        update: jest.fn().mockResolvedValue({ id: 'mock-profile-id' })
      }
    };
    
    return callback(mockTx);
  }),

  // Connection pool mocks
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  
  // Health check
  $queryRaw: jest.fn().mockResolvedValue([{ now: new Date() }])
};

// Cleanup function to clear all mocks
export const clearAllMocks = () => {
  jest.clearAllMocks();
  nock.cleanAll();
  
  // Reset mock implementations
  Object.values(mockEmailService).forEach(mock => mock.mockClear());
  Object.values(mockSMSService).forEach(mock => mock.mockClear());
  Object.values(mockStorageService).forEach(mock => mock.mockClear());
  Object.values(mockAnalyticsService).forEach(mock => mock.mockClear());
  Object.values(mockPushNotificationService).forEach(mock => mock.mockClear());
  Object.values(mockAIService).forEach(mock => mock.mockClear());
  Object.values(mockPaymentService).forEach(mock => mock.mockClear());
  Object.values(mockRedisClient).forEach(mock => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
  Object.values(mockQueueService).forEach(mock => mock.mockClear());
  Object.values(mockWebSocketService).forEach(mock => mock.mockClear());
  Object.values(mockDatabaseService).forEach(mock => mock.mockClear());
};

// Setup all mocks for testing
export const setupAllMocks = () => {
  setupOAuthMocks();
  
  // You can add more default mock setups here
  console.log('🎭 All external service mocks configured');
};

// Export mock configurations for specific test scenarios
export const mockConfigurations = {
  emailFailure: () => {
    mockEmailService.sendVerificationEmail.mockRejectedValue(new Error('Email service unavailable'));
  },
  
  storageFailure: () => {
    mockStorageService.uploadFile.mockRejectedValue(new Error('Storage service unavailable'));
  },
  
  slowNetwork: () => {
    mockEmailService.sendVerificationEmail.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, messageId: 'delayed' }), 5000))
    );
  },
  
  rateLimited: () => {
    mockEmailService.sendVerificationEmail.mockRejectedValue(
      Object.assign(new Error('Rate limit exceeded'), { status: 429 })
    );
  }
};