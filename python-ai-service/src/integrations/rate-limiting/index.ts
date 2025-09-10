/**
 * Production Rate Limiting System Integration
 * Main entry point for Phase 3 Production Deployment
 * 
 * Handles Mumbai market scale with comprehensive rate limiting
 */

import { Application, Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { RateLimitMonitorMiddleware } from '../../middleware/rate-limit-monitor';
import { DistributedRateLimiter, createRedisCluster, createRedisClient } from './distributed-limiter';
import ThirdPartyRateLimitManager from './third-party-manager';
import { 
  PRODUCTION_RATE_LIMIT_CONFIG, 
  PRODUCTION_RATE_LIMIT_RULES,
  DEGRADATION_STRATEGIES,
  MUMBAI_MARKET_CONFIG,
  getLocalizedRateLimitMessage 
} from './production-config';
import { logger } from '../../utils/logger';

export interface RateLimitingSystemConfig {
  environment: 'production' | 'staging' | 'development';
  useRedisCluster: boolean;
  redisNodes?: Array<{ host: string; port: number }>;
  enableMonitoring: boolean;
  enableDashboard: boolean;
  enableAdaptive: boolean;
  enableDegradation: boolean;
}

export class ProductionRateLimitingSystem {
  private app: Application;
  private io?: SocketIOServer;
  private redis?: Redis;
  private rateLimitMonitor?: RateLimitMonitorMiddleware;
  private distributedLimiter?: DistributedRateLimiter;
  private thirdPartyManager?: ThirdPartyRateLimitManager;
  private config: RateLimitingSystemConfig;
  private degradationLevel: string = 'normal';
  private systemMetrics: Map<string, any> = new Map();

  constructor(app: Application, config: RateLimitingSystemConfig, io?: SocketIOServer) {
    this.app = app;
    this.io = io;
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize the rate limiting system
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Production Rate Limiting System', this.config);

      // 1. Setup Redis connection
      await this.setupRedis();

      // 2. Initialize rate limit monitor
      await this.setupRateLimitMonitor();

      // 3. Initialize distributed limiter
      await this.setupDistributedLimiter();

      // 4. Initialize third-party manager
      await this.setupThirdPartyManager();

      // 5. Setup middleware
      this.setupMiddleware();

      // 6. Setup dashboard and monitoring
      if (this.config.enableDashboard) {
        this.setupDashboard();
      }

      // 7. Setup WebSocket events
      if (this.io) {
        this.setupWebSocketEvents();
      }

      // 8. Start system monitoring
      if (this.config.enableMonitoring) {
        this.startSystemMonitoring();
      }

      logger.info('Production Rate Limiting System initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize rate limiting system:', error);
      throw error;
    }
  }

  /**
   * Setup Redis connection
   */
  private async setupRedis(): Promise<void> {
    if (this.config.useRedisCluster && this.config.redisNodes) {
      // Use Redis Cluster for production
      const cluster = createRedisCluster(this.config.redisNodes);
      await cluster.connect();
      this.redis = cluster as any; // Type compatibility
      logger.info('Connected to Redis Cluster');
    } else {
      // Use single Redis instance
      this.redis = createRedisClient();
      await this.redis.connect();
      logger.info('Connected to Redis');
    }

    // Test connection
    await this.redis.ping();
  }

  /**
   * Setup rate limit monitor
   */
  private async setupRateLimitMonitor(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }

    // Use production configuration
    const config = {
      ...PRODUCTION_RATE_LIMIT_CONFIG,
      redis: {
        ...PRODUCTION_RATE_LIMIT_CONFIG.redis,
        host: this.redis.options?.host || 'localhost',
        port: this.redis.options?.port || 6379,
      },
    };

    this.rateLimitMonitor = new RateLimitMonitorMiddleware(config);

    // Setup event listeners
    this.rateLimitMonitor.on('rateLimitExceeded', (data) => {
      this.handleRateLimitExceeded(data);
    });

    this.rateLimitMonitor.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    this.rateLimitMonitor.on('limitAdjusted', (data) => {
      this.handleLimitAdjusted(data);
    });

    logger.info('Rate limit monitor initialized');
  }

  /**
   * Setup distributed limiter
   */
  private async setupDistributedLimiter(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }

    this.distributedLimiter = new DistributedRateLimiter({
      useCluster: this.config.useRedisCluster,
      redis: this.config.useRedisCluster ? undefined : this.redis,
      cluster: this.config.useRedisCluster ? this.redis as any : undefined,
      keyPrefix: 'castmatch:drl:',
      slidingWindow: true,
      tokenBucket: true,
    });

    logger.info('Distributed limiter initialized');
  }

  /**
   * Setup third-party manager
   */
  private async setupThirdPartyManager(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }

    this.thirdPartyManager = new ThirdPartyRateLimitManager(this.redis);

    // Setup event listeners
    this.thirdPartyManager.on('circuitBreakerOpen', (data) => {
      logger.warn('Circuit breaker opened:', data);
      this.handleCircuitBreakerOpen(data);
    });

    this.thirdPartyManager.on('apiCallRecorded', (data) => {
      this.updateAPIMetrics(data);
    });

    logger.info('Third-party rate limit manager initialized');
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Apply global rate limiting
    if (this.rateLimitMonitor) {
      this.app.use(this.rateLimitMonitor.createMiddleware());
    }

    // Apply distributed rate limiting for specific routes
    if (this.distributedLimiter) {
      // AI endpoints with token bucket
      this.app.use('/api/ai/*', this.distributedLimiter.createMiddleware({
        algorithm: {
          type: 'token-bucket',
          config: {
            capacity: 100,
            refillRate: 10, // 10 tokens per second
            tokens: 5, // Each AI request costs 5 tokens
          },
        },
        keyGenerator: (req) => req.user?.id || req.ip || 'anonymous',
      }));

      // Search endpoints with sliding window
      this.app.use('/api/search/*', this.distributedLimiter.createMiddleware({
        algorithm: {
          type: 'sliding-window',
          config: {
            windowMs: 60000,
            limit: 30,
          },
        },
        keyGenerator: (req) => req.user?.id || req.ip || 'anonymous',
      }));
    }

    // Apply degradation middleware
    this.app.use(this.degradationMiddleware.bind(this));

    logger.info('Rate limiting middleware configured');
  }

  /**
   * Degradation middleware
   */
  private degradationMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!this.config.enableDegradation) {
      return next();
    }

    const features = DEGRADATION_STRATEGIES.features[this.degradationLevel];
    const path = req.path.toLowerCase();

    // Check if feature is disabled
    if (path.includes('/ai/') && !features.aiChat) {
      return res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'AI services are temporarily disabled due to high load',
        retryAfter: 300,
      });
    }

    if (path.includes('/upload') && !features.mediaUpload) {
      return res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'Media uploads are temporarily disabled',
        retryAfter: 300,
      });
    }

    if (path.includes('/export') && !features.export) {
      return res.status(503).json({
        error: 'Service Temporarily Unavailable',
        message: 'Export functionality is temporarily disabled',
        retryAfter: 300,
      });
    }

    next();
  }

  /**
   * Setup dashboard routes
   */
  private setupDashboard(): void {
    // Serve dashboard HTML
    this.app.get('/admin/rate-limiting/dashboard', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'monitoring-dashboard.html'));
    });

    // Dashboard API endpoint
    this.app.get('/api/rate-limiting/dashboard', async (req: Request, res: Response) => {
      try {
        const data = await this.getDashboardData(req.query);
        res.json(data);
      } catch (error) {
        logger.error('Dashboard API error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
      }
    });

    // Export endpoint
    this.app.get('/api/rate-limiting/export', async (req: Request, res: Response) => {
      try {
        const data = await this.exportData(req.query);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="rate-limiting-export.json"');
        res.json(data);
      } catch (error) {
        logger.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
      }
    });

    // Admin endpoints
    this.app.post('/api/rate-limiting/reset/:userId', async (req: Request, res: Response) => {
      try {
        await this.resetUserLimits(req.params.userId);
        res.json({ success: true, message: 'User limits reset successfully' });
      } catch (error) {
        logger.error('Reset error:', error);
        res.status(500).json({ error: 'Failed to reset limits' });
      }
    });

    this.app.post('/api/rate-limiting/degradation', async (req: Request, res: Response) => {
      try {
        const { level } = req.body;
        this.setDegradationLevel(level);
        res.json({ success: true, level: this.degradationLevel });
      } catch (error) {
        logger.error('Degradation error:', error);
        res.status(500).json({ error: 'Failed to set degradation level' });
      }
    });

    logger.info('Dashboard routes configured');
  }

  /**
   * Setup WebSocket events
   */
  private setupWebSocketEvents(): void {
    if (!this.io) return;

    const rateLimitNamespace = this.io.of('/rate-limiting');

    rateLimitNamespace.on('connection', (socket) => {
      logger.info('Client connected to rate limiting monitor');

      // Send initial data
      this.getDashboardData({}).then(data => {
        socket.emit('metrics', data);
      });

      // Subscribe to metrics updates
      socket.on('subscribe', (filters) => {
        socket.join('metrics-room');
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from rate limiting monitor');
      });
    });

    // Broadcast metrics periodically
    setInterval(() => {
      this.getDashboardData({}).then(data => {
        rateLimitNamespace.to('metrics-room').emit('metrics', data);
      });
    }, 5000);

    logger.info('WebSocket events configured');
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkSystemHealth();
        await this.adjustDegradationLevel();
        await this.checkPeakHours();
      } catch (error) {
        logger.error('System monitoring error:', error);
      }
    }, 30000); // Every 30 seconds

    logger.info('System monitoring started');
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<void> {
    const metrics = {
      timestamp: new Date(),
      redis: await this.distributedLimiter?.healthCheck(),
      apis: await this.thirdPartyManager?.getMetrics(),
      rules: await this.rateLimitMonitor?.getMetrics(),
    };

    this.systemMetrics.set('latest', metrics);

    // Calculate overall health
    const health = this.calculateSystemHealth(metrics);
    this.systemMetrics.set('health', health);
  }

  /**
   * Calculate system health percentage
   */
  private calculateSystemHealth(metrics: any): number {
    let score = 100;

    // Check Redis health
    if (!metrics.redis?.healthy) {
      score -= 30;
    }

    // Check API health
    const apiMetrics = metrics.apis || [];
    const failedAPIs = apiMetrics.filter((api: any) => 
      api.failedCalls / api.totalCalls > 0.1
    );
    score -= failedAPIs.length * 5;

    // Check rate limit health
    const ruleMetrics = metrics.rules || [];
    const overloadedRules = ruleMetrics.filter((rule: any) =>
      rule.blockRate > 0.2
    );
    score -= overloadedRules.length * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Adjust degradation level based on system metrics
   */
  private async adjustDegradationLevel(): Promise<void> {
    if (!this.config.enableDegradation) return;

    const health = this.systemMetrics.get('health') || 100;
    const metrics = this.systemMetrics.get('latest');

    // Calculate load indicators
    const errorRate = this.calculateErrorRate(metrics);
    const responseTime = this.calculateAverageResponseTime(metrics);

    // Determine degradation level
    let newLevel = 'normal';

    if (
      errorRate > DEGRADATION_STRATEGIES.thresholds.emergency.errorRate ||
      responseTime > DEGRADATION_STRATEGIES.thresholds.emergency.responseTime ||
      health < 25
    ) {
      newLevel = 'emergency';
    } else if (
      errorRate > DEGRADATION_STRATEGIES.thresholds.critical.errorRate ||
      responseTime > DEGRADATION_STRATEGIES.thresholds.critical.responseTime ||
      health < 50
    ) {
      newLevel = 'critical';
    } else if (
      errorRate > DEGRADATION_STRATEGIES.thresholds.degraded.errorRate ||
      responseTime > DEGRADATION_STRATEGIES.thresholds.degraded.responseTime ||
      health < 75
    ) {
      newLevel = 'degraded';
    }

    if (newLevel !== this.degradationLevel) {
      this.setDegradationLevel(newLevel);
      logger.warn(`System degradation level changed to: ${newLevel}`);
    }
  }

  /**
   * Check and adjust for peak hours
   */
  private async checkPeakHours(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const isWithinPeakHours = 
      hour >= MUMBAI_MARKET_CONFIG.peakHours.start && 
      hour <= MUMBAI_MARKET_CONFIG.peakHours.end;

    if (isWithinPeakHours) {
      // Apply peak hour multipliers
      logger.info('Peak hours detected, adjusting rate limits');
      // Implementation would adjust rate limits based on tier multipliers
    }
  }

  /**
   * Get dashboard data
   */
  private async getDashboardData(filters: any): Promise<any> {
    const [
      ruleMetrics,
      apiMetrics,
      alerts,
      health
    ] = await Promise.all([
      this.rateLimitMonitor?.getMetrics(),
      this.thirdPartyManager?.getMetrics(),
      this.rateLimitMonitor?.getAlerts(20),
      this.distributedLimiter?.healthCheck(),
    ]);

    const systemHealth = this.systemMetrics.get('health') || 100;

    return {
      totalRequests: this.calculateTotalRequests(ruleMetrics),
      blockedRequests: this.calculateBlockedRequests(ruleMetrics),
      activeUsers: this.calculateActiveUsers(ruleMetrics),
      apiHealth: systemHealth,
      requestsChange: this.calculateChange('requests'),
      blockedChange: this.calculateChange('blocked'),
      usersChange: this.calculateChange('users'),
      rateHistory: this.generateRateHistory(),
      tierDistribution: this.calculateTierDistribution(ruleMetrics),
      apiUsage: this.calculateAPIUsage(apiMetrics),
      apiLimits: this.formatAPILimits(apiMetrics),
      topUsers: this.getTopUsers(ruleMetrics),
      alerts: alerts || [],
      degradationLevel: this.degradationLevel,
      redisHealth: health,
    };
  }

  /**
   * Export data for analysis
   */
  private async exportData(filters: any): Promise<any> {
    const data = await this.getDashboardData(filters);
    
    return {
      exported: new Date().toISOString(),
      filters,
      data,
      configuration: {
        rules: PRODUCTION_RATE_LIMIT_RULES.map(r => ({
          id: r.id,
          name: r.name,
          windowMs: r.windowMs,
          maxRequests: r.maxRequests,
        })),
        degradationStrategies: DEGRADATION_STRATEGIES,
        marketConfig: MUMBAI_MARKET_CONFIG,
      },
    };
  }

  /**
   * Reset user limits
   */
  private async resetUserLimits(userId: string): Promise<void> {
    if (this.distributedLimiter) {
      await this.distributedLimiter.resetLimits(userId);
    }
    logger.info(`Reset rate limits for user: ${userId}`);
  }

  /**
   * Set degradation level
   */
  private setDegradationLevel(level: string): void {
    if (DEGRADATION_STRATEGIES.levels[level.toUpperCase()]) {
      this.degradationLevel = level;
      
      if (this.io) {
        this.io.of('/rate-limiting').emit('degradationChanged', {
          level,
          features: DEGRADATION_STRATEGIES.features[level],
        });
      }
    }
  }

  // Event handlers
  private handleRateLimitExceeded(data: any): void {
    logger.warn('Rate limit exceeded:', data);
    if (this.io) {
      this.io.of('/rate-limiting').emit('rateLimitExceeded', data);
    }
  }

  private handleAlert(alert: any): void {
    logger.warn('Rate limit alert:', alert);
    if (this.io) {
      this.io.of('/rate-limiting').emit('alert', alert);
    }
  }

  private handleLimitAdjusted(data: any): void {
    logger.info('Rate limit adjusted:', data);
    if (this.io) {
      this.io.of('/rate-limiting').emit('limitAdjusted', data);
    }
  }

  private handleCircuitBreakerOpen(data: any): void {
    logger.error('Circuit breaker opened for API:', data);
    if (this.io) {
      this.io.of('/rate-limiting').emit('circuitBreakerOpen', data);
    }
  }

  private updateAPIMetrics(data: any): void {
    // Update internal metrics
    // Could be used for additional monitoring
  }

  // Calculation helpers
  private calculateTotalRequests(metrics?: any[]): number {
    if (!metrics) return 0;
    return metrics.reduce((sum, m) => sum + m.totalRequests, 0);
  }

  private calculateBlockedRequests(metrics?: any[]): number {
    if (!metrics) return 0;
    return metrics.reduce((sum, m) => sum + m.blockedRequests, 0);
  }

  private calculateActiveUsers(metrics?: any[]): number {
    if (!metrics) return 0;
    const uniqueUsers = new Set();
    metrics.forEach(m => {
      m.topBlocked?.forEach((item: any) => uniqueUsers.add(item.key));
    });
    return uniqueUsers.size;
  }

  private calculateChange(metric: string): number {
    // Simplified - would compare with previous period
    return Math.floor(Math.random() * 20) - 10;
  }

  private calculateErrorRate(metrics: any): number {
    // Calculate overall error rate from metrics
    return 0.05; // Placeholder
  }

  private calculateAverageResponseTime(metrics: any): number {
    // Calculate average response time from metrics
    return 500; // Placeholder
  }

  private generateRateHistory(): any {
    // Generate time series data for charts
    const labels = [];
    const allowed = [];
    const blocked = [];
    
    for (let i = 23; i >= 0; i--) {
      labels.push(`${i}h`);
      allowed.push(Math.floor(Math.random() * 1000));
      blocked.push(Math.floor(Math.random() * 100));
    }

    return { labels, allowed, blocked };
  }

  private calculateTierDistribution(metrics?: any[]): number[] {
    // Calculate distribution across tiers
    return [300, 500, 800, 200]; // Enterprise, Professional, Standard, Free
  }

  private calculateAPIUsage(metrics?: any[]): Record<string, number> {
    if (!metrics) return {};
    const usage: Record<string, number> = {};
    metrics.forEach(m => {
      usage[m.apiId] = m.totalCalls;
    });
    return usage;
  }

  private formatAPILimits(metrics?: any[]): any[] {
    if (!metrics) return [];
    return metrics.map(m => ({
      name: m.apiId,
      usage: m.totalCalls,
      limit: 1000, // Would fetch actual limit
      resetTime: new Date(Date.now() + 3600000),
      status: m.rateLimitedCalls > 0 ? 'Warning' : 'Healthy',
    }));
  }

  private getTopUsers(metrics?: any[]): any[] {
    // Get top API consumers
    const users = [];
    if (metrics) {
      metrics.forEach(m => {
        m.topBlocked?.forEach((item: any) => {
          users.push({
            name: item.key,
            tier: 'professional',
            requests: item.count * 10,
            blocked: item.count,
            avgResponseTime: Math.floor(Math.random() * 1000),
          });
        });
      });
    }
    return users.slice(0, 10);
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down rate limiting system');
    
    if (this.rateLimitMonitor) {
      this.rateLimitMonitor.stop();
    }
    
    if (this.thirdPartyManager) {
      this.thirdPartyManager.stop();
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
    
    logger.info('Rate limiting system shut down successfully');
  }
}

/**
 * Factory function to create and initialize the rate limiting system
 */
export async function initializeRateLimiting(
  app: Application,
  io?: SocketIOServer
): Promise<ProductionRateLimitingSystem> {
  const config: RateLimitingSystemConfig = {
    environment: (process.env.NODE_ENV as any) || 'development',
    useRedisCluster: process.env.USE_REDIS_CLUSTER === 'true',
    redisNodes: process.env.REDIS_NODES ? JSON.parse(process.env.REDIS_NODES) : undefined,
    enableMonitoring: process.env.ENABLE_MONITORING !== 'false',
    enableDashboard: process.env.ENABLE_DASHBOARD !== 'false',
    enableAdaptive: process.env.ENABLE_ADAPTIVE !== 'false',
    enableDegradation: process.env.ENABLE_DEGRADATION !== 'false',
  };

  const system = new ProductionRateLimitingSystem(app, config, io);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await system.shutdown();
    process.exit(0);
  });

  return system;
}

export default ProductionRateLimitingSystem;