/**
 * Vector Database Service
 * Manages Pinecone vector database operations for semantic search and talent matching
 */

import { Pinecone, PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheManager } from '../config/redis';

/**
 * Talent metadata stored in Pinecone
 */
export interface TalentVectorMetadata extends RecordMetadata {
  talentId: string;
  userId: string;
  displayName: string;
  gender?: string;
  location?: string;
  languages?: string[];
  skills?: string[];
  experienceLevel?: string;
  rating?: number;
  yearsOfExperience?: number;
  availability?: string;
  lastActive?: string;
  profileCompleteness?: number;
  verified?: boolean;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
  minScore?: number;
}

/**
 * Batch processing options
 */
export interface BatchOptions {
  batchSize?: number;
  parallel?: boolean;
  onProgress?: (processed: number, total: number) => void;
}

class VectorService {
  private pinecone: Pinecone | null = null;
  private indexName: string = 'castmatch-talents';
  private dimension: number = 1536; // OpenAI ada-002 dimension
  private namespace: string = 'talents';
  private initialized: boolean = false;

  /**
   * Initialize Pinecone client and index
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Pinecone client
      this.pinecone = new Pinecone({
        apiKey: config.pinecone.apiKey,
      });

      // Check if index exists, create if not
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        logger.info(`Creating Pinecone index: ${this.indexName}`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      this.initialized = true;
      logger.info('✅ Pinecone vector service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Pinecone:', error);
      throw new AppError('Failed to initialize vector database', 500);
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(maxAttempts: number = 60): Promise<void> {
    if (!this.pinecone) throw new Error('Pinecone not initialized');

    for (let i = 0; i < maxAttempts; i++) {
      const description = await this.pinecone.describeIndex(this.indexName);
      if (description.status?.ready) {
        logger.info(`Index ${this.indexName} is ready`);
        return;
      }
      logger.info(`Waiting for index to be ready... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Index creation timeout');
  }

  /**
   * Get Pinecone index instance
   */
  private async getIndex() {
    if (!this.initialized) await this.initialize();
    if (!this.pinecone) throw new Error('Pinecone not initialized');
    return this.pinecone.index<TalentVectorMetadata>(this.indexName);
  }

