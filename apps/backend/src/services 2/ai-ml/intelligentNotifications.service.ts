/**
 * Intelligent Notification Service
 * Smart notification timing, personalization, and content optimization
 */

import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import * as tf from '@tensorflow/tfjs-node';
import { addHours, format, isWithinInterval, parseISO } from 'date-fns';
import { EventEmitter } from 'events';
import natural from 'natural';
import Bull from 'bull';

interface NotificationPreference {
  userId: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    start: number; // Hour in 24h format
    end: number;
  };
  categories: {
    [key: string]: boolean;
  };
  optimalTimes: number[]; // Best hours to send notifications
}

interface PersonalizedNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  channel: 'email' | 'push' | 'sms' | 'inApp';
  scheduledFor: Date;
  metadata: {
    personalizationScore: number;
    engagementPrediction: number;
    contentVariant: string;
    abTestGroup?: string;
  };
  actions?: {
    primary: { label: string; url: string };
    secondary?: { label: string; url: string };
  };
}

interface NotificationContent {
  template: string;
  variants: Map<string, string>;
  personalizationTokens: Map<string, any>;
  sentiment: 'positive' | 'neutral' | 'urgent';
  callToAction: string;
}

interface EngagementMetrics {
  notificationId: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  dismissedAt?: Date;
  engagementScore: number;
  userFeedback?: 'helpful' | 'not_helpful' | 'spam';
}

