import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import { redisClient } from '../../config/redis';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

export interface SecurityEvent {
  id?: string;
  type: SecurityEventType;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  payload: Record<string, any>;
  severity: SecuritySeverity;
  timestamp: Date;
  metadata?: {
    location?: string;
    deviceFingerprint?: string;
    riskScore?: number;
  };
}

export enum SecurityEventType {
  SUSPICIOUS_LOGIN = 'suspicious_login',
  MULTIPLE_LOGIN_ATTEMPTS = 'multiple_login_attempts',
  UNUSUAL_ACTIVITY = 'unusual_activity',
  DATA_SCRAPING = 'data_scraping',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_PROFILE = 'suspicious_profile',
  FAKE_PROFILE_DETECTED = 'fake_profile_detected',
  SPAM_ACTIVITY = 'spam_activity',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  BRUTE_FORCE = 'brute_force',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  BOT_ACTIVITY = 'bot_activity'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ThreatPattern {
  id: string;
  name: string;
  pattern: RegExp | string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  enabled: boolean;
}

export interface RiskAssessment {
  userId: string;
  riskScore: number;
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  lastUpdated: Date;
  recommendedActions: string[];
}

export interface RiskFactor {
  type: string;
  description: string;
  weight: number;
  value: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidenceScore: number;
  anomalyType: string;
  explanation: string;
  recommendedAction: string;
}

export interface LoginPattern {
  userId: string;
  typicalHours: number[];
  typicalLocations: string[];
  typicalDevices: string[];
  averageSessionDuration: number;
  frequentIPs: string[];
}

export class SecurityIntelligenceService extends EventEmitter {
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private readonly riskCachePrefix = 'risk_assessment:';
  private readonly patternCachePrefix = 'login_pattern:';
  private readonly suspiciousActivityThreshold = 10;
  private readonly bruteForceThreshold = 5;
  private readonly rateLimit = {
    window: 60000, // 1 minute
    maxRequests: 100
  };

  constructor() {
    super();
    this.initializeThreatPatterns();
    this.startSecurityMonitoring();
  }

  private initializeThreatPatterns(): void {
    const patterns: ThreatPattern[] = [
      {
        id: 'sql_injection',
        name: 'SQL Injection Detection',
        pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)|('|(\\x27)|(\\x22))|(-{2})|(%27)|(%22)/i,
        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        description: 'Detects potential SQL injection attempts',
        enabled: true
      },
      {
        id: 'xss_attempt',
        name: 'Cross-Site Scripting Detection',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        type: SecurityEventType.XSS_ATTEMPT,
        severity: SecuritySeverity.HIGH,
        description: 'Detects potential XSS attacks',
        enabled: true
      },
      {
        id: 'bot_user_agent',
        name: 'Bot User Agent Detection',
        pattern: /(bot|crawler|spider|scraper|curl|wget|python-requests)/i,
        type: SecurityEventType.BOT_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        description: 'Detects automated bot activity',
        enabled: true
      },
      {
        id: 'suspicious_email',
        name: 'Suspicious Email Patterns',
        pattern: /temp(mail|email)|10minutemail|guerrillamail|mailinator|yopmail/i,
        type: SecurityEventType.SUSPICIOUS_PROFILE,
        severity: SecuritySeverity.MEDIUM,
        description: 'Detects temporary email addresses',
        enabled: true
      }
    ];

    patterns.forEach(pattern => {
      this.threatPatterns.set(pattern.id, pattern);
    });

    logger.info(`Initialized ${patterns.length} threat detection patterns`);
  }

