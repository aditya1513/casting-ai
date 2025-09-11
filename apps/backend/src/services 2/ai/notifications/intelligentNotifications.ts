import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';
import * as tf from '@tensorflow/tfjs-node';
import sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';
import webpush from 'web-push';
import mailgun from 'mailgun.js';
import FormData from 'form-data';
import { AIConfig } from '../core/config';
import { 
  NotificationPreference,
  ABTestConfig,
  ABTestVariant,
  UserBehaviorEvent 
} from '../types';

interface NotificationContent {
  subject: string;
  body: string;
  cta?: string;
  ctaUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

interface NotificationTiming {
  optimalTime: Date;
  confidence: number;
  reasoning: string;
}

export class IntelligentNotifications {
  private prisma: PrismaClient;
  private twilioClient?: Twilio;
  private mailgunClient?: any;
  private timingModel?: tf.LayersModel;
  private contentModel?: tf.LayersModel;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private notificationQueue: Map<string, NotificationContent[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeProviders();
    this.loadModels();
    this.setupScheduledJobs();
  }

  private initializeProviders() {
    if (AIConfig.notifications.channels.email.provider === 'sendgrid') {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
    } else if (AIConfig.notifications.channels.email.provider === 'mailgun') {
      const Mailgun = mailgun.default || mailgun;
      this.mailgunClient = new Mailgun(FormData).client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY || '',
      });
    }

    if (AIConfig.notifications.channels.sms.provider === 'twilio') {
      this.twilioClient = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    webpush.setVapidDetails(
      'mailto:support@castmatch.ai',
      AIConfig.notifications.channels.push.vapidPublicKey,
      AIConfig.notifications.channels.push.vapidPrivateKey
    );
  }

