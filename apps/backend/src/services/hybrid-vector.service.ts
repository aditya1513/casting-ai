/**
 * Hybrid Vector Service
 * Implements dual-write strategy for safe migration from Pinecone to Qdrant
 * Writes to both services and provides fallback capabilities
 */

import { vectorService as pineconeService } from './vector.service';
import { qdrantService } from './qdrant.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { config } from '../config/config';
import { TalentVectorMetadata, VectorSearchOptions, BatchOptions } from './vector.service';

export enum VectorProvider {
  PINECONE = 'pinecone',
  QDRANT = 'qdrant',
  HYBRID = 'hybrid'
}

interface HybridConfig {
  primaryProvider: VectorProvider;
  fallbackProvider: VectorProvider;
  enableDualWrite: boolean;
  enableResultComparison: boolean;
  comparisonSampleRate: number; // 0.0 to 1.0
}

interface SearchComparison {
  pineconeResults: any[];
  qdrantResults: any[];
  similarity: number;
  latency: {
    pinecone: number;
    qdrant: number;
  };
  timestamp: Date;
}

class HybridVectorService {
  private hybridConfig: HybridConfig;
  private comparisonResults: SearchComparison[] = [];
  private initialized = false;

  constructor() {
    const primaryProvider = this.getPrimaryProvider();
    this.hybridConfig = {
      primaryProvider,
      fallbackProvider: this.getFallbackProvider(primaryProvider),
      enableDualWrite: config.env === 'development' || process.env.ENABLE_DUAL_WRITE === 'true',
      enableResultComparison: process.env.ENABLE_RESULT_COMPARISON === 'true',
      comparisonSampleRate: parseFloat(process.env.COMPARISON_SAMPLE_RATE || '0.1'),
    };
  }

  private getPrimaryProvider(): VectorProvider {
    const provider = process.env.PRIMARY_VECTOR_PROVIDER || 'pinecone';
    return provider as VectorProvider;
  }

  private getFallbackProvider(primaryProvider?: VectorProvider): VectorProvider {
    const primary = primaryProvider || this.hybridConfig?.primaryProvider || VectorProvider.PINECONE;
    return primary === VectorProvider.PINECONE 
      ? VectorProvider.QDRANT 
      : VectorProvider.PINECONE;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('🔄 Initializing Hybrid Vector Service');
    logger.info(`Primary: ${this.hybridConfig.primaryProvider}`);
    logger.info(`Fallback: ${this.hybridConfig.fallbackProvider}`);
    logger.info(`Dual Write: ${this.hybridConfig.enableDualWrite}`);

    const initPromises = [];

    // Initialize Pinecone if available
    if (config.pinecone?.apiKey) {
      initPromises.push(
        pineconeService.initialize().catch(error => {
          logger.warn('Pinecone initialization failed:', error.message);
          return null;
        })
      );
    }

    // Initialize Qdrant
    initPromises.push(
      qdrantService.initialize().catch(error => {
        logger.warn('Qdrant initialization failed:', error.message);
        return null;
      })
    );

    await Promise.all(initPromises);
    this.initialized = true;
    logger.info('✅ Hybrid Vector Service initialized');
  }

  /**
   * Upsert talent embedding with dual-write capability
   */
  async upsertTalentEmbedding(
    talentId: string,
    embedding: number[],
    metadata: TalentVectorMetadata
  ): Promise<void> {
    await this.ensureInitialized();

    const operations = [];

    // Primary write
    operations.push(
      this.executeWithProvider(
        this.hybridConfig.primaryProvider,
        async (service) => service.upsertTalentEmbedding(talentId, embedding, metadata)
      ).catch(error => {
        logger.error(`Primary upsert failed (${this.hybridConfig.primaryProvider}):`, error);
        throw error;
      })
    );

    // Dual write to secondary if enabled
    if (this.hybridConfig.enableDualWrite) {
      operations.push(
        this.executeWithProvider(
          this.hybridConfig.fallbackProvider,
          async (service) => service.upsertTalentEmbedding(talentId, embedding, metadata)
        ).catch(error => {
          logger.warn(`Secondary upsert failed (${this.hybridConfig.fallbackProvider}):`, error.message);
          // Don't throw - secondary write failure shouldn't break primary operation
        })
      );
    }

    await Promise.all(operations);
    logger.debug(`✅ Upserted talent embedding: ${talentId}`);
  }

