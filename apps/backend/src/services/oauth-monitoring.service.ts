/**
 * OAuth Monitoring Service
 * Advanced monitoring, logging, and alerting for OAuth integrations
 * in the CastMatch platform
 */

import { AuthProvider } from '@prisma/client';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { oauthIntegrationService } from './oauth-integration.service';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

// Redis client for real-time metrics
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

interface OAuthEvent {
  id: string;
  type: 'authentication' | 'token_refresh' | 'error' | 'rate_limit' | 'security';
  provider: AuthProvider;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  clientInfo?: {
    ip: string;
    userAgent: string;
    sessionId?: string;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string; // e.g., "error_rate > 0.1"
  provider?: AuthProvider;
  severity: 'warning' | 'error' | 'critical';
  cooldown: number; // minutes
  enabled: boolean;
}

interface MetricSnapshot {
  timestamp: Date;
  provider: AuthProvider;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    errorRate: number;
    averageResponseTime: number;
    activeUsers: number;
    tokenRefreshes: number;
    circuitBreakerStatus: 'closed' | 'open' | 'half-open';
  };
}

export class OAuthMonitoringService extends EventEmitter {
  private eventBuffer: OAuthEvent[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private metricSnapshots: MetricSnapshot[] = [];

  constructor() {
    super();
    this.initializeMonitoring();
    this.setupDefaultAlertRules();
  }

  /**
   * Initialize monitoring system
   */
  private initializeMonitoring(): void {
    // Listen to OAuth integration service events
    oauthIntegrationService.on('token_refreshed', (event) => {
      this.logEvent({
        type: 'token_refresh',
        provider: event.provider,
        userId: event.userId,
        severity: 'info',
        metadata: { success: true, forced: event.forced || false }
      });
    });

    oauthIntegrationService.on('token_refresh_failed', (event) => {
      this.logEvent({
        type: 'error',
        provider: event.provider,
        userId: event.userId,
        severity: 'error',
        metadata: { error: event.error, type: 'token_refresh_failed' }
      });
    });

    oauthIntegrationService.on('token_invalidated', (event) => {
      this.logEvent({
        type: 'security',
        provider: event.provider,
        userId: event.userId,
        severity: 'warning',
        metadata: { reason: 'token_invalidated' }
      });
    });

    // Flush event buffer every 30 seconds
    setInterval(() => {
      this.flushEventBuffer();
    }, 30000);

    // Take metric snapshots every 5 minutes
    setInterval(() => {
      this.takeMetricSnapshot();
    }, 300000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);

    logger.info('OAuth monitoring system initialized');
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High OAuth Error Rate',
        condition: 'error_rate > 0.1',
        severity: 'warning',
        cooldown: 15,
        enabled: true
      },
      {
        id: 'critical_error_rate',
        name: 'Critical OAuth Error Rate',
        condition: 'error_rate > 0.25',
        severity: 'critical',
        cooldown: 5,
        enabled: true
      },
      {
        id: 'circuit_breaker_open',
        name: 'OAuth Circuit Breaker Open',
        condition: 'circuit_breaker_status = open',
        severity: 'error',
        cooldown: 10,
        enabled: true
      },
      {
        id: 'token_refresh_failures',
        name: 'High Token Refresh Failure Rate',
        condition: 'token_refresh_error_rate > 0.2',
        severity: 'warning',
        cooldown: 30,
        enabled: true
      },
      {
        id: 'slow_response_time',
        name: 'Slow OAuth Response Time',
        condition: 'avg_response_time > 5000',
        severity: 'warning',
        cooldown: 20,
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    logger.info('Default alert rules configured', { rulesCount: defaultRules.length });
  }

  /**
   * Log OAuth event
   */
  public logEvent(event: Partial<OAuthEvent> & { type: OAuthEvent['type']; provider: AuthProvider }): void {
    const fullEvent: OAuthEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      severity: 'info',
      metadata: {},
      ...event
    };

    // Add to buffer
    this.eventBuffer.push(fullEvent);

    // Emit for real-time monitoring
    this.emit('oauth_event', fullEvent);

    // Log based on severity
    const logData = {
      eventId: fullEvent.id,
      type: fullEvent.type,
      provider: fullEvent.provider,
      userId: fullEvent.userId,
      metadata: fullEvent.metadata,
      clientInfo: fullEvent.clientInfo
    };

    switch (fullEvent.severity) {
      case 'critical':
        logger.error(`Critical OAuth event: ${fullEvent.type}`, logData);
        break;
      case 'error':
        logger.error(`OAuth error: ${fullEvent.type}`, logData);
        break;
      case 'warning':
        logger.warn(`OAuth warning: ${fullEvent.type}`, logData);
        break;
      default:
        logger.info(`OAuth event: ${fullEvent.type}`, logData);
    }

    // Store metrics in Redis for real-time dashboards
    this.updateRealTimeMetrics(fullEvent);
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealTimeMetrics(event: OAuthEvent): Promise<void> {
    try {
      const key = `oauth_realtime:${event.provider}`;
      const pipe = redis.pipeline();

      // Increment counters
      pipe.hincrby(key, 'total_events', 1);
      pipe.hincrby(key, `${event.type}_events`, 1);
      pipe.hincrby(key, `${event.severity}_events`, 1);

      // Update timestamp
      pipe.hset(key, 'last_event', event.timestamp.toISOString());

      // Set expiry
      pipe.expire(key, 3600); // 1 hour

      await pipe.exec();

    } catch (error) {
      logger.error('Error updating real-time metrics', { error, event: event.id });
    }
  }

  /**
   * Flush event buffer to persistent storage
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      // Store events in database for historical analysis
      await prisma.oAuthEvent.createMany({
        data: events.map(event => ({
          id: event.id,
          type: event.type,
          provider: event.provider,
          userId: event.userId,
          severity: event.severity,
          metadata: event.metadata,
          clientIp: event.clientInfo?.ip,
          userAgent: event.clientInfo?.userAgent,
          sessionId: event.clientInfo?.sessionId,
          createdAt: event.timestamp
        }))
      });

      logger.debug('OAuth events flushed to database', { count: events.length });

    } catch (error) {
      logger.error('Error flushing event buffer', { error, bufferSize: this.eventBuffer.length });
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Take metric snapshot for trend analysis
   */
  private async takeMetricSnapshot(): Promise<void> {
    try {
      const providers = [AuthProvider.GOOGLE, AuthProvider.GITHUB, AuthProvider.LINKEDIN];

      for (const provider of providers) {
        const metrics = await this.calculateCurrentMetrics(provider);
        
        const snapshot: MetricSnapshot = {
          timestamp: new Date(),
          provider,
          metrics
        };

        this.metricSnapshots.push(snapshot);
        
        // Store in Redis for time series analysis
        await redis.zadd(
          `oauth_metrics_timeseries:${provider}`,
          Date.now(),
          JSON.stringify(snapshot.metrics)
        );

        // Keep only last 24 hours of data
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        await redis.zremrangebyscore(`oauth_metrics_timeseries:${provider}`, 0, dayAgo);
      }

      // Keep only last 100 snapshots in memory
      if (this.metricSnapshots.length > 300) {
        this.metricSnapshots = this.metricSnapshots.slice(-100);
      }

      logger.debug('Metric snapshots taken', { providers: providers.length });

    } catch (error) {
      logger.error('Error taking metric snapshots', error);
    }
  }

  /**
   * Calculate current metrics for a provider
   */
  private async calculateCurrentMetrics(provider: AuthProvider): Promise<MetricSnapshot['metrics']> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get events from the last hour
      const recentEvents = await prisma.oAuthEvent.findMany({
        where: {
          provider,
          createdAt: { gte: oneHourAgo }
        }
      });

      const totalRequests = recentEvents.length;
      const errorEvents = recentEvents.filter(e => e.severity === 'error' || e.severity === 'critical');
      const tokenRefreshes = recentEvents.filter(e => e.type === 'token_refresh');

      // Get circuit breaker status
      const circuitBreakerData = await prisma.circuitBreaker.findUnique({
        where: { provider }
      });

      // Get active users count
      const activeUsers = await prisma.socialAccount.count({
        where: {
          provider,
          isLinked: true,
          tokenExpiry: { gt: now }
        }
      });

      // Calculate response times (simplified - would need more detailed tracking)
      const averageResponseTime = 1000; // Placeholder - implement based on your needs

      return {
        totalRequests,
        successfulRequests: totalRequests - errorEvents.length,
        errorRate: totalRequests > 0 ? errorEvents.length / totalRequests : 0,
        averageResponseTime,
        activeUsers,
        tokenRefreshes: tokenRefreshes.length,
        circuitBreakerStatus: circuitBreakerData?.state || 'closed'
      };

    } catch (error) {
      logger.error('Error calculating current metrics', { error, provider });
      return {
        totalRequests: 0,
        successfulRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        activeUsers: 0,
        tokenRefreshes: 0,
        circuitBreakerStatus: 'closed'
      };
    }
  }

  /**
   * Check alerts based on current metrics
   */
  private async checkAlerts(): Promise<void> {
    try {
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;

        // Check cooldown
        const lastAlert = this.alertCooldowns.get(ruleId);
        if (lastAlert && Date.now() - lastAlert.getTime() < rule.cooldown * 60 * 1000) {
          continue;
        }

        // Evaluate rule condition
        const shouldAlert = await this.evaluateAlertCondition(rule);
        
        if (shouldAlert) {
          await this.triggerAlert(rule);
          this.alertCooldowns.set(ruleId, new Date());
        }
      }

    } catch (error) {
      logger.error('Error checking alerts', error);
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateAlertCondition(rule: AlertRule): Promise<boolean> {
    try {
      const providers = rule.provider ? [rule.provider] : [AuthProvider.GOOGLE, AuthProvider.GITHUB, AuthProvider.LINKEDIN];
      
      for (const provider of providers) {
        const metrics = await this.calculateCurrentMetrics(provider);
        
        // Simple condition evaluation (in production, use a proper expression evaluator)
        switch (rule.condition) {
          case 'error_rate > 0.1':
            if (metrics.errorRate > 0.1) return true;
            break;
          case 'error_rate > 0.25':
            if (metrics.errorRate > 0.25) return true;
            break;
          case 'circuit_breaker_status = open':
            if (metrics.circuitBreakerStatus === 'open') return true;
            break;
          case 'token_refresh_error_rate > 0.2':
            // This would need more complex calculation
            break;
          case 'avg_response_time > 5000':
            if (metrics.averageResponseTime > 5000) return true;
            break;
        }
      }

      return false;

    } catch (error) {
      logger.error('Error evaluating alert condition', { error, rule: rule.id });
      return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    try {
      const alert = {
        id: this.generateEventId(),
        ruleId: rule.id,
        ruleName: rule.name,
        condition: rule.condition,
        severity: rule.severity,
        provider: rule.provider,
        timestamp: new Date(),
        acknowledged: false
      };

      // Log alert
      logger.warn('OAuth alert triggered', alert);

      // Emit alert event
      this.emit('oauth_alert', alert);

      // Store alert in database
      await prisma.oAuthAlert.create({
        data: {
          id: alert.id,
          ruleId: alert.ruleId,
          ruleName: alert.ruleName,
          condition: alert.condition,
          severity: alert.severity,
          provider: alert.provider,
          acknowledged: alert.acknowledged,
          createdAt: alert.timestamp
        }
      });

      // Send notifications (implement based on your notification system)
      await this.sendAlertNotification(alert);

    } catch (error) {
      logger.error('Error triggering alert', { error, rule: rule.id });
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: any): Promise<void> {
    try {
      // Implement notification logic here
      // This could send emails, Slack messages, webhooks, etc.
      logger.info('Alert notification would be sent', alert);
      
    } catch (error) {
      logger.error('Error sending alert notification', { error, alert: alert.id });
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  /**
   * Get real-time metrics for monitoring dashboard
   */
  public async getRealTimeMetrics(provider?: AuthProvider): Promise<any> {
    try {
      const providers = provider ? [provider] : [AuthProvider.GOOGLE, AuthProvider.GITHUB, AuthProvider.LINKEDIN];
      const results: any = {};

      for (const p of providers) {
        const key = `oauth_realtime:${p}`;
        const data = await redis.hgetall(key);
        results[p] = data;
      }

      return results;

    } catch (error) {
      logger.error('Error getting real-time metrics', error);
      return {};
    }
  }

  /**
   * Get historical metrics
   */
  public getHistoricalMetrics(provider: AuthProvider, hours: number = 24): MetricSnapshot[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricSnapshots.filter(
      snapshot => snapshot.provider === provider && snapshot.timestamp >= cutoff
    );
  }

  /**
   * Get recent events
   */
  public async getRecentEvents(
    options: {
      provider?: AuthProvider;
      type?: OAuthEvent['type'];
      severity?: OAuthEvent['severity'];
      limit?: number;
      hours?: number;
    } = {}
  ): Promise<OAuthEvent[]> {
    try {
      const { provider, type, severity, limit = 100, hours = 24 } = options;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const where: any = {
        createdAt: { gte: cutoff }
      };

      if (provider) where.provider = provider;
      if (type) where.type = type;
      if (severity) where.severity = severity;

      const events = await prisma.oAuthEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return events.map(event => ({
        id: event.id,
        type: event.type as OAuthEvent['type'],
        provider: event.provider,
        userId: event.userId || undefined,
        timestamp: event.createdAt,
        severity: event.severity as OAuthEvent['severity'],
        metadata: event.metadata,
        clientInfo: {
          ip: event.clientIp || '',
          userAgent: event.userAgent || '',
          sessionId: event.sessionId || undefined
        }
      }));

    } catch (error) {
      logger.error('Error getting recent events', error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  public async getActiveAlerts(): Promise<any[]> {
    try {
      return await prisma.oAuthAlert.findMany({
        where: { acknowledged: false },
        orderBy: { createdAt: 'desc' }
      });

    } catch (error) {
      logger.error('Error getting active alerts', error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  public async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      await prisma.oAuthAlert.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedBy: userId,
          acknowledgedAt: new Date()
        }
      });

      logger.info('Alert acknowledged', { alertId, userId });
      return true;

    } catch (error) {
      logger.error('Error acknowledging alert', { error, alertId });
      return false;
    }
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.set(id, { ...rule, id });
    return id;
  }

  /**
   * Get system health summary
   */
  public async getHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalEvents: number;
    errorRate: number;
    activeAlerts: number;
    providerStatus: Record<AuthProvider, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      errorRate: number;
      activeUsers: number;
    }>;
  }> {
    try {
      const providers = [AuthProvider.GOOGLE, AuthProvider.GITHUB, AuthProvider.LINKEDIN];
      const providerStatus: any = {};
      let overallErrorRate = 0;
      let totalEvents = 0;

      for (const provider of providers) {
        const metrics = await this.calculateCurrentMetrics(provider);
        totalEvents += metrics.totalRequests;
        overallErrorRate += metrics.errorRate * metrics.totalRequests;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (metrics.errorRate > 0.25) status = 'unhealthy';
        else if (metrics.errorRate > 0.1) status = 'degraded';

        providerStatus[provider] = {
          status,
          errorRate: metrics.errorRate,
          activeUsers: metrics.activeUsers
        };
      }

      overallErrorRate = totalEvents > 0 ? overallErrorRate / totalEvents : 0;

      const activeAlerts = await prisma.oAuthAlert.count({
        where: { acknowledged: false }
      });

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (overallErrorRate > 0.25 || activeAlerts > 5) overallStatus = 'unhealthy';
      else if (overallErrorRate > 0.1 || activeAlerts > 2) overallStatus = 'degraded';

      return {
        status: overallStatus,
        totalEvents,
        errorRate: overallErrorRate,
        activeAlerts,
        providerStatus
      };

    } catch (error) {
      logger.error('Error getting health summary', error);
      return {
        status: 'unhealthy',
        totalEvents: 0,
        errorRate: 1,
        activeAlerts: 0,
        providerStatus: {}
      };
    }
  }
}

// Export singleton instance
export const oauthMonitoringService = new OAuthMonitoringService();