  /**
   * Upsert talent embedding to Pinecone
   */
  async upsertTalentEmbedding(
    talentId: string,
    embedding: number[],
    metadata: TalentVectorMetadata
  ): Promise<void> {
    try {
      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);

      const record: PineconeRecord<TalentVectorMetadata> = {
        id: talentId,
        values: embedding,
        metadata,
      };

      await namespace.upsert([record]);
      
      // Invalidate cache for this talent
      await CacheManager.delete(`talent:${talentId}`);
      
      logger.info(`Upserted embedding for talent: ${talentId}`);
    } catch (error) {
      logger.error('Failed to upsert talent embedding:', error);
      throw new AppError('Failed to store talent embedding', 500);
    }
  }

  /**
   * Batch upsert multiple talent embeddings
   */
  async batchUpsertEmbeddings(
    records: Array<{
      talentId: string;
      embedding: number[];
      metadata: TalentVectorMetadata;
    }>,
    options: BatchOptions = {}
  ): Promise<void> {
    const { batchSize = 100, onProgress } = options;
    
    try {
      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);
      
      const totalRecords = records.length;
      
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const pineconeRecords: PineconeRecord<TalentVectorMetadata>[] = batch.map(record => ({
          id: record.talentId,
          values: record.embedding,
          metadata: record.metadata,
        }));
        
        await namespace.upsert(pineconeRecords);
        
        const processed = Math.min(i + batchSize, totalRecords);
        if (onProgress) {
          onProgress(processed, totalRecords);
        }
        
        logger.info(`Batch upserted ${processed}/${totalRecords} embeddings`);
      }
      
      // Clear search cache after batch update
      await CacheManager.clearPattern('search:*');
      
    } catch (error) {
      logger.error('Failed to batch upsert embeddings:', error);
      throw new AppError('Failed to batch store embeddings', 500);
    }
  }

  /**
   * Search for similar talents using vector similarity
   */
  async searchSimilarTalents(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<Array<{ id: string; score: number; metadata?: TalentVectorMetadata }>> {
    const {
      topK = 20,
      filter,
      includeMetadata = true,
      minScore = 0.7,
    } = options;

    try {
      // Check cache first
      const cacheKey = `search:${JSON.stringify({ embedding: queryEmbedding.slice(0, 5), ...options })}`;
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        logger.info('Returning cached search results');
        return JSON.parse(cached);
      }

      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);

      const queryResponse = await namespace.query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata,
        includeValues: false,
      });

      // Filter by minimum score and format results
      const results = (queryResponse.matches || [])
        .filter(match => (match.score || 0) >= minScore)
        .map(match => ({
          id: match.id,
          score: match.score || 0,
          metadata: includeMetadata ? match.metadata : undefined,
        }));

      // Cache results for 5 minutes
      await CacheManager.set(cacheKey, JSON.stringify(results), 300);

      return results;
    } catch (error) {
      logger.error('Failed to search similar talents:', error);
      throw new AppError('Failed to search talents', 500);
    }
  }

  /**
   * Find talents matching specific criteria
   */
  async findMatchingTalents(
    queryEmbedding: number[],
    filters: {
      gender?: string;
      location?: string;
      languages?: string[];
      skills?: string[];
      experienceLevel?: string;
      minRating?: number;
      availability?: string;
    },
    options: VectorSearchOptions = {}
  ): Promise<Array<{ id: string; score: number; metadata?: TalentVectorMetadata }>> {
    // Build Pinecone filter
    const pineconeFilter: Record<string, any> = {};

    if (filters.gender) {
      pineconeFilter.gender = { $eq: filters.gender };
    }

    if (filters.location) {
      pineconeFilter.location = { $eq: filters.location };
    }

    if (filters.languages && filters.languages.length > 0) {
      pineconeFilter.languages = { $in: filters.languages };
    }

    if (filters.skills && filters.skills.length > 0) {
      pineconeFilter.skills = { $in: filters.skills };
    }

    if (filters.experienceLevel) {
      pineconeFilter.experienceLevel = { $eq: filters.experienceLevel };
    }

    if (filters.minRating !== undefined) {
      pineconeFilter.rating = { $gte: filters.minRating };
    }

    if (filters.availability) {
      pineconeFilter.availability = { $eq: filters.availability };
    }

    return this.searchSimilarTalents(queryEmbedding, {
      ...options,
      filter: { ...pineconeFilter, ...options.filter },
    });
  }

  /**
   * Get talent by ID from vector database
   */
  async getTalentVector(talentId: string): Promise<{
    id: string;
    values?: number[];
    metadata?: TalentVectorMetadata;
  } | null> {
    try {
      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);

      const response = await namespace.fetch([talentId]);
      const record = response.records[talentId];

      if (!record) {
        return null;
      }

      return {
        id: record.id,
        values: record.values,
        metadata: record.metadata,
      };
    } catch (error) {
      logger.error('Failed to get talent vector:', error);
      throw new AppError('Failed to retrieve talent data', 500);
    }
  }

  /**
   * Delete talent embedding from Pinecone
   */
  async deleteTalentEmbedding(talentId: string): Promise<void> {
    try {
      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);

      await namespace.deleteOne(talentId);
      
      // Invalidate cache
      await CacheManager.delete(`talent:${talentId}`);
      
      logger.info(`Deleted embedding for talent: ${talentId}`);
    } catch (error) {
      logger.error('Failed to delete talent embedding:', error);
      throw new AppError('Failed to delete talent embedding', 500);
    }
  }

  /**
   * Delete multiple talent embeddings
   */
  async deleteTalentEmbeddings(talentIds: string[]): Promise<void> {
    try {
      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);

      await namespace.deleteMany(talentIds);
      
      // Invalidate cache for all deleted talents
      await Promise.all(talentIds.map(id => CacheManager.delete(`talent:${id}`)));
      
      logger.info(`Deleted ${talentIds.length} talent embeddings`);
    } catch (error) {
      logger.error('Failed to delete talent embeddings:', error);
      throw new AppError('Failed to delete talent embeddings', 500);
    }
  }

  /**
   * Update talent metadata without changing embedding
   */
  async updateTalentMetadata(
    talentId: string,
    metadata: Partial<TalentVectorMetadata>
  ): Promise<void> {
    try {
      // Fetch existing record
      const existing = await this.getTalentVector(talentId);
      if (!existing || !existing.values) {
        throw new AppError('Talent embedding not found', 404);
      }

      // Update with new metadata
      await this.upsertTalentEmbedding(
        talentId,
        existing.values,
        { ...existing.metadata, ...metadata } as TalentVectorMetadata
      );
    } catch (error) {
      logger.error('Failed to update talent metadata:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update talent metadata', 500);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
    namespaces: Record<string, { vectorCount: number }>;
  }> {
    try {
      const index = await this.getIndex();
      const stats = await index.describeIndexStats();

      return {
        dimension: stats.dimension || this.dimension,
        indexFullness: stats.indexFullness || 0,
        totalVectorCount: stats.totalRecordCount || 0,
        namespaces: stats.namespaces || {},
      };
    } catch (error) {
      logger.error('Failed to get index statistics:', error);
      throw new AppError('Failed to retrieve index statistics', 500);
    }
  }

  /**
   * Clear all vectors in namespace (use with caution)
   */
  async clearNamespace(): Promise<void> {
    try {
      const index = await this.getIndex();
      const namespace = index.namespace(this.namespace);

      await namespace.deleteAll();
      
      // Clear all cache
      await CacheManager.clearPattern('*');
      
      logger.warn(`Cleared all vectors in namespace: ${this.namespace}`);
    } catch (error) {
      logger.error('Failed to clear namespace:', error);
      throw new AppError('Failed to clear vector database', 500);
    }
  }
}

// Export singleton instance
export const vectorService = new VectorService();