import { logger } from '../config/logger';
import { AgentType, ProgressReport, AgentSummary, NextAction, AgentStatus, AgentMetrics } from './types';
import type { AgentOrchestrator } from './AgentOrchestrator';

export class ReportGenerator {
  constructor(private orchestrator: AgentOrchestrator) {}

  async generateProgressReport(): Promise<ProgressReport> {
    const timestamp = new Date();
    const allStatuses = this.orchestrator.getAllStatuses();
    const allMetrics = this.orchestrator.getAllMetrics();

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(allStatuses, allMetrics);
    
    // Generate agent summaries
    const agentSummaries = await this.generateAgentSummaries(allStatuses, allMetrics);
    
    // Collect all blockers
    const blockers = this.collectAllBlockers(allStatuses);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(allStatuses, allMetrics, blockers);
    
    // Generate next actions
    const nextActions = this.generateNextActions(allStatuses, allMetrics);
    
    // Estimate completion
    const estimatedCompletion = this.estimateCompletion(allStatuses, allMetrics);
    
    // Identify critical path
    const criticalPath = this.identifyCriticalPath(allStatuses, allMetrics);

    const report: ProgressReport = {
      timestamp,
      overallProgress,
      agentSummaries,
      blockers,
      recommendations,
      nextActions,
      estimatedCompletion,
      criticalPath
    };

    logger.info(`📈 Generated progress report: ${overallProgress}% complete, ${blockers.length} blockers`);
    return report;
  }

  private calculateOverallProgress(
    statuses: Map<AgentType, AgentStatus>,
    metrics: Map<AgentType, AgentMetrics>
  ): number {
    const agentProgressValues: number[] = [];
    
    for (const [agentType, status] of statuses) {
      const progress = status.progress || 0;
      const weight = this.getAgentWeight(agentType);
      agentProgressValues.push(progress * weight);
    }

    if (agentProgressValues.length === 0) return 0;
    
    const totalWeight = Array.from(statuses.keys())
      .reduce((sum, agentType) => sum + this.getAgentWeight(agentType), 0);
    
    const weightedProgress = agentProgressValues.reduce((sum, value) => sum + value, 0);
    return Math.round(weightedProgress / totalWeight);
  }

  private getAgentWeight(agentType: AgentType): number {
    // Weight agents by criticality to overall project success
    switch (agentType) {
      case AgentType.BACKEND_API: return 0.25; // 25%
      case AgentType.FRONTEND_UI: return 0.20; // 20%
      case AgentType.DEVOPS_INFRASTRUCTURE: return 0.20; // 20%
      case AgentType.AI_ML: return 0.15; // 15%
      case AgentType.TESTING_QA: return 0.15; // 15%
      case AgentType.INTEGRATION_WORKFLOW: return 0.05; // 5%
      default: return 0.1;
    }
  }

  private async generateAgentSummaries(
    statuses: Map<AgentType, AgentStatus>,
    metrics: Map<AgentType, AgentMetrics>
  ): Promise<AgentSummary[]> {
    const summaries: AgentSummary[] = [];

    for (const [agentType, status] of statuses) {
      const metric = metrics.get(agentType);
      
      const summary: AgentSummary = {
        agentType,
        status: status.status,
        health: status.health,
        progress: status.progress || 0,
        tasksCompleted: metric?.tasksCompleted || 0,
        tasksPending: metric?.tasksPending || 0,
        blockers: status.blockers?.length || 0,
        keyAchievements: this.getKeyAchievements(agentType, status, metric),
        upcomingTasks: this.getUpcomingTasks(agentType, status)
      };

      summaries.push(summary);
    }

    return summaries.sort((a, b) => b.progress - a.progress);
  }

