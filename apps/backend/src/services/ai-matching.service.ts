/**
 * AI Matching Service
 * Intelligent talent matching using semantic search and multi-factor scoring
 */

import { prisma } from '../config/database';
import { hybridVectorService } from './hybrid-vector.service';
import { vectorService, TalentVectorMetadata } from './vector.service';
import { embeddingService, TalentProfileData } from './embedding.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheManager } from '../config/redis';
import { Talent, Prisma } from '@prisma/client';

/**
 * Match scoring weights configuration
 */
export interface ScoringWeights {
  semanticSimilarity: number;  // 0.6 (60%)
  experienceMatch: number;      // 0.2 (20%)
  availability: number;         // 0.1 (10%)
  ratingAndReviews: number;     // 0.1 (10%)
}

/**
 * Match criteria for talent search
 */
export interface MatchCriteria {
  query: string;
  roleDescription?: string;
  requirements?: string[];
  preferences?: string[];
  filters?: {
    gender?: string;
    location?: string;
    languages?: string[];
    skills?: string[];
    experienceLevel?: string;
    minRating?: number;
    availability?: string;
    ageMin?: number;
    ageMax?: number;
    minExperience?: number;
    maxExperience?: number;
    verified?: boolean;
  };
  weights?: Partial<ScoringWeights>;
  limit?: number;
  offset?: number;
}

/**
 * Talent match result with scoring details
 */
export interface TalentMatchResult {
  talentId: string;
  talent?: any; // Full talent data
  overallScore: number;
  scores: {
    semantic: number;
    experience: number;
    availability: number;
    rating: number;
  };
  matchReasons: string[];
  metadata?: TalentVectorMetadata;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  successful: number;
  failed: number;
  errors: Array<{ talentId: string; error: string }>;
  duration: number;
}

class AIMatchingService {
  private defaultWeights: ScoringWeights = {
    semanticSimilarity: 0.6,
    experienceMatch: 0.2,
    availability: 0.1,
    ratingAndReviews: 0.1,
  };

  /**
   * Find matching talents based on AI-powered semantic search
   */
  async findMatchingTalents(criteria: MatchCriteria): Promise<{
    results: TalentMatchResult[];
    total: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const {
      query,
      roleDescription,
      requirements,
      preferences,
      filters = {},
      weights = this.defaultWeights,
      limit = 20,
      offset = 0,
    } = criteria;

    try {
      // Generate embedding for the search query
      const queryEmbedding = await embeddingService.generateSearchEmbedding(
        query,
        {
          skills: filters.skills,
          location: filters.location,
          experienceLevel: filters.experienceLevel,
        }
      );

      // Search in vector database
      const vectorResults = await hybridVectorService.findMatchingTalents(
        queryEmbedding,
        filters,
        {
          topK: limit * 3, // Get more results for post-filtering
          minScore: 0.5,
          includeMetadata: true,
        }
      );

      // Get full talent data from database
      const talentIds = vectorResults.map(r => r.id);
      const talents = await this.getTalentsByIds(talentIds);

      // Score and rank talents
      const scoredResults = await this.scoreTalents(
        talents,
        vectorResults,
        criteria,
        weights as ScoringWeights
      );

      // Sort by overall score
      scoredResults.sort((a, b) => b.overallScore - a.overallScore);

      // Apply pagination
      const paginatedResults = scoredResults.slice(offset, offset + limit);

      const processingTime = Date.now() - startTime;

      return {
        results: paginatedResults,
        total: scoredResults.length,
        processingTime,
      };
    } catch (error) {
      logger.error('AI matching failed:', error);
      throw new AppError('Failed to find matching talents', 500);
    }
  }

