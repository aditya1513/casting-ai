/**
 * Talent Service
 * Business logic for talent search, discovery, and management
 */

import { db } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { talents } from '../db/schema';
import { eq, and, gte, lte, ilike, desc, asc } from 'drizzle-orm';

/**
 * Search parameters interface
 */
export interface TalentSearchParams {
  searchTerm?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  location?: string;
  languages?: string[];
  skills?: string[];
  experienceLevel?: 'FRESHER' | 'INTERMEDIATE' | 'EXPERIENCED' | 'VETERAN';
  availability?: 'IMMEDIATE' | 'WITHIN_WEEK' | 'WITHIN_MONTH' | 'FLEXIBLE';
  minRating?: number;
  verified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'rating' | 'experience' | 'recentlyActive' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Talent with relations type - using Drizzle inferred types
 */
export type TalentWithRelations = typeof talents.$inferSelect & {
  physicalAttributes?: any;
  workExperiences?: any[];
  achievements?: any[];
  media?: any[];
  user?: any;
  reviews?: any[];
  _count?: {
    reviews?: number;
    applications?: number;
    auditions?: number;
    bookmarks?: number;
  };
};

/**
 * Suggestion response interface
 */
export interface SuggestionResponse {
  skills: string[];
  languages: string[];
  locations: string[];
  specializations: string[];
}

export class TalentService {
  /**
   * Search talents with basic filtering (Drizzle implementation)
   */
  static async searchTalents(params: TalentSearchParams): Promise<{
    talents: TalentWithRelations[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    try {
      // Build where conditions using Drizzle
      const conditions = [eq(talents.isActive, true)];

      // Search term filter (basic implementation)
      if (params.searchTerm) {
        conditions.push(ilike(talents.firstName, `%${params.searchTerm}%`));
      }

      // Gender filter
      if (params.gender) {
        conditions.push(eq(talents.gender, params.gender as any));
      }

      // Location filter
      if (params.location) {
        conditions.push(ilike(talents.currentCity, `%${params.location}%`));
      }

      // Combine conditions
      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      // Execute query
      const talentResults = await db.select()
        .from(talents)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(talents.createdAt));

      // Get total count for pagination
      const totalResults = await db.select({ count: talents.id })
        .from(talents)
        .where(whereClause);
      
      const total = totalResults.length;
      const hasMore = offset + talentResults.length < total;

      logger.info(`Talent search completed: ${talentResults.length} results`);

      return {
        talents: talentResults as TalentWithRelations[],
        total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      logger.error('Error searching talents:', error);
      throw new AppError('Failed to search talents', 500);
    }
  }

  /**
   * Get talent profile by ID
   */
  static async getTalentById(
    talentId: string,
    viewerId?: string
  ): Promise<TalentWithRelations | null> {
    // Try to get from cache first
    const cacheKey = CacheKeys.talent(talentId);
    const cached = await CacheManager.get<TalentWithRelations>(cacheKey);
    
    if (cached) {
      // Track profile view asynchronously
      if (viewerId && viewerId !== cached.userId) {
        this.trackProfileView(talentId, viewerId).catch(error => {
          logger.error('Failed to track profile view:', error);
        });
      }
      return cached;
    }

    // Fetch from database
    const talent = await prisma.talent.findUnique({
      where: { id: talentId },
      include: {
        physicalAttributes: true,
        workExperiences: {
          orderBy: { year: 'desc' },
        },
        achievements: {
          orderBy: { year: 'desc' },
        },
        educations: {
          orderBy: { startYear: 'desc' },
        },
        media: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        user: {
          select: {
            id: true,
            email: true,
            isEmailVerified: true,
            lastLoginAt: true,
          },
        },
        reviews: {
          where: { isVerified: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            applications: true,
            auditions: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!talent) {
      return null;
    }

    // Cache the result
    await CacheManager.set(cacheKey, talent, 300); // 5 minutes

    // Track profile view asynchronously
    if (viewerId && viewerId !== talent.userId) {
      this.trackProfileView(talentId, viewerId).catch(error => {
        logger.error('Failed to track profile view:', error);
      });
    }

    return talent;
  }

  /**
   * Get featured talents
   */
  static async getFeaturedTalents(limit: number = 20): Promise<TalentWithRelations[]> {
    // Check cache first
    const cacheKey = 'featured_talents';
    const cached = await CacheManager.get<TalentWithRelations[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Fetch featured talents (verified, high rating, recently active)
    const talents = await prisma.talent.findMany({
      where: {
        isActive: true,
        isVerified: true,
        rating: { gte: 4.0 },
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
        },
      },
      orderBy: [
        { rating: 'desc' },
        { totalBookings: 'desc' },
        { lastActiveAt: 'desc' },
      ],
      take: limit,
      include: {
        physicalAttributes: true,
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        user: {
          select: {
            id: true,
            email: true,
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

    // Cache for 1 hour
    await CacheManager.set(cacheKey, talents, 3600);

    return talents;
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(query?: string): Promise<SuggestionResponse> {
    // Check cache first
    const cacheKey = `suggestions:${query || 'all'}`;
    const cached = await CacheManager.get<SuggestionResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Aggregate unique values from database
    const [skills, languages, locations] = await Promise.all([
      // Get unique skills
      prisma.talent.findMany({
        where: query ? {
          OR: [
            { actingSkills: { hasSome: [query] } },
            { specialSkills: { hasSome: [query] } },
            { danceSkills: { hasSome: [query] } },
          ],
        } : undefined,
        select: {
          actingSkills: true,
          specialSkills: true,
          danceSkills: true,
          martialArts: true,
          musicalInstruments: true,
          singingSkills: true,
        },
        take: 100,
      }),
      
      // Get unique languages
      prisma.talent.findMany({
        where: query ? {
          languages: { hasSome: [query] },
        } : undefined,
        select: { languages: true },
        take: 100,
      }),
      
      // Get unique locations
      prisma.talent.findMany({
        where: query ? {
          OR: [
            { currentCity: { contains: query, mode: 'insensitive' } },
            { currentState: { contains: query, mode: 'insensitive' } },
          ],
        } : undefined,
        select: {
          currentCity: true,
          currentState: true,
        },
        take: 100,
      }),
    ]);

    // Extract and deduplicate values
    const uniqueSkills = new Set<string>();
    skills.forEach(talent => {
      talent.actingSkills?.forEach(skill => uniqueSkills.add(skill));
      talent.specialSkills?.forEach(skill => uniqueSkills.add(skill));
      talent.danceSkills?.forEach(skill => uniqueSkills.add(skill));
      talent.martialArts?.forEach(skill => uniqueSkills.add(skill));
      talent.musicalInstruments?.forEach(skill => uniqueSkills.add(skill));
      talent.singingSkills?.forEach(skill => uniqueSkills.add(skill));
    });

    const uniqueLanguages = new Set<string>();
    languages.forEach(talent => {
      talent.languages?.forEach(lang => uniqueLanguages.add(lang));
    });

    const uniqueLocations = new Set<string>();
    locations.forEach(talent => {
      if (talent.currentCity) uniqueLocations.add(talent.currentCity);
      if (talent.currentState) uniqueLocations.add(talent.currentState);
    });

    const suggestions: SuggestionResponse = {
      skills: Array.from(uniqueSkills).slice(0, 20),
      languages: Array.from(uniqueLanguages).slice(0, 20),
      locations: Array.from(uniqueLocations).slice(0, 20),
      specializations: [
        'Method Acting',
        'Improv',
        'Voice Acting',
        'Stunt Performance',
        'Dance',
        'Singing',
        'Comedy',
        'Drama',
        'Action',
        'Romance',
      ],
    };

    // Cache for 30 minutes
    await CacheManager.set(cacheKey, suggestions, 1800);

    return suggestions;
  }

  /**
   * Save search criteria
   */
  static async saveSearch(
    userId: string,
    name: string,
    criteria: TalentSearchParams,
    receiveAlerts: boolean = false
  ): Promise<SavedSearch> {
    // Check if user has reached saved search limit
    const count = await prisma.savedSearch.count({
      where: { userId },
    });

    if (count >= 10) {
      throw new AppError('Maximum saved searches limit reached (10)', 400);
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        name,
        criteria: criteria as any,
        receiveAlerts,
      },
    });

    return savedSearch;
  }

  /**
   * Toggle bookmark for a talent
   */
  static async toggleBookmark(
    userId: string,
    talentId: string
  ): Promise<{ bookmarked: boolean }> {
    // Check if bookmark exists
    const existing = await prisma.talentBookmark.findUnique({
      where: {
        userId_talentId: {
          userId,
          talentId,
        },
      },
    });

    if (existing) {
      // Remove bookmark
      await prisma.talentBookmark.delete({
        where: { id: existing.id },
      });
      return { bookmarked: false };
    } else {
      // Add bookmark
      await prisma.talentBookmark.create({
        data: {
          userId,
          talentId,
        },
      });
      return { bookmarked: true };
    }
  }

  /**
   * Get user's bookmarked talents
   */
  static async getBookmarkedTalents(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    talents: TalentWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await prisma.$transaction([
      prisma.talentBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          talent: {
            include: {
              physicalAttributes: true,
              media: {
                where: { isPrimary: true },
                take: 1,
              },
              user: {
                select: {
                  id: true,
                  email: true,
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
          },
        },
      }),
      prisma.talentBookmark.count({ where: { userId } }),
    ]);

    return {
      talents: bookmarks.map(b => b.talent),
      total,
      page,
      limit,
    };
  }

  /**
   * Track profile view
   */
  private static async trackProfileView(
    talentId: string,
    viewerId: string
  ): Promise<void> {
    try {
      // Record view in analytics (implement based on your analytics system)
      await prisma.profileView.create({
        data: {
          talentId,
          viewerId,
          viewedAt: new Date(),
        },
      });

      // Update view count in talent profile
      await prisma.talent.update({
        where: { id: talentId },
        data: {
          profileViewsCount: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error tracking profile view:', error);
    }
  }

  /**
   * Get similar talents
   */
  static async getSimilarTalents(
    talentId: string,
    limit: number = 10
  ): Promise<TalentWithRelations[]> {
    // Get the reference talent
    const talent = await prisma.talent.findUnique({
      where: { id: talentId },
      select: {
        gender: true,
        languages: true,
        actingSkills: true,
        specialSkills: true,
        currentCity: true,
        yearsOfExperience: true,
      },
    });

    if (!talent) {
      return [];
    }

    // Find similar talents based on shared attributes
    const similarTalents = await prisma.talent.findMany({
      where: {
        id: { not: talentId },
        isActive: true,
        gender: talent.gender,
        OR: [
          { languages: { hasSome: talent.languages } },
          { actingSkills: { hasSome: talent.actingSkills } },
          { specialSkills: { hasSome: talent.specialSkills } },
          { currentCity: talent.currentCity },
        ],
        yearsOfExperience: {
          gte: Math.max(0, talent.yearsOfExperience - 3),
          lte: talent.yearsOfExperience + 3,
        },
      },
      orderBy: [
        { rating: 'desc' },
        { isVerified: 'desc' },
      ],
      take: limit,
      include: {
        physicalAttributes: true,
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        user: {
          select: {
            id: true,
            email: true,
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

    return similarTalents;
  }
}