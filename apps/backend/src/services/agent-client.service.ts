/**
 * Agent Client Service
 * Manages HTTP communication with the external AI agents server
 * Provides resilient connection handling and type-safe interfaces
 */

import { logger } from '../utils/logger';
import { TRPCError } from '@trpc/server';
import type { 
  ScriptAnalysisResult,
  TalentDiscoveryResult,
  ApplicationScreeningResult,
  AuditionSchedulingResult,
  AgentHealthStatus,
  WorkflowResult
} from '../types/agents';

export class AgentClientService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    baseUrl: string = process.env.AGENTS_SERVER_URL || 'http://localhost:8080',
    timeout: number = 30000,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Start periodic health checks for the agents server
   */
  private startHealthMonitoring(): void {
    // Initial health check
    this.checkHealth();
    
    // Schedule periodic checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  /**
   * Check agents server health
   */
  private async checkHealth(): Promise<void> {
    try {
      const response = await this.makeRequest('/health', 'GET');
      this.isHealthy = response.status === 'healthy';
      this.lastHealthCheck = new Date();
      logger.info('Agent server health check successful', { 
        status: response.status,
        agents: response.agents 
      });
    } catch (error) {
      this.isHealthy = false;
      logger.error('Agent server health check failed', error);
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest(
    endpoint: string, 
    method: string = 'GET',
    body?: any,
    retryCount: number = 0
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': this.generateRequestId(),
          'X-Client': 'castmatch-backend',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Agent server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        logger.error('Agent request timeout', { endpoint, timeout: this.timeout });
        
        if (retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, retryCount));
          return this.makeRequest(endpoint, method, body, retryCount + 1);
        }
        
        throw new TRPCError({
          code: 'TIMEOUT',
          message: 'Agent server request timed out',
        });
      }
      
      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        logger.error('Agent server connection failed', { endpoint, error: error.message });
        
        if (retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, retryCount));
          return this.makeRequest(endpoint, method, body, retryCount + 1);
        }
        
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Agent server is unavailable',
        });
      }
      
      // Log and rethrow other errors
      logger.error('Agent request failed', { endpoint, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze script content
   */
  async analyzeScript(
    scriptContent: string,
    fileType: string,
    projectContext?: {
      type: string;
      genre: string[];
      budgetTier?: string;
      location?: string;
    }
  ): Promise<ScriptAnalysisResult> {
    try {
      logger.info('Analyzing script', { fileType, contextType: projectContext?.type });
      
      const response = await this.makeRequest('/api/agents/script-analysis', 'POST', {
        scriptContent: Buffer.from(scriptContent).toString('base64'),
        fileType,
        projectContext: projectContext || {
          type: 'web-series',
          genre: ['drama'],
          location: 'Mumbai',
        },
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Script analysis failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Script analysis failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to analyze script: ${error.message}`,
      });
    }
  }

  /**
   * Discover talent based on role requirements
   */
  async discoverTalent(searchParams: {
    roleDescription: string;
    physicalRequirements: {
      ageRange: { min: number; max: number };
      gender?: string;
      height?: { min?: number; max?: number };
    };
    experienceLevel: string;
    budgetRange: { min: number; max: number };
    locationPreference?: string;
    skills?: string[];
    languages?: string[];
  }): Promise<TalentDiscoveryResult> {
    try {
      logger.info('Discovering talent', { 
        role: searchParams.roleDescription,
        location: searchParams.locationPreference 
      });
      
      const response = await this.makeRequest('/api/agents/talent-discovery', 'POST', {
        ...searchParams,
        locationPreference: searchParams.locationPreference || 'Mumbai',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Talent discovery failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Talent discovery failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to discover talent: ${error.message}`,
      });
    }
  }

  /**
   * Screen applications using AI
   */
  async screenApplications(applications: {
    id: string;
    talentId: string;
    roleId: string;
    coverLetter?: string;
    experience?: any;
    skills?: string[];
  }[]): Promise<ApplicationScreeningResult> {
    try {
      logger.info('Screening applications', { count: applications.length });
      
      const response = await this.makeRequest('/api/agents/application-screening', 'POST', {
        applications,
        screeningCriteria: {
          minimumExperience: 1,
          requiredSkills: [],
          preferredSkills: [],
        },
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Application screening failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Application screening failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to screen applications: ${error.message}`,
      });
    }
  }

  /**
   * Optimize audition scheduling
   */
  async optimizeScheduling(scheduleData: {
    auditions: Array<{
      talentId: string;
      talentName: string;
      duration: number;
      availability?: any;
    }>;
    constraints: {
      startDate: string;
      endDate: string;
      dailyStartTime: string;
      dailyEndTime: string;
      breakDuration?: number;
      location?: string;
    };
  }): Promise<AuditionSchedulingResult> {
    try {
      logger.info('Optimizing audition schedule', { 
        auditionCount: scheduleData.auditions.length,
        location: scheduleData.constraints.location 
      });
      
      const response = await this.makeRequest('/api/agents/audition-scheduling', 'POST', {
        ...scheduleData,
        constraints: {
          ...scheduleData.constraints,
          location: scheduleData.constraints.location || 'Mumbai',
        },
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Scheduling optimization failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Scheduling optimization failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to optimize schedule: ${error.message}`,
      });
    }
  }

  /**
   * Generate communication message
   */
  async generateCommunication(params: {
    type: 'invitation' | 'rejection' | 'callback' | 'update' | 'reminder';
    recipientName: string;
    recipientRole?: string;
    projectName?: string;
    customContext?: any;
  }): Promise<{ message: string; subject?: string }> {
    try {
      logger.info('Generating communication', { 
        type: params.type,
        recipient: params.recipientName 
      });
      
      const response = await this.makeRequest('/api/agents/communication', 'POST', params);
      
      if (!response.success) {
        throw new Error(response.error || 'Communication generation failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Communication generation failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to generate communication: ${error.message}`,
      });
    }
  }

  /**
   * Get decision support insights
   */
  async getDecisionSupport(params: {
    projectId: string;
    roleId: string;
    candidateIds: string[];
    criteria?: string[];
  }): Promise<any> {
    try {
      logger.info('Getting decision support', { 
        projectId: params.projectId,
        candidateCount: params.candidateIds.length 
      });
      
      const response = await this.makeRequest('/api/agents/decision-support', 'POST', params);
      
      if (!response.success) {
        throw new Error(response.error || 'Decision support failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Decision support failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get decision support: ${error.message}`,
      });
    }
  }

  /**
   * Optimize budget allocation
   */
  async optimizeBudget(params: {
    totalBudget: number;
    roles: Array<{
      id: string;
      name: string;
      priority: number;
      minBudget?: number;
      maxBudget?: number;
    }>;
    constraints?: any;
  }): Promise<any> {
    try {
      logger.info('Optimizing budget', { 
        totalBudget: params.totalBudget,
        roleCount: params.roles.length 
      });
      
      const response = await this.makeRequest('/api/agents/budget-optimization', 'POST', params);
      
      if (!response.success) {
        throw new Error(response.error || 'Budget optimization failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Budget optimization failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to optimize budget: ${error.message}`,
      });
    }
  }

  /**
   * Execute complete workflow
   */
  async executeWorkflow(workflowType: string = 'demo'): Promise<WorkflowResult> {
    try {
      logger.info('Executing workflow', { type: workflowType });
      
      const response = await this.makeRequest('/api/demo/complete-workflow', 'GET');
      
      if (!response.success) {
        throw new Error(response.error || 'Workflow execution failed');
      }
      
      return response.data;
    } catch (error: any) {
      logger.error('Workflow execution failed', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to execute workflow: ${error.message}`,
      });
    }
  }

  /**
   * Get agent status
   */
  async getAgentStatus(): Promise<AgentHealthStatus> {
    try {
      const response = await this.makeRequest('/api/agents/status', 'GET');
      
      return {
        ...response,
        serverHealth: this.isHealthy,
        lastHealthCheck: this.lastHealthCheck,
      };
    } catch (error: any) {
      logger.error('Failed to get agent status', error);
      
      // Return degraded status if server is down
      return {
        status: 'degraded',
        agents: {},
        serverHealth: false,
        lastHealthCheck: this.lastHealthCheck,
        error: error.message,
      };
    }
  }

  /**
   * Generate request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const agentClient = new AgentClientService();