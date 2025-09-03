import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { AgentType, AgentStatus, AgentMetrics, AutomationTrigger, TriggerType, AgentTask } from './types';
import type { AgentOrchestrator } from './AgentOrchestrator';

export class TriggerProcessor extends EventEmitter {
  private triggers: Map<string, AutomationTrigger> = new Map();
  private triggerCooldowns: Map<string, Date> = new Map();
  private isRunning: boolean = false;

  constructor(private orchestrator: AgentOrchestrator) {
    super();
    this.initializeDefaultTriggers();
  }

  private initializeDefaultTriggers(): void {
    // Backend API completion triggers
    this.addTrigger({
      id: 'backend-api-ready',
      name: 'Backend API Ready - Notify Frontend',
      type: 'SERVICE_READY',
      description: 'When backend APIs are operational, notify frontend for integration',
      conditions: [
        { field: 'status', operator: 'equals', value: 'ACTIVE', agentType: AgentType.BACKEND_API },
        { field: 'health', operator: 'equals', value: 'HEALTHY', agentType: AgentType.BACKEND_API },
        { field: 'progress', operator: 'greater_than', value: 80, agentType: AgentType.BACKEND_API }
      ],
      actions: [
        {
          type: 'NOTIFY_AGENT',
          target: AgentType.FRONTEND_UI,
          payload: { message: 'Backend APIs are ready for integration', apis: 'all-endpoints' }
        },
        {
          type: 'ASSIGN_TASK',
          target: AgentType.FRONTEND_UI,
          payload: {
            task: {
              name: 'Integrate Backend APIs',
              description: 'Connect frontend components to backend API endpoints',
              priority: 2,
              dependencies: ['backend-api-ready']
            }
          }
        }
      ],
      enabled: true,
      priority: 1,
      cooldownMs: 5 * 60 * 1000 // 5 minutes
    });

    // OAuth credentials ready trigger
    this.addTrigger({
      id: 'oauth-ready',
      name: 'OAuth Ready - Start Authentication Testing',
      type: 'SERVICE_READY',
      description: 'When OAuth providers are configured, initiate authentication testing',
      conditions: [
        { field: 'progress', operator: 'greater_than', value: 60, agentType: AgentType.INTEGRATION_WORKFLOW }
      ],
      actions: [
        {
          type: 'ASSIGN_TASK',
          target: AgentType.TESTING_QA,
          payload: {
            task: {
              name: 'Test Social Authentication',
              description: 'Execute OAuth authentication flow tests',
              priority: 3,
              dependencies: ['oauth-setup']
            }
          }
        },
        {
          type: 'NOTIFY_AGENT',
          target: AgentType.FRONTEND_UI,
          payload: { message: 'OAuth providers ready - implement social login UI' }
        }
      ],
      enabled: true,
      priority: 2,
      cooldownMs: 10 * 60 * 1000
    });

    // AI services operational trigger
    this.addTrigger({
      id: 'ai-services-ready',
      name: 'AI Services Ready - Begin Integration',
      type: 'SERVICE_READY',
      description: 'When AI services are operational, integrate with backend',
      conditions: [
        { field: 'status', operator: 'equals', value: 'ACTIVE', agentType: AgentType.AI_ML },
        { field: 'progress', operator: 'greater_than', value: 70, agentType: AgentType.AI_ML }
      ],
      actions: [
        {
          type: 'ASSIGN_TASK',
          target: AgentType.BACKEND_API,
          payload: {
            task: {
              name: 'Integrate AI Services',
              description: 'Connect backend to AI/ML models and embedding services',
              priority: 2,
              dependencies: ['ai-models-loaded']
            }
          }
        },
        {
          type: 'ASSIGN_TASK',
          target: AgentType.AI_ML,
          payload: {
            task: {
              name: 'Generate Initial Embeddings',
              description: 'Create embeddings for existing talent profiles',
              priority: 3,
              dependencies: ['ai-services-ready']
            }
          }
        }
      ],
      enabled: true,
      priority: 1,
      cooldownMs: 15 * 60 * 1000
    });

    // Test failures trigger
    this.addTrigger({
      id: 'test-failures-detected',
      name: 'Test Failures - Auto Debug Assignment',
      type: 'ERROR_DETECTION',
      description: 'When test failures are detected, assign debugging tasks',
      conditions: [
        { field: 'health', operator: 'equals', value: 'UNHEALTHY', agentType: AgentType.TESTING_QA }
      ],
      actions: [
        {
          type: 'ASSIGN_TASK',
          target: AgentType.BACKEND_API,
          payload: {
            task: {
              name: 'Debug Backend Test Failures',
              description: 'Investigate and fix backend-related test failures',
              priority: 1,
              dependencies: []
            }
          }
        },
        {
          type: 'ASSIGN_TASK',
          target: AgentType.FRONTEND_UI,
          payload: {
            task: {
              name: 'Debug Frontend Test Failures',
              description: 'Investigate and fix frontend-related test failures',
              priority: 1,
              dependencies: []
            }
          }
        }
      ],
      enabled: true,
      priority: 3,
      cooldownMs: 5 * 60 * 1000
    });

    // Infrastructure issues trigger
    this.addTrigger({
      id: 'infrastructure-issues',
      name: 'Infrastructure Issues - Auto Escalation',
      type: 'ERROR_DETECTION',
      description: 'When infrastructure issues are detected, auto-escalate to DevOps',
      conditions: [
        { field: 'health', operator: 'equals', value: 'UNHEALTHY', agentType: AgentType.DEVOPS_INFRASTRUCTURE }
      ],
      actions: [
        {
          type: 'ESCALATE',
          target: AgentType.DEVOPS_INFRASTRUCTURE,
          payload: {
            message: 'Critical infrastructure issues detected',
            priority: 'HIGH',
            autoRestart: true
          }
        }
      ],
      enabled: true,
      priority: 1,
      cooldownMs: 2 * 60 * 1000
    });

    // Integration blockers trigger
    this.addTrigger({
      id: 'integration-blockers',
      name: 'Integration Blockers - Coordinate Resolution',
      type: 'DEPENDENCY_RESOLVED',
      description: 'When integration blockers are detected, coordinate between agents',
      conditions: [
        { field: 'blockerCount', operator: 'greater_than', value: 0, agentType: AgentType.INTEGRATION_WORKFLOW }
      ],
      actions: [
        {
          type: 'NOTIFY_AGENT',
          target: 'ALL',
          payload: {
            message: 'Integration blockers detected - check dependencies',
            blockingAgent: AgentType.INTEGRATION_WORKFLOW
          }
        }
      ],
      enabled: true,
      priority: 2,
      cooldownMs: 10 * 60 * 1000
    });

    logger.info(`🎯 TriggerProcessor: Initialized ${this.triggers.size} default automation triggers`);
  }

