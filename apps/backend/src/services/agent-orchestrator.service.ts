/**
 * Agent Orchestrator Service
 * Coordinates multiple agents for complex casting workflows
 * Manages dependencies, parallel execution, and workflow state
 */

import { agentClient } from './agent-client.service';
import { db } from '../config/database';
import { 
  conversations, 
  messages, 
  projects, 
  projectRoles,
  applications,
  auditions,
  memories
} from '../models/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger';
import type { 
  AgentTask, 
  OrchestrationPlan,
  WorkflowResult,
  ScriptAnalysisResult,
  TalentDiscoveryResult,
  ApplicationScreeningResult,
  AuditionSchedulingResult
} from '../types/agents';

export class AgentOrchestratorService {
  private activePlans: Map<string, OrchestrationPlan> = new Map();
  private taskResults: Map<string, any> = new Map();

  /**
   * Create a complete casting workflow plan
   */
  async createCastingWorkflowPlan(params: {
    userId: string;
    projectId: string;
    scriptContent?: string;
    autoExecute?: boolean;
  }): Promise<OrchestrationPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Fetch project details
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1);

    if (!project[0]) {
      throw new Error('Project not found');
    }

    // Fetch project roles
    const roles = await db
      .select()
      .from(projectRoles)
      .where(eq(projectRoles.projectId, params.projectId));

    // Create task dependency graph
    const tasks: AgentTask[] = [];
    
    // Task 1: Script Analysis (if script provided)
    if (params.scriptContent) {
      tasks.push({
        taskId: `${planId}_script_analysis`,
        agentType: 'script_analysis',
        priority: 10,
        input: {
          scriptContent: params.scriptContent,
          projectContext: {
            type: project[0].type,
            genre: project[0].genre,
            location: 'Mumbai',
          },
        },
        dependencies: [],
        status: 'queued',
      });
    }

    // Task 2: Talent Discovery for each role
    roles.forEach((role, index) => {
      tasks.push({
        taskId: `${planId}_talent_discovery_${role.id}`,
        agentType: 'talent_discovery',
        priority: 8,
        input: {
          roleDescription: role.description || role.roleName,
          roleId: role.id,
          physicalRequirements: {
            ageRange: { min: role.ageMin || 18, max: role.ageMax || 65 },
            gender: role.gender,
          },
          experienceLevel: role.experience || 'experienced',
          budgetRange: {
            min: Number(role.budget) * 0.8 || 10000,
            max: Number(role.budget) * 1.2 || 100000,
          },
          locationPreference: 'Mumbai',
          languages: role.languages || ['Hindi', 'English'],
          skills: role.skills || [],
        },
        dependencies: params.scriptContent ? [`${planId}_script_analysis`] : [],
        status: 'queued',
      });
    });

    // Task 3: Application Screening (after talent discovery)
    if (roles.length > 0) {
      tasks.push({
        taskId: `${planId}_application_screening`,
        agentType: 'application_screening',
        priority: 6,
        input: {
          projectId: params.projectId,
          roleIds: roles.map(r => r.id),
        },
        dependencies: roles.map(r => `${planId}_talent_discovery_${r.id}`),
        status: 'queued',
      });
    }

    // Task 4: Schedule Optimization
    tasks.push({
      taskId: `${planId}_schedule_optimization`,
      agentType: 'scheduling',
      priority: 4,
      input: {
        projectId: params.projectId,
        constraints: {
          startDate: project[0].startDate?.toISOString() || new Date().toISOString(),
          endDate: project[0].endDate?.toISOString() || 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          dailyStartTime: '09:00',
          dailyEndTime: '18:00',
          location: project[0].auditionLocation || 'Mumbai Film City',
        },
      },
      dependencies: [`${planId}_application_screening`],
      status: 'queued',
    });

    // Task 5: Communication Generation
    tasks.push({
      taskId: `${planId}_communications`,
      agentType: 'communication',
      priority: 2,
      input: {
        projectId: params.projectId,
        types: ['invitation', 'rejection', 'reminder'],
      },
      dependencies: [`${planId}_schedule_optimization`],
      status: 'queued',
    });

    // Calculate execution order
    const executionOrder = this.calculateExecutionOrder(tasks);

    const plan: OrchestrationPlan = {
      planId,
      tasks,
      executionOrder,
      estimatedDuration: tasks.length * 5000, // 5 seconds per task estimate
      resourceRequirements: {
        agents: [...new Set(tasks.map(t => t.agentType))],
        estimatedApiCalls: tasks.length * 2,
        estimatedCost: tasks.length * 0.05, // Rough estimate
      },
    };

    this.activePlans.set(planId, plan);

    // Auto-execute if requested
    if (params.autoExecute) {
      this.executePlan(planId, params.userId);
    }

    return plan;
  }

  /**
   * Execute an orchestration plan
   */
  async executePlan(planId: string, userId: string): Promise<WorkflowResult> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let completedSteps = 0;

    logger.info('Starting plan execution', { planId, taskCount: plan.tasks.length });

    // Create conversation for workflow tracking
    const conversation = await db.insert(conversations).values({
      userId,
      title: `Workflow Execution - ${new Date().toLocaleDateString()}`,
      description: 'Automated casting workflow',
      context: { planId, plan },
    }).returning();

    try {
      // Execute tasks in order
      for (const taskGroup of plan.executionOrder) {
        // Execute tasks in parallel within each group
        const groupPromises = taskGroup.map(async (taskId) => {
          const task = plan.tasks.find(t => t.taskId === taskId);
          if (!task) return;

          try {
            task.status = 'running';
            task.startTime = new Date();

            const result = await this.executeTask(task);
            
            task.status = 'completed';
            task.endTime = new Date();
            task.result = result;
            this.taskResults.set(taskId, result);
            completedSteps++;

            // Log task completion
            await db.insert(messages).values({
              conversationId: conversation[0].id,
              userId: null,
              type: 'system',
              content: `✓ Completed: ${task.agentType} (${taskId})`,
              metadata: { task, result },
              isAiResponse: true,
            });

          } catch (error: any) {
            task.status = 'failed';
            task.endTime = new Date();
            task.error = error.message;
            errors.push(`Task ${taskId} failed: ${error.message}`);
            
            logger.error('Task execution failed', { taskId, error: error.message });
          }
        });

        await Promise.all(groupPromises);
      }

    } catch (error: any) {
      errors.push(`Workflow execution error: ${error.message}`);
      logger.error('Workflow execution failed', { planId, error: error.message });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Compile workflow results
    const workflowResult: WorkflowResult = {
      workflowId: planId,
      status: errors.length === 0 ? 'completed' : 'failed',
      results: {
        scriptAnalysis: this.taskResults.get(`${planId}_script_analysis`),
        talentSearchResults: this.compileTalentResults(planId),
        screeningResults: this.taskResults.get(`${planId}_application_screening`),
        schedulingResults: this.taskResults.get(`${planId}_schedule_optimization`),
        communicationsSent: this.taskResults.get(`${planId}_communications`)?.length || 0,
      },
      timeline: {
        started: new Date(startTime),
        completed: new Date(endTime),
        duration,
      },
      summary: {
        totalSteps: plan.tasks.length,
        completedSteps,
        errors,
        recommendations: this.generateRecommendations(plan, errors),
      },
    };

    // Store workflow results in memory
    await this.storeWorkflowMemory(userId, conversation[0].id, workflowResult);

    // Clean up
    this.activePlans.delete(planId);

    return workflowResult;
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: AgentTask): Promise<any> {
    logger.info('Executing task', { taskId: task.taskId, type: task.agentType });

    switch (task.agentType) {
      case 'script_analysis':
        return await agentClient.analyzeScript(
          task.input.scriptContent,
          task.input.fileType || 'txt',
          task.input.projectContext
        );

      case 'talent_discovery':
        return await agentClient.discoverTalent(task.input);

      case 'application_screening':
        // Fetch applications from database
        const applications = await this.fetchApplicationsForScreening(
          task.input.projectId,
          task.input.roleIds
        );
        return await agentClient.screenApplications(applications);

      case 'scheduling':
        // Fetch auditions from database
        const auditions = await this.fetchAuditionsForScheduling(
          task.input.projectId
        );
        return await agentClient.optimizeScheduling({
          auditions,
          constraints: task.input.constraints,
        });

      case 'communication':
        // Generate communications for different scenarios
        const communications = [];
        for (const type of task.input.types || ['invitation']) {
          const comm = await agentClient.generateCommunication({
            type,
            recipientName: 'Talent',
            projectName: 'Project',
          });
          communications.push(comm);
        }
        return communications;

      case 'decision_support':
        return await agentClient.getDecisionSupport(task.input);

      case 'budget_optimization':
        return await agentClient.optimizeBudget(task.input);

      default:
        throw new Error(`Unknown agent type: ${task.agentType}`);
    }
  }

  /**
   * Calculate execution order based on dependencies
   */
  private calculateExecutionOrder(tasks: AgentTask[]): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(tasks.map(t => t.taskId));

    while (remaining.size > 0) {
      const currentGroup: string[] = [];

      for (const taskId of remaining) {
        const task = tasks.find(t => t.taskId === taskId)!;
        
        // Check if all dependencies are completed
        const dependenciesMet = task.dependencies.every(dep => completed.has(dep));
        
        if (dependenciesMet) {
          currentGroup.push(taskId);
        }
      }

      if (currentGroup.length === 0) {
        // Circular dependency or unmet dependency
        logger.error('Unable to resolve task dependencies', { remaining: Array.from(remaining) });
        break;
      }

      order.push(currentGroup);
      currentGroup.forEach(taskId => {
        completed.add(taskId);
        remaining.delete(taskId);
      });
    }

    return order;
  }

  /**
   * Compile talent discovery results
   */
  private compileTalentResults(planId: string): any[] {
    const results = [];
    const taskIds = Array.from(this.taskResults.keys());
    
    for (const taskId of taskIds) {
      if (taskId.includes('talent_discovery')) {
        const result = this.taskResults.get(taskId);
        if (result) {
          results.push({
            taskId,
            candidates: result.candidates || [],
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Generate workflow recommendations
   */
  private generateRecommendations(plan: OrchestrationPlan, errors: string[]): string[] {
    const recommendations: string[] = [];

    if (errors.length === 0) {
      recommendations.push('Workflow completed successfully');
      recommendations.push('Review the shortlisted candidates and proceed with auditions');
    } else {
      recommendations.push('Some tasks failed - manual intervention may be required');
      recommendations.push('Check error logs for details');
    }

    // Add task-specific recommendations
    const completedTasks = plan.tasks.filter(t => t.status === 'completed');
    
    if (completedTasks.some(t => t.agentType === 'script_analysis')) {
      recommendations.push('Script analysis complete - review character breakdowns');
    }
    
    if (completedTasks.some(t => t.agentType === 'talent_discovery')) {
      recommendations.push('Talent discovery complete - review match scores');
    }
    
    if (completedTasks.some(t => t.agentType === 'scheduling')) {
      recommendations.push('Schedule optimized - confirm audition times with talent');
    }

    return recommendations;
  }

  /**
   * Store workflow results in memory system
   */
  private async storeWorkflowMemory(
    userId: string,
    conversationId: string,
    workflowResult: WorkflowResult
  ): Promise<void> {
    try {
      await db.insert(memories).values({
        userId,
        conversationId,
        type: 'episodic',
        category: 'workflow',
        key: `workflow_${workflowResult.workflowId}`,
        value: workflowResult,
        importance: '8.00',
      });
    } catch (error) {
      logger.error('Failed to store workflow memory', error);
    }
  }

  /**
   * Fetch applications for screening
   */
  private async fetchApplicationsForScreening(
    projectId: string,
    roleIds: string[]
  ): Promise<any[]> {
    const apps = await db
      .select()
      .from(applications)
      .where(inArray(applications.projectRoleId, roleIds));

    return apps.map(app => ({
      id: app.id,
      talentId: app.talentId,
      roleId: app.projectRoleId,
      coverLetter: app.coverLetter,
    }));
  }

  /**
   * Fetch auditions for scheduling
   */
  private async fetchAuditionsForScheduling(projectId: string): Promise<any[]> {
    const auds = await db
      .select({
        audition: auditions,
        application: applications,
      })
      .from(auditions)
      .innerJoin(applications, eq(auditions.applicationId, applications.id))
      .where(eq(auditions.status, 'scheduled'));

    return auds.map(aud => ({
      talentId: aud.application.talentId,
      talentName: 'Talent', // Would need to join with users table
      duration: aud.audition.duration || 30,
    }));
  }

  /**
   * Get active plans
   */
  getActivePlans(): OrchestrationPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Cancel a plan
   */
  cancelPlan(planId: string): boolean {
    const plan = this.activePlans.get(planId);
    if (plan) {
      plan.tasks.forEach(task => {
        if (task.status === 'queued' || task.status === 'running') {
          task.status = 'failed';
          task.error = 'Plan cancelled';
        }
      });
      this.activePlans.delete(planId);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestratorService();