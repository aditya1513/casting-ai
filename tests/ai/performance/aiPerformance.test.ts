import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import AIService from '../../../src/services/ai/aiService';
import { UserBehaviorEvent } from '../../../src/services/ai/types';

describe('AI Service Performance Tests', () => {
  let aiService: AIService;

  beforeAll(async () => {
    aiService = new AIService();
    await aiService.initialize();
  });

  afterAll(async () => {
    await aiService.cleanup();
  });

  describe('Event Processing Performance', () => {
    it('should process single events within acceptable time limits', async () => {
      const event: UserBehaviorEvent = {
        userId: 'perf-test-user',
        sessionId: 'perf-session',
        eventType: 'page_view',
        eventData: { page: '/dashboard' },
        timestamp: new Date(),
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'performance-test-agent',
        },
      };

      const startTime = Date.now();
      await aiService.trackUserBehavior(event);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle batch event processing efficiently', async () => {
      const batchSize = 100;
      const events: UserBehaviorEvent[] = Array.from({ length: batchSize }, (_, i) => ({
        userId: `batch-user-${i % 10}`,
        sessionId: `batch-session-${i}`,
        eventType: 'bulk_event',
        eventData: { index: i, batch: 'performance-test' },
        timestamp: new Date(Date.now() - i * 1000),
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'batch-test-agent',
        },
      }));

      const startTime = Date.now();
      
      await Promise.all(
        events.map(event => aiService.trackUserBehavior(event))
      );
      
      const duration = Date.now() - startTime;
      const eventsPerSecond = (batchSize * 1000) / duration;

      console.log(`Processed ${batchSize} events in ${duration}ms (${eventsPerSecond.toFixed(2)} events/second)`);

      expect(duration).toBeLessThan(30000);
      expect(eventsPerSecond).toBeGreaterThan(10);
    });

    it('should maintain consistent performance under sustained load', async () => {
      const iterations = 5;
      const eventsPerIteration = 50;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const events: UserBehaviorEvent[] = Array.from({ length: eventsPerIteration }, (_, j) => ({
          userId: `sustained-user-${j % 5}`,
          sessionId: `sustained-session-${i}-${j}`,
          eventType: 'sustained_load_test',
          eventData: { iteration: i, index: j },
          timestamp: new Date(),
          metadata: { ipAddress: '127.0.0.1' },
        }));

        const startTime = Date.now();
        await Promise.all(events.map(event => aiService.trackUserBehavior(event)));
        const duration = Date.now() - startTime;
        
        durations.push(duration);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      console.log(`Sustained load test - Avg: ${avgDuration.toFixed(2)}ms, Min: ${minDuration}ms, Max: ${maxDuration}ms`);

      expect(maxDuration - minDuration).toBeLessThan(avgDuration * 0.5);
      expect(avgDuration).toBeLessThan(10000);
    });
  });

  describe('Analytics Performance', () => {
    it('should analyze profile quality quickly', async () => {
      const testUsers = Array.from({ length: 10 }, (_, i) => `analytics-user-${i}`);

      const startTime = Date.now();
      const analyses = await Promise.all(
        testUsers.map(userId => aiService.analyzeProfileQuality(userId))
      );
      const duration = Date.now() - startTime;

      expect(analyses).toHaveLength(testUsers.length);
      expect(duration).toBeLessThan(15000);
      
      const avgTimePerAnalysis = duration / testUsers.length;
      console.log(`Profile analysis - ${avgTimePerAnalysis.toFixed(2)}ms per user`);
      
      expect(avgTimePerAnalysis).toBeLessThan(2000);
    });

    it('should perform churn prediction efficiently', async () => {
      const testUsers = Array.from({ length: 5 }, (_, i) => `churn-user-${i}`);

      const startTime = Date.now();
      const predictions = await Promise.all(
        testUsers.map(userId => aiService.predictChurn(userId))
      );
      const duration = Date.now() - startTime;

      expect(predictions).toHaveLength(testUsers.length);
      expect(duration).toBeLessThan(20000);
      
      predictions.forEach(prediction => {
        expect(prediction.churnProbability).toBeGreaterThanOrEqual(0);
        expect(prediction.churnProbability).toBeLessThanOrEqual(1);
      });
    });

    it('should handle user segmentation at scale', async () => {
      const testUsers = Array.from({ length: 20 }, (_, i) => `segment-user-${i}`);

      const startTime = Date.now();
      const segmentations = await Promise.all(
        testUsers.map(userId => aiService.identifyUserSegments(userId))
      );
      const duration = Date.now() - startTime;

      expect(segmentations).toHaveLength(testUsers.length);
      expect(duration).toBeLessThan(30000);

      segmentations.forEach(segments => {
        expect(Array.isArray(segments)).toBe(true);
      });
    });
  });

  describe('Notification Performance', () => {
    it('should personalize notifications quickly', async () => {
      const baseNotification = {
        subject: 'Test Performance Notification',
        body: 'This is a performance test notification for {name}',
        priority: 'medium' as const,
      };

      const testUsers = Array.from({ length: 15 }, (_, i) => `notification-user-${i}`);

      const startTime = Date.now();
      const personalizedNotifications = await Promise.all(
        testUsers.map(userId => 
          aiService.personalizeNotificationContent(userId, baseNotification)
        )
      );
      const duration = Date.now() - startTime;

      expect(personalizedNotifications).toHaveLength(testUsers.length);
      expect(duration).toBeLessThan(10000);

      const avgPersonalizationTime = duration / testUsers.length;
      console.log(`Notification personalization - ${avgPersonalizationTime.toFixed(2)}ms per user`);
      
      expect(avgPersonalizationTime).toBeLessThan(1000);
    });

    it('should predict optimal timing efficiently', async () => {
      const notification = {
        subject: 'Timing Test',
        body: 'Testing optimal timing prediction',
        priority: 'low' as const,
      };

      const testUsers = Array.from({ length: 10 }, (_, i) => `timing-user-${i}`);

      const startTime = Date.now();
      const timingPredictions = await Promise.all(
        testUsers.map(userId => 
          aiService.predictOptimalNotificationTiming(userId, notification)
        )
      );
      const duration = Date.now() - startTime;

      expect(timingPredictions).toHaveLength(testUsers.length);
      expect(duration).toBeLessThan(8000);

      timingPredictions.forEach(timing => {
        expect(timing.optimalTime).toBeInstanceOf(Date);
        expect(timing.confidence).toBeGreaterThanOrEqual(0);
        expect(timing.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Security Intelligence Performance', () => {
    it('should assess threats quickly', async () => {
      const testIPs = Array.from({ length: 20 }, (_, i) => `192.168.1.${i + 1}`);
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      const startTime = Date.now();
      const threatAssessments = await Promise.all(
        testIPs.map(ip => aiService.assessSecurityThreat(ip, userAgent))
      );
      const duration = Date.now() - startTime;

      expect(threatAssessments).toHaveLength(testIPs.length);
      expect(duration).toBeLessThan(15000);

      const avgAssessmentTime = duration / testIPs.length;
      console.log(`Threat assessment - ${avgAssessmentTime.toFixed(2)}ms per IP`);
      
      expect(avgAssessmentTime).toBeLessThan(1000);
    });

    it('should detect fraud quickly', async () => {
      const testTransactions = Array.from({ length: 10 }, (_, i) => ({
        userId: `fraud-test-user-${i}`,
        transactionData: {
          amount: 100 + i * 50,
          isNewDevice: i % 2 === 0,
          isNewLocation: i % 3 === 0,
          timeFromLastTransaction: i * 3600,
          paymentMethodAge: i * 7,
        },
      }));

      const startTime = Date.now();
      const fraudScores = await Promise.all(
        testTransactions.map(tx => 
          aiService.detectFraud(tx.userId, tx.transactionData)
        )
      );
      const duration = Date.now() - startTime;

      expect(fraudScores).toHaveLength(testTransactions.length);
      expect(duration).toBeLessThan(5000);

      fraudScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Platform Intelligence Performance', () => {
    it('should collect metrics quickly', async () => {
      const startTime = Date.now();
      const metrics = await aiService.getPlatformMetrics();
      const duration = Date.now() - startTime;

      expect(metrics).toBeDefined();
      expect(duration).toBeLessThan(5000);

      console.log(`Platform metrics collection - ${duration}ms`);
    });

    it('should calculate health score efficiently', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const healthScore = await aiService.getPlatformHealthScore();
        const duration = Date.now() - startTime;

        durations.push(duration);
        expect(healthScore).toBeGreaterThanOrEqual(0);
        expect(healthScore).toBeLessThanOrEqual(1);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      console.log(`Health score calculation - ${avgDuration.toFixed(2)}ms average`);
      
      expect(avgDuration).toBeLessThan(3000);
    });

    it('should analyze feature adoption efficiently', async () => {
      const features = [
        'profile_completion',
        'talent_search',
        'notifications',
        'messaging',
        'portfolio_upload',
      ];

      const startTime = Date.now();
      const analyses = await Promise.all(
        features.map(feature => aiService.analyzeFeatureAdoption(feature))
      );
      const duration = Date.now() - startTime;

      expect(analyses).toHaveLength(features.length);
      expect(duration).toBeLessThan(10000);

      const avgAnalysisTime = duration / features.length;
      console.log(`Feature adoption analysis - ${avgAnalysisTime.toFixed(2)}ms per feature`);
      
      expect(avgAnalysisTime).toBeLessThan(3000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      const events: UserBehaviorEvent[] = Array.from({ length: 200 }, (_, i) => ({
        userId: `memory-test-user-${i % 20}`,
        sessionId: `memory-session-${i}`,
        eventType: 'memory_test',
        eventData: { index: i, data: 'x'.repeat(100) },
        timestamp: new Date(),
        metadata: { ipAddress: '127.0.0.1' },
      }));

      await Promise.all(
        events.map(event => aiService.trackUserBehavior(event))
      );

      const analysis = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          aiService.analyzeProfileQuality(`memory-test-user-${i}`)
        )
      );

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);

      expect(memoryGrowthMB).toBeLessThan(100);
      expect(analysis).toHaveLength(10);
    });

    it('should cleanup resources properly', async () => {
      const beforeCleanup = process.memoryUsage();
      
      await aiService.cleanup();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiService2 = new AIService();
      await aiService2.initialize();
      
      const afterReinit = process.memoryUsage();
      
      const memoryDifference = afterReinit.heapUsed - beforeCleanup.heapUsed;
      const memoryDifferenceMB = Math.abs(memoryDifference) / (1024 * 1024);
      
      console.log(`Memory difference after cleanup/reinit: ${memoryDifferenceMB.toFixed(2)}MB`);
      
      expect(memoryDifferenceMB).toBeLessThan(50);
      
      await aiService2.cleanup();
      
      aiService = new AIService();
      await aiService.initialize();
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle mixed concurrent operations efficiently', async () => {
      const users = Array.from({ length: 5 }, (_, i) => `concurrent-user-${i}`);
      
      const startTime = Date.now();
      
      const operations = await Promise.all([
        ...users.map(userId => aiService.analyzeProfileQuality(userId)),
        ...users.map(userId => aiService.identifyUserSegments(userId)),
        ...users.map(userId => aiService.predictChurn(userId)),
        aiService.getPlatformMetrics(),
        aiService.getPlatformHealthScore(),
        aiService.generateBusinessInsights(),
      ]);
      
      const duration = Date.now() - startTime;
      
      expect(operations).toHaveLength(users.length * 3 + 3);
      expect(duration).toBeLessThan(25000);
      
      console.log(`Mixed concurrent operations - ${duration}ms for ${operations.length} operations`);
      
      const operationsPerSecond = (operations.length * 1000) / duration;
      expect(operationsPerSecond).toBeGreaterThan(1);
    });
  });
});