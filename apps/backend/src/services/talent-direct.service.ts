/**
 * Direct Talent Service
 * Workaround for Prisma P1010 error using direct PostgreSQL queries
 */

import pgPool from '../config/pg-direct';
import { logger } from '../utils/logger';

export interface TalentSearchResult {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  email: string;
  currentCity: string;
  currentState: string;
  gender: string;
  languages: string[];
  yearsOfExperience: number;
  rating: number;
  profileImageUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResponse {
  talents: TalentSearchResult[];
  total: number;
  page: number;
  limit: number;
  processingTime: number;
}

class TalentDirectService {
  /**
   * Search talents using direct SQL query
   */
  async searchTalents(
    query?: string,
    filters: any = {},
    options: any = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;

      // Base query
      let whereClause = 'WHERE t.isActive = true';
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add search query
      if (query && query.trim()) {
        whereClause += ` AND (
          t.displayName ILIKE $${paramIndex} OR 
          t.firstName ILIKE $${paramIndex} OR 
          t.lastName ILIKE $${paramIndex} OR 
          t.bio ILIKE $${paramIndex} OR
          t.currentCity ILIKE $${paramIndex} OR
          t.currentState ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${query.trim()}%`);
        paramIndex++;
      }

      // Add filters
      if (filters.gender) {
        whereClause += ` AND t.gender = $${paramIndex}`;
        queryParams.push(filters.gender);
        paramIndex++;
      }

      if (filters.city) {
        whereClause += ` AND t.currentCity ILIKE $${paramIndex}`;
        queryParams.push(`%${filters.city}%`);
        paramIndex++;
      }

      if (filters.state) {
        whereClause += ` AND t.currentState ILIKE $${paramIndex}`;
        queryParams.push(`%${filters.state}%`);
        paramIndex++;
      }

      if (filters.minExperience) {
        whereClause += ` AND t.yearsOfExperience >= $${paramIndex}`;
        queryParams.push(filters.minExperience);
        paramIndex++;
      }

      if (filters.maxExperience) {
        whereClause += ` AND t.yearsOfExperience <= $${paramIndex}`;
        queryParams.push(filters.maxExperience);
        paramIndex++;
      }

      // Main query to get talents
      const talentsQuery = `
        SELECT 
          t.id,
          t.displayName,
          t.firstName,
          t.lastName,
          t.bio,
          t.email,
          t.currentCity,
          t.currentState,
          t.gender,
          t.languages,
          t.yearsOfExperience,
          t.rating,
          t.profileImageUrl,
          t.isActive,
          t.createdAt,
          t.updatedAt
        FROM talents t
        ${whereClause}
        ORDER BY t.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM talents t
        ${whereClause}
      `;

      // Execute both queries
      const [talentsResult, countResult] = await Promise.all([
        pgPool.query(talentsQuery, queryParams),
        pgPool.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
      ]);

      const talents = talentsResult.rows.map(row => ({
        ...row,
        languages: Array.isArray(row.languages) ? row.languages : [],
        yearsOfExperience: row.yearsOfExperience || 0,
        rating: row.rating || 0
      }));

      const total = parseInt(countResult.rows[0]?.total || '0');
      const processingTime = Date.now() - startTime;

      logger.info(`Talent search completed: ${talents.length} results in ${processingTime}ms`);

      return {
        talents,
        total,
        page,
        limit,
        processingTime
      };

    } catch (error) {
      logger.error('Error in direct talent search:', error);
      throw new Error('Failed to search talents');
    }
  }

  /**
   * Get talent by ID using direct SQL query
   */
  async getTalentById(id: string): Promise<TalentSearchResult | null> {
    try {
      const query = `
        SELECT 
          t.id,
          t.displayName,
          t.firstName,
          t.lastName,
          t.bio,
          t.email,
          t.currentCity,
          t.currentState,
          t.gender,
          t.languages,
          t.yearsOfExperience,
          t.rating,
          t.profileImageUrl,
          t.isActive,
          t.createdAt,
          t.updatedAt
        FROM talents t
        WHERE t.id = $1 AND t.isActive = true
      `;

      const result = await pgPool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const talent = result.rows[0];
      return {
        ...talent,
        languages: Array.isArray(talent.languages) ? talent.languages : [],
        yearsOfExperience: talent.yearsOfExperience || 0,
        rating: talent.rating || 0
      };

    } catch (error) {
      logger.error('Error getting talent by ID:', error);
      throw new Error('Failed to get talent');
    }
  }

  /**
   * Create sample talent data for testing
   */
  async createSampleTalent(): Promise<string> {
    try {
      const query = `
        INSERT INTO talents (
          userId,
          firstName,
          lastName,
          displayName,
          email,
          gender,
          currentCity,
          currentState,
          bio,
          languages,
          yearsOfExperience,
          rating,
          isActive,
          createdAt,
          updatedAt
        ) VALUES (
          gen_random_uuid(),
          'Sample',
          'Actor',
          'Sample Actor',
          'sample@castmatch.com',
          'male',
          'Mumbai',
          'Maharashtra',
          'Experienced actor with expertise in Hindi and English films',
          ARRAY['Hindi', 'English'],
          5,
          4.5,
          true,
          NOW(),
          NOW()
        )
        RETURNING id
      `;

      const result = await pgPool.query(query);
      const talentId = result.rows[0].id;
      
      logger.info(`Created sample talent with ID: ${talentId}`);
      return talentId;

    } catch (error) {
      logger.error('Error creating sample talent:', error);
      throw new Error('Failed to create sample talent');
    }
  }
}

export const talentDirectService = new TalentDirectService();