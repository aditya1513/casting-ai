/**
 * Communication Monitoring Service
 * Comprehensive monitoring and metrics for communication infrastructure
 */

import { logger } from '../utils/logger';
import { CacheManager, CacheKeys } from '../config/redis';
import { prisma } from '../config/database';
import client from 'prom-client';
import Bull, { Queue, Job } from 'bull';

interface CommunicationMetrics {
  emails: {
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  sms: {
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  };
  push: {
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
  };
  websocket: {
    connections: number;
    messages: number;
    rooms: number;
    errors: number;
  };
  workflows: {
    executed: number;
    completed: number;
    failed: number;
    avgDuration: number;
  };
  notifications: {
    sent: number;
    read: number;
    unread: number;
    expired: number;
  };
}

interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  successRate: number;
  lastCheck: Date;
  errors: string[];
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: ('email' | 'sms' | 'webhook' | 'slack')[];
  isActive: boolean;
}

export class CommunicationMonitoringService {
  private metricsQueue: Queue;
  private alertQueue: Queue;
  
  // Prometheus metrics
  private emailsTotal: client.Counter<string>;
  private smsTotal: client.Counter<string>;
  private pushNotificationsTotal: client.Counter<string>;
  private websocketConnections: client.Gauge<string>;
  private websocketMessages: client.Counter<string>;
  private workflowExecutions: client.Counter<string>;
  private workflowDuration: client.Histogram<string>;
  private providerResponseTime: client.Histogram<string>;
  private providerErrors: client.Counter<string>;

  private alertRules: Map<string, AlertRule> = new Map();
  private providerHealthCache: Map<string, ProviderHealth> = new Map();

  constructor() {
    this.initializeQueues();
    this.initializeMetrics();
    this.loadAlertRules();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Initialize Bull queues for metrics processing
   */
  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    };

    this.metricsQueue = new Bull('metrics-queue', redisConfig);
    this.alertQueue = new Bull('alert-queue', redisConfig);

    // Process metrics
    this.metricsQueue.process(async (job: Job) => {
      await this.processMetrics(job.data);
    });

