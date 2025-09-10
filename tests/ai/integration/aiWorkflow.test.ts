import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import AIService from '../../../src/services/ai/aiService';
import { UserBehaviorEvent } from '../../../src/services/ai/types';

describe('AI Service Integration Tests', () => {
  let aiService: AIService;
  const testUserId = 'integration-test-user-123';

  beforeAll(async () => {
    aiService = new AIService();
    await aiService.initialize();
  });

  afterAll(async () => {
    await aiService.cleanup();
  });

  describe('Complete User Journey Workflow', () => {
    it('should handle complete user onboarding and profiling workflow', async () => {
      const events: UserBehaviorEvent[] = [
        {
          userId: testUserId,
          sessionId: 'session-001',
          eventType: 'user_registration',
          eventData: { source: 'web', referrer: 'google' },
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          metadata: {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            platform: 'web',
          },
        },
        {
          userId: testUserId,
          sessionId: 'session-001',
          eventType: 'profile_view',
          eventData: { page: '/profile', section: 'basic_info' },
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 300000), // 1 day ago + 5 min
          metadata: {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            platform: 'web',
          },
        },
        {
          userId: testUserId,
          sessionId: 'session-001',
          eventType: 'profile_update',
          eventData: { field: 'bio', action: 'add' },
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 600000), // 1 day ago + 10 min
          metadata: {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            platform: 'web',
          },
        },
      ];

      for (const event of events) {
        await aiService.trackUserBehavior(event);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const profileQuality = await aiService.analyzeProfileQuality(testUserId);
      expect(profileQuality).toBeDefined();
      expect(profileQuality.overallScore).toBeGreaterThanOrEqual(0);
      expect(profileQuality.recommendations).toBeDefined();

      const segments = await aiService.identifyUserSegments(testUserId);
      expect(Array.isArray(segments)).toBe(true);

      const churnPrediction = await aiService.predictChurn(testUserId);
      expect(churnPrediction).toBeDefined();
      expect(churnPrediction.churnProbability).toBeGreaterThanOrEqual(0);
      expect(churnPrediction.churnProbability).toBeLessThanOrEqual(1);
    }, 30000);

    it('should handle smart notification workflow with personalization', async () => {
      await aiService.updateUserConsent(testUserId, 'marketing', true);
      await aiService.updateUserConsent(testUserId, 'analytics', true);

      const baseNotification = {
        subject: 'Complete Your Profile',
        body: 'Hi {name}, complete your profile to get better recommendations',
        priority: 'medium' as const,
        metadata: { category: 'profile_completion' },
      };

      const personalizedContent = await aiService.personalizeNotificationContent(
        testUserId,
        baseNotification
      );
      expect(personalizedContent).toBeDefined();
      expect(personalizedContent.subject).toBeDefined();
      expect(personalizedContent.body).toBeDefined();

      const timing = await aiService.predictOptimalNotificationTiming(
        testUserId,
        personalizedContent
      );
      expect(timing).toBeDefined();
      expect(timing.optimalTime).toBeInstanceOf(Date);
      expect(timing.confidence).toBeGreaterThanOrEqual(0);
      expect(timing.confidence).toBeLessThanOrEqual(1);

      await aiService.sendSmartNotification(testUserId, personalizedContent, {
        immediate: true,
      });

    }, 15000);

    it('should handle security monitoring workflow', async () => {
      const suspiciousEvents: UserBehaviorEvent[] = [
        {
          userId: testUserId,
          sessionId: 'session-suspicious',
          eventType: 'login_attempt',
          eventData: { success: false },
          timestamp: new Date(),
          metadata: {
            ipAddress: '10.0.0.1',
            userAgent: 'Bot/1.0',
            platform: 'unknown',
          },
        },
        {
          userId: testUserId,
          sessionId: 'session-suspicious',
          eventType: 'login_attempt',
          eventData: { success: false },
          timestamp: new Date(),
          metadata: {
            ipAddress: '10.0.0.1',
            userAgent: 'Bot/1.0',
            platform: 'unknown',
          },
        },
      ];

      for (const event of suspiciousEvents) {
        await aiService.trackUserBehavior(event);
      }

      const threat = await aiService.assessSecurityThreat('10.0.0.1', 'Bot/1.0');
      
      if (threat) {
        expect(threat.type).toBeDefined();
        expect(threat.severity).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(threat.severity);
      }

      const bruteForceActions = await aiService.monitorBruteForce('10.0.0.1', testUserId);
      expect(Array.isArray(bruteForceActions)).toBe(true);

      const fraudScore = await aiService.detectFraud(testUserId, {
        amount: 1000,
        isNewDevice: true,
        isNewLocation: true,
        timeFromLastTransaction: 60,
        paymentMethodAge: 1,
      });
      expect(typeof fraudScore).toBe('number');
      expect(fraudScore).toBeGreaterThanOrEqual(0);
      expect(fraudScore).toBeLessThanOrEqual(1);
    }, 15000);
  });

  describe('Privacy Compliance Workflow', () => {
    it('should handle complete privacy compliance workflow', async () => {
      await aiService.updateUserConsent(testUserId, 'dataCollection', true);
      await aiService.updateUserConsent(testUserId, 'analytics', true);
      await aiService.updateUserConsent(testUserId, 'marketing', false);

      const privacyReport = await aiService.generatePrivacyReport(testUserId);
      expect(privacyReport).toBeDefined();
      expect(privacyReport.userId).toBe(testUserId);
      expect(privacyReport.compliance).toBeDefined();

      const deletionRequest = await aiService.requestDataDeletion(testUserId, ['analytics']);
      expect(deletionRequest).toBeDefined();
      expect(deletionRequest.id).toBeDefined();
      expect(deletionRequest.status).toBe('pending');
      expect(deletionRequest.dataTypes).toContain('analytics');

      await aiService.anonymizeUserData(testUserId);
    }, 10000);
  });

  describe('Platform Intelligence Workflow', () => {
    it('should collect and analyze platform-wide metrics', async () => {
      const metrics = await aiService.getPlatformMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.dailyActiveUsers).toBe('number');
      expect(typeof metrics.monthlyActiveUsers).toBe('number');

      const healthScore = await aiService.getPlatformHealthScore();
      expect(typeof healthScore).toBe('number');
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(1);

      const healthCheck = await aiService.getPlatformHealthCheck();
      expect(healthCheck).toBeDefined();
      expect(healthCheck.status).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(healthCheck.status);

      const featureAdoption = await aiService.analyzeFeatureAdoption('profile_completion');
      expect(featureAdoption).toBeDefined();
      expect(featureAdoption.featureName).toBe('profile_completion');

      const businessInsights = await aiService.generateBusinessInsights();
      expect(businessInsights).toBeDefined();
      expect(typeof businessInsights.predictedRevenue).toBe('number');
    }, 15000);
  });

  describe('A/B Testing Workflow', () => {
    it('should run complete A/B testing workflow', async () => {
      const testConfig = {
        id: 'integration-test-ab',
        name: 'Integration Test A/B',
        description: 'Testing notification subject lines',
        variants: [
          {
            id: 'variant-control',
            name: 'Control',
            allocation: 0.5,
            config: {
              subject: 'Complete Your Profile',
              body: 'Please complete your profile',
            },
          },
          {
            id: 'variant-personalized',
            name: 'Personalized',
            allocation: 0.5,
            config: {
              subject: 'Hi {name}, Your Profile Needs Attention',
              body: 'Hi {name}, complete your profile to unlock opportunities',
            },
          },
        ],
        targetAudience: [
          {
            field: 'user_type',
            operator: 'equals' as const,
            value: 'new_user',
          },
        ],
        startDate: new Date(),
        status: 'running' as const,
        metrics: ['open_rate', 'click_rate'],
      };

      await aiService.runABTest(testConfig);
    }, 10000);
  });

  describe('Cross-Service Integration', () => {
    it('should demonstrate data flow between all AI services', async () => {
      const event: UserBehaviorEvent = {
        userId: testUserId,
        sessionId: 'cross-service-test',
        eventType: 'feature_usage',
        eventData: { feature: 'talent_search', duration: 120 },
        timestamp: new Date(),
        metadata: {
          ipAddress: '192.168.1.200',
          userAgent: 'Mozilla/5.0 (Mac; Intel Mac OS X 10_15_7)',
          platform: 'web',
        },
      };

      await aiService.trackUserBehavior(event);

      const [
        profileQuality,
        userSegments,
        journey,
        insights
      ] = await Promise.all([
        aiService.analyzeProfileQuality(testUserId),
        aiService.identifyUserSegments(testUserId),
        aiService.getUserJourney(testUserId),
        aiService.getAIInsights('platform'),
      ]);

      expect(profileQuality).toBeDefined();
      expect(Array.isArray(userSegments)).toBe(true);
      expect(Array.isArray(journey)).toBe(true);
      expect(insights).toBeDefined();
      expect(insights.scope).toBe('platform');

      const notification = {
        subject: 'New Opportunities Available',
        body: 'Based on your activity, we found matching opportunities',
        priority: 'high' as const,
      };

      const personalizedNotification = await aiService.personalizeNotificationContent(
        testUserId,
        notification
      );
      expect(personalizedNotification).toBeDefined();

      await aiService.sendSmartNotification(testUserId, personalizedNotification);
    }, 20000);
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service degradation gracefully', async () => {
      const invalidEvent: UserBehaviorEvent = {
        userId: '',
        sessionId: '',
        eventType: 'invalid_event',
        eventData: {},
        timestamp: new Date(),
        metadata: {},
      };

      await expect(aiService.trackUserBehavior(invalidEvent))
        .resolves
        .not
        .toThrow();

      await expect(aiService.analyzeProfileQuality(''))
        .resolves
        .not
        .toThrow();

      await expect(aiService.predictChurn('non-existent-user'))
        .resolves
        .not
        .toThrow();
    });

    it('should maintain data consistency across services', async () => {
      await aiService.updateUserConsent(testUserId, 'analytics', false);

      const segments = await aiService.identifyUserSegments(testUserId);
      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBe(0);

      const journey = await aiService.getUserJourney(testUserId);
      expect(Array.isArray(journey)).toBe(true);
      expect(journey.length).toBe(0);

      await aiService.updateUserConsent(testUserId, 'analytics', true);

      const segmentsAfter = await aiService.identifyUserSegments(testUserId);
      expect(Array.isArray(segmentsAfter)).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent operations efficiently', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
        userId: `concurrent-user-${i}`,
        sessionId: `session-${i}`,
        eventType: 'bulk_test',
        eventData: { index: i },
        timestamp: new Date(),
        metadata: { ipAddress: '127.0.0.1' },
      }));

      const startTime = Date.now();

      await Promise.all(
        concurrentOperations.map(event => aiService.trackUserBehavior(event))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000);

      const parallelAnalyses = await Promise.all(
        concurrentOperations.slice(0, 5).map(event =>
          aiService.analyzeProfileQuality(event.userId)
        )
      );

      expect(parallelAnalyses).toHaveLength(5);
      parallelAnalyses.forEach(analysis => {
        expect(analysis).toBeDefined();
        expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      });
    }, 30000);
  });
});