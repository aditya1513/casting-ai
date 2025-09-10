/**
 * Production Rate Limiting Configuration for CastMatch
 * Handles Mumbai market scale with 1000+ requests/minute per user
 * 
 * Phase 3 Production Deployment Configuration
 */

import { RateLimitRule, RateLimitConfig } from '../../middleware/rate-limit-monitor';

/**
 * Production Rate Limit Rules for Mumbai Market Scale
 */
export const PRODUCTION_RATE_LIMIT_RULES: RateLimitRule[] = [
  // ============ USER TIER BASED LIMITS ============
  {
    id: 'tier-enterprise',
    name: 'Enterprise Tier (Production Agencies)',
    keyGenerator: (req) => `enterprise:${(req as any).user?.organizationId || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 5000, // 5000 req/min for enterprise
    adaptiveEnabled: true,
    burstAllowance: 500,
    headers: true,
    whitelist: (req) => (req as any).user?.tier === 'enterprise',
    priority: 10,
  },
  
  {
    id: 'tier-professional',
    name: 'Professional Tier (Casting Directors)',
    keyGenerator: (req) => `professional:${(req as any).user?.id || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // 1000 req/min as specified
    adaptiveEnabled: true,
    burstAllowance: 100,
    headers: true,
    whitelist: (req) => (req as any).user?.tier === 'professional',
    priority: 9,
  },
  
  {
    id: 'tier-standard',
    name: 'Standard Tier (Talent/Actors)',
    keyGenerator: (req) => `standard:${(req as any).user?.id || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 500, // 500 req/min for standard users
    adaptiveEnabled: true,
    burstAllowance: 50,
    headers: true,
    whitelist: (req) => (req as any).user?.tier === 'standard',
    priority: 8,
  },
  
  {
    id: 'tier-free',
    name: 'Free Tier (Trial Users)',
    keyGenerator: (req) => `free:${(req as any).user?.id || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 req/min for free tier
    adaptiveEnabled: true,
    burstAllowance: 10,
    headers: true,
    priority: 7,
  },

  // ============ ENDPOINT SPECIFIC LIMITS ============
  {
    id: 'api-search',
    name: 'Search API (Heavy Operations)',
    keyGenerator: (req) => `search:${(req as any).user?.id || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    adaptiveEnabled: true,
    headers: true,
    message: 'Search rate limit exceeded. Please refine your search criteria.',
    priority: 15,
  },
  
  {
    id: 'api-ai-chat',
    name: 'AI Chat Endpoints',
    keyGenerator: (req) => `ai-chat:${(req as any).user?.id || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 50, // 50 AI interactions per minute
    adaptiveEnabled: true,
    headers: true,
    message: 'AI service rate limit reached. Please wait before sending more messages.',
    priority: 14,
  },
  
  {
    id: 'api-media-upload',
    name: 'Media Upload Endpoints',
    keyGenerator: (req) => `media:${(req as any).user?.id || req.ip}`,
    windowMs: 300000, // 5 minutes
    maxRequests: 20, // 20 uploads per 5 minutes
    headers: true,
    message: 'Upload limit reached. Please wait before uploading more files.',
    priority: 13,
  },
  
  {
    id: 'api-export',
    name: 'Data Export Endpoints',
    keyGenerator: (req) => `export:${(req as any).user?.id || req.ip}`,
    windowMs: 3600000, // 1 hour
    maxRequests: 10, // 10 exports per hour
    headers: true,
    message: 'Export limit reached. Please try again later.',
    priority: 12,
  },

  // ============ THIRD-PARTY API LIMITS ============
  {
    id: 'third-party-google',
    name: 'Google Calendar API',
    keyGenerator: (req) => `google:${(req as any).user?.organizationId || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 100, // Google's quota
    skipSuccessfulRequests: false,
    headers: true,
    message: 'Google API quota reached. Syncing will resume shortly.',
    priority: 20,
  },
  
  {
    id: 'third-party-zoom',
    name: 'Zoom API Integration',
    keyGenerator: (req) => `zoom:${(req as any).user?.organizationId || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 60, // Zoom's rate limit
    headers: true,
    message: 'Zoom API limit reached. Please wait before scheduling more meetings.',
    priority: 20,
  },
  
  {
    id: 'third-party-whatsapp',
    name: 'WhatsApp Business API',
    keyGenerator: (req) => `whatsapp:${(req as any).user?.organizationId || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 80, // WhatsApp's limit
    headers: true,
    message: 'WhatsApp messaging limit reached.',
    priority: 20,
  },
  
  {
    id: 'third-party-sms',
    name: 'SMS Gateway (Twilio/MSG91)',
    keyGenerator: (req) => `sms:${(req as any).user?.organizationId || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 100, // SMS provider limit
    headers: true,
    message: 'SMS sending limit reached.',
    priority: 20,
  },

  // ============ AUTHENTICATION & SECURITY ============
  {
    id: 'auth-login',
    name: 'Login Attempts',
    keyGenerator: (req) => `login:${req.ip}:${req.body?.email || 'unknown'}`,
    windowMs: 900000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true,
    headers: false,
    message: 'Too many login attempts. Account temporarily locked.',
    onLimitReached: async (req, info) => {
      // Trigger security alert
      console.log('Security Alert: Multiple failed login attempts', {
        ip: req.ip,
        email: req.body?.email,
        timestamp: new Date(),
      });
    },
    priority: 100,
  },
  
  {
    id: 'auth-password-reset',
    name: 'Password Reset Requests',
    keyGenerator: (req) => `password-reset:${req.ip}:${req.body?.email || 'unknown'}`,
    windowMs: 3600000, // 1 hour
    maxRequests: 3, // 3 password reset attempts per hour
    headers: false,
    message: 'Too many password reset requests. Please contact support.',
    priority: 99,
  },
  
  {
    id: 'auth-otp',
    name: 'OTP Verification',
    keyGenerator: (req) => `otp:${req.ip}:${req.body?.phone || req.body?.email || 'unknown'}`,
    windowMs: 300000, // 5 minutes
    maxRequests: 5, // 5 OTP attempts per 5 minutes
    headers: false,
    message: 'Too many OTP attempts. Please request a new code.',
    priority: 98,
  },

  // ============ WEBHOOK ENDPOINTS ============
  {
    id: 'webhook-stripe',
    name: 'Stripe Webhooks',
    keyGenerator: (req) => `webhook:stripe:${req.get('Stripe-Signature')?.substring(0, 10) || 'unknown'}`,
    windowMs: 60000, // 1 minute
    maxRequests: 100, // Stripe webhook frequency
    skipFailedRequests: true,
    priority: 50,
  },
  
  {
    id: 'webhook-calendar',
    name: 'Calendar Sync Webhooks',
    keyGenerator: (req) => `webhook:calendar:${req.get('X-Calendar-Provider') || req.ip}`,
    windowMs: 60000, // 1 minute
    maxRequests: 200, // Calendar sync frequency
    skipFailedRequests: true,
    priority: 50,
  },

  // ============ DDoS PROTECTION ============
  {
    id: 'ddos-protection',
    name: 'DDoS Protection Layer',
    keyGenerator: (req) => `ddos:${req.ip}`,
    windowMs: 1000, // 1 second
    maxRequests: 50, // 50 requests per second max
    headers: false,
    message: 'Request rate too high. Please slow down.',
    onLimitReached: async (req, info) => {
      // Log potential DDoS attack
      console.error('Potential DDoS detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
      });
    },
    priority: 1000,
  },
  
  {
    id: 'ip-global',
    name: 'Global IP Rate Limit',
    keyGenerator: (req) => req.ip || 'unknown',
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute per IP
    adaptiveEnabled: true,
    headers: true,
    priority: 1,
  },
];

/**
 * Production Redis Configuration for Distributed Rate Limiting
 */
export const PRODUCTION_REDIS_CONFIG = {
  // Redis Cluster Configuration for High Availability
  cluster: {
    nodes: [
      { host: process.env.REDIS_NODE_1 || 'redis-1', port: 6379 },
      { host: process.env.REDIS_NODE_2 || 'redis-2', port: 6379 },
      { host: process.env.REDIS_NODE_3 || 'redis-3', port: 6379 },
    ],
    options: {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      slotsRefreshTimeout: 10000,
      clusterRetryStrategy: (times: number) => {
        if (times > 10) return null;
        return Math.min(times * 100, 2000);
      },
    },
  },
  
  // Single Instance Configuration (fallback)
  single: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'castmatch:ratelimit:',
    enableOfflineQueue: true,
    connectTimeout: 20000,
    commandTimeout: 5000,
    retryStrategy: (times: number) => {
      if (times > 10) return null;
      return Math.min(times * 50, 2000);
    },
  },
};

/**
 * Production Rate Limit Configuration
 */
export const PRODUCTION_RATE_LIMIT_CONFIG: RateLimitConfig = {
  rules: PRODUCTION_RATE_LIMIT_RULES,
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'castmatch:ratelimit:prod:',
  },
  
  monitoring: {
    enabled: true,
    metricsInterval: 30000, // 30 seconds for production metrics
    alertThreshold: 0.75, // Alert at 75% usage
    retentionDays: 30, // Keep metrics for 30 days
  },
  
  adaptive: {
    enabled: true,
    errorThreshold: 0.05, // 5% error rate threshold
    adjustmentFactor: 0.15, // 15% adjustment per cycle
    minLimit: 10, // Never go below 10 requests
    maxLimit: 10000, // Never exceed 10000 requests
  },
};

/**
 * Graceful Degradation Strategies
 */
export const DEGRADATION_STRATEGIES = {
  // Service degradation levels
  levels: {
    NORMAL: 'normal',
    DEGRADED: 'degraded',
    CRITICAL: 'critical',
    EMERGENCY: 'emergency',
  },
  
  // Feature toggles for degradation
  features: {
    normal: {
      aiChat: true,
      mediaUpload: true,
      export: true,
      search: true,
      realTimeSync: true,
      webhooks: true,
      notifications: true,
    },
    degraded: {
      aiChat: true,
      mediaUpload: true,
      export: false, // Disable exports
      search: true,
      realTimeSync: false, // Disable real-time sync
      webhooks: true,
      notifications: true,
    },
    critical: {
      aiChat: false, // Disable AI
      mediaUpload: false, // Disable uploads
      export: false,
      search: true, // Keep search
      realTimeSync: false,
      webhooks: false, // Disable webhooks
      notifications: false, // Disable notifications
    },
    emergency: {
      aiChat: false,
      mediaUpload: false,
      export: false,
      search: false, // Only basic operations
      realTimeSync: false,
      webhooks: false,
      notifications: false,
    },
  },
  
  // Thresholds for automatic degradation
  thresholds: {
    degraded: {
      errorRate: 0.1, // 10% error rate
      responseTime: 2000, // 2 second response time
      cpuUsage: 0.7, // 70% CPU usage
      memoryUsage: 0.8, // 80% memory usage
    },
    critical: {
      errorRate: 0.25, // 25% error rate
      responseTime: 5000, // 5 second response time
      cpuUsage: 0.85, // 85% CPU usage
      memoryUsage: 0.9, // 90% memory usage
    },
    emergency: {
      errorRate: 0.5, // 50% error rate
      responseTime: 10000, // 10 second response time
      cpuUsage: 0.95, // 95% CPU usage
      memoryUsage: 0.95, // 95% memory usage
    },
  },
};

/**
 * Mumbai Market Specific Configuration
 */
export const MUMBAI_MARKET_CONFIG = {
  // Peak hours in IST (Indian Standard Time)
  peakHours: {
    start: 10, // 10 AM IST
    end: 20, // 8 PM IST
    timezone: 'Asia/Kolkata',
  },
  
  // Dynamic rate adjustments for peak hours
  peakHourMultipliers: {
    enterprise: 1.5, // 50% more during peak
    professional: 1.2, // 20% more during peak
    standard: 1.0, // No change
    free: 0.8, // 20% less during peak
  },
  
  // Regional CDN endpoints
  cdnEndpoints: [
    'https://cdn-mumbai.castmatch.ai',
    'https://cdn-delhi.castmatch.ai',
    'https://cdn-bangalore.castmatch.ai',
  ],
  
  // Language preferences for rate limit messages
  languages: {
    en: 'English',
    hi: 'हिंदी',
    mr: 'मराठी',
  },
};

/**
 * Get rate limit message in user's preferred language
 */
export function getLocalizedRateLimitMessage(
  messageKey: string,
  language: string = 'en',
  params?: Record<string, any>
): string {
  const messages = {
    en: {
      tooManyRequests: 'Too many requests. Please try again after {retryAfter} seconds.',
      quotaExceeded: 'Your usage quota has been exceeded. Please upgrade your plan.',
      serviceUnavailable: 'Service temporarily unavailable due to high demand.',
    },
    hi: {
      tooManyRequests: 'बहुत सारे अनुरोध। कृपया {retryAfter} सेकंड के बाद पुनः प्रयास करें।',
      quotaExceeded: 'आपका उपयोग कोटा समाप्त हो गया है। कृपया अपनी योजना अपग्रेड करें।',
      serviceUnavailable: 'उच्च मांग के कारण सेवा अस्थायी रूप से अनुपलब्ध है।',
    },
    mr: {
      tooManyRequests: 'खूप विनंत्या. कृपया {retryAfter} सेकंदांनंतर पुन्हा प्रयत्न करा.',
      quotaExceeded: 'तुमचा वापर कोटा संपला आहे. कृपया तुमची योजना अपग्रेड करा.',
      serviceUnavailable: 'उच्च मागणीमुळे सेवा तात्पुरती अनुपलब्ध.',
    },
  };
  
  const langMessages = messages[language] || messages.en;
  let message = langMessages[messageKey] || langMessages.tooManyRequests;
  
  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });
  }
  
  return message;
}

/**
 * Export all configurations
 */
export default {
  PRODUCTION_RATE_LIMIT_CONFIG,
  PRODUCTION_RATE_LIMIT_RULES,
  PRODUCTION_REDIS_CONFIG,
  DEGRADATION_STRATEGIES,
  MUMBAI_MARKET_CONFIG,
  getLocalizedRateLimitMessage,
};