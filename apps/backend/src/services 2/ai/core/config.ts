import dotenv from 'dotenv';

dotenv.config();

export const AIConfig = {
  tensorflow: {
    backend: 'tensorflow',
    modelPath: process.env.AI_MODEL_PATH || './models',
  },
  
  analytics: {
    segmentWriteKey: process.env.SEGMENT_WRITE_KEY || '',
    mixpanelToken: process.env.MIXPANEL_TOKEN || '',
    posthogApiKey: process.env.POSTHOG_API_KEY || '',
    posthogHost: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    
    tracking: {
      enabled: process.env.ANALYTICS_ENABLED === 'true',
      debugMode: process.env.NODE_ENV === 'development',
      batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '100'),
      flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || '10000'),
    },
    
    retention: {
      rawDataDays: parseInt(process.env.RAW_DATA_RETENTION_DAYS || '90'),
      aggregatedDataDays: parseInt(process.env.AGGREGATED_DATA_RETENTION_DAYS || '365'),
      userDataDays: parseInt(process.env.USER_DATA_RETENTION_DAYS || '730'),
    },
  },
  
  ml: {
    churnPrediction: {
      modelType: 'neural_network',
      threshold: parseFloat(process.env.CHURN_THRESHOLD || '0.7'),
      retrainInterval: parseInt(process.env.RETRAIN_INTERVAL_DAYS || '30'),
      minDataPoints: parseInt(process.env.MIN_DATA_POINTS || '100'),
    },
    
    profileCompletion: {
      minScore: parseFloat(process.env.MIN_PROFILE_SCORE || '0.3'),
      weights: {
        completeness: 0.3,
        richness: 0.25,
        accuracy: 0.25,
        recency: 0.2,
      },
    },
    
    anomalyDetection: {
      sensitivity: parseFloat(process.env.ANOMALY_SENSITIVITY || '0.95'),
      windowSize: parseInt(process.env.ANOMALY_WINDOW_SIZE || '100'),
      method: process.env.ANOMALY_METHOD || 'isolation_forest',
    },
    
    recommendation: {
      algorithm: process.env.RECOMMENDATION_ALGORITHM || 'collaborative_filtering',
      minSimilarity: parseFloat(process.env.MIN_SIMILARITY || '0.6'),
      maxRecommendations: parseInt(process.env.MAX_RECOMMENDATIONS || '10'),
    },
  },
  
  security: {
    fraud: {
      enabled: process.env.FRAUD_DETECTION_ENABLED === 'true',
      riskThreshold: parseFloat(process.env.FRAUD_RISK_THRESHOLD || '0.8'),
      checkInterval: parseInt(process.env.FRAUD_CHECK_INTERVAL || '5000'),
    },
    
    bruteForce: {
      maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      windowMinutes: parseInt(process.env.LOGIN_WINDOW_MINUTES || '15'),
      lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES || '30'),
    },
    
    anomaly: {
      loginPatternCheck: process.env.LOGIN_PATTERN_CHECK === 'true',
      ipReputationCheck: process.env.IP_REPUTATION_CHECK === 'true',
      deviceFingerprintCheck: process.env.DEVICE_FINGERPRINT_CHECK === 'true',
    },
  },
  
  notifications: {
    intelligent: {
      enabled: process.env.INTELLIGENT_NOTIFICATIONS === 'true',
      batchingEnabled: process.env.NOTIFICATION_BATCHING === 'true',
      optimizeTiming: process.env.OPTIMIZE_NOTIFICATION_TIMING === 'true',
    },
    
    channels: {
      email: {
        provider: process.env.EMAIL_PROVIDER || 'sendgrid',
        fromEmail: process.env.FROM_EMAIL || 'noreply@castmatch.ai',
        fromName: process.env.FROM_NAME || 'CastMatch AI',
      },
      sms: {
        provider: process.env.SMS_PROVIDER || 'twilio',
        fromNumber: process.env.SMS_FROM_NUMBER || '',
      },
      push: {
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
        vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      },
    },
    
    timing: {
      defaultHour: parseInt(process.env.DEFAULT_NOTIFICATION_HOUR || '10'),
      timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
    },
  },
  
  privacy: {
    compliance: {
      gdprEnabled: process.env.GDPR_ENABLED === 'true',
      ccpaEnabled: process.env.CCPA_ENABLED === 'true',
      deleteGracePeriodDays: parseInt(process.env.DELETE_GRACE_PERIOD_DAYS || '30'),
    },
    
    anonymization: {
      enabled: process.env.ANONYMIZATION_ENABLED === 'true',
      technique: process.env.ANONYMIZATION_TECHNIQUE || 'k_anonymity',
      kValue: parseInt(process.env.K_ANONYMITY_VALUE || '5'),
    },
    
    encryption: {
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '90'),
    },
  },
  
  explainability: {
    enabled: process.env.EXPLAINABLE_AI_ENABLED === 'true',
    method: process.env.EXPLANATION_METHOD || 'shap',
    maxFeatures: parseInt(process.env.MAX_EXPLANATION_FEATURES || '10'),
    includeAlternatives: process.env.INCLUDE_ALTERNATIVES === 'true',
  },
  
  platform: {
    monitoring: {
      metricsInterval: parseInt(process.env.METRICS_INTERVAL_MS || '60000'),
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '30000'),
      alertThresholds: {
        errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'),
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD_MS || '1000'),
        cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD || '0.8'),
        memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '0.85'),
      },
    },
    
    optimization: {
      cacheEnabled: process.env.AI_CACHE_ENABLED === 'true',
      cacheTTL: parseInt(process.env.AI_CACHE_TTL_SECONDS || '3600'),
      batchProcessing: process.env.BATCH_PROCESSING_ENABLED === 'true',
      batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    },
  },
  
  abTesting: {
    enabled: process.env.AB_TESTING_ENABLED === 'true',
    defaultAllocation: parseFloat(process.env.DEFAULT_AB_ALLOCATION || '0.5'),
    minSampleSize: parseInt(process.env.MIN_SAMPLE_SIZE || '1000'),
    confidenceLevel: parseFloat(process.env.CONFIDENCE_LEVEL || '0.95'),
  },
};