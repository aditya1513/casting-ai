// Embeddings service for AI/ML operations
// This service handles vector embeddings for talent matching and script analysis

export class EmbeddingsService {
  private embeddings: Map<string, number[]> = new Map();
  
  constructor() {
    console.log('✅ Embeddings service initialized');
  }

  // Generate embeddings for text using a simple hashing approach (mock for now)
  async generateEmbedding(text: string): Promise<number[]> {
    // In production, this would use OpenAI or similar
    // For now, creating a mock 384-dimensional embedding
    const embedding = new Array(384).fill(0).map((_, i) => {
      const hash = this.simpleHash(text + i);
      return Math.sin(hash) * 0.5 + 0.5;
    });
    
    return embedding;
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  // Search for similar items based on embeddings
  async semanticSearch(
    query: string, 
    documents: Array<{id: string, text: string}>,
    topK: number = 5
  ): Promise<Array<{id: string, score: number}>> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: Array<{id: string, score: number}> = [];
    
    for (const doc of documents) {
      const docEmbedding = await this.generateEmbedding(doc.text);
      const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
      results.push({ id: doc.id, score: similarity });
    }
    
    // Sort by similarity score and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Simple hash function for mock embeddings
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Store embedding in memory cache
  async storeEmbedding(id: string, text: string): Promise<void> {
    const embedding = await this.generateEmbedding(text);
    this.embeddings.set(id, embedding);
  }

  // Retrieve embedding from cache
  getEmbedding(id: string): number[] | undefined {
    return this.embeddings.get(id);
  }

  // Batch processing for multiple documents
  async batchGenerateEmbeddings(
    documents: Array<{id: string, text: string}>
  ): Promise<Map<string, number[]>> {
    const results = new Map<string, number[]>();
    
    for (const doc of documents) {
      const embedding = await this.generateEmbedding(doc.text);
      results.set(doc.id, embedding);
      this.embeddings.set(doc.id, embedding);
    }
    
    return results;
  }

  // Clear embeddings cache
  clearCache(): void {
    this.embeddings.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.embeddings.size;
  }
}

// Export singleton instance
export const embeddingsService = new EmbeddingsService();