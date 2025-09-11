/**
 * Talent Controller
 * Handles all talent-related HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { TalentService, TalentSearchParams } from '../services/talent.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export class TalentController {
  /**
   * Search talents with filters
   * @route GET /api/talents/search
   */
  static async searchTalents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const params: TalentSearchParams = {
        searchTerm: req.query.searchTerm as string,
        ageMin: req.query.ageMin ? Number(req.query.ageMin) : undefined,
        ageMax: req.query.ageMax ? Number(req.query.ageMax) : undefined,
        gender: req.query.gender as string,
        location: req.query.location as string,
        languages: req.query.languages 
          ? (Array.isArray(req.query.languages) 
              ? req.query.languages as string[] 
              : [req.query.languages as string])
          : undefined,
        skills: req.query.skills
          ? (Array.isArray(req.query.skills)
              ? req.query.skills as string[]
              : [req.query.skills as string])
          : undefined,
        experienceLevel: req.query.experienceLevel as any,
        availability: req.query.availability as any,
        minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
        verified: req.query.verified === 'true',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await TalentService.searchTalents(params);

      res.json({
        success: true,
        data: result.talents,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get talent profile by ID
   * @route GET /api/talents/:id
   */
  static async getTalentById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('Talent ID is required', 400);
      }
      const viewerId = req.user?.id;

      const talent = await TalentService.getTalentById(id, viewerId);

      if (!talent) {
        throw new AppError('Talent not found', 404);
      }

      res.json({
        success: true,
        data: talent,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured talents
   * @route GET /api/talents/featured
   */
  static async getFeaturedTalents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const talents = await TalentService.getFeaturedTalents(limit);

      res.json({
        success: true,
        data: talents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get search suggestions
   * @route GET /api/talents/suggestions
   */
  static async getSearchSuggestions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query.q as string;
      const suggestions = await TalentService.getSearchSuggestions(query);

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save search criteria
   * @route POST /api/talents/searches/save
   */
  static async saveSearch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { name, criteria, receiveAlerts } = req.body;

      if (!name || !criteria) {
        throw new AppError('Name and criteria are required', 400);
      }

      const savedSearch = await TalentService.saveSearch(
        req.user.id,
        name,
        criteria,
        receiveAlerts
      );

      res.status(201).json({
        success: true,
        data: savedSearch,
        message: 'Search saved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's saved searches
   * @route GET /api/talents/searches
   */
  static async getSavedSearches(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { prisma } = require('../config/database');
      const searches = await prisma.savedSearch.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: searches,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete saved search
   * @route DELETE /api/talents/searches/:id
   */
  static async deleteSavedSearch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const { prisma } = require('../config/database');

      // Check ownership
      const search = await prisma.savedSearch.findFirst({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!search) {
        throw new AppError('Saved search not found', 404);
      }

      await prisma.savedSearch.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Search deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle bookmark for a talent
   * @route POST /api/talents/:id/bookmark
   */
  static async toggleBookmark(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError('Talent ID is required', 400);
      }
      const result = await TalentService.toggleBookmark(req.user.id, id);

      res.json({
        success: true,
        data: result,
        message: result.bookmarked 
          ? 'Talent bookmarked successfully' 
          : 'Bookmark removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's bookmarked talents
   * @route GET /api/talents/bookmarks
   */
  static async getBookmarkedTalents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await TalentService.getBookmarkedTalents(
        req.user.id,
        page,
        limit
      );

      res.json({
        success: true,
        data: result.talents,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get similar talents
   * @route GET /api/talents/:id/similar
   */
  static async getSimilarTalents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('Talent ID is required', 400);
      }
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const talents = await TalentService.getSimilarTalents(id, limit);

      res.json({
        success: true,
        data: talents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get talent statistics
   * @route GET /api/talents/:id/stats
   */
  static async getTalentStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { prisma } = require('../config/database');

      // Get various statistics
      const [
        profileViews,
        totalApplications,
        totalAuditions,
        totalBookings,
        recentViews,
      ] = await Promise.all([
        prisma.profileView.count({
          where: { talentId: id },
        }),
        prisma.application.count({
          where: { actorId: id },
        }),
        prisma.audition.count({
          where: { actorId: id },
        }),
        prisma.talent.findUnique({
          where: { id },
          select: { totalBookings: true },
        }),
        prisma.profileView.count({
          where: {
            talentId: id,
            viewedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          profileViews,
          totalApplications,
          totalAuditions,
          totalBookings: totalBookings?.totalBookings || 0,
          recentViews,
          viewsPerDay: Math.round(recentViews / 7),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get talent availability
   * @route GET /api/talents/:id/availability
   */
  static async getTalentAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { prisma } = require('../config/database');

      const talent = await prisma.talent.findUnique({
        where: { id },
        select: {
          availabilityStatus: true,
          availableFrom: true,
          availableTo: true,
          preferredLocations: true,
          willingToRelocate: true,
          minimumRate: true,
          maximumRate: true,
          preferredRate: true,
          rateNegotiable: true,
        },
      });

      if (!talent) {
        throw new AppError('Talent not found', 404);
      }

      res.json({
        success: true,
        data: talent,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export talent data (for casting directors)
   * @route GET /api/talents/export
   */
  static async exportTalents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Only allow casting directors and admins
      if (!['CASTING_DIRECTOR', 'ADMIN'].includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403);
      }

      const params: TalentSearchParams = {
        ...req.query as any,
        limit: 1000, // Max export limit
      };

      const result = await TalentService.searchTalents(params);

      // Format data for export
      const exportData = result.talents.map(talent => ({
        name: `${talent.firstName} ${talent.lastName}`,
        email: talent.email,
        phone: talent.primaryPhone,
        location: `${talent.currentCity}, ${talent.currentState}`,
        experience: talent.yearsOfExperience,
        rating: talent.rating,
        languages: talent.languages?.join(', '),
        skills: [
          ...(talent.actingSkills || []),
          ...(talent.specialSkills || []),
        ].join(', '),
        availability: talent.availabilityStatus,
        profileUrl: `${process.env.FRONTEND_URL}/talents/${talent.id}`,
      }));

      res.json({
        success: true,
        data: exportData,
        count: exportData.length,
      });
    } catch (error) {
      next(error);
    }
  }
}