/**
 * Hybrid Search Service
 * Combines semantic search (vector embeddings) with keyword search for optimal results
 * Implements intelligent query routing and result fusion strategies
 */

import { prisma } from '../config/database';
import { vectorService } from './vector.service';
import { embeddingService } from './embedding.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheManager } from '../config/redis';
import { performance } from 'perf_hooks';
import natural from 'natural';
import { Prisma } from '@prisma/client';

/**
 * Search mode configuration
 */
export enum SearchMode {
  SEMANTIC = 'semantic',
  KEYWORD = 'keyword',
  HYBRID = 'hybrid',
  SMART = 'smart', // Automatically determines best mode
}

/**
 * Search filter options
 */
export interface SearchFilters {
  gender?: string;
  location?: string | string[];
  languages?: string[];
  skills?: string[];
  experienceLevel?: string;
  minRating?: number;
  maxRating?: number;
  ageMin?: number;
  ageMax?: number;
  availability?: string;
  verified?: boolean;
  priceRange?: { min: number; max: number };
  categories?: string[];
  tags?: string[];
}

/**
 * Search options
 */
export interface SearchOptions {
  mode?: SearchMode;
  limit?: number;
  offset?: number;
  boostFactors?: {
    exact?: number;
    partial?: number;
    semantic?: number;
    recent?: number;
    popular?: number;
  };
  includeMetadata?: boolean;
  includeSimilar?: boolean;
  minScore?: number;
  fuzzyMatching?: boolean;
  synonymExpansion?: boolean;
  spellCorrection?: boolean;
  cacheResults?: boolean;
}

/**
 * Search result item
 */
export interface SearchResultItem {
  id: string;
  type: 'talent' | 'project' | 'role';
  score: number;
  matchType: 'exact' | 'partial' | 'semantic' | 'fuzzy';
  data: any;
  highlights?: {
    field: string;
    snippet: string;
  }[];
  explanation?: string[];
}

/**
 * Aggregated search results
 */
export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  facets?: {
    skills: Array<{ value: string; count: number }>;
    locations: Array<{ value: string; count: number }>;
    languages: Array<{ value: string; count: number }>;
    experienceLevels: Array<{ value: string; count: number }>;
  };
  suggestions?: string[];
  processingTime: number;
  searchMode: SearchMode;
}

class HybridSearchService {
  private tfidf: natural.TfIdf;
  private spellChecker: natural.Spellcheck;
  private tokenizer: natural.WordTokenizer;
  private stemmer: natural.PorterStemmer;
  private synonymMap: Map<string, string[]>;

  constructor() {
    this.tfidf = new natural.TfIdf();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.synonymMap = this.initializeSynonyms();
    
    // Initialize spell checker with domain-specific vocabulary
    const vocabulary = this.loadVocabulary();
    this.spellChecker = new natural.Spellcheck(vocabulary);
  }

  /**
   * Initialize synonym map for query expansion
   */
  private initializeSynonyms(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    
    // Entertainment industry synonyms
    map.set('actor', ['performer', 'artist', 'talent', 'star', 'lead']);
    map.set('actress', ['performer', 'artist', 'talent', 'star', 'heroine']);
    map.set('director', ['filmmaker', 'auteur', 'helmer']);
    map.set('producer', ['executive', 'financier', 'backer']);
    map.set('singer', ['vocalist', 'crooner', 'playback']);
    map.set('dancer', ['choreographer', 'performer', 'hoofer']);
    map.set('writer', ['screenwriter', 'scriptwriter', 'author']);
    
    // Skills synonyms
    map.set('acting', ['performance', 'portrayal', 'dramatization']);
    map.set('singing', ['vocals', 'melody', 'playback']);
    map.set('dancing', ['choreography', 'movement', 'rhythm']);
    map.set('comedy', ['humor', 'standup', 'comic']);
    map.set('drama', ['theatrical', 'serious', 'emotional']);
    map.set('action', ['stunts', 'fighting', 'martial']);
    
    // Experience synonyms
    map.set('experienced', ['veteran', 'seasoned', 'professional']);
    map.set('fresh', ['new', 'debut', 'newcomer', 'fresher']);
    map.set('senior', ['experienced', 'veteran', 'established']);
    map.set('junior', ['beginner', 'entry', 'fresher']);
    
    // Mumbai/Bollywood specific
    map.set('bollywood', ['hindi cinema', 'mumbai films', 'hindi movies']);
    map.set('ott', ['streaming', 'web series', 'digital']);
    
    return map;
  }

