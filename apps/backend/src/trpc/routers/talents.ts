/**
 * Talents Router - tRPC procedures for talent management
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, paginationSchema, idSchema } from '../trpc';
import { talentDatabaseService } from '../../services/talent.service.database';

// Talent schemas
const talentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  experience: z.enum(['beginner', 'intermediate', 'expert']),
  languages: z.array(z.string()),
  skills: z.array(z.string()),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().min(0),
  bio: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const talentSearchSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  experience: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  ...paginationSchema.shape,
});

export const talentsRouter = router({
  // List talents with filters and pagination
  list: publicProcedure
    .input(talentSearchSchema.optional().default({}))
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, query, location, experience, languages, skills, minRating } = input;
        
        // Call the database service with the search parameters
        const result = await talentDatabaseService.searchTalents({
          query,
          location,
          experience,
          languages,
          skills,
          minRating,
          page,
          limit,
        });

        ctx.logger.info(`Found ${result.data.length} talents for search query`, {
          query,
          location,
          experience,
          totalResults: result.pagination.total,
        });

        return result;
      } catch (error) {
        ctx.logger.error('Error listing talents:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch talents',
          cause: error,
        });
      }
    }),

  // Get talent by ID
  getById: publicProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      try {
        const talent = await talentDatabaseService.getTalentById(input.id);

        if (!talent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Talent not found',
          });
        }

        ctx.logger.info(`Retrieved talent by ID: ${input.id}`, {
          talentName: talent.name,
          location: talent.location,
        });

        return {
          success: true,
          data: talent,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        ctx.logger.error('Error fetching talent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch talent',
          cause: error,
        });
      }
    }),
});