  /**
   * Search similar talents based on a reference talent
   */
  async findSimilarTalents(
    talentId: string,
    options: {
      limit?: number;
      includeOriginal?: boolean;
      filters?: Record<string, any>;
    } = {}
  ): Promise<TalentMatchResult[]> {
    const { limit = 10, includeOriginal = false, filters = {} } = options;

    try {
      // Get the reference talent's embedding
      const vectorData = await hybridVectorService.getTalentVector ? 
        await hybridVectorService.getTalentVector(talentId) :
        await vectorService.getTalentVector(talentId);
      if (!vectorData || !vectorData.values) {
        throw new AppError('Talent embedding not found', 404);
      }

      // Search for similar talents
      const similarResults = await hybridVectorService.searchSimilarTalents(
        vectorData.values,
        {
          topK: limit + 1, // Get one extra in case we need to exclude original
          filter: filters,
          includeMetadata: true,
          minScore: 0.7,
        }
      );

      // Filter out the original talent if needed
      const filteredResults = includeOriginal
        ? similarResults
        : similarResults.filter(r => r.id !== talentId);

      // Get full talent data
      const talentIds = filteredResults.slice(0, limit).map(r => r.id);
      const talents = await this.getTalentsByIds(talentIds);

      // Format results
      const results: TalentMatchResult[] = filteredResults.slice(0, limit).map(result => {
        const talent = talents.find(t => t.id === result.id);
        return {
          talentId: result.id,
          talent,
          overallScore: result.score,
          scores: {
            semantic: result.score,
            experience: 0,
            availability: 0,
            rating: 0,
          },
          matchReasons: this.generateMatchReasons(result.score, result.metadata),
          metadata: result.metadata,
        };
      });

      return results;
    } catch (error) {
      logger.error('Similar talent search failed:', error);
      throw error instanceof AppError ? error : new AppError('Failed to find similar talents', 500);
    }
  }

  /**
   * Score talents based on multiple factors
   */
  private async scoreTalents(
    talents: any[],
    vectorResults: Array<{ id: string; score: number; metadata?: TalentVectorMetadata }>,
    criteria: MatchCriteria,
    weights: ScoringWeights
  ): Promise<TalentMatchResult[]> {
    const results: TalentMatchResult[] = [];

    for (const talent of talents) {
      const vectorResult = vectorResults.find(v => v.id === talent.id);
      if (!vectorResult) continue;

      // Calculate individual scores
      const semanticScore = vectorResult.score;
      const experienceScore = this.calculateExperienceScore(talent, criteria.filters);
      const availabilityScore = this.calculateAvailabilityScore(talent, criteria.filters);
      const ratingScore = this.calculateRatingScore(talent);

      // Calculate weighted overall score
      const overallScore = 
        (semanticScore * weights.semanticSimilarity) +
        (experienceScore * weights.experienceMatch) +
        (availabilityScore * weights.availability) +
        (ratingScore * weights.ratingAndReviews);

      // Generate match reasons
      const matchReasons = this.generateDetailedMatchReasons(
        talent,
        {
          semantic: semanticScore,
          experience: experienceScore,
          availability: availabilityScore,
          rating: ratingScore,
        },
        criteria
      );

      results.push({
        talentId: talent.id,
        talent,
        overallScore,
        scores: {
          semantic: semanticScore,
          experience: experienceScore,
          availability: availabilityScore,
          rating: ratingScore,
        },
        matchReasons,
        metadata: vectorResult.metadata,
      });
    }

    return results;
  }

