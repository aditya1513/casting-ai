/**
 * Talent CRUD Service
 * Comprehensive service for managing talent profiles with validation
 * Updated to use Drizzle ORM instead of Prisma
 */

import { db } from '../db/drizzle';
import { talents, users } from '../db/schema';
import { CacheManager, CacheKeys } from '../config/redis';
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
      await CacheManager.set(
        CacheKeys.talent(talent.id),
        updatedTalent,
        3600 // 1 hour
      );

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
      const cached = await CacheManager.get<Talent>(CacheKeys.talent(talentId));
      if (cached) {
        return cached;
      }

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
      await CacheManager.set(
        CacheKeys.talent(talentId),
        talent,
        3600 // 1 hour
      );

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
      await CacheManager.delete(CacheKeys.talent(talentId));

      logger.info(`Talent profile ${talentId} updated`);
      return finalTalent;
    } catch (error) {
      logger.error(`Error updating talent ${talentId}:`, error);
      throw error;
    }
  }

  /**
   * Search talents with filters and pagination
   */
  async searchTalents(
    filters: TalentSearchFilters,
    pagination: PaginationOptions = {}
  ): Promise<{ talents: Talent[]; total: number; page: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        isActive: true,
      };

      // Apply filters
      if (filters.gender) where.gender = filters.gender;
      if (filters.currentCity) where.currentCity = filters.currentCity;
      if (filters.currentState) where.currentState = filters.currentState;
      if (filters.availabilityStatus) where.availabilityStatus = filters.availabilityStatus;
      if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;

      // Age filter (calculate from date of birth)
      if (filters.ageMin || filters.ageMax) {
        const now = new Date();
        where.dateOfBirth = {};
        if (filters.ageMax) {
          const minBirthDate = new Date(now.getFullYear() - filters.ageMax - 1, now.getMonth(), now.getDate());
          where.dateOfBirth.gte = minBirthDate;
        }
        if (filters.ageMin) {
          const maxBirthDate = new Date(now.getFullYear() - filters.ageMin, now.getMonth(), now.getDate());
          where.dateOfBirth.lte = maxBirthDate;
        }
      }

      // Physical attributes filters
      if (filters.heightMin) where.height = { ...where.height, gte: filters.heightMin };
      if (filters.heightMax) where.height = { ...where.height, lte: filters.heightMax };
      if (filters.weightMin) where.weight = { ...where.weight, gte: filters.weightMin };
      if (filters.weightMax) where.weight = { ...where.weight, lte: filters.weightMax };

      // Rate filters
      if (filters.minimumRate) where.minimumRate = { gte: filters.minimumRate };
      if (filters.maximumRate) where.maximumRate = { lte: filters.maximumRate };

      // Array filters
      if (filters.languages?.length) {
        where.languages = { hasSome: filters.languages };
      }
      if (filters.actingSkills?.length) {
        where.actingSkills = { hasSome: filters.actingSkills };
      }
      if (filters.danceSkills?.length) {
        where.danceSkills = { hasSome: filters.danceSkills };
      }
      if (filters.specialSkills?.length) {
        where.specialSkills = { hasSome: filters.specialSkills };
      }

      // Full-text search
      if (filters.searchQuery) {
        where.OR = [
          { firstName: { contains: filters.searchQuery, mode: 'insensitive' } },
          { lastName: { contains: filters.searchQuery, mode: 'insensitive' } },
          { displayName: { contains: filters.searchQuery, mode: 'insensitive' } },
          { bio: { contains: filters.searchQuery, mode: 'insensitive' } },
          { searchTags: { hasSome: [filters.searchQuery] } },
        ];
      }

      // Execute search
      const [talents, total] = await Promise.all([
        prisma.talent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            media: {
              where: { isPrimary: true, isActive: true },
              take: 1,
            },
            _count: {
              select: {
                reviews: true,
                applications: true,
              },
            },
          },
        }),
        prisma.talent.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      // Cache search results
      const cacheKey = CacheKeys.searchResults(
        filters.searchQuery || '',
        JSON.stringify({ filters, pagination })
      );
      await CacheManager.set(
        cacheKey,
        { talents, total, page, totalPages },
        300 // 5 minutes
      );

      return {
        talents,
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
      const talent = await prisma.talent.findUnique({
        where: { id: talentId },
        select: { userId: true },
      });

      if (!talent) {
        throw new NotFoundError('Talent profile not found');
      }

      if (talent.userId !== userId) {
        throw new AppError('Unauthorized to delete this profile', 403);
      }

      // Soft delete
      await prisma.talent.update({
        where: { id: talentId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await CacheManager.delete(CacheKeys.talent(talentId));

      logger.info(`Talent profile ${talentId} deleted (soft delete)`);
    } catch (error) {
      logger.error(`Error deleting talent ${talentId}:`, error);
      throw error;
    }
  }

  /**
   * Get talent statistics
   */
  async getTalentStats(talentId: string): Promise<any> {
    try {
      const stats = await prisma.talent.findUnique({
        where: { id: talentId },
        select: {
          profileViewsCount: true,
          rating: true,
          totalReviews: true,
          totalAuditions: true,
          totalCallbacks: true,
          totalBookings: true,
          responseRate: true,
          responseTime: true,
          profileCompleteness: true,
          profileScore: true,
          _count: {
            select: {
              applications: true,
              auditions: true,
              reviews: true,
              talentBookmarks: true,
              media: true,
            },
          },
        },
      });

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