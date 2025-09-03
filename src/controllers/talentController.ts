/**
 * Talent Controller
 * Handles talent-related API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

export class TalentController {
  /**
   * Get all talents with filtering and pagination
   */
  static async getTalents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const {
        page = 1,
        limit = 20,
        location,
        skills,
        experience,
        availability
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = {
        isActive: true
      };

      if (location) {
        whereClause.currentCity = { contains: String(location), mode: 'insensitive' };
      }

      if (skills) {
        const skillsArray = String(skills).split(',');
        whereClause.actingSkills = { hassome: skillsArray };
      }

      if (experience) {
        whereClause.yearsOfExperience = { gte: Number(experience) };
      }

      if (availability) {
        whereClause.availabilityStatus = availability;
      }

      const [talents, total] = await Promise.all([
        prisma.talent.findMany({
          where: whereClause,
          skip,
          take: Number(limit),
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            },
            media: {
              where: { isPrimary: true },
              take: 1
            }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.talent.count({ where: whereClause })
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          talents,
          pagination: {
            currentPage: Number(page),
            totalPages,
            totalItems: total,
            itemsPerPage: Number(limit),
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching talents:', error);
      next(error);
    }
  }

  /**
   * Get talent by ID
   */
  static async getTalentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const talent = await prisma.talent.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true
            }
          },
          media: {
            orderBy: { order: 'asc' }
          },
          workExperiences: {
            orderBy: { year: 'desc' }
          },
          educations: {
            orderBy: { endYear: 'desc' }
          },
          achievements: {
            orderBy: { year: 'desc' }
          }
        }
      });

      if (!talent) {
        throw new AppError('Talent not found', 404);
      }

      res.json({
        success: true,
        data: { talent }
      });

    } catch (error) {
      logger.error('Error fetching talent by ID:', error);
      next(error);
    }
  }

  /**
   * Create new talent profile
   */
  static async createTalent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { userId, ...talentData } = req.body;

      // Check if talent already exists for this user
      const existingTalent = await prisma.talent.findUnique({
        where: { userId }
      });

      if (existingTalent) {
        throw new AppError('Talent profile already exists for this user', 400);
      }

      const talent = await prisma.talent.create({
        data: {
          userId,
          ...talentData
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      logger.info(`Talent profile created for user ${userId}`);

      res.status(201).json({
        success: true,
        data: { talent },
        message: 'Talent profile created successfully'
      });

    } catch (error) {
      logger.error('Error creating talent profile:', error);
      next(error);
    }
  }

  /**
   * Update talent profile
   */
  static async updateTalent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const updateData = req.body;

      const talent = await prisma.talent.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      logger.info(`Talent profile updated: ${id}`);

      res.json({
        success: true,
        data: { talent },
        message: 'Talent profile updated successfully'
      });

    } catch (error) {
      logger.error('Error updating talent profile:', error);
      next(error);
    }
  }

  /**
   * Delete talent profile
   */
  static async deleteTalent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.talent.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info(`Talent profile deactivated: ${id}`);

      res.json({
        success: true,
        message: 'Talent profile deactivated successfully'
      });

    } catch (error) {
      logger.error('Error deactivating talent profile:', error);
      next(error);
    }
  }

  /**
   * Search talents with advanced filters
   */
  static async searchTalents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const {
        q, // search query
        location,
        skills,
        experience,
        availability,
        ageMin,
        ageMax,
        page = 1,
        limit = 20
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = {
        isActive: true
      };

      // Full text search
      if (q) {
        whereClause.OR = [
          { firstName: { contains: String(q), mode: 'insensitive' } },
          { lastName: { contains: String(q), mode: 'insensitive' } },
          { bio: { contains: String(q), mode: 'insensitive' } }
        ];
      }

      // Add other filters same as getTalents...
      if (location) {
        whereClause.currentCity = { contains: String(location), mode: 'insensitive' };
      }

      if (skills) {
        const skillsArray = String(skills).split(',');
        whereClause.actingSkills = { hassome: skillsArray };
      }

      const talents = await prisma.talent.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          media: {
            where: { isPrimary: true },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json({
        success: true,
        data: { talents }
      });

    } catch (error) {
      logger.error('Error searching talents:', error);
      next(error);
    }
  }
}

// Export individual functions for route imports
export const getTalents = TalentController.getTalents;
export const getTalentById = TalentController.getTalentById;
export const createTalent = TalentController.createTalent;
export const updateTalent = TalentController.updateTalent;
export const deleteTalent = TalentController.deleteTalent;
export const searchTalents = TalentController.searchTalents;

export default TalentController;