export class IntelligentNotificationService {
  private eventEmitter: EventEmitter;
  private timingModel: tf.LayersModel | null = null;
  private contentOptimizer: tf.LayersModel | null = null;
  private sentimentAnalyzer: natural.SentimentAnalyzer;
  private notificationQueue: Bull.Queue;
  private abTestGroups: Map<string, string>;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    this.abTestGroups = new Map();
    this.notificationQueue = new Bull('notifications', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      }
    });
    
    this.initializeModels();
    this.setupQueueProcessors();
  }

  /**
   * Initialize ML models for notification optimization
   */
  private async initializeModels(): Promise<void> {
    try {
      // Timing prediction model
      this.timingModel = tf.sequential({
        layers: [
          tf.layers.dense({ units: 64, activation: 'relu', inputShape: [15] }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 24, activation: 'softmax' }) // 24 hours
        ]
      });

      this.timingModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Content optimization model
      this.contentOptimizer = tf.sequential({
        layers: [
          tf.layers.dense({ units: 128, activation: 'relu', inputShape: [20] }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Engagement probability
        ]
      });

      this.contentOptimizer.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', 'precision', 'recall']
      });

      logger.info('Notification ML models initialized');
    } catch (error) {
      logger.error('Error initializing notification models:', error);
    }
  }

  /**
   * Send personalized notification
   */
  async sendNotification(
    userId: string,
    type: string,
    data: any,
    options: {
      immediate?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      testVariants?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Get user preferences and context
      const preferences = await this.getUserPreferences(userId);
      const userContext = await this.getUserContext(userId);

      // Check if user wants this type of notification
      if (!this.shouldSendNotification(preferences, type)) {
        logger.info(`Notification ${type} skipped for user ${userId} due to preferences`);
        return;
      }

      // Generate personalized content
      const content = await this.generatePersonalizedContent(
        type,
        data,
        userContext,
        options.testVariants
      );

      // Predict optimal timing
      const optimalTime = options.immediate ? 
        new Date() : 
        await this.predictOptimalTiming(userId, type, userContext);

      // Select best channel
      const channel = this.selectOptimalChannel(preferences, type, options.priority);

      // Create notification
      const notification: PersonalizedNotification = {
        userId,
        type,
        title: content.title,
        body: content.body,
        priority: options.priority || 'medium',
        channel,
        scheduledFor: optimalTime,
        metadata: {
          personalizationScore: content.personalizationScore,
          engagementPrediction: await this.predictEngagement(userId, content),
          contentVariant: content.variant,
          abTestGroup: this.getABTestGroup(userId)
        },
        actions: content.actions
      };

      // Schedule or send immediately
      if (options.immediate) {
        await this.deliverNotification(notification);
      } else {
        await this.scheduleNotification(notification);
      }

      // Track for analytics
      await this.trackNotification(notification);

    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Generate personalized notification content
   */
  private async generatePersonalizedContent(
    type: string,
    data: any,
    userContext: any,
    testVariants: boolean = false
  ): Promise<any> {
    try {
      // Get content template
      const template = await this.getNotificationTemplate(type);

      // Personalize content
      const personalizedContent = this.personalizeTemplate(template, {
        userName: userContext.name,
        userType: userContext.profile?.userType,
        ...data
      });

      // Generate variants for A/B testing
      const variants = testVariants ? 
        await this.generateContentVariants(personalizedContent, userContext) : 
        [personalizedContent];

      // Select best variant based on user history
      const selectedVariant = await this.selectBestVariant(variants, userContext);

      // Optimize content for engagement
      const optimizedContent = await this.optimizeContent(selectedVariant, userContext);

      // Add sentiment and urgency
      const sentiment = this.analyzeSentiment(optimizedContent.body);
      
      return {
        title: optimizedContent.title,
        body: optimizedContent.body,
        variant: optimizedContent.variantId,
        personalizationScore: this.calculatePersonalizationScore(optimizedContent),
        sentiment,
        actions: this.generateActionsForType(type, data)
      };

    } catch (error) {
      logger.error('Error generating personalized content:', error);
      // Return default content
      return this.getDefaultContent(type, data);
    }
  }

  /**
   * Predict optimal notification timing
   */
  private async predictOptimalTiming(
    userId: string,
    notificationType: string,
    userContext: any
  ): Promise<Date> {
    try {
      if (!this.timingModel) {
        return this.getFallbackTiming(userContext);
      }

      // Get user's historical engagement patterns
      const engagementHistory = await this.getUserEngagementHistory(userId);

      // Prepare features for model
      const features = this.extractTimingFeatures(
        userContext,
        engagementHistory,
        notificationType
      );

      // Predict best hours
      const input = tf.tensor2d([features]);
      const prediction = this.timingModel.predict(input) as tf.Tensor;
      const probabilities = await prediction.array() as number[][];

      // Get top 3 hours
      const hourProbabilities = (probabilities[0]?.map((prob: any, hour: number) => ({ hour, prob })) || [])
        .sort((a: any, b: any) => b.prob - a.prob)
        .slice(0, 3);

      // Clean up tensors
      input.dispose();
      prediction.dispose();

      // Select hour considering quiet hours and other constraints
      const selectedHour = this.selectHourWithConstraints(
        hourProbabilities,
        userContext.preferences
      );

      // Calculate next occurrence of selected hour
      return this.getNextOccurrence(selectedHour);

    } catch (error) {
      logger.error('Error predicting optimal timing:', error);
      return this.getFallbackTiming(userContext);
    }
  }

  /**
   * A/B Testing framework
   */
  async runABTest(
    testName: string,
    variants: {
      control: NotificationContent;
      treatment: NotificationContent;
    },
    userSegment: string,
    duration: number = 7 // days
  ): Promise<void> {
    try {
      // Get users in segment
      const users = await this.getUsersInSegment(userSegment);

      // Randomly assign users to groups
      const midpoint = Math.floor(users.length / 2);
      const controlGroup = users.slice(0, midpoint);
      const treatmentGroup = users.slice(midpoint);

      // Store test configuration
      await redis.setex(
        `ab_test:${testName}`,
        duration * 24 * 3600,
        JSON.stringify({
          name: testName,
          variants,
          controlGroup: controlGroup,
          treatmentGroup: treatmentGroup,
          startDate: new Date(),
          endDate: addHours(new Date(), duration * 24)
        })
      );

      // Send notifications with respective variants
      for (const userId of controlGroup) {
        this.abTestGroups.set(userId, 'control');
        await this.sendTestNotification(userId, variants.control, testName);
      }

      for (const userId of treatmentGroup) {
        this.abTestGroups.set(userId, 'treatment');
        await this.sendTestNotification(userId, variants.treatment, testName);
      }

      // Schedule result analysis
      setTimeout(() => {
        this.analyzeABTestResults(testName);
      }, duration * 24 * 60 * 60 * 1000);

    } catch (error) {
      logger.error('Error running A/B test:', error);
    }
  }

  /**
   * Analyze A/B test results
   */
  private async analyzeABTestResults(testName: string): Promise<{
    winner: 'control' | 'treatment' | 'no_difference';
    metrics: {
      control: { openRate: number; clickRate: number; conversionRate: number };
      treatment: { openRate: number; clickRate: number; conversionRate: number };
    };
    confidence: number;
    recommendation: string;
  }> {
    try {
      const testData = await redis.get(`ab_test:${testName}`);
      if (!testData) {
        throw new Error('Test data not found');
      }

      const test = JSON.parse(testData);

      // Get engagement metrics for both groups
      const controlMetrics = await this.getGroupMetrics(testName, 'control');
      const treatmentMetrics = await this.getGroupMetrics(testName, 'treatment');

      // Perform statistical significance test
      const significance = this.calculateStatisticalSignificance(
        controlMetrics,
        treatmentMetrics
      );

      // Determine winner
      let winner: 'control' | 'treatment' | 'no_difference' = 'no_difference';
      const pValue = (significance as any)?.pValue || 1;
      if (pValue < 0.05) {
        winner = (treatmentMetrics as any)?.conversionRate > (controlMetrics as any)?.conversionRate ? 
          'treatment' : 'control';
      }

      // Generate recommendation
      const recommendation = this.generateTestRecommendation(
        testName,
        winner,
        significance
      );

      return {
        winner,
        metrics: {
          control: controlMetrics,
          treatment: treatmentMetrics
        },
        confidence: significance,
        recommendation
      };

    } catch (error) {
      logger.error('Error analyzing A/B test results:', error);
      throw error;
    }
  }

  /**
   * Smart content recommendations
   */
  async recommendContent(userId: string): Promise<{
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      relevanceScore: number;
      reason: string;
    }>;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          actor: true,
          castingDirector: true,
          producer: true,
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Analyze user interests and behavior
      const interests = await this.analyzeUserInterests(userId);

      // Get trending content
      const trendingContent = await this.getTrendingContent(user.role);

      // Get personalized recommendations
      const personalizedContent = await this.getPersonalizedRecommendations(
        userId,
        interests
      );

      // Combine and rank recommendations
      const allRecommendations = [...trendingContent, ...personalizedContent];
      const rankedRecommendations = this.rankRecommendations(
        allRecommendations,
        user
      );

      return {
        recommendations: rankedRecommendations.slice(0, 10)
      };

    } catch (error) {
      logger.error('Error recommending content:', error);
      return { recommendations: [] };
    }
  }

  /**
   * Sentiment analysis for user feedback
   */
  async analyzeUserFeedback(userId: string, feedback: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    topics: string[];
    actionItems: string[];
  }> {
    try {
      // Analyze sentiment
      const sentimentScore = this.sentimentAnalyzer.getSentiment(
        feedback.split(' ')
      );

      let sentiment: 'positive' | 'negative' | 'neutral';
      if (sentimentScore > 0.3) sentiment = 'positive';
      else if (sentimentScore < -0.3) sentiment = 'negative';
      else sentiment = 'neutral';

      // Extract topics
      const topics = this.extractTopics({ subject: feedback, body: '' } as any);

      // Generate action items based on feedback
      const actionItems = await this.generateActionItems({
        title: feedback,
        content: ''
      } as any);

      // Store feedback for model training
      await this.storeFeedback(`feedback_${userId}_${Date.now()}`, {
        feedback,
        sentiment,
        score: sentimentScore,
        topics,
        timestamp: new Date()
      } as any);

      // Update user preferences based on feedback
      if (sentiment === 'negative') {
        await this.adjustUserPreferences(userId, feedback);
      }

      return {
        sentiment,
        score: sentimentScore,
        topics,
        actionItems
      };

    } catch (error) {
      logger.error('Error analyzing user feedback:', error);
      throw error;
    }
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    // Process scheduled notifications
    this.notificationQueue.process('scheduled', async (job) => {
      const notification = job.data as PersonalizedNotification;
      await this.deliverNotification(notification);
    });

    // Process batch notifications
    this.notificationQueue.process('batch', async (job) => {
      const { notifications } = job.data;
      await this.processBatchNotifications(notifications);
    });

    // Handle failed notifications
    this.notificationQueue.on('failed', (job, err) => {
      logger.error(`Notification job ${job.id} failed:`, err);
      this.handleFailedNotification(job.data, err);
    });
  }

  /**
   * Helper methods
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreference> {
    const cached = await redis.get(`notification_prefs:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get user preferences from user preferences field
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });
    const preferences = user?.preferences as any;

    if (!preferences) {
      // Return default preferences
      return this.getDefaultPreferences(userId);
    }

    const prefs: NotificationPreference = {
      userId,
      channels: preferences.channels as any,
      frequency: preferences.frequency as any,
      quietHours: preferences.quietHours as any,
      categories: preferences.categories as any,
      optimalTimes: await this.calculateOptimalTimes(userId)
    };

    await redis.setex(`notification_prefs:${userId}`, 3600, JSON.stringify(prefs));
    return prefs;
  }

  private async getUserContext(userId: string): Promise<any> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        actor: true,
        castingDirector: true,
        producer: true,
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }

  private shouldSendNotification(
    preferences: NotificationPreference,
    type: string
  ): boolean {
    // Check if category is enabled
    const category = this.getNotificationCategory(type);
    if (preferences.categories[category] === false) {
      return false;
    }

    // Check quiet hours
    const currentHour = new Date().getHours();
    if (preferences.quietHours) {
      const { start, end } = preferences.quietHours;
      if (start < end) {
        if (currentHour >= start && currentHour < end) return false;
      } else {
        if (currentHour >= start || currentHour < end) return false;
      }
    }

    return true;
  }

  private selectOptimalChannel(
    preferences: NotificationPreference,
    type: string,
    priority?: string
  ): 'email' | 'push' | 'sms' | 'inApp' {
    // Critical notifications go through multiple channels
    if (priority === 'critical') {
      if (preferences.channels.push) return 'push';
      if (preferences.channels.email) return 'email';
      if (preferences.channels.sms) return 'sms';
      return 'inApp';
    }

    // Select based on notification type and user preferences
    const channelPriority = this.getChannelPriority(type);
    
    for (const channel of channelPriority) {
      if ((preferences.channels as any)[channel]) {
        return channel as any;
      }
    }

    return 'inApp'; // Default fallback
  }

  private getChannelPriority(type: string): string[] {
    const priorities: { [key: string]: string[] } = {
      'audition_reminder': ['push', 'email', 'sms', 'inApp'],
      'application_update': ['push', 'inApp', 'email'],
      'new_opportunity': ['inApp', 'email', 'push'],
      'profile_incomplete': ['email', 'inApp'],
      'system_update': ['inApp', 'email']
    };

    return priorities[type] || ['inApp', 'email', 'push', 'sms'];
  }

  private async scheduleNotification(notification: PersonalizedNotification): Promise<void> {
    const delay = notification.scheduledFor.getTime() - Date.now();
    
    await this.notificationQueue.add('scheduled', notification, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    logger.info(`Scheduled notification for user ${notification.userId} at ${notification.scheduledFor}`);
  }

  private async deliverNotification(notification: PersonalizedNotification): Promise<void> {
    try {
      switch (notification.channel) {
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'sms':
          await this.sendSMSNotification(notification);
          break;
        case 'inApp':
          await this.sendInAppNotification(notification);
          break;
      }

      // Record delivery
      await this.recordDelivery(notification);

    } catch (error) {
      logger.error('Error delivering notification:', error);
      throw error;
    }
  }

  private async sendEmailNotification(notification: PersonalizedNotification): Promise<void> {
    // Email sending implementation
    logger.info(`Sending email to user ${notification.userId}: ${notification.title}`);
  }

  private async sendPushNotification(notification: PersonalizedNotification): Promise<void> {
    // Push notification implementation
    logger.info(`Sending push notification to user ${notification.userId}: ${notification.title}`);
  }

  private async sendSMSNotification(notification: PersonalizedNotification): Promise<void> {
    // SMS sending implementation
    logger.info(`Sending SMS to user ${notification.userId}: ${notification.body}`);
  }

  private async sendInAppNotification(notification: PersonalizedNotification): Promise<void> {
    // Store in-app notification
    await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.body,
        data: {
          priority: notification.priority || 'normal',
          ...notification.metadata
        } as any,
        isRead: false,
        createdAt: new Date()
      }
    });

    // Emit real-time event
    this.eventEmitter.emit('notification', notification);
  }

  private async trackNotification(notification: PersonalizedNotification): Promise<void> {
    // Track notification in notifications table with metadata
    await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: `Sent via ${notification.channel}`,
        message: `Sent at ${notification.scheduledFor}`,
        data: {
          channel: notification.channel,
          sentAt: notification.scheduledFor,
          ...notification.metadata
        } as any,
        isRead: false
      }
    });
  }

  private async recordDelivery(notification: PersonalizedNotification): Promise<void> {
    const key = `notification_delivery:${notification.userId}:${Date.now()}`;
    await redis.setex(key, 86400 * 30, JSON.stringify({
      ...notification,
      deliveredAt: new Date()
    }));
  }

  private getDefaultPreferences(userId: string): NotificationPreference {
    return {
      userId,
      channels: {
        email: true,
        push: true,
        sms: false,
        inApp: true
      },
      frequency: 'daily',
      quietHours: { start: 22, end: 8 },
      categories: {
        opportunities: true,
        applications: true,
        reminders: true,
        updates: true,
        marketing: false
      },
      optimalTimes: [9, 13, 19] // Default peak engagement hours
    };
  }

  private getNotificationCategory(type: string): string {
    const categories: { [key: string]: string } = {
      'new_opportunity': 'opportunities',
      'application_update': 'applications',
      'audition_reminder': 'reminders',
      'system_update': 'updates',
      'promotion': 'marketing'
    };

    return categories[type] || 'updates';
  }

  private async calculateOptimalTimes(userId: string): Promise<number[]> {
    // Analyze user's historical engagement patterns
    const engagements = await prisma.notification.findMany({
      where: { 
        userId,
        isRead: true 
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    if (engagements.length < 10) {
      return [9, 13, 19]; // Default times
    }

    // Count engagements by hour
    const hourCounts = new Map<number, number>();
    for (const engagement of engagements) {
      const hour = new Date(engagement.createdAt).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    // Get top 3 hours
    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  private async getNotificationTemplate(type: string): Promise<any> {
    // Get template from database or cache
    const templates: { [key: string]: any } = {
      'new_opportunity': {
        title: 'New Casting Call: {{projectName}}',
        body: 'A new opportunity matching your profile is available. {{description}}',
        cta: 'View Details'
      },
      'application_update': {
        title: 'Application Update',
        body: 'Your application for {{projectName}} has been {{status}}',
        cta: 'Check Status'
      }
    };

    return templates[type] || {
      title: 'Notification',
      body: 'You have a new update',
      cta: 'View'
    };
  }

  private personalizeTemplate(template: any, data: any): any {
    let title = template.title;
    let body = template.body;

    // Replace tokens
    for (const [key, value] of Object.entries(data)) {
      const token = `{{${key}}}`;
      title = title.replace(new RegExp(token, 'g'), value);
      body = body.replace(new RegExp(token, 'g'), value);
    }

    return {
      ...template,
      title,
      body
    };
  }

  private async generateContentVariants(content: any, userContext: any): Promise<any[]> {
    const variants = [content];

    // Generate tone variants
    variants.push({
      ...content,
      body: this.adjustTone(content.body, 'professional'),
      variantId: 'professional'
    });

    variants.push({
      ...content,
      body: this.adjustTone(content.body, 'friendly'),
      variantId: 'friendly'
    });

    // Generate length variants
    variants.push({
      ...content,
      body: this.shortenContent(content.body),
      variantId: 'short'
    });

    return variants;
  }

  private adjustTone(content: string, tone: string): string {
    // Simple tone adjustment
    if (tone === 'professional') {
      return content.replace(/Hi|Hey/g, 'Greetings')
        .replace(/!/g, '.');
    } else if (tone === 'friendly') {
      return `Hey there! ${content} 🎬`;
    }
    return content;
  }

  private shortenContent(content: string): string {
    // Keep first sentence and key information
    const sentences = content.split('. ');
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private async selectBestVariant(variants: any[], userContext: any): Promise<any> {
    // Select based on user's historical preferences
    const history = userContext.notificationHistory || [];
    
    if (history.length > 0) {
      // Find which variant type performed best
      const variantPerformance = new Map<string, number>();
      
      for (const notification of history) {
        const variant = notification.metadata?.contentVariant || 'default';
        const engagement = notification.engaged ? 1 : 0;
        variantPerformance.set(
          variant,
          (variantPerformance.get(variant) || 0) + engagement
        );
      }

      // Select best performing variant type
      const bestVariant = Array.from(variantPerformance.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (bestVariant) {
        const selected = variants.find(v => v.variantId === bestVariant[0]);
        if (selected) return selected;
      }
    }

    // Default to first variant
    return variants[0];
  }

  private async optimizeContent(content: any, userContext: any): Promise<any> {
    // Optimize content for maximum engagement
    return {
      ...content,
      title: this.optimizeTitle(content.title, userContext),
      body: this.optimizeBody(content.body, userContext)
    };
  }

  private optimizeTitle(title: string, userContext: any): string {
    // Add urgency or personalization
    if (userContext.name) {
      return `${userContext.name.split(' ')[0]}, ${title}`;
    }
    return title;
  }

  private optimizeBody(body: string, userContext: any): string {
    // Add personal touch based on user type
    if (userContext.profile?.userType === 'actor') {
      return body.replace(/opportunity/g, 'role');
    }
    return body;
  }

  private calculatePersonalizationScore(content: any): number {
    let score = 0;
    
    // Check for personalization tokens used
    if (content.title.includes(content.userName)) score += 0.3;
    if (content.body.includes(content.userType)) score += 0.2;
    if (content.variantId !== 'default') score += 0.2;
    if (content.actions) score += 0.3;
    
    return Math.min(1, score);
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'urgent' {
    const score = this.sentimentAnalyzer.getSentiment(text.split(' '));
    
    if (text.toLowerCase().includes('urgent') || text.includes('!')) {
      return 'urgent';
    }
    
    if (score > 0.3) return 'positive';
    return 'neutral';
  }

  private generateActionsForType(type: string, data: any): any {
    const actions: { [key: string]: any } = {
      'new_opportunity': {
        primary: { label: 'View Role', url: `/projects/${data.projectId}` },
        secondary: { label: 'Save for Later', url: `/saved` }
      },
      'application_update': {
        primary: { label: 'View Application', url: `/applications/${data.applicationId}` }
      }
    };

    return actions[type];
  }

  private getDefaultContent(type: string, data: any): any {
    return {
      title: 'CastMatch Notification',
      body: `You have a new update regarding ${type}`,
      variant: 'default',
      personalizationScore: 0,
      sentiment: 'neutral',
      actions: null
    };
  }

  private async predictEngagement(userId: string, content: any): Promise<number> {
    if (!this.contentOptimizer) return 0.5;

    try {
      // Extract features from content
      const features = [
        content.personalizationScore,
        content.sentiment === 'positive' ? 1 : 0,
        content.sentiment === 'urgent' ? 1 : 0,
        content.actions ? 1 : 0,
        content.title.length / 100,
        content.body.length / 500,
        // Add more features...
      ];

      // Pad to match model input shape
      while (features.length < 20) {
        features.push(0);
      }

      const input = tf.tensor2d([features]);
      const prediction = this.contentOptimizer.predict(input) as tf.Tensor;
      const probability = (await prediction.data())[0];

      input.dispose();
      prediction.dispose();

      return probability || 0.5;
    } catch (error) {
      logger.error('Error predicting engagement:', error);
      return 0.5;
    }
  }

  private getABTestGroup(userId: string): string {
    return this.abTestGroups.get(userId) || 'default';
  }

  // Additional helper methods
  private getFallbackTiming(userContext: any): Date {
    // Default to 10 AM tomorrow if no model available
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }

  private async getUserEngagementHistory(userId: string): Promise<any[]> {
    // Fetch user's engagement history from database
    try {
      const engagements = await prisma.notification.findMany({
        where: {
          userId,
          isRead: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      });
      return engagements;
    } catch (error) {
      logger.error('Error fetching engagement history:', error);
      return [];
    }
  }

  private extractTimingFeatures(userContext: any, engagementHistory: any[], notificationType: string): number[] {
    // Extract features for timing prediction
    const features = [];
    
    // Day of week (0-6)
    const now = new Date();
    features.push(now.getDay());
    
    // Hour of day (0-23)
    features.push(now.getHours());
    
    // User timezone offset
    features.push(now.getTimezoneOffset() / 60);
    
    // Notification type encoded
    const typeEncoding = {
      'email': 1,
      'push': 2,
      'sms': 3,
      'inApp': 4
    };
    features.push((typeEncoding as any)[notificationType] || 0);
    
    // Average engagement hour
    const avgHour = engagementHistory.length > 0 
      ? engagementHistory.reduce((sum, e) => sum + new Date(e.createdAt).getHours(), 0) / engagementHistory.length
      : 12;
    features.push(avgHour);
    
    return features;
  }

  private selectHourWithConstraints(hourProbabilities: {hour: number, prob: number}[], preferences: any): number {
    // Select best hour considering user preferences
    const quietHoursStart = preferences?.quietHoursStart || 22;
    const quietHoursEnd = preferences?.quietHoursEnd || 8;
    
    for (const {hour, prob} of hourProbabilities) {
      if (hour >= quietHoursEnd && hour < quietHoursStart) {
        return hour;
      }
    }
    
    // Default to first available hour after quiet hours
    return quietHoursEnd;
  }

  private getNextOccurrence(hour: number): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, 0, 0, 0);
    
    // If the hour has passed today, set for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }

  private async getUsersInSegment(segment: string): Promise<string[]> {
    // Get users in a specific segment
    try {
      const users = await prisma.user.findMany({
        where: {
          // Add segment logic based on your requirements
          isActive: true
        },
        select: {
          id: true
        }
      });
      return users.map((u: any) => u.id);
    } catch (error) {
      logger.error('Error fetching users in segment:', error);
      return [];
    }
  }

  private async sendTestNotification(userId: string, content: NotificationContent, group: string): Promise<void> {
    // Send test notification
    await this.sendNotification(userId, content.type || 'test', { content, group }, { immediate: true });
  }

  private async getGroupMetrics(testName: string, group: string): Promise<any> {
    // Get metrics for A/B test group
    return {
      impressions: 0,
      clicks: 0,
      conversions: 0
    };
  }

  private calculateStatisticalSignificance(controlMetrics: any, treatmentMetrics: any): number {
    // Simple statistical significance calculation
    return 0.95; // Placeholder
  }

  private generateTestRecommendation(testName: string, winner: string, confidence: number): string {
    return `Recommendation: Use ${winner} variant with ${confidence}% confidence`;
  }

  private async analyzeUserInterests(userId: string): Promise<any> {
    // Analyze user interests based on behavior
    return {
      categories: [],
      tags: []
    };
  }

  private async getTrendingContent(profileType: string): Promise<any[]> {
    // Get trending content for profile type
    return [];
  }

  private async getPersonalizedRecommendations(userId: string, interests: any): Promise<any[]> {
    // Get personalized recommendations
    return [];
  }

  private rankRecommendations(recommendations: any[], userContext: any): any[] {
    // Rank recommendations by relevance
    return recommendations;
  }

  private extractTopics(content: NotificationContent): string[] {
    // Extract topics from notification content
    const topics: string[] = [];
    if (content.subject) topics.push(content.subject);
    return topics;
  }

  private async generateActions(content: NotificationContent): Promise<any[]> {
    // Generate action items from content
    return [];
  }

  private async generateActionItems(content: NotificationContent): Promise<any[]> {
    // Generate action items from content
    return [];
  }

  private async storeFeedback(notificationId: string, feedback: any): Promise<void> {
    // Store feedback for learning
    logger.info(`Storing feedback for notification ${notificationId}`);
  }

  private async adjustUserPreferences(userId: string, feedback: any): Promise<void> {
    // Adjust user preferences based on feedback
    logger.info(`Adjusting preferences for user ${userId}`);
  }

  private async processBatchNotifications(batch: any[]): Promise<void> {
    // Process batch of notifications
    for (const notification of batch) {
      await this.sendNotification(notification.userId, notification.type || 'batch', notification.data || {}, { immediate: false });
    }
  }

  private async handleFailedNotification(notification: any, error: any): Promise<void> {
    // Handle failed notification
    logger.error(`Failed to send notification: ${error.message}`);
  }
}

export const intelligentNotifications = new IntelligentNotificationService();