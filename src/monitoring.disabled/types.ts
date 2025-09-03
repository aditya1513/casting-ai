export enum AgentType {
  BACKEND_API = 'backend-api-developer',
  FRONTEND_UI = 'frontend-ui-developer',
  AI_ML = 'ai-ml-developer',
  INTEGRATION_WORKFLOW = 'integration-workflow-developer',
  DEVOPS_INFRASTRUCTURE = 'devops-infrastructure-developer',
  TESTING_QA = 'testing-qa-developer'
}

export type AgentStatusType = 'INITIALIZING' | 'ACTIVE' | 'IDLE' | 'BUSY' | 'ERROR' | 'STOPPED';
export type HealthStatus = 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED' | 'UNKNOWN';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
export type TriggerType = 'TASK_COMPLETION' | 'SERVICE_READY' | 'ERROR_DETECTION' | 'DEPENDENCY_RESOLVED' | 'MANUAL';

export interface AgentTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: number;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  dependencies: string[];
  blockers: string[];
  progress: number;
  metadata: Record<string, any>;
}

export interface AgentBlocker {
  id: string;
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
  resolvedAt?: Date;
  autoResolvable: boolean;
  resolutionSteps: string[];
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

export interface AgentStatus {
  agentType: AgentType;
  status: AgentStatusType;
  health: HealthStatus;
  lastCheck: Date;
  activeTask: AgentTask | null;
  progress: number;
  blockers: AgentBlocker[];
  dependencies: string[];
  completedTasks: AgentTask[];
  pendingTasks: AgentTask[];
  errorMessages: string[];
  performance: PerformanceMetrics;
}

export interface AgentMetrics {
  agentType: AgentType;
  timestamp: Date;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  averageTaskTime: number;
  successRate: number;
  blockerCount: number;
  dependencyCount: number;
  resourceUtilization: number;
}

export interface AutomationTrigger {
  id: string;
  name: string;
  type: TriggerType;
  description: string;
  conditions: TriggerCondition[];
  actions: TriggerAction[];
  enabled: boolean;
  priority: number;
  cooldownMs: number;
  lastExecuted?: Date;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  agentType?: AgentType;
}

export interface TriggerAction {
  type: 'NOTIFY_AGENT' | 'ASSIGN_TASK' | 'RESTART_SERVICE' | 'ESCALATE' | 'AUTO_RESOLVE' | 'UPDATE_CONFIG';
  target: AgentType | 'ALL' | 'ORCHESTRATOR';
  payload: Record<string, any>;
}

export interface MonitoringConfig {
  monitoring: {
    checkInterval: number; // 15 minutes = 15 * 60 * 1000
    healthCheckTimeout: number;
    maxRetries: number;
  };
  reporting: {
    reportInterval: number; // 30 minutes = 30 * 60 * 1000
    retentionDays: number;
  };
  agents: {
    backend: BackendAgentConfig;
    frontend: FrontendAgentConfig;
    ai: AiAgentConfig;
    integration: IntegrationAgentConfig;
    devops: DevOpsAgentConfig;
    testing: TestingAgentConfig;
  };
  automation: {
    autoResolutionEnabled: boolean;
    triggerCooldownMs: number;
    maxConcurrentActions: number;
  };
}

export interface BackendAgentConfig {
  apiEndpoint: string;
  healthCheckPath: string;
  databaseUrl: string;
  redisUrl: string;
  expectedServices: string[];
  criticalEndpoints: string[];
}

export interface FrontendAgentConfig {
  appUrl: string;
  buildPath: string;
  testCommand: string;
  expectedRoutes: string[];
  componentTests: string[];
}

export interface AiAgentConfig {
  modelEndpoints: string[];
  embeddingService: string;
  vectorDatabase: string;
  healthCheckEndpoints: string[];
  expectedModels: string[];
}

export interface IntegrationAgentConfig {
  oauthProviders: string[];
  thirdPartyApis: string[];
  webhookEndpoints: string[];
  workflowDefinitions: string[];
}

export interface DevOpsAgentConfig {
  dockerServices: string[];
  databaseMigrations: string;
  deploymentTargets: string[];
  healthCheckCommands: string[];
}

export interface TestingAgentConfig {
  testSuites: string[];
  coverageThreshold: number;
  ciPipelineUrl: string;
  qualityGates: QualityGate[];
}

export interface QualityGate {
  name: string;
  type: 'COVERAGE' | 'PERFORMANCE' | 'SECURITY' | 'LINT';
  threshold: number;
  required: boolean;
}

export interface ProgressReport {
  timestamp: Date;
  overallProgress: number;
  agentSummaries: AgentSummary[];
  blockers: AgentBlocker[];
  recommendations: string[];
  nextActions: NextAction[];
  estimatedCompletion: Date;
  criticalPath: string[];
}

export interface AgentSummary {
  agentType: AgentType;
  status: AgentStatusType;
  health: HealthStatus;
  progress: number;
  tasksCompleted: number;
  tasksPending: number;
  blockers: number;
  keyAchievements: string[];
  upcomingTasks: string[];
}

export interface NextAction {
  agentType: AgentType;
  action: string;
  priority: number;
  estimatedDuration: number;
  dependencies: string[];
  autoExecutable: boolean;
}

export interface CoordinationEvent {
  id: string;
  type: 'TASK_COMPLETED' | 'SERVICE_READY' | 'INTEGRATION_AVAILABLE' | 'BLOCKER_RESOLVED';
  sourceAgent: AgentType;
  targetAgents: AgentType[];
  payload: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}