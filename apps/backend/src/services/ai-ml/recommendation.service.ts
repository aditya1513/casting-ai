import { vectorDatabaseService, VectorSearchResult } from './vectorDatabase.service';
import { embeddingService } from './embedding.service';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { 
  users, 
  talentProfiles, 
  projects, 
  projectRoles, 
  applications,
  User,
  TalentProfile,
  Project,
  ProjectRole
} from '../../models/schema';
import { eq, inArray, and, desc, sql } from 'drizzle-orm';

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

      if (redis) {
        const cached = await redis.get(cacheKey);
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
      const roleResult = await db
        .select()
        .from(projectRoles)
        .leftJoin(projects, eq(projectRoles.projectId, projects.id))
        .where(eq(projectRoles.id, roleId))
        .limit(1);

      if (roleResult.length === 0) {
        throw new Error(`Role not found: ${roleId}`);
      }

      const role = roleResult[0].project_roles;
      const project = roleResult[0].projects;

      // Create search query from role requirements
      const searchQuery = this.buildRoleSearchQuery(role, project);
      
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
      if (redis) {
        await redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(result));
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

      if (redis) {
        const cached = await redis.get(cacheKey);
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

      // Get user profile with Drizzle
      const userResult = await db
        .select()
        .from(users)
        .leftJoin(talentProfiles, eq(users.id, talentProfiles.userId))
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0 || !userResult[0].talent_profiles) {
        throw new Error(`User profile not found: ${userId}`);
      }
      
      const user = userResult[0].users;
      const profile = userResult[0].talent_profiles;

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
      if (redis) {
        await redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(result));
      }

      logger.info(`Generated ${recommendations.length} role recommendations for user ${userId}`);
      return result;

    } catch (error) {
      logger.error(`Error generating role recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user embeddings when profile changes
   */
  public async updateUserEmbedding(userId: string): Promise<void> {
    try {
      const userResult = await db
        .select()
        .from(users)
        .leftJoin(talentProfiles, eq(users.id, talentProfiles.userId))
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        logger.warn(`User profile not found for embedding update: ${userId}`);
        return;
      }

      const user = userResult[0].users;
      const profile = userResult[0].talent_profiles;
      
      if (!profile) {
        logger.warn(`No talent profile found for user: ${userId}`);
        return;
      }

      const profileData = {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        skills: (profile.skills as string[]) || [],
        experience: user.bio || '',
        bio: user.bio || '',
        location: profile.city || '',
        languages: (profile.languages as string[]) || [],
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

  // Private helper methods
  private buildRoleSearchQuery(role: ProjectRole, project?: Project | null): string {
    const parts = [
      role.roleName,
      role.description,
      (role.skills as string[])?.join(' '),
      (role.languages as string[])?.join(' '),
      project?.title,
      project?.description
    ].filter(Boolean);

    return parts.join(' ');
  }

  private buildUserSearchQuery(profile: TalentProfile): string {
    const parts = [
      (profile.skills as string[])?.join(' '),
      profile.city,
      (profile.languages as string[])?.join(' ')
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
    role: ProjectRole,
    filters: RecommendationFilters,
    limit: number
  ): Promise<TalentRecommendation[]> {
    if (vectorResults.length === 0) return [];

    const userIds = vectorResults.map(r => r.id);
    
    const userResults = await db
      .select()
      .from(users)
      .leftJoin(talentProfiles, eq(users.id, talentProfiles.userId))
      .where(and(
        inArray(users.id, userIds),
        ...(filters.excludeUserIds?.length ? [sql`${users.id} NOT IN (${filters.excludeUserIds.join(', ')})`] : [])
      ));

    const recommendations: TalentRecommendation[] = [];

    for (const vectorResult of vectorResults) {
      const userResult = userResults.find(ur => ur.users.id === vectorResult.id);
      if (!userResult || !userResult.talent_profiles) continue;

      const user = userResult.users;
      const profile = userResult.talent_profiles;

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
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        profilePicture: user.profileImage || undefined,
        score,
        matchReasons,
        skills: (profile.skills as string[]) || [],
        experience: user.bio || '',
        location: profile.city || '',
        availability: true, // TODO: implement availability check
        categories: [],
        languages: (profile.languages as string[]) || [],
        profileCompleteness: this.calculateProfileCompleteness(profile, user)
      });

      if (recommendations.length >= limit) break;
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private async enhanceRoleRecommendations(
    vectorResults: VectorSearchResult[],
    userProfile: TalentProfile,
    filters: RecommendationFilters,
    limit: number
  ): Promise<RoleRecommendation[]> {
    if (vectorResults.length === 0) return [];

    const roleIds = vectorResults.map(r => r.id);
    
    const roleResults = await db
      .select()
      .from(projectRoles)
      .leftJoin(projects, eq(projectRoles.projectId, projects.id))
      .where(inArray(projectRoles.id, roleIds));

    const recommendations: RoleRecommendation[] = [];

    for (const vectorResult of vectorResults) {
      const roleResult = roleResults.find(rr => rr.project_roles.id === vectorResult.id);
      if (!roleResult) continue;

      const role = roleResult.project_roles;
      const project = roleResult.projects;

      // Apply budget filters
      if (filters.budgetRange && role.budget && typeof role.budget === 'number') {
        const budgetInRange = role.budget <= filters.budgetRange.max &&
          role.budget >= filters.budgetRange.min;
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
        title: role.roleName,
        description: role.description || '',
        score,
        matchReasons,
        requiredSkills: (role.skills as string[]) || [],
        category: (project?.genre as string[])?.[0] || '',
        location: project?.shootingLocation ? (project.shootingLocation as string[])?.[0] || '' : '',
        budget: role.budget && typeof role.budget === 'number' ? {
          min: role.budget,
          max: role.budget,
          currency: 'INR'
        } : undefined,
        timeline: {
          startDate: project?.startDate || undefined,
          endDate: project?.endDate || undefined,
        }
      });

      if (recommendations.length >= limit) break;
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private calculateTalentMatchScore(
    vectorScore: number,
    userProfile: TalentProfile,
    role: ProjectRole
  ): { score: number; matchReasons: string[] } {
    let score = vectorScore;
    const matchReasons: string[] = [];

    // Skill matching boost
    const userSkills = new Set(((userProfile.skills as string[]) || []).map(s => s.toLowerCase()));
    const roleSkills = new Set(((role.skills as string[]) || []).map(s => s.toLowerCase()));
    const skillOverlap = [...userSkills].filter(skill => roleSkills.has(skill));
    
    if (skillOverlap.length > 0) {
      const skillBoost = Math.min(0.2, skillOverlap.length * 0.05);
      score += skillBoost;
      matchReasons.push(`${skillOverlap.length} matching skills: ${skillOverlap.slice(0, 3).join(', ')}`);
    }

    // Location matching
    const userLocation = userProfile.city;
    // For now, we'll skip complex location matching since project location is complex
    if (userLocation) {
      score += 0.05;
      matchReasons.push(`Location: ${userLocation}`);
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
    role: ProjectRole,
    userProfile: TalentProfile
  ): { score: number; matchReasons: string[] } {
    let score = vectorScore;
    const matchReasons: string[] = [];

    // Skill matching
    const userSkills = new Set(((userProfile.skills as string[]) || []).map(s => s.toLowerCase()));
    const roleSkills = new Set(((role.skills as string[]) || []).map(s => s.toLowerCase()));
    const skillOverlap = [...roleSkills].filter(skill => userSkills.has(skill));
    
    if (skillOverlap.length > 0) {
      const skillBoost = Math.min(0.3, skillOverlap.length * 0.1);
      score += skillBoost;
      matchReasons.push(`You have ${skillOverlap.length} required skills`);
    }

    // Budget appropriateness
    if (role.budget && typeof role.budget === 'number') {
      score += 0.1;
      matchReasons.push('Budget available');
    }

    return { score: Math.min(score, 1), matchReasons };
  }

  private calculateProfileCompleteness(profile: TalentProfile, user?: User): number {
    if (!profile) return 0;
    
    let completedFields = 0;
    let totalFields = 7;

    // Basic profile fields
    if (user?.firstName?.trim()) completedFields++;
    if (user?.lastName?.trim()) completedFields++;
    if (user?.bio?.trim()) completedFields++;
    
    // Talent profile fields
    if (profile.city?.trim()) completedFields++;
    if (user?.profileImage) completedFields++;
    if ((profile.skills as string[])?.length > 0) completedFields++;
    if ((profile.languages as string[])?.length > 0) completedFields++;

    return completedFields / totalFields;
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

  private generateCacheKey(type: string, id: string, filters: RecommendationFilters): string {
    const filterStr = JSON.stringify(filters);
    return `${this.cachePrefix}${type}:${id}:${Buffer.from(filterStr).toString('base64')}`;
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    if (!redis) return;

    try {
      const pattern = `${this.cachePrefix}*${userId}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
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
      // Test database connection
      const testQuery = await db.select().from(users).limit(1);
      
      // Test vector database if available
      let vectorDbHealth: any = { status: 'healthy' };
      try {
        vectorDbHealth = await vectorDatabaseService.healthCheck();
      } catch (error) {
        vectorDbHealth = { status: 'unhealthy', error: 'Vector database unavailable' };
      }

      // Test embedding service if available  
      let embeddingHealth: any = { status: 'healthy' };
      try {
        embeddingHealth = await embeddingService.healthCheck();
      } catch (error) {
        embeddingHealth = { status: 'unhealthy', error: 'Embedding service unavailable' };
      }

      const isHealthy = vectorDbHealth.status === 'healthy' && embeddingHealth.status === 'healthy';

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          database: 'connected',
          vectorDatabase: vectorDbHealth,
          embeddingService: embeddingHealth,
          cacheEnabled: !!redis
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