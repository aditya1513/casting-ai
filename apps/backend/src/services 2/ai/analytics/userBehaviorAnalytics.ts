import { PrismaClient } from '@prisma/client';
import Analytics from 'analytics-node';
import Mixpanel from 'mixpanel';
import { PostHog } from 'posthog-node';
import * as tf from '@tensorflow/tfjs-node';
import * as stats from 'simple-statistics';
import { AIConfig } from '../core/config';
import { 
  UserBehaviorEvent, 
  UserSegment, 
  UserJourney, 
  JourneyStep,
  ChurnPrediction,
  ChurnFactor 
} from '../types';

export class UserBehaviorAnalytics {
  private prisma: PrismaClient;
  private segment?: Analytics;
  private mixpanel?: Mixpanel.Mixpanel;
  private posthog?: PostHog;
  private eventBuffer: UserBehaviorEvent[] = [];
  private journeyMap: Map<string, UserJourney> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeAnalyticsProviders();
  }

  private initializeAnalyticsProviders() {
    if (AIConfig.analytics.tracking.enabled) {
      if (AIConfig.analytics.segmentWriteKey) {
        this.segment = new Analytics(AIConfig.analytics.segmentWriteKey);
      }
      
      if (AIConfig.analytics.mixpanelToken) {
        this.mixpanel = Mixpanel.init(AIConfig.analytics.mixpanelToken);
      }
      
      if (AIConfig.analytics.posthogApiKey) {
        this.posthog = new PostHog(
          AIConfig.analytics.posthogApiKey,
          { host: AIConfig.analytics.posthogHost }
        );
      }
    }
  }

  async trackEvent(event: UserBehaviorEvent): Promise<void> {
    try {
      this.eventBuffer.push(event);

      if (this.segment) {
        this.segment.track({
          userId: event.userId,
          event: event.eventType,
          properties: event.eventData,
          timestamp: event.timestamp,
          context: event.metadata as any,
        });
      }

      if (this.mixpanel) {
        this.mixpanel.track(event.eventType, {
          distinct_id: event.userId,
          ...event.eventData,
          ...event.metadata,
        });
      }

      if (this.posthog) {
        this.posthog.capture({
          distinctId: event.userId,
          event: event.eventType,
          properties: {
            ...event.eventData,
            ...event.metadata,
          },
        });
      }

      await this.persistEvent(event);

      this.updateUserJourney(event);

      if (this.eventBuffer.length >= AIConfig.analytics.tracking.batchSize) {
        await this.processEventBatch();
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  private async persistEvent(event: UserBehaviorEvent): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO user_behavior_events (
        user_id, session_id, event_type, event_data, 
        timestamp, metadata
      ) VALUES (
        ${event.userId}, ${event.sessionId}, ${event.eventType}, 
        ${JSON.stringify(event.eventData)}, ${event.timestamp}, 
        ${JSON.stringify(event.metadata)}
      )
    `;
  }

  private updateUserJourney(event: UserBehaviorEvent): void {
    const journeyKey = `${event.userId}-${event.sessionId}`;
    let journey = this.journeyMap.get(journeyKey);

    if (!journey) {
      journey = {
        userId: event.userId,
        sessionId: event.sessionId,
        steps: [],
        startTime: event.timestamp,
        completed: false,
      };
      this.journeyMap.set(journeyKey, journey);
    }

    const step: JourneyStep = {
      stepNumber: journey.steps.length + 1,
      action: event.eventType,
      page: event.eventData.page || 'unknown',
      timestamp: event.timestamp,
      duration: journey.steps.length > 0 
        ? event.timestamp.getTime() - journey.steps[journey.steps.length - 1].timestamp.getTime()
        : 0,
      metadata: event.eventData,
    };

    journey.steps.push(step);

    if (event.eventType === 'goal_completed' || event.eventType === 'conversion') {
      journey.completed = true;
      journey.endTime = event.timestamp;
      journey.goal = event.eventData.goal;
      journey.conversionValue = event.eventData.value;
    }
  }

  async analyzeUserJourney(userId: string): Promise<UserJourney[]> {
    const journeys: UserJourney[] = [];
    
    for (const [key, journey] of this.journeyMap.entries()) {
      if (journey.userId === userId) {
        journeys.push(journey);
      }
    }

    const dbJourneys = await this.prisma.$queryRaw<UserJourney[]>`
      SELECT * FROM user_journeys 
      WHERE user_id = ${userId}
      ORDER BY start_time DESC
      LIMIT 100
    `;

    return [...journeys, ...dbJourneys];
  }

  async identifyUserSegments(userId: string): Promise<UserSegment[]> {
    const userEvents = await this.getUserEvents(userId, 30);
    const userProfile = await this.getUserProfile(userId);
    const segments: UserSegment[] = [];

    const powerUserSegment = this.checkPowerUser(userEvents);
    if (powerUserSegment) segments.push(powerUserSegment);

    const engagementSegment = this.checkEngagementLevel(userEvents);
    if (engagementSegment) segments.push(engagementSegment);

    const industrySegment = await this.checkIndustrySegment(userProfile);
    if (industrySegment) segments.push(industrySegment);

    const behaviorSegment = this.analyzeBehaviorPatterns(userEvents);
    if (behaviorSegment) segments.push(behaviorSegment);

    return segments;
  }

  private checkPowerUser(events: UserBehaviorEvent[]): UserSegment | null {
    const dailyActivity = this.calculateDailyActivity(events);
    const avgSessionDuration = this.calculateAvgSessionDuration(events);
    const featureUsage = this.calculateFeatureUsage(events);

    if (dailyActivity > 0.8 && avgSessionDuration > 300000 && featureUsage > 10) {
      return {
        id: 'power_users',
        name: 'Power Users',
        description: 'Highly engaged users with extensive platform usage',
        criteria: [
          { field: 'daily_activity', operator: 'greater_than', value: 0.8 },
          { field: 'avg_session_duration', operator: 'greater_than', value: 300000 },
          { field: 'feature_usage', operator: 'greater_than', value: 10 },
        ],
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  }

  private checkEngagementLevel(events: UserBehaviorEvent[]): UserSegment | null {
    const engagementScore = this.calculateEngagementScore(events);

    if (engagementScore > 0.7) {
      return {
        id: 'highly_engaged',
        name: 'Highly Engaged',
        description: 'Users with high engagement levels',
        criteria: [
          { field: 'engagement_score', operator: 'greater_than', value: 0.7 },
        ],
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else if (engagementScore < 0.3) {
      return {
        id: 'at_risk',
        name: 'At Risk',
        description: 'Users showing signs of disengagement',
        criteria: [
          { field: 'engagement_score', operator: 'less_than', value: 0.3 },
        ],
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  }

  private async checkIndustrySegment(userProfile: any): Promise<UserSegment | null> {
    if (!userProfile?.industry) return null;

    return {
      id: `industry_${userProfile.industry.toLowerCase().replace(/\s+/g, '_')}`,
      name: `${userProfile.industry} Professional`,
      description: `Users from the ${userProfile.industry} industry`,
      criteria: [
        { field: 'industry', operator: 'equals', value: userProfile.industry },
      ],
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private analyzeBehaviorPatterns(events: UserBehaviorEvent[]): UserSegment | null {
    const patterns = this.extractBehaviorPatterns(events);
    
    if (patterns.isMobileFirst) {
      return {
        id: 'mobile_first',
        name: 'Mobile First Users',
        description: 'Users primarily accessing via mobile devices',
        criteria: [
          { field: 'primary_platform', operator: 'equals', value: 'mobile' },
        ],
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (patterns.isWeekendUser) {
      return {
        id: 'weekend_warriors',
        name: 'Weekend Warriors',
        description: 'Users most active during weekends',
        criteria: [
          { field: 'activity_pattern', operator: 'equals', value: 'weekend' },
        ],
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  }

  async predictChurn(userId: string): Promise<ChurnPrediction> {
    const features = await this.extractChurnFeatures(userId);
    const model = await this.loadChurnModel();
    
    const prediction = model.predict(tf.tensor2d([features])) as tf.Tensor;
    const probability = (await prediction.data())[0];
    
    const factors = this.identifyChurnFactors(features);
    const riskLevel = probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low';
    
    const recommendedActions = this.generateRetentionActions(factors, riskLevel);
    
    return {
      userId,
      churnProbability: probability,
      riskLevel,
      factors,
      recommendedActions,
      predictedChurnDate: this.calculatePredictedChurnDate(probability),
    };
  }

  private async extractChurnFeatures(userId: string): Promise<number[]> {
    const events = await this.getUserEvents(userId, 90);
    const profile = await this.getUserProfile(userId);
    
    return [
      this.calculateDailyActivity(events),
      this.calculateAvgSessionDuration(events),
      this.calculateFeatureUsage(events),
      this.calculateEngagementScore(events),
      this.calculateRecencyScore(events),
      this.calculateFrequencyScore(events),
      profile?.profileCompleteness || 0,
      profile?.subscriptionStatus === 'active' ? 1 : 0,
      profile?.daysSinceRegistration || 0,
      this.calculateSupportTickets(userId),
    ];
  }

  private async loadChurnModel(): Promise<tf.LayersModel> {
    try {
      return await tf.loadLayersModel(`file://${AIConfig.tensorflow.modelPath}/churn_model/model.json`);
    } catch {
      return this.createDefaultChurnModel();
    }
  }

  private createDefaultChurnModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });
    
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
    
    return model;
  }

  private identifyChurnFactors(features: number[]): ChurnFactor[] {
    const factors: ChurnFactor[] = [];
    
    if (features[0] < 0.3) {
      factors.push({
        name: 'Low Daily Activity',
        impact: 0.8,
        description: 'User has significantly reduced daily platform usage',
        trend: 'decreasing',
      });
    }
    
    if (features[3] < 0.4) {
      factors.push({
        name: 'Poor Engagement',
        impact: 0.7,
        description: 'User engagement metrics are below healthy thresholds',
        trend: 'decreasing',
      });
    }
    
    if (features[4] < 0.5) {
      factors.push({
        name: 'Infrequent Visits',
        impact: 0.6,
        description: 'User has not visited the platform recently',
        trend: 'decreasing',
      });
    }
    
    return factors;
  }

  private generateRetentionActions(factors: ChurnFactor[], riskLevel: string): string[] {
    const actions: string[] = [];
    
    if (riskLevel === 'high') {
      actions.push('Send personalized re-engagement email campaign');
      actions.push('Offer exclusive discount or feature access');
      actions.push('Schedule personal outreach from customer success');
    }
    
    factors.forEach(factor => {
      if (factor.name === 'Low Daily Activity') {
        actions.push('Send daily digest of relevant content');
        actions.push('Implement push notifications for important updates');
      }
      if (factor.name === 'Poor Engagement') {
        actions.push('Provide interactive onboarding tutorial');
        actions.push('Highlight unused features that match user needs');
      }
    });
    
    return actions;
  }

  private calculatePredictedChurnDate(probability: number): Date {
    const daysUntilChurn = Math.floor((1 - probability) * 90);
    const churnDate = new Date();
    churnDate.setDate(churnDate.getDate() + daysUntilChurn);
    return churnDate;
  }

  private async processEventBatch(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const batch = [...this.eventBuffer];
    this.eventBuffer = [];
    
    const aggregatedMetrics = this.aggregateEventMetrics(batch);
    await this.storeAggregatedMetrics(aggregatedMetrics);
    
    await this.updateUserProfiles(batch);
    await this.detectAnomalies(batch);
  }

  private aggregateEventMetrics(events: UserBehaviorEvent[]): any {
    const metrics: any = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      eventTypes: {},
      averageSessionDuration: 0,
      peakHour: 0,
    };
    
    events.forEach(event => {
      metrics.eventTypes[event.eventType] = (metrics.eventTypes[event.eventType] || 0) + 1;
    });
    
    return metrics;
  }

  private async storeAggregatedMetrics(metrics: any): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO aggregated_metrics (
        timestamp, metrics_data
      ) VALUES (
        ${new Date()}, ${JSON.stringify(metrics)}
      )
    `;
  }

  private async updateUserProfiles(events: UserBehaviorEvent[]): Promise<void> {
    const userUpdates = new Map<string, any>();
    
    events.forEach(event => {
      if (!userUpdates.has(event.userId)) {
        userUpdates.set(event.userId, {
          lastActivity: event.timestamp,
          eventCount: 0,
          sessions: new Set(),
        });
      }
      
      const update = userUpdates.get(event.userId);
      update.eventCount++;
      update.sessions.add(event.sessionId);
    });
    
    for (const [userId, update] of userUpdates.entries()) {
      await this.prisma.$executeRaw`
        UPDATE user_profiles SET
          last_activity = ${update.lastActivity},
          total_events = total_events + ${update.eventCount},
          total_sessions = total_sessions + ${update.sessions.size}
        WHERE user_id = ${userId}
      `;
    }
  }

  private async detectAnomalies(events: UserBehaviorEvent[]): Promise<void> {
    const eventCounts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    for (const [eventType, count] of Object.entries(eventCounts)) {
      const historical = await this.getHistoricalEventRate(eventType);
      const zscore = (count - historical.mean) / historical.stdDev;
      
      if (Math.abs(zscore) > 3) {
        await this.createAnomalyAlert(eventType, count, historical.mean, zscore);
      }
    }
  }

  private async getHistoricalEventRate(eventType: string): Promise<{ mean: number; stdDev: number }> {
    const rates = await this.prisma.$queryRaw<{ rate: number }[]>`
      SELECT COUNT(*) as rate
      FROM user_behavior_events
      WHERE event_type = ${eventType}
      AND timestamp > NOW() - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
    `;
    
    const values = rates.map(r => r.rate);
    return {
      mean: stats.mean(values),
      stdDev: stats.standardDeviation(values),
    };
  }

  private async createAnomalyAlert(eventType: string, actual: number, expected: number, zscore: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO anomaly_alerts (
        type, metric, expected_value, actual_value, 
        deviation, timestamp, context
      ) VALUES (
        'statistical', ${eventType}, ${expected}, ${actual},
        ${zscore}, ${new Date()}, ${JSON.stringify({ zscore, eventType })}
      )
    `;
  }

  private async getUserEvents(userId: string, days: number): Promise<UserBehaviorEvent[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.prisma.$queryRaw`
      SELECT * FROM user_behavior_events
      WHERE user_id = ${userId}
      AND timestamp > ${cutoffDate}
      ORDER BY timestamp DESC
    `;
  }

  private async getUserProfile(userId: string): Promise<any> {
    return await this.prisma.$queryRaw`
      SELECT * FROM user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
  }

  private calculateDailyActivity(events: UserBehaviorEvent[]): number {
    if (events.length === 0) return 0;
    
    const days = new Set(events.map(e => 
      e.timestamp.toISOString().split('T')[0]
    )).size;
    
    const totalDays = 30;
    return Math.min(days / totalDays, 1);
  }

  private calculateAvgSessionDuration(events: UserBehaviorEvent[]): number {
    const sessions = new Map<string, { start: Date; end: Date }>();
    
    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      } else {
        const session = sessions.get(event.sessionId)!;
        if (event.timestamp < session.start) session.start = event.timestamp;
        if (event.timestamp > session.end) session.end = event.timestamp;
      }
    });
    
    const durations = Array.from(sessions.values()).map(s => 
      s.end.getTime() - s.start.getTime()
    );
    
    return durations.length > 0 ? stats.mean(durations) : 0;
  }

  private calculateFeatureUsage(events: UserBehaviorEvent[]): number {
    const features = new Set(events.map(e => e.eventType));
    return features.size;
  }

  private calculateEngagementScore(events: UserBehaviorEvent[]): number {
    const weights = {
      page_view: 0.1,
      click: 0.2,
      form_submit: 0.5,
      conversion: 1.0,
      share: 0.8,
      comment: 0.7,
    };
    
    let score = 0;
    let totalWeight = 0;
    
    events.forEach(event => {
      const weight = weights[event.eventType as keyof typeof weights] || 0.1;
      score += weight;
      totalWeight += 1;
    });
    
    return totalWeight > 0 ? Math.min(score / totalWeight, 1) : 0;
  }

  private calculateRecencyScore(events: UserBehaviorEvent[]): number {
    if (events.length === 0) return 0;
    
    const lastEvent = Math.max(...events.map(e => e.timestamp.getTime()));
    const daysSinceLastEvent = (Date.now() - lastEvent) / (1000 * 60 * 60 * 24);
    
    return Math.max(0, 1 - (daysSinceLastEvent / 30));
  }

  private calculateFrequencyScore(events: UserBehaviorEvent[]): number {
    const dailyEvents = events.length / 30;
    return Math.min(dailyEvents / 10, 1);
  }

  private async calculateSupportTickets(userId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM support_tickets
      WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '90 days'
    `;
    
    return result[0]?.count || 0;
  }

  private extractBehaviorPatterns(events: UserBehaviorEvent[]): any {
    const platforms = events.map(e => e.metadata.platform).filter(Boolean);
    const mobileCount = platforms.filter(p => p?.includes('mobile')).length;
    const isMobileFirst = mobileCount / platforms.length > 0.7;
    
    const hours = events.map(e => e.timestamp.getHours());
    const weekendEvents = events.filter(e => {
      const day = e.timestamp.getDay();
      return day === 0 || day === 6;
    });
    const isWeekendUser = weekendEvents.length / events.length > 0.6;
    
    return {
      isMobileFirst,
      isWeekendUser,
      peakHour: stats.mode(hours),
      avgEventsPerSession: events.length / new Set(events.map(e => e.sessionId)).size,
    };
  }

  async cleanup(): Promise<void> {
    if (this.segment) {
      await new Promise(resolve => this.segment!.flush(resolve));
    }
    
    if (this.posthog) {
      await this.posthog.shutdown();
    }
    
    await this.prisma.$disconnect();
  }
}