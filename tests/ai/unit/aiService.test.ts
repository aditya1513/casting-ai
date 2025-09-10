import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import AIService from '../../../src/services/ai/aiService';
import { UserBehaviorEvent } from '../../../src/services/ai/types';

describe('AIService', () => {
  let aiService: AIService;
  
  beforeEach(() => {
    aiService = new AIService();
  });

  afterEach(async () => {
    await aiService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await aiService.initialize();
      const status = await aiService.getServiceStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.services).toBeDefined();
      expect(Object.values(status.services)).toContain('active');
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await aiService.initialize();
      await aiService.initialize(); // Should not throw
      
      const status = await aiService.getServiceStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe('User Behavior Analytics', () => {
    const mockEvent: UserBehaviorEvent = {
      userId: 'test-user-123',
      sessionId: 'session-456',
      eventType: 'page_view',
      eventData: { page: '/dashboard' },
      timestamp: new Date(),
      metadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        platform: 'web',
      },
    };

    it('should track user behavior events', async () => {
      await aiService.initialize();
      
      await expect(aiService.trackUserBehavior(mockEvent))
        .resolves
        .not
        .toThrow();
    });

    it('should predict churn for users', async () => {
      await aiService.initialize();
      
      const churnPrediction = await aiService.predictChurn('test-user-123');
      
      expect(churnPrediction).toHaveProperty('churnProbability');
      expect(churnPrediction).toHaveProperty('riskLevel');
      expect(churnPrediction).toHaveProperty('factors');
      expect(churnPrediction).toHaveProperty('recommendedActions');
    });

    it('should identify user segments', async () => {
      await aiService.initialize();
      
      const segments = await aiService.identifyUserSegments('test-user-123');
      
      expect(Array.isArray(segments)).toBe(true);
    });

    it('should analyze user journey', async () => {
      await aiService.initialize();
      
      const journey = await aiService.getUserJourney('test-user-123');
      
      expect(Array.isArray(journey)).toBe(true);
    });
  });

  describe('Profile Intelligence', () => {
    it('should analyze profile quality', async () => {
      await aiService.initialize();
      
      const qualityScore = await aiService.analyzeProfileQuality('test-user-123');
      
      expect(qualityScore).toHaveProperty('overallScore');
      expect(qualityScore).toHaveProperty('completeness');
      expect(qualityScore).toHaveProperty('richness');
      expect(qualityScore).toHaveProperty('accuracy');
      expect(qualityScore).toHaveProperty('recency');
      expect(qualityScore).toHaveProperty('recommendations');
      expect(Array.isArray(qualityScore.recommendations)).toBe(true);
    });

    it('should infer profile data', async () => {
      await aiService.initialize();
      
      const inferences = await aiService.inferProfileData('test-user-123');
      
      expect(inferences).toBeDefined();
    });

    it('should validate profile with explanation', async () => {
      await aiService.initialize();
      
      const validation = await aiService.validateProfileWithExplanation('test-user-123');
      
      expect(validation).toHaveProperty('prediction');
      expect(validation).toHaveProperty('confidence');
      expect(validation).toHaveProperty('explanation');
      expect(validation.explanation).toHaveProperty('features');
      expect(validation.explanation).toHaveProperty('reasoning');
    });
  });

  describe('Intelligent Notifications', () => {
    const mockNotification = {
      subject: 'Test Notification',
      body: 'This is a test notification',
      priority: 'medium' as const,
    };

    it('should send smart notifications', async () => {
      await aiService.initialize();
      
      await expect(aiService.sendSmartNotification('test-user-123', mockNotification))
        .resolves
        .not
        .toThrow();
    });

    it('should personalize notification content', async () => {
      await aiService.initialize();
      
      const personalized = await aiService.personalizeNotificationContent(
        'test-user-123', 
        mockNotification
      );
      
      expect(personalized).toHaveProperty('subject');
      expect(personalized).toHaveProperty('body');
      expect(personalized).toHaveProperty('priority');
    });

    it('should predict optimal notification timing', async () => {
      await aiService.initialize();
      
      const timing = await aiService.predictOptimalNotificationTiming(
        'test-user-123',
        mockNotification
      );
      
      expect(timing).toHaveProperty('optimalTime');
      expect(timing).toHaveProperty('confidence');
      expect(timing).toHaveProperty('reasoning');
    });

    it('should run A/B tests', async () => {
      await aiService.initialize();
      
      const testConfig = {
        id: 'test-ab',
        name: 'Test A/B',
        description: 'Test A/B test',
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A',
            allocation: 0.5,
            config: { subject: 'Variant A Subject' },
          },
          {
            id: 'variant-b',
            name: 'Variant B',
            allocation: 0.5,
            config: { subject: 'Variant B Subject' },
          },
        ],
        targetAudience: [],
        startDate: new Date(),
        status: 'draft' as const,
        metrics: ['click_rate', 'conversion_rate'],
      };
      
      await expect(aiService.runABTest(testConfig))
        .resolves
        .not
        .toThrow();
    });
  });

  describe('Security Intelligence', () => {
    it('should assess security threats', async () => {
      await aiService.initialize();
      
      const threat = await aiService.assessSecurityThreat('192.168.1.1', 'Mozilla/5.0');
      
      // Threat may be null if no threat detected
      if (threat) {
        expect(threat).toHaveProperty('type');
        expect(threat).toHaveProperty('severity');
        expect(threat).toHaveProperty('description');
      }
    });

    it('should detect fraud', async () => {
      await aiService.initialize();
      
      const transactionData = {
        amount: 100,
        isNewDevice: false,
        isNewLocation: false,
        timeFromLastTransaction: 3600,
        paymentMethodAge: 30,
      };
      
      const fraudScore = await aiService.detectFraud('test-user-123', transactionData);
      
      expect(typeof fraudScore).toBe('number');
      expect(fraudScore).toBeGreaterThanOrEqual(0);
      expect(fraudScore).toBeLessThanOrEqual(1);
    });

    it('should monitor brute force attempts', async () => {
      await aiService.initialize();
      
      const actions = await aiService.monitorBruteForce('192.168.1.1', 'test-user');
      
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('Platform Intelligence', () => {
    it('should collect platform metrics', async () => {
      await aiService.initialize();
      
      const metrics = await aiService.getPlatformMetrics();
      
      expect(metrics).toHaveProperty('dailyActiveUsers');
      expect(metrics).toHaveProperty('monthlyActiveUsers');
      expect(metrics).toHaveProperty('userRetention');
      expect(metrics).toHaveProperty('featureAdoption');
      expect(metrics).toHaveProperty('performanceMetrics');
      expect(metrics).toHaveProperty('businessMetrics');
    });

    it('should calculate platform health score', async () => {
      await aiService.initialize();
      
      const healthScore = await aiService.getPlatformHealthScore();
      
      expect(typeof healthScore).toBe('number');
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(1);
    });

    it('should analyze feature adoption', async () => {
      await aiService.initialize();
      
      const adoption = await aiService.analyzeFeatureAdoption('profile_completion');
      
      expect(adoption).toHaveProperty('featureName');
      expect(adoption).toHaveProperty('currentAdoption');
      expect(adoption).toHaveProperty('predictedAdoption');
      expect(adoption).toHaveProperty('insights');
      expect(adoption).toHaveProperty('recommendations');
    });

    it('should generate business insights', async () => {
      await aiService.initialize();
      
      const insights = await aiService.generateBusinessInsights();
      
      expect(insights).toHaveProperty('predictedRevenue');
      expect(insights).toHaveProperty('predictedGrowth');
      expect(insights).toHaveProperty('predictedChurn');
      expect(insights).toHaveProperty('insights');
    });

    it('should provide platform health check', async () => {
      await aiService.initialize();
      
      const healthCheck = await aiService.getPlatformHealthCheck();
      
      expect(healthCheck).toHaveProperty('healthScore');
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('metrics');
      expect(healthCheck).toHaveProperty('bottlenecks');
      expect(healthCheck).toHaveProperty('timestamp');
    });
  });

  describe('Privacy Compliance', () => {
    it('should update user consent', async () => {
      await aiService.initialize();
      
      await expect(aiService.updateUserConsent('test-user-123', 'analytics', true))
        .resolves
        .not
        .toThrow();
    });

    it('should request data deletion', async () => {
      await aiService.initialize();
      
      const deletionRequest = await aiService.requestDataDeletion(
        'test-user-123',
        ['behavior', 'analytics']
      );
      
      expect(deletionRequest).toHaveProperty('id');
      expect(deletionRequest).toHaveProperty('requestedAt');
      expect(deletionRequest).toHaveProperty('status');
      expect(deletionRequest).toHaveProperty('dataTypes');
    });

    it('should generate privacy report', async () => {
      await aiService.initialize();
      
      const report = await aiService.generatePrivacyReport('test-user-123');
      
      expect(report).toHaveProperty('userId');
      expect(report).toHaveProperty('compliance');
      expect(report).toHaveProperty('dataInventory');
      expect(report).toHaveProperty('processingActivities');
      expect(report).toHaveProperty('riskAssessment');
      expect(report).toHaveProperty('recommendations');
    });

    it('should anonymize user data', async () => {
      await aiService.initialize();
      
      await expect(aiService.anonymizeUserData('test-user-123'))
        .resolves
        .not
        .toThrow();
    });
  });

  describe('General AI Insights', () => {
    it('should provide platform insights', async () => {
      await aiService.initialize();
      
      const insights = await aiService.getAIInsights('platform');
      
      expect(insights).toHaveProperty('scope', 'platform');
      expect(insights).toHaveProperty('timestamp');
      expect(insights).toHaveProperty('platformHealth');
      expect(insights).toHaveProperty('businessInsights');
    });

    it('should provide security insights', async () => {
      await aiService.initialize();
      
      const insights = await aiService.getAIInsights('security');
      
      expect(insights).toHaveProperty('scope', 'security');
      expect(insights).toHaveProperty('timestamp');
      expect(insights).toHaveProperty('securityStatus');
    });
  });

  describe('Error Handling', () => {
    it('should handle privacy-restricted operations gracefully', async () => {
      await aiService.initialize();
      
      const mockEvent: UserBehaviorEvent = {
        userId: 'restricted-user',
        sessionId: 'session-123',
        eventType: 'page_view',
        eventData: { page: '/dashboard' },
        timestamp: new Date(),
        metadata: { ipAddress: '127.0.0.1' },
      };
      
      await expect(aiService.trackUserBehavior(mockEvent))
        .resolves
        .not
        .toThrow();
    });

    it('should handle missing user data gracefully', async () => {
      await aiService.initialize();
      
      await expect(aiService.analyzeProfileQuality('non-existent-user'))
        .resolves
        .not
        .toThrow();
    });
  });

  describe('Service Management', () => {
    it('should provide service status', async () => {
      await aiService.initialize();
      
      const status = await aiService.getServiceStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('timestamp');
    });

    it('should cleanup resources properly', async () => {
      await aiService.initialize();
      await aiService.cleanup();
      
      const status = await aiService.getServiceStatus();
      expect(status.initialized).toBe(false);
    });
  });
});