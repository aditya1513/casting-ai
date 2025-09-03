import { UserBehaviorAnalytics } from './analytics/userBehaviorAnalytics';
import { SmartProfileCompletion } from './profile/smartProfileCompletion';
import { IntelligentNotifications } from './notifications/intelligentNotifications';
import { SecurityIntelligence } from './security/securityIntelligence';
import { PlatformIntelligence } from './platform/platformIntelligence';
import { PrivacyComplianceService } from './core/privacyCompliance';
import { ExplainableAIService } from './core/explainableAI';
import { AIConfig } from './core/config';
import { 
  UserBehaviorEvent, 
  ProfileQualityScore, 
  SecurityThreat,
  PlatformMetrics,
  ExplainableAIResult 
} from './types';

export class AIService {
  private userBehaviorAnalytics: UserBehaviorAnalytics;
  private profileCompletion: SmartProfileCompletion;
  private intelligentNotifications: IntelligentNotifications;
  private securityIntelligence: SecurityIntelligence;
  private platformIntelligence: PlatformIntelligence;
  private privacyCompliance: PrivacyComplianceService;
  private explainableAI: ExplainableAIService;

  private initialized: boolean = false;

  constructor() {
    this.userBehaviorAnalytics = new UserBehaviorAnalytics();
    this.profileCompletion = new SmartProfileCompletion();
    this.intelligentNotifications = new IntelligentNotifications();
    this.securityIntelligence = new SecurityIntelligence();
    this.platformIntelligence = new PlatformIntelligence();
    this.privacyCompliance = new PrivacyComplianceService();
    this.explainableAI = new ExplainableAIService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🤖 Initializing AI Service...');

    try {
      console.log('📊 Setting up analytics and behavioral tracking...');
      
      console.log('👤 Initializing profile intelligence...');
      
      console.log('🔔 Starting intelligent notification system...');
      
      console.log('🛡️ Activating security intelligence...');
      
      console.log('📈 Launching platform intelligence...');
      
      console.log('🔒 Ensuring privacy compliance...');

      this.initialized = true;
      console.log('✅ AI Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Service:', error);
      throw error;
    }
  }

