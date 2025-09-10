/**
 * Agent Integration TypeScript Definitions
 * Type-safe interfaces for agent responses and workflows
 */

// ==================== Script Analysis Types ====================

export interface ScriptCharacter {
  name: string;
  description: string;
  ageRange: string;
  gender: string;
  importance: 'lead' | 'supporting' | 'background';
  skills: string[];
  dialogueCount?: number;
  sceneCount?: number;
}

export interface ScriptAnalysisResult {
  characters: ScriptCharacter[];
  genres: string[];
  budgetEstimate: {
    castingCost: number;
    totalRoles: number;
    breakdown?: {
      lead: number;
      supporting: number;
      background: number;
    };
  };
  summary?: string;
  themes?: string[];
  locations?: string[];
  timeline?: {
    estimatedShootingDays: number;
    suggestedSchedule: string;
  };
}

// ==================== Talent Discovery Types ====================

export interface TalentCandidate {
  id: string;
  name: string;
  age: number;
  gender?: string;
  experience: string;
  matchScore: number;
  skills?: string[];
  languages?: string[];
  location?: string;
  availability?: string;
  portfolioUrl?: string;
  recentProjects?: string[];
  specialNotes?: string;
}

export interface TalentDiscoveryResult {
  candidates: TalentCandidate[];
  searchMetrics: {
    totalFound: number;
    searchTime: number;
    filtersCriteria?: any;
  };
  recommendations?: string[];
  alternativeSearches?: Array<{
    criteria: string;
    description: string;
  }>;
}

// ==================== Application Screening Types ====================

export interface ScreenedApplication {
  applicationId: string;
  talentId: string;
  score: number;
  recommendation: 'highly_recommended' | 'recommended' | 'maybe' | 'not_recommended';
  strengths: string[];
  weaknesses: string[];
  notes: string;
  rankPosition?: number;
}

export interface ApplicationScreeningResult {
  screenedApplications: ScreenedApplication[];
  summary: {
    totalScreened: number;
    highlyRecommended: number;
    recommended: number;
    notRecommended: number;
  };
  insights?: {
    topSkillsFound: string[];
    commonStrengths: string[];
    gapsIdentified: string[];
  };
}

// ==================== Audition Scheduling Types ====================

export interface ScheduledAudition {
  talentId: string;
  talentName: string;
  scheduledTime: string;
  duration: number;
  location?: string;
  room?: string;
  notes?: string;
}

export interface AuditionSchedulingResult {
  schedule: ScheduledAudition[];
  metrics: {
    totalScheduled: number;
    totalDuration: number;
    utilizationRate: number;
    conflictsResolved: number;
  };
  conflicts?: Array<{
    talentId: string;
    reason: string;
    suggestedAlternative?: string;
  }>;
  optimization?: {
    travelTimeMinimized: boolean;
    breaksIncluded: boolean;
    efficiencyScore: number;
  };
}

// ==================== Communication Types ====================

export interface CommunicationMessage {
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'in_app';
  language?: string;
  tone?: 'formal' | 'casual' | 'friendly';
  customFields?: Record<string, any>;
}

export interface CommunicationResult {
  message: CommunicationMessage;
  alternativeVersions?: CommunicationMessage[];
  metadata: {
    generatedAt: string;
    templateUsed?: string;
    personalizationLevel: string;
  };
}

// ==================== Decision Support Types ====================

export interface DecisionCriteria {
  criteriaName: string;
  weight: number;
  scores: Record<string, number>; // candidateId -> score
}

export interface DecisionSupportResult {
  recommendations: Array<{
    candidateId: string;
    totalScore: number;
    rank: number;
    strengths: string[];
    concerns: string[];
    finalRecommendation: string;
  }>;
  criteria: DecisionCriteria[];
  insights: {
    topChoice: string;
    reasoning: string;
    alternativeOptions: string[];
    riskFactors: string[];
  };
}

// ==================== Budget Optimization Types ====================

export interface BudgetAllocation {
  roleId: string;
  roleName: string;
  allocatedBudget: number;
  percentageOfTotal: number;
  justification: string;
}

export interface BudgetOptimizationResult {
  allocations: BudgetAllocation[];
  summary: {
    totalAllocated: number;
    remainingBudget: number;
    optimizationScore: number;
  };
  recommendations: string[];
  alternativeScenarios?: Array<{
    name: string;
    description: string;
    allocations: BudgetAllocation[];
  }>;
}

// ==================== Workflow Types ====================

export interface WorkflowStep {
  stepName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  duration?: number;
  result?: any;
  error?: string;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'initiated' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: {
    scriptAnalysis?: ScriptAnalysisResult;
    talentSearchResults?: Array<{
      character: string;
      candidates: TalentCandidate[];
    }>;
    screeningResults?: ApplicationScreeningResult;
    schedulingResults?: AuditionSchedulingResult;
    communicationsSent?: number;
    decisionSupport?: DecisionSupportResult;
    budgetOptimization?: BudgetOptimizationResult;
  };
  timeline: {
    started: Date;
    completed?: Date;
    duration?: number;
  };
  summary: {
    totalSteps: number;
    completedSteps: number;
    errors: string[];
    recommendations: string[];
  };
  performance?: {
    totalTime: number;
    stepsCompleted: number;
    charactersFound?: number;
    candidatesFound?: number;
  };
}

// ==================== Agent Status Types ====================

export interface AgentInfo {
  name: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  description: string;
  capabilities: string[];
  lastUsed?: Date;
  requestCount?: number;
  averageResponseTime?: number;
}

export interface AgentHealthStatus {
  status: string;
  agents: Record<string, AgentInfo>;
  serverHealth: boolean;
  lastHealthCheck: Date | null;
  error?: string;
  metrics?: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    averageLatency: number;
  };
}

// ==================== Agent Orchestration Types ====================

export interface AgentTask {
  taskId: string;
  agentType: string;
  priority: number;
  input: any;
  dependencies?: string[]; // Other task IDs this depends on
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface OrchestrationPlan {
  planId: string;
  tasks: AgentTask[];
  executionOrder: string[][]; // Array of parallel task groups
  estimatedDuration: number;
  resourceRequirements: {
    agents: string[];
    estimatedApiCalls: number;
    estimatedCost?: number;
  };
}

// ==================== Mumbai Context Types ====================

export interface MumbaiCastingContext {
  industryType: 'bollywood' | 'television' | 'ott' | 'advertising' | 'theater';
  productionScale: 'small' | 'medium' | 'large' | 'mega';
  languageRequirements: string[];
  culturalConsiderations?: string[];
  unionRequirements?: {
    required: boolean;
    unions: string[];
  };
  locations: Array<{
    name: string;
    type: 'studio' | 'outdoor' | 'indoor';
    availability?: string;
  }>;
  seasonalFactors?: {
    season: string;
    impact: string;
    recommendations: string[];
  };
}

// ==================== Integration Context Types ====================

export interface AgentRequestContext {
  userId: string;
  projectId?: string;
  roleId?: string;
  conversationId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
  mumbaiContext?: MumbaiCastingContext;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
  processingTime?: number;
  agentUsed?: string;
  context?: AgentRequestContext;
}

// ==================== Error Types ====================

export interface AgentError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  suggestedAction?: string;
}

export class AgentServiceError extends Error {
  public code: string;
  public retryable: boolean;
  public details?: any;

  constructor(error: AgentError) {
    super(error.message);
    this.name = 'AgentServiceError';
    this.code = error.code;
    this.retryable = error.retryable;
    this.details = error.details;
  }
}