  /**
   * Analyze login attempt for suspicious activity
   */
  public async analyzeLoginAttempt(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<AnomalyDetectionResult> {
    try {
      const anomalies: string[] = [];
      let riskScore = 0;
      let maxConfidence = 0;

      // Check for brute force attacks
      const recentFailures = await this.getRecentLoginFailures(ipAddress, 15 * 60 * 1000); // 15 minutes
      if (recentFailures >= this.bruteForceThreshold) {
        anomalies.push('brute_force');
        riskScore += 80;
        maxConfidence = Math.max(maxConfidence, 0.9);

        await this.recordSecurityEvent({
          type: SecurityEventType.BRUTE_FORCE,
          userId,
          ipAddress,
          userAgent,
          payload: { failureCount: recentFailures },
          severity: SecuritySeverity.CRITICAL,
          timestamp: new Date(),
          metadata
        });
      }

      // Check for geographic anomalies
      if (metadata?.location) {
        const isLocationAnomaly = await this.detectLocationAnomaly(userId, metadata.location);
        if (isLocationAnomaly.isAnomaly) {
          anomalies.push('geographic_anomaly');
          riskScore += 40;
          maxConfidence = Math.max(maxConfidence, isLocationAnomaly.confidenceScore);
        }
      }

      // Check for time-based anomalies
      const isTimeAnomaly = await this.detectTimeAnomaly(userId, new Date());
      if (isTimeAnomaly.isAnomaly) {
        anomalies.push('time_anomaly');
        riskScore += 30;
        maxConfidence = Math.max(maxConfidence, isTimeAnomaly.confidenceScore);
      }

      // Check for device anomalies
      const isDeviceAnomaly = await this.detectDeviceAnomaly(userId, userAgent);
      if (isDeviceAnomaly.isAnomaly) {
        anomalies.push('device_anomaly');
        riskScore += 35;
        maxConfidence = Math.max(maxConfidence, isDeviceAnomaly.confidenceScore);
      }

      // Check IP reputation
      const ipReputation = await this.checkIPReputation(ipAddress);
      if (ipReputation.isSuspicious) {
        anomalies.push('suspicious_ip');
        riskScore += 50;
        maxConfidence = Math.max(maxConfidence, 0.8);
      }

      const isAnomaly = anomalies.length > 0;
      const primaryAnomaly = anomalies[0] || 'none';

      // Record successful login pattern for learning
      if (success && !isAnomaly) {
        await this.recordLoginPattern(userId, ipAddress, userAgent, metadata);
      }

      // Record security event if anomalous
      if (isAnomaly) {
        await this.recordSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_LOGIN,
          userId,
          ipAddress,
          userAgent,
          payload: { anomalies, riskScore },
          severity: this.calculateSeverityFromRisk(riskScore),
          timestamp: new Date(),
          metadata: { ...metadata, riskScore }
        });
      }

      return {
        isAnomaly,
        confidenceScore: maxConfidence,
        anomalyType: primaryAnomaly,
        explanation: this.generateAnomalyExplanation(anomalies),
        recommendedAction: this.getRecommendedAction(riskScore, anomalies)
      };

    } catch (error) {
      logger.error('Error analyzing login attempt:', error);
      throw error;
    }
  }