  /**
   * Load domain-specific vocabulary
   */
  private loadVocabulary(): string[] {
    return [
      // Entertainment terms
      'actor', 'actress', 'director', 'producer', 'cinematographer',
      'editor', 'screenwriter', 'composer', 'choreographer', 'stylist',
      
      // Bollywood specific
      'bollywood', 'kollywood', 'tollywood', 'playback', 'dubbing',
      'item', 'masala', 'arthouse', 'multiplex', 'single-screen',
      
      // Skills
      'acting', 'singing', 'dancing', 'stunts', 'comedy', 'drama',
      'romance', 'action', 'thriller', 'horror', 'classical', 'contemporary',
      
      // Platforms
      'netflix', 'amazon', 'hotstar', 'zee5', 'sonyliv', 'voot',
      'altbalaji', 'mx player', 'youtube', 'theatrical',
    ];
  }

  /**
   * Perform hybrid search
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResults> {
    const startTime = performance.now();
    const {
      mode = SearchMode.HYBRID,
      limit = 20,
      offset = 0,
      boostFactors = {
        exact: 2.0,
        partial: 1.5,
        semantic: 1.0,
        recent: 1.2,
        popular: 1.1,
      },
      includeMetadata = true,
      includeSimilar = false,
      minScore = 0.3,
      fuzzyMatching = true,
      synonymExpansion = true,
      spellCorrection = true,
      cacheResults = true,
    } = options;

    try {
      // Check cache
      if (cacheResults) {
        const cacheKey = this.generateCacheKey(query, filters, options);
        const cached = await CacheManager.get(cacheKey);
        if (cached) {
          logger.info('Returning cached search results');
          return JSON.parse(cached);
        }
      }

      // Process query
      const processedQuery = await this.processQuery(query, {
        spellCorrection,
        synonymExpansion,
        fuzzyMatching,
      });

      // Determine search mode
      const searchMode = mode === SearchMode.SMART
        ? this.determineSearchMode(processedQuery)
        : mode;

      // Execute search based on mode
      let results: SearchResultItem[] = [];
      
      switch (searchMode) {
        case SearchMode.SEMANTIC:
          results = await this.semanticSearch(processedQuery, filters, options);
          break;
        
        case SearchMode.KEYWORD:
          results = await this.keywordSearch(processedQuery, filters, options);
          break;
        
        case SearchMode.HYBRID:
          results = await this.hybridSearchInternal(processedQuery, filters, options);
          break;
      }

      // Apply boost factors
      results = this.applyBoostFactors(results, boostFactors);

      // Filter by minimum score
      results = results.filter(r => r.score >= minScore);

      // Sort by score
      results.sort((a, b) => b.score - a.score);

      // Find similar items if requested
      if (includeSimilar && results.length > 0) {
        const similar = await this.findSimilarItems(results[0].id, 5);
        results = [...results, ...similar];
      }

      // Generate facets
      const facets = await this.generateFacets(results);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(query, results);

      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);

      const processingTime = performance.now() - startTime;

      const searchResults: SearchResults = {
        items: paginatedResults,
        total: results.length,
        facets,
        suggestions,
        processingTime,
        searchMode,
      };

      // Cache results
      if (cacheResults) {
        const cacheKey = this.generateCacheKey(query, filters, options);
        await CacheManager.set(cacheKey, JSON.stringify(searchResults), 300); // 5 minutes
      }

      logger.info(`Search completed in ${processingTime.toFixed(2)}ms`);
      return searchResults;
    } catch (error) {
      logger.error('Search failed:', error);
      throw new AppError('Search operation failed', 500);
    }
  }

  /**
   * Process query with corrections and expansions
   */
  private async processQuery(
    query: string,
    options: {
      spellCorrection: boolean;
      synonymExpansion: boolean;
      fuzzyMatching: boolean;
    }
  ): Promise<{
    original: string;
    corrected?: string;
    expanded?: string[];
    tokens: string[];
    stems: string[];
  }> {
    const result = {
      original: query,
      tokens: [] as string[],
      stems: [] as string[],
    } as any;

    // Tokenize
    result.tokens = this.tokenizer.tokenize(query.toLowerCase()) || [];

    // Spell correction
    if (options.spellCorrection) {
      const corrected = result.tokens.map((token: string) => {
        const corrections = this.spellChecker.getCorrections(token, 1);
        return corrections.length > 0 ? corrections[0] : token;
      });
      
      if (corrected.some((t: string, i: number) => t !== result.tokens[i])) {
        result.corrected = corrected.join(' ');
      }
    }

    // Stemming
    result.stems = result.tokens.map((token: string) => 
      this.stemmer.stem(token)
    );

    // Synonym expansion
    if (options.synonymExpansion) {
      const expanded = new Set<string>();
      result.tokens.forEach((token: string) => {
        expanded.add(token);
        const synonyms = this.synonymMap.get(token);
        if (synonyms) {
          synonyms.forEach(s => expanded.add(s));
        }
      });
      result.expanded = Array.from(expanded);
    }

    return result;
  }

