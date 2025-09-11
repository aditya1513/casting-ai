/**
 * Talent Service - Database Layer
 * Handles database queries for talent-related operations
 */

import { eq, and, like, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../config/database';
import { users, talentProfiles } from '../models/schema';
import type { TalentProfile, User } from '../models/schema';

// Combined talent data interface
export interface TalentWithUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  languages: string[];
  skills: string[];
  rating?: number;
  reviewCount?: number;
  bio?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Extended profile data
  stageName?: string;
  gender?: string;
  city?: string;
  state?: string;
  country?: string;
  height?: number;
  weight?: number;
  eyeColor?: string;
  hairColor?: string;
  willingToTravel?: boolean;
  minBudget?: string;
  maxBudget?: string;
}

export interface TalentSearchParams {
  query?: string;
  location?: string;
  experience?: string;
  languages?: string[];
  skills?: string[];
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface TalentSearchResult {
  success: boolean;
  data: TalentWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class TalentDatabaseService {
  /**
   * Search talents with filters and pagination
   */
  async searchTalents(params: TalentSearchParams): Promise<TalentSearchResult> {
    const {
      query,
      location,
      experience,
      languages,
      skills,
      minRating,
      page = 1,
      limit = 10,
    } = params;

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    // Text search in name, bio, stage name
    if (query) {
      conditions.push(
        sql`(
          ${users.firstName} ILIKE ${`%${query}%`} OR 
          ${users.lastName} ILIKE ${`%${query}%`} OR 
          ${users.bio} ILIKE ${`%${query}%`} OR
          ${talentProfiles.stageName} ILIKE ${`%${query}%`}
        )`
      );
    }

    // Location search
    if (location) {
      conditions.push(
        sql`(
          ${talentProfiles.city} ILIKE ${`%${location}%`} OR 
          ${talentProfiles.state} ILIKE ${`%${location}%`}
        )`
      );
    }

    // Languages filter (JSON contains any of the specified languages)
    if (languages && languages.length > 0) {
      const languageConditions = languages.map(lang => 
        sql`${talentProfiles.languages}::text ILIKE ${`%${lang}%`}`
      );
      conditions.push(sql`(${sql.join(languageConditions, sql` OR `)})`);
    }

    // Skills filter (JSON contains any of the specified skills)
    if (skills && skills.length > 0) {
      const skillConditions = skills.map(skill => 
        sql`${talentProfiles.skills}::text ILIKE ${`%${skill}%`}`
      );
      conditions.push(sql`(${sql.join(skillConditions, sql` OR `)})`);
    }

    // Rating filter
    if (minRating) {
      conditions.push(sql`${talentProfiles.rating} >= ${minRating}`);
    }

    // Only active actors
    conditions.push(sql`u."isActive" = true`);
    conditions.push(sql`u.role = 'actor'`);

    // Build the query
    const whereClause = conditions.length > 0 
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql`WHERE u."isActive" = true AND u.role = 'actor'`;

    // Get total count
    const countQuery = sql`
      SELECT COUNT(*) as count
      FROM ${users} u
      INNER JOIN ${talentProfiles} tp ON u.id = tp.user_id
      ${whereClause}
    `;

    const totalResult = await db.execute(countQuery);
    const total = Number(totalResult.rows[0]?.count || 0);

    // Get paginated results
    const dataQuery = sql`
      SELECT 
        tp.id,
        u."firstName",
        u."lastName", 
        u.email,
        u."phoneNumber",
        u.bio,
        u."createdAt",
        u."updatedAt",
        tp.stage_name,
        tp.gender,
        tp.city,
        tp.state,
        tp.country,
        tp.height,
        tp.weight,
        tp.eye_color,
        tp.hair_color,
        tp.languages,
        tp.experience,
        tp.skills,
        tp.willing_to_travel,
        tp.min_budget,
        tp.max_budget,
        tp.rating
      FROM ${users} u
      INNER JOIN ${talentProfiles} tp ON u.id = tp.user_id
      ${whereClause}
      ORDER BY tp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const results = await db.execute(dataQuery);

    // Transform results
    const talents: TalentWithUser[] = results.rows.map((row: any) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      phone: row.phoneNumber,
      location: row.city ? `${row.city}, ${row.state}` : undefined,
      experience: this.formatExperience(row.experience),
      languages: Array.isArray(row.languages) ? row.languages : [],
      skills: Array.isArray(row.skills) ? row.skills : [],
      rating: row.rating ? Number(row.rating) : undefined,
      reviewCount: 0, // TODO: Implement reviews system
      bio: row.bio,
      status: 'active',
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      
      // Extended profile data
      stageName: row.stage_name,
      gender: row.gender,
      city: row.city,
      state: row.state,
      country: row.country,
      height: row.height,
      weight: row.weight,
      eyeColor: row.eye_color,
      hairColor: row.hair_color,
      willingToTravel: row.willing_to_travel,
      minBudget: row.min_budget?.toString(),
      maxBudget: row.max_budget?.toString(),
    }));

    return {
      success: true,
      data: talents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get talent by ID
   */
  async getTalentById(id: string): Promise<TalentWithUser | null> {
    const query = sql`
      SELECT 
        tp.id,
        u."firstName",
        u."lastName", 
        u.email,
        u."phoneNumber",
        u.bio,
        u."createdAt",
        u."updatedAt",
        tp.stage_name,
        tp.gender,
        tp.city,
        tp.state,
        tp.country,
        tp.height,
        tp.weight,
        tp.eye_color,
        tp.hair_color,
        tp.languages,
        tp.experience,
        tp.skills,
        tp.willing_to_travel,
        tp.min_budget,
        tp.max_budget,
        tp.rating
      FROM ${users} u
      INNER JOIN ${talentProfiles} tp ON u.id = tp.user_id
      WHERE tp.id = ${id} AND u.is_active = true
    `;

    const results = await db.execute(query);
    const row = results.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      phone: row.phoneNumber,
      location: row.city ? `${row.city}, ${row.state}` : undefined,
      experience: this.formatExperience(row.experience),
      languages: Array.isArray(row.languages) ? row.languages : [],
      skills: Array.isArray(row.skills) ? row.skills : [],
      rating: row.rating ? Number(row.rating) : undefined,
      reviewCount: 0, // TODO: Implement reviews system
      bio: row.bio,
      status: 'active',
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      
      // Extended profile data
      stageName: row.stage_name,
      gender: row.gender,
      city: row.city,
      state: row.state,
      country: row.country,
      height: row.height,
      weight: row.weight,
      eyeColor: row.eye_color,
      hairColor: row.hair_color,
      willingToTravel: row.willing_to_travel,
      minBudget: row.min_budget?.toString(),
      maxBudget: row.max_budget?.toString(),
    };
  }

  /**
   * Get talent stats
   */
  async getTalentStats(): Promise<{
    totalTalents: number;
    activeProjects: number;
    totalApplications: number;
    cities: number;
  }> {
    const statsQuery = sql`
      SELECT 
        COUNT(DISTINCT tp.id) as total_talents,
        COUNT(DISTINCT tp.city) as cities,
        0 as active_projects,
        0 as total_applications
      FROM ${talentProfiles} tp
      INNER JOIN ${users} u ON u.id = tp.user_id
      WHERE u.is_active = true AND u.role = 'actor'
    `;

    const result = await db.execute(statsQuery);
    const stats = result.rows[0];

    return {
      totalTalents: Number(stats?.total_talents || 0),
      activeProjects: Number(stats?.active_projects || 0),
      totalApplications: Number(stats?.total_applications || 0),
      cities: Number(stats?.cities || 0),
    };
  }

  /**
   * Helper to format experience data
   */
  private formatExperience(experienceData: any): string {
    if (!experienceData || !Array.isArray(experienceData)) {
      return 'beginner';
    }

    const totalYears = experienceData.reduce((sum, exp) => {
      return sum + (exp.years || 0);
    }, 0);

    if (totalYears >= 5) return 'expert';
    if (totalYears >= 2) return 'intermediate';
    return 'beginner';
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export const talentDatabaseService = new TalentDatabaseService();