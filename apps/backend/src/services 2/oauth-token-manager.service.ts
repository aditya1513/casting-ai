/**
 * OAuth Token Manager Service
 * Production-grade OAuth token management with automated refresh, health monitoring, and secure storage
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { oauthConfig } from '../config/oauth.config';

export interface OAuthToken {
  provider: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope: string[];
  issuedAt: Date;
  lastRefreshedAt?: Date;
  refreshCount: number;
  metadata?: Record<string, any>;
  encrypted: boolean;
}

export interface TokenRefreshConfig {
  enableAutoRefresh: boolean;
  refreshThresholdMs: number; // Refresh when token expires in this many ms
  maxRefreshAttempts: number;
  refreshRetryDelayMs: number;
  refreshOnStartup: boolean;
  proactiveRefreshEnabled: boolean;
  batchRefreshEnabled: boolean;
  batchSize: number;
}

export interface ProviderConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  revokeUrl?: string;
  introspectUrl?: string;
  refreshTokenRotation: boolean;
  tokenEncryption: boolean;
  scopes: string[];
  customHeaders?: Record<string, string>;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface TokenHealthStatus {
  provider: string;
  userId: string;
  isValid: boolean;
  expiresIn: number; // milliseconds
  needsRefresh: boolean;
  lastRefreshAttempt?: Date;
  refreshFailureCount: number;
  lastError?: string;
  healthScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface TokenMetrics {
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  tokensNeedingRefresh: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  averageTokenLifetime: number;
  providerBreakdown: Record<string, {
    total: number;
    healthy: number;
    expired: number;
    errorRate: number;
  }>;
}

const DEFAULT_REFRESH_CONFIG: TokenRefreshConfig = {
  enableAutoRefresh: true,
  refreshThresholdMs: 300000, // 5 minutes before expiry
  maxRefreshAttempts: 3,
  refreshRetryDelayMs: 5000, // 5 seconds
  refreshOnStartup: true,
  proactiveRefreshEnabled: true,
  batchRefreshEnabled: true,
  batchSize: 10,
};

export class OAuthTokenManagerService extends EventEmitter {
  private redis: Redis;
  private refreshQueue: Queue<TokenRefreshJob>;
  private healthCheckQueue: Queue<TokenHealthCheckJob>;
  private axiosInstance: AxiosInstance;
  private encryptionKey: Buffer;
  private refreshConfig: TokenRefreshConfig;
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private tokenCache: Map<string, OAuthToken> = new Map();
  private healthStatusCache: Map<string, TokenHealthStatus> = new Map();
  private metrics: TokenMetrics = {
    totalTokens: 0,
    activeTokens: 0,
    expiredTokens: 0,
    tokensNeedingRefresh: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageTokenLifetime: 0,
    providerBreakdown: {},
  };

  constructor(config?: Partial<TokenRefreshConfig>) {
    super();
    this.refreshConfig = { ...DEFAULT_REFRESH_CONFIG, ...config };
    this.initializeEncryption();
    this.initializeRedis();
    this.initializeQueues();
    this.initializeAxios();
    this.loadProviderConfigs();
    this.startHealthMonitoring();
    this.startMetricsCollection();
  }

  private initializeEncryption(): void {
    const key = process.env.OAUTH_ENCRYPTION_KEY;
    if (!key) {
      throw new AppError('OAUTH_ENCRYPTION_KEY environment variable is required', 500);
    }
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'oauth:',
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in OAuthTokenManager:', error);
    });

    this.redis.on('connect', () => {
      logger.info('OAuthTokenManager connected to Redis');
    });
  }

  private initializeQueues(): void {
    const queueConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        keyPrefix: 'oauth:queue:',
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    };

    // Token refresh queue
    this.refreshQueue = new Bull('token-refresh', queueConfig);
    this.refreshQueue.process('refresh-token', 5, this.processTokenRefresh.bind(this));

    // Health check queue
    this.healthCheckQueue = new Bull('token-health-check', queueConfig);
    this.healthCheckQueue.process('health-check', 10, this.processHealthCheck.bind(this));

    this.setupQueueEventHandlers();
  }

  private initializeAxios(): void {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'CastMatch-OAuth-Manager/2.0',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use((config) => {
      logger.debug('OAuth request', {
        url: config.url,
        method: config.method,
      });
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('OAuth request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  private loadProviderConfigs(): void {
    // Load Google OAuth config
    if (oauthConfig.google.clientId) {
      this.providerConfigs.set('google', {
        name: 'google',
        clientId: oauthConfig.google.clientId,
        clientSecret: oauthConfig.google.clientSecret,
        tokenUrl: oauthConfig.google.tokenURL,
        revokeUrl: 'https://oauth2.googleapis.com/revoke',
        introspectUrl: 'https://oauth2.googleapis.com/tokeninfo',
        refreshTokenRotation: false,
        tokenEncryption: true,
        scopes: oauthConfig.google.scopes,
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
        },
      });
    }

    // Load GitHub OAuth config
    if (oauthConfig.github.clientId) {
      this.providerConfigs.set('github', {
        name: 'github',
        clientId: oauthConfig.github.clientId,
        clientSecret: oauthConfig.github.clientSecret,
        tokenUrl: oauthConfig.github.tokenURL,
        refreshTokenRotation: true,
        tokenEncryption: true,
        scopes: oauthConfig.github.scopes,
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 5000,
        },
      });
    }

    // Add more providers as needed (Zoom, Microsoft, etc.)
    this.addZoomProvider();
    this.addMicrosoftProvider();

    logger.info(`Loaded ${this.providerConfigs.size} OAuth provider configurations`);
  }

  private addZoomProvider(): void {
    if (process.env.ZOOM_CLIENT_ID) {
      this.providerConfigs.set('zoom', {
        name: 'zoom',
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET!,
        tokenUrl: 'https://zoom.us/oauth/token',
        revokeUrl: 'https://zoom.us/oauth/revoke',
        refreshTokenRotation: true,
        tokenEncryption: true,
        scopes: ['meeting:write', 'recording:read'],
        rateLimits: {
          requestsPerMinute: 80,
          requestsPerHour: 2000,
        },
      });
    }
  }

  private addMicrosoftProvider(): void {
    if (process.env.MICROSOFT_CLIENT_ID) {
      this.providerConfigs.set('microsoft', {
        name: 'microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        refreshTokenRotation: false,
        tokenEncryption: true,
        scopes: ['https://graph.microsoft.com/calendars.readwrite', 'https://graph.microsoft.com/user.read'],
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 10000,
        },
      });
    }
  }

  private setupQueueEventHandlers(): void {
    this.refreshQueue.on('completed', (job: Job<TokenRefreshJob>, result) => {
      logger.info(`Token refresh completed: ${job.id}`, {
        provider: job.data.provider,
        userId: job.data.userId,
      });
      this.metrics.successfulRefreshes++;
    });

    this.refreshQueue.on('failed', (job: Job<TokenRefreshJob>, error) => {
      logger.error(`Token refresh failed: ${job.id}`, {
        provider: job.data.provider,
        userId: job.data.userId,
        error: error.message,
      });
      this.metrics.failedRefreshes++;
      this.handleRefreshFailure(job.data, error);
    });

    this.healthCheckQueue.on('completed', (job: Job<TokenHealthCheckJob>, result) => {
      this.updateHealthStatus(job.data.tokenKey, result);
    });
  }

  /**
   * Store OAuth token with encryption
   */
  async storeToken(token: Omit<OAuthToken, 'encrypted' | 'issuedAt' | 'refreshCount'>): Promise<string> {
    const tokenKey = this.generateTokenKey(token.provider, token.userId);
    
    const fullToken: OAuthToken = {
      ...token,
      issuedAt: new Date(),
      refreshCount: 0,
      encrypted: true,
    };

    // Encrypt sensitive data
    const encryptedToken = await this.encryptToken(fullToken);
    
    // Store in Redis with TTL
    const ttl = Math.floor((token.expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.setex(`token:${tokenKey}`, Math.max(ttl, 3600), JSON.stringify(encryptedToken));
    
    // Update cache
    this.tokenCache.set(tokenKey, fullToken);
    
    // Schedule refresh if needed
    if (this.refreshConfig.enableAutoRefresh && fullToken.refreshToken) {
      await this.scheduleTokenRefresh(tokenKey, fullToken);
    }
    
    // Update metrics
    this.updateMetrics();
    
    logger.info(`Stored OAuth token`, {
      provider: token.provider,
      userId: token.userId,
      expiresAt: token.expiresAt,
    });

    this.emit('token.stored', { provider: token.provider, userId: token.userId });
    
    return tokenKey;
  }

  /**
   * Get OAuth token with automatic refresh if needed
   */
  async getToken(provider: string, userId: string): Promise<OAuthToken | null> {
    const tokenKey = this.generateTokenKey(provider, userId);
    
    // Check cache first
    let token = this.tokenCache.get(tokenKey);
    
    if (!token) {
      // Load from Redis
      const stored = await this.redis.get(`token:${tokenKey}`);
      if (!stored) {
        return null;
      }
      
      const encryptedToken = JSON.parse(stored);
      token = await this.decryptToken(encryptedToken);
      this.tokenCache.set(tokenKey, token);
    }

    // Check if token needs refresh
    const now = new Date();
    if (token.expiresAt <= now) {
      logger.info(`Token expired for ${provider}:${userId}`);
      
      if (token.refreshToken && this.refreshConfig.enableAutoRefresh) {
        try {
          token = await this.refreshToken(tokenKey, token);
        } catch (error) {
          logger.error(`Failed to refresh expired token: ${error}`);
          await this.removeToken(provider, userId);
          return null;
        }
      } else {
        await this.removeToken(provider, userId);
        return null;
      }
    } else if (this.shouldProactivelyRefresh(token)) {
      // Proactive refresh
      this.scheduleTokenRefresh(tokenKey, token, true);
    }

    return token;
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(tokenKey: string, currentToken: OAuthToken): Promise<OAuthToken> {
    const provider = this.providerConfigs.get(currentToken.provider);
    if (!provider) {
      throw new AppError(`Provider ${currentToken.provider} not configured`, 400);
    }

    if (!currentToken.refreshToken) {
      throw new AppError('No refresh token available', 400);
    }

    logger.info(`Refreshing token for ${currentToken.provider}:${currentToken.userId}`);

    try {
      const response = await this.axiosInstance.post(provider.tokenUrl, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentToken.refreshToken,
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...provider.customHeaders,
        },
      });

      const tokenData = response.data;
      
      const refreshedToken: OAuthToken = {
        ...currentToken,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || currentToken.refreshToken,
        tokenType: tokenData.token_type || currentToken.tokenType,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        lastRefreshedAt: new Date(),
        refreshCount: currentToken.refreshCount + 1,
        scope: tokenData.scope ? tokenData.scope.split(' ') : currentToken.scope,
      };

      // Store refreshed token
      await this.storeToken(refreshedToken);
      
      logger.info(`Token refreshed successfully`, {
        provider: currentToken.provider,
        userId: currentToken.userId,
        refreshCount: refreshedToken.refreshCount,
      });

      this.emit('token.refreshed', {
        provider: currentToken.provider,
        userId: currentToken.userId,
        refreshCount: refreshedToken.refreshCount,
      });

      return refreshedToken;

    } catch (error: any) {
      logger.error(`Token refresh failed`, {
        provider: currentToken.provider,
        userId: currentToken.userId,
        error: error.message,
        status: error.response?.status,
      });

      this.emit('token.refresh.failed', {
        provider: currentToken.provider,
        userId: currentToken.userId,
        error: error.message,
      });

      throw new AppError(`Token refresh failed: ${error.message}`, 500);
    }
  }

  /**
   * Revoke OAuth token
   */
  async revokeToken(provider: string, userId: string): Promise<void> {
    const token = await this.getToken(provider, userId);
    if (!token) {
      return;
    }

    const providerConfig = this.providerConfigs.get(provider);
    if (providerConfig?.revokeUrl) {
      try {
        await this.axiosInstance.post(providerConfig.revokeUrl, new URLSearchParams({
          token: token.accessToken,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        logger.info(`Token revoked successfully`, { provider, userId });
      } catch (error: any) {
        logger.warn(`Token revocation failed`, {
          provider,
          userId,
          error: error.message,
        });
      }
    }

    await this.removeToken(provider, userId);
    this.emit('token.revoked', { provider, userId });
  }

  /**
   * Remove OAuth token from storage
   */
  async removeToken(provider: string, userId: string): Promise<void> {
    const tokenKey = this.generateTokenKey(provider, userId);
    
    await this.redis.del(`token:${tokenKey}`);
    this.tokenCache.delete(tokenKey);
    this.healthStatusCache.delete(tokenKey);
    
    // Remove scheduled refresh jobs
    const jobs = await this.refreshQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.tokenKey === tokenKey) {
        await job.remove();
      }
    }
    
    this.updateMetrics();
    logger.info(`Removed token`, { provider, userId });
  }

  /**
   * Get token health status
   */
  async getTokenHealth(provider: string, userId: string): Promise<TokenHealthStatus | null> {
    const tokenKey = this.generateTokenKey(provider, userId);
    
    // Check cache first
    let status = this.healthStatusCache.get(tokenKey);
    if (status) {
      return status;
    }

    // Generate fresh health status
    const token = await this.getToken(provider, userId);
    if (!token) {
      return null;
    }

    status = this.calculateHealthStatus(token);
    this.healthStatusCache.set(tokenKey, status);
    
    return status;
  }

  /**
   * Get health status for all tokens
   */
  async getAllTokensHealth(): Promise<TokenHealthStatus[]> {
    const allTokens = await this.getAllTokens();
    const healthStatuses: TokenHealthStatus[] = [];

    for (const token of allTokens) {
      const status = await this.getTokenHealth(token.provider, token.userId);
      if (status) {
        healthStatuses.push(status);
      }
    }

    return healthStatuses;
  }

  /**
   * Get comprehensive token metrics
   */
  async getTokenMetrics(): Promise<TokenMetrics> {
    await this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Schedule token refresh
   */
  private async scheduleTokenRefresh(
    tokenKey: string,
    token: OAuthToken,
    isProactive: boolean = false
  ): Promise<void> {
    const delay = this.calculateRefreshDelay(token, isProactive);
    
    if (delay > 0) {
      const job = await this.refreshQueue.add('refresh-token', {
        tokenKey,
        provider: token.provider,
        userId: token.userId,
        isProactive,
      }, {
        delay,
        attempts: this.refreshConfig.maxRefreshAttempts,
        backoff: {
          type: 'exponential',
          delay: this.refreshConfig.refreshRetryDelayMs,
        },
      });

      logger.debug(`Scheduled token refresh`, {
        jobId: job.id,
        provider: token.provider,
        userId: token.userId,
        delay,
        isProactive,
      });
    }
  }

  /**
   * Process token refresh job
   */
  private async processTokenRefresh(job: Job<TokenRefreshJob>): Promise<void> {
    const { tokenKey, provider, userId, isProactive } = job.data;
    
    const token = this.tokenCache.get(tokenKey);
    if (!token) {
      logger.warn(`Token not found for refresh job: ${tokenKey}`);
      return;
    }

    // Skip if token is still healthy and this is proactive
    if (isProactive && !this.shouldProactivelyRefresh(token)) {
      return;
    }

    try {
      await this.refreshToken(tokenKey, token);
    } catch (error) {
      throw error; // Let Bull handle retry logic
    }
  }

  /**
   * Process health check job
   */
  private async processHealthCheck(job: Job<TokenHealthCheckJob>): Promise<TokenHealthStatus> {
    const { tokenKey } = job.data;
    
    const token = this.tokenCache.get(tokenKey);
    if (!token) {
      throw new AppError(`Token not found: ${tokenKey}`, 404);
    }

    return this.calculateHealthStatus(token);
  }

  /**
   * Calculate token health status
   */
  private calculateHealthStatus(token: OAuthToken): TokenHealthStatus {
    const now = Date.now();
    const expiresIn = token.expiresAt.getTime() - now;
    const isValid = expiresIn > 0;
    const needsRefresh = expiresIn <= this.refreshConfig.refreshThresholdMs;
    
    let healthScore = 100;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (expiresIn <= 0) {
      healthScore = 0;
      riskLevel = 'critical';
    } else if (expiresIn <= 60000) { // 1 minute
      healthScore = 20;
      riskLevel = 'critical';
    } else if (expiresIn <= 300000) { // 5 minutes
      healthScore = 50;
      riskLevel = 'high';
    } else if (expiresIn <= 900000) { // 15 minutes
      healthScore = 75;
      riskLevel = 'medium';
    }

    // Adjust for refresh failures
    if (token.refreshCount > 5) {
      healthScore = Math.max(0, healthScore - 20);
    }

    return {
      provider: token.provider,
      userId: token.userId,
      isValid,
      expiresIn,
      needsRefresh,
      lastRefreshAttempt: token.lastRefreshedAt,
      refreshFailureCount: 0, // Would need to track this separately
      healthScore,
      riskLevel,
    };
  }

  // Helper methods
  private generateTokenKey(provider: string, userId: string): string {
    return `${provider}:${userId}`;
  }

  private async encryptToken(token: OAuthToken): Promise<any> {
    const sensitive = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
    };
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(sensitive), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      ...token,
      accessToken: '***ENCRYPTED***',
      refreshToken: token.refreshToken ? '***ENCRYPTED***' : undefined,
      _encrypted: {
        data: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      },
    };
  }

  private async decryptToken(encryptedToken: any): Promise<OAuthToken> {
    if (!encryptedToken._encrypted) {
      return encryptedToken;
    }

    const { data, iv, authTag } = encryptedToken._encrypted;
    
    const decipher = crypto.createDecipherGCM('aes-256-gcm', this.encryptionKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const sensitive = JSON.parse(decrypted);
    
    return {
      ...encryptedToken,
      accessToken: sensitive.accessToken,
      refreshToken: sensitive.refreshToken,
      expiresAt: new Date(encryptedToken.expiresAt),
      issuedAt: new Date(encryptedToken.issuedAt),
      lastRefreshedAt: encryptedToken.lastRefreshedAt ? new Date(encryptedToken.lastRefreshedAt) : undefined,
    };
  }

  private shouldProactivelyRefresh(token: OAuthToken): boolean {
    if (!this.refreshConfig.proactiveRefreshEnabled || !token.refreshToken) {
      return false;
    }
    
    const now = Date.now();
    const expiresIn = token.expiresAt.getTime() - now;
    
    return expiresIn <= this.refreshConfig.refreshThresholdMs && expiresIn > 0;
  }

  private calculateRefreshDelay(token: OAuthToken, isProactive: boolean): number {
    const now = Date.now();
    const expiresAt = token.expiresAt.getTime();
    const refreshAt = expiresAt - this.refreshConfig.refreshThresholdMs;
    
    if (isProactive) {
      return Math.max(0, refreshAt - now);
    }
    
    return Math.max(0, refreshAt - now - 30000); // 30 seconds before threshold
  }

  private async getAllTokens(): Promise<OAuthToken[]> {
    const keys = await this.redis.keys('token:*');
    const tokens: OAuthToken[] = [];
    
    for (const key of keys) {
      const stored = await this.redis.get(key);
      if (stored) {
        const encryptedToken = JSON.parse(stored);
        const token = await this.decryptToken(encryptedToken);
        tokens.push(token);
      }
    }
    
    return tokens;
  }

  private async updateMetrics(): Promise<void> {
    const allTokens = await this.getAllTokens();
    const now = Date.now();
    
    this.metrics.totalTokens = allTokens.length;
    this.metrics.activeTokens = allTokens.filter(t => t.expiresAt.getTime() > now).length;
    this.metrics.expiredTokens = allTokens.filter(t => t.expiresAt.getTime() <= now).length;
    this.metrics.tokensNeedingRefresh = allTokens.filter(t => 
      t.expiresAt.getTime() - now <= this.refreshConfig.refreshThresholdMs
    ).length;
    
    // Update provider breakdown
    const breakdown: Record<string, any> = {};
    for (const token of allTokens) {
      if (!breakdown[token.provider]) {
        breakdown[token.provider] = {
          total: 0,
          healthy: 0,
          expired: 0,
          errorRate: 0,
        };
      }
      breakdown[token.provider].total++;
      if (token.expiresAt.getTime() > now) {
        breakdown[token.provider].healthy++;
      } else {
        breakdown[token.provider].expired++;
      }
    }
    
    this.metrics.providerBreakdown = breakdown;
  }

  private handleRefreshFailure(jobData: TokenRefreshJob, error: Error): void {
    this.emit('token.refresh.failed', {
      provider: jobData.provider,
      userId: jobData.userId,
      error: error.message,
    });
  }

  private startHealthMonitoring(): void {
    // Schedule periodic health checks
    setInterval(async () => {
      try {
        const tokens = await this.getAllTokens();
        for (const token of tokens) {
          const tokenKey = this.generateTokenKey(token.provider, token.userId);
          await this.healthCheckQueue.add('health-check', { tokenKey });
        }
      } catch (error) {
        logger.error('Health monitoring error:', error);
      }
    }, 300000); // Every 5 minutes
  }

  private startMetricsCollection(): void {
    // Update metrics every minute
    setInterval(async () => {
      try {
        await this.updateMetrics();
      } catch (error) {
        logger.error('Metrics collection error:', error);
      }
    }, 60000);
  }
}

// Type definitions for queue jobs
interface TokenRefreshJob {
  tokenKey: string;
  provider: string;
  userId: string;
  isProactive: boolean;
}

interface TokenHealthCheckJob {
  tokenKey: string;
}

// Export singleton instance
export const oauthTokenManager = new OAuthTokenManagerService();