  /**
   * Determine best search mode based on query
   */
  private determineSearchMode(processedQuery: any): SearchMode {
    const { tokens } = processedQuery;
    
    // Use keyword search for very short queries
    if (tokens.length <= 2) {
      return SearchMode.KEYWORD;
    }
    
    // Use semantic search for natural language queries
    if (tokens.length > 5) {
      return SearchMode.SEMANTIC;
    }
    
    // Use hybrid for medium-length queries
    return SearchMode.HYBRID;
  }

  /**
   * Perform semantic search using embeddings
   */
  private async semanticSearch(
    processedQuery: any,
    filters: SearchFilters,
    options: SearchOptions
  ): Promise<SearchResultItem[]> {
    const queryText = processedQuery.corrected || processedQuery.original;
    
    // Generate embedding
    const embedding = await embeddingService.generateSearchEmbedding(
      queryText,
      {
        skills: filters.skills,
        location: Array.isArray(filters.location) 
          ? filters.location[0] 
          : filters.location,
        experienceLevel: filters.experienceLevel,
      }
    );

    // Search in vector database
    const vectorResults = await vectorService.findMatchingTalents(
      embedding,
      filters,
      {
        topK: (options.limit || 20) * 2,
        includeMetadata: options.includeMetadata,
      }
    );

    // Convert to search results
    const results: SearchResultItem[] = [];
    
    for (const vResult of vectorResults) {
      const talent = await prisma.talent.findUnique({
        where: { id: vResult.id },
        include: {
          user: true,
          media: true,
          skills: true,
        },
      });

      if (talent) {
        results.push({
          id: talent.id,
          type: 'talent',
          score: vResult.score,
          matchType: 'semantic',
          data: talent,
          explanation: [`Semantic similarity: ${(vResult.score * 100).toFixed(1)}%`],
        });
      }
    }

    return results;
  }

  /**
   * Perform keyword search using database queries
   */
  private async keywordSearch(
    processedQuery: any,
    filters: SearchFilters,
    options: SearchOptions
  ): Promise<SearchResultItem[]> {
    const { tokens, stems, expanded } = processedQuery;
    const searchTerms = expanded || tokens;

    // Build database query
    const whereClause: Prisma.TalentWhereInput = {
      AND: [
        // Text search
        {
          OR: searchTerms.map((term: string) => ({
            OR: [
              { displayName: { contains: term, mode: 'insensitive' } },
              { bio: { contains: term, mode: 'insensitive' } },
              { 
                skills: {
                  some: {
                    name: { contains: term, mode: 'insensitive' }
                  }
                }
              },
            ],
          })),
        },
        // Filters
        this.buildFilterClause(filters),
      ],
    };

    // Execute search
    const talents = await prisma.talent.findMany({
      where: whereClause,
      include: {
        user: true,
        media: true,
        skills: true,
        reviews: true,
      },
      take: (options.limit || 20) * 2,
    });

    // Score results
    const results: SearchResultItem[] = talents.map(talent => {
      const score = this.calculateKeywordScore(talent, searchTerms);
      const highlights = this.extractHighlights(talent, searchTerms);
      
      return {
        id: talent.id,
        type: 'talent',
        score,
        matchType: highlights.length > 0 ? 'exact' : 'partial',
        data: talent,
        highlights,
        explanation: [`Keyword matches: ${highlights.length}`],
      };
    });

    return results;
  }