  private addTrigger(trigger: AutomationTrigger): void {
    this.triggers.set(trigger.id, trigger);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ TriggerProcessor: Already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 TriggerProcessor: Started automation trigger processing');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('⚠️ TriggerProcessor: Not running');
      return;
    }

    this.isRunning = false;
    logger.info('🛑 TriggerProcessor: Stopped automation trigger processing');
  }

  async evaluateTriggers(agentType: AgentType, status: Partial<AgentStatus>, metrics: Partial<AgentMetrics>): Promise<void> {
    if (!this.isRunning) return;

    const context = { agentType, status, metrics };

    for (const [triggerId, trigger] of this.triggers) {
      if (!trigger.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(triggerId)) continue;

      try {
        const shouldExecute = this.evaluateTriggerConditions(trigger, context);
        
        if (shouldExecute) {
          await this.executeTrigger(trigger, context);
          this.setCooldown(triggerId, trigger.cooldownMs);
        }
      } catch (error) {
        logger.error(`❌ TriggerProcessor: Error evaluating trigger ${triggerId}`, error);
      }
    }
  }

  private evaluateTriggerConditions(trigger: AutomationTrigger, context: any): boolean {
    return trigger.conditions.every(condition => {
      // If condition specifies agent type, only evaluate for that agent
      if (condition.agentType && condition.agentType !== context.agentType) {
        return true; // Skip this condition for other agents
      }

      const value = this.extractValue(context, condition.field);
      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  private extractValue(context: any, field: string): any {
    // Check in status first, then metrics
    if (context.status && context.status[field] !== undefined) {
      return context.status[field];
    }
    if (context.metrics && context.metrics[field] !== undefined) {
      return context.metrics[field];
    }
    return null;
  }

  private evaluateCondition(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'exists':
        return actualValue !== null && actualValue !== undefined;
      default:
        return false;
    }
  }

  private async executeTrigger(trigger: AutomationTrigger, context: any): Promise<void> {
    logger.info(`⚡ TriggerProcessor: Executing trigger "${trigger.name}"`);

    for (const action of trigger.actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        logger.error(`❌ TriggerProcessor: Action execution failed for ${trigger.name}`, error);
      }
    }

    this.emit('automation:trigger:executed', trigger, context);
    trigger.lastExecuted = new Date();
  }

  private async executeAction(action: any, context: any): Promise<void> {
    switch (action.type) {
      case 'NOTIFY_AGENT':
        await this.notifyAgent(action.target, action.payload);
        break;
        
      case 'ASSIGN_TASK':
        await this.assignTask(action.target, action.payload.task);
        break;
        
      case 'RESTART_SERVICE':
        await this.restartService(action.payload);
        break;
        
      case 'ESCALATE':
        await this.escalateIssue(action.target, action.payload);
        break;
        
      case 'AUTO_RESOLVE':
        await this.autoResolveIssue(action.target, action.payload);
        break;
        
      case 'UPDATE_CONFIG':
        await this.updateConfiguration(action.target, action.payload);
        break;
        
      default:
        logger.warn(`⚠️ Unknown action type: ${action.type}`);
    }
  }

  private async notifyAgent(target: AgentType | 'ALL', payload: any): Promise<void> {
    if (target === 'ALL') {
      logger.info(`📢 Broadcasting notification to all agents: ${payload.message}`);
      this.orchestrator.emit('notification:broadcast', payload);
    } else {
      logger.info(`📨 Notifying ${target}: ${payload.message}`);
      this.orchestrator.emit('notification:agent', target, payload);
    }
  }

  private async assignTask(target: AgentType, task: any): Promise<void> {
    const fullTask: AgentTask = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assignedAt: new Date(),
      status: 'PENDING',
      dependencies: [],
      blockers: [],
      progress: 0,
      metadata: { automated: true },
      ...task
    };

    logger.info(`📋 Auto-assigning task to ${target}: ${task.name}`);
    await this.orchestrator.assignTask(target, fullTask);
  }

  private async restartService(payload: any): Promise<void> {
    logger.info(`🔄 Auto-restarting service: ${payload.service}`);
    // Implementation would depend on deployment method (Docker, Kubernetes, etc.)
    this.orchestrator.emit('service:restart', payload);
  }

  private async escalateIssue(target: AgentType, payload: any): Promise<void> {
    logger.warn(`🚨 Auto-escalating issue to ${target}: ${payload.message}`);
    this.orchestrator.emit('issue:escalated', target, payload);
  }

  private async autoResolveIssue(target: AgentType, payload: any): Promise<void> {
    logger.info(`🔧 Auto-resolving issue for ${target}: ${payload.issue}`);
    this.orchestrator.emit('issue:auto_resolve', target, payload);
  }

  private async updateConfiguration(target: AgentType, payload: any): Promise<void> {
    logger.info(`⚙️ Auto-updating configuration for ${target}`);
    this.orchestrator.emit('config:update', target, payload);
  }

  // Auto-resolution methods
  async executeAutoResolution(agentType: AgentType, status: AgentStatus): Promise<void> {
    logger.info(`🔧 TriggerProcessor: Executing auto-resolution for ${agentType}`);

    switch (agentType) {
      case AgentType.BACKEND_API:
        await this.autoResolveBackendIssues(status);
        break;
      case AgentType.DEVOPS_INFRASTRUCTURE:
        await this.autoResolveInfrastructureIssues(status);
        break;
      case AgentType.FRONTEND_UI:
        await this.autoResolveFrontendIssues(status);
        break;
      default:
        logger.info(`🔧 No auto-resolution available for ${agentType}`);
    }
  }

  private async autoResolveBackendIssues(status: AgentStatus): Promise<void> {
    const dbBlocker = status.blockers.find(b => b.type === 'DATABASE_UNAVAILABLE');
    if (dbBlocker) {
      logger.info('🔧 Auto-resolving database connection issue');
      this.orchestrator.emit('auto_resolve:database_restart');
    }
  }

  private async autoResolveInfrastructureIssues(status: AgentStatus): Promise<void> {
    const dockerBlocker = status.blockers.find(b => b.type === 'INFRASTRUCTURE_UNAVAILABLE');
    if (dockerBlocker) {
      logger.info('🔧 Auto-resolving Docker services issue');
      this.orchestrator.emit('auto_resolve:docker_restart');
    }
  }

  private async autoResolveFrontendIssues(status: AgentStatus): Promise<void> {
    const buildBlocker = status.blockers.find(b => b.type === 'BUILD_PROCESS_FAILED');
    if (buildBlocker) {
      logger.info('🔧 Auto-resolving frontend build issue');
      this.orchestrator.emit('auto_resolve:frontend_rebuild');
    }
  }

  // Task completion triggers
  async executeTaskCompletionTriggers(agentType: AgentType, task: AgentTask): Promise<void> {
    logger.info(`✅ TriggerProcessor: Processing task completion triggers for ${agentType}`);

    // Specific task completion handlers
    if (task.name.includes('Database Migration') && agentType === AgentType.DEVOPS_INFRASTRUCTURE) {
      await this.assignTask(AgentType.BACKEND_API, {
        name: 'Update Database Models',
        description: 'Update Prisma models after migration completion',
        priority: 2,
        dependencies: ['database-migration-complete']
      });
    }

    if (task.name.includes('OAuth') && agentType === AgentType.INTEGRATION_WORKFLOW) {
      await this.assignTask(AgentType.TESTING_QA, {
        name: 'Test OAuth Integration',
        description: 'Execute OAuth authentication flow tests',
        priority: 3,
        dependencies: ['oauth-setup-complete']
      });
    }
  }

  // Failure recovery
  async executeFailureRecovery(agentType: AgentType, task: AgentTask, error: any): Promise<void> {
    logger.warn(`💥 TriggerProcessor: Executing failure recovery for ${agentType}`);

    await this.assignTask(agentType, {
      name: `Debug: ${task.name}`,
      description: `Investigate and fix failure in: ${task.name}`,
      priority: 1,
      dependencies: [],
      metadata: { 
        failedTask: task.id,
        error: error.message,
        automated: true,
        recovery: true
      }
    });
  }

  // Blocker resolution
  async executeBlockerResolution(agentType: AgentType, blocker: any): Promise<void> {
    logger.warn(`🚫 TriggerProcessor: Executing blocker resolution for ${agentType}`);

    if (blocker.autoResolvable) {
      await this.autoResolveIssue(agentType, { 
        issue: blocker.type,
        description: blocker.description,
        steps: blocker.resolutionSteps
      });
    } else {
      // Escalate to human oversight
      await this.escalateIssue(agentType, {
        message: `Manual intervention required for blocker: ${blocker.description}`,
        priority: 'HIGH',
        blocker: blocker
      });
    }
  }

  // Manual trigger execution
  async executeManualTrigger(triggerName: string, params: any = {}): Promise<any> {
    const trigger = Array.from(this.triggers.values()).find(t => t.name === triggerName);
    
    if (!trigger) {
      throw new Error(`Manual trigger "${triggerName}" not found`);
    }

    logger.info(`🎯 TriggerProcessor: Executing manual trigger "${triggerName}"`);
    
    const context = { 
      agentType: AgentType.BACKEND_API, // Default context
      status: {},
      metrics: {},
      ...params
    };

    await this.executeTrigger(trigger, context);
    return { success: true, trigger: trigger.name, params };
  }

  private isInCooldown(triggerId: string): boolean {
    const cooldownTime = this.triggerCooldowns.get(triggerId);
    if (!cooldownTime) return false;
    
    return Date.now() - cooldownTime.getTime() < (this.triggers.get(triggerId)?.cooldownMs || 0);
  }

  private setCooldown(triggerId: string, cooldownMs: number): void {
    this.triggerCooldowns.set(triggerId, new Date());
  }

  // Public API
  getTriggers(): AutomationTrigger[] {
    return Array.from(this.triggers.values());
  }

  getTrigger(id: string): AutomationTrigger | undefined {
    return this.triggers.get(id);
  }

  enableTrigger(id: string): boolean {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = true;
      return true;
    }
    return false;
  }

  disableTrigger(id: string): boolean {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = false;
      return true;
    }
    return false;
  }
}