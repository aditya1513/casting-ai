import axios from 'axios';
import { logger } from '../../config/logger';
import { AgentStatus, AgentMetrics, AgentTask, BackendAgentConfig, AgentStatusType, HealthStatus } from '../types';
import { BaseAgentMonitor } from './BaseAgentMonitor';

export class BackendApiMonitor extends BaseAgentMonitor {
  private healthCheckAttempts: number = 0;
  private lastResponseTime: number = 0;
  private apiEndpoints: Set<string> = new Set();
  private databaseConnected: boolean = false;
  private authMiddlewareActive: boolean = false;

  constructor(private config: BackendAgentConfig) {
    super();
    this.initializeApiEndpoints();
  }

  private initializeApiEndpoints(): void {
    // Define critical API endpoints to monitor
    this.apiEndpoints = new Set([
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/profiles',
      '/api/castings',
      '/api/matches',
      '/api/notifications',
      '/api/uploads',
      ...this.config.criticalEndpoints
    ]);
  }

  async checkStatus(): Promise<Partial<AgentStatus>> {
    const startTime = Date.now();
    
    try {
      // 1. Health Check
      const healthStatus = await this.performHealthCheck();
      
      // 2. Database Connectivity Check
      const dbStatus = await this.checkDatabaseConnection();
      
      // 3. Authentication Middleware Check
      const authStatus = await this.checkAuthenticationMiddleware();
      
      // 4. API Endpoints Check
      const endpointsStatus = await this.checkApiEndpoints();
      
      // 5. Service Dependencies Check
      const servicesStatus = await this.checkServiceDependencies();

      this.lastResponseTime = Date.now() - startTime;
      this.healthCheckAttempts = 0;

      const overallHealth = this.calculateOverallHealth([
        healthStatus,
        dbStatus,
        authStatus,
        endpointsStatus,
        servicesStatus
      ]);

      const activeTask = await this.getCurrentTask();
      const progress = this.calculateProgress();

      return {
        status: overallHealth.status,
        health: overallHealth.health,
        activeTask,
        progress,
        blockers: await this.detectBlockers(),
        performance: {
          responseTime: this.lastResponseTime,
          throughput: await this.calculateThroughput(),
          errorRate: await this.calculateErrorRate(),
          uptime: await this.calculateUptime()
        },
        errorMessages: overallHealth.errors
      };

    } catch (error) {
      this.healthCheckAttempts++;
      logger.error('❌ Backend API Monitor: Health check failed', error);
      
      return {
        status: 'ERROR' as AgentStatusType,
        health: 'UNHEALTHY' as HealthStatus,
        performance: {
          responseTime: Date.now() - startTime,
          throughput: 0,
          errorRate: 1.0,
          uptime: 0
        },
        errorMessages: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async performHealthCheck(): Promise<{ status: boolean; errors: string[] }> {
    try {
      const response = await axios.get(`${this.config.apiEndpoint}${this.config.healthCheckPath}`, {
        timeout: 5000
      });

      if (response.status === 200) {
        return { status: true, errors: [] };
      } else {
        return { status: false, errors: [`Health check returned status ${response.status}`] };
      }
    } catch (error) {
      return { 
        status: false, 
        errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkDatabaseConnection(): Promise<{ status: boolean; errors: string[] }> {
    try {
      // Check database connectivity through a lightweight endpoint
      const response = await axios.get(`${this.config.apiEndpoint}/api/health/db`, {
        timeout: 3000
      });

      this.databaseConnected = response.status === 200 && response.data.connected === true;
      
      if (this.databaseConnected) {
        return { status: true, errors: [] };
      } else {
        return { status: false, errors: ['Database connection failed'] };
      }
    } catch (error) {
      this.databaseConnected = false;
      return { 
        status: false, 
        errors: [`Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkAuthenticationMiddleware(): Promise<{ status: boolean; errors: string[] }> {
    try {
      // Test protected endpoint without auth (should return 401)
      const response = await axios.get(`${this.config.apiEndpoint}/api/profiles`, {
        timeout: 3000,
        validateStatus: (status) => status === 401 || status === 200
      });

      this.authMiddlewareActive = response.status === 401;
      
      if (this.authMiddlewareActive) {
        return { status: true, errors: [] };
      } else {
        return { status: false, errors: ['Authentication middleware not properly configured'] };
      }
    } catch (error) {
      return { 
        status: false, 
        errors: [`Auth middleware check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkApiEndpoints(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let workingEndpoints = 0;
    const totalEndpoints = this.apiEndpoints.size;

    const endpointChecks = Array.from(this.apiEndpoints).map(async (endpoint) => {
      try {
        const response = await axios.get(`${this.config.apiEndpoint}${endpoint}`, {
          timeout: 2000,
          validateStatus: (status) => status < 500 // Accept 4xx as working endpoints
        });
        
        if (response.status < 500) {
          workingEndpoints++;
        }
      } catch (error) {
        errors.push(`Endpoint ${endpoint} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    await Promise.all(endpointChecks);

    const successRate = workingEndpoints / totalEndpoints;
    const isHealthy = successRate >= 0.8; // 80% of endpoints should work

    return {
      status: isHealthy,
      errors: errors.slice(0, 5) // Limit error messages
    };
  }

  private async checkServiceDependencies(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let healthyServices = 0;
    const totalServices = this.config.expectedServices.length;

    for (const service of this.config.expectedServices) {
      try {
        const response = await axios.get(`${this.config.apiEndpoint}/api/health/${service}`, {
          timeout: 2000
        });

        if (response.status === 200 && response.data.healthy) {
          healthyServices++;
        } else {
          errors.push(`Service ${service} is unhealthy`);
        }
      } catch (error) {
        errors.push(`Service ${service} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successRate = totalServices > 0 ? healthyServices / totalServices : 1;
    const isHealthy = successRate >= 0.8;

    return { status: isHealthy, errors };
  }

  private calculateOverallHealth(checks: { status: boolean; errors: string[] }[]): {
    status: AgentStatusType;
    health: HealthStatus;
    errors: string[];
  } {
    const passedChecks = checks.filter(check => check.status).length;
    const totalChecks = checks.length;
    const successRate = passedChecks / totalChecks;
    const allErrors = checks.flatMap(check => check.errors);

    if (successRate === 1.0) {
      return { status: 'ACTIVE', health: 'HEALTHY', errors: [] };
    } else if (successRate >= 0.8) {
      return { status: 'ACTIVE', health: 'DEGRADED', errors: allErrors.slice(0, 3) };
    } else if (successRate >= 0.5) {
      return { status: 'BUSY', health: 'UNHEALTHY', errors: allErrors.slice(0, 5) };
    } else {
      return { status: 'ERROR', health: 'UNHEALTHY', errors: allErrors.slice(0, 5) };
    }
  }

  private async getCurrentTask(): Promise<AgentTask | null> {
    // In a real implementation, this would query the backend's current task
    // For now, simulate based on system state
    if (!this.databaseConnected) {
      return {
        id: 'db-connection-fix',
        name: 'Fix Database Connection',
        description: 'Resolving database connectivity issues',
        status: 'IN_PROGRESS',
        priority: 1,
        assignedAt: new Date(),
        startedAt: new Date(),
        dependencies: [],
        blockers: ['database-unavailable'],
        progress: 30,
        metadata: { type: 'infrastructure', critical: true }
      };
    }

    if (!this.authMiddlewareActive) {
      return {
        id: 'auth-middleware-setup',
        name: 'Configure Authentication Middleware',
        description: 'Setting up JWT authentication middleware',
        status: 'IN_PROGRESS',
        priority: 2,
        assignedAt: new Date(),
        dependencies: ['database-connection'],
        blockers: [],
        progress: 70,
        metadata: { type: 'security', critical: true }
      };
    }

    return null; // No active critical tasks
  }

  private calculateProgress(): number {
    const components = [
      this.databaseConnected ? 25 : 0,
      this.authMiddlewareActive ? 25 : 0,
      this.lastResponseTime < 500 ? 25 : this.lastResponseTime < 1000 ? 15 : 5,
      this.healthCheckAttempts === 0 ? 25 : Math.max(0, 25 - this.healthCheckAttempts * 5)
    ];

    return components.reduce((sum, score) => sum + score, 0);
  }

  private async detectBlockers(): Promise<any[]> {
    const blockers = [];

    if (!this.databaseConnected) {
      blockers.push({
        id: 'database-connection',
        type: 'DATABASE_UNAVAILABLE',
        description: 'Database connection is not available',
        severity: 'CRITICAL',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check database container status',
          'Verify connection string',
          'Restart database service',
          'Check network connectivity'
        ]
      });
    }

    if (!this.authMiddlewareActive) {
      blockers.push({
        id: 'auth-middleware',
        type: 'MIDDLEWARE_MISCONFIGURED',
        description: 'Authentication middleware is not properly configured',
        severity: 'HIGH',
        detectedAt: new Date(),
        autoResolvable: false,
        resolutionSteps: [
          'Review authentication configuration',
          'Check JWT secret configuration',
          'Verify middleware order',
          'Test authentication endpoints'
        ]
      });
    }

    if (this.lastResponseTime > 2000) {
      blockers.push({
        id: 'performance-degradation',
        type: 'PERFORMANCE_ISSUE',
        description: `API response time is ${this.lastResponseTime}ms`,
        severity: 'MEDIUM',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check database query performance',
          'Review API endpoint optimizations',
          'Monitor server resources',
          'Consider caching implementation'
        ]
      });
    }

    return blockers;
  }

  async getMetrics(): Promise<Partial<AgentMetrics>> {
    return {
      timestamp: new Date(),
      tasksCompleted: await this.getCompletedTasksCount(),
      tasksInProgress: await this.getInProgressTasksCount(),
      tasksPending: await this.getPendingTasksCount(),
      averageTaskTime: await this.getAverageTaskTime(),
      successRate: await this.getSuccessRate(),
      blockerCount: (await this.detectBlockers()).length,
      resourceUtilization: await this.getResourceUtilization()
    };
  }

  private async calculateThroughput(): Promise<number> {
    // Simulate throughput calculation (requests per minute)
    return this.lastResponseTime > 0 ? Math.max(0, 60 - (this.lastResponseTime / 1000)) : 0;
  }

  private async calculateErrorRate(): Promise<number> {
    // Simulate error rate calculation
    return this.healthCheckAttempts > 0 ? Math.min(1.0, this.healthCheckAttempts * 0.1) : 0;
  }

  private async calculateUptime(): Promise<number> {
    // Simulate uptime calculation (percentage)
    return this.healthCheckAttempts === 0 ? 99.9 : Math.max(0, 99.9 - (this.healthCheckAttempts * 5));
  }

  private async getCompletedTasksCount(): Promise<number> {
    // In real implementation, query from task management system
    return Math.floor(Math.random() * 10) + 5;
  }

  private async getInProgressTasksCount(): Promise<number> {
    return this.getCurrentTask() ? 1 : 0;
  }

  private async getPendingTasksCount(): Promise<number> {
    // Simulate pending tasks based on blockers
    return (await this.detectBlockers()).length;
  }

  private async getAverageTaskTime(): Promise<number> {
    // Simulate average task completion time in minutes
    return 45 + Math.random() * 30;
  }

  private async getSuccessRate(): Promise<number> {
    // Calculate success rate based on health checks and error rate
    return Math.max(0, 1.0 - (await this.calculateErrorRate()));
  }

  private async getResourceUtilization(): Promise<number> {
    // Simulate resource utilization (CPU/Memory)
    return Math.min(100, this.lastResponseTime / 10 + Math.random() * 20);
  }

  async assignTask(task: AgentTask): Promise<void> {
    logger.info(`📋 Backend API Monitor: Task assigned - ${task.name}`);
    // In real implementation, would integrate with task management system
  }

  async start(): Promise<void> {
    logger.info('🚀 Backend API Monitor: Starting monitoring');
    // Initialize any necessary resources
  }

  async stop(): Promise<void> {
    logger.info('🛑 Backend API Monitor: Stopping monitoring');
    // Cleanup resources
  }
}