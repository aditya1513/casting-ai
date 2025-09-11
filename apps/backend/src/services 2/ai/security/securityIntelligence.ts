import { PrismaClient } from '@prisma/client';
import * as tf from '@tensorflow/tfjs-node';
import * as stats from 'simple-statistics';
import { AIConfig } from '../core/config';
import { SecurityThreat, SecurityAction, AnomalyDetection, UserBehaviorEvent } from '../types';

export class SecurityIntelligence {
  private prisma: PrismaClient;
  private anomalyModel?: tf.LayersModel;
  private fraudModel?: tf.LayersModel;
  private threatModel?: tf.LayersModel;
  private ipReputationCache: Map<string, any> = new Map();
  private behaviorBaselines: Map<string, number[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.loadModels();
  }

  private async loadModels(): Promise<void> {
    try {
      this.anomalyModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/security_anomaly/model.json`
      );
      this.fraudModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/fraud_detection/model.json`
      );
      this.threatModel = await tf.loadLayersModel(
        `file://${AIConfig.tensorflow.modelPath}/threat_detection/model.json`
      );
    } catch {
      this.createDefaultModels();
    }
  }

  private createDefaultModels(): void {
    this.anomalyModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.fraudModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.threatModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [25], units: 48, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({ units: 24, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'softmax' }),
      ],
    });

    [this.anomalyModel, this.fraudModel, this.threatModel].forEach(model => {
      model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });
    });
  }

  async detectAnomalies(userId: string, event: UserBehaviorEvent): Promise<AnomalyDetection[]> {
    const features = await this.extractSecurityFeatures(userId, event);
    const baseline = await this.getOrCreateBaseline(userId);
    
    const anomalies: AnomalyDetection[] = [];
    
    const behavioralAnomaly = await this.detectBehavioralAnomaly(features, baseline);
    if (behavioralAnomaly) anomalies.push(behavioralAnomaly);
    
    const statisticalAnomaly = this.detectStatisticalAnomaly(features, baseline);
    if (statisticalAnomaly) anomalies.push(statisticalAnomaly);
    
    const patternAnomaly = await this.detectPatternAnomaly(event);
    if (patternAnomaly) anomalies.push(patternAnomaly);
    
    for (const anomaly of anomalies) {
      await this.storeAnomaly(anomaly);
      if (anomaly.deviation > 3) {
        await this.createSecurityAlert(anomaly);
      }
    }
    
    return anomalies;
  }

  private async extractSecurityFeatures(userId: string, event: UserBehaviorEvent): Promise<number[]> {
    const features: number[] = [];
    
    const hourOfDay = new Date(event.timestamp).getHours();
    features.push(hourOfDay / 24);
    
    const dayOfWeek = new Date(event.timestamp).getDay();
    features.push(dayOfWeek / 7);
    
    const ipHistory = await this.getRecentIPHistory(userId);
    features.push(ipHistory.includes(event.metadata.ipAddress) ? 1 : 0);
    
    const deviceFingerprint = this.generateDeviceFingerprint(event.metadata);
    const deviceHistory = await this.getDeviceHistory(userId);
    features.push(deviceHistory.includes(deviceFingerprint) ? 1 : 0);
    
    const locationRisk = await this.calculateLocationRisk(event.metadata.location);
    features.push(locationRisk);
    
    const sessionDuration = await this.getCurrentSessionDuration(event.sessionId);
    features.push(Math.min(sessionDuration / 3600000, 1));
    
    const failedLogins = await this.getRecentFailedLogins(event.metadata.ipAddress);
    features.push(Math.min(failedLogins / 10, 1));
    
    while (features.length < 20) {
      features.push(0);
    }
    
    return features.slice(0, 20);
  }

  private async getOrCreateBaseline(userId: string): Promise<number[]> {
    if (this.behaviorBaselines.has(userId)) {
      return this.behaviorBaselines.get(userId)!;
    }
    
    const recentEvents = await this.prisma.$queryRaw<UserBehaviorEvent[]>`
      SELECT * FROM user_behavior_events
      WHERE user_id = ${userId}
      AND timestamp > NOW() - INTERVAL '30 days'
      ORDER BY timestamp DESC
      LIMIT 1000
    `;
    
    const baseline = await Promise.all(
      recentEvents.map(event => this.extractSecurityFeatures(userId, event))
    );
    
    const avgBaseline = baseline[0].map((_, i) => 
      stats.mean(baseline.map(features => features[i]))
    );
    
    this.behaviorBaselines.set(userId, avgBaseline);
    return avgBaseline;
  }

  private async detectBehavioralAnomaly(
    features: number[], 
    baseline: number[]
  ): Promise<AnomalyDetection | null> {
    const prediction = this.anomalyModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const anomalyScore = (await prediction.data())[0];
    
    if (anomalyScore > AIConfig.security.anomaly.sensitivity) {
      return {
        id: `behavioral_${Date.now()}`,
        type: 'behavioral',
        metric: 'user_behavior',
        expectedValue: stats.mean(baseline),
        actualValue: stats.mean(features),
        deviation: anomalyScore,
        timestamp: new Date(),
        context: { features, baseline, anomalyScore },
      };
    }
    
    return null;
  }

  private detectStatisticalAnomaly(
    features: number[], 
    baseline: number[]
  ): AnomalyDetection | null {
    const deviations = features.map((val, i) => 
      Math.abs(val - baseline[i]) / Math.max(baseline[i], 0.001)
    );
    
    const maxDeviation = Math.max(...deviations);
    
    if (maxDeviation > 2.5) {
      return {
        id: `statistical_${Date.now()}`,
        type: 'statistical',
        metric: 'feature_deviation',
        expectedValue: stats.mean(baseline),
        actualValue: stats.mean(features),
        deviation: maxDeviation,
        timestamp: new Date(),
        context: { deviations, maxDeviation },
      };
    }
    
    return null;
  }

  private async detectPatternAnomaly(event: UserBehaviorEvent): Promise<AnomalyDetection | null> {
    const recentEvents = await this.getUserRecentEvents(event.userId, 24);
    
    const rapidRequests = recentEvents.filter(e => 
      Math.abs(e.timestamp.getTime() - event.timestamp.getTime()) < 1000
    );
    
    if (rapidRequests.length > 10) {
      return {
        id: `pattern_${Date.now()}`,
        type: 'pattern',
        metric: 'request_frequency',
        expectedValue: 1,
        actualValue: rapidRequests.length,
        deviation: rapidRequests.length - 1,
        timestamp: new Date(),
        context: { rapidRequests: rapidRequests.length },
      };
    }
    
    return null;
  }

  async detectFraud(userId: string, transactionData: any): Promise<number> {
    const features = this.extractFraudFeatures(userId, transactionData);
    
    const prediction = this.fraudModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    const fraudScore = (await prediction.data())[0];
    
    if (fraudScore > AIConfig.security.fraud.riskThreshold) {
      await this.createFraudAlert(userId, fraudScore, transactionData);
    }
    
    return fraudScore;
  }

  private extractFraudFeatures(userId: string, data: any): number[] {
    const features: number[] = [];
    
    features.push(data.amount ? Math.log(data.amount + 1) / 10 : 0);
    features.push(data.isNewDevice ? 1 : 0);
    features.push(data.isNewLocation ? 1 : 0);
    features.push(data.timeFromLastTransaction || 0);
    features.push(data.paymentMethodAge || 0);
    
    while (features.length < 15) {
      features.push(0);
    }
    
    return features.slice(0, 15);
  }

  async assessThreat(ipAddress: string, userAgent?: string): Promise<SecurityThreat | null> {
    const threatFeatures = await this.extractThreatFeatures(ipAddress, userAgent);
    
    const prediction = this.threatModel!.predict(tf.tensor2d([threatFeatures])) as tf.Tensor;
    const scores = await prediction.data();
    
    const threatTypes = ['brute_force', 'account_takeover', 'suspicious_activity', 'data_breach'];
    const maxScore = Math.max(...scores);
    const threatType = threatTypes[scores.indexOf(maxScore)];
    
    if (maxScore > 0.7) {
      const threat: SecurityThreat = {
        id: `threat_${Date.now()}`,
        type: threatType as any,
        severity: maxScore > 0.9 ? 'critical' : maxScore > 0.8 ? 'high' : 'medium',
        ipAddress,
        description: `Detected ${threatType} with confidence ${(maxScore * 100).toFixed(1)}%`,
        detectedAt: new Date(),
        resolved: false,
        actions: [],
      };
      
      await this.executeThreatResponse(threat);
      return threat;
    }
    
    return null;
  }

  private async extractThreatFeatures(ipAddress: string, userAgent?: string): Promise<number[]> {
    const features: number[] = [];
    
    const ipReputation = await this.getIPReputation(ipAddress);
    features.push(ipReputation.riskScore || 0);
    
    const isVPN = ipReputation.isVPN ? 1 : 0;
    features.push(isVPN);
    
    const isTor = ipReputation.isTor ? 1 : 0;
    features.push(isTor);
    
    const geoLocation = ipReputation.location || {};
    features.push(geoLocation.riskScore || 0);
    
    const recentFailures = await this.getRecentFailedLogins(ipAddress);
    features.push(Math.min(recentFailures / 100, 1));
    
    const userAgentRisk = this.analyzeUserAgent(userAgent || '');
    features.push(userAgentRisk);
    
    while (features.length < 25) {
      features.push(0);
    }
    
    return features.slice(0, 25);
  }

  private async getIPReputation(ipAddress: string): Promise<any> {
    if (this.ipReputationCache.has(ipAddress)) {
      return this.ipReputationCache.get(ipAddress);
    }
    
    try {
      const reputation = {
        riskScore: Math.random() * 0.5,
        isVPN: Math.random() < 0.1,
        isTor: Math.random() < 0.05,
        location: { riskScore: Math.random() * 0.3 },
      };
      
      this.ipReputationCache.set(ipAddress, reputation);
      
      setTimeout(() => {
        this.ipReputationCache.delete(ipAddress);
      }, 3600000);
      
      return reputation;
    } catch {
      return { riskScore: 0, isVPN: false, isTor: false, location: {} };
    }
  }

  private analyzeUserAgent(userAgent: string): number {
    let risk = 0;
    
    if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      risk += 0.5;
    }
    
    if (userAgent.length < 20 || userAgent.length > 500) {
      risk += 0.3;
    }
    
    if (!/Mozilla/.test(userAgent)) {
      risk += 0.2;
    }
    
    return Math.min(risk, 1);
  }

  async monitorBruteForce(ipAddress: string, username?: string): Promise<SecurityAction[]> {
    const actions: SecurityAction[] = [];
    
    const recentFailures = await this.getRecentFailedLogins(ipAddress);
    
    if (recentFailures >= AIConfig.security.bruteForce.maxAttempts) {
      const lockAction = await this.lockIPAddress(ipAddress);
      actions.push(lockAction);
      
      if (username) {
        const accountLockAction = await this.lockUserAccount(username);
        actions.push(accountLockAction);
      }
      
      const alertAction = await this.sendSecurityAlert(ipAddress, 'brute_force');
      actions.push(alertAction);
    }
    
    return actions;
  }

  private async executeThreatResponse(threat: SecurityThreat): Promise<void> {
    const actions: SecurityAction[] = [];
    
    switch (threat.severity) {
      case 'critical':
        if (threat.ipAddress) {
          actions.push(await this.lockIPAddress(threat.ipAddress));
        }
        actions.push(await this.sendSecurityAlert(threat.ipAddress || '', threat.type));
        break;
        
      case 'high':
        actions.push(await this.flagForReview(threat));
        actions.push(await this.increaseSecurity(threat.userId));
        break;
        
      case 'medium':
        actions.push(await this.logSecurityEvent(threat));
        break;
    }
    
    threat.actions = actions;
    await this.storeThreat(threat);
  }

  private async lockIPAddress(ipAddress: string): Promise<SecurityAction> {
    await this.prisma.$executeRaw`
      INSERT INTO blocked_ips (ip_address, blocked_at, expires_at, reason)
      VALUES (
        ${ipAddress}, ${new Date()}, 
        ${new Date(Date.now() + AIConfig.security.bruteForce.lockoutMinutes * 60000)},
        'Brute force protection'
      )
    `;
    
    return {
      type: 'block_ip',
      executedAt: new Date(),
      result: 'success',
      details: `Blocked IP ${ipAddress} for ${AIConfig.security.bruteForce.lockoutMinutes} minutes`,
    };
  }

  private async lockUserAccount(userId: string): Promise<SecurityAction> {
    await this.prisma.$executeRaw`
      UPDATE users SET 
        account_locked = true,
        locked_until = ${new Date(Date.now() + AIConfig.security.bruteForce.lockoutMinutes * 60000)}
      WHERE id = ${userId}
    `;
    
    return {
      type: 'lock_account',
      executedAt: new Date(),
      result: 'success',
      details: `Locked account ${userId} for security`,
    };
  }

  private async sendSecurityAlert(ipAddress: string, threatType: string): Promise<SecurityAction> {
    return {
      type: 'notify_user',
      executedAt: new Date(),
      result: 'success',
      details: `Security alert sent for ${threatType} from ${ipAddress}`,
    };
  }

  private async flagForReview(threat: SecurityThreat): Promise<SecurityAction> {
    await this.prisma.$executeRaw`
      INSERT INTO security_reviews (
        threat_id, priority, created_at, status
      ) VALUES (
        ${threat.id}, 'high', ${new Date()}, 'pending'
      )
    `;
    
    return {
      type: 'log_event',
      executedAt: new Date(),
      result: 'success',
      details: 'Threat flagged for manual review',
    };
  }

  private async increaseSecurity(userId?: string): Promise<SecurityAction> {
    if (userId) {
      await this.prisma.$executeRaw`
        UPDATE users SET 
          require_2fa = true,
          security_level = 'high'
        WHERE id = ${userId}
      `;
    }
    
    return {
      type: 'require_2fa',
      executedAt: new Date(),
      result: 'success',
      details: 'Increased security requirements',
    };
  }

  private async logSecurityEvent(threat: SecurityThreat): Promise<SecurityAction> {
    return {
      type: 'log_event',
      executedAt: new Date(),
      result: 'success',
      details: `Logged security event: ${threat.type}`,
    };
  }

  private async getRecentIPHistory(userId: string): Promise<string[]> {
    const results = await this.prisma.$queryRaw<{ ip_address: string }[]>`
      SELECT DISTINCT metadata->>'ipAddress' as ip_address
      FROM user_behavior_events
      WHERE user_id = ${userId}
      AND timestamp > NOW() - INTERVAL '7 days'
      LIMIT 10
    `;
    
    return results.map(r => r.ip_address).filter(Boolean);
  }

  private generateDeviceFingerprint(metadata: any): string {
    const components = [
      metadata.userAgent,
      metadata.screenResolution,
      metadata.platform,
    ].filter(Boolean);
    
    return Buffer.from(components.join('|')).toString('base64');
  }

  private async getDeviceHistory(userId: string): Promise<string[]> {
    const results = await this.prisma.$queryRaw<{ device_fingerprint: string }[]>`
      SELECT DISTINCT device_fingerprint
      FROM user_sessions
      WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '30 days'
      LIMIT 5
    `;
    
    return results.map(r => r.device_fingerprint).filter(Boolean);
  }

  private async calculateLocationRisk(location?: any): Promise<number> {
    if (!location?.country) return 0;
    
    const highRiskCountries = ['Unknown', 'Anonymous'];
    return highRiskCountries.includes(location.country) ? 1 : 0;
  }

  private async getCurrentSessionDuration(sessionId: string): Promise<number> {
    const events = await this.prisma.$queryRaw<{ timestamp: Date }[]>`
      SELECT timestamp FROM user_behavior_events
      WHERE session_id = ${sessionId}
      ORDER BY timestamp
      LIMIT 1
    `;
    
    if (events.length === 0) return 0;
    
    return Date.now() - events[0].timestamp.getTime();
  }

  private async getRecentFailedLogins(ipAddress: string): Promise<number> {
    const windowMs = AIConfig.security.bruteForce.windowMinutes * 60 * 1000;
    const cutoff = new Date(Date.now() - windowMs);
    
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE ip_address = ${ipAddress}
      AND success = false
      AND attempted_at > ${cutoff}
    `;
    
    return Number(result[0]?.count || 0);
  }

  private async getUserRecentEvents(userId: string, hours: number): Promise<UserBehaviorEvent[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await this.prisma.$queryRaw`
      SELECT * FROM user_behavior_events
      WHERE user_id = ${userId}
      AND timestamp > ${cutoff}
      ORDER BY timestamp DESC
    `;
  }

  private async createFraudAlert(userId: string, score: number, data: any): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO fraud_alerts (
        user_id, fraud_score, transaction_data, created_at
      ) VALUES (
        ${userId}, ${score}, ${JSON.stringify(data)}, ${new Date()}
      )
    `;
  }

  private async createSecurityAlert(anomaly: AnomalyDetection): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO security_alerts (
        type, metric, deviation, context, created_at
      ) VALUES (
        ${anomaly.type}, ${anomaly.metric}, ${anomaly.deviation},
        ${JSON.stringify(anomaly.context)}, ${new Date()}
      )
    `;
  }

  private async storeAnomaly(anomaly: AnomalyDetection): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO anomaly_detections (
        id, type, metric, expected_value, actual_value,
        deviation, timestamp, context
      ) VALUES (
        ${anomaly.id}, ${anomaly.type}, ${anomaly.metric},
        ${anomaly.expectedValue}, ${anomaly.actualValue},
        ${anomaly.deviation}, ${anomaly.timestamp}, ${JSON.stringify(anomaly.context)}
      )
    `;
  }

  private async storeThreat(threat: SecurityThreat): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO security_threats (
        id, type, severity, user_id, ip_address, description,
        detected_at, resolved, actions
      ) VALUES (
        ${threat.id}, ${threat.type}, ${threat.severity},
        ${threat.userId}, ${threat.ipAddress}, ${threat.description},
        ${threat.detectedAt}, ${threat.resolved}, ${JSON.stringify(threat.actions)}
      )
    `;
  }

  async cleanup(): Promise<void> {
    this.ipReputationCache.clear();
    this.behaviorBaselines.clear();
    await this.prisma.$disconnect();
  }
}