/**
 * Vector Database Service using Qdrant
 * Handles semantic search and embeddings storage
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from '../../utils/logger.js';
import { AIServiceError } from '../../middleware/errorHandler.js';
import { config } from '../../config/config.js';

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: any;
}

export class VectorService {
  private client: QdrantClient;
  private collectionName = config.vector.indexName;

  constructor(options: { url: string; apiKey?: string }) {
    this.client = new QdrantClient({
      url: options.url,
      apiKey: options.apiKey,
    });
  }

  /**
   * Health check for Qdrant service
   */
  async healthCheck(): Promise<void> {
    try {
      const health = await this.client.api('cluster').clusterStatus();
      logger.info('Qdrant service health check passed', { status: health.status });
    } catch (error: any) {
      logger.error('Qdrant service health check failed', error);
      throw new AIServiceError(`Qdrant service unavailable: ${error.message}`, 'qdrant');
    }
  }

  /**
   * Ensure collection exists with proper configuration
   */
  async ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col: any) => col.name === this.collectionName
      );

      if (!collectionExists) {
        logger.info(`Creating Qdrant collection: ${this.collectionName}`);
        
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: config.vector.dimensions,
            distance: 'Cosine', // Cosine similarity for embeddings
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        logger.info(`✅ Collection ${this.collectionName} created successfully`);
      } else {
        logger.info(`Collection ${this.collectionName} already exists`);
      }
    } catch (error: any) {
      logger.error('Failed to ensure collection exists', error);
      throw new AIServiceError(`Vector collection setup failed: ${error.message}`, 'qdrant');
    }
  }

  /**
   * Store vector embeddings with metadata
   */
  async storeEmbedding(
    id: string,
    vector: number[],
    metadata: any
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id,
            vector,
            payload: {
              ...metadata,
              createdAt: new Date().toISOString(),
            },
          },
        ],
      });

      logger.debug('Vector embedding stored', { id, metadataKeys: Object.keys(metadata) });
    } catch (error: any) {
      logger.error('Failed to store vector embedding', { id, error: error.message });
      throw new AIServiceError(`Failed to store embedding: ${error.message}`, 'qdrant');
    }
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(
    queryVector: number[],
    limit: number = 10,
    filter?: any
  ): Promise<VectorSearchResult[]> {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        with_payload: true,
        with_vectors: false,
        filter,
      });

      return searchResult.map((result: any) => ({
        id: result.id,
        score: result.score,
        metadata: result.payload,
      }));
    } catch (error: any) {
      logger.error('Vector search failed', { error: error.message, limit });
      throw new AIServiceError(`Vector search failed: ${error.message}`, 'qdrant');
    }
  }

  /**
   * Search for talent by text query (using embeddings)
   */
  async searchTalent(
    queryVector: number[],
    filters?: {
      ageRange?: { min: number; max: number };
      gender?: string;
      languages?: string[];
      location?: string;
    }
  ): Promise<VectorSearchResult[]> {
    const qdrantFilter: any = {};

    if (filters) {
      const conditions: any[] = [];

      if (filters.ageRange) {
        conditions.push({
          key: 'age',
          range: {
            gte: filters.ageRange.min,
            lte: filters.ageRange.max,
          },
        });
      }

      if (filters.gender) {
        conditions.push({
          key: 'gender',
          match: { value: filters.gender },
        });
      }

      if (filters.languages && filters.languages.length > 0) {
        conditions.push({
          key: 'languages',
          match: { any: filters.languages },
        });
      }

      if (filters.location) {
        conditions.push({
          key: 'location',
          match: { value: filters.location },
        });
      }

      if (conditions.length > 0) {
        qdrantFilter.must = conditions;
      }
    }

    return this.searchSimilar(queryVector, 20, qdrantFilter);
  }

  /**
   * Store talent profile for vector search
   */
  async storeTalentProfile(
    talentId: string,
    profileVector: number[],
    profile: {
      name: string;
      age: number;
      gender: string;
      languages: string[];
      skills: string[];
      experience: string;
      location: string;
      [key: string]: any;
    }
  ): Promise<void> {
    await this.storeEmbedding(talentId, profileVector, {
      ...profile,
      type: 'talent_profile',
    });
  }

  /**
   * Store project/role requirements for matching
   */
  async storeProjectRequirements(
    projectId: string,
    requirementsVector: number[],
    requirements: {
      title: string;
      description: string;
      roleType: string;
      ageRange: { min: number; max: number };
      gender?: string;
      languages: string[];
      skills: string[];
      location: string;
      [key: string]: any;
    }
  ): Promise<void> {
    await this.storeEmbedding(projectId, requirementsVector, {
      ...requirements,
      type: 'project_requirements',
    });
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(id: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });

      logger.debug('Vector deleted', { id });
    } catch (error: any) {
      logger.error('Failed to delete vector', { id, error: error.message });
      throw new AIServiceError(`Failed to delete vector: ${error.message}`, 'qdrant');
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<any> {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error: any) {
      logger.error('Failed to get collection stats', error);
      throw new AIServiceError(`Failed to get collection stats: ${error.message}`, 'qdrant');
    }
  }
}