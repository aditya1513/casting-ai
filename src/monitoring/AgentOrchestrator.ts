import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { AgentStatus, AgentType, MonitoringConfig, AgentMetrics, AutomationTrigger } from './types';
import { BackendApiMonitor } from './agents/BackendApiMonitor';
import { FrontendUiMonitor } from './agents/FrontendUiMonitor';
import { AiMlMonitor } from './agents/AiMlMonitor';
import { IntegrationWorkflowMonitor } from './agents/IntegrationWorkflowMonitor';
import { DevOpsInfrastructureMonitor } from './agents/DevOpsInfrastructureMonitor';
import { TestingQaMonitor } from './agents/TestingQaMonitor';
import { TriggerProcessor } from './TriggerProcessor';
import { ReportGenerator } from './ReportGenerator';

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<AgentType, any> = new Map();
  private agentStatuses: Map<AgentType, AgentStatus> = new Map();
  private agentMetrics: Map<AgentType, AgentMetrics> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private reportingInterval: NodeJS.Timeout | null = null;
  private triggerProcessor: TriggerProcessor;
  private reportGenerator: ReportGenerator;
  private isRunning: boolean = false;

  constructor(private config: MonitoringConfig) {
    super();
    this.initializeAgents();
    this.triggerProcessor = new TriggerProcessor(this);
    this.reportGenerator = new ReportGenerator(this);
    this.setupEventHandlers();
  }

  private initializeAgents(): void {
    // Initialize all 6 development agents
    this.agents.set(AgentType.BACKEND_API, new BackendApiMonitor(this.config.agents.backend));
    this.agents.set(AgentType.FRONTEND_UI, new FrontendUiMonitor(this.config.agents.frontend));
    this.agents.set(AgentType.AI_ML, new AiMlMonitor(this.config.agents.ai));
    this.agents.set(AgentType.INTEGRATION_WORKFLOW, new IntegrationWorkflowMonitor(this.config.agents.integration));
    this.agents.set(AgentType.DEVOPS_INFRASTRUCTURE, new DevOpsInfrastructureMonitor(this.config.agents.devops));
    this.agents.set(AgentType.TESTING_QA, new TestingQaMonitor(this.config.agents.testing));

    // Initialize status tracking for all agents
    Object.values(AgentType).forEach(agentType => {
      this.agentStatuses.set(agentType, {
        agentType,
        status: 'INITIALIZING',
        lastCheck: new Date(),
        health: 'UNKNOWN',
        activeTask: null,
        progress: 0,
        blockers: [],
        dependencies: [],
        completedTasks: [],
        pendingTasks: [],
        errorMessages: [],
        performance: {
          responseTime: 0,
          throughput: 0,
          errorRate: 0,
          uptime: 0
        }
      });

      this.agentMetrics.set(agentType, {
        agentType,
        timestamp: new Date(),
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksPending: 0,
        averageTaskTime: 0,
        successRate: 0,
        blockerCount: 0,
        dependencyCount: 0,
        resourceUtilization: 0
      });
    });

    logger.info('🤖 Agent Orchestrator: All 6 development agents initialized');
  }

  private setupEventHandlers(): void {
    // Listen for agent status updates
    this.on('agent:status:updated', this.handleAgentStatusUpdate.bind(this));
    this.on('agent:task:completed', this.handleTaskCompleted.bind(this));
    this.on('agent:task:failed', this.handleTaskFailed.bind(this));
    this.on('agent:blocker:detected', this.handleBlockerDetected.bind(this));
    this.on('automation:trigger:executed', this.handleTriggerExecuted.bind(this));
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('🚨 Agent Orchestrator: Already running');
      return;
    }

    logger.info('🚀 Agent Orchestrator: Starting automated monitoring system');
    this.isRunning = true;

    // Start all agent monitors
    for (const [agentType, monitor] of this.agents) {
      try {
        await monitor.start();
        this.updateAgentStatus(agentType, { status: 'ACTIVE', health: 'HEALTHY' });
        logger.info(`✅ ${agentType} Monitor: Started successfully`);
      } catch (error) {
        logger.error(`❌ ${agentType} Monitor: Failed to start`, error);
        this.updateAgentStatus(agentType, { 
          status: 'ERROR', 
          health: 'UNHEALTHY',
          errorMessages: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    // Start 15-minute monitoring cycle
    this.startMonitoringCycle();

    // Start 30-minute reporting cycle
    this.startReportingCycle();

    // Start trigger processor
    await this.triggerProcessor.start();

    logger.info('🎯 Agent Orchestrator: Fully operational - monitoring all 6 agents');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('⚠️ Agent Orchestrator: Not running');
      return;
    }

    logger.info('🛑 Agent Orchestrator: Stopping monitoring system');
    this.isRunning = false;

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }

    // Stop all agents
    for (const [agentType, monitor] of this.agents) {
      try {
        await monitor.stop();
        this.updateAgentStatus(agentType, { status: 'STOPPED', health: 'UNKNOWN' });
      } catch (error) {
        logger.error(`❌ ${agentType} Monitor: Failed to stop gracefully`, error);
      }
    }

    // Stop trigger processor
    await this.triggerProcessor.stop();

    logger.info('✅ Agent Orchestrator: Stopped successfully');
  }

  private startMonitoringCycle(): void {
    // 15-minute status checks
    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, this.config.monitoring.checkInterval);

    // Perform initial check
    setTimeout(() => this.performMonitoringCycle(), 1000);
  }

  private startReportingCycle(): void {
    // 30-minute intelligent reports
    this.reportingInterval = setInterval(async () => {
      await this.generateProgressReport();
    }, this.config.reporting.reportInterval);

    // Generate initial report after 5 minutes
    setTimeout(() => this.generateProgressReport(), 5 * 60 * 1000);
  }

  private async performMonitoringCycle(): Promise<void> {
    logger.info('🔍 Agent Orchestrator: Starting monitoring cycle');

    const checkPromises = Array.from(this.agents.entries()).map(async ([agentType, monitor]) => {
      try {
        const status = await monitor.checkStatus();
        this.updateAgentStatus(agentType, status);
        
        const metrics = await monitor.getMetrics();
        this.updateAgentMetrics(agentType, metrics);

        // Check for automated triggers
        await this.triggerProcessor.evaluateTriggers(agentType, status, metrics);

        return { agentType, success: true, status };
      } catch (error) {
        logger.error(`❌ ${agentType} Monitor: Status check failed`, error);
        this.updateAgentStatus(agentType, {
          status: 'ERROR',
          health: 'UNHEALTHY',
          errorMessages: [error instanceof Error ? error.message : 'Status check failed']
        });
        return { agentType, success: false, error };
      }
    });

    const results = await Promise.all(checkPromises);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    logger.info(`📊 Monitoring Cycle Complete: ${successCount} healthy, ${errorCount} errors`);

    // Emit monitoring cycle complete event
    this.emit('monitoring:cycle:complete', {
      timestamp: new Date(),
      successCount,
      errorCount,
      results
    });
  }

  private async generateProgressReport(): Promise<void> {
    try {
      const report = await this.reportGenerator.generateProgressReport();
      logger.info('📈 Generated automated progress report', report);
      
      this.emit('report:generated', {
        type: 'progress',
        timestamp: new Date(),
        report
      });
    } catch (error) {
      logger.error('❌ Failed to generate progress report', error);
    }
  }

  private updateAgentStatus(agentType: AgentType, updates: Partial<AgentStatus>): void {
    const currentStatus = this.agentStatuses.get(agentType);
    if (!currentStatus) return;

    const updatedStatus = {
      ...currentStatus,
      ...updates,
      lastCheck: new Date()
    };

    this.agentStatuses.set(agentType, updatedStatus);
    this.emit('agent:status:updated', agentType, updatedStatus);
  }

  private updateAgentMetrics(agentType: AgentType, metrics: Partial<AgentMetrics>): void {
    const currentMetrics = this.agentMetrics.get(agentType);
    if (!currentMetrics) return;

    const updatedMetrics = {
      ...currentMetrics,
      ...metrics,
      timestamp: new Date()
    };

    this.agentMetrics.set(agentType, updatedMetrics);
  }

  // Event handlers
  private handleAgentStatusUpdate(agentType: AgentType, status: AgentStatus): void {
    logger.info(`🔄 ${agentType}: Status updated to ${status.status}/${status.health}`);
    
    // Auto-resolve common issues
    if (status.health === 'UNHEALTHY') {
      this.triggerProcessor.executeAutoResolution(agentType, status);
    }
  }

  private handleTaskCompleted(agentType: AgentType, task: any): void {
    logger.info(`✅ ${agentType}: Task completed - ${task.name}`);
    
    // Update metrics
    const metrics = this.agentMetrics.get(agentType);
    if (metrics) {
      metrics.tasksCompleted++;
      metrics.tasksInProgress = Math.max(0, metrics.tasksInProgress - 1);
      this.agentMetrics.set(agentType, metrics);
    }

    // Trigger dependent tasks
    this.triggerProcessor.executeTaskCompletionTriggers(agentType, task);
  }

  private handleTaskFailed(agentType: AgentType, task: any, error: any): void {
    logger.error(`❌ ${agentType}: Task failed - ${task.name}`, error);
    
    // Auto-assign debugging task
    this.triggerProcessor.executeFailureRecovery(agentType, task, error);
  }

  private handleBlockerDetected(agentType: AgentType, blocker: any): void {
    logger.warn(`🚫 ${agentType}: Blocker detected - ${blocker.type}`);
    
    // Auto-escalate or resolve blocker
    this.triggerProcessor.executeBlockerResolution(agentType, blocker);
  }

  private handleTriggerExecuted(trigger: AutomationTrigger, result: any): void {
    logger.info(`⚡ Automation Trigger Executed: ${trigger.name}`, result);
  }

  // Public API
  getAgentStatus(agentType: AgentType): AgentStatus | undefined {
    return this.agentStatuses.get(agentType);
  }

  getAgentMetrics(agentType: AgentType): AgentMetrics | undefined {
    return this.agentMetrics.get(agentType);
  }

  getAllStatuses(): Map<AgentType, AgentStatus> {
    return new Map(this.agentStatuses);
  }

  getAllMetrics(): Map<AgentType, AgentMetrics> {
    return new Map(this.agentMetrics);
  }

  async executeManualTrigger(triggerName: string, params: any = {}): Promise<any> {
    return await this.triggerProcessor.executeManualTrigger(triggerName, params);
  }

  async assignTask(agentType: AgentType, task: any): Promise<boolean> {
    try {
      const monitor = this.agents.get(agentType);
      if (!monitor) {
        throw new Error(`Agent ${agentType} not found`);
      }

      await monitor.assignTask(task);
      logger.info(`📋 ${agentType}: Task assigned - ${task.name}`);
      
      // Update metrics
      const metrics = this.agentMetrics.get(agentType);
      if (metrics) {
        metrics.tasksPending++;
        this.agentMetrics.set(agentType, metrics);
      }

      return true;
    } catch (error) {
      logger.error(`❌ Failed to assign task to ${agentType}`, error);
      return false;
    }
  }

  getHealthSummary(): { healthy: number; unhealthy: number; unknown: number } {
    let healthy = 0, unhealthy = 0, unknown = 0;
    
    for (const status of this.agentStatuses.values()) {
      switch (status.health) {
        case 'HEALTHY': healthy++; break;
        case 'UNHEALTHY': unhealthy++; break;
        default: unknown++; break;
      }
    }

    return { healthy, unhealthy, unknown };
  }
}