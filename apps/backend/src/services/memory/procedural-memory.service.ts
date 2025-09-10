/**
 * Procedural Memory Service
 * Manages learned patterns, workflows, and behavioral templates
 * Part of the advanced CastMatch memory architecture
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface ProceduralPattern {
  id: string;
  userId: string;
  patternType: 'workflow' | 'preference' | 'behavior' | 'response_template';
  name: string;
  description: string;
  trigger: {
    conditions: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than';
      value: any;
    }>;
    confidence: number; // Minimum confidence to trigger
  };
  action: {
    type: 'response' | 'workflow' | 'api_call' | 'memory_update';
    template?: string;
    steps?: Array<{
      order: number;
      action: string;
      parameters?: Record<string, any>;
    }>;
    parameters?: Record<string, any>;
  };
  context: {
    domain: string; // e.g., "casting", "scheduling", "communication"
    tags: string[];
    dependencies?: string[]; // Other pattern IDs
  };
  performance: {
    executionCount: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecuted?: Date;
    feedback: Array<{
      timestamp: Date;
      rating: number; // 1-5
      comment?: string;
    }>;
  };
  learningMetadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
    isActive: boolean;
    confidence: number; // 0-1, how confident the system is in this pattern
  };
}

export interface WorkflowExecution {
  id: string;
  patternId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  steps: Array<{
    stepIndex: number;
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    error?: string;
  }>;
  metrics: {
    executionTime?: number;
    resourceUsage?: Record<string, number>;
  };
}

export class ProceduralMemoryService {
  private redis: Redis;
  private readonly NAMESPACE = 'procedural:';
  private readonly PATTERN_PREFIX = 'pattern:';
  private readonly EXECUTION_PREFIX = 'execution:';
  private readonly LEARNING_THRESHOLD = 0.7; // Confidence threshold for pattern activation

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 3, // Use DB 3 for procedural memory
    });

    this.redis.on('connect', () => {
      logger.info('Procedural memory service connected to Redis');
    });

    this.redis.on('error', (err) => {
      logger.error('Procedural memory Redis error:', err);
    });
  }

  /**
   * Learn a new procedural pattern
   */
  async learnPattern(
    userId: string,
    pattern: Omit<ProceduralPattern, 'id' | 'learningMetadata' | 'performance'>
  ): Promise<ProceduralPattern> {
    try {
      const now = new Date();
      const fullPattern: ProceduralPattern = {
        ...pattern,
        id: uuidv4(),
        userId,
        performance: {
          executionCount: 0,
          successRate: 0,
          averageExecutionTime: 0,
          feedback: [],
        },
        learningMetadata: {
          createdAt: now,
          updatedAt: now,
          version: 1,
          isActive: true,
          confidence: 0.5, // Start with medium confidence
        },
      };

      // Store pattern
      const patternKey = `${this.NAMESPACE}${this.PATTERN_PREFIX}${userId}:${fullPattern.id}`;
      await this.redis.set(patternKey, JSON.stringify(fullPattern));

      // Index by type
      const typeIndexKey = `${this.NAMESPACE}index:${userId}:type:${pattern.patternType}`;
      await this.redis.sadd(typeIndexKey, fullPattern.id);

      // Index by domain
      const domainIndexKey = `${this.NAMESPACE}index:${userId}:domain:${pattern.context.domain}`;
      await this.redis.sadd(domainIndexKey, fullPattern.id);

      // Index by tags
      for (const tag of pattern.context.tags) {
        const tagIndexKey = `${this.NAMESPACE}index:${userId}:tag:${tag}`;
        await this.redis.sadd(tagIndexKey, fullPattern.id);
      }

      // Index active patterns for quick matching
      if (fullPattern.learningMetadata.isActive) {
        const activeIndexKey = `${this.NAMESPACE}active:${userId}`;
        await this.redis.zadd(
          activeIndexKey,
          fullPattern.learningMetadata.confidence,
          fullPattern.id
        );
      }

      logger.info(`Learned procedural pattern ${fullPattern.id} for user ${userId}`);
      return fullPattern;
    } catch (error) {
      logger.error('Failed to learn pattern:', error);
      throw error;
    }
  }

  /**
   * Find matching patterns for given context
   */
  async findMatchingPatterns(
    userId: string,
    context: Record<string, any>,
    domain?: string
  ): Promise<ProceduralPattern[]> {
    try {
      // Get active patterns
      const activeIndexKey = `${this.NAMESPACE}active:${userId}`;
      const activePatternIds = await this.redis.zrevrange(
        activeIndexKey,
        0,
        -1,
        'WITHSCORES'
      );

      const matchingPatterns: ProceduralPattern[] = [];

      // Process pattern IDs and scores
      for (let i = 0; i < activePatternIds.length; i += 2) {
        const patternId = activePatternIds[i];
        const confidence = parseFloat(activePatternIds[i + 1]);

        // Skip low confidence patterns
        if (confidence < this.LEARNING_THRESHOLD) {
          continue;
        }

        const pattern = await this.getPattern(userId, patternId);
        if (!pattern) continue;

        // Filter by domain if specified
        if (domain && pattern.context.domain !== domain) {
          continue;
        }

        // Check trigger conditions
        if (this.evaluateTriggerConditions(pattern.trigger.conditions, context)) {
          matchingPatterns.push(pattern);
        }
      }

      // Sort by confidence and success rate
      matchingPatterns.sort((a, b) => {
        const scoreA = a.learningMetadata.confidence * (a.performance.successRate || 0.5);
        const scoreB = b.learningMetadata.confidence * (b.performance.successRate || 0.5);
        return scoreB - scoreA;
      });

      return matchingPatterns;
    } catch (error) {
      logger.error('Failed to find matching patterns:', error);
      throw error;
    }
  }

  /**
   * Execute a procedural pattern
   */
  async executePattern(
    userId: string,
    patternId: string,
    input: Record<string, any>
  ): Promise<WorkflowExecution> {
    try {
      const pattern = await this.getPattern(userId, patternId);
      if (!pattern) {
        throw new Error(`Pattern ${patternId} not found`);
      }

      const execution: WorkflowExecution = {
        id: uuidv4(),
        patternId,
        userId,
        startTime: new Date(),
        status: 'running',
        input,
        steps: [],
        metrics: {},
      };

      // Store execution record
      const executionKey = `${this.NAMESPACE}${this.EXECUTION_PREFIX}${userId}:${execution.id}`;
      await this.redis.set(executionKey, JSON.stringify(execution));

      // Add to active executions
      const activeExecKey = `${this.NAMESPACE}active-exec:${userId}`;
      await this.redis.sadd(activeExecKey, execution.id);

      // Execute based on action type
      try {
        if (pattern.action.type === 'response' && pattern.action.template) {
          // Simple template response
          execution.output = {
            response: this.interpolateTemplate(pattern.action.template, input),
          };
          execution.status = 'completed';
        } else if (pattern.action.type === 'workflow' && pattern.action.steps) {
          // Execute workflow steps
          for (let i = 0; i < pattern.action.steps.length; i++) {
            const step = pattern.action.steps[i];
            const stepExecution = {
              stepIndex: i,
              startTime: new Date(),
              status: 'running' as const,
            };

            execution.steps.push(stepExecution);

            // Simulate step execution (in production, this would call actual services)
            await this.executeStep(step, input);

            stepExecution.endTime = new Date();
            stepExecution.status = 'completed';
          }
          execution.status = 'completed';
        }

        execution.endTime = new Date();
        execution.metrics.executionTime = 
          execution.endTime.getTime() - execution.startTime.getTime();

        // Update pattern performance metrics
        await this.updatePatternPerformance(userId, patternId, execution);

        // Update execution record
        await this.redis.set(executionKey, JSON.stringify(execution));

        // Remove from active executions
        await this.redis.srem(activeExecKey, execution.id);

        logger.info(`Executed pattern ${patternId} with execution ${execution.id}`);
        return execution;
      } catch (error) {
        execution.status = 'failed';
        execution.endTime = new Date();
        await this.redis.set(executionKey, JSON.stringify(execution));
        await this.redis.srem(activeExecKey, execution.id);
        throw error;
      }
    } catch (error) {
      logger.error('Failed to execute pattern:', error);
      throw error;
    }
  }

  /**
   * Provide feedback on pattern execution
   */
  async provideFeedback(
    userId: string,
    patternId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    try {
      const pattern = await this.getPattern(userId, patternId);
      if (!pattern) {
        throw new Error(`Pattern ${patternId} not found`);
      }

      // Add feedback
      pattern.performance.feedback.push({
        timestamp: new Date(),
        rating,
        comment,
      });

      // Update confidence based on feedback
      const avgRating = pattern.performance.feedback.reduce(
        (sum, f) => sum + f.rating, 0
      ) / pattern.performance.feedback.length;

      // Adjust confidence: increase for good feedback, decrease for bad
      const adjustment = (rating - 3) * 0.05; // -0.1 to +0.1
      pattern.learningMetadata.confidence = Math.max(0, Math.min(1, 
        pattern.learningMetadata.confidence + adjustment
      ));

      pattern.learningMetadata.updatedAt = new Date();

      // Update pattern
      const patternKey = `${this.NAMESPACE}${this.PATTERN_PREFIX}${userId}:${patternId}`;
      await this.redis.set(patternKey, JSON.stringify(pattern));

      // Update active index with new confidence
      const activeIndexKey = `${this.NAMESPACE}active:${userId}`;
      await this.redis.zadd(
        activeIndexKey,
        pattern.learningMetadata.confidence,
        patternId
      );

      logger.info(`Updated pattern ${patternId} with feedback (rating: ${rating})`);
    } catch (error) {
      logger.error('Failed to provide feedback:', error);
      throw error;
    }
  }

  /**
   * Get pattern by ID
   */
  async getPattern(userId: string, patternId: string): Promise<ProceduralPattern | null> {
    try {
      const patternKey = `${this.NAMESPACE}${this.PATTERN_PREFIX}${userId}:${patternId}`;
      const data = await this.redis.get(patternKey);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data) as ProceduralPattern;
    } catch (error) {
      logger.error('Failed to get pattern:', error);
      throw error;
    }
  }

  /**
   * Get patterns by type
   */
  async getPatternsByType(
    userId: string,
    patternType: ProceduralPattern['patternType']
  ): Promise<ProceduralPattern[]> {
    try {
      const typeIndexKey = `${this.NAMESPACE}index:${userId}:type:${patternType}`;
      const patternIds = await this.redis.smembers(typeIndexKey);
      
      const patterns: ProceduralPattern[] = [];
      for (const patternId of patternIds) {
        const pattern = await this.getPattern(userId, patternId);
        if (pattern) {
          patterns.push(pattern);
        }
      }

      return patterns;
    } catch (error) {
      logger.error('Failed to get patterns by type:', error);
      throw error;
    }
  }

  /**
   * Evolve pattern based on performance
   */
  async evolvePattern(userId: string, patternId: string): Promise<ProceduralPattern> {
    try {
      const pattern = await this.getPattern(userId, patternId);
      if (!pattern) {
        throw new Error(`Pattern ${patternId} not found`);
      }

      // Calculate evolution based on performance metrics
      const shouldEvolve = 
        pattern.performance.executionCount > 10 &&
        (pattern.performance.successRate > 0.8 || pattern.performance.successRate < 0.3);

      if (shouldEvolve) {
        if (pattern.performance.successRate > 0.8) {
          // Successful pattern - increase confidence
          pattern.learningMetadata.confidence = Math.min(1, 
            pattern.learningMetadata.confidence + 0.1
          );
          pattern.trigger.confidence = Math.max(0.5, 
            pattern.trigger.confidence - 0.05
          ); // Lower trigger threshold
        } else {
          // Unsuccessful pattern - decrease confidence or deactivate
          pattern.learningMetadata.confidence = Math.max(0, 
            pattern.learningMetadata.confidence - 0.2
          );
          
          if (pattern.learningMetadata.confidence < 0.3) {
            pattern.learningMetadata.isActive = false;
          }
        }

        pattern.learningMetadata.version += 1;
        pattern.learningMetadata.updatedAt = new Date();

        // Update pattern
        const patternKey = `${this.NAMESPACE}${this.PATTERN_PREFIX}${userId}:${patternId}`;
        await this.redis.set(patternKey, JSON.stringify(pattern));

        // Update indices
        const activeIndexKey = `${this.NAMESPACE}active:${userId}`;
        if (pattern.learningMetadata.isActive) {
          await this.redis.zadd(
            activeIndexKey,
            pattern.learningMetadata.confidence,
            patternId
          );
        } else {
          await this.redis.zrem(activeIndexKey, patternId);
        }

        logger.info(`Evolved pattern ${patternId} to version ${pattern.learningMetadata.version}`);
      }

      return pattern;
    } catch (error) {
      logger.error('Failed to evolve pattern:', error);
      throw error;
    }
  }

  // Helper methods

  private evaluateTriggerConditions(
    conditions: ProceduralPattern['trigger']['conditions'],
    context: Record<string, any>
  ): boolean {
    for (const condition of conditions) {
      const value = this.getNestedValue(context, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'contains':
          if (!String(value).includes(String(condition.value))) return false;
          break;
        case 'matches':
          if (!new RegExp(condition.value).test(String(value))) return false;
          break;
        case 'greater_than':
          if (Number(value) <= Number(condition.value)) return false;
          break;
        case 'less_than':
          if (Number(value) >= Number(condition.value)) return false;
          break;
      }
    }
    return true;
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private async executeStep(
    step: ProceduralPattern['action']['steps'][0],
    input: Record<string, any>
  ): Promise<any> {
    // Simulate step execution
    // In production, this would call actual services based on step.action
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.info(`Executed step: ${step.action}`);
    return { success: true };
  }

  private async updatePatternPerformance(
    userId: string,
    patternId: string,
    execution: WorkflowExecution
  ): Promise<void> {
    const pattern = await this.getPattern(userId, patternId);
    if (!pattern) return;

    const isSuccess = execution.status === 'completed';
    const executionTime = execution.metrics.executionTime || 0;

    // Update performance metrics
    const oldCount = pattern.performance.executionCount;
    const oldSuccessCount = Math.round(oldCount * pattern.performance.successRate);
    const newSuccessCount = oldSuccessCount + (isSuccess ? 1 : 0);
    
    pattern.performance.executionCount = oldCount + 1;
    pattern.performance.successRate = newSuccessCount / pattern.performance.executionCount;
    pattern.performance.averageExecutionTime = 
      (pattern.performance.averageExecutionTime * oldCount + executionTime) / 
      (oldCount + 1);
    pattern.performance.lastExecuted = new Date();

    // Save updated pattern
    const patternKey = `${this.NAMESPACE}${this.PATTERN_PREFIX}${userId}:${patternId}`;
    await this.redis.set(patternKey, JSON.stringify(pattern));
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(userId: string): Promise<{
    totalPatterns: number;
    activePatterns: number;
    averageConfidence: number;
    topPatterns: ProceduralPattern[];
    recentExecutions: number;
  }> {
    try {
      // Get all patterns
      const types: ProceduralPattern['patternType'][] = ['workflow', 'preference', 'behavior', 'response_template'];
      const allPatterns: ProceduralPattern[] = [];
      
      for (const type of types) {
        const patterns = await this.getPatternsByType(userId, type);
        allPatterns.push(...patterns);
      }

      // Calculate stats
      const activePatterns = allPatterns.filter(p => p.learningMetadata.isActive);
      const totalConfidence = activePatterns.reduce(
        (sum, p) => sum + p.learningMetadata.confidence, 0
      );

      // Get top patterns by execution count
      const topPatterns = [...allPatterns]
        .sort((a, b) => b.performance.executionCount - a.performance.executionCount)
        .slice(0, 5);

      // Count recent executions
      const activeExecKey = `${this.NAMESPACE}active-exec:${userId}`;
      const activeExecCount = await this.redis.scard(activeExecKey);

      return {
        totalPatterns: allPatterns.length,
        activePatterns: activePatterns.length,
        averageConfidence: activePatterns.length > 0 
          ? totalConfidence / activePatterns.length 
          : 0,
        topPatterns,
        recentExecutions: activeExecCount,
      };
    } catch (error) {
      logger.error('Failed to get learning stats:', error);
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('Procedural memory service disconnected');
  }
}

// Export singleton instance
export const proceduralMemoryService = new ProceduralMemoryService();