  /**
   * Detect fake profile using ML-based analysis
   */
  public async detectFakeProfile(
    userId: string,
    profileData: {
      name?: string;
      email?: string;
      bio?: string;
      profilePicture?: string;
      skills?: string[];
      experience?: string;
      portfolio?: any[];
    }
  ): Promise<{
    isFake: boolean;
    confidence: number;
    reasons: string[];
    riskScore: number;
  }> {
    try {
      const suspicious: string[] = [];
      let riskScore = 0;
      let confidence = 0;

      // Check email patterns
      if (profileData.email) {
        for (const pattern of this.threatPatterns.values()) {
          if (pattern.type === SecurityEventType.SUSPICIOUS_PROFILE && 
              pattern.enabled && 
              pattern.pattern instanceof RegExp &&
              pattern.pattern.test(profileData.email)) {
            suspicious.push('temporary_email');
            riskScore += 30;
            confidence = Math.max(confidence, 0.7);
            break;
          }
        }
      }

      // Analyze bio for suspicious patterns
      if (profileData.bio) {
        const bioAnalysis = await this.analyzeBioSentiment(profileData.bio);
        if (bioAnalysis.isSuspicious) {
          suspicious.push('suspicious_bio');
          riskScore += bioAnalysis.riskScore;
          confidence = Math.max(confidence, bioAnalysis.confidence);
        }
      }

      // Check name patterns
      if (profileData.name) {
        const nameAnalysis = this.analyzeNamePattern(profileData.name);
        if (nameAnalysis.isSuspicious) {
          suspicious.push('suspicious_name');
          riskScore += 20;
          confidence = Math.max(confidence, 0.6);
        }
      }

      // Analyze profile completeness and consistency
      const consistencyAnalysis = this.analyzeProfileConsistency(profileData);
      if (consistencyAnalysis.inconsistencies.length > 0) {
        suspicious.push(...consistencyAnalysis.inconsistencies);
        riskScore += consistencyAnalysis.riskScore;
        confidence = Math.max(confidence, consistencyAnalysis.confidence);
      }

      // Check profile picture (if available)
      if (profileData.profilePicture) {
        // This would integrate with image analysis service
        // For now, we'll check URL patterns
        const imageAnalysis = await this.analyzeProfileImage(profileData.profilePicture);
        if (imageAnalysis.isSuspicious) {
          suspicious.push('suspicious_image');
          riskScore += 25;
          confidence = Math.max(confidence, imageAnalysis.confidence);
        }
      }

      const isFake = suspicious.length >= 2 || riskScore >= 60;

      if (isFake) {
        await this.recordSecurityEvent({
          type: SecurityEventType.FAKE_PROFILE_DETECTED,
          userId,
          ipAddress: 'unknown',
          userAgent: 'profile_analysis',
          payload: { reasons: suspicious, profileData },
          severity: this.calculateSeverityFromRisk(riskScore),
          timestamp: new Date(),
          metadata: { riskScore, confidence }
        });
      }

      return {
        isFake,
        confidence,
        reasons: suspicious,
        riskScore
      };

    } catch (error) {
      logger.error('Error detecting fake profile:', error);
      throw error;
    }
  }