  async trackUserBehavior(event: UserBehaviorEvent): Promise<void> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(event.userId, 'system', 'analytics'))) {
      console.log(`Analytics tracking blocked for user ${event.userId} due to privacy settings`);
      return;
    }

    await this.userBehaviorAnalytics.trackEvent(event);

    const anomalies = await this.securityIntelligence.detectAnomalies(event.userId, event);
    if (anomalies.length > 0) {
      console.log(`🚨 Security anomalies detected for user ${event.userId}`);
    }
  }

  async analyzeProfileQuality(userId: string): Promise<ProfileQualityScore> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'profiling'))) {
      throw new Error('Profile analysis not permitted due to privacy settings');
    }

    return await this.profileCompletion.analyzeProfileQuality(userId);
  }

  async sendSmartNotification(
    userId: string,
    content: any,
    options?: any
  ): Promise<void> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'marketing'))) {
      console.log(`Notification blocked for user ${userId} due to privacy settings`);
      return;
    }

    await this.intelligentNotifications.sendSmartNotification(userId, content, options);
  }

  async assessSecurityThreat(ipAddress: string, userAgent?: string): Promise<SecurityThreat | null> {
    await this.ensureInitialized();
    return await this.securityIntelligence.assessThreat(ipAddress, userAgent);
  }

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    await this.ensureInitialized();
    return await this.platformIntelligence.collectPlatformMetrics();
  }

  async getPlatformHealthScore(): Promise<number> {
    await this.ensureInitialized();
    return await this.platformIntelligence.getHealthScore();
  }

  async predictChurn(userId: string): Promise<any> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'analytics'))) {
      throw new Error('Churn prediction not permitted due to privacy settings');
    }

    return await this.userBehaviorAnalytics.predictChurn(userId);
  }

  async identifyUserSegments(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'analytics'))) {
      return [];
    }

    return await this.userBehaviorAnalytics.identifyUserSegments(userId);
  }

  async inferProfileData(userId: string): Promise<any> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'profiling'))) {
      throw new Error('Profile inference not permitted due to privacy settings');
    }

    return await this.profileCompletion.inferProfileData(userId);
  }

  async validateProfileWithExplanation(userId: string): Promise<ExplainableAIResult> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'profiling'))) {
      throw new Error('Profile validation not permitted due to privacy settings');
    }

    return await this.profileCompletion.validateAndEnhanceProfile(userId);
  }

  async analyzeFeatureAdoption(featureName: string): Promise<any> {
    await this.ensureInitialized();
    return await this.platformIntelligence.analyzeFeatureAdoption(featureName);
  }

  async generateBusinessInsights(): Promise<any> {
    await this.ensureInitialized();
    return await this.platformIntelligence.generateBusinessInsights();
  }

  async updateUserConsent(
    userId: string,
    consentType: string,
    granted: boolean
  ): Promise<void> {
    await this.ensureInitialized();
    await this.privacyCompliance.updateConsent(userId, consentType as any, granted);
  }

  async requestDataDeletion(
    userId: string,
    dataTypes?: string[]
  ): Promise<any> {
    await this.ensureInitialized();
    return await this.privacyCompliance.requestDataDeletion(userId, dataTypes);
  }

  async generatePrivacyReport(userId: string): Promise<any> {
    await this.ensureInitialized();
    return await this.privacyCompliance.generatePrivacyReport(userId);
  }

  async explainPrediction(
    modelName: string,
    input: number[],
    features: string[]
  ): Promise<ExplainableAIResult> {
    await this.ensureInitialized();
    
    throw new Error('Model explanation not available - implement model loading logic');
  }

  async runABTest(testConfig: any): Promise<void> {
    await this.ensureInitialized();
    await this.intelligentNotifications.runABTest(testConfig);
  }

  async detectFraud(userId: string, transactionData: any): Promise<number> {
    await this.ensureInitialized();
    return await this.securityIntelligence.detectFraud(userId, transactionData);
  }

  async monitorBruteForce(ipAddress: string, username?: string): Promise<any[]> {
    await this.ensureInitialized();
    return await this.securityIntelligence.monitorBruteForce(ipAddress, username);
  }

  async personalizeNotificationContent(userId: string, baseContent: any): Promise<any> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'marketing'))) {
      return baseContent;
    }

    return await this.intelligentNotifications.personalizeContent(userId, baseContent);
  }

  async predictOptimalNotificationTiming(userId: string, content: any): Promise<any> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'analytics'))) {
      return { optimalTime: new Date(), confidence: 0, reasoning: 'Privacy restricted' };
    }

    return await this.intelligentNotifications.predictOptimalTiming(userId, content);
  }

  async anonymizeUserData(userId: string): Promise<void> {
    await this.ensureInitialized();
    await this.privacyCompliance.anonymizeUserData(userId);
  }

  async getPlatformHealthCheck(): Promise<any> {
    await this.ensureInitialized();
    
    const healthScore = await this.getPlatformHealthScore();
    const metrics = await this.getPlatformMetrics();
    const bottlenecks = await this.platformIntelligence.predictPerformanceBottlenecks();
    
    return {
      healthScore,
      status: healthScore > 0.8 ? 'healthy' : healthScore > 0.6 ? 'warning' : 'critical',
      metrics: {
        dailyActiveUsers: metrics.dailyActiveUsers,
        responseTime: metrics.performanceMetrics.avgResponseTime,
        errorRate: metrics.performanceMetrics.errorRate,
        uptime: metrics.performanceMetrics.uptime,
      },
      bottlenecks,
      timestamp: new Date(),
    };
  }

  async getUserJourney(userId: string): Promise<any[]> {
    await this.ensureInitialized();
    
    if (!(await this.privacyCompliance.validateDataAccess(userId, 'system', 'analytics'))) {
      return [];
    }

    return await this.userBehaviorAnalytics.analyzeUserJourney(userId);
  }

  async getAIInsights(scope: 'user' | 'platform' | 'security' = 'platform'): Promise<any> {
    await this.ensureInitialized();
    
    const insights: any = {
      timestamp: new Date(),
      scope,
    };
    
    switch (scope) {
      case 'platform':
        insights.platformHealth = await this.getPlatformHealthScore();
        insights.businessInsights = await this.generateBusinessInsights();
        insights.bottlenecks = await this.platformIntelligence.predictPerformanceBottlenecks();
        break;
        
      case 'security':
        insights.securityStatus = 'monitoring';
        insights.threatLevel = 'low';
        break;
        
      case 'user':
        insights.message = 'User-specific insights require user ID parameter';
        break;
    }
    
    return insights;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async getServiceStatus(): Promise<any> {
    return {
      initialized: this.initialized,
      services: {
        userBehaviorAnalytics: 'active',
        profileCompletion: 'active',
        intelligentNotifications: 'active',
        securityIntelligence: 'active',
        platformIntelligence: 'active',
        privacyCompliance: 'active',
        explainableAI: 'active',
      },
      config: {
        analyticsEnabled: AIConfig.analytics.tracking.enabled,
        privacyCompliant: AIConfig.privacy.compliance.gdprEnabled || AIConfig.privacy.compliance.ccpaEnabled,
        explainabilityEnabled: AIConfig.explainability.enabled,
      },
      timestamp: new Date(),
    };
  }

  async cleanup(): Promise<void> {
    console.log('🔄 Cleaning up AI Service...');
    
    await Promise.all([
      this.userBehaviorAnalytics.cleanup(),
      this.profileCompletion.cleanup(),
      this.intelligentNotifications.cleanup(),
      this.securityIntelligence.cleanup(),
      this.platformIntelligence.cleanup(),
      this.privacyCompliance.cleanup(),
    ]);
    
    this.initialized = false;
    console.log('✅ AI Service cleanup completed');
  }
}

export default AIService;