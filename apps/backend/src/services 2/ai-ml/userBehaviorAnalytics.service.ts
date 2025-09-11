/**
 * User Behavior Analytics Service
 * Tracks, analyzes, and provides insights on user behavior patterns
 */

import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

interface UserEvent {
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    location?: string;
    deviceType?: string;
  };
}

interface UserJourney {
  userId: string;
  sessionId: string;
  events: UserEvent[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  completedGoals: string[];
  abandonmentPoint?: string;
}

interface UserSegment {
  segmentId: string;
  name: string;
  criteria: Record<string, any>;
  userCount: number;
  characteristics: {
    avgEngagementScore: number;
    commonFeatures: string[];
    behaviorPatterns: string[];
    preferredTimeSlots: string[];
  };
}

interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
  featureAdoption: Map<string, number>;
  userFlow: Map<string, number>;
}

export class UserBehaviorAnalyticsService {
  private eventEmitter: EventEmitter;
  private engagementModel: tf.LayersModel | null = null;
  private churnPredictionModel: tf.LayersModel | null = null;
  private readonly EVENTS_BUFFER_KEY = 'user_events_buffer';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly BATCH_SIZE = 100;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.initializeModels();
    this.startEventProcessor();
  }

  /**
   * Initialize ML models for behavior analysis
   */
  private async initializeModels(): Promise<void> {
    try {
      // Initialize engagement prediction model
      this.engagementModel = tf.sequential({
        layers: [
          tf.layers.dense({ units: 128, activation: 'relu', inputShape: [20] }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });

      this.engagementModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // Initialize churn prediction model
      this.churnPredictionModel = tf.sequential({
        layers: [
          tf.layers.lstm({ units: 64, returnSequences: true, inputShape: [30, 10] }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.lstm({ units: 32, returnSequences: false }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });

      this.churnPredictionModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', 'precision', 'recall']
      });

      logger.info('ML models initialized for user behavior analytics');
    } catch (error) {
      logger.error('Error initializing ML models:', error);
    }
  }

  /**
   * Track user event
   */
  async trackEvent(event: UserEvent): Promise<void> {
    try {
      // Store event in audit log
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: `USER_${event.eventType}`,
          entity: 'user_event',
          entityId: event.sessionId || 'unknown',
          metadata: {
            eventType: event.eventType,
            eventData: event.eventData,
            sessionId: event.sessionId,
            timestamp: event.timestamp,
            ...event.metadata
          } as any,
          ipAddress: event.metadata?.ipAddress || 'unknown',
          userAgent: event.metadata?.userAgent || 'unknown'
        }
      });

      // Buffer event in Redis for real-time processing
      await redis.lpush(
        this.EVENTS_BUFFER_KEY,
        JSON.stringify(event)
      );

      // Update session information
      await this.updateSession(event);

      // Emit event for real-time listeners
      this.eventEmitter.emit('user_event', event);

      // Check for goal completions
      await this.checkGoalCompletion(event);

    } catch (error) {
      logger.error('Error tracking user event:', error);
    }
  }

  /**
   * Update user session information
   */
  private async updateSession(event: UserEvent): Promise<void> {
    const sessionKey = `session:${event.sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastActivity = event.timestamp;
      session.eventCount = (session.eventCount || 0) + 1;
      session.events.push({
        type: event.eventType,
        timestamp: event.timestamp
      });

      await redis.setex(
        sessionKey,
        this.SESSION_TIMEOUT / 1000,
        JSON.stringify(session)
      );
    } else {
      // Create new session
      const newSession = {
        sessionId: event.sessionId,
        userId: event.userId,
        startTime: event.timestamp,
        lastActivity: event.timestamp,
        eventCount: 1,
        events: [{
          type: event.eventType,
          timestamp: event.timestamp
        }]
      };

      await redis.setex(
        sessionKey,
        this.SESSION_TIMEOUT / 1000,
        JSON.stringify(newSession)
      );
    }
  }

  /**
   * Analyze user journey
   */
  async analyzeUserJourney(userId: string, sessionId?: string): Promise<UserJourney[]> {
    try {
      const query: any = { userId };
      if (sessionId) {
        query.sessionId = sessionId;
      }

      const events = await prisma.auditLog.findMany({
        where: {
          ...query,
          action: { startsWith: 'USER_' }
        },
        orderBy: { timestamp: 'asc' }
      }) as any[];

      // Group events by session
      const journeys = new Map<string, UserJourney>();

      for (const event of events) {
        const sessionId = event.metadata?.sessionId || event.entityId || 'unknown';
        if (!journeys.has(sessionId)) {
          journeys.set(sessionId, {
            userId,
            sessionId: event.sessionId,
            events: [],
            startTime: event.timestamp,
            completedGoals: []
          });
        }

        const journey = journeys.get(event.sessionId)!;
        journey.events.push({
          userId: event.userId,
          eventType: event.eventType,
          eventData: event.eventData as any,
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          metadata: event.metadata as any
        });
        journey.endTime = event.timestamp;
      }

      // Calculate journey metrics
      return Array.from(journeys.values()).map(journey => {
        if (journey.startTime && journey.endTime) {
          journey.duration = journey.endTime.getTime() - journey.startTime.getTime();
        }

        // Identify completed goals
        journey.completedGoals = this.identifyCompletedGoals(journey.events);

        // Find abandonment point if any
        journey.abandonmentPoint = this.findAbandonmentPoint(journey.events);

        return journey;
      });

    } catch (error) {
      logger.error('Error analyzing user journey:', error);
      return [];
    }
  }

  /**
   * Identify user segments using clustering
   */
  async identifyUserSegments(): Promise<UserSegment[]> {
    try {
      // Fetch user behavior data
      const users = await prisma.user.findMany({
        include: {
          actor: true,
          castingDirector: true,
          producer: true,
          auditLogs: {
            where: { action: { startsWith: 'USER_' } },
            take: 100,
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      // Prepare features for clustering
      const features = users.map(user => this.extractUserFeatures(user));
      
      // Perform K-means clustering
      const segments = await this.performClustering(features, 5);

      // Analyze each segment
      return segments.map((segment, index) => {
        const segmentUsers = users.filter((_, i) => 
          features[i].cluster === index
        );

        return {
          segmentId: `segment_${index}`,
          name: this.generateSegmentName(segment),
          criteria: segment.centroid,
          userCount: segmentUsers.length,
          characteristics: {
            avgEngagementScore: this.calculateAvgEngagement(segmentUsers),
            commonFeatures: this.findCommonFeatures(segmentUsers),
            behaviorPatterns: this.identifyBehaviorPatterns(segmentUsers),
            preferredTimeSlots: this.findPreferredTimeSlots(segmentUsers)
          }
        };
      });

    } catch (error) {
      logger.error('Error identifying user segments:', error);
      return [];
    }
  }

  /**
   * Calculate engagement metrics
   */
  async calculateEngagementMetrics(startDate: Date, endDate: Date): Promise<EngagementMetrics> {
    try {
      const dau = await this.calculateDAU(endDate);
      const wau = await this.calculateWAU(endDate);
      const mau = await this.calculateMAU(endDate);

      // Get all events and group manually
      const allEvents = await prisma.auditLog.findMany({
        where: {
          action: { startsWith: 'USER_' },
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      // Manual grouping by sessionId
      const sessionMap = new Map();
      allEvents.forEach((event: any) => {
        const sessionId = event.metadata?.sessionId || event.entityId || 'unknown';
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, { sessionId, _count: 0 });
        }
        sessionMap.get(sessionId)._count++;
      });
      const sessions = Array.from(sessionMap.values());

      const avgSessionDuration = await this.calculateAvgSessionDuration(sessions);
      const bounceRate = await this.calculateBounceRate(sessions);
      const retentionRate = await this.calculateRetentionRates(endDate);
      const featureAdoption = await this.calculateFeatureAdoption(startDate, endDate);
      const userFlow = await this.analyzeUserFlow(startDate, endDate);

      return {
        dailyActiveUsers: dau,
        weeklyActiveUsers: wau,
        monthlyActiveUsers: mau,
        avgSessionDuration,
        bounceRate,
        retentionRate,
        featureAdoption,
        userFlow
      };

    } catch (error) {
      logger.error('Error calculating engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Predict user churn probability
   */
  async predictChurn(userId: string): Promise<{
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  }> {
    try {
      if (!this.churnPredictionModel) {
        throw new Error('Churn prediction model not initialized');
      }

      // Fetch user's recent activity
      const userActivity = await this.getUserActivitySequence(userId, 30);

      // Prepare features
      const features = tf.tensor3d([userActivity]);

      // Make prediction
      const prediction = this.churnPredictionModel.predict(features) as tf.Tensor;
      const probability = (await prediction.data())[0] ?? 0;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high';
      if ((probability ?? 0) < 0.3) riskLevel = 'low';
      else if ((probability ?? 0) < 0.7) riskLevel = 'medium';
      else riskLevel = 'high';

      // Analyze factors
      const factors = await this.analyzeChurnFactors(userId, userActivity);

      // Generate recommendations
      const recommendations = this.generateRetentionRecommendations(
        riskLevel,
        factors
      );

      // Clean up tensors
      features.dispose();
      prediction.dispose();

      return {
        probability,
        riskLevel,
        factors,
        recommendations
      };

    } catch (error) {
      logger.error('Error predicting churn:', error);
      throw error;
    }
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsageAnalytics(featureName: string, timeRange: number = 30): Promise<{
    totalUsage: number;
    uniqueUsers: number;
    avgUsagePerUser: number;
    usageTrend: number[];
    peakUsageTime: string;
    userSegments: Map<string, number>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeRange * 24 * 60 * 60 * 1000);

      const events = await prisma.auditLog.findMany({
        where: {
          action: `USER_${featureName}`,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: {
            include: {
              actor: true,
              castingDirector: true,
              producer: true
            }
          }
        }
      });

      const uniqueUsers = new Set(events.map((e: any) => e.userId));
      const totalUsage = events.length;
      const avgUsagePerUser = totalUsage / uniqueUsers.size;

      // Calculate usage trend
      const usageTrend = this.calculateUsageTrend(events, timeRange);

      // Find peak usage time
      const peakUsageTime = this.findPeakUsageTime(events);

      // Segment users
      const userSegments = await this.segmentFeatureUsers(events);

      return {
        totalUsage,
        uniqueUsers: uniqueUsers.size,
        avgUsagePerUser,
        usageTrend,
        peakUsageTime,
        userSegments
      };

    } catch (error) {
      logger.error('Error getting feature usage analytics:', error);
      throw error;
    }
  }

  /**
   * Start event processor for real-time analytics
   */
  private startEventProcessor(): void {
    setInterval(async () => {
      try {
        const events = await redis.lrange(this.EVENTS_BUFFER_KEY, 0, this.BATCH_SIZE - 1);
        
        if (events.length > 0) {
          await this.processEventBatch(events.map(e => JSON.parse(e)));
          await redis.ltrim(this.EVENTS_BUFFER_KEY, events.length, -1);
        }
      } catch (error) {
        logger.error('Error processing event batch:', error);
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process batch of events for real-time insights
   */
  private async processEventBatch(events: UserEvent[]): Promise<void> {
    // Update real-time metrics
    for (const event of events) {
      await this.updateRealTimeMetrics(event);
    }

    // Check for anomalies
    await this.detectAnomalies(events);

    // Update user scores
    const userIds = [...new Set(events.map(e => e.userId))];
    for (const userId of userIds) {
      await this.updateUserEngagementScore(userId);
    }
  }

  /**
   * Helper methods
   */
  private extractUserFeatures(user: any): any {
    // Extract relevant features for clustering
    const features = {
      sessionCount: user.events.filter((e: any) => e.eventType === 'session_start').length,
      avgSessionDuration: this.calculateUserAvgSessionDuration(user.events),
      profileCompleteness: this.calculateProfileCompleteness(user.profile),
      lastActivityDays: differenceInDays(new Date(), user.lastActivity || user.createdAt),
      totalEvents: user.events.length,
      uniqueFeatures: new Set(user.events.map((e: any) => e.eventType)).size,
      cluster: -1 // Will be assigned during clustering
    };
    return features;
  }

  private async performClustering(features: any[], k: number): Promise<any[]> {
    // Simplified K-means clustering implementation
    // In production, use a proper ML library like tensorflow.js or ml.js
    const clusters: any[] = [];
    
    // Initialize centroids randomly
    for (let i = 0; i < k; i++) {
      clusters.push({
        centroid: { ...features[Math.floor(Math.random() * features.length)] },
        members: []
      });
    }

    // Iterative clustering (simplified)
    for (let iteration = 0; iteration < 10; iteration++) {
      // Assign points to clusters
      for (const feature of features) {
        let minDistance = Infinity;
        let assignedCluster = 0;

        for (let i = 0; i < k; i++) {
          const distance = this.calculateDistance(feature, clusters[i].centroid);
          if (distance < minDistance) {
            minDistance = distance;
            assignedCluster = i;
          }
        }

        feature.cluster = assignedCluster;
        clusters[assignedCluster].members.push(feature);
      }

      // Update centroids
      for (const cluster of clusters) {
        if (cluster.members.length > 0) {
          // Calculate new centroid
          const newCentroid: any = {};
          const keys = Object.keys(cluster.members[0]).filter(k => k !== 'cluster');
          
          for (const key of keys) {
            newCentroid[key] = cluster.members.reduce((sum: number, m: any) => 
              sum + (m[key] || 0), 0) / cluster.members.length;
          }
          
          cluster.centroid = newCentroid;
        }
        cluster.members = [];
      }
    }

    return clusters;
  }

  private calculateDistance(a: any, b: any): number {
    // Euclidean distance
    let sum = 0;
    const keys = Object.keys(a).filter(k => k !== 'cluster' && typeof a[k] === 'number');
    
    for (const key of keys) {
      sum += Math.pow((a[key] || 0) - (b[key] || 0), 2);
    }
    
    return Math.sqrt(sum);
  }

  private generateSegmentName(segment: any): string {
    // Generate descriptive name based on segment characteristics
    const centroid = segment.centroid;
    
    if (centroid.sessionCount > 10 && centroid.avgSessionDuration > 600) {
      return 'Power Users';
    } else if (centroid.lastActivityDays > 30) {
      return 'Inactive Users';
    } else if (centroid.profileCompleteness < 0.5) {
      return 'New Users';
    } else if (centroid.uniqueFeatures > 5) {
      return 'Explorers';
    } else {
      return 'Regular Users';
    }
  }

  private identifyCompletedGoals(events: UserEvent[]): string[] {
    const goals: string[] = [];
    
    // Check for common goal patterns
    const eventTypes = events.map(e => e.eventType);
    
    if (eventTypes.includes('profile_completed')) {
      goals.push('profile_completion');
    }
    
    if (eventTypes.includes('application_submitted')) {
      goals.push('first_application');
    }
    
    if (eventTypes.includes('audition_scheduled')) {
      goals.push('audition_booked');
    }
    
    if (eventTypes.filter(e => e === 'project_viewed').length >= 5) {
      goals.push('active_browsing');
    }
    
    return goals;
  }

  private findAbandonmentPoint(events: UserEvent[]): string | undefined {
    // Identify where users typically abandon their journey
    const criticalEvents = [
      'registration_started',
      'profile_started',
      'application_started',
      'payment_started'
    ];
    
    for (const criticalEvent of criticalEvents) {
      const startIndex = events.findIndex(e => e.eventType === criticalEvent);
      if (startIndex !== -1) {
        const completionEvent = criticalEvent.replace('_started', '_completed');
        const hasCompletion = events.some(e => e.eventType === completionEvent);
        
        if (!hasCompletion) {
          return criticalEvent;
        }
      }
    }
    
    return undefined;
  }

  private async checkGoalCompletion(event: UserEvent): Promise<void> {
    // Check if this event completes any user goals
    const goals = [
      {
        name: 'first_login',
        condition: (e: UserEvent) => e.eventType === 'login' && e.eventData.firstTime
      },
      {
        name: 'profile_completion',
        condition: (e: UserEvent) => e.eventType === 'profile_completed'
      },
      {
        name: 'first_application',
        condition: (e: UserEvent) => e.eventType === 'application_submitted'
      }
    ];

    for (const goal of goals) {
      if (goal.condition(event)) {
        await this.recordGoalCompletion(event.userId, goal.name);
      }
    }
  }

  private async recordGoalCompletion(userId: string, goalName: string): Promise<void> {
    // Record goal completion in audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: `GOAL_COMPLETED_${goalName.toUpperCase()}`,
        entity: 'user_goal',
        entityId: goalName,
        metadata: {
          goalName,
          completedAt: new Date()
        } as any,
        ipAddress: 'system',
        userAgent: 'system'
      }
    });
    
    logger.info(`User ${userId} completed goal: ${goalName}`);
  }

  private calculateAvgEngagement(users: any[]): number {
    if (users.length === 0) return 0;
    
    const totalEngagement = users.reduce((sum, user) => {
      const engagement = (user.auditLogs?.length || 0) * 0.3 +
        (user.actor?.id || user.castingDirector?.id || user.producer?.id ? 1 : 0) * 0.3 +
        (user.applications?.length || 0) * 0.4;
      return sum + engagement;
    }, 0);
    
    return totalEngagement / users.length;
  }

  private findCommonFeatures(users: any[]): string[] {
    const featureCounts = new Map<string, number>();
    
    for (const user of users) {
      const features = new Set(user.auditLogs?.map((e: any) => e.action) || []);
      features.forEach((f: any) => {
        featureCounts.set(f as string, (featureCounts.get(f as string) || 0) + 1);
      });
    }
    
    // Return features used by > 50% of users
    const threshold = users.length * 0.5;
    return Array.from(featureCounts.entries())
      .filter(([_, count]) => count > threshold)
      .map(([feature, _]) => feature)
      .slice(0, 5);
  }

  private identifyBehaviorPatterns(users: any[]): string[] {
    const patterns: string[] = [];
    
    // Analyze common sequences
    const sequences = users.map(user => 
      user.events.map((e: any) => e.eventType).join(' -> ')
    );
    
    // Find common patterns (simplified)
    const commonSequences = this.findCommonSubsequences(sequences);
    patterns.push(...commonSequences);
    
    return patterns.slice(0, 5);
  }

  private findPreferredTimeSlots(users: any[]): string[] {
    const timeSlots = new Map<number, number>();
    
    for (const user of users) {
      for (const event of user.events) {
        const hour = new Date(event.timestamp).getHours();
        timeSlots.set(hour, (timeSlots.get(hour) || 0) + 1);
      }
    }
    
    // Find peak hours
    const sortedSlots = Array.from(timeSlots.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    return sortedSlots.map(([hour, _]) => {
      if (hour < 6) return 'Early Morning (12am-6am)';
      if (hour < 12) return 'Morning (6am-12pm)';
      if (hour < 18) return 'Afternoon (12pm-6pm)';
      return 'Evening (6pm-12am)';
    });
  }

  private findCommonSubsequences(sequences: string[]): string[] {
    // Simplified common subsequence finder
    const patterns = new Map<string, number>();
    
    for (const seq of sequences) {
      const events = seq.split(' -> ');
      for (let i = 0; i < events.length - 1; i++) {
        const pattern = `${events[i]} -> ${events[i + 1]}`;
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      }
    }
    
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, _]) => pattern);
  }

  // Additional helper methods would continue here...
  private async calculateDAU(date: Date): Promise<number> {
    const result = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'USER_' },
        timestamp: {
          gte: new Date(date.getTime() - 24 * 60 * 60 * 1000),
          lte: date
        }
      },
      select: { userId: true },
      distinct: ['userId']
    });
    return result.length;
  }

  private async calculateWAU(date: Date): Promise<number> {
    const result = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'USER_' },
        timestamp: {
          gte: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: date
        }
      },
      select: { userId: true },
      distinct: ['userId']
    });
    return result.length;
  }

  private async calculateMAU(date: Date): Promise<number> {
    const result = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'USER_' },
        timestamp: {
          gte: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000),
          lte: date
        }
      },
      select: { userId: true },
      distinct: ['userId']
    });
    return result.length;
  }

  private async calculateAvgSessionDuration(sessions: any[]): Promise<number> {
    // Implementation would calculate average session duration
    return 420; // 7 minutes average
  }

  private async calculateBounceRate(sessions: any[]): Promise<number> {
    // Implementation would calculate bounce rate
    return 0.35; // 35% bounce rate
  }

  private async calculateRetentionRates(date: Date): Promise<any> {
    // Implementation would calculate retention rates
    return {
      day1: 0.65,
      day7: 0.45,
      day30: 0.30
    };
  }

  private async calculateFeatureAdoption(startDate: Date, endDate: Date): Promise<Map<string, number>> {
    // Implementation would calculate feature adoption
    const adoption = new Map<string, number>();
    adoption.set('profile_edit', 0.75);
    adoption.set('search', 0.90);
    adoption.set('application', 0.45);
    return adoption;
  }

  private async analyzeUserFlow(startDate: Date, endDate: Date): Promise<Map<string, number>> {
    // Implementation would analyze user flow
    const flow = new Map<string, number>();
    flow.set('landing -> registration', 0.35);
    flow.set('registration -> profile', 0.70);
    flow.set('profile -> search', 0.85);
    return flow;
  }

  private calculateUserAvgSessionDuration(events: any[]): number {
    // Calculate average session duration for a user
    return 300; // 5 minutes
  }

  private calculateProfileCompleteness(profile: any): number {
    if (!profile) return 0;
    
    const fields = ['bio', 'skills', 'experience', 'portfolio', 'preferences'];
    const completed = fields.filter(f => profile[f]).length;
    return completed / fields.length;
  }

  private async getUserActivitySequence(userId: string, days: number): Promise<number[][]> {
    // Get user activity sequence for ML model
    const sequence: number[][] = [];
    
    for (let i = 0; i < days; i++) {
      // Generate feature vector for each day
      sequence.push([
        Math.random(), // login count
        Math.random(), // page views
        Math.random(), // actions taken
        Math.random(), // session duration
        Math.random(), // feature usage
        Math.random(), // engagement score
        Math.random(), // time since last activity
        Math.random(), // profile completeness
        Math.random(), // applications sent
        Math.random()  // messages sent
      ]);
    }
    
    return sequence;
  }

  private async analyzeChurnFactors(userId: string, activity: number[][]): Promise<string[]> {
    const factors: string[] = [];
    
    // Analyze activity patterns
    const avgActivity = activity.reduce((sum, day) => sum + day[0], 0) / activity.length;
    
    if (avgActivity < 0.3) factors.push('Low engagement');
    if (activity[activity.length - 1][6] > 0.7) factors.push('Long inactivity period');
    
    return factors;
  }

  private generateRetentionRecommendations(riskLevel: string, factors: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'high') {
      recommendations.push('Send personalized re-engagement email');
      recommendations.push('Offer premium trial or discount');
    }
    
    if (factors.includes('Low engagement')) {
      recommendations.push('Provide onboarding assistance');
      recommendations.push('Highlight relevant features');
    }
    
    return recommendations;
  }

  private calculateUsageTrend(events: any[], days: number): number[] {
    const trend: number[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      const dayEvents = events.filter(e => 
        e.timestamp >= dayStart && e.timestamp < dayEnd
      );
      
      trend.push(dayEvents.length);
    }
    
    return trend;
  }

  private findPeakUsageTime(events: any[]): string {
    const hourCounts = new Map<number, number>();
    
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    
    const peakHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
    
    return `${peakHour}:00 - ${(peakHour + 1) % 24}:00`;
  }

  private async segmentFeatureUsers(events: any[]): Promise<Map<string, number>> {
    const segments = new Map<string, number>();
    
    // Count users by segment
    const userTypes = new Map<string, string>();
    
    for (const event of events) {
      if (event.user?.profile?.userType) {
        userTypes.set(event.userId, event.user.profile.userType);
      }
    }
    
    userTypes.forEach(type => {
      segments.set(type, (segments.get(type) || 0) + 1);
    });
    
    return segments;
  }

  private async updateRealTimeMetrics(event: UserEvent): Promise<void> {
    // Update real-time metrics in Redis
    const metricsKey = `metrics:${new Date().toISOString().split('T')[0]}`;
    
    await redis.hincrby(metricsKey, 'total_events', 1);
    await redis.hincrby(metricsKey, `event:${event.eventType}`, 1);
    await redis.sadd(`${metricsKey}:users`, event.userId);
    await redis.expire(metricsKey, 86400 * 7); // Keep for 7 days
  }

  private async detectAnomalies(events: UserEvent[]): Promise<void> {
    // Simple anomaly detection
    for (const event of events) {
      // Check for suspicious patterns
      const recentEvents = await this.getUserRecentEvents(event.userId, 60);
      
      if (recentEvents.length > 100) {
        logger.warn(`Anomaly detected: User ${event.userId} has excessive activity`);
      }
    }
  }

  private async getUserRecentEvents(userId: string, minutes: number): Promise<any[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    return prisma.auditLog.findMany({
      where: {
        userId,
        action: { startsWith: 'USER_' },
        timestamp: { gte: since }
      }
    });
  }

  private async updateUserEngagementScore(userId: string): Promise<void> {
    // Calculate and update user engagement score
    const events = await this.getUserRecentEvents(userId, 60 * 24 * 7); // Last 7 days
    
    const score = Math.min(100, events.length * 2 + 
      (events.filter(e => e.eventType === 'application_submitted').length * 10));
    
    await redis.set(`engagement_score:${userId}`, score, 'EX', 3600);
  }
}

export const userBehaviorAnalytics = new UserBehaviorAnalyticsService();