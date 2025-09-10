/**
 * Qdrant Vector Database Service
 * Manages Qdrant vector database operations for semantic search and talent matching
 * Drop-in replacement for Pinecone service
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheManager } from '../config/redis';

/**
 * Qdrant Collection Configuration
 */
interface QdrantCollectionConfig {
  name: string;
  vectors: {
    size: number;
    distance: 'Cosine' | 'Euclid' | 'Dot';
  };
}

/**
 * Talent metadata stored in Qdrant (same as Pinecone)
 */
export interface TalentVectorMetadata {
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
 * Qdrant Point (equivalent to Pinecone Record)
 */
export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: TalentVectorMetadata;
}

/**
 * Vector search options (compatible with Pinecone interface)
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

/**
 * Search result format (compatible with Pinecone)
 */
export interface SearchResult {
  id: string;
  score: number;
  metadata?: TalentVectorMetadata;
}

class QdrantService {
  private client: AxiosInstance;
  private collectionName: string = 'castmatch-talents';
  private dimension: number = 1536; // OpenAI ada-002 dimension
  private baseUrl: string;
  private initialized: boolean = false;

  constructor() {
    this.baseUrl = config.qdrant?.url || 'http://localhost:6333';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        ...(config.qdrant?.apiKey && { 'api-key': config.qdrant.apiKey }),
      },
      timeout: 15000, // Reduced timeout to 15 seconds
      maxRedirects: 3,
      maxContentLength: 10 * 1024 * 1024, // 10MB max response size
      maxBodyLength: 10 * 1024 * 1024, // 10MB max request size
      // Connection pool settings to prevent memory leaks
      httpAgent: new (require('http').Agent)({
        keepAlive: true,
        keepAliveMsecs: 10000,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 15000,
        freeSocketTimeout: 30000,
      }),
      httpsAgent: new (require('https').Agent)({
        keepAlive: true,
        keepAliveMsecs: 10000,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 15000,
        freeSocketTimeout: 30000,
      }),
    });

    // Add response interceptor to handle errors and prevent memory leaks
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Qdrant API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize Qdrant client and collection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if Qdrant is accessible
      await this.client.get('/');
      
      // Check if collection exists, create if not
      const collectionExists = await this.checkCollectionExists();
      
      if (!collectionExists) {
        logger.info(`Creating Qdrant collection: ${this.collectionName}`);
        await this.createCollection();
      }

      this.initialized = true;
      logger.info('✅ Qdrant vector service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Qdrant:', error);
      throw new AppError('Failed to initialize vector database', 500);
    }
  }

  /**
   * Check if collection exists
   */
  private async checkCollectionExists(): Promise<boolean> {
    try {
      await this.client.get(`/collections/${this.collectionName}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create collection with specified configuration
   */
  private async createCollection(): Promise<void> {
    const collectionConfig: QdrantCollectionConfig = {
      name: this.collectionName,
      vectors: {
        size: this.dimension,
        distance: 'Cosine',
      },
    };

    await this.client.put(`/collections/${this.collectionName}`, collectionConfig);
    
    // Wait for collection to be ready
    await this.waitForCollectionReady();
  }

  /**
   * Wait for collection to be ready
   */
  private async waitForCollectionReady(maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.client.get(`/collections/${this.collectionName}`);
        if (response.data.result?.status === 'green') {
          logger.info(`Collection ${this.collectionName} is ready`);
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      logger.info(`Waiting for collection to be ready... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Collection creation timeout');
  }

  /**
   * Upsert talent embedding to Qdrant (compatible with Pinecone interface)
   */
  async upsertTalentEmbedding(
    talentId: string,
    embedding: number[],
    metadata: TalentVectorMetadata
  ): Promise<void> {
    try {
      await this.ensureInitialized();

      const point: QdrantPoint = {
        id: talentId,
        vector: embedding,
        payload: metadata,
      };

      await this.client.put(`/collections/${this.collectionName}/points`, {
        points: [point],
      });
      
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
      await this.ensureInitialized();
      
      const totalRecords = records.length;
      
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const points: QdrantPoint[] = batch.map(record => ({
          id: record.talentId,
          vector: record.embedding,
          payload: record.metadata,
        }));
        
        await this.client.put(`/collections/${this.collectionName}/points`, {
          points,
        });
        
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
   * Search for similar talents using vector similarity (compatible with Pinecone interface)
   */
  async searchSimilarTalents(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
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

      await this.ensureInitialized();

      const searchRequest = {
        vector: queryEmbedding,
        limit: topK,
        ...(filter && { filter }),
        with_payload: includeMetadata,
        with_vector: false,
      };

      const response = await this.client.post(
        `/collections/${this.collectionName}/points/search`,
        searchRequest
      );

      // Filter by minimum score and format results (compatible with Pinecone)
      const results: SearchResult[] = (response.data.result || [])
        .filter((match: any) => match.score >= minScore)
        .map((match: any) => ({
          id: match.id.toString(),
          score: match.score,
          metadata: includeMetadata ? match.payload : undefined,
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
   * Find talents matching specific criteria (compatible with Pinecone interface)
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
  ): Promise<SearchResult[]> {
    // Build Qdrant filter (different syntax from Pinecone)
    const qdrantFilter: any = {
      must: [],
    };

    if (filters.gender) {
      qdrantFilter.must.push({
        key: 'gender',
        match: { value: filters.gender },
      });
    }

    if (filters.location) {
      qdrantFilter.must.push({
        key: 'location',
        match: { value: filters.location },
      });
    }

    if (filters.languages && filters.languages.length > 0) {
      qdrantFilter.must.push({
        key: 'languages',
        match: { any: filters.languages },
      });
    }

    if (filters.skills && filters.skills.length > 0) {
      qdrantFilter.must.push({
        key: 'skills',
        match: { any: filters.skills },
      });
    }

    if (filters.experienceLevel) {
      qdrantFilter.must.push({
        key: 'experienceLevel',
        match: { value: filters.experienceLevel },
      });
    }

    if (filters.minRating !== undefined) {
      qdrantFilter.must.push({
        key: 'rating',
        range: { gte: filters.minRating },
      });
    }

    if (filters.availability) {
      qdrantFilter.must.push({
        key: 'availability',
        match: { value: filters.availability },
      });
    }

    return this.searchSimilarTalents(queryEmbedding, {
      ...options,
      filter: qdrantFilter.must.length > 0 ? qdrantFilter : undefined,
    });
  }

  /**
   * Get talent by ID from vector database (compatible with Pinecone interface)
   */
  async getTalentVector(talentId: string): Promise<{
    id: string;
    values?: number[];
    metadata?: TalentVectorMetadata;
  } | null> {
    try {
      await this.ensureInitialized();

      const response = await this.client.post(
        `/collections/${this.collectionName}/points`,
        {
          ids: [talentId],
          with_payload: true,
          with_vector: true,
        }
      );

      const points = response.data.result;
      if (!points || points.length === 0) {
        return null;
      }

      const point = points[0];
      return {
        id: point.id.toString(),
        values: point.vector,
        metadata: point.payload,
      };
    } catch (error) {
      logger.error('Failed to get talent vector:', error);
      throw new AppError('Failed to retrieve talent data', 500);
    }
  }

  /**
   * Delete talent embedding from Qdrant (compatible with Pinecone interface)
   */
  async deleteTalentEmbedding(talentId: string): Promise<void> {
    try {
      await this.ensureInitialized();

      await this.client.post(`/collections/${this.collectionName}/points/delete`, {
        points: [talentId],
      });
      
      // Invalidate cache
      await CacheManager.delete(`talent:${talentId}`);
      
      logger.info(`Deleted embedding for talent: ${talentId}`);
    } catch (error) {
      logger.error('Failed to delete talent embedding:', error);
      throw new AppError('Failed to delete talent embedding', 500);
    }
  }

  /**
   * Delete multiple talent embeddings (compatible with Pinecone interface)
   */
  async deleteTalentEmbeddings(talentIds: string[]): Promise<void> {
    try {
      await this.ensureInitialized();

      await this.client.post(`/collections/${this.collectionName}/points/delete`, {
        points: talentIds,
      });
      
      // Invalidate cache for all deleted talents
      await Promise.all(talentIds.map(id => CacheManager.delete(`talent:${id}`)));
      
      logger.info(`Deleted ${talentIds.length} talent embeddings`);
    } catch (error) {
      logger.error('Failed to delete talent embeddings:', error);
      throw new AppError('Failed to delete talent embeddings', 500);
    }
  }

  /**
   * Update talent metadata without changing embedding (compatible with Pinecone interface)
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
   * Get collection statistics (compatible with Pinecone interface)
   */
  async getIndexStats(): Promise<{
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
    namespaces: Record<string, { vectorCount: number }>;
  }> {
    try {
      await this.ensureInitialized();

      const response = await this.client.get(`/collections/${this.collectionName}`);
      const info = response.data.result;

      return {
        dimension: info.config.params.vectors.size || this.dimension,
        indexFullness: 0, // Qdrant doesn't have this concept
        totalVectorCount: info.vectors_count || 0,
        namespaces: {}, // Qdrant doesn't use namespaces like Pinecone
      };
    } catch (error) {
      logger.error('Failed to get collection statistics:', error);
      throw new AppError('Failed to retrieve collection statistics', 500);
    }
  }

  /**
   * Clear all vectors in collection (compatible with Pinecone interface)
   */
  async clearNamespace(): Promise<void> {
    try {
      await this.ensureInitialized();

      // Delete all points in collection
      await this.client.post(`/collections/${this.collectionName}/points/delete`, {
        filter: { must: [] }, // Empty filter = match all
      });
      
      // Clear all cache
      await CacheManager.clearPattern('*');
      
      logger.warn(`Cleared all vectors in collection: ${this.collectionName}`);
    } catch (error) {
      logger.error('Failed to clear collection:', error);
      throw new AppError('Failed to clear vector database', 500);
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance (compatible with Pinecone service)
export const qdrantService = new QdrantService();