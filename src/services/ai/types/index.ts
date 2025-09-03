export interface UserBehaviorEvent {
  userId: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    platform?: string;
    screenResolution?: string;
    location?: {
      country?: string;
      city?: string;
      region?: string;
    };
  };
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface ProfileQualityScore {
  overallScore: number;
  completeness: number;
  richness: number;
  accuracy: number;
  recency: number;
  recommendations: ProfileRecommendation[];
}

export interface ProfileRecommendation {
  field: string;
  importance: 'high' | 'medium' | 'low';
  suggestion: string;
  impact: number;
}

export interface NotificationPreference {
  userId: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  categories: string[];
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'account_takeover' | 'suspicious_activity' | 'data_breach' | 'fraud';
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId?: string;
  ipAddress?: string;
  description: string;
  detectedAt: Date;
  resolved: boolean;
  actions: SecurityAction[];
}

export interface SecurityAction {
  type: 'block_ip' | 'lock_account' | 'require_2fa' | 'notify_user' | 'log_event';
  executedAt: Date;
  result: 'success' | 'failed' | 'pending';
  details?: string;
}

export interface PlatformMetrics {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  featureAdoption: Record<string, number>;
  performanceMetrics: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  businessMetrics: {
    totalRevenue: number;
    avgRevenuePerUser: number;
    conversionRate: number;
    churnRate: number;
  };
}

export interface UserJourney {
  userId: string;
  sessionId: string;
  steps: JourneyStep[];
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  goal?: string;
  conversionValue?: number;
}

export interface JourneyStep {
  stepNumber: number;
  action: string;
  page: string;
  timestamp: Date;
  duration: number;
  metadata?: Record<string, any>;
}

export interface ChurnPrediction {
  userId: string;
  churnProbability: number;
  riskLevel: 'high' | 'medium' | 'low';
  factors: ChurnFactor[];
  recommendedActions: string[];
  predictedChurnDate?: Date;
}

export interface ChurnFactor {
  name: string;
  impact: number;
  description: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface AnomalyDetection {
  id: string;
  type: 'behavioral' | 'statistical' | 'pattern';
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  timestamp: Date;
  context: Record<string, any>;
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  targetAudience: SegmentCriteria[];
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed';
  metrics: string[];
}

export interface ABTestVariant {
  id: string;
  name: string;
  allocation: number;
  config: Record<string, any>;
  results?: {
    conversions: number;
    impressions: number;
    conversionRate: number;
    confidence: number;
  };
}

export interface PrivacyCompliance {
  userId: string;
  consents: {
    dataCollection: boolean;
    marketing: boolean;
    analytics: boolean;
    thirdPartySharing: boolean;
  };
  dataRetentionPolicy: string;
  deletionRequests: DeletionRequest[];
  auditLog: PrivacyAuditEntry[];
}

export interface DeletionRequest {
  id: string;
  requestedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  dataTypes: string[];
}

export interface PrivacyAuditEntry {
  action: string;
  performedBy: string;
  timestamp: Date;
  details: string;
  ipAddress?: string;
}

export interface ExplainableAIResult {
  prediction: any;
  confidence: number;
  explanation: {
    features: FeatureImportance[];
    reasoning: string;
    alternativeOutcomes: AlternativeOutcome[];
  };
  metadata: {
    modelVersion: string;
    timestamp: Date;
    processingTime: number;
  };
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  contribution: 'positive' | 'negative' | 'neutral';
  value: any;
}

export interface AlternativeOutcome {
  outcome: any;
  probability: number;
  requiredChanges: string[];
}