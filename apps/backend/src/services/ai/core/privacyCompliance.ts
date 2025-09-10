import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { AIConfig } from './config';
import { 
  PrivacyCompliance, 
  DeletionRequest, 
  PrivacyAuditEntry,
  ExplainableAIResult 
} from '../types';

export class PrivacyComplianceService {
  private prisma: PrismaClient;
  private encryptionKey: string;
  private auditLog: PrivacyAuditEntry[] = [];

  constructor() {
    this.prisma = new PrismaClient();
    this.encryptionKey = process.env.PRIVACY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  async initializeUserPrivacyCompliance(userId: string): Promise<PrivacyCompliance> {
    const existing = await this.getUserPrivacyCompliance(userId);
    if (existing) return existing;

    const compliance: PrivacyCompliance = {
      userId,
      consents: {
        dataCollection: false,
        marketing: false,
        analytics: false,
        thirdPartySharing: false,
      },
      dataRetentionPolicy: 'standard',
      deletionRequests: [],
      auditLog: [],
    };

    await this.storePrivacyCompliance(compliance);
    
    await this.logAuditEntry({
      action: 'privacy_compliance_initialized',
      performedBy: 'system',
      timestamp: new Date(),
      details: `Privacy compliance record created for user ${userId}`,
    });

    return compliance;
  }

  async updateConsent(
    userId: string,
    consentType: keyof PrivacyCompliance['consents'],
    granted: boolean,
    performedBy: string = 'user'
  ): Promise<void> {
    const compliance = await this.getUserPrivacyCompliance(userId);
    if (!compliance) {
      throw new Error('Privacy compliance record not found');
    }

    const oldValue = compliance.consents[consentType];
    compliance.consents[consentType] = granted;

    await this.storePrivacyCompliance(compliance);

    await this.logAuditEntry({
      action: `consent_${granted ? 'granted' : 'revoked'}`,
      performedBy,
      timestamp: new Date(),
      details: `${consentType} consent changed from ${oldValue} to ${granted}`,
    });

    if (!granted) {
      await this.handleConsentRevocation(userId, consentType);
    }
  }

  private async handleConsentRevocation(
    userId: string,
    consentType: keyof PrivacyCompliance['consents']
  ): Promise<void> {
    switch (consentType) {
      case 'analytics':
        await this.stopAnalyticsTracking(userId);
        break;
      case 'marketing':
        await this.removeFromMarketingLists(userId);
        break;
      case 'thirdPartySharing':
        await this.removeThirdPartyDataSharing(userId);
        break;
      case 'dataCollection':
        await this.minimizeDataCollection(userId);
        break;
    }
  }

  async requestDataDeletion(
    userId: string,
    dataTypes: string[] = ['all'],
    performedBy: string = 'user'
  ): Promise<DeletionRequest> {
    const deletionRequest: DeletionRequest = {
      id: crypto.randomUUID(),
      requestedAt: new Date(),
      status: 'pending',
      dataTypes,
    };

    const compliance = await this.getUserPrivacyCompliance(userId);
    if (compliance) {
      compliance.deletionRequests.push(deletionRequest);
      await this.storePrivacyCompliance(compliance);
    }

    await this.logAuditEntry({
      action: 'data_deletion_requested',
      performedBy,
      timestamp: new Date(),
      details: `Data deletion requested for types: ${dataTypes.join(', ')}`,
    });

    await this.scheduleDeletion(userId, deletionRequest);

    return deletionRequest;
  }

  private async scheduleDeletion(userId: string, request: DeletionRequest): Promise<void> {
    if (AIConfig.privacy.compliance.deleteGracePeriodDays > 0) {
      const executeAt = new Date();
      executeAt.setDate(executeAt.getDate() + AIConfig.privacy.compliance.deleteGracePeriodDays);

      await this.prisma.$executeRaw`
        INSERT INTO scheduled_deletions (
          user_id, request_id, execute_at, data_types
        ) VALUES (
          ${userId}, ${request.id}, ${executeAt}, ${JSON.stringify(request.dataTypes)}
        )
      `;
    } else {
      await this.executeDeletion(userId, request);
    }
  }

  async executeDeletion(userId: string, request: DeletionRequest): Promise<void> {
    try {
      request.status = 'processing';
      await this.updateDeletionRequest(userId, request);

      for (const dataType of request.dataTypes) {
        await this.deleteDataType(userId, dataType);
      }

      request.status = 'completed';
      request.completedAt = new Date();
      await this.updateDeletionRequest(userId, request);

      await this.logAuditEntry({
        action: 'data_deletion_completed',
        performedBy: 'system',
        timestamp: new Date(),
        details: `Data deletion completed for types: ${request.dataTypes.join(', ')}`,
      });
    } catch (error) {
      request.status = 'failed';
      await this.updateDeletionRequest(userId, request);

      await this.logAuditEntry({
        action: 'data_deletion_failed',
        performedBy: 'system',
        timestamp: new Date(),
        details: `Data deletion failed: ${(error as Error).message}`,
      });

      throw error;
    }
  }

  private async deleteDataType(userId: string, dataType: string): Promise<void> {
    switch (dataType) {
      case 'all':
        await this.deleteAllUserData(userId);
        break;
      case 'profile':
        await this.deleteProfileData(userId);
        break;
      case 'behavior':
        await this.deleteBehaviorData(userId);
        break;
      case 'analytics':
        await this.deleteAnalyticsData(userId);
        break;
      case 'communications':
        await this.deleteCommunicationData(userId);
        break;
      default:
        console.warn(`Unknown data type for deletion: ${dataType}`);
    }
  }

  private async deleteAllUserData(userId: string): Promise<void> {
    const tables = [
      'user_behavior_events',
      'user_profiles',
      'notification_history',
      'user_sessions',
      'profile_analyses',
      'support_tickets',
    ];

    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE user_id = ?`, userId);
    }

    await this.prisma.$executeRaw`
      UPDATE users SET 
        email = 'deleted_' || id,
        name = 'Deleted User',
        phone = NULL,
        deleted_at = ${new Date()}
      WHERE id = ${userId}
    `;
  }

  private async deleteProfileData(userId: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM user_profiles WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM experiences WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM user_skills WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM portfolio_items WHERE user_id = ${userId}`;
  }

  private async deleteBehaviorData(userId: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM user_behavior_events WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM user_sessions WHERE user_id = ${userId}`;
  }

  private async deleteAnalyticsData(userId: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM user_analytics WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM engagement_metrics WHERE user_id = ${userId}`;
  }

  private async deleteCommunicationData(userId: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM notification_history WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM email_logs WHERE user_id = ${userId}`;
    await this.prisma.$executeRaw`DELETE FROM sms_logs WHERE user_id = ${userId}`;
  }

  async anonymizeUserData(userId: string): Promise<void> {
    if (!AIConfig.privacy.anonymization.enabled) {
      console.log('Data anonymization is disabled');
      return;
    }

    const technique = AIConfig.privacy.anonymization.technique;
    
    switch (technique) {
      case 'k_anonymity':
        await this.applyKAnonymity(userId);
        break;
      case 'differential_privacy':
        await this.applyDifferentialPrivacy(userId);
        break;
      case 'pseudonymization':
        await this.applyPseudonymization(userId);
        break;
      default:
        await this.applyBasicAnonymization(userId);
    }

    await this.logAuditEntry({
      action: 'data_anonymized',
      performedBy: 'system',
      timestamp: new Date(),
      details: `User data anonymized using ${technique}`,
    });
  }

  private async applyKAnonymity(userId: string): Promise<void> {
    const kValue = AIConfig.privacy.anonymization.kValue;
    
    await this.prisma.$executeRaw`
      UPDATE user_behavior_events SET
        metadata = jsonb_set(
          metadata,
          '{ipAddress}',
          '"anonymized"'
        )
      WHERE user_id = ${userId}
    `;

    const user = await this.prisma.$queryRaw<any[]>`
      SELECT location, age, industry FROM user_profiles
      WHERE user_id = ${userId}
    `;

    if (user[0]) {
      const generalizedData = this.generalizeData(user[0], kValue);
      await this.prisma.$executeRaw`
        UPDATE user_profiles SET
          location = ${generalizedData.location},
          age_range = ${generalizedData.ageRange},
          industry_category = ${generalizedData.industryCategory}
        WHERE user_id = ${userId}
      `;
    }
  }

  private generalizeData(data: any, k: number): any {
    return {
      location: this.generalizeLocation(data.location),
      ageRange: this.generalizeAge(data.age),
      industryCategory: this.generalizeIndustry(data.industry),
    };
  }

  private generalizeLocation(location: string): string {
    if (!location) return 'Unknown';
    
    const parts = location.split(',');
    if (parts.length > 2) {
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }
    return location;
  }

  private generalizeAge(age: number): string {
    if (!age) return 'Unknown';
    
    const ageRanges = [
      { min: 18, max: 25, label: '18-25' },
      { min: 26, max: 35, label: '26-35' },
      { min: 36, max: 45, label: '36-45' },
      { min: 46, max: 55, label: '46-55' },
      { min: 56, max: 99, label: '55+' },
    ];
    
    const range = ageRanges.find(r => age >= r.min && age <= r.max);
    return range?.label || 'Unknown';
  }

  private generalizeIndustry(industry: string): string {
    const categories: Record<string, string> = {
      'Film & TV': 'Entertainment',
      'Theater': 'Entertainment',
      'Music': 'Entertainment',
      'OTT': 'Entertainment',
      'Advertising': 'Marketing & Advertising',
      'Fashion': 'Creative Arts',
      'Photography': 'Creative Arts',
    };
    
    return categories[industry] || 'Other';
  }

  private async applyDifferentialPrivacy(userId: string): Promise<void> {
    const epsilon = 0.1;
    
    const numericFields = ['age', 'experience_years', 'hourly_rate'];
    
    for (const field of numericFields) {
      await this.addNoise(userId, field, epsilon);
    }
  }

  private async addNoise(userId: string, field: string, epsilon: number): Promise<void> {
    const sensitivity = 1;
    const scale = sensitivity / epsilon;
    const noise = this.generateLaplaceNoise(scale);
    
    await this.prisma.$executeRawUnsafe(`
      UPDATE user_profiles 
      SET ${field} = GREATEST(0, ${field} + ?) 
      WHERE user_id = ?
    `, noise, userId);
  }

  private generateLaplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private async applyPseudonymization(userId: string): Promise<void> {
    const pseudoId = crypto.createHash('sha256').update(userId + this.encryptionKey).digest('hex');
    
    await this.prisma.$executeRaw`
      UPDATE user_behavior_events SET
        user_id = ${pseudoId}
      WHERE user_id = ${userId}
    `;
  }

  private async applyBasicAnonymization(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE user_profiles SET
        email = 'anonymous@example.com',
        phone = NULL,
        name = 'Anonymous User'
      WHERE user_id = ${userId}
    `;
  }

  async encryptSensitiveData(userId: string, data: any): Promise<string> {
    const algorithm = AIConfig.privacy.encryption.algorithm;
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  async decryptSensitiveData(encryptedData: string): Promise<any> {
    const algorithm = AIConfig.privacy.encryption.algorithm;
    const key = Buffer.from(this.encryptionKey, 'hex');
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  async validateDataAccess(userId: string, requester: string, purpose: string): Promise<boolean> {
    const compliance = await this.getUserPrivacyCompliance(userId);
    if (!compliance) return false;

    const hasConsent = this.checkConsentForPurpose(compliance, purpose);
    
    await this.logAuditEntry({
      action: 'data_access_requested',
      performedBy: requester,
      timestamp: new Date(),
      details: `Data access ${hasConsent ? 'granted' : 'denied'} for purpose: ${purpose}`,
    });

    return hasConsent;
  }

  private checkConsentForPurpose(compliance: PrivacyCompliance, purpose: string): boolean {
    const purposeMapping: Record<string, keyof PrivacyCompliance['consents']> = {
      analytics: 'analytics',
      marketing: 'marketing',
      profiling: 'dataCollection',
      sharing: 'thirdPartySharing',
    };

    const consentType = purposeMapping[purpose];
    return consentType ? compliance.consents[consentType] : false;
  }

  async generatePrivacyReport(userId: string): Promise<any> {
    const compliance = await this.getUserPrivacyCompliance(userId);
    const dataInventory = await this.getDataInventory(userId);
    const processingActivities = await this.getProcessingActivities(userId);
    
    return {
      userId,
      compliance,
      dataInventory,
      processingActivities,
      riskAssessment: await this.assessPrivacyRisk(userId),
      recommendations: await this.generatePrivacyRecommendations(compliance),
      generatedAt: new Date(),
    };
  }

  private async getDataInventory(userId: string): Promise<any> {
    const inventory: Record<string, any> = {};
    
    const tables = [
      'users', 'user_profiles', 'user_behavior_events',
      'notification_history', 'user_sessions'
    ];
    
    for (const table of tables) {
      const count = await this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM ${table} WHERE user_id = ?
      `, userId);
      
      inventory[table] = (count as any)[0]?.count || 0;
    }
    
    return inventory;
  }

  private async getProcessingActivities(userId: string): Promise<string[]> {
    const activities: string[] = [];
    
    const recentEvents = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT event_type
      FROM user_behavior_events
      WHERE user_id = ${userId}
      AND timestamp >= NOW() - INTERVAL '30 days'
    `;
    
    activities.push(...recentEvents.map(e => e.event_type));
    
    return activities;
  }

  private async assessPrivacyRisk(userId: string): Promise<any> {
    let riskScore = 0;
    const risks: string[] = [];
    
    const compliance = await this.getUserPrivacyCompliance(userId);
    
    if (!compliance?.consents.dataCollection) {
      riskScore += 0.3;
      risks.push('Data collection without explicit consent');
    }
    
    const sensitiveDataCount = await this.countSensitiveData(userId);
    if (sensitiveDataCount > 100) {
      riskScore += 0.2;
      risks.push('Large amount of sensitive data stored');
    }
    
    const dataAge = await this.getDataAge(userId);
    if (dataAge > 365) {
      riskScore += 0.1;
      risks.push('Old data beyond typical retention period');
    }
    
    return {
      score: Math.min(riskScore, 1),
      level: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      risks,
    };
  }

  private async countSensitiveData(userId: string): Promise<number> {
    const counts = await this.prisma.$queryRaw<any[]>`
      SELECT 
        (SELECT COUNT(*) FROM user_behavior_events WHERE user_id = ${userId}) +
        (SELECT COUNT(*) FROM user_sessions WHERE user_id = ${userId}) +
        (SELECT COUNT(*) FROM notification_history WHERE user_id = ${userId}) as total
    `;
    
    return counts[0]?.total || 0;
  }

  private async getDataAge(userId: string): Promise<number> {
    const oldest = await this.prisma.$queryRaw<any[]>`
      SELECT MIN(created_at) as oldest
      FROM users
      WHERE id = ${userId}
    `;
    
    if (!oldest[0]?.oldest) return 0;
    
    const ageMs = Date.now() - new Date(oldest[0].oldest).getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  }

  private async generatePrivacyRecommendations(compliance: PrivacyCompliance | null): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (!compliance) {
      recommendations.push('Initialize privacy compliance tracking');
      return recommendations;
    }
    
    if (!compliance.consents.dataCollection) {
      recommendations.push('Obtain explicit consent for data collection');
    }
    
    if (!compliance.consents.analytics) {
      recommendations.push('Request consent for analytics tracking');
    }
    
    if (compliance.deletionRequests.length === 0) {
      recommendations.push('Consider implementing proactive data cleanup');
    }
    
    return recommendations;
  }

  private async stopAnalyticsTracking(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE users SET analytics_enabled = false
      WHERE id = ${userId}
    `;
  }

  private async removeFromMarketingLists(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM marketing_subscriptions
      WHERE user_id = ${userId}
    `;
  }

  private async removeThirdPartyDataSharing(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE users SET third_party_sharing = false
      WHERE id = ${userId}
    `;
  }

  private async minimizeDataCollection(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE users SET data_collection_minimal = true
      WHERE id = ${userId}
    `;
  }

  private async getUserPrivacyCompliance(userId: string): Promise<PrivacyCompliance | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM privacy_compliance
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    
    return result[0] || null;
  }

  private async storePrivacyCompliance(compliance: PrivacyCompliance): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO privacy_compliance (
        user_id, consents, data_retention_policy,
        deletion_requests, audit_log
      ) VALUES (
        ${compliance.userId}, ${JSON.stringify(compliance.consents)},
        ${compliance.dataRetentionPolicy}, ${JSON.stringify(compliance.deletionRequests)},
        ${JSON.stringify(compliance.auditLog)}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        consents = ${JSON.stringify(compliance.consents)},
        data_retention_policy = ${compliance.dataRetentionPolicy},
        deletion_requests = ${JSON.stringify(compliance.deletionRequests)},
        audit_log = ${JSON.stringify(compliance.auditLog)},
        updated_at = ${new Date()}
    `;
  }

  private async updateDeletionRequest(userId: string, request: DeletionRequest): Promise<void> {
    const compliance = await this.getUserPrivacyCompliance(userId);
    if (!compliance) return;

    const index = compliance.deletionRequests.findIndex(r => r.id === request.id);
    if (index !== -1) {
      compliance.deletionRequests[index] = request;
      await this.storePrivacyCompliance(compliance);
    }
  }

  private async logAuditEntry(entry: PrivacyAuditEntry): Promise<void> {
    this.auditLog.push(entry);
    
    await this.prisma.$executeRaw`
      INSERT INTO privacy_audit_log (
        action, performed_by, timestamp, details, ip_address
      ) VALUES (
        ${entry.action}, ${entry.performedBy}, ${entry.timestamp},
        ${entry.details}, ${entry.ipAddress}
      )
    `;
  }

  async cleanup(): Promise<void> {
    this.auditLog = [];
    await this.prisma.$disconnect();
  }
}