  /**
   * Batch upsert with dual-write capability
   */
  async batchUpsertEmbeddings(
    records: Array<{
      talentId: string;
      embedding: number[];
      metadata: TalentVectorMetadata;
    }>,
    options: BatchOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const operations = [];

    // Primary batch write
    operations.push(
      this.executeWithProvider(
        this.hybridConfig.primaryProvider,
        async (service) => service.batchUpsertEmbeddings(records, options)
      )
    );

    // Dual write if enabled
    if (this.hybridConfig.enableDualWrite) {
      operations.push(
        this.executeWithProvider(
          this.hybridConfig.fallbackProvider,
          async (service) => service.batchUpsertEmbeddings(records, options)
        ).catch(error => {
          logger.warn(`Secondary batch upsert failed:`, error.message);
        })
      );
    }

    await Promise.all(operations);
    logger.info(`✅ Batch upserted ${records.length} embeddings`);
  }

  /**
   * Search with fallback and optional comparison
   */
  async searchSimilarTalents(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<Array<{ id: string; score: number; metadata?: TalentVectorMetadata }>> {
    await this.ensureInitialized();

    // Check if we should perform comparison
    const shouldCompare = this.hybridConfig.enableResultComparison && 
      Math.random() < this.hybridConfig.comparisonSampleRate;

    if (shouldCompare) {
      return this.searchWithComparison(queryEmbedding, options);
    }

    // Regular search with fallback
    try {
      return await this.executeWithProvider(
        this.hybridConfig.primaryProvider,
        async (service) => service.searchSimilarTalents(queryEmbedding, options)
      );
    } catch (error) {
      logger.warn(`Primary search failed (${this.hybridConfig.primaryProvider}), trying fallback:`, error.message);
      
      return await this.executeWithProvider(
        this.hybridConfig.fallbackProvider,
        async (service) => service.searchSimilarTalents(queryEmbedding, options)
      );
    }
  }

  /**
   * Search with result comparison for validation
   */
  private async searchWithComparison(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<Array<{ id: string; score: number; metadata?: TalentVectorMetadata }>> {
    const startTime = Date.now();
    
    const [pineconeResult, qdrantResult] = await Promise.allSettled([
      this.executeWithProvider(VectorProvider.PINECONE, 
        service => service.searchSimilarTalents(queryEmbedding, options)
      ),
      this.executeWithProvider(VectorProvider.QDRANT, 
        service => service.searchSimilarTalents(queryEmbedding, options)
      )
    ]);

    const endTime = Date.now();

    // Process results
    const pineconeResults = pineconeResult.status === 'fulfilled' ? pineconeResult.value : [];
    const qdrantResults = qdrantResult.status === 'fulfilled' ? qdrantResult.value : [];

    // Calculate similarity between result sets
    const similarity = this.calculateResultSimilarity(pineconeResults, qdrantResults);

    // Store comparison for analysis
    const comparison: SearchComparison = {
      pineconeResults,
      qdrantResults,
      similarity,
      latency: {
        pinecone: pineconeResult.status === 'fulfilled' ? endTime - startTime : -1,
        qdrant: qdrantResult.status === 'fulfilled' ? endTime - startTime : -1,
      },
      timestamp: new Date(),
    };

    this.comparisonResults.push(comparison);
    this.pruneComparisonResults();

    // Log significant differences
    if (similarity < 0.8) {
      logger.warn(`Low similarity between vector providers: ${similarity.toFixed(2)}`);
    }

    // Return primary result or fallback
    if (this.hybridConfig.primaryProvider === VectorProvider.PINECONE) {
      return pineconeResults.length > 0 ? pineconeResults : qdrantResults;
    } else {
      return qdrantResults.length > 0 ? qdrantResults : pineconeResults;
    }
  }

  /**
   * Calculate similarity between two result sets
   */
  private calculateResultSimilarity(results1: any[], results2: any[]): number {
    if (results1.length === 0 && results2.length === 0) return 1.0;
    if (results1.length === 0 || results2.length === 0) return 0.0;

    const ids1 = new Set(results1.map(r => r.id));
    const ids2 = new Set(results2.map(r => r.id));
    
    const intersection = new Set([...ids1].filter(id => ids2.has(id)));
    const union = new Set([...ids1, ...ids2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Find matching talents with hybrid approach
   */
  async findMatchingTalents(
    queryEmbedding: number[],
    filters: any,
    options: VectorSearchOptions = {}
  ): Promise<Array<{ id: string; score: number; metadata?: TalentVectorMetadata }>> {
    await this.ensureInitialized();

    try {
      return await this.executeWithProvider(
        this.hybridConfig.primaryProvider,
        async (service) => service.findMatchingTalents(queryEmbedding, filters, options)
      );
    } catch (error) {
      logger.warn(`Primary findMatchingTalents failed, trying fallback:`, error.message);
      
      return await this.executeWithProvider(
        this.hybridConfig.fallbackProvider,
        async (service) => service.findMatchingTalents(queryEmbedding, filters, options)
      );
    }
  }

  /**
   * Delete talent embedding from both services
   */
  async deleteTalentEmbedding(talentId: string): Promise<void> {
    await this.ensureInitialized();

    const operations = [];

    // Delete from primary
    operations.push(
      this.executeWithProvider(
        this.hybridConfig.primaryProvider,
        async (service) => service.deleteTalentEmbedding(talentId)
      )
    );

    // Delete from secondary if dual write is enabled
    if (this.hybridConfig.enableDualWrite) {
      operations.push(
        this.executeWithProvider(
          this.hybridConfig.fallbackProvider,
          async (service) => service.deleteTalentEmbedding(talentId)
        ).catch(error => {
          logger.warn(`Secondary delete failed:`, error.message);
        })
      );
    }

    await Promise.all(operations);
  }

  /**
   * Execute operation with specific provider
   */
  private async executeWithProvider<T>(
    provider: VectorProvider,
    operation: (service: any) => Promise<T>
  ): Promise<T> {
    switch (provider) {
      case VectorProvider.PINECONE:
        return operation(pineconeService);
      case VectorProvider.QDRANT:
        return operation(qdrantService);
      default:
        throw new AppError(`Unknown vector provider: ${provider}`, 500);
    }
  }

  /**
   * Get comparison analytics
   */
  getComparisonAnalytics(): {
    totalComparisons: number;
    averageSimilarity: number;
    averageLatency: { pinecone: number; qdrant: number };
    lowSimilarityCount: number;
  } {
    if (this.comparisonResults.length === 0) {
      return {
        totalComparisons: 0,
        averageSimilarity: 0,
        averageLatency: { pinecone: 0, qdrant: 0 },
        lowSimilarityCount: 0,
      };
    }

    const validComparisons = this.comparisonResults.filter(c => 
      c.latency.pinecone > 0 && c.latency.qdrant > 0
    );

    const avgSimilarity = this.comparisonResults.reduce((sum, c) => sum + c.similarity, 0) / this.comparisonResults.length;
    const avgPineconeLatency = validComparisons.reduce((sum, c) => sum + c.latency.pinecone, 0) / validComparisons.length;
    const avgQdrantLatency = validComparisons.reduce((sum, c) => sum + c.latency.qdrant, 0) / validComparisons.length;
    const lowSimilarityCount = this.comparisonResults.filter(c => c.similarity < 0.8).length;

    return {
      totalComparisons: this.comparisonResults.length,
      averageSimilarity: avgSimilarity,
      averageLatency: {
        pinecone: avgPineconeLatency,
        qdrant: avgQdrantLatency,
      },
      lowSimilarityCount,
    };
  }

  /**
   * Switch primary provider
   */
  switchPrimaryProvider(newPrimary: VectorProvider): void {
    logger.info(`Switching primary provider from ${this.hybridConfig.primaryProvider} to ${newPrimary}`);
    this.hybridConfig.primaryProvider = newPrimary;
    this.hybridConfig.fallbackProvider = newPrimary === VectorProvider.PINECONE 
      ? VectorProvider.QDRANT 
      : VectorProvider.PINECONE;
  }

  /**
   * Enable/disable dual write
   */
  setDualWrite(enabled: boolean): void {
    logger.info(`${enabled ? 'Enabling' : 'Disabling'} dual write`);
    this.hybridConfig.enableDualWrite = enabled;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private pruneComparisonResults(): void {
    // Keep only last 1000 comparisons
    if (this.comparisonResults.length > 1000) {
      this.comparisonResults = this.comparisonResults.slice(-1000);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): HybridConfig {
    return { ...this.hybridConfig };
  }
}

// Export singleton instance
export const hybridVectorService = new HybridVectorService();