  /**
   * Calculate experience match score
   */
  private calculateExperienceScore(talent: any, filters?: any): number {
    if (!filters) return 0.5; // Neutral score if no filters

    let score = 0;
    let factors = 0;

    // Years of experience
    if (filters.minExperience !== undefined || filters.maxExperience !== undefined) {
      const years = talent.yearsOfExperience || 0;
      
      if (filters.minExperience !== undefined && years >= filters.minExperience) {
        score += 1;
      } else if (filters.minExperience !== undefined && years < filters.minExperience) {
        // Partial score based on how close they are
        score += Math.max(0, 1 - (filters.minExperience - years) / filters.minExperience);
      }
      
      if (filters.maxExperience !== undefined && years <= filters.maxExperience) {
        score += 1;
      }
      
      factors += (filters.minExperience !== undefined ? 1 : 0) + (filters.maxExperience !== undefined ? 1 : 0);
    }

    // Experience level match
    if (filters.experienceLevel && talent.experienceLevel) {
      const levelMatch = this.matchExperienceLevel(talent.experienceLevel, filters.experienceLevel);
      score += levelMatch;
      factors += 1;
    }

    // Skills match
    if (filters.skills && talent.skills) {
      const skillsArray = Array.isArray(talent.skills) ? talent.skills : 
                         (typeof talent.skills === 'string' ? talent.skills.split(',') : []);
      const matchedSkills = filters.skills.filter((skill: string) => 
        skillsArray.some((ts: string) => ts.toLowerCase().includes(skill.toLowerCase()))
      );
      
      if (filters.skills.length > 0) {
        score += matchedSkills.length / filters.skills.length;
        factors += 1;
      }
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(talent: any, filters?: any): number {
    if (!filters?.availability || !talent.availability) return 0.5;

    const availabilityMap: Record<string, number> = {
      'IMMEDIATE': 1.0,
      'WITHIN_WEEK': 0.8,
      'WITHIN_MONTH': 0.6,
      'FLEXIBLE': 0.5,
      'NOT_AVAILABLE': 0,
    };

    const talentAvailability = talent.availability || 'FLEXIBLE';
    const requiredAvailability = filters.availability;

    // Perfect match
    if (talentAvailability === requiredAvailability) return 1.0;

    // Calculate based on availability urgency
    const talentScore = availabilityMap[talentAvailability] || 0.5;
    const requiredScore = availabilityMap[requiredAvailability] || 0.5;

    // If talent is more available than required, that's good
    if (talentScore >= requiredScore) return 0.9;

    // Otherwise, penalize based on difference
    return Math.max(0, 1 - Math.abs(talentScore - requiredScore));
  }

  /**
   * Calculate rating and reviews score
   */
  private calculateRatingScore(talent: any): number {
    const rating = talent.averageRating || talent.rating || 0;
    const reviewCount = talent.reviewCount || talent._count?.reviews || 0;

    // No reviews yet - neutral score
    if (reviewCount === 0) return 0.5;

    // Normalize rating to 0-1 scale
    const normalizedRating = rating / 5;

    // Factor in review count (more reviews = more reliable)
    const reviewWeight = Math.min(1, reviewCount / 10); // Cap at 10 reviews
    
    // Weighted score
    return (normalizedRating * 0.7) + (reviewWeight * 0.3);
  }

  /**
   * Match experience levels with fuzzy matching
   */
  private matchExperienceLevel(talentLevel: string, requiredLevel: string): number {
    const levels = ['FRESHER', 'INTERMEDIATE', 'EXPERIENCED', 'VETERAN'];
    
    const talentIndex = levels.indexOf(talentLevel);
    const requiredIndex = levels.indexOf(requiredLevel);
    
    if (talentIndex === -1 || requiredIndex === -1) return 0.5;
    
    // Perfect match
    if (talentIndex === requiredIndex) return 1.0;
    
    // Talent is more experienced than required - good
    if (talentIndex > requiredIndex) return 0.9;
    
    // Talent is less experienced - penalize based on gap
    const gap = requiredIndex - talentIndex;
    return Math.max(0, 1 - (gap * 0.3));
  }

  /**
   * Generate match reasons based on scores
   */
  private generateMatchReasons(score: number, metadata?: TalentVectorMetadata): string[] {
    const reasons: string[] = [];

    if (score >= 0.9) {
      reasons.push('Excellent profile match');
    } else if (score >= 0.8) {
      reasons.push('Strong profile match');
    } else if (score >= 0.7) {
      reasons.push('Good profile match');
    }

    if (metadata) {
      if (metadata.verified) {
        reasons.push('Verified profile');
      }
      if (metadata.rating && metadata.rating >= 4) {
        reasons.push(`Highly rated (${metadata.rating}/5)`);
      }
      if (metadata.yearsOfExperience && metadata.yearsOfExperience >= 5) {
        reasons.push(`Experienced (${metadata.yearsOfExperience} years)`);
      }
    }

    return reasons;
  }

  /**
   * Generate detailed match reasons
   */
  private generateDetailedMatchReasons(
    talent: any,
    scores: { semantic: number; experience: number; availability: number; rating: number },
    criteria: MatchCriteria
  ): string[] {
    const reasons: string[] = [];

    // Semantic match reasons
    if (scores.semantic >= 0.9) {
      reasons.push('Profile highly relevant to requirements');
    } else if (scores.semantic >= 0.8) {
      reasons.push('Strong profile relevance');
    }

    // Experience match reasons
    if (scores.experience >= 0.9) {
      reasons.push('Experience perfectly matches requirements');
    } else if (scores.experience >= 0.7) {
      reasons.push('Good experience match');
    }

    // Skills match
    if (criteria.filters?.skills && talent.skills) {
      const skillsArray = Array.isArray(talent.skills) ? talent.skills : 
                         (typeof talent.skills === 'string' ? talent.skills.split(',') : []);
      const matchedSkills = criteria.filters.skills.filter((skill: string) => 
        skillsArray.some((ts: string) => ts.toLowerCase().includes(skill.toLowerCase()))
      );
      
      if (matchedSkills.length > 0) {
        reasons.push(`Matches skills: ${matchedSkills.join(', ')}`);
      }
    }

    // Availability reasons
    if (scores.availability >= 0.9) {
      reasons.push('Available immediately');
    } else if (scores.availability >= 0.7) {
      reasons.push('Good availability match');
    }

    // Rating reasons
    if (scores.rating >= 0.8) {
      reasons.push('Highly rated by clients');
    }

    // Location match
    if (criteria.filters?.location && talent.currentCity === criteria.filters.location) {
      reasons.push(`Located in ${criteria.filters.location}`);
    }

    // Language match
    if (criteria.filters?.languages && talent.languages) {
      const langArray = Array.isArray(talent.languages) ? talent.languages : 
                       (typeof talent.languages === 'string' ? talent.languages.split(',') : []);
      const matchedLangs = criteria.filters.languages.filter((lang: string) => 
        langArray.some((tl: string) => tl.toLowerCase() === lang.toLowerCase())
      );
      
      if (matchedLangs.length > 0) {
        reasons.push(`Speaks: ${matchedLangs.join(', ')}`);
      }
    }

    return reasons;
  }

  /**
   * Get talents by IDs with full data
   */
  private async getTalentsByIds(talentIds: string[]): Promise<any[]> {
    if (talentIds.length === 0) return [];

    try {
      const talents = await prisma.talent.findMany({
        where: {
          id: { in: talentIds },
        },
        include: {
          physicalAttributes: true,
          skills: true,
          languages: true,
          workExperiences: {
            orderBy: { startDate: 'desc' },
            take: 5,
          },
          achievements: {
            orderBy: { date: 'desc' },
            take: 5,
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              applications: true,
              auditions: true,
            },
          },
        },
      });

      // Add calculated fields
      return talents.map(talent => ({
        ...talent,
        averageRating: talent.reviews.length > 0
          ? talent.reviews.reduce((sum, r) => sum + r.rating, 0) / talent.reviews.length
          : 0,
        reviewCount: talent._count.reviews,
      }));
    } catch (error) {
      logger.error('Failed to fetch talents by IDs:', error);
      throw new AppError('Failed to fetch talent data', 500);
    }
  }

  /**
   * Update all talent embeddings (batch job)
   */
  async updateAllTalentEmbeddings(
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<BatchProcessingResult> {
    const { batchSize = 50, onProgress } = options;
    const startTime = Date.now();
    const errors: Array<{ talentId: string; error: string }> = [];
    let successful = 0;
    let failed = 0;

    try {
      // Get total count
      const totalCount = await prisma.talent.count();
      
      // Process in batches
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const talents = await prisma.talent.findMany({
          skip: offset,
          take: batchSize,
          include: {
            skills: true,
            languages: true,
            achievements: true,
            workExperiences: true,
          },
        });

        // Prepare talent data for embedding
        const talentData: TalentProfileData[] = talents.map(talent => ({
          id: talent.id,
          displayName: talent.displayName || `${talent.firstName} ${talent.lastName}`,
          bio: talent.bio || undefined,
          skills: talent.skills?.map(s => s.name) || [],
          languages: talent.languages?.map(l => l.name) || [],
          experience: talent.workExperiences || undefined,
          achievements: talent.achievements?.map(a => a.title) || [],
          location: talent.currentCity,
          yearsOfExperience: talent.yearsOfExperience,
        }));

        // Generate embeddings
        const embeddings = await embeddingService.generateTalentEmbeddings(talentData);

        // Store in vector database
        const records = talentData.map(talent => {
          const embedding = embeddings.get(talent.id);
          if (!embedding) {
            errors.push({ talentId: talent.id, error: 'Failed to generate embedding' });
            failed++;
            return null;
          }

          const talentRecord = talents.find(t => t.id === talent.id)!;
          
          return {
            talentId: talent.id,
            embedding,
            metadata: {
              talentId: talent.id,
              userId: talentRecord.userId,
              displayName: talent.displayName,
              gender: talentRecord.gender,
              location: talentRecord.currentCity,
              languages: talent.languages,
              skills: talent.skills,
              yearsOfExperience: talentRecord.yearsOfExperience,
              verified: talentRecord.verified || false,
            } as TalentVectorMetadata,
          };
        }).filter(r => r !== null) as any[];

        // Batch upsert to Pinecone
        if (records.length > 0) {
          await hybridVectorService.batchUpsertEmbeddings(records);
          successful += records.length;
        }

        // Report progress
        const processed = Math.min(offset + batchSize, totalCount);
        if (onProgress) {
          onProgress(processed, totalCount);
        }
        
        logger.info(`Processed ${processed}/${totalCount} talents`);
      }

      const duration = Date.now() - startTime;

      return {
        successful,
        failed,
        errors,
        duration,
      };
    } catch (error) {
      logger.error('Batch embedding update failed:', error);
      throw new AppError('Failed to update talent embeddings', 500);
    }
  }

  /**
   * Update single talent embedding
   */
  async updateTalentEmbedding(talentId: string): Promise<void> {
    try {
      const talent = await prisma.talent.findUnique({
        where: { id: talentId },
        include: {
          skills: true,
          languages: true,
          achievements: true,
          workExperiences: true,
        },
      });

      if (!talent) {
        throw new AppError('Talent not found', 404);
      }

      // Prepare talent data
      const talentData: TalentProfileData = {
        id: talent.id,
        displayName: talent.displayName || `${talent.firstName} ${talent.lastName}`,
        bio: talent.bio || undefined,
        skills: talent.skills?.map(s => s.name) || [],
        languages: talent.languages?.map(l => l.name) || [],
        experience: talent.workExperiences || undefined,
        achievements: talent.achievements?.map(a => a.title) || [],
        location: talent.currentCity,
        yearsOfExperience: talent.yearsOfExperience,
      };

      // Generate embedding
      const embedding = await embeddingService.generateTalentEmbedding(talentData);

      // Store in vector database
      await hybridVectorService.upsertTalentEmbedding(
        talent.id,
        embedding,
        {
          talentId: talent.id,
          userId: talent.userId,
          displayName: talentData.displayName,
          gender: talent.gender,
          location: talent.currentCity,
          languages: talentData.languages,
          skills: talentData.skills,
          yearsOfExperience: talent.yearsOfExperience,
          verified: talent.verified || false,
        }
      );

      logger.info(`Updated embedding for talent: ${talentId}`);
    } catch (error) {
      logger.error('Failed to update talent embedding:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update talent embedding', 500);
    }
  }
}

// Export singleton instance
export const aiMatchingService = new AIMatchingService();