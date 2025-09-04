// Vector Store implementation for talent matching and semantic search
import { EmbeddingsService } from './embeddings';

interface VectorDocument {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

export class VectorStore {
  private vectors: Map<string, VectorDocument> = new Map();
  private embeddingsService: EmbeddingsService;
  private dimensions: number = 384;

  constructor(embeddingsService: EmbeddingsService) {
    this.embeddingsService = embeddingsService;
    console.log('✅ Vector store initialized with dimensions:', this.dimensions);
  }

  // Upsert vectors into the store
  async upsert(documents: Array<{
    id: string;
    text: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    for (const doc of documents) {
      const vector = await this.embeddingsService.generateEmbedding(doc.text);
      this.vectors.set(doc.id, {
        id: doc.id,
        vector,
        metadata: doc.metadata || {}
      });
    }
    console.log(`✅ Upserted ${documents.length} documents to vector store`);
  }

  // Query similar vectors
  async query(
    queryText: string,
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<Array<{
    id: string;
    score: number;
    metadata: Record<string, any>;
  }>> {
    const queryVector = await this.embeddingsService.generateEmbedding(queryText);
    const results: Array<{id: string; score: number; metadata: Record<string, any>}> = [];

    // Search through all vectors
    for (const [id, doc] of this.vectors.entries()) {
      // Apply metadata filter if provided
      if (filter && !this.matchesFilter(doc.metadata, filter)) {
        continue;
      }

      const score = this.cosineSimilarity(queryVector, doc.vector);
      results.push({
        id,
        score,
        metadata: doc.metadata
      });
    }

    // Sort by score and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Delete vectors by ID
  delete(ids: string[]): void {
    for (const id of ids) {
      this.vectors.delete(id);
    }
    console.log(`✅ Deleted ${ids.length} vectors from store`);
  }

  // Fetch vectors by ID
  fetch(ids: string[]): Array<VectorDocument | null> {
    return ids.map(id => this.vectors.get(id) || null);
  }

  // Get statistics about the vector store
  stats(): {
    totalVectors: number;
    dimensions: number;
    indexSize: number;
  } {
    return {
      totalVectors: this.vectors.size,
      dimensions: this.dimensions,
      indexSize: this.vectors.size * this.dimensions * 4 // Approximate bytes
    };
  }

  // Clear all vectors
  clear(): void {
    this.vectors.clear();
    console.log('✅ Vector store cleared');
  }

  // Helper: Calculate cosine similarity
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Helper: Check if metadata matches filter
  private matchesFilter(metadata: Record<string, any>, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // Batch similarity search for multiple queries
  async batchQuery(
    queries: string[],
    topK: number = 5
  ): Promise<Map<string, Array<{id: string; score: number; metadata: Record<string, any>}>>> {
    const results = new Map();
    
    for (const query of queries) {
      const queryResults = await this.query(query, topK);
      results.set(query, queryResults);
    }
    
    return results;
  }

  // Find similar talents based on profile
  async findSimilarTalents(
    talentProfile: string,
    filters?: {
      location?: string;
      skills?: string[];
      availability?: boolean;
    },
    limit: number = 10
  ): Promise<Array<{id: string; score: number; metadata: Record<string, any>}>> {
    const metadataFilter: Record<string, any> = {};
    
    if (filters?.location) {
      metadataFilter.location = filters.location;
    }
    if (filters?.availability !== undefined) {
      metadataFilter.available = filters.availability;
    }
    
    return this.query(talentProfile, limit, metadataFilter);
  }

  // Match talents to role requirements
  async matchTalentsToRole(
    roleDescription: string,
    characterTraits: string[],
    limit: number = 20
  ): Promise<Array<{
    talentId: string;
    matchScore: number;
    metadata: Record<string, any>;
  }>> {
    // Combine role description with character traits
    const searchQuery = `${roleDescription} ${characterTraits.join(' ')}`;
    
    const results = await this.query(searchQuery, limit);
    
    return results.map(r => ({
      talentId: r.id,
      matchScore: r.score,
      metadata: r.metadata
    }));
  }
}

// Export singleton instance
import { embeddingsService } from './embeddings';
export const vectorStore = new VectorStore(embeddingsService);