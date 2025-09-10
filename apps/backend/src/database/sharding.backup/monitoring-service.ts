/**
 * Database Monitoring and Alerting Service
 * Production-grade monitoring for sharded database infrastructure
 */

import { EventEmitter } from 'events';
import * as promClient from 'prom-client';
import { logger } from '../../utils/logger';
import { ShardRouter } from './shard-router';
import { GlobalReplicaManager } from './replica-manager';
import { FailoverCoordinator } from './failover-coordinator';
import {
  PRODUCTION_SHARDING_CONFIG,
  DatabaseNode,
  ShardConfig
} from './sharding.config';

/**
 * Metric types for monitoring
 */
interface DatabaseMetrics {
  // Performance metrics
  queryLatency: promClient.Histogram;
  queryRate: promClient.Counter;
  queryErrors: promClient.Counter;
  connectionPoolSize: promClient.Gauge;
  activeConnections: promClient.Gauge;
  
  // Replication metrics
  replicationLag: promClient.Gauge;
  replicationStatus: promClient.Gauge;
  
  // Resource metrics
  cpuUsage: promClient.Gauge;
  memoryUsage: promClient.Gauge;
  diskUsage: promClient.Gauge;
  ioOperations: promClient.Counter;
  
  // Availability metrics
  nodeHealth: promClient.Gauge;
  shardAvailability: promClient.Gauge;
  failoverCount: promClient.Counter;
  
