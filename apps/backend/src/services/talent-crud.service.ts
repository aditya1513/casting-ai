/**
 * Talent CRUD Service
 * Comprehensive service for managing talent profiles with validation
 * Updated to use Drizzle ORM instead of Prisma
 */

import { db } from '../db/drizzle';
import { talents } from '../models/schema.business';
// import { CacheManager, CacheKeys } from '../config/redis'; // Disabled for now
import { AppError, ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { eq, and, gte, lte, ilike, or, count, desc, asc, arrayContains, sql } from 'drizzle-orm';
import { PgSelect } from 'drizzle-orm/pg-core';

// Type definitions based on our Drizzle schema
type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE';
type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE';
type ProfileCompleteness = 'BASIC' | 'INTERMEDIATE' | 'COMPLETE' | 'PREMIUM';
type UnionStatus = 'UNION' | 'NON_UNION' | 'FICORE';

// Talent type from our schema
type Talent = typeof talents.$inferSelect;
type TalentInsert = typeof talents.$inferInsert;

interface CreateTalentInput {
  userId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  dateOfBirth: Date;
  gender: Gender;
  nationality?: string;
  primaryPhone: string;
  email: string;
  currentCity: string;
  currentState: string;
  currentPincode?: string;
  bio?: string;
  height?: number;
  weight?: number;
  languages?: string[];
  actingSkills?: string[];
  danceSkills?: string[];
  specialSkills?: string[];
}

interface UpdateTalentInput extends Partial<CreateTalentInput> {
  secondaryPhone?: string;
  whatsappNumber?: string;
  alternateEmail?: string;
  hometown?: string;
  preferredLocations?: string[];
  willingToRelocate?: boolean;
  chest?: number;
  waist?: number;
  hips?: number;
  shoeSize?: string;
  dressSize?: string;
  yearsOfExperience?: number;
  unionStatus?: UnionStatus;
  unionId?: string;
  agentId?: string;
  agencyName?: string;
  managerName?: string;
  managerContact?: string;
  martialArts?: string[];
  musicalInstruments?: string[];
  singingSkills?: string[];
  dialects?: string[];
  accents?: string[];
  marathiProficiency?: ExperienceLevel;
  hindiProficiency?: ExperienceLevel;
  englishProficiency?: ExperienceLevel;
  gujaratiProficiency?: ExperienceLevel;
  regionalExperience?: string[];
  availabilityStatus?: AvailabilityStatus;
  availableFrom?: Date;
  availableTo?: Date;
  minimumRate?: number;
  maximumRate?: number;
  preferredRate?: number;
  rateNegotiable?: boolean;
  profileImageUrl?: string;
  portfolioUrls?: string[];
  instagramHandle?: string;
  facebookProfile?: string;
  linkedinProfile?: string;
  youtubeChannel?: string;
  websiteUrl?: string;
}

interface TalentSearchFilters {
  gender?: Gender;
  ageMin?: number;
  ageMax?: number;
  heightMin?: number;
  heightMax?: number;
  weightMin?: number;
  weightMax?: number;
  currentCity?: string;
  currentState?: string;
  languages?: string[];
  actingSkills?: string[];
  danceSkills?: string[];
  specialSkills?: string[];
  availabilityStatus?: AvailabilityStatus;
  experienceLevel?: ExperienceLevel;
  isVerified?: boolean;
  minimumRate?: number;
  maximumRate?: number;
  searchQuery?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class TalentCrudService {
  /**
   * Calculate profile completeness score
   */
  private calculateProfileCompleteness(talent: any): { score: number; level: ProfileCompleteness } {
    let score = 0;
    const weights = {
      basic: 30,    // Basic info
      contact: 10,  // Contact details
      physical: 10, // Physical attributes
      skills: 20,   // Skills and languages
      media: 20,    // Media and portfolio
      professional: 10, // Professional details
    };

    // Basic information (30%)
    if (talent.firstName && talent.lastName) score += 10;
    if (talent.dateOfBirth) score += 5;
    if (talent.bio && talent.bio.length > 100) score += 10;
    if (talent.profileImageUrl) score += 5;

    // Contact details (10%)
    if (talent.primaryPhone) score += 5;
    if (talent.whatsappNumber || talent.secondaryPhone) score += 5;

    // Physical attributes (10%)
    if (talent.height && talent.weight) score += 10;

    // Skills and languages (20%)
    if (talent.languages && talent.languages.length > 0) score += 10;
    if ((talent.actingSkills?.length || 0) + (talent.specialSkills?.length || 0) > 3) score += 10;

    // Media and portfolio (20%)
    const mediaCount = talent._count?.media || 0;
    if (mediaCount >= 3) score += 10;
    if (mediaCount >= 5) score += 10;

    // Professional details (10%)
    if (talent.yearsOfExperience > 0) score += 5;
    if (talent.agencyName || talent.managerName) score += 5;

    // Determine level
    let level: ProfileCompleteness;
    if (score >= 90) level = 'VERIFIED';
    else if (score >= 75) level = 'COMPLETE';
    else if (score >= 50) level = 'ADVANCED';
    else if (score >= 30) level = 'INTERMEDIATE';
    else level = 'BASIC';

    return { score, level };
  }

  /**
   * Create new talent profile
   */
  async createTalent(input: CreateTalentInput): Promise<Talent> {
    try {
      // Check if talent profile already exists for user
      const existingTalent = await db.select()
        .from(talents)
        .where(eq(talents.userId, input.userId))
        .limit(1);

      if (existingTalent.length > 0) {
        throw new ValidationError('Talent profile already exists for this user');
      }

      // Calculate age from date of birth
      const age = Math.floor((Date.now() - input.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        throw new ValidationError('Talent must be at least 18 years old');
      }

      // Generate unique ID for the talent
      const talentId = `talent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create talent profile
      const insertData: TalentInsert = {
        id: talentId,
        ...input,
        nationality: input.nationality || 'Indian',
        yearsOfExperience: 0,
        searchTags: [
          ...input.languages || [],
          ...input.actingSkills || [],
          ...input.specialSkills || [],
          input.currentCity,
          input.gender,
        ].filter(Boolean),
        updatedAt: new Date(),
      };

      const [talent] = await db.insert(talents)
        .values(insertData)
        .returning();

      // Calculate and update profile completeness
      const { score, level } = this.calculateProfileCompleteness(talent);
      await db.update(talents)
        .set({
          profileScore: score,
          profileCompleteness: level,
        })
        .where(eq(talents.id, talent.id));

      // Get the updated talent with profile completeness
      const [updatedTalent] = await db.select()
        .from(talents)
        .where(eq(talents.id, talent.id));

      // Cache talent profile
      // await CacheManager.set(
      //   CacheKeys.talent(talent.id),
      //   updatedTalent,
      //   3600 // 1 hour
      // );

      logger.info(`Talent profile created for user ${input.userId}`);
      return updatedTalent;
    } catch (error) {
      logger.error('Error creating talent profile:', error);
      throw error;
    }
  }

  /**
   * Get talent profile by ID
   */
  async getTalentById(talentId: string, includePrivateInfo = false): Promise<Talent | null> {
    try {
      // Try cache first
      // const cached = await CacheManager.get<Talent>(CacheKeys.talent(talentId));
      // if (cached) {
      //   return cached;
      // }

      const [talent] = await db.select()
        .from(talents)
        .where(eq(talents.id, talentId))
        .limit(1);

      if (!talent) {
        return null;
      }

      // Hide sensitive information if not authorized
      if (!includePrivateInfo) {
        delete (talent as any).aadharNumber;
        delete (talent as any).panNumber;
        delete (talent as any).passportNumber;
        delete (talent as any).minimumRate;
        delete (talent as any).maximumRate;
        delete (talent as any).preferredRate;
      }

      // Update profile view count
      await db.update(talents)
        .set({ 
          profileViewsCount: talent.profileViewsCount + 1 
        })
        .where(eq(talents.id, talentId));

      // Cache the result
      // await CacheManager.set(
      //   CacheKeys.talent(talentId),
      //   talent,
      //   3600 // 1 hour
      // );

      return talent;
    } catch (error) {
      logger.error(`Error fetching talent ${talentId}:`, error);
      throw error;
    }
  }

  /**
   * Update talent profile
   */
  async updateTalent(talentId: string, userId: string, input: UpdateTalentInput): Promise<Talent> {
    try {
      // Verify ownership
      const [talent] = await db.select({ userId: talents.userId })
        .from(talents)
        .where(eq(talents.id, talentId))
        .limit(1);

      if (!talent) {
        throw new NotFoundError('Talent profile not found');
      }

      if (talent.userId !== userId) {
        throw new AppError('Unauthorized to update this profile', 403);
      }

      // Update talent profile
      const [updatedTalent] = await db.update(talents)
        .set({
          ...input,
          searchTags: [
            ...input.languages || [],
            ...input.actingSkills || [],
            ...input.specialSkills || [],
            ...input.danceSkills || [],
            input.currentCity,
          ].filter(Boolean),
          updatedAt: new Date(),
        })
        .where(eq(talents.id, talentId))
        .returning();

      // Recalculate profile completeness
      const { score, level } = this.calculateProfileCompleteness(updatedTalent);
      await db.update(talents)
        .set({
          profileScore: score,
          profileCompleteness: level,
        })
        .where(eq(talents.id, talentId));

      // Get the final updated talent
      const [finalTalent] = await db.select()
        .from(talents)
        .where(eq(talents.id, talentId));

      // Invalidate cache
      // await CacheManager.delete(CacheKeys.talent(talentId));

      logger.info(`Talent profile ${talentId} updated`);
      return finalTalent;
    } catch (error) {
      logger.error(`Error updating talent ${talentId}:`, error);
      throw error;
    }
  }

  /**
   * Search talents with filters and pagination - Optimized for AI Chat Service
   */
  async searchTalents(
    filters: TalentSearchFilters,
    pagination: PaginationOptions = {}
  ): Promise<{ talents: Talent[]; total: number; page: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Performance optimization: Use smaller limits for AI chat service
      const effectiveLimit = Math.min(limit, 50); // Cap at 50 for performance

      // Build where conditions array
      const whereConditions: any[] = [];
      
      // Status filter - handle isVerified logic or default to active
      if (filters.isVerified !== undefined) {
        // In business schema, verified means status is 'active' (not 'pending_verification')
        if (filters.isVerified) {
          whereConditions.push(eq(talents.status, 'active'));
        } else {
          whereConditions.push(eq(talents.status, 'pending_verification'));
        }
      } else {
        // Default to active status if no isVerified filter specified
        whereConditions.push(eq(talents.status, 'active'));
      }

      // Apply other filters
      if (filters.gender) {
        whereConditions.push(eq(talents.gender, filters.gender));
      }
      if (filters.currentCity) {
        whereConditions.push(eq(talents.city, filters.currentCity));
      }
      if (filters.currentState) {
        whereConditions.push(eq(talents.state, filters.currentState));
      }

      // Age filter (calculate from date of birth)
      if (filters.ageMin || filters.ageMax) {
        const now = new Date();
        if (filters.ageMax) {
          const minBirthDate = new Date(now.getFullYear() - filters.ageMax - 1, now.getMonth(), now.getDate());
          whereConditions.push(gte(talents.dateOfBirth, minBirthDate));
        }
        if (filters.ageMin) {
          const maxBirthDate = new Date(now.getFullYear() - filters.ageMin, now.getMonth(), now.getDate());
          whereConditions.push(lte(talents.dateOfBirth, maxBirthDate));
        }
      }

      // Physical attributes filters (available in business schema)
      if (filters.heightMin) whereConditions.push(gte(talents.height, filters.heightMin));
      if (filters.heightMax) whereConditions.push(lte(talents.height, filters.heightMax));
      if (filters.weightMin) whereConditions.push(gte(talents.weight, filters.weightMin));
      if (filters.weightMax) whereConditions.push(lte(talents.weight, filters.weightMax));

      // Skills filters - using the generic skills array in business schema
      if (filters.actingSkills?.length || filters.danceSkills?.length || filters.specialSkills?.length || filters.languages?.length) {
        const searchSkills = [
          ...(filters.actingSkills || []),
          ...(filters.danceSkills || []),
          ...(filters.specialSkills || []),
          ...(filters.languages || [])
        ];
        if (searchSkills.length > 0) {
          whereConditions.push(sql`${talents.skills} && ${searchSkills}`);
        }
      }

      // Full-text search (updated for business schema fields)
      if (filters.searchQuery) {
        whereConditions.push(
          or(
            ilike(talents.firstName, `%${filters.searchQuery}%`),
            ilike(talents.lastName, `%${filters.searchQuery}%`),
            ilike(talents.bio, `%${filters.searchQuery}%`),
            sql`${talents.tags} && ARRAY[${filters.searchQuery}]::text[]`
          )
        );
      }

      // Filter out any undefined conditions and combine all conditions
      const validConditions = whereConditions.filter(condition => condition !== undefined);
      const whereClause = validConditions.length > 1 ? and(...validConditions) : validConditions[0];

      // Build order by clause with safe column validation
      let orderByClause;
      switch (sortBy) {
        case 'firstName':
          orderByClause = sortOrder === 'desc' ? desc(talents.firstName) : asc(talents.firstName);
          break;
        case 'lastName':
          orderByClause = sortOrder === 'desc' ? desc(talents.lastName) : asc(talents.lastName);
          break;
        case 'email':
          orderByClause = sortOrder === 'desc' ? desc(talents.email) : asc(talents.email);
          break;
        case 'status':
          orderByClause = sortOrder === 'desc' ? desc(talents.status) : asc(talents.status);
          break;
        case 'updatedAt':
          orderByClause = sortOrder === 'desc' ? desc(talents.updatedAt) : asc(talents.updatedAt);
          break;
        default:
          // Default to createdAt
          orderByClause = sortOrder === 'desc' ? desc(talents.createdAt) : asc(talents.createdAt);
          break;
      }

      // Execute search and count queries
      const [talentResults, totalResult] = await Promise.all([
        db.select()
          .from(talents)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(effectiveLimit)
          .offset(offset),
        db.select({ count: count() })
          .from(talents)
          .where(whereClause)
      ]);

      const total = totalResult[0].count;
      const totalPages = Math.ceil(total / effectiveLimit);

      // Cache search results
      // const cacheKey = CacheKeys.searchResults(
      //   filters.searchQuery || '',
      //   JSON.stringify({ filters, pagination })
      // );
      // await CacheManager.set(
      //   cacheKey,
      //   { talents: talentResults, total, page, totalPages },
      //   300 // 5 minutes
      // );

      return {
        talents: talentResults,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error searching talents:', error);
      throw error;
    }
  }

  /**
   * Delete talent profile (soft delete)
   */
  async deleteTalent(talentId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const [talent] = await db.select({ userId: talents.userId })
        .from(talents)
        .where(eq(talents.id, talentId))
        .limit(1);

      if (!talent) {
        throw new NotFoundError('Talent profile not found');
      }

      if (talent.userId !== userId) {
        throw new AppError('Unauthorized to delete this profile', 403);
      }

      // Soft delete
      await db.update(talents)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(talents.id, talentId));

      // Invalidate cache
      // await CacheManager.delete(CacheKeys.talent(talentId));

      logger.info(`Talent profile ${talentId} deleted (soft delete)`);
    } catch (error) {
      logger.error(`Error deleting talent ${talentId}:`, error);
      throw error;
    }
  }

  /**
   * Fast search for AI Chat Service - Optimized query with essential fields only
   */
  async fastSearchForAI(
    filters: TalentSearchFilters,
    limit: number = 10
  ): Promise<Talent[]> {
    try {
      // Build optimized query with only essential fields for AI matching
      const whereConditions = [
        eq(talents.status, 'active') // Prefer active (verified) talents for AI recommendations
      ];

      // Add key filters
      if (filters.gender) {
        whereConditions.push(eq(talents.gender, filters.gender));
      }
      if (filters.currentCity) {
        whereConditions.push(eq(talents.currentCity, filters.currentCity));
      }
      if (filters.availabilityStatus) {
        whereConditions.push(eq(talents.availabilityStatus, filters.availabilityStatus));
      }

      // Age filter optimization
      if (filters.ageMin || filters.ageMax) {
        const now = new Date();
        if (filters.ageMax) {
          const minBirthDate = new Date(now.getFullYear() - filters.ageMax - 1, now.getMonth(), now.getDate());
          whereConditions.push(gte(talents.dateOfBirth, minBirthDate));
        }
        if (filters.ageMin) {
          const maxBirthDate = new Date(now.getFullYear() - filters.ageMin, now.getMonth(), now.getDate());
          whereConditions.push(lte(talents.dateOfBirth, maxBirthDate));
        }
      }

      // Skills filter - optimized for array intersection
      if (filters.actingSkills?.length) {
        whereConditions.push(sql`${talents.actingSkills} && ${filters.actingSkills}`);
      }

      const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

      // Execute optimized query
      const results = await db.select()
        .from(talents)
        .where(whereClause)
        .orderBy(desc(talents.profileScore), desc(talents.createdAt))
        .limit(Math.min(limit, 25)); // Cap for performance

      return results;
    } catch (error) {
      console.error('Error in fast AI search:', error);
      // Return empty array on error to prevent AI chat failures
      return [];
    }
  }

  /**
   * Get talent statistics
   */
  async getTalentStats(talentId: string): Promise<any> {
    try {
      const [stats] = await db.select({
        profileViewsCount: talents.profileViewsCount,
        rating: talents.rating,
        totalReviews: talents.totalReviews,
        totalAuditions: talents.totalAuditions,
        totalCallbacks: talents.totalCallbacks,
        totalBookings: talents.totalBookings,
        responseRate: talents.responseRate,
        responseTime: talents.responseTime,
        profileCompleteness: talents.profileCompleteness,
        profileScore: talents.profileScore,
      })
        .from(talents)
        .where(eq(talents.id, talentId))
        .limit(1);

      if (!stats) {
        throw new NotFoundError('Talent profile not found');
      }

      return stats;
    } catch (error) {
      logger.error(`Error fetching talent stats ${talentId}:`, error);
      throw error;
    }
  }
}

export const talentCrudService = new TalentCrudService();