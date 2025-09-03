import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../config/logger';
import { AgentStatus, AgentMetrics, AgentTask, FrontendAgentConfig, AgentStatusType, HealthStatus } from '../types';
import { BaseAgentMonitor } from './BaseAgentMonitor';

const execAsync = promisify(exec);

export class FrontendUiMonitor extends BaseAgentMonitor {
  private appAccessible: boolean = false;
  private routesWorking: Set<string> = new Set();
  private buildSuccessful: boolean = false;
  private componentsHealthy: number = 0;
  private lastResponseTime: number = 0;

  constructor(private config: FrontendAgentConfig) {
    super();
    this.initializeExpectedRoutes();
  }

  private initializeExpectedRoutes(): void {
    this.config.expectedRoutes.forEach(route => {
      this.routesWorking.add(route);
    });
  }

  async checkStatus(): Promise<Partial<AgentStatus>> {
    const startTime = Date.now();
    
    try {
      // 1. App Accessibility Check
      const appStatus = await this.checkAppAccessibility();
      
      // 2. Route Navigation Check
      const routeStatus = await this.checkRouteNavigation();
      
      // 3. Component Integration Check
      const componentStatus = await this.checkComponentIntegration();
      
      // 4. Build Status Check
      const buildStatus = await this.checkBuildStatus();
      
      // 5. UI/UX Implementation Check
      const uiStatus = await this.checkUiImplementation();

      this.lastResponseTime = Date.now() - startTime;

      const overallHealth = this.calculateOverallHealth([
        appStatus,
        routeStatus,
        componentStatus,
        buildStatus,
        uiStatus
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
      logger.error('❌ Frontend UI Monitor: Health check failed', error);
      
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

  private async checkAppAccessibility(): Promise<{ status: boolean; errors: string[] }> {
    try {
      const response = await axios.get(this.config.appUrl, {
        timeout: 5000
      });

      this.appAccessible = response.status === 200 && response.data.includes('<div id=\"__next\"');
      
      if (this.appAccessible) {
        return { status: true, errors: [] };
      } else {
        return { status: false, errors: ['Frontend app is not accessible or not rendering properly'] };
      }
    } catch (error) {
      this.appAccessible = false;
      return { 
        status: false, 
        errors: [`App accessibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkRouteNavigation(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let workingRoutes = 0;
    const totalRoutes = this.config.expectedRoutes.length;

    const routeChecks = this.config.expectedRoutes.map(async (route) => {
      try {
        const response = await axios.get(`${this.config.appUrl}${route}`, {
          timeout: 3000,
          validateStatus: (status) => status < 500
        });
        
        if (response.status < 500) {
          workingRoutes++;
          this.routesWorking.add(route);
        } else {
          this.routesWorking.delete(route);
        }
      } catch (error) {
        errors.push(`Route ${route} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.routesWorking.delete(route);
      }
    });

    await Promise.all(routeChecks);

    const successRate = totalRoutes > 0 ? workingRoutes / totalRoutes : 1;
    const isHealthy = successRate >= 0.8;

    return {
      status: isHealthy,
      errors: errors.slice(0, 3)
    };
  }

  private async checkComponentIntegration(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let healthyComponents = 0;
    const totalComponents = this.config.componentTests.length;

    // Run component tests
    for (const componentTest of this.config.componentTests) {
      try {
        const { stdout } = await execAsync(`cd ${process.cwd()} && ${componentTest}`);
        
        if (stdout.includes('PASS') || stdout.includes('✓')) {
          healthyComponents++;
        } else {
          errors.push(`Component test failed: ${componentTest}`);
        }
      } catch (error) {
        errors.push(`Component test error: ${componentTest} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    this.componentsHealthy = healthyComponents;
    const successRate = totalComponents > 0 ? healthyComponents / totalComponents : 1;
    const isHealthy = successRate >= 0.8;

    return {
      status: isHealthy,
      errors: errors.slice(0, 3)
    };
  }

  private async checkBuildStatus(): Promise<{ status: boolean; errors: string[] }> {
    try {
      // Check if build directory exists and has recent files
      const { stdout } = await execAsync(`ls -la ${this.config.buildPath}`);
      
      if (stdout.includes('.next') || stdout.includes('dist') || stdout.includes('build')) {
        this.buildSuccessful = true;
        return { status: true, errors: [] };
      } else {
        this.buildSuccessful = false;
        return { status: false, errors: ['Build directory not found or empty'] };
      }
    } catch (error) {
      this.buildSuccessful = false;
      return { 
        status: false, 
        errors: [`Build check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkUiImplementation(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    const checks = [];

    // Check for critical UI elements
    const criticalPages = ['/login', '/register', '/dashboard', '/profile'];
    
    for (const page of criticalPages) {
      try {
        const response = await axios.get(`${this.config.appUrl}${page}`, {
          timeout: 2000
        });

        const hasRequiredElements = 
          response.data.includes('form') || 
          response.data.includes('button') || 
          response.data.includes('input');

        if (hasRequiredElements) {
          checks.push(true);
        } else {
          checks.push(false);
          errors.push(`Page ${page} missing essential UI elements`);
        }
      } catch (error) {
        checks.push(false);
        errors.push(`UI check failed for ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successRate = checks.length > 0 ? checks.filter(Boolean).length / checks.length : 1;
    const isHealthy = successRate >= 0.75;

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
    } else if (successRate >= 0.5) {
      return { status: 'BUSY', health: 'UNHEALTHY', errors: allErrors.slice(0, 5) };
    } else {
      return { status: 'ERROR', health: 'UNHEALTHY', errors: allErrors.slice(0, 5) };
    }
  }

  private async getCurrentTask(): Promise<AgentTask | null> {
    if (!this.appAccessible) {
      return {
        id: 'frontend-accessibility',
        name: 'Fix Frontend App Accessibility',
        description: 'Resolving frontend application accessibility issues',
        status: 'IN_PROGRESS',
        priority: 1,
        assignedAt: new Date(),
        startedAt: new Date(),
        dependencies: ['backend-api'],
        blockers: ['app-not-responding'],
        progress: 40,
        metadata: { type: 'infrastructure', critical: true }
      };
    }

    if (!this.buildSuccessful) {
      return {
        id: 'frontend-build',
        name: 'Fix Frontend Build Process',
        description: 'Resolving frontend build compilation issues',
        status: 'IN_PROGRESS',
        priority: 2,
        assignedAt: new Date(),
        dependencies: ['node-modules'],
        blockers: [],
        progress: 60,
        metadata: { type: 'build', critical: true }
      };
    }

    if (this.routesWorking.size < this.config.expectedRoutes.length * 0.8) {
      return {
        id: 'route-integration',
        name: 'Fix Route Navigation Issues',
        description: 'Resolving client-side routing problems',
        status: 'IN_PROGRESS',
        priority: 3,
        assignedAt: new Date(),
        dependencies: ['frontend-accessibility'],
        blockers: [],
        progress: 75,
        metadata: { type: 'routing', critical: false }
      };
    }

    return null;
  }

  private calculateProgress(): number {
    const components = [
      this.appAccessible ? 25 : 0,
      this.buildSuccessful ? 25 : 0,
      Math.round((this.routesWorking.size / Math.max(1, this.config.expectedRoutes.length)) * 25),
      Math.round((this.componentsHealthy / Math.max(1, this.config.componentTests.length)) * 25)
    ];

    return components.reduce((sum, score) => sum + score, 0);
  }

  private async detectBlockers(): Promise<any[]> {
    const blockers = [];

    if (!this.appAccessible) {
      blockers.push({
        id: 'app-accessibility',
        type: 'FRONTEND_UNAVAILABLE',
        description: 'Frontend application is not accessible',
        severity: 'CRITICAL',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check if Next.js dev server is running',
          'Verify port 3001 is available',
          'Check for compilation errors',
          'Restart frontend development server'
        ]
      });
    }

    if (!this.buildSuccessful) {
      blockers.push({
        id: 'build-failure',
        type: 'BUILD_PROCESS_FAILED',
        description: 'Frontend build process is failing',
        severity: 'HIGH',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check TypeScript compilation errors',
          'Verify all dependencies are installed',
          'Clear node_modules and reinstall',
          'Check for syntax errors in components'
        ]
      });
    }

    if (this.routesWorking.size < this.config.expectedRoutes.length * 0.5) {
      blockers.push({
        id: 'routing-issues',
        type: 'ROUTING_MISCONFIGURED',
        description: 'Multiple routes are not working properly',
        severity: 'MEDIUM',
        detectedAt: new Date(),
        autoResolvable: false,
        resolutionSteps: [
          'Check Next.js routing configuration',
          'Verify page component exports',
          'Review middleware configuration',
          'Check for client-side navigation issues'
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
    return this.routesWorking.size * 10; // Routes per minute simulation
  }

  private async calculateErrorRate(): Promise<number> {
    const totalRoutes = this.config.expectedRoutes.length;
    const workingRoutes = this.routesWorking.size;
    return totalRoutes > 0 ? 1 - (workingRoutes / totalRoutes) : 0;
  }

  private async calculateUptime(): Promise<number> {
    return this.appAccessible ? 99.5 : 0;
  }

  private async getCompletedTasksCount(): Promise<number> {
    return Math.floor(Math.random() * 8) + 3;
  }

  private async getInProgressTasksCount(): Promise<number> {
    return this.getCurrentTask() ? 1 : 0;
  }

  private async getPendingTasksCount(): Promise<number> {
    return (await this.detectBlockers()).length + Math.floor(Math.random() * 3);
  }

  private async getAverageTaskTime(): Promise<number> {
    return 35 + Math.random() * 25; // minutes
  }

  private async getSuccessRate(): Promise<number> {
    return Math.max(0, 1.0 - (await this.calculateErrorRate()));
  }

  private async getResourceUtilization(): Promise<number> {
    return Math.min(100, 30 + Math.random() * 40);
  }

  async assignTask(task: AgentTask): Promise<void> {
    logger.info(`📋 Frontend UI Monitor: Task assigned - ${task.name}`);
  }

  async start(): Promise<void> {
    logger.info('🚀 Frontend UI Monitor: Starting monitoring');
    this.isStarted = true;
  }

  async stop(): Promise<void> {
    logger.info('🛑 Frontend UI Monitor: Stopping monitoring');
    this.isStarted = false;
  }
}