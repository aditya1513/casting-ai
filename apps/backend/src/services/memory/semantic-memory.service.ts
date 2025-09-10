/**
 * Semantic Memory Service
 * Manages long-term knowledge graphs and entity relationships
 * Part of the advanced CastMatch memory architecture
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import OpenAI from 'openai';

export interface SemanticEntity {
  id: string;
  type: 'person' | 'project' | 'skill' | 'preference' | 'concept';
  name: string;
  description?: string;
  attributes: Record<string, any>;
  embedding?: number[]; // Vector representation
  createdAt: Date;
  updatedAt: Date;
  confidence: number; // 0-1 score
}

export interface SemanticRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string; // e.g., "knows", "prefers", "works_on", "has_skill"
  strength: number; // 0-1 score
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface KnowledgeGraph {
  entities: Map<string, SemanticEntity>;
  relations: Map<string, SemanticRelation>;
  userId: string;
}

export class SemanticMemoryService {
  private redis: Redis;
  private openai: OpenAI | null = null;
  private readonly NAMESPACE = 'semantic:';
  private readonly ENTITY_PREFIX = 'entity:';
  private readonly RELATION_PREFIX = 'relation:';
  private readonly GRAPH_PREFIX = 'graph:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 2, // Use DB 2 for semantic memory
    });

    // Initialize OpenAI for embeddings if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    this.redis.on('connect', () => {
      logger.info('Semantic memory service connected to Redis');
    });

    this.redis.on('error', (err) => {
      logger.error('Semantic memory Redis error:', err);
    });
  }

  /**
   * Create or update a semantic entity
   */
  async storeEntity(
    userId: string,
    entity: Omit<SemanticEntity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SemanticEntity> {
    try {
      // Check if entity already exists
      const existingId = await this.findEntityByName(userId, entity.name, entity.type);
      
      const now = new Date();
      const fullEntity: SemanticEntity = existingId 
        ? {
            ...entity,
            id: existingId,
            createdAt: await this.getEntityCreatedAt(userId, existingId) || now,
            updatedAt: now,
          }
        : {
            ...entity,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          };

      // Generate embedding if not provided
      if (!fullEntity.embedding && entity.description) {
        fullEntity.embedding = await this.generateEmbedding(
          `${entity.type}: ${entity.name} - ${entity.description}`
        );
      }

      // Store entity
      const entityKey = `${this.NAMESPACE}${this.ENTITY_PREFIX}${userId}:${fullEntity.id}`;
      await this.redis.set(entityKey, JSON.stringify(fullEntity));

      // Index by type
      const typeIndexKey = `${this.NAMESPACE}index:${userId}:${entity.type}`;
      await this.redis.sadd(typeIndexKey, fullEntity.id);

      // Index by name for quick lookup
      const nameIndexKey = `${this.NAMESPACE}name:${userId}:${entity.type}:${entity.name.toLowerCase()}`;
      await this.redis.set(nameIndexKey, fullEntity.id);

      // Store embedding for similarity search
      if (fullEntity.embedding) {
        const embeddingKey = `${this.NAMESPACE}embedding:${userId}:${fullEntity.id}`;
        await this.redis.set(embeddingKey, JSON.stringify(fullEntity.embedding));
      }

      logger.info(`Stored semantic entity ${fullEntity.id} for user ${userId}`);
      return fullEntity;
    } catch (error) {
      logger.error('Failed to store semantic entity:', error);
      throw error;
    }
  }

  /**
   * Create a relation between entities
   */
  async storeRelation(
    userId: string,
    relation: Omit<SemanticRelation, 'id' | 'createdAt'>
  ): Promise<SemanticRelation> {
    try {
      const fullRelation: SemanticRelation = {
        ...relation,
        id: uuidv4(),
        createdAt: new Date(),
      };

      // Store relation
      const relationKey = `${this.NAMESPACE}${this.RELATION_PREFIX}${userId}:${fullRelation.id}`;
      await this.redis.set(relationKey, JSON.stringify(fullRelation));

      // Index by source entity
      const sourceIndexKey = `${this.NAMESPACE}relations:source:${userId}:${relation.sourceId}`;
      await this.redis.sadd(sourceIndexKey, fullRelation.id);

      // Index by target entity
      const targetIndexKey = `${this.NAMESPACE}relations:target:${userId}:${relation.targetId}`;
      await this.redis.sadd(targetIndexKey, fullRelation.id);

      // Index by relation type
      const typeIndexKey = `${this.NAMESPACE}relations:type:${userId}:${relation.relationType}`;
      await this.redis.sadd(typeIndexKey, fullRelation.id);

      logger.info(`Stored semantic relation ${fullRelation.id} for user ${userId}`);
      return fullRelation;
    } catch (error) {
      logger.error('Failed to store semantic relation:', error);
      throw error;
    }
  }

  /**
   * Retrieve an entity by ID
   */
  async getEntity(userId: string, entityId: string): Promise<SemanticEntity | null> {
    try {
      const entityKey = `${this.NAMESPACE}${this.ENTITY_PREFIX}${userId}:${entityId}`;
      const data = await this.redis.get(entityKey);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data) as SemanticEntity;
    } catch (error) {
      logger.error('Failed to retrieve entity:', error);
      throw error;
    }
  }

  /**
   * Find entities by type
   */
  async getEntitiesByType(
    userId: string,
    type: SemanticEntity['type']
  ): Promise<SemanticEntity[]> {
    try {
      const typeIndexKey = `${this.NAMESPACE}index:${userId}:${type}`;
      const entityIds = await this.redis.smembers(typeIndexKey);
      
      const entities: SemanticEntity[] = [];
      for (const entityId of entityIds) {
        const entity = await this.getEntity(userId, entityId);
        if (entity) {
          entities.push(entity);
        }
      }

      return entities;
    } catch (error) {
      logger.error('Failed to get entities by type:', error);
      throw error;
    }
  }

  /**
   * Get all relations for an entity
   */
  async getEntityRelations(
    userId: string,
    entityId: string,
    direction: 'source' | 'target' | 'both' = 'both'
  ): Promise<SemanticRelation[]> {
    try {
      const relations: SemanticRelation[] = [];
      
      if (direction === 'source' || direction === 'both') {
        const sourceIndexKey = `${this.NAMESPACE}relations:source:${userId}:${entityId}`;
        const sourceRelationIds = await this.redis.smembers(sourceIndexKey);
        
        for (const relationId of sourceRelationIds) {
          const relationKey = `${this.NAMESPACE}${this.RELATION_PREFIX}${userId}:${relationId}`;
          const data = await this.redis.get(relationKey);
          if (data) {
            relations.push(JSON.parse(data) as SemanticRelation);
          }
        }
      }

      if (direction === 'target' || direction === 'both') {
        const targetIndexKey = `${this.NAMESPACE}relations:target:${userId}:${entityId}`;
        const targetRelationIds = await this.redis.smembers(targetIndexKey);
        
        for (const relationId of targetRelationIds) {
          const relationKey = `${this.NAMESPACE}${this.RELATION_PREFIX}${userId}:${relationId}`;
          const data = await this.redis.get(relationKey);
          if (data) {
            relations.push(JSON.parse(data) as SemanticRelation);
          }
        }
      }

      return relations;
    } catch (error) {
      logger.error('Failed to get entity relations:', error);
      throw error;
    }
  }

  /**
   * Build a knowledge graph for a user
   */
  async buildKnowledgeGraph(userId: string): Promise<KnowledgeGraph> {
    try {
      const entities = new Map<string, SemanticEntity>();
      const relations = new Map<string, SemanticRelation>();

      // Get all entity types
      const types: SemanticEntity['type'][] = ['person', 'project', 'skill', 'preference', 'concept'];
      
      for (const type of types) {
        const typeEntities = await this.getEntitiesByType(userId, type);
        for (const entity of typeEntities) {
          entities.set(entity.id, entity);
          
          // Get relations for each entity
          const entityRelations = await this.getEntityRelations(userId, entity.id);
          for (const relation of entityRelations) {
            relations.set(relation.id, relation);
          }
        }
      }

      return {
        entities,
        relations,
        userId,
      };
    } catch (error) {
      logger.error('Failed to build knowledge graph:', error);
      throw error;
    }
  }

  /**
   * Find similar entities using vector similarity
   */
  async findSimilarEntities(
    userId: string,
    referenceEntity: SemanticEntity,
    limit: number = 5
  ): Promise<Array<{ entity: SemanticEntity; similarity: number }>> {
    try {
      if (!referenceEntity.embedding) {
        return [];
      }

      const allEntities = await this.getAllEntities(userId);
      const similarities: Array<{ entity: SemanticEntity; similarity: number }> = [];

      for (const entity of allEntities) {
        if (entity.id === referenceEntity.id || !entity.embedding) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          referenceEntity.embedding,
          entity.embedding
        );

        similarities.push({ entity, similarity });
      }

      // Sort by similarity and return top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      return similarities.slice(0, limit);
    } catch (error) {
      logger.error('Failed to find similar entities:', error);
      throw error;
    }
  }

  /**
   * Extract entities from text (NER-like functionality)
   */
  async extractEntitiesFromText(
    userId: string,
    text: string
  ): Promise<SemanticEntity[]> {
    try {
      const extractedEntities: SemanticEntity[] = [];
      
      // Simple pattern matching for now
      // In production, use NLP libraries or AI models
      
      // Extract potential person names (capitalized words)
      const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
      const names = text.match(namePattern) || [];
      
      for (const name of names) {
        const entity = await this.storeEntity(userId, {
          type: 'person',
          name,
          attributes: { source: 'text_extraction' },
          confidence: 0.6,
        });
        extractedEntities.push(entity);
      }

      // Extract skills (common skill keywords)
      const skillKeywords = ['acting', 'singing', 'dancing', 'directing', 'writing', 'producing'];
      for (const skill of skillKeywords) {
        if (text.toLowerCase().includes(skill)) {
          const entity = await this.storeEntity(userId, {
            type: 'skill',
            name: skill,
            attributes: { source: 'text_extraction' },
            confidence: 0.7,
          });
          extractedEntities.push(entity);
        }
      }

      return extractedEntities;
    } catch (error) {
      logger.error('Failed to extract entities from text:', error);
      throw error;
    }
  }

  /**
   * Update entity confidence based on usage
   */
  async reinforceEntity(
    userId: string,
    entityId: string,
    delta: number = 0.1
  ): Promise<void> {
    try {
      const entity = await this.getEntity(userId, entityId);
      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }

      entity.confidence = Math.min(1, entity.confidence + delta);
      entity.updatedAt = new Date();

      const entityKey = `${this.NAMESPACE}${this.ENTITY_PREFIX}${userId}:${entityId}`;
      await this.redis.set(entityKey, JSON.stringify(entity));

      logger.info(`Reinforced entity ${entityId} confidence to ${entity.confidence}`);
    } catch (error) {
      logger.error('Failed to reinforce entity:', error);
      throw error;
    }
  }

  // Helper methods

  private async findEntityByName(
    userId: string,
    name: string,
    type: SemanticEntity['type']
  ): Promise<string | null> {
    const nameIndexKey = `${this.NAMESPACE}name:${userId}:${type}:${name.toLowerCase()}`;
    return await this.redis.get(nameIndexKey);
  }

  private async getEntityCreatedAt(
    userId: string,
    entityId: string
  ): Promise<Date | null> {
    const entity = await this.getEntity(userId, entityId);
    return entity ? entity.createdAt : null;
  }

  private async getAllEntities(userId: string): Promise<SemanticEntity[]> {
    const types: SemanticEntity['type'][] = ['person', 'project', 'skill', 'preference', 'concept'];
    const allEntities: SemanticEntity[] = [];
    
    for (const type of types) {
      const entities = await this.getEntitiesByType(userId, type);
      allEntities.push(...entities);
    }
    
    return allEntities;
  }

  private async generateEmbedding(text: string): Promise<number[] | undefined> {
    if (!this.openai) {
      return undefined;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      return undefined;
    }
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('Semantic memory service disconnected');
  }
}

// Export singleton instance
export const semanticMemoryService = new SemanticMemoryService();