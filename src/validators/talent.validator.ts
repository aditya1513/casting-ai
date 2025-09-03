/**
 * Talent Validators
 * Request validation schemas for talent endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware factory
 */
const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    next();
  };
};

/**
 * Validate query parameters
 */
const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors,
      });
    }
    next();
  };
};

/**
 * Search talents query validation
 */
export const searchTalentsSchema = Joi.object({
  searchTerm: Joi.string().trim().min(1).max(100),
  ageMin: Joi.number().integer().min(18).max(100),
  ageMax: Joi.number().integer().min(18).max(100),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
  location: Joi.string().trim().max(100),
  languages: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string().trim()
  ),
  skills: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string().trim()
  ),
  experienceLevel: Joi.string().valid('FRESHER', 'INTERMEDIATE', 'EXPERIENCED', 'VETERAN'),
  availability: Joi.string().valid('IMMEDIATE', 'WITHIN_WEEK', 'WITHIN_MONTH', 'FLEXIBLE'),
  minRating: Joi.number().min(0).max(5),
  verified: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('relevance', 'rating', 'experience', 'recentlyActive', 'createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc'),
}).custom((value, helpers) => {
  // Ensure ageMin is less than ageMax
  if (value.ageMin && value.ageMax && value.ageMin > value.ageMax) {
    return helpers.error('any.invalid', { message: 'ageMin must be less than or equal to ageMax' });
  }
  return value;
});

/**
 * Save search validation
 */
export const saveSearchSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  criteria: Joi.object({
    searchTerm: Joi.string().trim().min(1).max(100),
    ageMin: Joi.number().integer().min(18).max(100),
    ageMax: Joi.number().integer().min(18).max(100),
    gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
    location: Joi.string().trim().max(100),
    languages: Joi.array().items(Joi.string().trim()),
    skills: Joi.array().items(Joi.string().trim()),
    experienceLevel: Joi.string().valid('FRESHER', 'INTERMEDIATE', 'EXPERIENCED', 'VETERAN'),
    availability: Joi.string().valid('IMMEDIATE', 'WITHIN_WEEK', 'WITHIN_MONTH', 'FLEXIBLE'),
    minRating: Joi.number().min(0).max(5),
    verified: Joi.boolean(),
  }).required(),
  receiveAlerts: Joi.boolean().default(false),
});

/**
 * Pagination validation
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * UUID validation for params
 */
export const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * Featured talents query validation
 */
export const featuredTalentsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(20),
});

/**
 * Suggestions query validation
 */
export const suggestionsSchema = Joi.object({
  q: Joi.string().trim().min(1).max(50),
});

/**
 * Export talents query validation
 */
export const exportTalentsSchema = Joi.object({
  searchTerm: Joi.string().trim().min(1).max(100),
  ageMin: Joi.number().integer().min(18).max(100),
  ageMax: Joi.number().integer().min(18).max(100),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
  location: Joi.string().trim().max(100),
  languages: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string().trim()
  ),
  skills: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string().trim()
  ),
  experienceLevel: Joi.string().valid('FRESHER', 'INTERMEDIATE', 'EXPERIENCED', 'VETERAN'),
  availability: Joi.string().valid('IMMEDIATE', 'WITHIN_WEEK', 'WITHIN_MONTH', 'FLEXIBLE'),
  minRating: Joi.number().min(0).max(5),
  verified: Joi.boolean(),
  format: Joi.string().valid('json', 'csv').default('json'),
});

/**
 * Validate talent ID param
 */
export const validateTalentId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid talent ID format',
    });
  }
  next();
};

// Export validators
export const validators = {
  searchTalents: validateQuery(searchTalentsSchema),
  saveSearch: validate(saveSearchSchema),
  pagination: validateQuery(paginationSchema),
  featuredTalents: validateQuery(featuredTalentsSchema),
  suggestions: validateQuery(suggestionsSchema),
  exportTalents: validateQuery(exportTalentsSchema),
  talentId: validateTalentId,
};