  private getKeyAchievements(agentType: AgentType, status: AgentStatus, metric?: AgentMetrics): string[] {
    const achievements: string[] = [];

    switch (agentType) {
      case AgentType.BACKEND_API:
        if (status.health === 'HEALTHY') achievements.push('API endpoints operational');
        if (status.progress > 80) achievements.push('Database connectivity established');
        if (status.performance.uptime > 95) achievements.push('High availability maintained');
        break;

      case AgentType.FRONTEND_UI:
        if (status.health === 'HEALTHY') achievements.push('Frontend application accessible');
        if (status.progress > 70) achievements.push('Core routing implemented');
        if (status.progress > 90) achievements.push('Component integration complete');
        break;

      case AgentType.AI_ML:
        if (status.progress > 50) achievements.push('ML models loaded successfully');
        if (status.progress > 70) achievements.push('Embedding service operational');
        if (status.progress > 90) achievements.push('Semantic search ready');
        break;

      case AgentType.INTEGRATION_WORKFLOW:
        if (status.progress > 40) achievements.push('OAuth providers configured');
        if (status.progress > 70) achievements.push('Third-party APIs connected');
        if (status.progress > 90) achievements.push('Webhook endpoints active');
        break;

      case AgentType.DEVOPS_INFRASTRUCTURE:
        if (status.health === 'HEALTHY') achievements.push('Docker services running');
        if (status.progress > 60) achievements.push('Database migrations applied');
        if (status.progress > 80) achievements.push('System resources optimized');
        break;

      case AgentType.TESTING_QA:
        if (status.progress > 50) achievements.push('Test suites operational');
        if (status.progress > 70) achievements.push('Code coverage threshold met');
        if (status.progress > 90) achievements.push('All quality gates passed');
        break;
    }

    // Add task completion achievements
    if (metric?.tasksCompleted && metric.tasksCompleted > 5) {
      achievements.push(`${metric.tasksCompleted} tasks completed`);
    }

    if (metric?.successRate && metric.successRate > 0.9) {
      achievements.push(`${Math.round(metric.successRate * 100)}% success rate`);
    }

    return achievements.slice(0, 3); // Limit to top 3
  }

  private getUpcomingTasks(agentType: AgentType, status: AgentStatus): string[] {
    const upcoming: string[] = [];

    // Add active task
    if (status.activeTask) {
      upcoming.push(status.activeTask.name);
    }

    // Add pending tasks
    status.pendingTasks?.slice(0, 2).forEach(task => {
      upcoming.push(task.name);
    });

    // Add inferred next tasks based on progress and agent type
    const inferredTasks = this.inferNextTasks(agentType, status);
    upcoming.push(...inferredTasks);

    return upcoming.slice(0, 3); // Limit to top 3
  }

  private inferNextTasks(agentType: AgentType, status: AgentStatus): string[] {
    const tasks: string[] = [];

    switch (agentType) {
      case AgentType.BACKEND_API:
        if (status.progress < 50) tasks.push('Complete API endpoint development');
        if (status.progress >= 50 && status.progress < 80) tasks.push('Implement authentication middleware');
        if (status.progress >= 80) tasks.push('Optimize API performance');
        break;

      case AgentType.FRONTEND_UI:
        if (status.progress < 40) tasks.push('Set up component architecture');
        if (status.progress >= 40 && status.progress < 70) tasks.push('Implement core user interfaces');
        if (status.progress >= 70) tasks.push('Integrate with backend APIs');
        break;

      case AgentType.AI_ML:
        if (status.progress < 60) tasks.push('Load required ML models');
        if (status.progress >= 60 && status.progress < 80) tasks.push('Configure embedding pipeline');
        if (status.progress >= 80) tasks.push('Fine-tune matching algorithms');
        break;

      case AgentType.INTEGRATION_WORKFLOW:
        if (status.progress < 50) tasks.push('Complete OAuth setup');
        if (status.progress >= 50 && status.progress < 80) tasks.push('Integrate external APIs');
        if (status.progress >= 80) tasks.push('Configure workflow automation');
        break;

      case AgentType.DEVOPS_INFRASTRUCTURE:
        if (status.progress < 60) tasks.push('Ensure all services are running');
        if (status.progress >= 60 && status.progress < 80) tasks.push('Complete database setup');
        if (status.progress >= 80) tasks.push('Prepare production deployment');
        break;

      case AgentType.TESTING_QA:
        if (status.progress < 70) tasks.push('Fix failing test suites');
        if (status.progress >= 70 && status.progress < 90) tasks.push('Improve test coverage');
        if (status.progress >= 90) tasks.push('Implement advanced quality checks');
        break;
    }

    return tasks.slice(0, 1); // Return only the most relevant next task
  }