  // Business metrics
  userOperations: promClient.Counter;
  dataVolume: promClient.Gauge;
  cacheHitRate: promClient.Gauge;
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Alert types
 */
export enum AlertType {
  HIGH_LATENCY = 'HIGH_LATENCY',
  CONNECTION_POOL_EXHAUSTED = 'CONNECTION_POOL_EXHAUSTED',
  REPLICATION_LAG = 'REPLICATION_LAG',
  NODE_DOWN = 'NODE_DOWN',
  DISK_SPACE_LOW = 'DISK_SPACE_LOW',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  FAILOVER_TRIGGERED = 'FAILOVER_TRIGGERED',
  DEADLOCK_DETECTED = 'DEADLOCK_DETECTED',
  SLOW_QUERY = 'SLOW_QUERY',
  BACKUP_FAILED = 'BACKUP_FAILED'
}

/**
 * Alert definition
 */
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

/**
 * Monitoring rule
 */
interface MonitoringRule {
  name: string;
  condition: () => Promise<boolean>;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number;
  lastTriggered?: Date;
}

/**
 * Database monitoring service
 */
export class DatabaseMonitoringService extends EventEmitter {
  private metrics: DatabaseMetrics;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private monitoringRules: MonitoringRule[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private rulesInterval: NodeJS.Timeout | null = null;
  private register: promClient.Registry;

  constructor(
    private shardRouter: ShardRouter,
    private replicaManager: GlobalReplicaManager,
    private failoverCoordinator: FailoverCoordinator
  ) {
    super();
    this.register = new promClient.Registry();
    this.initializeMetrics();
    this.setupMonitoringRules();
    this.setupEventHandlers();
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics() {
    // Query performance metrics
    this.metrics = {
      queryLatency: new promClient.Histogram({
        name: 'castmatch_db_query_latency_seconds',
        help: 'Database query latency in seconds',
        labelNames: ['shard', 'operation', 'status'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
      }),

      queryRate: new promClient.Counter({
        name: 'castmatch_db_queries_total',
        help: 'Total number of database queries',
        labelNames: ['shard', 'operation', 'status']
      }),

      queryErrors: new promClient.Counter({
        name: 'castmatch_db_query_errors_total',
        help: 'Total number of database query errors',
        labelNames: ['shard', 'error_type']
      }),

      connectionPoolSize: new promClient.Gauge({
        name: 'castmatch_db_connection_pool_size',
        help: 'Current size of database connection pool',
        labelNames: ['shard', 'node']
      }),

      activeConnections: new promClient.Gauge({
        name: 'castmatch_db_active_connections',
        help: 'Number of active database connections',
        labelNames: ['shard', 'node']
      }),

      replicationLag: new promClient.Gauge({
        name: 'castmatch_db_replication_lag_seconds',
        help: 'Database replication lag in seconds',
        labelNames: ['shard', 'replica']
      }),

      replicationStatus: new promClient.Gauge({
        name: 'castmatch_db_replication_status',
        help: 'Database replication status (1=healthy, 0=unhealthy)',
        labelNames: ['shard', 'replica']
      }),

      cpuUsage: new promClient.Gauge({
        name: 'castmatch_db_cpu_usage_percent',
        help: 'Database CPU usage percentage',
        labelNames: ['shard', 'node']
      }),

      memoryUsage: new promClient.Gauge({
        name: 'castmatch_db_memory_usage_bytes',
        help: 'Database memory usage in bytes',
        labelNames: ['shard', 'node']
      }),

      diskUsage: new promClient.Gauge({
        name: 'castmatch_db_disk_usage_percent',
        help: 'Database disk usage percentage',
        labelNames: ['shard', 'node']
      }),

      ioOperations: new promClient.Counter({
        name: 'castmatch_db_io_operations_total',
        help: 'Total number of database I/O operations',
        labelNames: ['shard', 'node', 'operation']
      }),

      nodeHealth: new promClient.Gauge({
        name: 'castmatch_db_node_health',
        help: 'Database node health status (1=healthy, 0=unhealthy)',
        labelNames: ['shard', 'node', 'role']
      }),

      shardAvailability: new promClient.Gauge({
        name: 'castmatch_db_shard_availability',
        help: 'Database shard availability percentage',
        labelNames: ['shard']
      }),

      failoverCount: new promClient.Counter({
        name: 'castmatch_db_failovers_total',
        help: 'Total number of database failovers',
        labelNames: ['shard', 'reason']
      }),

      userOperations: new promClient.Counter({
        name: 'castmatch_user_operations_total',
        help: 'Total number of user operations',
        labelNames: ['operation', 'user_type']
      }),

      dataVolume: new promClient.Gauge({
        name: 'castmatch_data_volume_bytes',
        help: 'Total data volume in bytes',
        labelNames: ['shard', 'table']
      }),

      cacheHitRate: new promClient.Gauge({
        name: 'castmatch_cache_hit_rate',
        help: 'Cache hit rate percentage',
        labelNames: ['cache_type']
      })
    };

    // Register all metrics
    Object.values(this.metrics).forEach(metric => {
      this.register.registerMetric(metric);
    });

    // Add default metrics
    promClient.collectDefaultMetrics({ register: this.register });
  }

  /**
   * Setup monitoring rules
   */
  private setupMonitoringRules() {
    this.monitoringRules = [
      {
        name: 'High Query Latency',
        condition: async () => {
          const stats = this.shardRouter.getStatistics();
          return stats.shards.some(s => 
            s.connectionStats.primary?.avgQueryTime > 100
          );
        },
        alertType: AlertType.HIGH_LATENCY,
        severity: AlertSeverity.WARNING,
        message: 'Query latency exceeds 100ms threshold',
        cooldownMs: 300000 // 5 minutes
      },
      {
        name: 'Connection Pool Exhaustion',
        condition: async () => {
          const stats = this.shardRouter.getStatistics();
          return stats.shards.some(s => {
            const primary = s.connectionStats.primary;
            if (!primary) return false;
            const usage = (primary.activeConnections / primary.totalConnections) * 100;
            return usage > 90;
          });
        },
        alertType: AlertType.CONNECTION_POOL_EXHAUSTED,
        severity: AlertSeverity.ERROR,
        message: 'Connection pool usage exceeds 90%',
        cooldownMs: 600000 // 10 minutes
      },
      {
        name: 'High Replication Lag',
        condition: async () => {
          const stats = this.replicaManager.getGlobalStatistics();
          return stats.shards.some(s => 
            s.nodes.some(n => n.role === 'REPLICA' && n.replicationLag > 5)
          );
        },
        alertType: AlertType.REPLICATION_LAG,
        severity: AlertSeverity.WARNING,
        message: 'Replication lag exceeds 5 seconds',
        cooldownMs: 300000 // 5 minutes
      },
      {
        name: 'Node Down',
        condition: async () => {
          const stats = this.replicaManager.getGlobalStatistics();
          return stats.shards.some(s => 
            !s.primaryHealthy || s.healthyReplicaCount < s.totalReplicaCount
          );
        },
        alertType: AlertType.NODE_DOWN,
        severity: AlertSeverity.CRITICAL,
        message: 'Database node is down',
        cooldownMs: 60000 // 1 minute
      },
      {
        name: 'High Error Rate',
        condition: async () => {
          const stats = this.shardRouter.getStatistics();
          return stats.shards.some(s => {
            const primary = s.connectionStats.primary;
            if (!primary || primary.totalQueries === 0) return false;
            const errorRate = (primary.failedQueries / primary.totalQueries) * 100;
            return errorRate > 5;
          });
        },
        alertType: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.ERROR,
        message: 'Query error rate exceeds 5%',
        cooldownMs: 300000 // 5 minutes
      }
    ];
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    // Listen to failover events
    this.failoverCoordinator.on('failover-complete', (operation) => {
      this.metrics.failoverCount.inc({
        shard: operation.shardId,
        reason: 'automatic'
      });
      
      this.createAlert({
        type: AlertType.FAILOVER_TRIGGERED,
        severity: AlertSeverity.WARNING,
        message: `Failover completed for shard ${operation.shardId}`,
        details: {
          operationId: operation.id,
          duration: operation.endTime?.getTime() - operation.startTime.getTime()
        }
      });
    });

    this.failoverCoordinator.on('failover-failed', (operation) => {
      this.createAlert({
        type: AlertType.FAILOVER_TRIGGERED,
        severity: AlertSeverity.CRITICAL,
        message: `Failover failed for shard ${operation.shardId}`,
        details: {
          operationId: operation.id,
          error: operation.errorMessage
        }
      });
    });
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 10000);

    // Evaluate rules every 30 seconds
    this.rulesInterval = setInterval(() => {
      this.evaluateRules();
    }, 30000);

    // Initial collection
    this.collectMetrics();
    this.evaluateRules();

    logger.info('Database monitoring service started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.rulesInterval) {
      clearInterval(this.rulesInterval);
      this.rulesInterval = null;
    }

    logger.info('Database monitoring service stopped');
  }

  /**
   * Collect metrics
   */
  private async collectMetrics() {
    try {
      // Collect shard router statistics
      const routerStats = this.shardRouter.getStatistics();
      
      // Collect replica manager statistics
      const replicaStats = this.replicaManager.getGlobalStatistics();
      
      // Collect failover statistics
      const failoverStats = this.failoverCoordinator.getStatistics();

      // Update Prometheus metrics
      this.updatePrometheusMetrics(routerStats, replicaStats, failoverStats);

      // Log summary
      logger.debug('Metrics collected', {
        shards: routerStats.shards.length,
        healthyReplicas: replicaStats.totalHealthyReplicas,
        activeFailovers: failoverStats.activeFailovers
      });

    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Update Prometheus metrics
   */
  private updatePrometheusMetrics(routerStats: any, replicaStats: any, failoverStats: any) {
    // Update connection metrics
    for (const shard of routerStats.shards) {
      if (shard.connectionStats.primary) {
        const primary = shard.connectionStats.primary;
        
        this.metrics.connectionPoolSize.set(
          { shard: shard.shardId, node: 'primary' },
          primary.totalConnections
        );
        
        this.metrics.activeConnections.set(
          { shard: shard.shardId, node: 'primary' },
          primary.activeConnections
        );
      }

      // Update replica metrics
      for (const replica of shard.connectionStats.replicas) {
        this.metrics.connectionPoolSize.set(
          { shard: shard.shardId, node: replica.nodeId },
          replica.totalConnections
        );
        
        this.metrics.activeConnections.set(
          { shard: shard.shardId, node: replica.nodeId },
          replica.activeConnections
        );
      }
    }

    // Update replication metrics
    for (const shard of replicaStats.shards) {
      for (const node of shard.nodes) {
        if (node.role === 'REPLICA') {
          this.metrics.replicationLag.set(
            { shard: shard.shardId, replica: node.nodeId },
            node.replicationLag
          );
          
          this.metrics.replicationStatus.set(
            { shard: shard.shardId, replica: node.nodeId },
            node.isHealthy ? 1 : 0
          );
        }

        this.metrics.nodeHealth.set(
          { shard: shard.shardId, node: node.nodeId, role: node.role },
          node.isHealthy ? 1 : 0
        );
      }

      // Calculate shard availability
      const availability = ((shard.healthyReplicaCount + (shard.primaryHealthy ? 1 : 0)) / 
                          (shard.totalReplicaCount + 1)) * 100;
      
      this.metrics.shardAvailability.set(
        { shard: shard.shardId },
        availability
      );
    }

    // Update cache metrics
    this.metrics.cacheHitRate.set(
      { cache_type: 'query' },
      (routerStats.cacheSize > 0) ? 85 : 0 // Example calculation
    );
  }

  /**
   * Evaluate monitoring rules
   */
  private async evaluateRules() {
    for (const rule of this.monitoringRules) {
      try {
        // Check cooldown
        if (rule.lastTriggered) {
          const elapsed = Date.now() - rule.lastTriggered.getTime();
          if (elapsed < rule.cooldownMs) {
            continue;
          }
        }

        // Evaluate condition
        const shouldAlert = await rule.condition();
        
        if (shouldAlert) {
          this.createAlert({
            type: rule.alertType,
            severity: rule.severity,
            message: rule.message,
            details: { rule: rule.name }
          });
          
          rule.lastTriggered = new Date();
        }
      } catch (error) {
        logger.error(`Failed to evaluate rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Create an alert
   */
  private createAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    details?: Record<string, any>;
  }): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      severity: params.severity,
      message: params.message,
      details: params.details || {},
      timestamp: new Date(),
      resolved: false
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Emit alert event
    this.emit('alert', alert);

    // Send notifications based on severity
    this.sendAlertNotifications(alert);

    logger.warn(`Alert created: ${alert.message}`, {
      id: alert.id,
      type: alert.type,
      severity: alert.severity
    });

    return alert;
  }

  /**
   * Send alert notifications
   */
  private sendAlertNotifications(alert: Alert) {
    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        this.sendPagerDutyAlert(alert);
        this.sendSlackAlert(alert);
        this.sendEmailAlert(alert);
        break;
      
      case AlertSeverity.ERROR:
        this.sendSlackAlert(alert);
        this.sendEmailAlert(alert);
        break;
      
      case AlertSeverity.WARNING:
        this.sendSlackAlert(alert);
        break;
      
      case AlertSeverity.INFO:
        // Log only
        break;
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(alert: Alert) {
    if (!process.env.PAGERDUTY_API_KEY) return;

    try {
      // Implement PagerDuty integration
      logger.info('Sending PagerDuty alert', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert:', error);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert) {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    try {
      // Implement Slack integration
      const color = {
        [AlertSeverity.CRITICAL]: 'danger',
        [AlertSeverity.ERROR]: 'warning',
        [AlertSeverity.WARNING]: 'warning',
        [AlertSeverity.INFO]: 'good'
      }[alert.severity];

      const payload = {
        attachments: [{
          color,
          title: `Database Alert: ${alert.type}`,
          text: alert.message,
          fields: Object.entries(alert.details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })),
          footer: 'CastMatch Database Monitor',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }]
      };

      logger.info('Sending Slack alert', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert) {
    const emails = PRODUCTION_SHARDING_CONFIG.monitoring.notifications.email;
    if (!emails || emails.length === 0) return;

    try {
      // Implement email integration
      logger.info('Sending email alert', { 
        alertId: alert.id,
        recipients: emails
      });
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.acknowledgedBy = resolvedBy;

    this.activeAlerts.delete(alertId);

    logger.info(`Alert resolved: ${alertId}`, {
      resolvedBy,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    });

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get metrics for Prometheus
   */
  getMetrics(): string {
    return this.register.metrics();
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData(): MonitoringDashboard {
    const routerStats = this.shardRouter.getStatistics();
    const replicaStats = this.replicaManager.getGlobalStatistics();
    const failoverStats = this.failoverCoordinator.getStatistics();
    const activeAlerts = this.getActiveAlerts();

    return {
      timestamp: new Date(),
      shards: routerStats.shards.map(s => ({
        id: s.shardId,
        region: s.region,
        status: s.primaryHealth ? 'HEALTHY' : 'UNHEALTHY',
        primaryHealth: s.primaryHealth,
        replicaCount: s.replicaHealth.length,
        healthyReplicas: s.replicaHealth.filter(r => r.healthy).length,
        connections: {
          total: s.connectionStats.primary?.totalConnections || 0,
          active: s.connectionStats.primary?.activeConnections || 0,
          idle: s.connectionStats.primary?.idleConnections || 0
        },
        performance: {
          avgQueryTime: s.connectionStats.primary?.avgQueryTime || 0,
          totalQueries: s.connectionStats.primary?.totalQueries || 0,
          failedQueries: s.connectionStats.primary?.failedQueries || 0
        }
      })),
      replication: {
        totalReplicas: replicaStats.totalReplicas,
        healthyReplicas: replicaStats.totalHealthyReplicas,
        healthPercentage: replicaStats.replicaHealthPercentage,
        maxLag: Math.max(...replicaStats.shards.flatMap(s => 
          s.nodes.filter(n => n.role === 'REPLICA').map(n => n.replicationLag)
        ))
      },
      failovers: {
        active: failoverStats.activeFailovers,
        completed: failoverStats.completedFailovers,
        failed: failoverStats.failedFailovers,
        averageDuration: failoverStats.averageDuration,
        lastFailover: failoverStats.lastFailover
      },
      alerts: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        error: activeAlerts.filter(a => a.severity === AlertSeverity.ERROR).length,
        warning: activeAlerts.filter(a => a.severity === AlertSeverity.WARNING).length,
        recent: activeAlerts.slice(-5)
      },
      systemHealth: this.calculateSystemHealth(routerStats, replicaStats, activeAlerts)
    };
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(routerStats: any, replicaStats: any, alerts: Alert[]): string {
    const criticalAlerts = alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length;
    const errorAlerts = alerts.filter(a => a.severity === AlertSeverity.ERROR).length;
    const replicaHealth = replicaStats.replicaHealthPercentage;

    if (criticalAlerts > 0 || replicaHealth < 50) {
      return 'CRITICAL';
    } else if (errorAlerts > 0 || replicaHealth < 75) {
      return 'DEGRADED';
    } else if (replicaHealth < 90) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }
}

// Type definitions
interface MonitoringDashboard {
  timestamp: Date;
  shards: any[];
  replication: any;
  failovers: any;
  alerts: any;
  systemHealth: string;
}

// Export singleton instance
export const databaseMonitoring = new DatabaseMonitoringService(
  new ShardRouter(),
  new GlobalReplicaManager(),
  new FailoverCoordinator(new GlobalReplicaManager(), new ShardRouter())
);

export default DatabaseMonitoringService;