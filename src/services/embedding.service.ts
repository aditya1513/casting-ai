/**
 * Embedding Service
 * Generates and manages embeddings for talent profiles using OpenAI
 */

import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheManager } from '../config/redis';
import { prisma } from '../config/database';
import { Talent } from '@prisma/client';
import crypto from 'crypto';

/**
 * Embedding model configuration
 */
export enum EmbeddingModel {
  OPENAI_ADA_002 = 'text-embedding-ada-002',
  OPENAI_3_SMALL = 'text-embedding-3-small',
  OPENAI_3_LARGE = 'text-embedding-3-large',
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  model?: EmbeddingModel;
  dimensions?: number; // For text-embedding-3-* models
  useCache?: boolean;
  cacheTTL?: number; // Cache TTL in seconds
}

/**
 * Talent profile data for embedding
 */
export interface TalentProfileData {
  id: string;
  displayName: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  experience?: any;
  achievements?: string[];
  specializations?: string[];
  location?: string;
  education?: string[];
  certifications?: string[];
  workPreferences?: string[];
  yearsOfExperience?: number;
  rating?: number;
}

class EmbeddingService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private defaultModel: EmbeddingModel = EmbeddingModel.OPENAI_ADA_002;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // ms
  
  constructor() {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY,
    });

    // Initialize Anthropic client as fallback
    this.anthropic = new Anthropic({
      apiKey: config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const { 
      model = this.defaultModel, 
      dimensions,
      useCache = true,
      cacheTTL = 3600 
    } = options;

    // Check cache if enabled
    if (useCache) {
      const cacheKey = this.getCacheKey(text, model, dimensions);
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        logger.info('Returning cached embedding');
        return JSON.parse(cached);
      }
    }

    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const params: any = {
          model,
          input: text,
        };

        // Add dimensions for text-embedding-3-* models
        if (dimensions && (model === EmbeddingModel.OPENAI_3_SMALL || model === EmbeddingModel.OPENAI_3_LARGE)) {
          params.dimensions = dimensions;
        }

        const response = await this.openai.embeddings.create(params);
        const embedding = response.data[0].embedding;

        // Cache the embedding if enabled
        if (useCache) {
          const cacheKey = this.getCacheKey(text, model, dimensions);
          await CacheManager.set(cacheKey, JSON.stringify(embedding), cacheTTL);
        }

        return embedding;
      } catch (error) {
        lastError = error;
        logger.warn(`Embedding generation attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    logger.error('Failed to generate embedding after retries:', lastError);
    throw new AppError('Failed to generate embedding', 500);
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    const { 
      model = this.defaultModel,
      dimensions,
      useCache = true,
      cacheTTL = 3600
    } = options;

    const embeddings: number[][] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Check cache for each text
    if (useCache) {
      for (let i = 0; i < texts.length; i++) {
        const cacheKey = this.getCacheKey(texts[i], model, dimensions);
        const cached = await CacheManager.get(cacheKey);
        
        if (cached) {
          embeddings[i] = JSON.parse(cached);
        } else {
          uncachedTexts.push(texts[i]);
          uncachedIndices.push(i);
        }
      }
    } else {
      uncachedTexts.push(...texts);
      uncachedIndices.push(...texts.map((_, i) => i));
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const batchSize = 100; // OpenAI batch limit
      
      for (let i = 0; i < uncachedTexts.length; i += batchSize) {
        const batch = uncachedTexts.slice(i, i + batchSize);
        
        try {
          const params: any = {
            model,
            input: batch,
          };

          if (dimensions && (model === EmbeddingModel.OPENAI_3_SMALL || model === EmbeddingModel.OPENAI_3_LARGE)) {
            params.dimensions = dimensions;
          }

          const response = await this.openai.embeddings.create(params);
          
          for (let j = 0; j < response.data.length; j++) {
            const embedding = response.data[j].embedding;
            const originalIndex = uncachedIndices[i + j];
            embeddings[originalIndex] = embedding;
            
            // Cache the embedding
            if (useCache) {
              const cacheKey = this.getCacheKey(uncachedTexts[j], model, dimensions);
              await CacheManager.set(cacheKey, JSON.stringify(embedding), cacheTTL);
            }
          }
        } catch (error) {
          logger.error('Batch embedding generation failed:', error);
          throw new AppError('Failed to generate batch embeddings', 500);
        }
      }
    }

    return embeddings;
  }

  /**
   * Build comprehensive text representation of talent profile
   */
  buildTalentProfileText(talent: TalentProfileData): string {
    const sections: string[] = [];

    // Name and basic info
    sections.push(`Name: ${talent.displayName}`);
    
    // Bio
    if (talent.bio) {
      sections.push(`Bio: ${talent.bio}`);
    }

    // Skills
    if (talent.skills && talent.skills.length > 0) {
      sections.push(`Skills: ${talent.skills.join(', ')}`);
    }

    // Languages
    if (talent.languages && talent.languages.length > 0) {
      sections.push(`Languages: ${talent.languages.join(', ')}`);
    }

    // Experience
    if (talent.yearsOfExperience) {
      sections.push(`Experience: ${talent.yearsOfExperience} years`);
    }

    // Experience details
    if (talent.experience) {
      const expText = this.formatExperience(talent.experience);
      if (expText) {
        sections.push(`Work Experience: ${expText}`);
      }
    }

    // Achievements
    if (talent.achievements && talent.achievements.length > 0) {
      sections.push(`Achievements: ${talent.achievements.join(', ')}`);
    }

    // Specializations
    if (talent.specializations && talent.specializations.length > 0) {
      sections.push(`Specializations: ${talent.specializations.join(', ')}`);
    }

    // Location
    if (talent.location) {
      sections.push(`Location: ${talent.location}`);
    }

    // Education
    if (talent.education && talent.education.length > 0) {
      sections.push(`Education: ${talent.education.join(', ')}`);
    }

    // Certifications
    if (talent.certifications && talent.certifications.length > 0) {
      sections.push(`Certifications: ${talent.certifications.join(', ')}`);
    }

    // Work preferences
    if (talent.workPreferences && talent.workPreferences.length > 0) {
      sections.push(`Work Preferences: ${talent.workPreferences.join(', ')}`);
    }

    // Rating
    if (talent.rating) {
      sections.push(`Rating: ${talent.rating}/5`);
    }

    return sections.join(' | ');
  }

  /**
   * Format experience data into text
   */
  private formatExperience(experience: any): string {
    if (!experience) return '';

    if (Array.isArray(experience)) {
      return experience
        .map(exp => {
          const parts = [];
          if (exp.title) parts.push(exp.title);
          if (exp.company) parts.push(`at ${exp.company}`);
          if (exp.duration) parts.push(`(${exp.duration})`);
          if (exp.description) parts.push(`: ${exp.description}`);
          return parts.join(' ');
        })
        .join('; ');
    }

    if (typeof experience === 'object') {
      return JSON.stringify(experience);
    }

    return String(experience);
  }

  /**
   * Generate embedding for a talent profile
   */
  async generateTalentEmbedding(
    talent: TalentProfileData,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const profileText = this.buildTalentProfileText(talent);
    return this.generateEmbedding(profileText, options);
  }

  /**
   * Generate embeddings for multiple talent profiles
   */
  async generateTalentEmbeddings(
    talents: TalentProfileData[],
    options: EmbeddingOptions = {}
  ): Promise<Map<string, number[]>> {
    const texts = talents.map(talent => this.buildTalentProfileText(talent));
    const embeddings = await this.generateBatchEmbeddings(texts, options);
    
    const result = new Map<string, number[]>();
    for (let i = 0; i < talents.length; i++) {
      result.set(talents[i].id, embeddings[i]);
    }
    
    return result;
  }

  /**
   * Generate embedding for role/job description
   */
  async generateRoleEmbedding(
    roleDescription: string,
    requirements?: string[],
    preferences?: string[],
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const sections: string[] = [roleDescription];
    
    if (requirements && requirements.length > 0) {
      sections.push(`Requirements: ${requirements.join(', ')}`);
    }
    
    if (preferences && preferences.length > 0) {
      sections.push(`Preferences: ${preferences.join(', ')}`);
    }
    
    const fullText = sections.join(' | ');
    return this.generateEmbedding(fullText, options);
  }

  /**
   * Generate embedding for search query with query expansion
   */
  async generateSearchEmbedding(
    query: string,
    context?: {
      skills?: string[];
      location?: string;
      experienceLevel?: string;
    },
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    let expandedQuery = query;
    
    // Add context to improve search relevance
    if (context) {
      const contextParts: string[] = [];
      
      if (context.skills && context.skills.length > 0) {
        contextParts.push(`Skills: ${context.skills.join(', ')}`);
      }
      
      if (context.location) {
        contextParts.push(`Location: ${context.location}`);
      }
      
      if (context.experienceLevel) {
        contextParts.push(`Experience Level: ${context.experienceLevel}`);
      }
      
      if (contextParts.length > 0) {
        expandedQuery = `${query} | ${contextParts.join(' | ')}`;
      }
    }
    
    return this.generateEmbedding(expandedQuery, options);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Generate cache key for embedding
   */
  private getCacheKey(text: string, model: string, dimensions?: number): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const key = `embedding:${model}:${dimensions || 'default'}:${hash}`;
    return key;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate embedding dimension
   */
  validateEmbeddingDimension(embedding: number[], expectedDimension: number = 1536): boolean {
    return embedding.length === expectedDimension;
  }

  /**
   * Normalize embedding vector
   */
  normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return embedding;
    }
    
    return embedding.map(val => val / magnitude);
  }

  /**
   * Get embedding model info
   */
  getModelInfo(model: EmbeddingModel): {
    name: string;
    dimension: number;
    maxTokens: number;
    costPer1kTokens: number;
  } {
    const modelInfo = {
      [EmbeddingModel.OPENAI_ADA_002]: {
        name: 'text-embedding-ada-002',
        dimension: 1536,
        maxTokens: 8191,
        costPer1kTokens: 0.0001,
      },
      [EmbeddingModel.OPENAI_3_SMALL]: {
        name: 'text-embedding-3-small',
        dimension: 1536, // Default, can be configured
        maxTokens: 8191,
        costPer1kTokens: 0.00002,
      },
      [EmbeddingModel.OPENAI_3_LARGE]: {
        name: 'text-embedding-3-large',
        dimension: 3072, // Default, can be configured
        maxTokens: 8191,
        costPer1kTokens: 0.00013,
      },
    };

    return modelInfo[model];
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();