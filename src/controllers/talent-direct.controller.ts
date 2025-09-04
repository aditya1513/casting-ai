/**
 * Direct Talent Controller
 * Workaround for Prisma P1010 error
 */

import { Request, Response } from 'express';
import { talentDirectService } from '../services/talent-direct.service';
import { logger } from '../utils/logger';

class TalentDirectController {
  /**
   * Search talents (bypassing Prisma)
   */
  async searchTalents(req: Request, res: Response): Promise<void> {
    try {
      const {
        q: query,
        page = 1,
        limit = 20,
        gender,
        city,
        state,
        minExperience,
        maxExperience,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const filters = {
        gender: gender as string,
        city: city as string,
        state: state as string,
        minExperience: minExperience ? parseInt(minExperience as string) : undefined,
        maxExperience: maxExperience ? parseInt(maxExperience as string) : undefined,
      };

      const options = {
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as string
      };

      const result = await talentDirectService.searchTalents(
        query as string,
        filters,
        options
      );

      res.json({
        success: true,
        data: result.talents,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
          processingTime: result.processingTime,
          query: query || '',
          filters: Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== undefined)
          )
        }
      });

    } catch (error) {
      logger.error('Direct talent search error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to search talents',
          code: 'SEARCH_ERROR'
        }
      });
    }
  }

  /**
   * Get talent by ID (bypassing Prisma)
   */
  async getTalentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const talent = await talentDirectService.getTalentById(id);

      if (!talent) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Talent not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: talent
      });

    } catch (error) {
      logger.error('Get talent by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get talent',
          code: 'GET_ERROR'
        }
      });
    }
  }

  /**
   * Create sample talent for testing
   */
  async createSampleTalent(req: Request, res: Response): Promise<void> {
    try {
      const talentId = await talentDirectService.createSampleTalent();

      res.status(201).json({
        success: true,
        message: 'Sample talent created successfully',
        data: {
          id: talentId
        }
      });

    } catch (error) {
      logger.error('Create sample talent error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create sample talent',
          code: 'CREATE_ERROR'
        }
      });
    }
  }

  /**
   * List all talents (simple endpoint)
   */
  async listTalents(req: Request, res: Response): Promise<void> {
    try {
      const result = await talentDirectService.searchTalents('', {}, { page: 1, limit: 20 });

      res.json({
        success: true,
        data: result.talents,
        meta: {
          total: result.total,
          count: result.talents.length
        }
      });

    } catch (error) {
      logger.error('List talents error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to list talents',
          code: 'LIST_ERROR'
        }
      });
    }
  }
}

export const talentDirectController = new TalentDirectController();