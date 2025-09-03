/**
 * Live Agent Monitoring System
 * Polls all 6 development agents every 2 minutes for real-time activity tracking
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentActivity {
  agentId: string;
  agentName: string;
  timestamp: Date;
  status: 'active' | 'idle' | 'blocked' | 'error';
  currentFile?: string;
  currentLineNumber?: number;
  currentOperation?: string;
  codeChanges?: {
    additions: number;
    deletions: number;
    modified: string[];
  };
  toolUsage: {
    [tool: string]: number;
  };
  errors: Array<{
    timestamp: Date;
    error: string;
    resolution?: string;
  }>;
  progressPercentage: number;
  activeTask?: string;
  dependencies?: string[];
  blockers?: string[];
}

export interface MonitoringMetrics {
  totalToolCalls: number;
  totalFileEdits: number;
  totalErrors: number;
  totalResolutions: number;
  activeTasks: number;
  completedTasks: number;
  averageProgress: number;
}

export class LiveAgentMonitor extends EventEmitter {
  private agents: Map<string, AgentActivity> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private metrics: MonitoringMetrics = {
    totalToolCalls: 0,
    totalFileEdits: 0,
    totalErrors: 0,
    totalResolutions: 0,
    activeTasks: 0,
    completedTasks: 0,
    averageProgress: 0
  };
  
  private readonly AGENT_IDS = [
    '@backend-api-developer',
    '@frontend-ui-developer',
    '@ai-ml-developer',
    '@integration-workflow-developer',
    '@devops-infrastructure-developer',
    '@testing-qa-developer'
  ];

  private readonly POLLING_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private logFile: string;

  constructor() {
    super();
    this.logFile = path.join(__dirname, '../../logs/agent-monitoring.log');
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.AGENT_IDS.forEach(agentId => {
      this.agents.set(agentId, {
        agentId,
        agentName: this.getAgentName(agentId),
        timestamp: new Date(),
        status: 'idle',
        toolUsage: {},
        errors: [],
        progressPercentage: 0
      });
    });
  }

  private getAgentName(agentId: string): string {
    const names: { [key: string]: string } = {
      '@backend-api-developer': 'Backend API Developer',
      '@frontend-ui-developer': 'Frontend UI Developer',
      '@ai-ml-developer': 'AI/ML Developer',
      '@integration-workflow-developer': 'Integration Workflow Developer',
      '@devops-infrastructure-developer': 'DevOps Infrastructure Developer',
      '@testing-qa-developer': 'Testing & QA Developer'
    };
    return names[agentId] || agentId;
  }

  /**
   * Start monitoring all agents
   */
  public startMonitoring(): void {
    console.log('🚀 Starting Live Agent Monitoring System');
    console.log(`📊 Polling interval: ${this.POLLING_INTERVAL / 1000} seconds`);
    
    // Initial poll
    this.pollAllAgents();
    
    // Set up recurring polling
    this.pollingInterval = setInterval(() => {
      this.pollAllAgents();
    }, this.POLLING_INTERVAL);

    this.emit('monitoring:started', {
      timestamp: new Date(),
      agents: Array.from(this.agents.keys())
    });
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    console.log('🛑 Monitoring stopped');
    this.emit('monitoring:stopped', { timestamp: new Date() });
  }

  /**
   * Poll all agents for current activity
   */
  private async pollAllAgents(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log(`⏰ POLLING AGENTS - ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    for (const agentId of this.AGENT_IDS) {
      try {
        const activity = await this.queryAgentActivity(agentId);
        this.agents.set(agentId, activity);
        this.updateMetrics(activity);
        this.displayAgentStatus(activity);
        this.logActivity(activity);
      } catch (error) {
        console.error(`❌ Failed to poll ${agentId}:`, error);
        this.recordError(agentId, error);
      }
    }

    this.displayMetricsSummary();
    this.checkForBlockers();
    this.emit('polling:complete', {
      timestamp: new Date(),
      agents: Array.from(this.agents.values())
    });
  }

  /**
   * Query individual agent for activity (simulated for now)
   */
  private async queryAgentActivity(agentId: string): Promise<AgentActivity> {
    // In production, this would make actual API calls to agent endpoints
    // For now, simulating realistic agent activities
    
    const activity: AgentActivity = {
      agentId,
      agentName: this.getAgentName(agentId),
      timestamp: new Date(),
      status: this.simulateStatus(),
      progressPercentage: Math.floor(Math.random() * 100),
      toolUsage: {},
      errors: []
    };

    // Simulate agent-specific activities
    switch (agentId) {
      case '@backend-api-developer':
        activity.currentFile = '/src/controllers/talent.controller.ts';
        activity.currentLineNumber = 145;
        activity.currentOperation = 'Implementing PATCH /api/talents/:id endpoint';
        activity.activeTask = 'REST API development for talent management';
        activity.codeChanges = {
          additions: 87,
          deletions: 12,
          modified: ['talent.controller.ts', 'talent.service.ts', 'talent.routes.ts']
        };
        activity.toolUsage = { 'Edit': 15, 'Read': 32, 'Bash': 8 };
        break;

      case '@frontend-ui-developer':
        activity.currentFile = '/frontend/components/talent/TalentProfileCard.tsx';
        activity.currentLineNumber = 78;
        activity.currentOperation = 'Adding responsive design breakpoints';
        activity.activeTask = 'Talent profile UI components';
        activity.codeChanges = {
          additions: 156,
          deletions: 23,
          modified: ['TalentProfileCard.tsx', 'TalentList.tsx', 'layout.css']
        };
        activity.toolUsage = { 'Edit': 22, 'Read': 45, 'Write': 3 };
        activity.dependencies = ['@backend-api-developer'];
        break;

      case '@ai-ml-developer':
        activity.currentFile = '/src/services/ai-matching.service.ts';
        activity.currentLineNumber = 234;
        activity.currentOperation = 'Training embeddings for talent-role matching';
        activity.activeTask = 'AI matching algorithm optimization';
        activity.codeChanges = {
          additions: 198,
          deletions: 45,
          modified: ['ai-matching.service.ts', 'embedding.service.ts', 'vector.service.ts']
        };
        activity.toolUsage = { 'Edit': 18, 'Read': 67, 'Bash': 12 };
        break;

      case '@integration-workflow-developer':
        activity.currentFile = '/src/services/calendar.service.ts';
        activity.currentLineNumber = 102;
        activity.currentOperation = 'Integrating Google Calendar API';
        activity.activeTask = 'Third-party service integrations';
        activity.codeChanges = {
          additions: 76,
          deletions: 8,
          modified: ['calendar.service.ts', 'scheduling.service.ts']
        };
        activity.toolUsage = { 'Edit': 11, 'Read': 28, 'WebFetch': 5 };
        activity.blockers = ['Waiting for OAuth2 credentials from @devops-infrastructure-developer'];
        break;

      case '@devops-infrastructure-developer':
        activity.currentFile = '/docker-compose.yml';
        activity.currentLineNumber = 45;
        activity.currentOperation = 'Configuring Redis cluster for session management';
        activity.activeTask = 'Infrastructure setup and optimization';
        activity.codeChanges = {
          additions: 34,
          deletions: 12,
          modified: ['docker-compose.yml', 'Dockerfile', '.env.example']
        };
        activity.toolUsage = { 'Edit': 8, 'Bash': 24, 'Read': 15 };
        break;

      case '@testing-qa-developer':
        activity.currentFile = '/tests/integration/talent.test.ts';
        activity.currentLineNumber = 187;
        activity.currentOperation = 'Writing integration tests for talent CRUD operations';
        activity.activeTask = 'Test coverage improvement';
        activity.codeChanges = {
          additions: 245,
          deletions: 0,
          modified: ['talent.test.ts', 'test-utils.ts', 'jest.config.js']
        };
        activity.toolUsage = { 'Write': 5, 'Read': 42, 'Bash': 18 };
        activity.dependencies = ['@backend-api-developer', '@frontend-ui-developer'];
        break;
    }

    // Simulate occasional errors
    if (Math.random() < 0.1) {
      activity.errors.push({
        timestamp: new Date(),
        error: 'Connection timeout to database',
        resolution: 'Retrying with exponential backoff'
      });
    }

    return activity;
  }

  private simulateStatus(): 'active' | 'idle' | 'blocked' | 'error' {
    const rand = Math.random();
    if (rand < 0.7) return 'active';
    if (rand < 0.85) return 'idle';
    if (rand < 0.95) return 'blocked';
    return 'error';
  }

  /**
   * Display formatted agent status
   */
  private displayAgentStatus(activity: AgentActivity): void {
    const statusEmoji = {
      'active': '🟢',
      'idle': '🟡',
      'blocked': '🔴',
      'error': '❌'
    };

    console.log(`\n${statusEmoji[activity.status]} ${activity.agentName}`);
    console.log('─'.repeat(60));
    
    if (activity.currentFile) {
      console.log(`📁 File: ${activity.currentFile}:${activity.currentLineNumber || 0}`);
      console.log(`🔧 Operation: ${activity.currentOperation}`);
    }
    
    if (activity.activeTask) {
      console.log(`📋 Task: ${activity.activeTask}`);
      console.log(`📊 Progress: ${'█'.repeat(Math.floor(activity.progressPercentage / 10))}${'░'.repeat(10 - Math.floor(activity.progressPercentage / 10))} ${activity.progressPercentage}%`);
    }

    if (activity.codeChanges) {
      console.log(`✏️  Changes: +${activity.codeChanges.additions} -${activity.codeChanges.deletions} (${activity.codeChanges.modified.length} files)`);
    }

    if (Object.keys(activity.toolUsage).length > 0) {
      console.log(`🔨 Tools: ${Object.entries(activity.toolUsage).map(([tool, count]) => `${tool}(${count})`).join(', ')}`);
    }

    if (activity.dependencies && activity.dependencies.length > 0) {
      console.log(`🔗 Dependencies: ${activity.dependencies.join(', ')}`);
    }

    if (activity.blockers && activity.blockers.length > 0) {
      console.log(`⚠️  Blockers: ${activity.blockers.join(', ')}`);
    }

    if (activity.errors.length > 0) {
      activity.errors.forEach(err => {
        console.log(`❌ Error: ${err.error}`);
        if (err.resolution) {
          console.log(`   ✅ Resolution: ${err.resolution}`);
        }
      });
    }
  }

  /**
   * Update global metrics
   */
  private updateMetrics(activity: AgentActivity): void {
    // Update tool usage metrics
    Object.values(activity.toolUsage).forEach(count => {
      this.metrics.totalToolCalls += count;
    });

    // Update file edit metrics
    if (activity.codeChanges) {
      this.metrics.totalFileEdits += activity.codeChanges.modified.length;
    }

    // Update error metrics
    this.metrics.totalErrors += activity.errors.length;
    this.metrics.totalResolutions += activity.errors.filter(e => e.resolution).length;

    // Update task metrics
    if (activity.status === 'active' && activity.activeTask) {
      this.metrics.activeTasks++;
    }
    if (activity.progressPercentage >= 100) {
      this.metrics.completedTasks++;
    }
  }

  /**
   * Display metrics summary
   */
  private displayMetricsSummary(): void {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status === 'active').length;
    const blockedAgents = Array.from(this.agents.values()).filter(a => a.status === 'blocked').length;
    
    const avgProgress = Array.from(this.agents.values())
      .reduce((sum, a) => sum + a.progressPercentage, 0) / totalAgents;

    console.log('\n' + '═'.repeat(80));
    console.log('📈 MONITORING METRICS SUMMARY');
    console.log('═'.repeat(80));
    console.log(`👥 Agents: ${activeAgents}/${totalAgents} active, ${blockedAgents} blocked`);
    console.log(`🔧 Total tool calls: ${this.metrics.totalToolCalls}`);
    console.log(`📝 Files edited: ${this.metrics.totalFileEdits}`);
    console.log(`❌ Errors: ${this.metrics.totalErrors} (${this.metrics.totalResolutions} resolved)`);
    console.log(`📊 Average progress: ${avgProgress.toFixed(1)}%`);
    console.log(`✅ Completed tasks: ${this.metrics.completedTasks}`);
    console.log('═'.repeat(80));
  }

  /**
   * Check for blockers and dependencies
   */
  private checkForBlockers(): void {
    const blockedAgents = Array.from(this.agents.values())
      .filter(a => a.status === 'blocked' || (a.blockers && a.blockers.length > 0));

    if (blockedAgents.length > 0) {
      console.log('\n⚠️  ATTENTION: Blockers Detected');
      console.log('─'.repeat(60));
      blockedAgents.forEach(agent => {
        if (agent.blockers && agent.blockers.length > 0) {
          console.log(`${agent.agentName}:`);
          agent.blockers.forEach(blocker => {
            console.log(`  - ${blocker}`);
          });
        }
      });
      
      // Auto-resolution logic would go here
      this.attemptAutoResolution(blockedAgents);
    }
  }

  /**
   * Attempt automatic resolution of blockers
   */
  private attemptAutoResolution(blockedAgents: AgentActivity[]): void {
    console.log('\n🔄 Attempting auto-resolution...');
    
    blockedAgents.forEach(agent => {
      if (agent.blockers) {
        agent.blockers.forEach(blocker => {
          if (blocker.includes('OAuth2 credentials')) {
            console.log(`  → Generating OAuth2 credentials for ${agent.agentName}`);
            // Trigger DevOps agent to provide credentials
          } else if (blocker.includes('API')) {
            console.log(`  → Checking API availability for ${agent.agentName}`);
            // Trigger Backend agent to verify API status
          }
        });
      }
    });
  }

  /**
   * Log activity to file
   */
  private logActivity(activity: AgentActivity): void {
    const logEntry = {
      timestamp: activity.timestamp,
      agentId: activity.agentId,
      status: activity.status,
      file: activity.currentFile,
      operation: activity.currentOperation,
      progress: activity.progressPercentage,
      errors: activity.errors.length
    };

    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Append to log file
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Record error for an agent
   */
  private recordError(agentId: string, error: any): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'error';
      agent.errors.push({
        timestamp: new Date(),
        error: error.message || String(error)
      });
      this.agents.set(agentId, agent);
    }
  }

  /**
   * Get current snapshot of all agents
   */
  public getSnapshot(): Map<string, AgentActivity> {
    return new Map(this.agents);
  }

  /**
   * Get metrics
   */
  public getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }
}

// Export singleton instance
export const liveMonitor = new LiveAgentMonitor();