    // Process alerts
    this.alertQueue.process(async (job: Job) => {
      await this.processAlert(job.data);
    });
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): void {
    const register = client.register;

    this.emailsTotal = new client.Counter({
      name: 'castmatch_emails_total',
      help: 'Total number of emails sent',
      labelNames: ['status', 'provider', 'template'],
      registers: [register],
    });

    this.smsTotal = new client.Counter({
      name: 'castmatch_sms_total',
      help: 'Total number of SMS sent',
      labelNames: ['status', 'provider'],
      registers: [register],
    });

    this.pushNotificationsTotal = new client.Counter({
      name: 'castmatch_push_notifications_total',
      help: 'Total number of push notifications sent',
      labelNames: ['status', 'platform'],
      registers: [register],
    });

    this.websocketConnections = new client.Gauge({
      name: 'castmatch_websocket_connections',
      help: 'Current number of WebSocket connections',
      registers: [register],
    });

    this.websocketMessages = new client.Counter({
      name: 'castmatch_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['type', 'status'],
      registers: [register],
    });

    this.workflowExecutions = new client.Counter({
      name: 'castmatch_workflow_executions_total',
      help: 'Total number of workflow executions',
      labelNames: ['workflow_type', 'status'],
      registers: [register],
    });

    this.workflowDuration = new client.Histogram({
      name: 'castmatch_workflow_duration_seconds',
      help: 'Workflow execution duration',
      labelNames: ['workflow_type'],
      registers: [register],
    });

    this.providerResponseTime = new client.Histogram({
      name: 'castmatch_provider_response_time_seconds',
      help: 'Provider response time',
      labelNames: ['provider', 'operation'],
      registers: [register],
    });

    this.providerErrors = new client.Counter({
      name: 'castmatch_provider_errors_total',
      help: 'Total provider errors',
      labelNames: ['provider', 'error_type'],
      registers: [register],
    });
  }

  /**
   * Load alert rules from configuration
   */
  private loadAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'email_failure_rate',
        name: 'High Email Failure Rate',
        condition: 'email_failure_rate > threshold',
        threshold: 10, // 10%
        timeWindow: 15,
        severity: 'high',
        channels: ['email', 'webhook'],
        isActive: true,
      },
      {
        id: 'sms_failure_rate',
        name: 'High SMS Failure Rate',
        condition: 'sms_failure_rate > threshold',
        threshold: 5, // 5%
        timeWindow: 10,
        severity: 'high',
        channels: ['email', 'webhook'],
        isActive: true,
      },
      {
        id: 'websocket_connections_spike',
        name: 'WebSocket Connections Spike',
        condition: 'websocket_connections > threshold',
        threshold: 10000,
        timeWindow: 5,
        severity: 'medium',
        channels: ['email'],
        isActive: true,
      },
      {
        id: 'provider_down',
        name: 'Communication Provider Down',
        condition: 'provider_success_rate < threshold',
        threshold: 50, // 50%
        timeWindow: 5,
        severity: 'critical',
        channels: ['email', 'sms', 'webhook'],
        isActive: true,
      },
      {
        id: 'workflow_failure_rate',
        name: 'High Workflow Failure Rate',
        condition: 'workflow_failure_rate > threshold',
        threshold: 15, // 15%
        timeWindow: 30,
        severity: 'high',
        channels: ['email', 'webhook'],
        isActive: true,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Record email metrics
   */
  async recordEmailMetrics(data: {
    status: string;
    provider: string;
    template?: string;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      this.emailsTotal
        .labels(data.status, data.provider, data.template || 'unknown')
        .inc();

      // Store detailed metrics
      await this.metricsQueue.add({
        type: 'email',
        ...data,
        timestamp: new Date(),
      });

      logger.debug('Email metrics recorded', data);
    } catch (error) {
      logger.error('Failed to record email metrics', { error, data });
    }
  }

  /**
   * Record SMS metrics
   */
  async recordSMSMetrics(data: {
    status: string;
    provider: string;
    userId?: string;
    cost?: number;
    metadata?: any;
  }): Promise<void> {
    try {
      this.smsTotal.labels(data.status, data.provider).inc();

      await this.metricsQueue.add({
        type: 'sms',
        ...data,
        timestamp: new Date(),
      });

      logger.debug('SMS metrics recorded', data);
    } catch (error) {
      logger.error('Failed to record SMS metrics', { error, data });
    }
  }

  /**
   * Record push notification metrics
   */
  async recordPushMetrics(data: {
    status: string;
    platform: string;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      this.pushNotificationsTotal.labels(data.status, data.platform).inc();

      await this.metricsQueue.add({
        type: 'push',
        ...data,
        timestamp: new Date(),
      });

      logger.debug('Push notification metrics recorded', data);
    } catch (error) {
      logger.error('Failed to record push metrics', { error, data });
    }
  }

  /**
   * Record WebSocket metrics
   */
  async recordWebSocketMetrics(data: {
    type: 'connection' | 'disconnection' | 'message' | 'error';
    status?: string;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      if (data.type === 'connection') {
        this.websocketConnections.inc();
      } else if (data.type === 'disconnection') {
        this.websocketConnections.dec();
      } else if (data.type === 'message') {
        this.websocketMessages.labels(data.type, data.status || 'success').inc();
      }

      await this.metricsQueue.add({
        type: 'websocket',
        ...data,
        timestamp: new Date(),
      });

      logger.debug('WebSocket metrics recorded', data);
    } catch (error) {
      logger.error('Failed to record WebSocket metrics', { error, data });
    }
  }

  /**
   * Record workflow metrics
   */
  async recordWorkflowMetrics(data: {
    workflowType: string;
    status: string;
    duration?: number;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      this.workflowExecutions.labels(data.workflowType, data.status).inc();

      if (data.duration) {
        this.workflowDuration.labels(data.workflowType).observe(data.duration / 1000);
      }

      await this.metricsQueue.add({
        type: 'workflow',
        ...data,
        timestamp: new Date(),
      });

      logger.debug('Workflow metrics recorded', data);
    } catch (error) {
      logger.error('Failed to record workflow metrics', { error, data });
    }
  }

  /**
   * Record provider metrics
   */
  async recordProviderMetrics(data: {
    provider: string;
    operation: string;
    responseTime: number;
    status: 'success' | 'error';
    errorType?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      this.providerResponseTime
        .labels(data.provider, data.operation)
        .observe(data.responseTime / 1000);

      if (data.status === 'error') {
        this.providerErrors
          .labels(data.provider, data.errorType || 'unknown')
          .inc();
      }

      await this.metricsQueue.add({
        type: 'provider',
        ...data,
        timestamp: new Date(),
      });

      logger.debug('Provider metrics recorded', data);
    } catch (error) {
      logger.error('Failed to record provider metrics', { error, data });
    }
  }

  /**
   * Process metrics and check alert conditions
   */
  private async processMetrics(data: any): Promise<void> {
    try {
      // Store metrics in database for historical analysis
      await this.storeMetrics(data);

      // Check alert conditions
      await this.checkAlertConditions(data);
    } catch (error) {
      logger.error('Failed to process metrics', { error, data });
    }
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(data: any): Promise<void> {
    const key = CacheKeys.metricsTimeSeries(data.type, new Date());
    const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000); // 5-minute buckets

    // Aggregate metrics in Redis
    const existing = await CacheManager.get<any>(key) || {};
    
    if (data.type === 'email') {
      existing.emails = existing.emails || {};
      existing.emails[data.status] = (existing.emails[data.status] || 0) + 1;
    } else if (data.type === 'sms') {
      existing.sms = existing.sms || {};
      existing.sms[data.status] = (existing.sms[data.status] || 0) + 1;
      existing.sms.cost = (existing.sms.cost || 0) + (data.cost || 0);
    } else if (data.type === 'push') {
      existing.push = existing.push || {};
      existing.push[data.status] = (existing.push[data.status] || 0) + 1;
    } else if (data.type === 'websocket') {
      existing.websocket = existing.websocket || {};
      existing.websocket[data.type] = (existing.websocket[data.type] || 0) + 1;
    } else if (data.type === 'workflow') {
      existing.workflows = existing.workflows || {};
      existing.workflows[data.status] = (existing.workflows[data.status] || 0) + 1;
      if (data.duration) {
        existing.workflows.totalDuration = (existing.workflows.totalDuration || 0) + data.duration;
      }
    }

    await CacheManager.set(key, existing, 3600); // 1 hour TTL
  }

  /**
   * Check alert conditions
   */
  private async checkAlertConditions(data: any): Promise<void> {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.isActive) continue;

      try {
        const shouldAlert = await this.evaluateAlertCondition(rule, data);
        
        if (shouldAlert) {
          await this.alertQueue.add({
            ruleId,
            rule,
            triggerData: data,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        logger.error('Failed to check alert condition', { error, ruleId, data });
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateAlertCondition(rule: AlertRule, data: any): Promise<boolean> {
    const now = new Date();
    const timeWindowStart = new Date(now.getTime() - rule.timeWindow * 60 * 1000);

    if (rule.id === 'email_failure_rate') {
      const metrics = await this.getTimeWindowMetrics('email', timeWindowStart, now);
      const total = Object.values(metrics.emails || {}).reduce((sum: number, count: any) => sum + count, 0);
      const failed = metrics.emails?.failed || 0;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;
      return failureRate > rule.threshold;
    }

    if (rule.id === 'sms_failure_rate') {
      const metrics = await this.getTimeWindowMetrics('sms', timeWindowStart, now);
      const total = Object.values(metrics.sms || {}).reduce((sum: number, count: any) => sum + count, 0);
      const failed = metrics.sms?.failed || 0;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;
      return failureRate > rule.threshold;
    }

    if (rule.id === 'websocket_connections_spike') {
      // Use current gauge value
      const connections = await this.getCurrentWebSocketConnections();
      return connections > rule.threshold;
    }

    if (rule.id === 'provider_down') {
      const provider = data.provider;
      if (!provider) return false;
      
      const health = this.providerHealthCache.get(provider);
      return health ? health.successRate < rule.threshold : false;
    }

    if (rule.id === 'workflow_failure_rate') {
      const metrics = await this.getTimeWindowMetrics('workflow', timeWindowStart, now);
      const total = Object.values(metrics.workflows || {}).reduce((sum: number, count: any) => sum + count, 0);
      const failed = metrics.workflows?.failed || 0;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;
      return failureRate > rule.threshold;
    }

    return false;
  }

  /**
   * Process alert
   */
  private async processAlert(data: {
    ruleId: string;
    rule: AlertRule;
    triggerData: any;
    timestamp: Date;
  }): Promise<void> {
    try {
      // Check if alert was already sent recently (prevent spam)
      const alertKey = `alert:${data.ruleId}:${Math.floor(data.timestamp.getTime() / (30 * 60 * 1000))}`;
      const recentAlert = await CacheManager.get(alertKey);
      
      if (recentAlert) {
        logger.debug('Alert already sent recently, skipping', { ruleId: data.ruleId });
        return;
      }

      // Send alert via configured channels
      for (const channel of data.rule.channels) {
        await this.sendAlert(channel, data.rule, data.triggerData);
      }

      // Mark alert as sent
      await CacheManager.set(alertKey, true, 30 * 60); // 30 minutes

      logger.warn('Alert sent', {
        ruleId: data.ruleId,
        severity: data.rule.severity,
        channels: data.rule.channels,
      });
    } catch (error) {
      logger.error('Failed to process alert', { error, data });
    }
  }

  /**
   * Send alert via specific channel
   */
  private async sendAlert(channel: string, rule: AlertRule, triggerData: any): Promise<void> {
    const alertMessage = this.formatAlertMessage(rule, triggerData);

    switch (channel) {
      case 'email':
        // Use email service to send alert
        // Implementation depends on your email service
        logger.info('Sending email alert', { rule: rule.name, message: alertMessage });
        break;

      case 'sms':
        // Use SMS service to send alert
        logger.info('Sending SMS alert', { rule: rule.name, message: alertMessage });
        break;

      case 'webhook':
        await this.sendWebhookAlert(rule, triggerData, alertMessage);
        break;

      case 'slack':
        await this.sendSlackAlert(rule, triggerData, alertMessage);
        break;

      default:
        logger.warn('Unknown alert channel', { channel, rule: rule.name });
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(rule: AlertRule, triggerData: any): string {
    return `🚨 ALERT: ${rule.name}
    
Severity: ${rule.severity.toUpperCase()}
Condition: ${rule.condition}
Threshold: ${rule.threshold}
Time Window: ${rule.timeWindow} minutes

Trigger Data:
${JSON.stringify(triggerData, null, 2)}

Timestamp: ${new Date().toISOString()}`;
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(rule: AlertRule, triggerData: any, message: string): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      logger.warn('Webhook URL not configured for alerts');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert: rule.name,
          severity: rule.severity,
          message,
          trigger_data: triggerData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', { error, rule: rule.name });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(rule: AlertRule, triggerData: any, message: string): Promise<void> {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!slackWebhookUrl) {
      logger.warn('Slack webhook URL not configured for alerts');
      return;
    }

    try {
      const color = {
        low: '#36a64f',
        medium: '#ff9500',
        high: '#ff0000',
        critical: '#8b0000',
      }[rule.severity];

      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachments: [
            {
              color,
              title: `🚨 ${rule.name}`,
              text: message,
              footer: 'CastMatch Monitoring',
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack alert', { error, rule: rule.name });
    }
  }

  /**
   * Get metrics for a time window
   */
  private async getTimeWindowMetrics(type: string, start: Date, end: Date): Promise<any> {
    const buckets = [];
    const bucketSize = 5 * 60 * 1000; // 5 minutes
    
    for (let time = start.getTime(); time < end.getTime(); time += bucketSize) {
      const bucketTime = Math.floor(time / bucketSize) * bucketSize;
      const key = CacheKeys.metricsTimeSeries(type, new Date(bucketTime));
      buckets.push(key);
    }

    const metrics = await Promise.all(
      buckets.map(bucket => CacheManager.get<any>(bucket))
    );

    // Aggregate metrics
    return metrics.reduce((total, bucket) => {
      if (!bucket) return total;

      Object.keys(bucket).forEach(key => {
        if (!total[key]) total[key] = {};
        
        Object.keys(bucket[key]).forEach(subKey => {
          total[key][subKey] = (total[key][subKey] || 0) + bucket[key][subKey];
        });
      });

      return total;
    }, {});
  }

  /**
   * Start health checks for providers
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Every minute

    // Initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    const providers = ['sendgrid', 'mailgun', 'twilio', 'resend'];

    for (const provider of providers) {
      try {
        const health = await this.checkProviderHealth(provider);
        this.providerHealthCache.set(provider, health);
        
        logger.debug('Provider health check completed', {
          provider,
          status: health.status,
          responseTime: health.responseTime,
          successRate: health.successRate,
        });
      } catch (error) {
        logger.error('Provider health check failed', { error, provider });
        
        this.providerHealthCache.set(provider, {
          provider,
          status: 'down',
          responseTime: 0,
          successRate: 0,
          lastCheck: new Date(),
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    }
  }

  /**
   * Check individual provider health
   */
  private async checkProviderHealth(provider: string): Promise<ProviderHealth> {
    const startTime = Date.now();
    let status: ProviderHealth['status'] = 'healthy';
    const errors: string[] = [];

    try {
      switch (provider) {
        case 'sendgrid':
          if (process.env.SENDGRID_API_KEY) {
            // Basic API health check - just check if we can authenticate
            const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
              headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              },
            });
            if (!response.ok) {
              status = 'degraded';
              errors.push(`SendGrid API returned ${response.status}`);
            }
          } else {
            status = 'down';
            errors.push('SendGrid API key not configured');
          }
          break;

        case 'twilio':
          if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            // Check Twilio account status
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`,
              {
                headers: {
                  'Authorization': `Basic ${Buffer.from(
                    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
                  ).toString('base64')}`,
                },
              }
            );
            if (!response.ok) {
              status = 'degraded';
              errors.push(`Twilio API returned ${response.status}`);
            }
          } else {
            status = 'down';
            errors.push('Twilio credentials not configured');
          }
          break;

        // Add other provider checks as needed
      }
    } catch (error) {
      status = 'down';
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    const responseTime = Date.now() - startTime;
    
    // Calculate success rate from recent metrics
    const successRate = await this.calculateProviderSuccessRate(provider);

    return {
      provider,
      status,
      responseTime,
      successRate,
      lastCheck: new Date(),
      errors,
    };
  }

  /**
   * Calculate provider success rate
   */
  private async calculateProviderSuccessRate(provider: string): Promise<number> {
    try {
      // Get success/failure counts from recent metrics
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // This is a simplified calculation - in practice you'd query your metrics
      const successKey = `provider:${provider}:success:${Math.floor(hourAgo.getTime() / (60 * 60 * 1000))}`;
      const failureKey = `provider:${provider}:failure:${Math.floor(hourAgo.getTime() / (60 * 60 * 1000))}`;
      
      const successes = await CacheManager.get<number>(successKey) || 0;
      const failures = await CacheManager.get<number>(failureKey) || 0;
      
      const total = successes + failures;
      return total > 0 ? (successes / total) * 100 : 100;
    } catch (error) {
      logger.error('Failed to calculate provider success rate', { error, provider });
      return 100; // Assume healthy if we can't calculate
    }
  }

  /**
   * Get current WebSocket connections
   */
  private async getCurrentWebSocketConnections(): Promise<number> {
    // This would be implemented based on your WebSocket service
    // For now, return a placeholder
    return 0;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect general metrics every 30 seconds
    setInterval(async () => {
      await this.collectGeneralMetrics();
    }, 30000);

    // Collect database metrics every 5 minutes
    setInterval(async () => {
      await this.collectDatabaseMetrics();
    }, 5 * 60000);
  }

  /**
   * Collect general system metrics
   */
  private async collectGeneralMetrics(): Promise<void> {
    try {
      // Memory and CPU usage
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      await CacheManager.set(
        'system:metrics',
        {
          memory: memUsage,
          cpu: cpuUsage,
          timestamp: new Date(),
        },
        300 // 5 minutes
      );
    } catch (error) {
      logger.error('Failed to collect general metrics', error);
    }
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      const metrics = await prisma.$queryRaw<any[]>`
        SELECT 
          'notifications' as table_name,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE "isRead" = false) as unread_count,
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') as recent_count
        FROM "Notification"
        UNION ALL
        SELECT 
          'email_logs' as table_name,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE "status" = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') as recent_count
        FROM "EmailLog"
        UNION ALL
        SELECT 
          'sms_logs' as table_name,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE "status" = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '24 hours') as recent_count
        FROM "SmsLog"
      `;

      await CacheManager.set(
        'database:metrics',
        {
          tables: metrics,
          timestamp: new Date(),
        },
        300 // 5 minutes
      );
    } catch (error) {
      logger.error('Failed to collect database metrics', error);
    }
  }

  /**
   * Get comprehensive communication metrics
   */
  async getCommunicationMetrics(): Promise<CommunicationMetrics> {
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [emailMetrics, smsMetrics, pushMetrics, websocketMetrics, workflowMetrics, notificationMetrics] = await Promise.all([
        this.getTimeWindowMetrics('email', dayAgo, now),
        this.getTimeWindowMetrics('sms', dayAgo, now),
        this.getTimeWindowMetrics('push', dayAgo, now),
        this.getTimeWindowMetrics('websocket', dayAgo, now),
        this.getTimeWindowMetrics('workflow', dayAgo, now),
        this.getNotificationMetrics(),
      ]);

      return {
        emails: emailMetrics.emails || { sent: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, failed: 0 },
        sms: smsMetrics.sms || { sent: 0, delivered: 0, failed: 0, cost: 0 },
        push: pushMetrics.push || { sent: 0, delivered: 0, failed: 0, clicked: 0 },
        websocket: websocketMetrics.websocket || { connections: 0, messages: 0, rooms: 0, errors: 0 },
        workflows: {
          executed: workflowMetrics.workflows?.executed || 0,
          completed: workflowMetrics.workflows?.completed || 0,
          failed: workflowMetrics.workflows?.failed || 0,
          avgDuration: workflowMetrics.workflows?.totalDuration ? 
            workflowMetrics.workflows.totalDuration / (workflowMetrics.workflows.executed || 1) : 0,
        },
        notifications: notificationMetrics,
      };
    } catch (error) {
      logger.error('Failed to get communication metrics', error);
      throw error;
    }
  }

  /**
   * Get notification metrics from database
   */
  private async getNotificationMetrics(): Promise<CommunicationMetrics['notifications']> {
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE "isRead" = true) as read,
        COUNT(*) FILTER (WHERE "isRead" = false) as unread,
        COUNT(*) FILTER (WHERE "expiresAt" < NOW()) as expired
      FROM "Notification"
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    `;

    const metrics = results[0] || { sent: 0, read: 0, unread: 0, expired: 0 };
    
    return {
      sent: parseInt(metrics.sent),
      read: parseInt(metrics.read),
      unread: parseInt(metrics.unread),
      expired: parseInt(metrics.expired),
    };
  }

  /**
   * Get provider health status
   */
  getProviderHealthStatus(): Map<string, ProviderHealth> {
    return this.providerHealthCache;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    
    logger.info('Alert rule updated', { ruleId, updates });
  }
}

// Export singleton instance
export const communicationMonitoringService = new CommunicationMonitoringService();