  /**
   * Assess overall user risk
   */
  public async assessUserRisk(userId: string): Promise<RiskAssessment> {
    try {
      // Check cache first
      const cached = await redisClient?.get(`${this.riskCachePrefix}${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const riskFactors: RiskFactor[] = [];
      let totalRiskScore = 0;

      // Analyze recent security events
      const recentEvents = await this.getRecentSecurityEvents(userId, 7 * 24 * 60 * 60 * 1000); // 7 days
      const eventRisk = this.calculateEventRisk(recentEvents);
      riskFactors.push(...eventRisk.factors);
      totalRiskScore += eventRisk.score;

      // Analyze login patterns
      const loginRisk = await this.analyzeLoginPatternRisk(userId);
      riskFactors.push(...loginRisk.factors);
      totalRiskScore += loginRisk.score;

      // Analyze profile authenticity
      const profileRisk = await this.analyzeProfileRisk(userId);
      riskFactors.push(...profileRisk.factors);
      totalRiskScore += profileRisk.score;

      // Analyze behavioral patterns
      const behaviorRisk = await this.analyzeBehavioralRisk(userId);
      riskFactors.push(...behaviorRisk.factors);
      totalRiskScore += behaviorRisk.score;

      // Network analysis (IP, device patterns)
      const networkRisk = await this.analyzeNetworkRisk(userId);
      riskFactors.push(...networkRisk.factors);
      totalRiskScore += networkRisk.score;

      // Normalize risk score (0-100)
      const normalizedScore = Math.min(100, Math.max(0, totalRiskScore));
      
      const riskAssessment: RiskAssessment = {
        userId,
        riskScore: normalizedScore,
        riskLevel: this.calculateRiskLevel(normalizedScore),
        factors: riskFactors,
        lastUpdated: new Date(),
        recommendedActions: this.generateRiskRecommendations(normalizedScore, riskFactors)
      };

      // Cache the result
      await redisClient?.setex(
        `${this.riskCachePrefix}${userId}`,
        3600, // 1 hour
        JSON.stringify(riskAssessment)
      );

      return riskAssessment;

    } catch (error) {
      logger.error('Error assessing user risk:', error);
      throw error;
    }
  }

  /**
   * Monitor for data scraping patterns
   */
  public async detectDataScraping(
    ipAddress: string,
    userAgent: string,
    requestPattern: {
      endpoint: string;
      method: string;
      timestamp: Date;
      userId?: string;
    }[]
  ): Promise<AnomalyDetectionResult> {
    try {
      const suspicious: string[] = [];
      let riskScore = 0;
      let confidence = 0;

      // Check request frequency
      const requestCount = requestPattern.length;
      const timeSpan = requestPattern[requestPattern.length - 1].timestamp.getTime() - 
                      requestPattern[0].timestamp.getTime();
      const requestsPerMinute = (requestCount / (timeSpan / 60000));

      if (requestsPerMinute > 30) {
        suspicious.push('high_frequency_requests');
        riskScore += 60;
        confidence = Math.max(confidence, 0.8);
      }

      // Check for bot patterns in user agent
      const botPattern = this.threatPatterns.get('bot_user_agent');
      if (botPattern?.pattern instanceof RegExp && botPattern.pattern.test(userAgent)) {
        suspicious.push('bot_user_agent');
        riskScore += 40;
        confidence = Math.max(confidence, 0.7);
      }

      // Analyze endpoint patterns
      const endpointPatterns = this.analyzeEndpointPatterns(requestPattern);
      if (endpointPatterns.isSuspicious) {
        suspicious.push('suspicious_endpoints');
        riskScore += endpointPatterns.riskScore;
        confidence = Math.max(confidence, endpointPatterns.confidence);
      }

      // Check for sequential access patterns
      const sequentialAccess = this.detectSequentialAccess(requestPattern);
      if (sequentialAccess.isSequential) {
        suspicious.push('sequential_scraping');
        riskScore += 35;
        confidence = Math.max(confidence, 0.6);
      }

      const isAnomaly = suspicious.length > 0;

      if (isAnomaly) {
        await this.recordSecurityEvent({
          type: SecurityEventType.DATA_SCRAPING,
          ipAddress,
          userAgent,
          payload: { requestPattern, suspicious },
          severity: this.calculateSeverityFromRisk(riskScore),
          timestamp: new Date(),
          metadata: { riskScore } as any
        });
      }

      return {
        isAnomaly,
        confidenceScore: confidence,
        anomalyType: 'data_scraping',
        explanation: `Detected potential data scraping: ${suspicious.join(', ')}`,
        recommendedAction: this.getScrapingRecommendedAction(riskScore)
      };

    } catch (error) {
      logger.error('Error detecting data scraping:', error);
      throw error;
    }
  }

  /**
   * Real-time threat monitoring
   */
  private startSecurityMonitoring(): void {
    // Monitor for real-time threats every 30 seconds
    setInterval(async () => {
      try {
        await this.performRealTimeAnalysis();
      } catch (error) {
        logger.error('Error in real-time security monitoring:', error);
      }
    }, 30000);

    logger.info('Security monitoring started');
  }

  private async performRealTimeAnalysis(): Promise<void> {
    // Get recent events for analysis
    const recentEvents = await this.getRecentGlobalEvents(5 * 60 * 1000); // 5 minutes

    // Analyze for coordinated attacks
    const coordinatedAttacks = await this.detectCoordinatedAttacks(recentEvents);
    if (coordinatedAttacks.length > 0) {
      for (const attack of coordinatedAttacks) {
        this.emit('security_alert', {
          type: 'coordinated_attack',
          severity: SecuritySeverity.CRITICAL,
          details: attack
        });
      }
    }

    // Analyze traffic patterns
    const trafficAnomaly = await this.detectTrafficAnomaly(recentEvents);
    if (trafficAnomaly.isAnomaly) {
      this.emit('security_alert', {
        type: 'traffic_anomaly',
        severity: SecuritySeverity.HIGH,
        details: trafficAnomaly
      });
    }
  }

  // Helper methods
  private async detectLocationAnomaly(userId: string, currentLocation: string): Promise<AnomalyDetectionResult> {
    try {
      const pattern = await this.getLoginPattern(userId);
      if (!pattern) {
        return { isAnomaly: false, confidenceScore: 0, anomalyType: 'none', explanation: '', recommendedAction: '' };
      }

      const isTypicalLocation = pattern.typicalLocations.some(loc => 
        this.calculateLocationSimilarity(loc, currentLocation) > 0.8
      );

      return {
        isAnomaly: !isTypicalLocation && pattern.typicalLocations.length > 3,
        confidenceScore: isTypicalLocation ? 0 : 0.7,
        anomalyType: 'geographic',
        explanation: isTypicalLocation ? '' : `Login from unusual location: ${currentLocation}`,
        recommendedAction: isTypicalLocation ? '' : 'Verify user identity through additional authentication'
      };
    } catch (error) {
      logger.error('Error detecting location anomaly:', error);
      return { isAnomaly: false, confidenceScore: 0, anomalyType: 'none', explanation: '', recommendedAction: '' };
    }
  }

  private async detectTimeAnomaly(userId: string, loginTime: Date): Promise<AnomalyDetectionResult> {
    try {
      const pattern = await this.getLoginPattern(userId);
      if (!pattern) {
        return { isAnomaly: false, confidenceScore: 0, anomalyType: 'none', explanation: '', recommendedAction: '' };
      }

      const loginHour = loginTime.getHours();
      const isTypicalTime = pattern.typicalHours.includes(loginHour) ||
        pattern.typicalHours.some(hour => Math.abs(hour - loginHour) <= 2);

      return {
        isAnomaly: !isTypicalTime && pattern.typicalHours.length > 5,
        confidenceScore: isTypicalTime ? 0 : 0.6,
        anomalyType: 'temporal',
        explanation: isTypicalTime ? '' : `Login at unusual time: ${loginHour}:00`,
        recommendedAction: isTypicalTime ? '' : 'Send security notification to user'
      };
    } catch (error) {
      logger.error('Error detecting time anomaly:', error);
      return { isAnomaly: false, confidenceScore: 0, anomalyType: 'none', explanation: '', recommendedAction: '' };
    }
  }

  private async detectDeviceAnomaly(userId: string, userAgent: string): Promise<AnomalyDetectionResult> {
    try {
      const pattern = await this.getLoginPattern(userId);
      if (!pattern) {
        return { isAnomaly: false, confidenceScore: 0, anomalyType: 'none', explanation: '', recommendedAction: '' };
      }

      const deviceFingerprint = this.generateDeviceFingerprint(userAgent);
      const isKnownDevice = pattern.typicalDevices.some(device => 
        this.calculateDeviceSimilarity(device, deviceFingerprint) > 0.8
      );

      return {
        isAnomaly: !isKnownDevice && pattern.typicalDevices.length > 2,
        confidenceScore: isKnownDevice ? 0 : 0.65,
        anomalyType: 'device',
        explanation: isKnownDevice ? '' : 'Login from unknown device',
        recommendedAction: isKnownDevice ? '' : 'Require device verification'
      };
    } catch (error) {
      logger.error('Error detecting device anomaly:', error);
      return { isAnomaly: false, confidenceScore: 0, anomalyType: 'none', explanation: '', recommendedAction: '' };
    }
  }

  private async checkIPReputation(ipAddress: string): Promise<{ isSuspicious: boolean; risk: string[] }> {
    // This would integrate with IP reputation services
    // For now, we'll implement basic checks
    const suspiciousPatterns = [
      /^10\./, // Private IP (suspicious if public service)
      /^192\.168\./, // Private IP
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // Private IP
    ];

    const risk: string[] = [];

    // Check for private IPs in public context
    if (suspiciousPatterns.some(pattern => pattern.test(ipAddress))) {
      risk.push('private_ip_range');
    }

    // Check Redis cache for known bad IPs
    const isBlacklisted = await redisClient?.sismember('blacklisted_ips', ipAddress);
    if (isBlacklisted) {
      risk.push('blacklisted_ip');
    }

    return {
      isSuspicious: risk.length > 0,
      risk
    };
  }

  private async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in audit log as security event
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: `SECURITY_${event.type}`,
          entity: 'security',
          entityId: event.sessionId || 'system',
          metadata: {
            type: event.type,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            payload: event.payload,
            severity: event.severity,
            timestamp: event.timestamp,
            ...event.metadata
          } as any,
          ipAddress: event.ipAddress || 'unknown',
          userAgent: event.userAgent || 'unknown'
        }
      });

      // Emit for real-time processing
      this.emit('security_event', event);

      logger.warn(`Security event recorded: ${event.type} (${event.severity})`);
    } catch (error) {
      logger.error('Error recording security event:', error);
    }
  }

  private calculateSeverityFromRisk(riskScore: number): SecuritySeverity {
    if (riskScore >= 80) return SecuritySeverity.CRITICAL;
    if (riskScore >= 60) return SecuritySeverity.HIGH;
    if (riskScore >= 40) return SecuritySeverity.MEDIUM;
    return SecuritySeverity.LOW;
  }

  private calculateRiskLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'very_low';
  }

  private generateAnomalyExplanation(anomalies: string[]): string {
    if (anomalies.length === 0) return 'No anomalies detected';
    
    const explanations = {
      brute_force: 'Multiple failed login attempts detected',
      geographic_anomaly: 'Login from unusual geographic location',
      time_anomaly: 'Login at unusual time',
      device_anomaly: 'Login from unknown device',
      suspicious_ip: 'Login from suspicious IP address'
    };

    return anomalies.map(anomaly => explanations[anomaly as keyof typeof explanations] || anomaly).join('; ');
  }

  private getRecommendedAction(riskScore: number, anomalies: string[]): string {
    if (riskScore >= 80) return 'Block access and require manual verification';
    if (riskScore >= 60) return 'Require additional authentication';
    if (riskScore >= 40) return 'Monitor closely and log detailed activity';
    return 'Continue monitoring';
  }

  private getScrapingRecommendedAction(riskScore: number): string {
    if (riskScore >= 80) return 'Block IP immediately';
    if (riskScore >= 60) return 'Apply aggressive rate limiting';
    if (riskScore >= 40) return 'Implement CAPTCHA challenges';
    return 'Monitor request patterns';
  }

  // Additional helper methods would continue here...
  private async getRecentLoginFailures(ipAddress: string, timeWindowMs: number): Promise<number> {
    const since = new Date(Date.now() - timeWindowMs);
    const count = await prisma.securityEvent.count({
      where: {
        type: SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS,
        ipAddress,
        timestamp: { gte: since }
      }
    });
    return count;
  }

  private async recordLoginPattern(userId: string, ipAddress: string, userAgent: string, metadata?: Record<string, any>): Promise<void> {
    // Implementation would record successful login patterns for ML learning
    const patternKey = `${this.patternCachePrefix}${userId}`;
    // This would be stored and analyzed over time
  }

  private async getLoginPattern(userId: string): Promise<LoginPattern | null> {
    // Implementation would retrieve learned login patterns
    return null; // Simplified for now
  }

  private calculateLocationSimilarity(loc1: string, loc2: string): number {
    // Simple string similarity - in production, use geographic distance
    return loc1.toLowerCase() === loc2.toLowerCase() ? 1 : 0;
  }

  private generateDeviceFingerprint(userAgent: string): string {
    return createHash('md5').update(userAgent).digest('hex');
  }

  private calculateDeviceSimilarity(device1: string, device2: string): number {
    return device1 === device2 ? 1 : 0;
  }

  private async analyzeBioSentiment(bio: string): Promise<{ isSuspicious: boolean; riskScore: number; confidence: number }> {
    // Simple keyword-based analysis - in production, use NLP sentiment analysis
    const suspiciousKeywords = ['scam', 'fake', 'bot', 'automated', 'quick money'];
    const foundSuspicious = suspiciousKeywords.some(keyword => bio.toLowerCase().includes(keyword));
    
    return {
      isSuspicious: foundSuspicious,
      riskScore: foundSuspicious ? 40 : 0,
      confidence: foundSuspicious ? 0.6 : 0
    };
  }

  private analyzeNamePattern(name: string): { isSuspicious: boolean } {
    // Check for obviously fake names
    const suspiciousPatterns = [
      /^[A-Za-z]{1,3}\d+$/, // Short name with numbers
      /^test/i,
      /^fake/i,
      /^\w{1,2}$/
    ];

    return {
      isSuspicious: suspiciousPatterns.some(pattern => pattern.test(name))
    };
  }

  private analyzeProfileConsistency(profileData: any): { inconsistencies: string[]; riskScore: number; confidence: number } {
    const inconsistencies: string[] = [];
    let riskScore = 0;

    // Check for obvious inconsistencies
    if (profileData.experience?.includes('10+ years') && profileData.skills?.length < 3) {
      inconsistencies.push('experience_skills_mismatch');
      riskScore += 25;
    }

    if (profileData.name && profileData.email && !profileData.email.toLowerCase().includes(profileData.name.toLowerCase().split(' ')[0])) {
      // Name and email don't match - could be suspicious
      inconsistencies.push('name_email_mismatch');
      riskScore += 15;
    }

    return {
      inconsistencies,
      riskScore,
      confidence: inconsistencies.length > 0 ? 0.5 : 0
    };
  }

  private async analyzeProfileImage(imageUrl: string): Promise<{ isSuspicious: boolean; confidence: number }> {
    // Basic URL pattern analysis - in production, use image recognition
    const stockPhotoPatterns = [
      /stock/i,
      /shutterstock/i,
      /getty/i,
      /unsplash/i
    ];

    const isSuspicious = stockPhotoPatterns.some(pattern => pattern.test(imageUrl));
    
    return {
      isSuspicious,
      confidence: isSuspicious ? 0.4 : 0
    };
  }

  // Risk assessment helper methods
  private async getRecentSecurityEvents(userId: string, timeWindowMs: number): Promise<SecurityEvent[]> {
    const since = new Date(Date.now() - timeWindowMs);
    const events = await prisma.auditLog.findMany({
      where: {
        userId,
        action: { startsWith: 'SECURITY_' },
        timestamp: { gte: since }
      }
    });

    return events.map((event: any) => ({
      id: event.id,
      type: (event.action?.replace('SECURITY_', '') || 'UNKNOWN') as SecurityEventType,
      userId: event.userId || undefined,
      sessionId: event.metadata?.sessionId || undefined,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      payload: event.payload as Record<string, any>,
      severity: event.severity as SecuritySeverity,
      timestamp: event.timestamp,
      metadata: event.metadata as Record<string, any> || undefined
    }));
  }

  private calculateEventRisk(events: SecurityEvent[]): { score: number; factors: RiskFactor[] } {
    const factors: RiskFactor[] = [];
    let score = 0;

    const criticalCount = events.filter(e => e.severity === SecuritySeverity.CRITICAL).length;
    const highCount = events.filter(e => e.severity === SecuritySeverity.HIGH).length;

    if (criticalCount > 0) {
      factors.push({
        type: 'critical_security_events',
        description: `${criticalCount} critical security events in past week`,
        weight: 0.4,
        value: criticalCount
      });
      score += criticalCount * 20;
    }

    if (highCount > 0) {
      factors.push({
        type: 'high_security_events',
        description: `${highCount} high severity security events in past week`,
        weight: 0.2,
        value: highCount
      });
      score += highCount * 10;
    }

    return { score, factors };
  }

  private async analyzeLoginPatternRisk(userId: string): Promise<{ score: number; factors: RiskFactor[] }> {
    // Simplified implementation
    return { score: 0, factors: [] };
  }

  private async analyzeProfileRisk(userId: string): Promise<{ score: number; factors: RiskFactor[] }> {
    // Simplified implementation
    return { score: 0, factors: [] };
  }

  private async analyzeBehavioralRisk(userId: string): Promise<{ score: number; factors: RiskFactor[] }> {
    // Simplified implementation
    return { score: 0, factors: [] };
  }

  private async analyzeNetworkRisk(userId: string): Promise<{ score: number; factors: RiskFactor[] }> {
    // Simplified implementation
    return { score: 0, factors: [] };
  }

  private generateRiskRecommendations(riskScore: number, factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 80) {
      recommendations.push('Require manual review before account activation');
      recommendations.push('Implement enhanced monitoring');
    }

    if (riskScore >= 60) {
      recommendations.push('Enable two-factor authentication');
      recommendations.push('Monitor all user activities');
    }

    if (factors.some(f => f.type.includes('security_events'))) {
      recommendations.push('Review recent security events');
    }

    return recommendations;
  }

  private analyzeEndpointPatterns(requests: any[]): { isSuspicious: boolean; riskScore: number; confidence: number } {
    // Analyze for systematic endpoint access patterns
    const endpoints = requests.map(r => r.endpoint);
    const uniqueEndpoints = new Set(endpoints);
    
    // Check for systematic access to user data endpoints
    const dataEndpoints = endpoints.filter(ep => ep.includes('/user/') || ep.includes('/profile/'));
    const dataAccessRatio = dataEndpoints.length / endpoints.length;
    
    return {
      isSuspicious: dataAccessRatio > 0.7 && uniqueEndpoints.size > 10,
      riskScore: dataAccessRatio > 0.7 ? 40 : 0,
      confidence: dataAccessRatio > 0.7 ? 0.7 : 0
    };
  }

  private detectSequentialAccess(requests: any[]): { isSequential: boolean } {
    // Check for sequential ID access patterns
    const userIdPattern = /\/user\/(\d+)/;
    const userIds: number[] = [];
    
    requests.forEach(req => {
      const match = req.endpoint.match(userIdPattern);
      if (match) {
        userIds.push(parseInt(match[1]));
      }
    });

    if (userIds.length < 5) return { isSequential: false };

    // Check if IDs are mostly sequential
    let sequentialCount = 0;
    for (let i = 1; i < userIds.length; i++) {
      if (userIds[i] === userIds[i-1] + 1) {
        sequentialCount++;
      }
    }

    return {
      isSequential: sequentialCount / (userIds.length - 1) > 0.7
    };
  }

  private async getRecentGlobalEvents(timeWindowMs: number): Promise<SecurityEvent[]> {
    const since = new Date(Date.now() - timeWindowMs);
    const events = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'SECURITY_' },
        timestamp: { gte: since }
      }
    });

    return events.map((event: any) => ({
      id: event.id,
      type: (event.action?.replace('SECURITY_', '') || 'UNKNOWN') as SecurityEventType,
      userId: event.userId || undefined,
      sessionId: event.metadata?.sessionId || undefined,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      payload: event.payload as Record<string, any>,
      severity: event.severity as SecuritySeverity,
      timestamp: event.timestamp,
      metadata: event.metadata as Record<string, any> || undefined
    }));
  }

  private async detectCoordinatedAttacks(events: SecurityEvent[]): Promise<any[]> {
    // Group events by IP and look for coordinated patterns
    const ipGroups = new Map<string, SecurityEvent[]>();
    
    events.forEach(event => {
      const ip = event.ipAddress;
      if (!ipGroups.has(ip)) {
        ipGroups.set(ip, []);
      }
      ipGroups.get(ip)!.push(event);
    });

    const coordinated: any[] = [];
    
    ipGroups.forEach((ipEvents, ip) => {
      if (ipEvents.length > 10) { // Threshold for coordinated attack
        const eventTypes = new Set(ipEvents.map(e => e.type));
        if (eventTypes.size > 3) { // Multiple attack vectors
          coordinated.push({
            attackerIP: ip,
            eventCount: ipEvents.length,
            eventTypes: Array.from(eventTypes),
            timespan: ipEvents[ipEvents.length - 1].timestamp.getTime() - ipEvents[0].timestamp.getTime()
          });
        }
      }
    });

    return coordinated;
  }

  private async detectTrafficAnomaly(events: SecurityEvent[]): Promise<AnomalyDetectionResult> {
    const eventsPerMinute = events.length / 5; // 5-minute window
    const isAnomaly = eventsPerMinute > 20; // Threshold
    
    return {
      isAnomaly,
      confidenceScore: isAnomaly ? 0.8 : 0,
      anomalyType: 'traffic_spike',
      explanation: isAnomaly ? `Unusual traffic spike: ${eventsPerMinute.toFixed(1)} events/min` : '',
      recommendedAction: isAnomaly ? 'Investigate traffic sources and apply rate limiting' : ''
    };
  }

  /**
   * Health check for security service
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const details = {
        threatPatternsLoaded: this.threatPatterns.size,
        monitoringActive: true,
        recentEvents: await this.getRecentGlobalEvents(60000) // Last minute
      };

      return {
        status: 'healthy',
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Singleton instance
export const securityIntelligenceService = new SecurityIntelligenceService();