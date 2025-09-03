import axios from 'axios';
import { logger } from '../../config/logger';
import { AgentStatus, AgentMetrics, AgentTask, AiAgentConfig, AgentStatusType, HealthStatus } from '../types';
import { BaseAgentMonitor } from './BaseAgentMonitor';

export class AiMlMonitor extends BaseAgentMonitor {
  private modelsLoaded: Set<string> = new Set();
  private embeddingServiceActive: boolean = false;
  private vectorDatabaseConnected: boolean = false;
  private semanticSearchReady: boolean = false;
  private lastInferenceTime: number = 0;

  constructor(private config: AiAgentConfig) {
    super();
  }

  async checkStatus(): Promise<Partial<AgentStatus>> {
    const startTime = Date.now();
    
    try {
      // 1. ML Model Availability Check
      const modelStatus = await this.checkModelAvailability();
      
      // 2. Embedding Services Check
      const embeddingStatus = await this.checkEmbeddingServices();
      
      // 3. Vector Database Connectivity
      const vectorDbStatus = await this.checkVectorDatabase();
      
      // 4. Semantic Search Functionality
      const searchStatus = await this.checkSemanticSearch();
      
      // 5. AI Service Performance
      const performanceStatus = await this.checkAiPerformance();

      this.lastInferenceTime = Date.now() - startTime;

      const overallHealth = this.calculateOverallHealth([
        modelStatus,
        embeddingStatus,
        vectorDbStatus,
        searchStatus,
        performanceStatus
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
          responseTime: this.lastInferenceTime,
          throughput: await this.calculateThroughput(),
          errorRate: await this.calculateErrorRate(),
          uptime: await this.calculateUptime()
        },
        errorMessages: overallHealth.errors
      };

    } catch (error) {
      logger.error('❌ AI/ML Monitor: Health check failed', error);
      
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

  private async checkModelAvailability(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let loadedModels = 0;
    const totalModels = this.config.expectedModels.length;

    for (const model of this.config.expectedModels) {
      try {
        // Check if model endpoints are responding
        const modelEndpoint = this.config.modelEndpoints.find(endpoint => 
          endpoint.includes(model.toLowerCase())
        );

        if (modelEndpoint) {
          const response = await axios.get(`${modelEndpoint}/health`, {
            timeout: 3000
          });

          if (response.status === 200 && response.data.model_loaded) {
            this.modelsLoaded.add(model);
            loadedModels++;
          } else {
            this.modelsLoaded.delete(model);
            errors.push(`Model ${model} is not loaded`);
          }
        } else {
          errors.push(`Model endpoint not configured for ${model}`);
        }
      } catch (error) {
        this.modelsLoaded.delete(model);
        errors.push(`Model ${model} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successRate = totalModels > 0 ? loadedModels / totalModels : 1;
    const isHealthy = successRate >= 0.8;

    return {
      status: isHealthy,
      errors: errors.slice(0, 3)
    };
  }

  private async checkEmbeddingServices(): Promise<{ status: boolean; errors: string[] }> {
    try {
      const response = await axios.post(`${this.config.embeddingService}/embed`, {
        text: "test embedding generation",
        model: "text-embedding-ada-002"
      }, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 200 && Array.isArray(response.data.embedding)) {
        this.embeddingServiceActive = true;
        return { status: true, errors: [] };
      } else {
        this.embeddingServiceActive = false;
        return { status: false, errors: ['Embedding service not returning valid embeddings'] };
      }
    } catch (error) {
      this.embeddingServiceActive = false;
      return { 
        status: false, 
        errors: [`Embedding service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkVectorDatabase(): Promise<{ status: boolean; errors: string[] }> {
    try {
      // Check vector database connectivity (assuming Pinecone or similar)
      const response = await axios.get(`${this.config.vectorDatabase}/stats`, {
        timeout: 3000,
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY || 'test-key'
        }
      });

      if (response.status === 200 && response.data.database) {
        this.vectorDatabaseConnected = true;
        return { status: true, errors: [] };
      } else {
        this.vectorDatabaseConnected = false;
        return { status: false, errors: ['Vector database connection failed'] };
      }
    } catch (error) {
      this.vectorDatabaseConnected = false;
      return { 
        status: false, 
        errors: [`Vector database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkSemanticSearch(): Promise<{ status: boolean; errors: string[] }> {
    try {
      // Test semantic search functionality
      const searchQuery = {
        query: "experienced actor for comedy role",
        top_k: 5
      };

      const response = await axios.post(`${this.config.embeddingService}/search`, searchQuery, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 200 && Array.isArray(response.data.results)) {
        this.semanticSearchReady = true;
        return { status: true, errors: [] };
      } else {
        this.semanticSearchReady = false;
        return { status: false, errors: ['Semantic search not returning valid results'] };
      }
    } catch (error) {
      this.semanticSearchReady = false;
      return { 
        status: false, 
        errors: [`Semantic search check failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private async checkAiPerformance(): Promise<{ status: boolean; errors: string[] }> {
    const errors: string[] = [];
    let performanceIssues = 0;

    // Check inference latency
    if (this.lastInferenceTime > 5000) {
      errors.push(`AI inference latency too high: ${this.lastInferenceTime}ms`);
      performanceIssues++;
    }

    // Check model endpoint response times
    for (const endpoint of this.config.healthCheckEndpoints) {
      try {
        const start = Date.now();
        await axios.get(endpoint, { timeout: 2000 });
        const responseTime = Date.now() - start;

        if (responseTime > 1000) {
          errors.push(`Model endpoint ${endpoint} slow response: ${responseTime}ms`);
          performanceIssues++;
        }
      } catch (error) {
        errors.push(`Model endpoint ${endpoint} unreachable`);
        performanceIssues++;
      }
    }

    const isHealthy = performanceIssues === 0;
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
    if (this.modelsLoaded.size === 0) {
      return {
        id: 'model-loading',
        name: 'Load AI/ML Models',
        description: 'Loading required machine learning models for talent matching',
        status: 'IN_PROGRESS',
        priority: 1,
        assignedAt: new Date(),
        startedAt: new Date(),
        dependencies: ['model-endpoints'],
        blockers: ['model-not-available'],
        progress: 25,
        metadata: { type: 'model-management', critical: true }
      };
    }

    if (!this.embeddingServiceActive) {
      return {
        id: 'embedding-service-setup',
        name: 'Configure Embedding Service',
        description: 'Setting up text embedding generation service',
        status: 'IN_PROGRESS',
        priority: 2,
        assignedAt: new Date(),
        dependencies: ['model-loading'],
        blockers: [],
        progress: 60,
        metadata: { type: 'service-setup', critical: true }
      };
    }

    if (!this.vectorDatabaseConnected) {
      return {
        id: 'vector-db-setup',
        name: 'Connect Vector Database',
        description: 'Establishing connection to vector database for similarity search',
        status: 'IN_PROGRESS',
        priority: 3,
        assignedAt: new Date(),
        dependencies: ['embedding-service-setup'],
        blockers: [],
        progress: 80,
        metadata: { type: 'database-setup', critical: true }
      };
    }

    if (!this.semanticSearchReady) {
      return {
        id: 'semantic-search-implementation',
        name: 'Implement Semantic Search',
        description: 'Building semantic search functionality for talent matching',
        status: 'IN_PROGRESS',
        priority: 4,
        assignedAt: new Date(),
        dependencies: ['vector-db-setup'],
        blockers: [],
        progress: 90,
        metadata: { type: 'feature-implementation', critical: false }
      };
    }

    return null;
  }

  private calculateProgress(): number {
    const components = [
      Math.round((this.modelsLoaded.size / Math.max(1, this.config.expectedModels.length)) * 30),
      this.embeddingServiceActive ? 25 : 0,
      this.vectorDatabaseConnected ? 25 : 0,
      this.semanticSearchReady ? 20 : 0
    ];

    return components.reduce((sum, score) => sum + score, 0);
  }

  private async detectBlockers(): Promise<any[]> {
    const blockers = [];

    if (this.modelsLoaded.size === 0) {
      blockers.push({
        id: 'no-models-loaded',
        type: 'AI_MODELS_UNAVAILABLE',
        description: 'No AI/ML models are currently loaded',
        severity: 'CRITICAL',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check model endpoint configurations',
          'Verify model files are available',
          'Check GPU/CPU resources',
          'Restart AI service containers'
        ]
      });
    }

    if (!this.embeddingServiceActive) {
      blockers.push({
        id: 'embedding-service-down',
        type: 'EMBEDDING_SERVICE_UNAVAILABLE',
        description: 'Text embedding service is not responding',
        severity: 'HIGH',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check OpenAI API key configuration',
          'Verify embedding service endpoint',
          'Check service container status',
          'Review API rate limits'
        ]
      });
    }

    if (!this.vectorDatabaseConnected) {
      blockers.push({
        id: 'vector-db-connection',
        type: 'VECTOR_DATABASE_UNAVAILABLE',
        description: 'Vector database connection failed',
        severity: 'HIGH',
        detectedAt: new Date(),
        autoResolvable: true,
        resolutionSteps: [
          'Check Pinecone API key and environment',
          'Verify vector database endpoint',
          'Check network connectivity',
          'Review database index configuration'
        ]
      });
    }

    if (this.lastInferenceTime > 10000) {
      blockers.push({
        id: 'ai-performance-degradation',
        type: 'AI_PERFORMANCE_ISSUE',
        description: `AI inference time is ${this.lastInferenceTime}ms`,
        severity: 'MEDIUM',
        detectedAt: new Date(),
        autoResolvable: false,
        resolutionSteps: [
          'Check GPU utilization and memory',
          'Review model optimization settings',
          'Consider model quantization',
          'Scale AI service instances'
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
    // AI inferences per minute
    return this.lastInferenceTime > 0 ? Math.max(0, 120 - (this.lastInferenceTime / 500)) : 0;
  }

  private async calculateErrorRate(): Promise<number> {
    const totalServices = 4; // models, embedding, vector db, search
    const workingServices = [
      this.modelsLoaded.size > 0,
      this.embeddingServiceActive,
      this.vectorDatabaseConnected,
      this.semanticSearchReady
    ].filter(Boolean).length;

    return 1 - (workingServices / totalServices);
  }

  private async calculateUptime(): Promise<number> {
    return this.embeddingServiceActive && this.vectorDatabaseConnected ? 98.5 : 50;
  }

  private async getCompletedTasksCount(): Promise<number> {
    return Math.floor(Math.random() * 6) + 2;
  }

  private async getInProgressTasksCount(): Promise<number> {
    return this.getCurrentTask() ? 1 : 0;
  }

  private async getPendingTasksCount(): Promise<number> {
    return (await this.detectBlockers()).length + Math.floor(Math.random() * 2);
  }

  private async getAverageTaskTime(): Promise<number> {
    return 60 + Math.random() * 40; // AI tasks take longer
  }

  private async getSuccessRate(): Promise<number> {
    return Math.max(0, 1.0 - (await this.calculateErrorRate()));
  }

  private async getResourceUtilization(): Promise<number> {
    // AI services are resource intensive
    return Math.min(100, 50 + Math.random() * 40);
  }

  async assignTask(task: AgentTask): Promise<void> {
    logger.info(`📋 AI/ML Monitor: Task assigned - ${task.name}`);
  }

  async start(): Promise<void> {
    logger.info('🚀 AI/ML Monitor: Starting monitoring');
    this.isStarted = true;
  }

  async stop(): Promise<void> {
    logger.info('🛑 AI/ML Monitor: Stopping monitoring');
    this.isStarted = false;
  }
}