  /**
   * Perform hybrid search combining semantic and keyword
   */
  private async hybridSearchInternal(
    processedQuery: any,
    filters: SearchFilters,
    options: SearchOptions
  ): Promise<SearchResultItem[]> {
    // Execute both searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(processedQuery, filters, options),
      this.keywordSearch(processedQuery, filters, options),
    ]);

    // Combine and deduplicate results
    const combinedResults = this.fuseResults(
      semanticResults,
      keywordResults,
      {
        semanticWeight: 0.6,
        keywordWeight: 0.4,
      }
    );

    return combinedResults;
  }

  /**
   * Fuse results from multiple search methods
   */
  private fuseResults(
    semanticResults: SearchResultItem[],
    keywordResults: SearchResultItem[],
    weights: { semanticWeight: number; keywordWeight: number }
  ): SearchResultItem[] {
    const fusedMap = new Map<string, SearchResultItem>();

    // Add semantic results
    semanticResults.forEach(result => {
      fusedMap.set(result.id, {
        ...result,
        score: result.score * weights.semanticWeight,
        matchType: 'semantic',
      });
    });

    // Merge keyword results
    keywordResults.forEach(result => {
      const existing = fusedMap.get(result.id);
      if (existing) {
        // Combine scores
        existing.score += result.score * weights.keywordWeight;
        existing.matchType = 'exact'; // Upgrade to exact if found in both
        if (result.highlights) {
          existing.highlights = [...(existing.highlights || []), ...result.highlights];
        }
        if (result.explanation) {
          existing.explanation = [...(existing.explanation || []), ...result.explanation];
        }
      } else {
        fusedMap.set(result.id, {
          ...result,
          score: result.score * weights.keywordWeight,
        });
      }
    });

    return Array.from(fusedMap.values());
  }

  /**
   * Build filter clause for database query
   */
  private buildFilterClause(filters: SearchFilters): Prisma.TalentWhereInput {
    const clause: Prisma.TalentWhereInput = {};

    if (filters.gender) {
      clause.gender = filters.gender;
    }

    if (filters.location) {
      if (Array.isArray(filters.location)) {
        clause.location = { in: filters.location };
      } else {
        clause.location = filters.location;
      }
    }

    if (filters.languages && filters.languages.length > 0) {
      clause.languages = {
        hasSome: filters.languages,
      };
    }

    if (filters.skills && filters.skills.length > 0) {
      clause.skills = {
        some: {
          name: { in: filters.skills },
        },
      };
    }

    if (filters.experienceLevel) {
      clause.experienceLevel = filters.experienceLevel;
    }

    if (filters.minRating !== undefined || filters.maxRating !== undefined) {
      clause.rating = {};
      if (filters.minRating !== undefined) {
        clause.rating.gte = filters.minRating;
      }
      if (filters.maxRating !== undefined) {
        clause.rating.lte = filters.maxRating;
      }
    }

    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      clause.age = {};
      if (filters.ageMin !== undefined) {
        clause.age.gte = filters.ageMin;
      }
      if (filters.ageMax !== undefined) {
        clause.age.lte = filters.ageMax;
      }
    }

    if (filters.availability) {
      clause.availability = filters.availability;
    }

    if (filters.verified !== undefined) {
      clause.verified = filters.verified;
    }

    return clause;
  }

  /**
   * Calculate keyword score for a talent
   */
  private calculateKeywordScore(talent: any, searchTerms: string[]): number {
    let score = 0;
    const lowerTerms = searchTerms.map(t => t.toLowerCase());

    // Check display name (highest weight)
    const lowerName = talent.displayName?.toLowerCase() || '';
    lowerTerms.forEach(term => {
      if (lowerName.includes(term)) {
        score += lowerName === term ? 3 : 2; // Exact vs partial match
      }
    });

    // Check bio (medium weight)
    const lowerBio = talent.bio?.toLowerCase() || '';
    lowerTerms.forEach(term => {
      if (lowerBio.includes(term)) {
        score += 1;
      }
    });

    // Check skills (medium weight)
    talent.skills?.forEach((skill: any) => {
      const lowerSkill = skill.name?.toLowerCase() || '';
      lowerTerms.forEach(term => {
        if (lowerSkill.includes(term)) {
          score += 1.5;
        }
      });
    });

    // Normalize score
    return Math.min(1, score / (searchTerms.length * 3));
  }

  /**
   * Extract highlights from matched content
   */
  private extractHighlights(talent: any, searchTerms: string[]): any[] {
    const highlights: any[] = [];
    const lowerTerms = searchTerms.map(t => t.toLowerCase());

    // Check display name
    const lowerName = talent.displayName?.toLowerCase() || '';
    lowerTerms.forEach(term => {
      if (lowerName.includes(term)) {
        const index = lowerName.indexOf(term);
        const snippet = talent.displayName.substring(
          Math.max(0, index - 20),
          Math.min(talent.displayName.length, index + term.length + 20)
        );
        highlights.push({
          field: 'displayName',
          snippet: `...${snippet}...`,
        });
      }
    });

    // Check bio
    const lowerBio = talent.bio?.toLowerCase() || '';
    lowerTerms.forEach(term => {
      if (lowerBio.includes(term)) {
        const index = lowerBio.indexOf(term);
        const snippet = talent.bio.substring(
          Math.max(0, index - 30),
          Math.min(talent.bio.length, index + term.length + 30)
        );
        highlights.push({
          field: 'bio',
          snippet: `...${snippet}...`,
        });
      }
    });

    return highlights;
  }

  /**
   * Apply boost factors to results
   */
  private applyBoostFactors(
    results: SearchResultItem[],
    boostFactors: any
  ): SearchResultItem[] {
    return results.map(result => {
      let boostedScore = result.score;

      // Boost exact matches
      if (result.matchType === 'exact') {
        boostedScore *= boostFactors.exact;
      } else if (result.matchType === 'partial') {
        boostedScore *= boostFactors.partial;
      }

      // Boost recent items
      if (result.data?.updatedAt) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(result.data.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceUpdate < 7) {
          boostedScore *= boostFactors.recent;
        }
      }

      // Boost popular items
      if (result.data?.reviews?.length > 10 || result.data?.rating > 4.5) {
        boostedScore *= boostFactors.popular;
      }

      return {
        ...result,
        score: Math.min(1, boostedScore), // Cap at 1.0
      };
    });
  }

  /**
   * Find similar items
   */
  private async findSimilarItems(
    itemId: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    try {
      // Get item's embedding
      const vectorData = await vectorService.getTalentVector(itemId);
      if (!vectorData || !vectorData.values) {
        return [];
      }

      // Search for similar
      const similar = await vectorService.searchSimilarTalents(
        vectorData.values,
        { topK: limit + 1, minScore: 0.7 }
      );

      // Convert to search results
      const results: SearchResultItem[] = [];
      for (const item of similar) {
        if (item.id === itemId) continue; // Skip self

        const talent = await prisma.talent.findUnique({
          where: { id: item.id },
        });

        if (talent) {
          results.push({
            id: talent.id,
            type: 'talent',
            score: item.score * 0.8, // Slightly reduce score for similar items
            matchType: 'semantic',
            data: talent,
            explanation: ['Similar profile'],
          });
        }

        if (results.length >= limit) break;
      }

      return results;
    } catch (error) {
      logger.error('Finding similar items failed:', error);
      return [];
    }
  }

  /**
   * Generate facets from results
   */
  private async generateFacets(
    results: SearchResultItem[]
  ): Promise<any> {
    const facets = {
      skills: new Map<string, number>(),
      locations: new Map<string, number>(),
      languages: new Map<string, number>(),
      experienceLevels: new Map<string, number>(),
    };

    results.forEach(result => {
      if (result.type === 'talent' && result.data) {
        // Skills
        result.data.skills?.forEach((skill: any) => {
          const name = skill.name || skill;
          facets.skills.set(name, (facets.skills.get(name) || 0) + 1);
        });

        // Location
        if (result.data.location) {
          facets.locations.set(
            result.data.location,
            (facets.locations.get(result.data.location) || 0) + 1
          );
        }

        // Languages
        result.data.languages?.forEach((lang: string) => {
          facets.languages.set(lang, (facets.languages.get(lang) || 0) + 1);
        });

        // Experience level
        if (result.data.experienceLevel) {
          facets.experienceLevels.set(
            result.data.experienceLevel,
            (facets.experienceLevels.get(result.data.experienceLevel) || 0) + 1
          );
        }
      }
    });

    // Convert to arrays and sort
    return {
      skills: Array.from(facets.skills.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      locations: Array.from(facets.locations.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      languages: Array.from(facets.languages.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      experienceLevels: Array.from(facets.experienceLevels.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Generate search suggestions
   */
  private async generateSuggestions(
    query: string,
    results: SearchResultItem[]
  ): Promise<string[]> {
    const suggestions: Set<string> = new Set();

    // Add spell corrections
    const tokens = this.tokenizer.tokenize(query.toLowerCase()) || [];
    tokens.forEach(token => {
      const corrections = this.spellChecker.getCorrections(token, 1);
      corrections.forEach(c => suggestions.add(c));
    });

    // Add related skills from results
    if (results.length > 0) {
      results.slice(0, 5).forEach(result => {
        if (result.data?.skills) {
          result.data.skills.forEach((skill: any) => {
            const skillName = skill.name || skill;
            if (skillName && !query.toLowerCase().includes(skillName.toLowerCase())) {
              suggestions.add(skillName);
            }
          });
        }
      });
    }

    // Add synonyms
    tokens.forEach(token => {
      const synonyms = this.synonymMap.get(token);
      if (synonyms) {
        synonyms.forEach(s => suggestions.add(s));
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    query: string,
    filters: SearchFilters,
    options: SearchOptions
  ): string {
    const crypto = require('crypto');
    const data = JSON.stringify({ query, filters, options });
    return `search:${crypto.createHash('sha256').update(data).digest('hex')}`;
  }

  /**
   * Index content for search
   */
  async indexContent(
    content: {
      id: string;
      type: 'talent' | 'project' | 'role';
      text: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Add to TF-IDF index
      this.tfidf.addDocument(content.text, content.id);

      // Generate and store embedding
      if (content.type === 'talent') {
        const embedding = await embeddingService.generateEmbedding(content.text);
        await vectorService.upsertTalentEmbedding(
          content.id,
          embedding,
          content.metadata
        );
      }

      logger.info(`Indexed content: ${content.id}`);
    } catch (error) {
      logger.error('Content indexing failed:', error);
      throw new AppError('Failed to index content', 500);
    }
  }

  /**
   * Batch index multiple items
   */
  async batchIndex(
    items: Array<{
      id: string;
      type: 'talent' | 'project' | 'role';
      text: string;
      metadata?: any;
    }>,
    options: {
      parallel?: boolean;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<void> {
    const { parallel = true, onProgress } = options;

    if (parallel) {
      const chunks = this.chunkArray(items, 10);
      
      for (let i = 0; i < chunks.length; i++) {
        await Promise.all(
          chunks[i].map(item => this.indexContent(item))
        );
        
        if (onProgress) {
          onProgress((i + 1) * chunks[i].length, items.length);
        }
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        await this.indexContent(items[i]);
        
        if (onProgress) {
          onProgress(i + 1, items.length);
        }
      }
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const hybridSearchService = new HybridSearchService();