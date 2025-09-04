/**
 * Talent CRUD Controller
 * Handles HTTP requests for talent profile management
 */

import { Request, Response } from 'express';
import { talentCrudService } from '../services/talent-crud.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class TalentCrudController {
  /**
   * Create talent profile
   * POST /api/talents
   */
  async createTalent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const talent = await talentCrudService.createTalent({
        userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Talent profile created successfully',
        data: { talent },
      });
    } catch (error) {
      logger.error('Create talent error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'CREATE_TALENT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Get talent profile by ID
   * GET /api/talents/:id
   */
  async getTalent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Include private info only if user owns the profile or is admin
      const includePrivateInfo = userId && (
        req.user?.role === 'ADMIN' || 
        (await talentCrudService.getTalentById(id))?.userId === userId
      );

      const talent = await talentCrudService.getTalentById(id, includePrivateInfo);

      if (!talent) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Talent profile not found',
            code: 'TALENT_NOT_FOUND',
            statusCode: 404,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { talent },
      });
    } catch (error) {
      logger.error('Get talent error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'GET_TALENT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Update talent profile
   * PUT /api/talents/:id
   */
  async updateTalent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const talent = await talentCrudService.updateTalent(id, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Talent profile updated successfully',
        data: { talent },
      });
    } catch (error) {
      logger.error('Update talent error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'UPDATE_TALENT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Search talents with filters
   * GET /api/talents/search
   */
  async searchTalents(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...filters
      } = req.query;

      // Parse numeric values
      const paginationOptions = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Max 100 per page
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      // Parse filter values
      const searchFilters: any = {};
      
      // Parse basic filters
      if (filters.gender) searchFilters.gender = filters.gender;
      if (filters.currentCity) searchFilters.currentCity = filters.currentCity;
      if (filters.currentState) searchFilters.currentState = filters.currentState;
      if (filters.availabilityStatus) searchFilters.availabilityStatus = filters.availabilityStatus;
      if (filters.experienceLevel) searchFilters.experienceLevel = filters.experienceLevel;
      if (filters.searchQuery) searchFilters.searchQuery = filters.searchQuery;
      
      // Parse boolean filters
      if (filters.isVerified !== undefined) {
        searchFilters.isVerified = filters.isVerified === 'true';
      }
      
      // Parse numeric filters
      if (filters.ageMin) searchFilters.ageMin = parseInt(filters.ageMin as string, 10);
      if (filters.ageMax) searchFilters.ageMax = parseInt(filters.ageMax as string, 10);
      if (filters.heightMin) searchFilters.heightMin = parseFloat(filters.heightMin as string);
      if (filters.heightMax) searchFilters.heightMax = parseFloat(filters.heightMax as string);
      if (filters.weightMin) searchFilters.weightMin = parseFloat(filters.weightMin as string);
      if (filters.weightMax) searchFilters.weightMax = parseFloat(filters.weightMax as string);
      if (filters.minimumRate) searchFilters.minimumRate = parseFloat(filters.minimumRate as string);
      if (filters.maximumRate) searchFilters.maximumRate = parseFloat(filters.maximumRate as string);
      
      // Parse array filters
      if (filters.languages) {
        searchFilters.languages = Array.isArray(filters.languages) 
          ? filters.languages 
          : (filters.languages as string).split(',');
      }
      if (filters.actingSkills) {
        searchFilters.actingSkills = Array.isArray(filters.actingSkills)
          ? filters.actingSkills
          : (filters.actingSkills as string).split(',');
      }
      if (filters.danceSkills) {
        searchFilters.danceSkills = Array.isArray(filters.danceSkills)
          ? filters.danceSkills
          : (filters.danceSkills as string).split(',');
      }
      if (filters.specialSkills) {
        searchFilters.specialSkills = Array.isArray(filters.specialSkills)
          ? filters.specialSkills
          : (filters.specialSkills as string).split(',');
      }

      const result = await talentCrudService.searchTalents(searchFilters, paginationOptions);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          page: result.page,
          limit: paginationOptions.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Search talents error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'SEARCH_TALENTS_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Delete talent profile (soft delete)
   * DELETE /api/talents/:id
   */
  async deleteTalent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await talentCrudService.deleteTalent(id, userId);

      res.status(200).json({
        success: true,
        message: 'Talent profile deleted successfully',
      });
    } catch (error) {
      logger.error('Delete talent error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'DELETE_TALENT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Get talent statistics
   * GET /api/talents/:id/stats
   */
  async getTalentStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const stats = await talentCrudService.getTalentStats(id);

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      logger.error('Get talent stats error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'GET_TALENT_STATS_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Get my talent profile
   * GET /api/talents/me
   */
  async getMyTalentProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Find talent by userId
      const talent = await talentCrudService.getTalentById(userId, true);

      if (!talent) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Talent profile not found',
            code: 'TALENT_NOT_FOUND',
            statusCode: 404,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { talent },
      });
    } catch (error) {
      logger.error('Get my talent profile error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'GET_MY_TALENT_FAILED',
            statusCode: error.statusCode,
          },
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      });
    }
  }
}

export const talentCrudController = new TalentCrudController();