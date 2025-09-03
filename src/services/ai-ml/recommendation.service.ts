import { vectorDatabaseService, VectorSearchResult } from './vectorDatabase.service';
import { embeddingService } from './embedding.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import { redisClient } from '../../config/redis';

export interface TalentRecommendation {
  userId: string;
  name: string;
  profilePicture?: string;
  score: number;
  matchReasons: string[];
  skills: string[];
  experience: string;
  location: string;
  availability: boolean;
  categories: string[];
  languages: string[];
  profileCompleteness: number;
}

export interface RoleRecommendation {
  roleId: string;
  title: string;
  description: string;
  score: number;
  matchReasons: string[];
  requiredSkills: string[];
  category: string;
  location: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  timeline: {
    startDate?: Date;
    endDate?: Date;
    duration?: string;
  };
}

export interface ContentRecommendation {
  contentId: string;
  title: string;
  description: string;
  score: number;
  matchReasons: string[];
  tags: string[];
  category: string;
  type: 'role' | 'script' | 'project';
}

export interface RecommendationFilters {
  location?: string[];
  skills?: string[];
  experience?: string[];
  categories?: string[];
  languages?: string[];
  availability?: boolean;
  budgetRange?: { min: number; max: number };
  excludeUserIds?: string[];
  minScore?: number;
}

export interface RecommendationMetrics {
  totalRecommendations: number;
  averageScore: number;
  topCategories: string[];
  processingTimeMs: number;
  cacheHit: boolean;
}

export class RecommendationService {
  private readonly cachePrefix = 'recommendations:';
  private readonly cacheExpiry = 30 * 60; // 30 minutes
  private readonly minRecommendationScore = 0.7;

