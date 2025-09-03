import { Pinecone } from '@pinecone-database/pinecone';
import { RecordMetadata, QueryResponse } from '@pinecone-database/pinecone';
import { logger } from '../../utils/logger';
import { createHash } from 'crypto';
import { EmbeddingService } from './embedding.service';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: RecordMetadata;
}

export interface VectorQuery {
  vector?: number[];
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: RecordMetadata;
  values?: number[];
}

export interface VectorUpsertResult {
  upsertedCount: number;
  processedRecords: string[];
}

export class VectorDatabaseService {
  private pinecone!: Pinecone; // Using definite assignment assertion
  private embeddingService: EmbeddingService;
  private indexName: string;
  private isInitialized: boolean = false;
  
  // Index configurations
  private readonly USER_PROFILE_INDEX = 'castmatch-user-profiles';
  private readonly CONTENT_INDEX = 'castmatch-content';
  private readonly SKILLS_INDEX = 'castmatch-skills';
  private readonly BEHAVIOR_INDEX = 'castmatch-behavior';
  
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.indexName = this.USER_PROFILE_INDEX; // Default index
    this.initializePinecone();
  }

  private async initializePinecone(): Promise<void> {
    try {
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY environment variable is required');
      }

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      await this.ensureIndexesExist();
      this.isInitialized = true;
      logger.info('Pinecone vector database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Pinecone:', error);
      throw error;
    }
  }

  private async ensureIndexesExist(): Promise<void> {
    const indexes = [
      { name: this.USER_PROFILE_INDEX, dimension: 1024 }, // Anthropic Claude dimensions
      { name: this.CONTENT_INDEX, dimension: 1024 },
      { name: this.SKILLS_INDEX, dimension: 1024 },
      { name: this.BEHAVIOR_INDEX, dimension: 1024 }
    ];

    try {
      const existingIndexes = await this.pinecone.listIndexes();
      const existingNames = existingIndexes.indexes?.map(idx => idx.name) || [];

      for (const index of indexes) {
        if (!existingNames.includes(index.name)) {
          logger.info(`Creating Pinecone index: ${index.name}`);
          await this.pinecone.createIndex({
            name: index.name,
            dimension: index.dimension,
            metric: 'cosine',
            spec: {
              serverless: {
                cloud: 'aws',
                region: 'us-east-1'
              }
            }
          });
          
          // Wait for index to be ready
          await this.waitForIndexReady(index.name);
        }
      }
    } catch (error) {
      logger.error('Error ensuring indexes exist:', error);
      throw error;
    }
  }

  private async waitForIndexReady(indexName: string, maxWaitTime = 120000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexStats = await this.pinecone.index(indexName).describeIndexStats();
        if (indexStats) {
          logger.info(`Index ${indexName} is ready`);
          return;
        }
      } catch (error) {
        // Index might not be ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
    
    throw new Error(`Index ${indexName} was not ready within ${maxWaitTime}ms`);
  }

  // Set active index
  public setIndex(indexType: 'user-profiles' | 'content' | 'skills' | 'behavior'): void {
    const indexMap = {
      'user-profiles': this.USER_PROFILE_INDEX,
      'content': this.CONTENT_INDEX,
      'skills': this.SKILLS_INDEX,
      'behavior': this.BEHAVIOR_INDEX
    };
    
    this.indexName = indexMap[indexType];
  }

  // Generate embedding and upsert user profile
  public async upsertUserProfile(
    userId: string,
    profileData: {
      name: string;
      skills: string[];
      experience: string;
      bio: string;
      location: string;
      languages: string[];
      categories: string[];
    }
  ): Promise<VectorUpsertResult> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      // Create text representation of profile for embedding
      const profileText = this.createProfileText(profileData);
      
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(profileText);
      
      // Create vector record
      const record: VectorRecord = {
        id: userId,
        values: embedding,
        metadata: {
          userId,
          name: profileData.name,
          skills: profileData.skills,
          experience: profileData.experience,
          location: profileData.location,
          languages: profileData.languages,
          categories: profileData.categories,
          profileText: profileText.substring(0, 1000), // Store truncated version
          lastUpdated: new Date().toISOString()
        }
      };

      this.setIndex('user-profiles');
      const index = this.pinecone.index(this.indexName);
      
      await index.upsert([record]);
      
      logger.info(`User profile vector upserted for user: ${userId}`);
      return {
        upsertedCount: 1,
        processedRecords: [userId]
      };
    } catch (error) {
      logger.error(`Error upserting user profile vector for user ${userId}:`, error);
      throw error;
    }
  }

  // Search for similar user profiles
  public async searchSimilarProfiles(
    query: string | number[],
    options: {
      topK?: number;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
    } = {}
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      let queryVector: number[];
      
      if (typeof query === 'string') {
        queryVector = await this.embeddingService.generateEmbedding(query);
      } else {
        queryVector = query;
      }

      this.setIndex('user-profiles');
      const index = this.pinecone.index(this.indexName);
      
      const queryRequest = {
        vector: queryVector,
        topK: options.topK || 10,
        includeMetadata: options.includeMetadata !== false,
        includeValues: false,
        ...(options.filter && { filter: options.filter })
      };

      const results = await index.query(queryRequest);
      
      return this.formatSearchResults(results);
    } catch (error) {
      logger.error('Error searching similar profiles:', error);
      throw error;
    }
  }

  // Upsert content embeddings (scripts, roles, etc.)
  public async upsertContent(
    contentId: string,
    contentData: {
      title: string;
      description: string;
      content: string;
      category: string;
      tags: string[];
      requiredSkills: string[];
      type: 'role' | 'script' | 'project';
    }
  ): Promise<VectorUpsertResult> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      const contentText = this.createContentText(contentData);
      const embedding = await this.embeddingService.generateEmbedding(contentText);
      
      const record: VectorRecord = {
        id: contentId,
        values: embedding,
        metadata: {
          contentId,
          title: contentData.title,
          description: contentData.description,
          category: contentData.category,
          tags: contentData.tags,
          requiredSkills: contentData.requiredSkills,
          type: contentData.type,
          contentText: contentText.substring(0, 1000),
          lastUpdated: new Date().toISOString()
        }
      };

      this.setIndex('content');
      const index = this.pinecone.index(this.indexName);
      
      await index.upsert([record]);
      
      logger.info(`Content vector upserted: ${contentId}`);
      return {
        upsertedCount: 1,
        processedRecords: [contentId]
      };
    } catch (error) {
      logger.error(`Error upserting content vector ${contentId}:`, error);
      throw error;
    }
  }

  // Search content based on user profile or query
  public async searchContent(
    query: string | number[],
    options: {
      topK?: number;
      filter?: Record<string, any>;
      contentType?: 'role' | 'script' | 'project';
    } = {}
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      let queryVector: number[];
      
      if (typeof query === 'string') {
        queryVector = await this.embeddingService.generateEmbedding(query);
      } else {
        queryVector = query;
      }

      this.setIndex('content');
      const index = this.pinecone.index(this.indexName);
      
      const filter = { ...options.filter };
      if (options.contentType) {
        filter.type = options.contentType;
      }

      const queryRequest = {
        vector: queryVector,
        topK: options.topK || 10,
        includeMetadata: true,
        includeValues: false,
        ...(Object.keys(filter).length > 0 && { filter })
      };

      const results = await index.query(queryRequest);
      
      return this.formatSearchResults(results);
    } catch (error) {
      logger.error('Error searching content:', error);
      throw error;
    }
  }

  // Batch upsert for multiple records
  public async batchUpsert(
    records: VectorRecord[],
    indexType: 'user-profiles' | 'content' | 'skills' | 'behavior' = 'user-profiles'
  ): Promise<VectorUpsertResult> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      this.setIndex(indexType);
      const index = this.pinecone.index(this.indexName);
      
      // Process in batches of 100 (Pinecone limit)
      const batchSize = 100;
      let totalUpserted = 0;
      const processedIds: string[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await index.upsert(batch);
        
        totalUpserted += batch.length;
        processedIds.push(...batch.map(r => r.id));
      }

      logger.info(`Batch upserted ${totalUpserted} records to ${indexType} index`);
      return {
        upsertedCount: totalUpserted,
        processedRecords: processedIds
      };
    } catch (error) {
      logger.error('Error in batch upsert:', error);
      throw error;
    }
  }

  // Delete vector by ID
  public async deleteVector(
    id: string,
    indexType: 'user-profiles' | 'content' | 'skills' | 'behavior' = 'user-profiles'
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      this.setIndex(indexType);
      const index = this.pinecone.index(this.indexName);
      
      await index.deleteOne(id);
      logger.info(`Deleted vector ${id} from ${indexType} index`);
    } catch (error) {
      logger.error(`Error deleting vector ${id}:`, error);
      throw error;
    }
  }

  // Get index statistics
  public async getIndexStats(
    indexType: 'user-profiles' | 'content' | 'skills' | 'behavior' = 'user-profiles'
  ): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initializePinecone();
      }

      this.setIndex(indexType);
      const index = this.pinecone.index(this.indexName);
      
      return await index.describeIndexStats();
    } catch (error) {
      logger.error(`Error getting stats for ${indexType} index:`, error);
      throw error;
    }
  }

  // Helper methods
  private createProfileText(profileData: any): string {
    return [
      `Name: ${profileData.name}`,
      `Skills: ${profileData.skills.join(', ')}`,
      `Experience: ${profileData.experience}`,
      `Bio: ${profileData.bio}`,
      `Location: ${profileData.location}`,
      `Languages: ${profileData.languages.join(', ')}`,
      `Categories: ${profileData.categories.join(', ')}`
    ].join('. ');
  }

  private createContentText(contentData: any): string {
    return [
      `Title: ${contentData.title}`,
      `Description: ${contentData.description}`,
      `Content: ${contentData.content}`,
      `Category: ${contentData.category}`,
      `Tags: ${contentData.tags.join(', ')}`,
      `Required Skills: ${contentData.requiredSkills.join(', ')}`,
      `Type: ${contentData.type}`
    ].join('. ');
  }

  private formatSearchResults(results: QueryResponse): VectorSearchResult[] {
    if (!results.matches) return [];

    return results.matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata,
      values: match.values
    }));
  }

  // Generate cache key for queries
  private generateCacheKey(query: string | number[], options: any): string {
    const content = typeof query === 'string' ? query : JSON.stringify(query);
    const optionsStr = JSON.stringify(options);
    return createHash('sha256').update(content + optionsStr).digest('hex');
  }

  // Health check
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.isInitialized) {
        return { status: 'unhealthy', details: { error: 'Not initialized' } };
      }

      const stats = await this.getIndexStats('user-profiles');
      
      return {
        status: 'healthy',
        details: {
          initialized: this.isInitialized,
          userProfilesStats: stats,
          activeIndex: this.indexName
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Singleton instance
export const vectorDatabaseService = new VectorDatabaseService();