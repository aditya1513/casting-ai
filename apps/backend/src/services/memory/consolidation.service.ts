/**
 * Memory Consolidation Service
 * Manages the transfer and consolidation of memories between different memory types
 * Part of the advanced CastMatch memory architecture
 */

import { logger } from '../../utils/logger';
import { episodicMemoryService, EpisodicMemory } from './episodic-memory.service';
import { semanticMemoryService, SemanticEntity } from './semantic-memory.service';
import { proceduralMemoryService, ProceduralPattern } from './procedural-memory.service';

export interface ConsolidationRule {
  id: string;
  name: string;
  sourceType: 'episodic' | 'semantic' | 'procedural';
  targetType: 'episodic' | 'semantic' | 'procedural';
  conditions: {
    minImportance?: number;
    minOccurrences?: number;
    timeThreshold?: number; // milliseconds
    patternMatch?: RegExp;
  };
  transformations: Array<{
    action: 'extract' | 'aggregate' | 'abstract' | 'reinforce';
    parameters: Record<string, any>;
  }>;
  schedule: {
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    lastRun?: Date;
    nextRun?: Date;
  };
}

export interface ConsolidationResult {
  ruleId: string;
  timestamp: Date;
  sourceCount: number;
  targetCount: number;
  success: boolean;
  details: {
    extracted?: any[];
    created?: any[];
    updated?: any[];
    errors?: string[];
  };
}