  /**
   * Get talent recommendations for a specific role
   */
  public async getTalentRecommendations(
    roleId: string,
    options: {
      limit?: number;
      filters?: RecommendationFilters;
      includeMetrics?: boolean;
    } = {}
  ): Promise<{
    recommendations: TalentRecommendation[];
    metrics?: RecommendationMetrics;
  }> {
    const startTime = Date.now();
    const { limit = 10, filters = {}, includeMetrics = false } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('talent', roleId, filters);
      let cacheHit = false;

      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          cacheHit = true;
          const result = JSON.parse(cached);
          if (includeMetrics) {
            result.metrics = {
              ...result.metrics,
              cacheHit: true,
              processingTimeMs: Date.now() - startTime
            };
          }
          return result;
        }
      }

      // Get role details from database
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          project: true
        }
      });

      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      // Create search query from role requirements
      const searchQuery = this.buildRoleSearchQuery(role);
      
      // Search for similar user profiles
      const vectorResults = await vectorDatabaseService.searchSimilarProfiles(
        searchQuery,
        {
          topK: limit * 2, // Get more results to filter
          filter: this.buildVectorFilter(filters),
          includeMetadata: true
        }
      );

      // Enhance results with database data and apply filters
      const recommendations = await this.enhanceTalentRecommendations(
        vectorResults,
        role,
        filters,
        limit
      );

      const result = {
        recommendations,
        ...(includeMetrics && {
          metrics: {
            totalRecommendations: recommendations.length,
            averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
            topCategories: this.extractTopCategories(recommendations),
            processingTimeMs: Date.now() - startTime,
            cacheHit
          }
        })
      };

      // Cache the result
      if (redisClient) {
        await redisClient.setex(cacheKey, this.cacheExpiry, JSON.stringify(result));
      }

      logger.info(`Generated ${recommendations.length} talent recommendations for role ${roleId}`);
      return result;

    } catch (error) {
      logger.error(`Error generating talent recommendations for role ${roleId}:`, error);
      throw error;
    }
  }

  /**
   * Get role recommendations for a specific user
   */
  public async getRoleRecommendations(
    userId: string,
    options: {
      limit?: number;
      filters?: RecommendationFilters;
      includeMetrics?: boolean;
    } = {}
  ): Promise<{
    recommendations: RoleRecommendation[];
    metrics?: RecommendationMetrics;
  }> {
    const startTime = Date.now();
    const { limit = 10, filters = {}, includeMetrics = false } = options;

    try {
      // Check cache
      const cacheKey = this.generateCacheKey('roles', userId, filters);
      let cacheHit = false;

      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          cacheHit = true;
          const result = JSON.parse(cached);
          if (includeMetrics) {
            result.metrics = {
              ...result.metrics,
              cacheHit: true,
              processingTimeMs: Date.now() - startTime
            };
          }
          return result;
        }
      }

      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          talent: true,
          actor: true
        }
      });

      if (!user || (!user.talent && !user.actor)) {
        throw new Error(`User profile not found: ${userId}`);
      }
      
      const profile = user.talent || user.actor;

      // Create search query from user profile
      const searchQuery = this.buildUserSearchQuery(profile);
      
      // Search for similar content (roles)
      const vectorResults = await vectorDatabaseService.searchContent(
        searchQuery,
        {
          topK: limit * 2,
          filter: this.buildContentVectorFilter(filters),
          contentType: 'role'
        }
      );

      // Enhance with database data
      const recommendations = await this.enhanceRoleRecommendations(
        vectorResults,
        profile,
        filters,
        limit
      );

      const result = {
        recommendations,
        ...(includeMetrics && {
          metrics: {
            totalRecommendations: recommendations.length,
            averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
            topCategories: this.extractTopRoleCategories(recommendations),
            processingTimeMs: Date.now() - startTime,
            cacheHit
          }
        })
      };

      // Cache result
      if (redisClient) {
        await redisClient.setex(cacheKey, this.cacheExpiry, JSON.stringify(result));
      }

      logger.info(`Generated ${recommendations.length} role recommendations for user ${userId}`);
      return result;

    } catch (error) {
      logger.error(`Error generating role recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get content recommendations (scripts, projects) for a user
   */
  public async getContentRecommendations(
    userId: string,
    contentType: 'script' | 'project' | 'all' = 'all',
    options: {
      limit?: number;
      filters?: RecommendationFilters;
      includeMetrics?: boolean;
    } = {}
  ): Promise<{
    recommendations: ContentRecommendation[];
    metrics?: RecommendationMetrics;
  }> {
    const startTime = Date.now();
    const { limit = 10, filters = {}, includeMetrics = false } = options;

    try {
      // Get user interests and viewing history for personalization
      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          talent: true,
          actor: true,
          // Add user interaction history for better recommendations
          // applications: {
          //   include: { role: true, project: true },
          //   orderBy: { appliedAt: 'desc' },
          //   take: 10
          // }
        }
      });

      if (!userProfile || (!userProfile.talent && !userProfile.actor)) {
        throw new Error(`User profile not found: ${userId}`);
      }
      
      const profile = userProfile.talent || userProfile.actor;

      // Build search query based on user interests
      const searchQuery = this.buildContentSearchQuery({ profile, applications: [] });
      
      // Search vector database
      const vectorResults = await vectorDatabaseService.searchContent(
        searchQuery,
        {
          topK: limit * 2,
          filter: this.buildContentVectorFilter(filters),
          contentType: contentType !== 'all' ? contentType : undefined
        }
      );

      // Enhance with database data
      const recommendations = await this.enhanceContentRecommendations(
        vectorResults,
        profile,
        filters,
        limit
      );

      const result = {
        recommendations,
        ...(includeMetrics && {
          metrics: {
            totalRecommendations: recommendations.length,
            averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
            topCategories: this.extractTopContentCategories(recommendations),
            processingTimeMs: Date.now() - startTime,
            cacheHit: false
          }
        })
      };

      logger.info(`Generated ${recommendations.length} content recommendations for user ${userId}`);
      return result;

    } catch (error) {
      logger.error(`Error generating content recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user embeddings when profile changes
   */
  public async updateUserEmbedding(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          talent: true,
          actor: true
        }
      });

      if (!user || (!user.talent && !user.actor)) {
        logger.warn(`User profile not found for embedding update: ${userId}`);
        return;
      }
      
      const profile = user.talent || user.actor;
      const profileData = {
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || '',
        skills: (profile as any)?.skills || (profile as any)?.actingSkills || [],
        experience: profile?.bio || '',
        bio: profile?.bio || '',
        location: `${(profile as any)?.currentCity || ''} ${(profile as any)?.currentState || ''}`.trim() || (profile as any)?.city || '',
        languages: (profile as any)?.languages || [],
        categories: []
      };

      await vectorDatabaseService.upsertUserProfile(userId, profileData);
      
      // Invalidate recommendation caches for this user
      await this.invalidateUserCaches(userId);
      
      logger.info(`Updated embeddings for user: ${userId}`);
    } catch (error) {
      logger.error(`Error updating user embedding for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Batch update embeddings for multiple users
   */
  public async batchUpdateUserEmbeddings(userIds: string[]): Promise<void> {
    logger.info(`Starting batch embedding update for ${userIds.length} users`);

    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (userId) => {
          try {
            await this.updateUserEmbedding(userId);
            processed++;
          } catch (error) {
            logger.error(`Failed to update embedding for user ${userId}:`, error);
          }
        })
      );

      logger.info(`Processed ${processed}/${userIds.length} user embeddings`);
      
      // Small delay to prevent overwhelming the system
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`Batch embedding update completed: ${processed}/${userIds.length} successful`);
  }

  // Private helper methods
  private buildRoleSearchQuery(role: any): string {
    const parts = [
      role.name,
      role.description,
      role.requiredSkills?.join(' '),
      role.languages?.join(' ')
    ].filter(Boolean);

    return parts.join(' ');
  }

  private buildUserSearchQuery(profile: any): string {
    const parts = [
      (profile as any).skills?.join(' ') || (profile as any).actingSkills?.join(' '),
      profile.bio,
      (profile as any).yearsOfExperience || (profile as any).experience,
      (profile as any).currentCity || (profile as any).city,
      (profile as any).languages?.join(' ')
    ].filter(Boolean);

    return parts.join(' ');
  }

  private buildContentSearchQuery(data: { profile: any; applications: any[] }): string {
    const parts = [
      (data.profile as any).skills?.join(' ') || (data.profile as any).actingSkills?.join(' '),
      (data.profile as any).languages?.join(' '),
      data.applications?.map((app: any) => app.role?.description || app.project?.genre?.join(' ')).join(' ')
    ].filter(Boolean);

    return parts.join(' ');
  }

  private buildVectorFilter(filters: RecommendationFilters): Record<string, any> {
    const filter: Record<string, any> = {};

    if (filters.location?.length) {
      filter.location = { $in: filters.location };
    }

    if (filters.categories?.length) {
      filter.categories = { $in: filters.categories };
    }

    if (filters.languages?.length) {
      filter.languages = { $in: filters.languages };
    }

    return filter;
  }

  private buildContentVectorFilter(filters: RecommendationFilters): Record<string, any> {
    const filter: Record<string, any> = {};

    if (filters.categories?.length) {
      filter.category = { $in: filters.categories };
    }

    return filter;
  }

  private async enhanceTalentRecommendations(
    vectorResults: VectorSearchResult[],
    role: any,
    filters: RecommendationFilters,
    limit: number
  ): Promise<TalentRecommendation[]> {
    const userIds = vectorResults.map(r => r.id);
    
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        ...(filters.excludeUserIds?.length && { id: { notIn: filters.excludeUserIds } })
      },
      include: {
        talent: true,
        actor: true
      }
    });

    const recommendations: TalentRecommendation[] = [];

    for (const vectorResult of vectorResults) {
      const user = users.find(u => u.id === vectorResult.id);
      if (!user || (!user.talent && !user.actor)) continue;

      const profile = user.talent || user.actor;

      // Apply additional filters
      const isAvailable = (profile as any)?.availabilityStatus === 'AVAILABLE' || true;
      if (filters.availability !== undefined && isAvailable !== filters.availability) {
        continue;
      }

      // Calculate match score and reasons
      const { score, matchReasons } = this.calculateTalentMatchScore(
        vectorResult.score,
        profile,
        role
      );

      if (score < (filters.minScore || this.minRecommendationScore)) {
        continue;
      }

      recommendations.push({
        userId: user.id,
        name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || '',
        profilePicture: profile?.profileImageUrl || undefined,
        score,
        matchReasons,
        skills: (profile as any)?.skills || (profile as any)?.actingSkills || [],
        experience: profile?.bio || '',
        location: `${(profile as any)?.currentCity || ''} ${(profile as any)?.currentState || ''}`.trim() || (profile as any)?.city || '',
        availability: isAvailable,
        categories: [],
        languages: (profile as any)?.languages || [],
        profileCompleteness: this.calculateProfileCompleteness(profile)
      });

      if (recommendations.length >= limit) break;
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private async enhanceRoleRecommendations(
    vectorResults: VectorSearchResult[],
    userProfile: any,
    filters: RecommendationFilters,
    limit: number
  ): Promise<RoleRecommendation[]> {
    const roleIds = vectorResults.map(r => r.id);
    
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      include: {
        project: true
      }
    });

    const recommendations: RoleRecommendation[] = [];

    for (const vectorResult of vectorResults) {
      const role = roles.find(r => r.id === vectorResult.id);
      if (!role) continue;

      // Apply budget filters
      if (filters.budgetRange && role.compensation) {
        const budgetInRange = role.compensation <= filters.budgetRange.max &&
          role.compensation >= filters.budgetRange.min;
        if (!budgetInRange) continue;
      }

      const { score, matchReasons } = this.calculateRoleMatchScore(
        vectorResult.score,
        role,
        userProfile
      );

      if (score < (filters.minScore || this.minRecommendationScore)) {
        continue;
      }

      recommendations.push({
        roleId: role.id,
        title: role.name,
        description: role.description || '',
        score,
        matchReasons,
        requiredSkills: role.requiredSkills || [],
        category: role.project?.genre?.[0] || '',
        location: role.project?.shootingLocations?.[0] || '',
        budget: role.compensation ? {
          min: role.compensation,
          max: role.compensation,
          currency: 'INR'
        } : undefined,
        timeline: {
          startDate: role.project?.shootingStartDate || undefined,
          endDate: role.project?.shootingEndDate || undefined,
          duration: role.numberOfDays ? `${role.numberOfDays} days` : undefined
        }
      });

      if (recommendations.length >= limit) break;
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private async enhanceContentRecommendations(
    vectorResults: VectorSearchResult[],
    userProfile: any,
    filters: RecommendationFilters,
    limit: number
  ): Promise<ContentRecommendation[]> {
    // This would be enhanced based on your content model structure
    const recommendations: ContentRecommendation[] = [];

    for (const vectorResult of vectorResults) {
      if (!vectorResult.metadata) continue;

      const { score, matchReasons } = this.calculateContentMatchScore(
        vectorResult.score,
        vectorResult.metadata,
        userProfile
      );

      if (score < (filters.minScore || this.minRecommendationScore)) {
        continue;
      }

      recommendations.push({
        contentId: vectorResult.id,
        title: vectorResult.metadata.title as string,
        description: vectorResult.metadata.description as string,
        score,
        matchReasons,
        tags: (vectorResult.metadata.tags as string[]) || [],
        category: vectorResult.metadata.category as string,
        type: vectorResult.metadata.type as 'role' | 'script' | 'project'
      });

      if (recommendations.length >= limit) break;
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private calculateTalentMatchScore(
    vectorScore: number,
    userProfile: any,
    role: any
  ): { score: number; matchReasons: string[] } {
    let score = vectorScore;
    const matchReasons: string[] = [];

    // Skill matching boost
    const userSkills = new Set(((userProfile as any).skills || (userProfile as any).actingSkills || []).map((s: string) => s.toLowerCase()));
    const roleSkills = new Set((role.requiredSkills || []).map((s: string) => s.toLowerCase()));
    const skillOverlap = [...userSkills].filter(skill => roleSkills.has(skill));
    
    if (skillOverlap.length > 0) {
      const skillBoost = Math.min(0.2, skillOverlap.length * 0.05);
      score += skillBoost;
      matchReasons.push(`${skillOverlap.length} matching skills: ${skillOverlap.slice(0, 3).join(', ')}`);
    }

    // Location matching
    const userLocation = (userProfile as any).currentCity || (userProfile as any).city;
    const roleLocation = role.project?.shootingLocations?.[0];
    if (userLocation && roleLocation && 
        userLocation.toLowerCase().includes(roleLocation.toLowerCase())) {
      score += 0.1;
      matchReasons.push(`Location match: ${roleLocation}`);
    }

    // Experience level matching
    if (userProfile.experience && role.experienceRequired) {
      // Simple experience matching logic - could be enhanced
      score += 0.05;
      matchReasons.push('Experience level match');
    }

    // Profile completeness bonus
    const completeness = this.calculateProfileCompleteness(userProfile);
    if (completeness > 0.8) {
      score += 0.05;
      matchReasons.push('Complete profile');
    }

    return { score: Math.min(score, 1), matchReasons };
  }

  private calculateRoleMatchScore(
    vectorScore: number,
    role: any,
    userProfile: any
  ): { score: number; matchReasons: string[] } {
    let score = vectorScore;
    const matchReasons: string[] = [];

    // Skill matching
    const userSkills = new Set(((userProfile as any).skills || (userProfile as any).actingSkills || []).map((s: string) => s.toLowerCase()));
    const roleSkills = new Set((role.requiredSkills || []).map((s: string) => s.toLowerCase()));
    const skillOverlap = [...roleSkills].filter(skill => userSkills.has(skill));
    
    if (skillOverlap.length > 0) {
      const skillBoost = Math.min(0.3, skillOverlap.length * 0.1);
      score += skillBoost;
      matchReasons.push(`You have ${skillOverlap.length} required skills`);
    }

    // Genre matching (using project genre as category)
    const roleGenre = role.project?.genre?.[0];
    if (roleGenre) {
      score += 0.15;
      matchReasons.push(`Genre match: ${roleGenre}`);
    }

    // Budget appropriateness (if user has rate preferences)
    const userRate = (userProfile as any).preferredRate || (userProfile as any).minimumRate;
    if (userRate && role.compensation) {
      if (role.compensation >= userRate) {
        score += 0.1;
        matchReasons.push('Budget meets expectations');
      }
    }

    return { score: Math.min(score, 1), matchReasons };
  }

  private calculateContentMatchScore(
    vectorScore: number,
    metadata: any,
    userProfile: any
  ): { score: number; matchReasons: string[] } {
    let score = vectorScore;
    const matchReasons: string[] = [];

    // Category matching (simplified as categories don't exist in our schema)
    if (metadata.category) {
      score += 0.1;
      matchReasons.push(`Matches ${metadata.category} content`);
    }

    // Tags matching skills
    if (metadata.tags && Array.isArray(metadata.tags)) {
      const userSkills = new Set(((userProfile as any).skills || (userProfile as any).actingSkills || []).map((s: string) => s.toLowerCase()));
      const matchingTags = metadata.tags.filter((tag: string) => 
        userSkills.has(tag.toLowerCase())
      );
      
      if (matchingTags.length > 0) {
        score += Math.min(0.15, matchingTags.length * 0.05);
        matchReasons.push(`Relevant to your skills: ${matchingTags.slice(0, 2).join(', ')}`);
      }
    }

    return { score: Math.min(score, 1), matchReasons };
  }

  private calculateProfileCompleteness(profile: any): number {
    if (!profile) return 0;
    
    const fields = [
      'bio', 'firstName', 'lastName'
    ];
    
    let completedFields = 0;
    fields.forEach(field => {
      if (profile[field] && typeof profile[field] === 'string' && profile[field].trim()) {
        completedFields++;
      }
    });

    // Location check (different fields for different models)
    if ((profile as any).currentCity || (profile as any).city) completedFields++;
    
    // Profile image check
    if ((profile as any).profileImageUrl || (profile as any).profilePicture) completedFields++;

    // Add points for arrays
    if ((profile as any).skills?.length > 0 || (profile as any).actingSkills?.length > 0) completedFields++;
    if ((profile as any).languages?.length > 0) completedFields++;

    return completedFields / 7; // Total possible fields
  }

  private extractTopCategories(recommendations: TalentRecommendation[]): string[] {
    const categoryCounts: Record<string, number> = {};
    
    recommendations.forEach(rec => {
      rec.categories.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);
  }

  private extractTopRoleCategories(recommendations: RoleRecommendation[]): string[] {
    const categoryCounts: Record<string, number> = {};
    
    recommendations.forEach(rec => {
      if (rec.category) {
        categoryCounts[rec.category] = (categoryCounts[rec.category] || 0) + 1;
      }
    });

    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);
  }

  private extractTopContentCategories(recommendations: ContentRecommendation[]): string[] {
    const categoryCounts: Record<string, number> = {};
    
    recommendations.forEach(rec => {
      if (rec.category) {
        categoryCounts[rec.category] = (categoryCounts[rec.category] || 0) + 1;
      }
    });

    return Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);
  }

  private generateCacheKey(type: string, id: string, filters: RecommendationFilters): string {
    const filterStr = JSON.stringify(filters);
    return `${this.cachePrefix}${type}:${id}:${Buffer.from(filterStr).toString('base64')}`;
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    if (!redisClient) return;

    try {
      const pattern = `${this.cachePrefix}*${userId}*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info(`Invalidated ${keys.length} cache entries for user ${userId}`);
      }
    } catch (error) {
      logger.warn('Error invalidating user caches:', error);
    }
  }

  /**
   * Health check for recommendation service
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const vectorDbHealth = await vectorDatabaseService.healthCheck();
      const embeddingHealth = await embeddingService.healthCheck();

      const isHealthy = vectorDbHealth.status === 'healthy' && embeddingHealth.status === 'healthy';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          vectorDatabase: vectorDbHealth,
          embeddingService: embeddingHealth,
          cacheEnabled: !!redisClient
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
export const recommendationService = new RecommendationService();