  private collectAllBlockers(statuses: Map<AgentType, AgentStatus>): any[] {
    const allBlockers: any[] = [];

    for (const [agentType, status] of statuses) {
      if (status.blockers && status.blockers.length > 0) {
        status.blockers.forEach(blocker => {
          allBlockers.push({
            ...blocker,
            agentType
          });
        });
      }
    }

    // Sort blockers by severity
    return allBlockers.sort((a, b) => {
      const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return (severityOrder[a.severity as keyof typeof severityOrder] || 4) - 
             (severityOrder[b.severity as keyof typeof severityOrder] || 4);
    });
  }

  private generateRecommendations(
    statuses: Map<AgentType, AgentStatus>,
    metrics: Map<AgentType, AgentMetrics>,
    blockers: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical blockers recommendations
    const criticalBlockers = blockers.filter(b => b.severity === 'CRITICAL');
    if (criticalBlockers.length > 0) {
      recommendations.push(`🚨 Address ${criticalBlockers.length} critical blockers immediately`);
    }

    // Health-based recommendations
    const unhealthyAgents = Array.from(statuses.entries())
      .filter(([_, status]) => status.health === 'UNHEALTHY')
      .map(([agentType]) => agentType);

    if (unhealthyAgents.length > 0) {
      recommendations.push(`🏥 Focus on restoring health of ${unhealthyAgents.join(', ')} agents`);
    }

    // Progress-based recommendations
    const laggingAgents = Array.from(statuses.entries())
      .filter(([_, status]) => status.progress < 50)
      .map(([agentType]) => agentType);

    if (laggingAgents.length > 2) {
      recommendations.push(`⏰ Accelerate progress on ${laggingAgents.join(', ')} to maintain schedule`);
    }

    // Dependency-based recommendations
    const readyToIntegrate = this.identifyIntegrationOpportunities(statuses);
    if (readyToIntegrate.length > 0) {
      recommendations.push(`🔗 ${readyToIntegrate.join(' and ')} are ready for integration`);
    }

    // Performance recommendations
    const performanceIssues = this.identifyPerformanceIssues(statuses);
    if (performanceIssues.length > 0) {
      recommendations.push(`⚡ Optimize performance for ${performanceIssues.join(', ')}`);
    }

    // Resource optimization
    const overUtilized = Array.from(metrics.entries())
      .filter(([_, metric]) => metric.resourceUtilization > 80)
      .map(([agentType]) => agentType);

    if (overUtilized.length > 0) {
      recommendations.push(`💻 Monitor resource usage for ${overUtilized.join(', ')}`);
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private identifyIntegrationOpportunities(statuses: Map<AgentType, AgentStatus>): string[] {
    const opportunities: string[] = [];

    const backendReady = statuses.get(AgentType.BACKEND_API)?.progress || 0 > 80;
    const frontendReady = statuses.get(AgentType.FRONTEND_UI)?.progress || 0 > 60;
    
    if (backendReady && frontendReady) {
      opportunities.push('Backend and Frontend');
    }

    const aiReady = statuses.get(AgentType.AI_ML)?.progress || 0 > 70;
    if (backendReady && aiReady) {
      opportunities.push('Backend and AI services');
    }

    const oauthReady = statuses.get(AgentType.INTEGRATION_WORKFLOW)?.progress || 0 > 50;
    if (backendReady && oauthReady) {
      opportunities.push('Backend and OAuth providers');
    }

    return opportunities;
  }

  private identifyPerformanceIssues(statuses: Map<AgentType, AgentStatus>): string[] {
    const issues: string[] = [];

    for (const [agentType, status] of statuses) {
      if (status.performance.responseTime > 5000) {
        issues.push(agentType);
      }
    }

    return issues;
  }

  private generateNextActions(
    statuses: Map<AgentType, AgentStatus>,
    metrics: Map<AgentType, AgentMetrics>
  ): NextAction[] {
    const actions: NextAction[] = [];

    for (const [agentType, status] of statuses) {
      const metric = metrics.get(agentType);

      // Determine next action based on current state
      const action = this.determineNextAction(agentType, status, metric);
      if (action) {
        actions.push(action);
      }
    }

    // Sort by priority and filter auto-executable actions first
    return actions
      .sort((a, b) => a.priority - b.priority)
      .sort((a, b) => (b.autoExecutable ? 1 : 0) - (a.autoExecutable ? 1 : 0));
  }

  private determineNextAction(
    agentType: AgentType,
    status: AgentStatus,
    metric?: AgentMetrics
  ): NextAction | null {
    // If agent has active task, that's the next action
    if (status.activeTask && status.activeTask.status === 'IN_PROGRESS') {
      return {
        agentType,
        action: `Continue: ${status.activeTask.name}`,
        priority: status.activeTask.priority || 3,
        estimatedDuration: status.activeTask.estimatedDuration || 60,
        dependencies: status.activeTask.dependencies || [],
        autoExecutable: false
      };
    }

    // If agent has critical blockers, resolve them first
    const criticalBlockers = status.blockers?.filter(b => b.severity === 'CRITICAL') || [];
    if (criticalBlockers.length > 0) {
      return {
        agentType,
        action: `Resolve critical blocker: ${criticalBlockers[0].description}`,
        priority: 1,
        estimatedDuration: 30,
        dependencies: [],
        autoExecutable: criticalBlockers[0].autoResolvable || false
      };
    }

    // Based on progress, suggest next logical step
    if (status.progress < 25) {
      return this.getInitializationAction(agentType);
    } else if (status.progress < 75) {
      return this.getDevelopmentAction(agentType, status);
    } else if (status.progress < 95) {
      return this.getIntegrationAction(agentType, status);
    } else {
      return this.getOptimizationAction(agentType, status);
    }
  }

  private getInitializationAction(agentType: AgentType): NextAction {
    const actions = {
      [AgentType.BACKEND_API]: 'Initialize API server and database connection',
      [AgentType.FRONTEND_UI]: 'Set up Next.js application structure',
      [AgentType.AI_ML]: 'Load and configure ML models',
      [AgentType.INTEGRATION_WORKFLOW]: 'Configure OAuth providers',
      [AgentType.DEVOPS_INFRASTRUCTURE]: 'Start Docker services',
      [AgentType.TESTING_QA]: 'Set up test framework and initial tests'
    };

    return {
      agentType,
      action: actions[agentType],
      priority: 2,
      estimatedDuration: 45,
      dependencies: [],
      autoExecutable: true
    };
  }

  private getDevelopmentAction(agentType: AgentType, status: AgentStatus): NextAction {
    const actions = {
      [AgentType.BACKEND_API]: 'Develop core API endpoints',
      [AgentType.FRONTEND_UI]: 'Build essential UI components',
      [AgentType.AI_ML]: 'Implement embedding and search functionality',
      [AgentType.INTEGRATION_WORKFLOW]: 'Integrate third-party APIs',
      [AgentType.DEVOPS_INFRASTRUCTURE]: 'Complete database migrations',
      [AgentType.TESTING_QA]: 'Expand test coverage'
    };

    return {
      agentType,
      action: actions[agentType],
      priority: 2,
      estimatedDuration: 90,
      dependencies: [],
      autoExecutable: false
    };
  }

  private getIntegrationAction(agentType: AgentType, status: AgentStatus): NextAction {
    const actions = {
      [AgentType.BACKEND_API]: 'Integrate with AI services',
      [AgentType.FRONTEND_UI]: 'Connect to backend APIs',
      [AgentType.AI_ML]: 'Fine-tune matching algorithms',
      [AgentType.INTEGRATION_WORKFLOW]: 'Test end-to-end workflows',
      [AgentType.DEVOPS_INFRASTRUCTURE]: 'Prepare deployment configurations',
      [AgentType.TESTING_QA]: 'Run comprehensive test suites'
    };

    return {
      agentType,
      action: actions[agentType],
      priority: 3,
      estimatedDuration: 60,
      dependencies: ['prerequisite-services'],
      autoExecutable: false
    };
  }

  private getOptimizationAction(agentType: AgentType, status: AgentStatus): NextAction {
    const actions = {
      [AgentType.BACKEND_API]: 'Optimize API performance and caching',
      [AgentType.FRONTEND_UI]: 'Enhance user experience and responsiveness',
      [AgentType.AI_ML]: 'Optimize model inference performance',
      [AgentType.INTEGRATION_WORKFLOW]: 'Implement advanced workflow automation',
      [AgentType.DEVOPS_INFRASTRUCTURE]: 'Set up monitoring and alerting',
      [AgentType.TESTING_QA]: 'Implement performance and load testing'
    };

    return {
      agentType,
      action: actions[agentType],
      priority: 4,
      estimatedDuration: 120,
      dependencies: ['core-functionality-complete'],
      autoExecutable: false
    };
  }

  private estimateCompletion(
    statuses: Map<AgentType, AgentStatus>,
    metrics: Map<AgentType, AgentMetrics>
  ): Date {
    const now = new Date();
    let maxTimeToCompletion = 0;

    for (const [agentType, status] of statuses) {
      const metric = metrics.get(agentType);
      const remainingProgress = 100 - (status.progress || 0);
      
      // Estimate based on current velocity
      const avgTaskTime = metric?.averageTaskTime || 60; // minutes
      const estimatedRemainingTasks = Math.ceil(remainingProgress / 10); // Assume 10% per task
      const estimatedMinutes = estimatedRemainingTasks * avgTaskTime;
      
      maxTimeToCompletion = Math.max(maxTimeToCompletion, estimatedMinutes);
    }

    // Add buffer for integration and testing
    const bufferMinutes = maxTimeToCompletion * 0.2;
    const totalMinutes = maxTimeToCompletion + bufferMinutes;

    const estimatedCompletion = new Date(now.getTime() + totalMinutes * 60 * 1000);
    return estimatedCompletion;
  }

  private identifyCriticalPath(
    statuses: Map<AgentType, AgentStatus>,
    metrics: Map<AgentType, AgentMetrics>
  ): string[] {
    const path: string[] = [];

    // Critical path typically follows: Infrastructure -> Backend -> AI -> Frontend -> Integration -> Testing
    const criticalOrder = [
      AgentType.DEVOPS_INFRASTRUCTURE,
      AgentType.BACKEND_API,
      AgentType.AI_ML,
      AgentType.FRONTEND_UI,
      AgentType.INTEGRATION_WORKFLOW,
      AgentType.TESTING_QA
    ];

    for (const agentType of criticalOrder) {
      const status = statuses.get(agentType);
      if (!status) continue;

      if (status.progress < 100) {
        if (status.activeTask) {
          path.push(`${agentType}: ${status.activeTask.name}`);
        } else {
          path.push(`${agentType}: Next task pending`);
        }
      }
    }

    return path;
  }
}