export class MemoryConsolidationService {
  private consolidationRules: Map<string, ConsolidationRule> = new Map();
  private isRunning: boolean = false;
  private consolidationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultRules();
    logger.info('Memory consolidation service initialized');
  }

  /**
   * Initialize default consolidation rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: Important episodic memories to semantic entities
    this.addRule({
      id: 'episodic-to-semantic-entities',
      name: 'Extract entities from important conversations',
      sourceType: 'episodic',
      targetType: 'semantic',
      conditions: {
        minImportance: 0.7,
      },
      transformations: [
        {
          action: 'extract',
          parameters: { extractType: 'entities' },
        },
      ],
      schedule: {
        frequency: 'hourly',
      },
    });

    // Rule 2: Repeated patterns to procedural memory
    this.addRule({
      id: 'episodic-to-procedural-patterns',
      name: 'Learn patterns from repeated interactions',
      sourceType: 'episodic',
      targetType: 'procedural',
      conditions: {
        minOccurrences: 3,
      },
      transformations: [
        {
          action: 'abstract',
          parameters: { patternType: 'workflow' },
        },
      ],
      schedule: {
        frequency: 'daily',
      },
    });

    // Rule 3: Reinforce semantic relationships
    this.addRule({
      id: 'semantic-relationship-reinforcement',
      name: 'Strengthen frequently accessed relationships',
      sourceType: 'semantic',
      targetType: 'semantic',
      conditions: {
        minOccurrences: 5,
      },
      transformations: [
        {
          action: 'reinforce',
          parameters: { strengthDelta: 0.1 },
        },
      ],
      schedule: {
        frequency: 'daily',
      },
    });
  }

  /**
   * Add a consolidation rule
   */
  addRule(rule: ConsolidationRule): void {
    this.consolidationRules.set(rule.id, rule);
    logger.info(`Added consolidation rule: ${rule.name}`);
  }

  /**
   * Consolidate episodic memories to semantic knowledge
   */
  async consolidateEpisodicToSemantic(userId: string): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      ruleId: 'episodic-to-semantic-entities',
      timestamp: new Date(),
      sourceCount: 0,
      targetCount: 0,
      success: true,
      details: {
        extracted: [],
        created: [],
      },
    };

    try {
      // Get important episodic memories
      const memories = await episodicMemoryService.query({
        userId,
        minImportance: 0.7,
        limit: 100,
      });

      result.sourceCount = memories.length;

      for (const memory of memories) {
        // Extract entities from interaction
        const entities = await this.extractEntitiesFromMemory(memory);
        result.details.extracted?.push(...entities);

        // Store entities in semantic memory
        for (const entity of entities) {
          const stored = await semanticMemoryService.storeEntity(userId, entity);
          result.details.created?.push(stored);
          result.targetCount++;
        }

        // Extract relationships
        const relationships = this.extractRelationships(memory);
        for (const relation of relationships) {
          await semanticMemoryService.storeRelation(userId, relation);
        }
      }

      logger.info(`Consolidated ${result.targetCount} entities from ${result.sourceCount} episodic memories`);
    } catch (error) {
      result.success = false;
      result.details.errors = [error.message];
      logger.error('Failed to consolidate episodic to semantic:', error);
    }

    return result;
  }

  /**
   * Learn procedural patterns from episodic memories
   */
  async learnPatternsFromEpisodic(userId: string): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      ruleId: 'episodic-to-procedural-patterns',
      timestamp: new Date(),
      sourceCount: 0,
      targetCount: 0,
      success: true,
      details: {
        extracted: [],
        created: [],
      },
    };

    try {
      // Get recent episodic memories
      const memories = await episodicMemoryService.query({
        userId,
        limit: 200,
      });

      result.sourceCount = memories.length;

      // Group memories by similarity
      const patterns = this.identifyPatterns(memories);
      result.details.extracted?.push(...patterns);

      // Create procedural patterns
      for (const pattern of patterns) {
        const procedural = await proceduralMemoryService.learnPattern(userId, {
          patternType: 'workflow',
          name: pattern.name,
          description: pattern.description,
          trigger: {
            conditions: pattern.conditions,
            confidence: 0.6,
          },
          action: {
            type: 'response',
            template: pattern.template,
          },
          context: {
            domain: 'casting',
            tags: pattern.tags,
          },
        });
        result.details.created?.push(procedural);
        result.targetCount++;
      }

      logger.info(`Learned ${result.targetCount} patterns from ${result.sourceCount} episodic memories`);
    } catch (error) {
      result.success = false;
      result.details.errors = [error.message];
      logger.error('Failed to learn patterns from episodic:', error);
    }

    return result;
  }

  /**
   * Reinforce semantic relationships based on usage
   */
  async reinforceSemanticRelationships(userId: string): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      ruleId: 'semantic-relationship-reinforcement',
      timestamp: new Date(),
      sourceCount: 0,
      targetCount: 0,
      success: true,
      details: {
        updated: [],
      },
    };

    try {
      // Get knowledge graph
      const graph = await semanticMemoryService.buildKnowledgeGraph(userId);
      result.sourceCount = graph.entities.size;

      // Analyze access patterns and reinforce
      for (const [entityId, entity] of graph.entities) {
        // Check if entity should be reinforced
        if (entity.confidence < 0.9 && this.shouldReinforce(entity)) {
          await semanticMemoryService.reinforceEntity(userId, entityId, 0.1);
          result.details.updated?.push(entity);
          result.targetCount++;
        }
      }

      logger.info(`Reinforced ${result.targetCount} semantic entities`);
    } catch (error) {
      result.success = false;
      result.details.errors = [error.message];
      logger.error('Failed to reinforce semantic relationships:', error);
    }

    return result;
  }

  /**
   * Run all consolidation rules
   */
  async runConsolidation(userId: string): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];

    for (const [ruleId, rule] of this.consolidationRules) {
      if (this.shouldRunRule(rule)) {
        logger.info(`Running consolidation rule: ${rule.name}`);
        
        let result: ConsolidationResult;
        switch (ruleId) {
          case 'episodic-to-semantic-entities':
            result = await this.consolidateEpisodicToSemantic(userId);
            break;
          case 'episodic-to-procedural-patterns':
            result = await this.learnPatternsFromEpisodic(userId);
            break;
          case 'semantic-relationship-reinforcement':
            result = await this.reinforceSemanticRelationships(userId);
            break;
          default:
            continue;
        }

        results.push(result);
        rule.schedule.lastRun = new Date();
        rule.schedule.nextRun = this.calculateNextRun(rule.schedule.frequency);
      }
    }

    return results;
  }

  /**
   * Start automatic consolidation
   */
  startAutoConsolidation(intervalMs: number = 3600000): void { // Default 1 hour
    if (this.consolidationInterval) {
      this.stopAutoConsolidation();
    }

    this.isRunning = true;
    this.consolidationInterval = setInterval(async () => {
      if (!this.isRunning) return;

      logger.info('Running automatic memory consolidation');
      // In production, this would consolidate for all active users
      // For now, we'll need to pass specific user IDs
    }, intervalMs);

    logger.info(`Started automatic consolidation with ${intervalMs}ms interval`);
  }

  /**
   * Stop automatic consolidation
   */
  stopAutoConsolidation(): void {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
    }
    this.isRunning = false;
    logger.info('Stopped automatic consolidation');
  }

  // Helper methods

  private async extractEntitiesFromMemory(
    memory: EpisodicMemory
  ): Promise<Array<Omit<SemanticEntity, 'id' | 'createdAt' | 'updatedAt'>>> {
    const entities: Array<Omit<SemanticEntity, 'id' | 'createdAt' | 'updatedAt'>> = [];

    // Extract entities from metadata
    if (memory.metadata.entities) {
      for (const entityName of memory.metadata.entities) {
        entities.push({
          type: this.inferEntityType(entityName),
          name: entityName,
          attributes: {
            source: 'episodic_extraction',
            sessionId: memory.sessionId,
          },
          confidence: memory.metadata.importance,
        });
      }
    }

    // Extract topics as concepts
    if (memory.metadata.topics) {
      for (const topic of memory.metadata.topics) {
        entities.push({
          type: 'concept',
          name: topic,
          attributes: {
            source: 'topic_extraction',
          },
          confidence: 0.7,
        });
      }
    }

    return entities;
  }

  private extractRelationships(memory: EpisodicMemory): Array<Omit<SemanticRelation, 'id' | 'createdAt'>> {
    const relations: Array<Omit<SemanticRelation, 'id' | 'createdAt'>> = [];
    
    // This would use NLP to extract relationships from the conversation
    // For now, returning empty array as placeholder
    
    return relations;
  }

  private identifyPatterns(memories: EpisodicMemory[]): Array<{
    name: string;
    description: string;
    conditions: any[];
    template: string;
    tags: string[];
  }> {
    const patterns: Array<{
      name: string;
      description: string;
      conditions: any[];
      template: string;
      tags: string[];
    }> = [];

    // Group similar interactions
    const interactionGroups = new Map<string, EpisodicMemory[]>();
    
    for (const memory of memories) {
      // Simple grouping by first few words of user input
      const key = memory.interaction.userInput.substring(0, 30);
      if (!interactionGroups.has(key)) {
        interactionGroups.set(key, []);
      }
      interactionGroups.get(key)?.push(memory);
    }

    // Create patterns from groups with multiple occurrences
    for (const [key, group] of interactionGroups) {
      if (group.length >= 3) {
        patterns.push({
          name: `Pattern: ${key.substring(0, 20)}...`,
          description: `Learned from ${group.length} similar interactions`,
          conditions: [
            {
              field: 'userInput',
              operator: 'contains',
              value: key.split(' ')[0],
            },
          ],
          template: group[0].interaction.aiResponse,
          tags: group[0].metadata.topics || [],
        });
      }
    }

    return patterns;
  }

  private inferEntityType(name: string): SemanticEntity['type'] {
    // Simple heuristic for entity type inference
    if (name.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) {
      return 'person';
    } else if (name.toLowerCase().includes('project')) {
      return 'project';
    } else if (['acting', 'singing', 'dancing', 'directing'].some(s => name.toLowerCase().includes(s))) {
      return 'skill';
    } else {
      return 'concept';
    }
  }

  private shouldReinforce(entity: SemanticEntity): boolean {
    // Reinforce if entity was updated recently
    const hoursSinceUpdate = (Date.now() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < 24;
  }

  private shouldRunRule(rule: ConsolidationRule): boolean {
    if (!rule.schedule.lastRun) return true;
    
    const now = Date.now();
    const lastRun = new Date(rule.schedule.lastRun).getTime();
    
    switch (rule.schedule.frequency) {
      case 'immediate':
        return true;
      case 'hourly':
        return now - lastRun > 3600000;
      case 'daily':
        return now - lastRun > 86400000;
      case 'weekly':
        return now - lastRun > 604800000;
      default:
        return false;
    }
  }

  private calculateNextRun(frequency: ConsolidationRule['schedule']['frequency']): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'immediate':
        return now;
      case 'hourly':
        return new Date(now.getTime() + 3600000);
      case 'daily':
        return new Date(now.getTime() + 86400000);
      case 'weekly':
        return new Date(now.getTime() + 604800000);
      default:
        return now;
    }
  }

  /**
   * Get consolidation statistics
   */
  async getConsolidationStats(): Promise<{
    rulesCount: number;
    lastConsolidation: Date | null;
    nextScheduled: Date | null;
    isRunning: boolean;
  }> {
    let lastRun: Date | null = null;
    let nextRun: Date | null = null;

    for (const rule of this.consolidationRules.values()) {
      if (rule.schedule.lastRun) {
        if (!lastRun || rule.schedule.lastRun > lastRun) {
          lastRun = rule.schedule.lastRun;
        }
      }
      if (rule.schedule.nextRun) {
        if (!nextRun || rule.schedule.nextRun < nextRun) {
          nextRun = rule.schedule.nextRun;
        }
      }
    }

    return {
      rulesCount: this.consolidationRules.size,
      lastConsolidation: lastRun,
      nextScheduled: nextRun,
      isRunning: this.isRunning,
    };
  }
}

// Export singleton instance
export const memoryConsolidationService = new MemoryConsolidationService();