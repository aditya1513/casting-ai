/**
 * Talent Service
 * Business logic for talent search, discovery, and management
 */

import { prisma } from '../config/database';
import { CacheManager, CacheKeys } from '../config/redis';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Prisma, Talent, SavedSearch, TalentBookmark } from '@prisma/client';

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
 * Talent with relations type
 */
export type TalentWithRelations = Talent & {
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
   * Search talents with advanced filtering
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
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TalentWhereInput = {
      isActive: true,
    };

    // Search term filter (name, skills, bio)
    if (params.searchTerm) {
      where.OR = [
        { firstName: { contains: params.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: params.searchTerm, mode: 'insensitive' } },
        { displayName: { contains: params.searchTerm, mode: 'insensitive' } },
        { bio: { contains: params.searchTerm, mode: 'insensitive' } },
        { searchTags: { hasSome: [params.searchTerm.toLowerCase()] } },
        { actingSkills: { hasSome: [params.searchTerm] } },
        { specialSkills: { hasSome: [params.searchTerm] } },
      ];
    }

    // Age range filter
    if (params.ageMin || params.ageMax) {
      const now = new Date();
      const minDate = params.ageMax 
        ? new Date(now.getFullYear() - params.ageMax, now.getMonth(), now.getDate())
        : undefined;
      const maxDate = params.ageMin
        ? new Date(now.getFullYear() - params.ageMin, now.getMonth(), now.getDate())
        : undefined;

      where.dateOfBirth = {
        ...(minDate && { gte: minDate }),
        ...(maxDate && { lte: maxDate }),
      };
    }

    // Gender filter
    if (params.gender) {
      where.gender = params.gender as any;
    }

    // Location filter
    if (params.location) {
      where.OR = [
        { currentCity: { contains: params.location, mode: 'insensitive' } },
        { currentState: { contains: params.location, mode: 'insensitive' } },
        { hometown: { contains: params.location, mode: 'insensitive' } },
        { preferredLocations: { hasSome: [params.location] } },
      ];
    }

    // Languages filter
    if (params.languages && params.languages.length > 0) {
      where.languages = { hasSome: params.languages };
    }

    // Skills filter
    if (params.skills && params.skills.length > 0) {
      where.OR = [
        { actingSkills: { hasSome: params.skills } },
        { specialSkills: { hasSome: params.skills } },
        { danceSkills: { hasSome: params.skills } },
        { martialArts: { hasSome: params.skills } },
        { musicalInstruments: { hasSome: params.skills } },
        { singingSkills: { hasSome: params.skills } },
      ];
    }

    // Experience level filter
    if (params.experienceLevel) {
      const experienceMap = {
        FRESHER: { min: 0, max: 2 },
        INTERMEDIATE: { min: 2, max: 5 },
        EXPERIENCED: { min: 5, max: 10 },
        VETERAN: { min: 10, max: 100 },
      };
      const range = experienceMap[params.experienceLevel];
      where.yearsOfExperience = {
        gte: range.min,
        lt: range.max,
      };
    }

    // Availability filter
    if (params.availability) {
      const now = new Date();
      const availabilityMap = {
        IMMEDIATE: 'AVAILABLE',
        WITHIN_WEEK: 'AVAILABLE',
        WITHIN_MONTH: 'AVAILABLE',
        FLEXIBLE: 'BUSY',
      };
      
      where.availabilityStatus = availabilityMap[params.availability] as any;
      
      if (params.availability === 'IMMEDIATE') {
        where.availableFrom = { lte: now };
      } else if (params.availability === 'WITHIN_WEEK') {
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        where.availableFrom = { lte: weekFromNow };
      } else if (params.availability === 'WITHIN_MONTH') {
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        where.availableFrom = { lte: monthFromNow };
      }
    }

    // Rating filter
    if (params.minRating) {
      where.rating = { gte: params.minRating };
    }

    // Verified filter
    if (params.verified !== undefined) {
      where.isVerified = params.verified;
    }

    // Build orderBy clause
    let orderBy: Prisma.TalentOrderByWithRelationInput | Prisma.TalentOrderByWithRelationInput[] = {};
    
    switch (params.sortBy) {
      case 'rating':
        orderBy = { rating: params.sortOrder || 'desc' };
        break;
      case 'experience':
        orderBy = { yearsOfExperience: params.sortOrder || 'desc' };
        break;
      case 'recentlyActive':
        orderBy = { lastActiveAt: params.sortOrder || 'desc' };
        break;
      case 'createdAt':
        orderBy = { createdAt: params.sortOrder || 'desc' };
        break;
      case 'relevance':
      default:
        // For relevance, prioritize verified, then rating, then activity
        orderBy = [
          { isVerified: 'desc' },
          { rating: 'desc' },
          { lastActiveAt: 'desc' },
        ];
        break;
    }

    // Execute query with transaction for consistency
    const [talents, total] = await prisma.$transaction([
      prisma.talent.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          physicalAttributes: true,
          workExperiences: {
            orderBy: { year: 'desc' },
            take: 5,
          },
          achievements: {
            orderBy: { year: 'desc' },
            take: 3,
          },
          media: {
            where: { isPrimary: true },
            take: 1,
          },
          user: {
            select: {
              id: true,
              email: true,
              isEmailVerified: true,
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
      }),
      prisma.talent.count({ where }),
    ]);

    return {
      talents,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    };
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