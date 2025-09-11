/**
 * Integration Health Monitoring Service
 * Production-grade health monitoring with SLA tracking, anomaly detection, and comprehensive alerting
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import Redis from 'ioredis';
import Bull, { Queue, Job } from 'bull';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface IntegrationEndpoint {
  id: string;
  name: string;
  provider: string;
  type: 'api' | 'webhook' | 'oauth' | 'health';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  payload?: any;
  timeout: number;
  expectedStatus: number[];
  expectedResponseTime: number;
  healthCheckInterval: number;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  slaTargets: {
    uptime: number; // percentage (99.9)
    responseTime: number; // ms
    errorRate: number; // percentage (1.0)
  };
  alerting: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook' | 'sms')[];
    escalation: boolean;
    suppressionWindow: number; // ms
  };
}

export interface HealthCheckResult {
  endpointId: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  responseSize?: number;
  metadata?: Record<string, any>;
}

export interface IntegrationHealth {
  endpointId: string;
  name: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: {
    current: number; // percentage
    last24h: number;
    last7d: number;
    last30d: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number; // percentage
    throughput: number; // requests per minute
  };
  slaCompliance: {
    uptime: {
      target: number;
      actual: number;
      compliant: boolean;
    };
    responseTime: {
      target: number;
      actual: number;
      compliant: boolean;
    };
    errorRate: {
      target: number;
      actual: number;
      compliant: boolean;
    };
    overallScore: number; // 0-100
  };
  lastCheck: Date;
  lastSuccess: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  totalChecks: number;
  incidents: IntegrationIncident[];
  trends: {
    responseTimeDirection: 'improving' | 'stable' | 'degrading';
    uptimeDirection: 'improving' | 'stable' | 'degrading';
    errorRateDirection: 'improving' | 'stable' | 'degrading';
  };
}

export interface IntegrationIncident {
  id: string;
  endpointId: string;
  type: 'outage' | 'performance' | 'sla_breach' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // ms
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved';
  impact: {
    affectedServices: string[];
    estimatedUsers: number;
    businessImpact: 'low' | 'medium' | 'high' | 'critical';
  };
  resolution?: {
    resolvedBy: string;
    resolutionMethod: string;
    preventativeMeasures: string[];
    rootCause?: string;
  };
  alerts: IntegrationAlert[];
  timeline: IncidentTimelineEntry[];
}

export interface IntegrationAlert {
  id: string;
  incidentId?: string;
  endpointId: string;
  type: 'health_check_failure' | 'performance_degradation' | 'sla_breach' | 'anomaly_detected' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  channels: string[];
  suppressUntil?: Date;
  metadata: Record<string, any>;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: Date;
  type: 'created' | 'status_change' | 'note' | 'alert' | 'resolution';
  description: string;
  author?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  windowSize: number; // minutes
  thresholds: {
    responseTimeStdDev: number;
    errorRateChange: number;
    uptimeChange: number;
  };
}

export interface IntegrationHealthConfig {
  endpoints: IntegrationEndpoint[];
  monitoring: {
    defaultInterval: number;
    batchSize: number;
    timeout: number;
    retries: number;
  };
  storage: {
    retentionDays: number;
    compressionEnabled: boolean;
    batchInsertSize: number;
  };
  alerting: {
    defaultChannels: string[];
    escalationDelays: number[];
    suppressionWindows: Record<string, number>;
  };
  anomalyDetection: AnomalyDetectionConfig;
  sla: {
    defaultTargets: IntegrationEndpoint['slaTargets'];
    reportingInterval: number;
    breachThreshold: number;
  };
}

const DEFAULT_CONFIG: Partial<IntegrationHealthConfig> = {
  monitoring: {
    defaultInterval: 60000, // 1 minute
    batchSize: 10,
    timeout: 30000,
    retries: 3,
  },
  storage: {
    retentionDays: 90,
    compressionEnabled: true,
    batchInsertSize: 100,
  },
  alerting: {
    defaultChannels: ['email', 'webhook'],
    escalationDelays: [300000, 900000, 1800000], // 5m, 15m, 30m
    suppressionWindows: {
      'health_check_failure': 300000, // 5 minutes
      'performance_degradation': 600000, // 10 minutes
      'sla_breach': 1800000, // 30 minutes
    },
  },
  anomalyDetection: {
    enabled: true,
    sensitivity: 'medium',
    windowSize: 60, // 1 hour
    thresholds: {
      responseTimeStdDev: 2.0,
      errorRateChange: 0.05, // 5%
      uptimeChange: 0.02, // 2%
    },
  },
  sla: {
    defaultTargets: {
      uptime: 99.9,
      responseTime: 1000,
      errorRate: 1.0,
    },
    reportingInterval: 3600000, // 1 hour
    breachThreshold: 0.95, // 95%
  },
};

export class IntegrationHealthService extends EventEmitter {
  private redis: Redis;
  private healthCheckQueue: Queue<HealthCheckJob>;
  private config: IntegrationHealthConfig;
  private endpoints: Map<string, IntegrationEndpoint> = new Map();
  private healthStatus: Map<string, IntegrationHealth> = new Map();
  private incidents: Map<string, IntegrationIncident> = new Map();
  private alerts: Map<string, IntegrationAlert> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private anomalyDetectionWindow: Map<string, HealthCheckResult[]> = new Map();

  constructor(config: IntegrationHealthConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as IntegrationHealthConfig;
    this.initializeRedis();
    this.initializeQueue();
    this.loadEndpoints();
    this.startMonitoring();
    this.startAnomalyDetection();
    this.startSLAReporting();
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'health:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error in IntegrationHealth:', error);
    });

    this.redis.on('connect', () => {
      logger.info('IntegrationHealth service connected to Redis');
    });
  }

  private initializeQueue(): void {
    this.healthCheckQueue = new Bull('health-checks', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        keyPrefix: 'health:queue:',
      },
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 100,
      },
    });

    this.healthCheckQueue.process('health-check',
      this.config.monitoring.batchSize,
      this.performHealthCheck.bind(this)
    );

    this.setupQueueEventHandlers();
  }

  private setupQueueEventHandlers(): void {
    this.healthCheckQueue.on('completed', (job: Job<HealthCheckJob>, result: HealthCheckResult) => {
      this.processHealthCheckResult(result);
    });

    this.healthCheckQueue.on('failed', (job: Job<HealthCheckJob>, error) => {
      logger.error(`Health check failed: ${job.id}`, {
        endpointId: job.data.endpointId,
        error: error.message,
      });

      // Create failure result
      const failureResult: HealthCheckResult = {
        endpointId: job.data.endpointId,
        timestamp: new Date(),
        success: false,
        responseTime: 0,
        error: error.message,
      };

      this.processHealthCheckResult(failureResult);
    });
  }

  private loadEndpoints(): void {
    for (const endpoint of this.config.endpoints) {
      this.endpoints.set(endpoint.id, endpoint);
      this.initializeEndpointHealth(endpoint);
    }

    logger.info(`Loaded ${this.endpoints.size} integration endpoints for monitoring`);
  }

  private initializeEndpointHealth(endpoint: IntegrationEndpoint): void {
    const health: IntegrationHealth = {
      endpointId: endpoint.id,
      name: endpoint.name,
      provider: endpoint.provider,
      status: 'unknown',
      uptime: {
        current: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0,
      },
      performance: {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        throughput: 0,
      },
      slaCompliance: {
        uptime: {
          target: endpoint.slaTargets.uptime,
          actual: 0,
          compliant: false,
        },
        responseTime: {
          target: endpoint.slaTargets.responseTime,
          actual: 0,
          compliant: false,
        },
        errorRate: {
          target: endpoint.slaTargets.errorRate,
          actual: 0,
          compliant: false,
        },
        overallScore: 0,
      },
      lastCheck: new Date(),
      lastSuccess: new Date(),
      consecutiveFailures: 0,
      totalChecks: 0,
      incidents: [],
      trends: {
        responseTimeDirection: 'stable',
        uptimeDirection: 'stable',
        errorRateDirection: 'stable',
      },
    };

    this.healthStatus.set(endpoint.id, health);
  }

  /**
   * Add or update endpoint configuration
   */
  async addEndpoint(endpoint: IntegrationEndpoint): Promise<void> {
    this.endpoints.set(endpoint.id, endpoint);
    
    if (!this.healthStatus.has(endpoint.id)) {
      this.initializeEndpointHealth(endpoint);
    }

    await this.redis.hset(`endpoint:${endpoint.id}`, {
      config: JSON.stringify(endpoint),
      updatedAt: Date.now(),
    });

    // Start monitoring if enabled
    if (endpoint.enabled) {
      this.startEndpointMonitoring(endpoint);
    }

    logger.info(`Added/updated endpoint: ${endpoint.name}`, {
      endpointId: endpoint.id,
      provider: endpoint.provider,
    });
  }

  /**
   * Remove endpoint
   */
  async removeEndpoint(endpointId: string): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return;
    }

    // Stop monitoring
    this.stopEndpointMonitoring(endpointId);

    // Remove from maps
    this.endpoints.delete(endpointId);
    this.healthStatus.delete(endpointId);
    this.anomalyDetectionWindow.delete(endpointId);

    // Clean up Redis
    await this.redis.del(`endpoint:${endpointId}`);
    await this.redis.del(`health:${endpointId}`);

    logger.info(`Removed endpoint: ${endpoint.name}`, { endpointId });
  }

  /**
   * Start monitoring for specific endpoint
   */
  private startEndpointMonitoring(endpoint: IntegrationEndpoint): void {
    // Clear existing interval if any
    this.stopEndpointMonitoring(endpoint.id);

    const interval = setInterval(async () => {
      await this.scheduleHealthCheck(endpoint.id);
    }, endpoint.healthCheckInterval);

    this.monitoringIntervals.set(endpoint.id, interval);

    // Schedule immediate check
    this.scheduleHealthCheck(endpoint.id);

    logger.debug(`Started monitoring for endpoint: ${endpoint.name}`, {
      endpointId: endpoint.id,
      interval: endpoint.healthCheckInterval,
    });
  }

  /**
   * Stop monitoring for specific endpoint
   */
  private stopEndpointMonitoring(endpointId: string): void {
    const interval = this.monitoringIntervals.get(endpointId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(endpointId);
    }
  }

  /**
   * Schedule health check
   */
  private async scheduleHealthCheck(endpointId: string): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint || !endpoint.enabled) {
      return;
    }

    await this.healthCheckQueue.add('health-check', {
      endpointId,
      timestamp: new Date(),
    }, {
      attempts: this.config.monitoring.retries,
      delay: 0,
      priority: this.getPriorityValue(endpoint.priority),
    });
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(job: Job<HealthCheckJob>): Promise<HealthCheckResult> {
    const { endpointId, timestamp } = job.data;
    const endpoint = this.endpoints.get(endpointId);

    if (!endpoint) {
      throw new AppError(`Endpoint not found: ${endpointId}`, 404);
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      const response = await this.executeHealthCheck(endpoint);
      const responseTime = Date.now() - startTime;

      result = {
        endpointId,
        timestamp: new Date(timestamp),
        success: endpoint.expectedStatus.includes(response.status),
        responseTime,
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length,
        metadata: {
          headers: response.headers,
          responseType: typeof response.data,
        },
      };

      logger.debug(`Health check completed: ${endpoint.name}`, {
        endpointId,
        success: result.success,
        responseTime,
        statusCode: response.status,
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      result = {
        endpointId,
        timestamp: new Date(timestamp),
        success: false,
        responseTime,
        statusCode: (error as AxiosError).response?.status,
        error: error.message,
      };

      logger.warn(`Health check failed: ${endpoint.name}`, {
        endpointId,
        error: error.message,
        responseTime,
      });
    }

    return result;
  }

  /**
   * Execute HTTP health check
   */
  private async executeHealthCheck(endpoint: IntegrationEndpoint): Promise<AxiosResponse> {
    const config = {
      method: endpoint.method,
      url: endpoint.url,
      headers: endpoint.headers,
      timeout: endpoint.timeout,
      validateStatus: () => true, // Don't throw on non-2xx status
    };

    if (endpoint.payload && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      (config as any).data = endpoint.payload;
    }

    return await axios(config);
  }

  /**
   * Process health check result
   */
  private async processHealthCheckResult(result: HealthCheckResult): Promise<void> {
    const health = this.healthStatus.get(result.endpointId);
    const endpoint = this.endpoints.get(result.endpointId);

    if (!health || !endpoint) {
      return;
    }

    // Update basic stats
    health.totalChecks++;
    health.lastCheck = result.timestamp;

    if (result.success) {
      health.lastSuccess = result.timestamp;
      health.consecutiveFailures = 0;
    } else {
      health.consecutiveFailures++;
      health.lastFailure = result.timestamp;
    }

    // Store result for analysis
    await this.storeHealthCheckResult(result);
    this.addToAnomalyWindow(result);

    // Update comprehensive health metrics
    await this.updateHealthMetrics(result.endpointId);

    // Check for incidents and alerts
    await this.checkForIncidents(result);

    // Update SLA compliance
    this.updateSLACompliance(result.endpointId);

    this.emit('healthCheckCompleted', { endpoint, result, health });
  }

  /**
   * Store health check result
   */
  private async storeHealthCheckResult(result: HealthCheckResult): Promise<void> {
    const key = `results:${result.endpointId}:${this.getDateBucket(result.timestamp)}`;
    
    await this.redis.lpush(key, JSON.stringify(result));
    await this.redis.expire(key, this.config.storage.retentionDays * 24 * 60 * 60);
    
    // Store in time-series format for efficient queries
    const tsKey = `ts:${result.endpointId}`;
    await this.redis.zadd(tsKey, result.timestamp.getTime(), JSON.stringify({
      success: result.success,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
    }));
  }

  /**
   * Update comprehensive health metrics
   */
  private async updateHealthMetrics(endpointId: string): Promise<void> {
    const health = this.healthStatus.get(endpointId);
    if (!health) {
      return;
    }

    // Get recent results for analysis
    const results = await this.getRecentResults(endpointId, 1000);

    if (results.length === 0) {
      return;
    }

    // Calculate uptime metrics
    const now = Date.now();
    const last24h = results.filter(r => (now - r.timestamp.getTime()) <= 24 * 60 * 60 * 1000);
    const last7d = results.filter(r => (now - r.timestamp.getTime()) <= 7 * 24 * 60 * 60 * 1000);
    const last30d = results.filter(r => (now - r.timestamp.getTime()) <= 30 * 24 * 60 * 60 * 1000);

    health.uptime = {
      current: this.calculateUptime(results.slice(0, 100)), // Last 100 checks
      last24h: this.calculateUptime(last24h),
      last7d: this.calculateUptime(last7d),
      last30d: this.calculateUptime(last30d),
    };

    // Calculate performance metrics
    const successfulResults = results.filter(r => r.success);
    const responseTimes = successfulResults.map(r => r.responseTime);

    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      
      health.performance.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      health.performance.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      health.performance.p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
    }

    health.performance.errorRate = ((results.length - successfulResults.length) / results.length) * 100;
    health.performance.throughput = this.calculateThroughput(results);

    // Determine overall status
    health.status = this.determineHealthStatus(health);

    // Calculate trends
    health.trends = await this.calculateTrends(endpointId, results);

    // Store updated health
    await this.storeHealthStatus(health);

    this.emit('healthMetricsUpdated', { endpointId, health });
  }

  /**
   * Check for incidents and create alerts
   */
  private async checkForIncidents(result: HealthCheckResult): Promise<void> {
    const health = this.healthStatus.get(result.endpointId);
    const endpoint = this.endpoints.get(result.endpointId);

    if (!health || !endpoint) {
      return;
    }

    // Check for new outage
    if (!result.success && health.consecutiveFailures >= 3) {
      await this.createIncident({
        endpointId: result.endpointId,
        type: 'outage',
        severity: this.mapPriorityToSeverity(endpoint.priority),
        title: `${endpoint.name} is down`,
        description: `Health check has failed ${health.consecutiveFailures} consecutive times`,
        impact: {
          affectedServices: [endpoint.name],
          estimatedUsers: this.estimateAffectedUsers(endpoint),
          businessImpact: endpoint.priority,
        },
      });
    }

    // Check for performance degradation
    if (result.success && result.responseTime > endpoint.expectedResponseTime * 2) {
      await this.createAlert({
        endpointId: result.endpointId,
        type: 'performance_degradation',
        severity: 'medium',
        title: `${endpoint.name} performance degraded`,
        message: `Response time (${result.responseTime}ms) is significantly higher than expected (${endpoint.expectedResponseTime}ms)`,
        metadata: {
          responseTime: result.responseTime,
          expected: endpoint.expectedResponseTime,
          threshold: endpoint.expectedResponseTime * 2,
        },
      });
    }

    // Check for SLA breaches
    const slaBreaches = this.checkSLABreaches(health);
    for (const breach of slaBreaches) {
      await this.createAlert({
        endpointId: result.endpointId,
        type: 'sla_breach',
        severity: 'high',
        title: `SLA breach: ${breach.metric}`,
        message: `${endpoint.name} ${breach.metric} SLA breach: ${breach.actual} vs ${breach.target} target`,
        metadata: breach,
      });
    }

    // Check for recovery
    if (result.success && health.consecutiveFailures === 0) {
      const openIncidents = health.incidents.filter(i => i.status === 'open');
      
      for (const incident of openIncidents) {
        await this.resolveIncident(incident.id, {
          resolvedBy: 'system',
          resolutionMethod: 'automatic_recovery',
          preventativeMeasures: [],
        });

        await this.createAlert({
          endpointId: result.endpointId,
          type: 'recovery',
          severity: 'low',
          title: `${endpoint.name} recovered`,
          message: `Service has recovered from ${incident.type}`,
          metadata: {
            incidentId: incident.id,
            duration: Date.now() - incident.startTime.getTime(),
          },
        });
      }
    }
  }

  /**
   * Create incident
   */
  private async createIncident(incidentData: Partial<IntegrationIncident>): Promise<string> {
    // Check if similar incident already exists
    const existingIncident = Array.from(this.incidents.values()).find(incident =>
      incident.endpointId === incidentData.endpointId &&
      incident.type === incidentData.type &&
      incident.status === 'open'
    );

    if (existingIncident) {
      return existingIncident.id;
    }

    const incident: IntegrationIncident = {
      id: uuidv4(),
      endpointId: incidentData.endpointId!,
      type: incidentData.type!,
      severity: incidentData.severity!,
      title: incidentData.title!,
      description: incidentData.description!,
      startTime: new Date(),
      status: 'open',
      impact: incidentData.impact!,
      alerts: [],
      timeline: [{
        id: uuidv4(),
        timestamp: new Date(),
        type: 'created',
        description: 'Incident created',
      }],
    };

    this.incidents.set(incident.id, incident);

    // Add to endpoint health
    const health = this.healthStatus.get(incident.endpointId);
    if (health) {
      health.incidents.push(incident);
    }

    // Store in Redis
    await this.storeIncident(incident);

    logger.error(`Incident created: ${incident.title}`, {
      incidentId: incident.id,
      endpointId: incident.endpointId,
      type: incident.type,
      severity: incident.severity,
    });

    this.emit('incidentCreated', incident);

    // Create initial alert
    await this.createAlert({
      incidentId: incident.id,
      endpointId: incident.endpointId,
      type: 'health_check_failure',
      severity: incident.severity,
      title: incident.title,
      message: incident.description,
      metadata: { incidentId: incident.id },
    });

    return incident.id;
  }

  /**
   * Create alert
   */
  private async createAlert(alertData: Partial<IntegrationAlert>): Promise<string> {
    const endpoint = this.endpoints.get(alertData.endpointId!);
    if (!endpoint || !endpoint.alerting.enabled) {
      return '';
    }

    // Check suppression window
    if (await this.isAlertSuppressed(alertData.endpointId!, alertData.type!)) {
      return '';
    }

    const alert: IntegrationAlert = {
      id: uuidv4(),
      incidentId: alertData.incidentId,
      endpointId: alertData.endpointId!,
      type: alertData.type!,
      severity: alertData.severity!,
      title: alertData.title!,
      message: alertData.message!,
      timestamp: new Date(),
      acknowledged: false,
      channels: endpoint.alerting.channels,
      metadata: alertData.metadata || {},
    };

    this.alerts.set(alert.id, alert);

    // Set suppression window
    const suppressionKey = `suppression:${alert.endpointId}:${alert.type}`;
    const suppressionWindow = this.config.alerting.suppressionWindows[alert.type] ||
                              endpoint.alerting.suppressionWindow;
    
    await this.redis.setex(suppressionKey, Math.floor(suppressionWindow / 1000), '1');

    // Store alert
    await this.storeAlert(alert);

    // Add to incident if applicable
    if (alert.incidentId) {
      const incident = this.incidents.get(alert.incidentId);
      if (incident) {
        incident.alerts.push(alert);
        incident.timeline.push({
          id: uuidv4(),
          timestamp: new Date(),
          type: 'alert',
          description: `Alert created: ${alert.title}`,
          metadata: { alertId: alert.id },
        });
        await this.storeIncident(incident);
      }
    }

    logger.warn(`Alert created: ${alert.title}`, {
      alertId: alert.id,
      endpointId: alert.endpointId,
      type: alert.type,
      severity: alert.severity,
    });

    this.emit('alertCreated', alert);

    // Send alert via configured channels
    await this.sendAlert(alert);

    return alert.id;
  }

  /**
   * Send alert via configured channels
   */
  private async sendAlert(alert: IntegrationAlert): Promise<void> {
    const endpoint = this.endpoints.get(alert.endpointId);
    if (!endpoint) {
      return;
    }

    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert, endpoint);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, endpoint);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, endpoint);
            break;
          case 'sms':
            await this.sendSMSAlert(alert, endpoint);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send alert via ${channel}:`, error);
      }
    }
  }

  // Helper methods
  private calculateUptime(results: HealthCheckResult[]): number {
    if (results.length === 0) return 0;
    const successful = results.filter(r => r.success).length;
    return (successful / results.length) * 100;
  }

  private calculateThroughput(results: HealthCheckResult[]): number {
    if (results.length < 2) return 0;
    const timeSpan = results[0].timestamp.getTime() - results[results.length - 1].timestamp.getTime();
    return (results.length / timeSpan) * 60000; // requests per minute
  }

  private determineHealthStatus(health: IntegrationHealth): IntegrationHealth['status'] {
    if (health.consecutiveFailures >= 5) return 'unhealthy';
    if (health.consecutiveFailures >= 2) return 'degraded';
    if (health.uptime.current >= 99) return 'healthy';
    if (health.uptime.current >= 95) return 'degraded';
    return 'unhealthy';
  }

  private async calculateTrends(endpointId: string, results: HealthCheckResult[]): Promise<IntegrationHealth['trends']> {
    // Implement trend calculation logic
    return {
      responseTimeDirection: 'stable',
      uptimeDirection: 'stable',
      errorRateDirection: 'stable',
    };
  }

  private checkSLABreaches(health: IntegrationHealth): Array<{ metric: string; actual: number; target: number }> {
    const breaches = [];

    if (!health.slaCompliance.uptime.compliant) {
      breaches.push({
        metric: 'uptime',
        actual: health.slaCompliance.uptime.actual,
        target: health.slaCompliance.uptime.target,
      });
    }

    if (!health.slaCompliance.responseTime.compliant) {
      breaches.push({
        metric: 'response_time',
        actual: health.slaCompliance.responseTime.actual,
        target: health.slaCompliance.responseTime.target,
      });
    }

    if (!health.slaCompliance.errorRate.compliant) {
      breaches.push({
        metric: 'error_rate',
        actual: health.slaCompliance.errorRate.actual,
        target: health.slaCompliance.errorRate.target,
      });
    }

    return breaches;
  }

  private updateSLACompliance(endpointId: string): void {
    const health = this.healthStatus.get(endpointId);
    const endpoint = this.endpoints.get(endpointId);

    if (!health || !endpoint) {
      return;
    }

    health.slaCompliance = {
      uptime: {
        target: endpoint.slaTargets.uptime,
        actual: health.uptime.current,
        compliant: health.uptime.current >= endpoint.slaTargets.uptime,
      },
      responseTime: {
        target: endpoint.slaTargets.responseTime,
        actual: health.performance.averageResponseTime,
        compliant: health.performance.averageResponseTime <= endpoint.slaTargets.responseTime,
      },
      errorRate: {
        target: endpoint.slaTargets.errorRate,
        actual: health.performance.errorRate,
        compliant: health.performance.errorRate <= endpoint.slaTargets.errorRate,
      },
      overallScore: 0,
    };

    // Calculate overall SLA score
    const scores = [
      health.slaCompliance.uptime.compliant ? 100 : 0,
      health.slaCompliance.responseTime.compliant ? 100 : 0,
      health.slaCompliance.errorRate.compliant ? 100 : 0,
    ];

    health.slaCompliance.overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Storage methods
  private async storeHealthStatus(health: IntegrationHealth): Promise<void> {
    await this.redis.hset(`health:${health.endpointId}`, {
      data: JSON.stringify(health),
      updatedAt: Date.now(),
    });
  }

  private async storeIncident(incident: IntegrationIncident): Promise<void> {
    await this.redis.hset(`incident:${incident.id}`, {
      data: JSON.stringify(incident),
      updatedAt: Date.now(),
    });
  }

  private async storeAlert(alert: IntegrationAlert): Promise<void> {
    await this.redis.hset(`alert:${alert.id}`, {
      data: JSON.stringify(alert),
      timestamp: alert.timestamp.getTime(),
    });
  }

  // Additional helper methods would be implemented here...

  private getPriorityValue(priority: string): number {
    const values = { low: 1, medium: 2, high: 3, critical: 4 };
    return values[priority as keyof typeof values] || 2;
  }

  private mapPriorityToSeverity(priority: string): IntegrationIncident['severity'] {
    const mapping = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' };
    return mapping[priority as keyof typeof mapping] as IntegrationIncident['severity'] || 'medium';
  }

  private estimateAffectedUsers(endpoint: IntegrationEndpoint): number {
    // Simple estimation based on endpoint type and priority
    const baseUsers = { low: 100, medium: 500, high: 1000, critical: 5000 };
    return baseUsers[endpoint.priority] || 500;
  }

  private getDateBucket(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private async getRecentResults(endpointId: string, limit: number): Promise<HealthCheckResult[]> {
    const keys = await this.redis.keys(`results:${endpointId}:*`);
    const results: HealthCheckResult[] = [];

    for (const key of keys.slice(0, 10)) { // Limit to recent days
      const items = await this.redis.lrange(key, 0, limit);
      for (const item of items) {
        results.push(JSON.parse(item));
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async isAlertSuppressed(endpointId: string, alertType: string): Promise<boolean> {
    const suppressionKey = `suppression:${endpointId}:${alertType}`;
    const suppressed = await this.redis.get(suppressionKey);
    return !!suppressed;
  }

  private addToAnomalyWindow(result: HealthCheckResult): void {
    if (!this.config.anomalyDetection.enabled) {
      return;
    }

    const window = this.anomalyDetectionWindow.get(result.endpointId) || [];
    window.unshift(result);

    // Keep only recent results for anomaly detection
    const windowSize = this.config.anomalyDetection.windowSize * 60; // Convert to seconds
    const cutoff = Date.now() - (windowSize * 1000);
    
    const filteredWindow = window.filter(r => r.timestamp.getTime() >= cutoff);
    this.anomalyDetectionWindow.set(result.endpointId, filteredWindow);
  }

  // Alert channel implementations (stubs - would integrate with actual services)
  private async sendEmailAlert(alert: IntegrationAlert, endpoint: IntegrationEndpoint): Promise<void> {
    logger.info(`Sending email alert: ${alert.title}`);
  }

  private async sendSlackAlert(alert: IntegrationAlert, endpoint: IntegrationEndpoint): Promise<void> {
    logger.info(`Sending Slack alert: ${alert.title}`);
  }

  private async sendWebhookAlert(alert: IntegrationAlert, endpoint: IntegrationEndpoint): Promise<void> {
    logger.info(`Sending webhook alert: ${alert.title}`);
  }

  private async sendSMSAlert(alert: IntegrationAlert, endpoint: IntegrationEndpoint): Promise<void> {
    logger.info(`Sending SMS alert: ${alert.title}`);
  }

  private async resolveIncident(incidentId: string, resolution: IntegrationIncident['resolution']): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return;
    }

    incident.status = 'resolved';
    incident.endTime = new Date();
    incident.duration = incident.endTime.getTime() - incident.startTime.getTime();
    incident.resolution = resolution;

    incident.timeline.push({
      id: uuidv4(),
      timestamp: new Date(),
      type: 'resolution',
      description: 'Incident resolved',
      author: resolution.resolvedBy,
      metadata: { method: resolution.resolutionMethod },
    });

    await this.storeIncident(incident);

    logger.info(`Incident resolved: ${incident.title}`, {
      incidentId,
      duration: incident.duration,
      method: resolution.resolutionMethod,
    });

    this.emit('incidentResolved', incident);
  }

  /**
   * Public API methods
   */
  async getHealthStatus(endpointId?: string): Promise<IntegrationHealth | IntegrationHealth[]> {
    if (endpointId) {
      const health = this.healthStatus.get(endpointId);
      if (!health) {
        throw new AppError(`Health status not found for endpoint: ${endpointId}`, 404);
      }
      return health;
    }

    return Array.from(this.healthStatus.values());
  }

  async getIncidents(options: {
    endpointId?: string;
    status?: string;
    severity?: string;
    limit?: number;
  } = {}): Promise<IntegrationIncident[]> {
    let incidents = Array.from(this.incidents.values());

    if (options.endpointId) {
      incidents = incidents.filter(i => i.endpointId === options.endpointId);
    }
    if (options.status) {
      incidents = incidents.filter(i => i.status === options.status);
    }
    if (options.severity) {
      incidents = incidents.filter(i => i.severity === options.severity);
    }

    incidents.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (options.limit) {
      incidents = incidents.slice(0, options.limit);
    }

    return incidents;
  }

  async getAlerts(options: {
    endpointId?: string;
    acknowledged?: boolean;
    severity?: string;
    limit?: number;
  } = {}): Promise<IntegrationAlert[]> {
    let alerts = Array.from(this.alerts.values());

    if (options.endpointId) {
      alerts = alerts.filter(a => a.endpointId === options.endpointId);
    }
    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }
    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  private startMonitoring(): void {
    for (const endpoint of this.endpoints.values()) {
      if (endpoint.enabled) {
        this.startEndpointMonitoring(endpoint);
      }
    }

    logger.info('Integration health monitoring started');
  }

  private startAnomalyDetection(): void {
    // Implementation for anomaly detection
    setInterval(async () => {
      if (!this.config.anomalyDetection.enabled) {
        return;
      }

      for (const [endpointId, results] of this.anomalyDetectionWindow.entries()) {
        await this.detectAnomalies(endpointId, results);
      }
    }, 60000); // Check every minute
  }

  private async detectAnomalies(endpointId: string, results: HealthCheckResult[]): Promise<void> {
    // Implementation for anomaly detection
    // This would use statistical methods to detect unusual patterns
  }

  private startSLAReporting(): void {
    setInterval(async () => {
      await this.generateSLAReports();
    }, this.config.sla.reportingInterval);
  }

  private async generateSLAReports(): Promise<void> {
    // Generate and store SLA compliance reports
    for (const [endpointId, health] of this.healthStatus.entries()) {
      const report = {
        endpointId,
        timestamp: new Date(),
        compliance: health.slaCompliance,
        uptime: health.uptime,
        performance: health.performance,
      };

      await this.redis.lpush(`sla-reports:${endpointId}`, JSON.stringify(report));
      await this.redis.ltrim(`sla-reports:${endpointId}`, 0, 100); // Keep last 100 reports
    }
  }

  /**
   * Stop monitoring service
   */
  async stop(): Promise<void> {
    // Stop all monitoring intervals
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }

    // Close queue
    await this.healthCheckQueue.close();

    // Disconnect Redis
    this.redis.disconnect();

    logger.info('Integration health monitoring service stopped');
  }
}

// Job type for health check queue
interface HealthCheckJob {
  endpointId: string;
  timestamp: Date;
}

export default IntegrationHealthService;