  private async loadModels() {
    try {
      this.timingModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/notification_timing/model.json`
      );
      this.contentModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/notification_content/model.json`
      );
    } catch {
      this.timingModel = this.createDefaultTimingModel();
      this.contentModel = this.createDefaultContentModel();
    }
  }

  private createDefaultTimingModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [24], units: 48, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 24, activation: 'relu' }),
        tf.layers.dense({ units: 24, activation: 'softmax' }),
      ],
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private createDefaultContentModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [100], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' }),
      ],
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private setupScheduledJobs() {
    cron.schedule('*/5 * * * *', () => this.processNotificationQueue());
    
    cron.schedule('0 * * * *', () => this.optimizeTimingModels());
    
    cron.schedule('0 0 * * *', () => this.runABTestAnalysis());
    
    cron.schedule('0 */6 * * *', () => this.updateUserPreferences());
  }

  async sendSmartNotification(
    userId: string,
    content: NotificationContent,
    options?: { immediate?: boolean; testVariant?: string }
  ): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      if (!this.shouldSendNotification(preferences, content)) {
        console.log(`Notification suppressed for user ${userId}`);
        return;
      }

      if (options?.immediate) {
        await this.sendImmediateNotification(userId, content, preferences);
      } else {
        const timing = await this.predictOptimalTiming(userId, content);
        
        if (AIConfig.notifications.intelligent.batchingEnabled) {
          this.addToQueue(userId, content);
        } else {
          await this.scheduleNotification(userId, content, timing);
        }
      }

      await this.trackNotificationSent(userId, content, options?.testVariant);
    } catch (error) {
      console.error('Error sending smart notification:', error);
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreference> {
    const prefs = await this.prisma.$queryRaw<NotificationPreference[]>`
      SELECT * FROM notification_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (!prefs[0]) {
      return this.createDefaultPreferences(userId);
    }

    return prefs[0];
  }

  private createDefaultPreferences(userId: string): NotificationPreference {
    return {
      userId,
      channel: 'email',
      enabled: true,
      frequency: 'immediate',
      categories: ['all'],
      quietHours: {
        start: '22:00',
        end: '08:00',
        timezone: AIConfig.notifications.timing.timezone,
      },
    };
  }

  private shouldSendNotification(
    preferences: NotificationPreference,
    content: NotificationContent
  ): boolean {
    if (!preferences.enabled) return false;

    if (preferences.categories.length > 0 && !preferences.categories.includes('all')) {
      const contentCategory = content.metadata?.category || 'general';
      if (!preferences.categories.includes(contentCategory)) {
        return false;
      }
    }

    if (this.isInQuietHours(preferences)) {
      if (content.priority !== 'urgent') {
        return false;
      }
    }

    return true;
  }

  private isInQuietHours(preferences: NotificationPreference): boolean {
    if (!preferences.quietHours) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quietHours.start.split(':')[0]);
    const endHour = parseInt(preferences.quietHours.end.split(':')[0]);

    if (startHour > endHour) {
      return currentHour >= startHour || currentHour < endHour;
    } else {
      return currentHour >= startHour && currentHour < endHour;
    }
  }

  async predictOptimalTiming(
    userId: string,
    content: NotificationContent
  ): Promise<NotificationTiming> {
    const userActivity = await this.getUserActivityPattern(userId);
    const features = this.extractTimingFeatures(userActivity, content);
    
    const prediction = this.timingModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const probabilities = await prediction.data();
    
    const optimalHour = probabilities.indexOf(Math.max(...probabilities));
    const confidence = Math.max(...probabilities);
    
    const optimalTime = new Date();
    optimalTime.setHours(optimalHour, 0, 0, 0);
    
    if (optimalTime < new Date()) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }
    
    return {
      optimalTime,
      confidence,
      reasoning: this.generateTimingReasoning(optimalHour, userActivity),
    };
  }

  private async getUserActivityPattern(userId: string): Promise<number[]> {
    const events = await this.prisma.$queryRaw<UserBehaviorEvent[]>`
      SELECT * FROM user_behavior_events
      WHERE user_id = ${userId}
      AND timestamp > NOW() - INTERVAL '30 days'
    `;

    const hourlyActivity = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    const max = Math.max(...hourlyActivity);
    return hourlyActivity.map(count => max > 0 ? count / max : 0);
  }

  private extractTimingFeatures(
    userActivity: number[],
    content: NotificationContent
  ): number[] {
    const features = [...userActivity];
    
    return features;
  }

  private generateTimingReasoning(hour: number, activity: number[]): string {
    const peakHours = activity
      .map((val, idx) => ({ hour: idx, activity: val }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 3)
      .map(item => item.hour);

    if (peakHours.includes(hour)) {
      return `User is most active at ${hour}:00, making it optimal for engagement`;
    } else {
      return `Scheduled for ${hour}:00 based on historical engagement patterns`;
    }
  }

  async personalizeContent(
    userId: string,
    baseContent: NotificationContent
  ): Promise<NotificationContent> {
    const userProfile = await this.getUserProfile(userId);
    const userHistory = await this.getUserNotificationHistory(userId);
    
    const features = await this.extractContentFeatures(userProfile, userHistory);
    const prediction = this.contentModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const scores = await prediction.data();
    
    const contentVariants = await this.generateContentVariants(baseContent, userProfile);
    const selectedVariant = contentVariants[scores.indexOf(Math.max(...scores))];
    
    const personalizedContent = await this.applyPersonalization(
      selectedVariant,
      userProfile
    );
    
    return personalizedContent;
  }

  private async getUserProfile(userId: string): Promise<any> {
    return await this.prisma.$queryRaw`
      SELECT * FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ${userId}
      LIMIT 1
    `;
  }

  private async getUserNotificationHistory(userId: string): Promise<any[]> {
    return await this.prisma.$queryRaw`
      SELECT * FROM notification_history
      WHERE user_id = ${userId}
      ORDER BY sent_at DESC
      LIMIT 50
    `;
  }

  private async extractContentFeatures(profile: any, history: any[]): Promise<number[]> {
    const features: number[] = [];
    
    const engagementRate = history.filter(h => h.opened).length / Math.max(history.length, 1);
    features.push(engagementRate);
    
    const clickRate = history.filter(h => h.clicked).length / Math.max(history.length, 1);
    features.push(clickRate);
    
    const preferredLength = this.calculatePreferredContentLength(history);
    features.push(preferredLength / 1000);
    
    while (features.length < 100) {
      features.push(0);
    }
    
    return features;
  }

  private calculatePreferredContentLength(history: any[]): number {
    const engagedNotifications = history.filter(h => h.opened && h.clicked);
    if (engagedNotifications.length === 0) return 200;
    
    const avgLength = engagedNotifications.reduce((sum, n) => 
      sum + (n.content_length || 200), 0
    ) / engagedNotifications.length;
    
    return avgLength;
  }

  private async generateContentVariants(
    baseContent: NotificationContent,
    userProfile: any
  ): Promise<NotificationContent[]> {
    return [
      baseContent,
      {
        ...baseContent,
        subject: this.makeConversational(baseContent.subject),
        body: this.makeConversational(baseContent.body),
      },
      {
        ...baseContent,
        subject: this.makeFormal(baseContent.subject),
        body: this.makeFormal(baseContent.body),
      },
    ];
  }

  private makeConversational(text: string): string {
    return text
      .replace(/Dear [^,]+,/, 'Hey there,')
      .replace(/Sincerely,/, 'Cheers,')
      .replace(/We are pleased to inform you/, "Great news!");
  }

  private makeFormal(text: string): string {
    return text
      .replace(/Hey|Hi/, 'Dear User')
      .replace(/Cheers|Thanks/, 'Sincerely')
      .replace(/awesome|cool/, 'excellent');
  }

  private async applyPersonalization(
    content: NotificationContent,
    userProfile: any
  ): Promise<NotificationContent> {
    const personalized = { ...content };
    
    if (userProfile?.name) {
      personalized.subject = personalized.subject.replace('{name}', userProfile.name);
      personalized.body = personalized.body.replace('{name}', userProfile.name);
    }
    
    if (userProfile?.industry) {
      personalized.body = personalized.body.replace('{industry}', userProfile.industry);
    }
    
    return personalized;
  }

  async runABTest(config: ABTestConfig): Promise<void> {
    const eligibleUsers = await this.getEligibleUsers(config.targetAudience);
    
    for (const user of eligibleUsers) {
      const variant = this.selectVariant(config.variants);
      await this.assignUserToVariant(user.id, config.id, variant.id);
      
      const content = await this.createVariantContent(variant);
      await this.sendSmartNotification(user.id, content, { testVariant: variant.id });
    }
  }

  private async getEligibleUsers(criteria: any[]): Promise<any[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    
    criteria.forEach(criterion => {
      switch (criterion.operator) {
        case 'equals':
          query += ` AND ${criterion.field} = '${criterion.value}'`;
          break;
        case 'greater_than':
          query += ` AND ${criterion.field} > ${criterion.value}`;
          break;
        case 'in':
          query += ` AND ${criterion.field} IN (${criterion.value.map((v: any) => `'${v}'`).join(',')})`;
          break;
      }
    });
    
    return await this.prisma.$queryRawUnsafe(query);
  }

  private selectVariant(variants: ABTestVariant[]): ABTestVariant {
    const random = Math.random();
    let cumulative = 0;
    
    for (const variant of variants) {
      cumulative += variant.allocation;
      if (random < cumulative) {
        return variant;
      }
    }
    
    return variants[variants.length - 1];
  }

  private async assignUserToVariant(
    userId: string,
    testId: string,
    variantId: string
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ab_test_assignments (
        user_id, test_id, variant_id, assigned_at
      ) VALUES (
        ${userId}, ${testId}, ${variantId}, ${new Date()}
      )
    `;
  }

  private async createVariantContent(variant: ABTestVariant): Promise<NotificationContent> {
    return {
      subject: variant.config.subject || 'Test Notification',
      body: variant.config.body || 'This is a test notification',
      cta: variant.config.cta,
      ctaUrl: variant.config.ctaUrl,
      priority: 'medium',
      metadata: {
        variant: variant.id,
      },
    };
  }

  private async sendImmediateNotification(
    userId: string,
    content: NotificationContent,
    preferences: NotificationPreference
  ): Promise<void> {
    switch (preferences.channel) {
      case 'email':
        await this.sendEmail(userId, content);
        break;
      case 'sms':
        await this.sendSMS(userId, content);
        break;
      case 'push':
        await this.sendPushNotification(userId, content);
        break;
      case 'in_app':
        await this.sendInAppNotification(userId, content);
        break;
    }
  }

  private async sendEmail(userId: string, content: NotificationContent): Promise<void> {
    const user = await this.getUserProfile(userId);
    
    if (!user?.email) return;

    const msg = {
      to: user.email,
      from: {
        email: AIConfig.notifications.channels.email.fromEmail,
        name: AIConfig.notifications.channels.email.fromName,
      },
      subject: content.subject,
      html: this.generateEmailHTML(content),
      text: content.body,
    };

    if (AIConfig.notifications.channels.email.provider === 'sendgrid') {
      await sgMail.send(msg);
    } else if (this.mailgunClient) {
      await this.mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `${msg.from.name} <${msg.from.email}>`,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    }
  }

  private generateEmailHTML(content: NotificationContent): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .cta { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${content.subject}</h2>
            </div>
            <div class="content">
              <p>${content.body}</p>
              ${content.cta ? `<a href="${content.ctaUrl}" class="cta">${content.cta}</a>` : ''}
            </div>
            <div class="footer">
              <p>© 2024 CastMatch AI. All rights reserved.</p>
              <p><a href="{unsubscribe_url}">Unsubscribe</a> | <a href="{preferences_url}">Update Preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async sendSMS(userId: string, content: NotificationContent): Promise<void> {
    if (!this.twilioClient) return;

    const user = await this.getUserProfile(userId);
    if (!user?.phone) return;

    await this.twilioClient.messages.create({
      body: `${content.subject}\n\n${content.body}`,
      from: AIConfig.notifications.channels.sms.fromNumber,
      to: user.phone,
    });
  }

  private async sendPushNotification(userId: string, content: NotificationContent): Promise<void> {
    const subscriptions = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM push_subscriptions
      WHERE user_id = ${userId}
    `;

    for (const subscription of subscriptions) {
      const payload = JSON.stringify({
        title: content.subject,
        body: content.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          url: content.ctaUrl,
          priority: content.priority,
        },
      });

      await webpush.sendNotification(subscription.subscription, payload);
    }
  }

  private async sendInAppNotification(userId: string, content: NotificationContent): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO in_app_notifications (
        user_id, subject, body, cta, cta_url, 
        priority, read, created_at
      ) VALUES (
        ${userId}, ${content.subject}, ${content.body}, 
        ${content.cta}, ${content.ctaUrl}, ${content.priority},
        false, ${new Date()}
      )
    `;
  }

  private async scheduleNotification(
    userId: string,
    content: NotificationContent,
    timing: NotificationTiming
  ): Promise<void> {
    const jobId = `${userId}-${Date.now()}`;
    
    const cronExpression = this.dateToCron(timing.optimalTime);
    
    const job = cron.schedule(cronExpression, async () => {
      const preferences = await this.getUserPreferences(userId);
      await this.sendImmediateNotification(userId, content, preferences);
      this.scheduledJobs.delete(jobId);
    }, {
      scheduled: true,
      timezone: AIConfig.notifications.timing.timezone,
    });

    this.scheduledJobs.set(jobId, job);
  }

  private dateToCron(date: Date): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
  }

  private addToQueue(userId: string, content: NotificationContent): void {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }
    
    this.notificationQueue.get(userId)!.push(content);
  }

  private async processNotificationQueue(): Promise<void> {
    for (const [userId, contents] of this.notificationQueue.entries()) {
      if (contents.length === 0) continue;
      
      const preferences = await this.getUserPreferences(userId);
      
      if (preferences.frequency === 'immediate') {
        for (const content of contents) {
          await this.sendImmediateNotification(userId, content, preferences);
        }
      } else {
        const digestContent = this.createDigest(contents);
        await this.sendImmediateNotification(userId, digestContent, preferences);
      }
      
      this.notificationQueue.set(userId, []);
    }
  }

  private createDigest(contents: NotificationContent[]): NotificationContent {
    const highPriority = contents.filter(c => c.priority === 'high' || c.priority === 'urgent');
    const regularItems = contents.filter(c => c.priority === 'medium' || c.priority === 'low');
    
    let body = 'Here\'s your digest:\n\n';
    
    if (highPriority.length > 0) {
      body += '🔴 Important Updates:\n';
      highPriority.forEach(item => {
        body += `• ${item.subject}\n`;
      });
      body += '\n';
    }
    
    if (regularItems.length > 0) {
      body += '📋 Updates:\n';
      regularItems.forEach(item => {
        body += `• ${item.subject}\n`;
      });
    }
    
    return {
      subject: `Your CastMatch Digest (${contents.length} updates)`,
      body,
      priority: highPriority.length > 0 ? 'high' : 'medium',
    };
  }

  private async optimizeTimingModels(): Promise<void> {
    const trainingData = await this.getTimingTrainingData();
    
    if (trainingData.length < 100) return;
    
    const xs = tf.tensor2d(trainingData.map(d => d.features));
    const ys = tf.tensor2d(trainingData.map(d => d.label));
    
    await this.timingModel!.fit(xs, ys, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
    });
    
    xs.dispose();
    ys.dispose();
  }

  private async getTimingTrainingData(): Promise<any[]> {
    return await this.prisma.$queryRaw`
      SELECT 
        user_activity_features as features,
        optimal_hour as label
      FROM notification_timing_training
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;
  }

  private async runABTestAnalysis(): Promise<void> {
    const activeTests = await this.prisma.$queryRaw<ABTestConfig[]>`
      SELECT * FROM ab_tests
      WHERE status = 'running'
    `;
    
    for (const test of activeTests) {
      const results = await this.analyzeABTest(test.id);
      await this.updateABTestResults(test.id, results);
      
      if (results.hasSignificance) {
        await this.completeABTest(test.id, results.winner);
      }
    }
  }

  private async analyzeABTest(testId: string): Promise<any> {
    const data = await this.prisma.$queryRaw`
      SELECT 
        variant_id,
        COUNT(*) as total,
        COUNT(CASE WHEN clicked THEN 1 END) as conversions
      FROM ab_test_results
      WHERE test_id = ${testId}
      GROUP BY variant_id
    `;
    
    const results = this.calculateStatisticalSignificance(data);
    
    return results;
  }

  private calculateStatisticalSignificance(data: any[]): any {
    if (data.length < 2) {
      return { hasSignificance: false };
    }
    
    const control = data[0];
    const variant = data[1];
    
    const controlRate = control.conversions / control.total;
    const variantRate = variant.conversions / variant.total;
    
    const pooledProp = (control.conversions + variant.conversions) / 
                      (control.total + variant.total);
    
    const se = Math.sqrt(pooledProp * (1 - pooledProp) * 
              (1/control.total + 1/variant.total));
    
    const zScore = (variantRate - controlRate) / se;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    return {
      hasSignificance: pValue < 0.05,
      winner: variantRate > controlRate ? variant.variant_id : control.variant_id,
      improvement: ((variantRate - controlRate) / controlRate) * 100,
      confidence: 1 - pValue,
    };
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }

  private async updateABTestResults(testId: string, results: any): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ab_tests SET
        results = ${JSON.stringify(results)},
        updated_at = ${new Date()}
      WHERE id = ${testId}
    `;
  }

  private async completeABTest(testId: string, winnerId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ab_tests SET
        status = 'completed',
        winner_id = ${winnerId},
        completed_at = ${new Date()}
      WHERE id = ${testId}
    `;
  }

  private async updateUserPreferences(): Promise<void> {
    const users = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT user_id 
      FROM notification_history
      WHERE sent_at > NOW() - INTERVAL '7 days'
    `;
    
    for (const user of users) {
      const behavior = await this.analyzeUserNotificationBehavior(user.user_id);
      await this.updatePreferencesBasedOnBehavior(user.user_id, behavior);
    }
  }

  private async analyzeUserNotificationBehavior(userId: string): Promise<any> {
    const history = await this.getUserNotificationHistory(userId);
    
    const openRate = history.filter(h => h.opened).length / Math.max(history.length, 1);
    const clickRate = history.filter(h => h.clicked).length / Math.max(history.length, 1);
    const unsubscribeRate = history.filter(h => h.unsubscribed).length / Math.max(history.length, 1);
    
    const preferredChannels = this.identifyPreferredChannels(history);
    const optimalFrequency = this.calculateOptimalFrequency(history);
    
    return {
      openRate,
      clickRate,
      unsubscribeRate,
      preferredChannels,
      optimalFrequency,
    };
  }

  private identifyPreferredChannels(history: any[]): string[] {
    const channelEngagement: Record<string, number> = {};
    
    history.forEach(h => {
      if (h.opened || h.clicked) {
        channelEngagement[h.channel] = (channelEngagement[h.channel] || 0) + 1;
      }
    });
    
    return Object.entries(channelEngagement)
      .sort((a, b) => b[1] - a[1])
      .map(([channel]) => channel);
  }

  private calculateOptimalFrequency(history: any[]): string {
    const dailyCount = history.filter(h => {
      const hoursSince = (Date.now() - new Date(h.sent_at).getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    }).length;
    
    if (dailyCount > 5) return 'daily';
    if (dailyCount > 2) return 'immediate';
    return 'weekly';
  }

  private async updatePreferencesBasedOnBehavior(userId: string, behavior: any): Promise<void> {
    if (behavior.unsubscribeRate > 0.2) {
      await this.reduceNotificationFrequency(userId);
    }
    
    if (behavior.openRate < 0.1) {
      await this.optimizeNotificationChannel(userId, behavior.preferredChannels);
    }
    
    await this.prisma.$executeRaw`
      UPDATE notification_preferences SET
        frequency = ${behavior.optimalFrequency},
        updated_at = ${new Date()}
      WHERE user_id = ${userId}
    `;
  }

  private async reduceNotificationFrequency(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE notification_preferences SET
        frequency = CASE
          WHEN frequency = 'immediate' THEN 'daily'
          WHEN frequency = 'daily' THEN 'weekly'
          ELSE 'monthly'
        END
      WHERE user_id = ${userId}
    `;
  }

  private async optimizeNotificationChannel(userId: string, preferredChannels: string[]): Promise<void> {
    if (preferredChannels.length === 0) return;
    
    await this.prisma.$executeRaw`
      UPDATE notification_preferences SET
        channel = ${preferredChannels[0]}
      WHERE user_id = ${userId}
    `;
  }

  private async trackNotificationSent(
    userId: string,
    content: NotificationContent,
    testVariant?: string
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO notification_history (
        user_id, subject, body, channel, priority,
        test_variant, sent_at, metadata
      ) VALUES (
        ${userId}, ${content.subject}, ${content.body},
        'email', ${content.priority}, ${testVariant},
        ${new Date()}, ${JSON.stringify(content.metadata)}
      )
    `;
  }

  async cleanup(): Promise<void> {
    for (const job of this.scheduledJobs.values()) {
      job.stop();
    }
    
    await this.prisma.$disconnect();
  }
}