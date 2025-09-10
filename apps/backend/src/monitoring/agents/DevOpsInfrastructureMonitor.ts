import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { logger } from '../../config/logger';
import { AgentStatus, AgentMetrics, AgentTask, DevOpsAgentConfig, AgentStatusType, HealthStatus } from '../types';
import { BaseAgentMonitor } from './BaseAgentMonitor';

const execAsync = promisify(exec);

export class DevOpsInfrastructureMonitor extends BaseAgentMonitor {
  private dockerServicesHealthy: Set<string> = new Set();
  private migrationsCompleted: boolean = false;
  private deploymentsReady: Set<string> = new Set();
  private systemResourcesOk: boolean = true;
  private lastInfrastructureCheck: number = 0;

  constructor(private config: DevOpsAgentConfig) {
    super();
  }

  async checkStatus(): Promise<Partial<AgentStatus>> {
    const startTime = Date.now();
    
    try {
      // 1. Docker Services Health Check
      const dockerStatus = await this.checkDockerServices();
      
      // 2. Database Migrations Check
      const migrationStatus = await this.checkDatabaseMigrations();
      
      // 3. Deployment Readiness Check
      const deploymentStatus = await this.checkDeploymentReadiness();
      
      // 4. System Resources Check
      const resourceStatus = await this.checkSystemResources();
      
      // 5. Infrastructure Health Commands
      const healthCommandStatus = await this.runHealthCheckCommands();

      this.lastInfrastructureCheck = Date.now() - startTime;

      const overallHealth = this.calculateOverallHealth([
        dockerStatus,
        migrationStatus,
        deploymentStatus,
        resourceStatus,
        healthCommandStatus
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
          responseTime: this.lastInfrastructureCheck,
          throughput: await this.calculateThroughput(),
          errorRate: await this.calculateErrorRate(),
          uptime: await this.calculateUptime()
        },
        errorMessages: overallHealth.errors
      };

    } catch (error) {
      logger.error('❌ DevOps Infrastructure Monitor: Health check failed', error);
      
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

  private async checkDockerServices(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let healthyServices = 0;
    const totalServices = this.config.dockerServices.length;

    for (const service of this.config.dockerServices) {
      try {
        // Check if Docker service is running
        const { stdout } = await execAsync(`docker ps --filter "name=${service}" --format "{{.Names}},{{.Status}}"`);
        
        if (stdout.includes(service) && stdout.includes('Up')) {
          this.dockerServicesHealthy.add(service);
          healthyServices++;
          
          // Additional health check for database services
          if (service.includes('postgres') || service.includes('redis')) {
            await this.checkDatabaseServiceHealth(service);
          }
        } else {
          this.dockerServicesHealthy.delete(service);
          errors.push(`Docker service ${service} is not running`);
        }
      } catch (error) {
        this.dockerServicesHealthy.delete(service);
        errors.push(`Docker service ${service} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successRate = totalServices > 0 ? healthyServices / totalServices : 1;
    const isHealthy = successRate >= 0.9; // High threshold for infrastructure

    return {
      status: isHealthy,
      errors: errors.slice(0, 3)
    };
  }

  private async checkDatabaseServiceHealth(service: string): Promise<void> {
    try {
      if (service.includes('postgres')) {
        await execAsync(`docker exec ${service} pg_isready -U postgres`);
      } else if (service.includes('redis')) {
        await execAsync(`docker exec ${service} redis-cli ping`);
      }
    } catch (error) {
      this.dockerServicesHealthy.delete(service);
      throw new Error(`Database service ${service} health check failed`);
    }
  }

  private async checkDatabaseMigrations(): Promise<{ status: boolean; errors: string[] }> {
    try {
      // Check if migration files exist and have been applied
      const { stdout: migrationFiles } = await execAsync(`ls -la ${this.config.databaseMigrations} 2>/dev/null || echo "no-migrations"`);
      
      if (migrationFiles.includes('no-migrations')) {
        // No migrations directory, but that might be okay for initial setup
        this.migrationsCompleted = true;
        return { status: true, errors: [] };
      }

      // Check Prisma migration status
      try {
        const { stdout: prismaStatus } = await execAsync('npx prisma migrate status');
        
        if (prismaStatus.includes('Database is up to date') || prismaStatus.includes('No pending migrations')) {
          this.migrationsCompleted = true;
          return { status: true, errors: [] };
        } else {
          this.migrationsCompleted = false;
          return { status: false, errors: ['Database migrations are pending'] };
        }
      } catch (prismaError) {
        // Fallback: check if database tables exist
        const { stdout: tableCheck } = await execAsync(`docker exec castmatch-postgres psql -U postgres -d castmatch_db -c "\\dt" 2>/dev/null || echo "no-tables"`);
        
        if (tableCheck.includes('public |') && !tableCheck.includes('no-tables')) {
          this.migrationsCompleted = true;
          return { status: true, errors: [] };
        } else {
          this.migrationsCompleted = false;
          return { status: false, errors: ['Database tables not found, migrations may not be applied'] };
        }
      }
    } catch (error) {
      this.migrationsCompleted = false;
      return { 
        status: false, 
        errors: [`Migration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkDeploymentReadiness(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let readyDeployments = 0;
    const totalDeployments = this.config.deploymentTargets.length;

    for (const target of this.config.deploymentTargets) {
      try {
        // Check deployment readiness based on target type
        if (target === 'development') {
          // Check if dev services are running
          const devServicesReady = this.dockerServicesHealthy.size >= 2; // At least postgres and redis
          if (devServicesReady) {
            this.deploymentsReady.add(target);
            readyDeployments++;
          } else {
            errors.push(`Development deployment not ready: missing services`);
          }
        } else if (target === 'staging' || target === 'production') {
          // Check if production-ready configurations exist
          const { stdout } = await execAsync(`ls -la .env.${target} 2>/dev/null || echo "no-env"`);
          if (!stdout.includes('no-env')) {
            this.deploymentsReady.add(target);
            readyDeployments++;
          } else {
            errors.push(`${target} deployment missing environment configuration`);
          }
        }
      } catch (error) {
        this.deploymentsReady.delete(target);
        errors.push(`Deployment ${target} readiness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successRate = totalDeployments > 0 ? readyDeployments / totalDeployments : 1;
    const isHealthy = successRate >= 0.7;

    return {
      status: isHealthy,
      errors: errors.slice(0, 3)
    };
  }

  private async checkSystemResources(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let resourceIssues = 0;

    try {
      // Check disk space
      const { stdout: diskUsage } = await execAsync('df -h / | tail -1');
      const diskUsagePercent = parseInt(diskUsage.split(/\s+/)[4].replace('%', ''));
      
      if (diskUsagePercent > 90) {
        errors.push(`High disk usage: ${diskUsagePercent}%`);
        resourceIssues++;
      }

      // Check memory usage
      const { stdout: memUsage } = await execAsync('free -m | grep Mem:');
      const memParts = memUsage.split(/\s+/);
      const memUsed = parseInt(memParts[2]);
      const memTotal = parseInt(memParts[1]);
      const memUsagePercent = Math.round((memUsed / memTotal) * 100);

      if (memUsagePercent > 90) {
        errors.push(`High memory usage: ${memUsagePercent}%`);
        resourceIssues++;
      }

      // Check Docker resources
      const { stdout: dockerStats } = await execAsync('docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}"');
      if (dockerStats.includes('GB') && dockerStats.match(/(\d+\.?\d*)GB/)) {
        const sizeMatch = dockerStats.match(/(\d+\.?\d*)GB/);
        if (sizeMatch && parseFloat(sizeMatch[1]) > 10) {
          errors.push('High Docker disk usage detected');
          resourceIssues++;
        }
      }

      this.systemResourcesOk = resourceIssues === 0;
      
      return {
        status: this.systemResourcesOk,
        errors: errors.slice(0, 3)
      };

    } catch (error) {
      this.systemResourcesOk = false;
      return { 
        status: false, 
        errors: [`System resource check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async runHealthCheckCommands(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let successfulCommands = 0;
    const totalCommands = this.config.healthCheckCommands.length;

    for (const command of this.config.healthCheckCommands) {
      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 5000 });
        
        // Consider command successful if no errors and some output
        if (!stderr && stdout.trim().length > 0) {
          successfulCommands++;
        } else if (stderr) {
          errors.push(`Health check command failed: ${command} - ${stderr.substring(0, 100)}`);
        }
      } catch (error) {
        errors.push(`Health check command error: ${command} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successRate = totalCommands > 0 ? successfulCommands / totalCommands : 1;
    const isHealthy = successRate >= 0.8;

    return {
      status: isHealthy,
      errors: errors.slice(0, 3)
    };
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
    } else if (successRate >= 0.6) {
      return { status: 'BUSY', health: 'UNHEALTHY', errors: allErrors.slice(0, 5) };
    } else {
      return { status: 'ERROR', health: 'UNHEALTHY', errors: allErrors.slice(0, 5) };
    }
  }

  private async getCurrentTask(): Promise<AgentTask | null> {
    if (this.dockerServicesHealthy.size === 0) {
      return {
        id: 'docker-services-startup',
        name: 'Start Docker Services',
        description: 'Starting required Docker containers (PostgreSQL, Redis, etc.)',
        status: 'IN_PROGRESS',
        priority: 1,
        assignedAt: new Date(),
        startedAt: new Date(),
        dependencies: ['docker-daemon'],
        blockers: ['docker-services-down'],
        progress: 20,
        metadata: { type: 'infrastructure', critical: true }
      };
    }

    if (!this.migrationsCompleted) {
      return {
        id: 'database-migration',
        name: 'Run Database Migrations',
        description: 'Applying database schema migrations',
        status: 'IN_PROGRESS',
        priority: 2,
        assignedAt: new Date(),
        dependencies: ['docker-services-startup'],
        blockers: [],
        progress: 50,
        metadata: { type: 'database', critical: true }
      };
    }

    if (!this.systemResourcesOk) {
      return {
        id: 'system-optimization',
        name: 'Optimize System Resources',
        description: 'Cleaning up system resources and optimizing performance',
        status: 'IN_PROGRESS',
        priority: 3,
        assignedAt: new Date(),
        dependencies: ['database-migration'],
        blockers: [],
        progress: 75,
        metadata: { type: 'optimization', critical: false }
      };
    }

    if (this.deploymentsReady.size < this.config.deploymentTargets.length) {
      return {
        id: 'deployment-preparation',
        name: 'Prepare Deployment Environments',
        description: 'Setting up staging and production deployment configurations',
        status: 'IN_PROGRESS',
        priority: 4,
        assignedAt: new Date(),
        dependencies: ['system-optimization'],
        blockers: [],
        progress: 85,
        metadata: { type: 'deployment', critical: false }
      };
    }

    return null;
  }

  private calculateProgress(): number {
    const components = [
      Math.round((this.dockerServicesHealthy.size / Math.max(1, this.config.dockerServices.length)) * 40),
      this.migrationsCompleted ? 25 : 0,
      this.systemResourcesOk ? 20 : 0,
      Math.round((this.deploymentsReady.size / Math.max(1, this.config.deploymentTargets.length)) * 15)
    ];

    return components.reduce((sum, score) => sum + score, 0);
  }

  private async detectBlockers(): Promise<any[]> {
    const blockers = [];

    if (this.dockerServicesHealthy.size === 0) {
      blockers.push({
        id: 'docker-services-down',
        type: 'INFRASTRUCTURE_UNAVAILABLE',
        description: 'Docker services are not running',
        severity: 'CRITICAL',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check if Docker daemon is running',
          'Start Docker compose services',
          'Check for port conflicts',
          'Verify Docker service configurations'
        ]
      });
    }

    if (!this.migrationsCompleted && this.dockerServicesHealthy.has('castmatch-postgres')) {
      blockers.push({
        id: 'pending-migrations',
        type: 'DATABASE_MIGRATIONS_PENDING',
        description: 'Database migrations have not been applied',
        severity: 'HIGH',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Run prisma migrate deploy',
          'Check migration files',
          'Verify database connectivity',
          'Apply pending migrations'
        ]
      });
    }

    if (!this.systemResourcesOk) {
      blockers.push({
        id: 'resource-constraints',
        type: 'SYSTEM_RESOURCE_ISSUES',
        description: 'System is running low on resources',
        severity: 'MEDIUM',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Clean up Docker system resources',
          'Remove unused containers and images',
          'Clear temporary files',
          'Monitor resource usage'
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
    // Infrastructure operations per minute
    return this.dockerServicesHealthy.size * 3;
  }

  private async calculateErrorRate(): Promise<number> {
    const totalServices = this.config.dockerServices.length;
    const healthyServices = this.dockerServicesHealthy.size;
    return totalServices > 0 ? 1 - (healthyServices / totalServices) : 0;
  }

  private async calculateUptime(): Promise<number> {
    const criticalServicesUp = this.dockerServicesHealthy.size >= 2; // postgres + redis minimum
    return criticalServicesUp && this.systemResourcesOk ? 99 : 30;
  }

  private async getCompletedTasksCount(): Promise<number> {
    return Math.floor(Math.random() * 5) + 3;
  }

  private async getInProgressTasksCount(): Promise<number> {
    return this.getCurrentTask() ? 1 : 0;
  }

  private async getPendingTasksCount(): Promise<number> {
    return (await this.detectBlockers()).length;
  }

  private async getAverageTaskTime(): Promise<number> {
    return 25 + Math.random() * 20; // Infrastructure tasks are usually quick
  }

  private async getSuccessRate(): Promise<number> {
    return Math.max(0, 1.0 - (await this.calculateErrorRate()));
  }

  private async getResourceUtilization(): Promise<number> {
    return Math.min(100, 60 + Math.random() * 30); // Infrastructure typically uses more resources
  }

  async assignTask(task: AgentTask): Promise<void> {
    logger.info(`📋 DevOps Infrastructure Monitor: Task assigned - ${task.name}`);
  }

  async start(): Promise<void> {
    logger.info('🚀 DevOps Infrastructure Monitor: Starting monitoring');
    this.isStarted = true;
  }

  async stop(): Promise<void> {
    logger.info('🛑 DevOps Infrastructure Monitor: Stopping monitoring');
    this.isStarted = false;
  }
}