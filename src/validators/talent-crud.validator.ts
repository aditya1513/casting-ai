/**
 * Talent CRUD Validation Schemas
 * Comprehensive validation for talent profile operations
 */

import { z } from 'zod';
import {
  Gender,
  ExperienceLevel,
  AvailabilityStatus,
  UnionStatus,
} from '@prisma/client';

// Enums for validation
const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);
const ExperienceLevelEnum = z.enum(['FRESHER', 'BEGINNER', 'INTERMEDIATE', 'EXPERIENCED', 'EXPERT', 'VETERAN']);
const AvailabilityStatusEnum = z.enum(['AVAILABLE', 'BUSY', 'PARTIALLY_AVAILABLE', 'NOT_AVAILABLE', 'ON_PROJECT']);
const UnionStatusEnum = z.enum(['UNION_MEMBER', 'NON_UNION', 'ELIGIBLE', 'SAG_AFTRA', 'ACTORS_EQUITY', 'OTHER']);

/**
 * Create talent profile schema
 */
export const createTalentSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
    
    lastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
    middleName: z.string()
      .min(2, 'Middle name must be at least 2 characters')
      .max(50, 'Middle name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
      .optional(),
    
    displayName: z.string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be less than 100 characters')
      .optional(),
    
    dateOfBirth: z.string()
      .or(z.date())
      .transform((val) => new Date(val))
      .refine((date) => {
        const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18 && age <= 100;
      }, 'Age must be between 18 and 100 years'),
    
    gender: GenderEnum,
    
    nationality: z.string()
      .min(2, 'Nationality must be at least 2 characters')
      .max(50, 'Nationality must be less than 50 characters')
      .default('Indian'),
    
    primaryPhone: z.string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
      .transform((val) => val.replace(/\s/g, '')),
    
    email: z.string()
      .email('Invalid email format')
      .toLowerCase(),
    
    currentCity: z.string()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be less than 50 characters'),
    
    currentState: z.string()
      .min(2, 'State must be at least 2 characters')
      .max(50, 'State must be less than 50 characters'),
    
    currentPincode: z.string()
      .regex(/^\d{6}$/, 'Pincode must be 6 digits')
      .optional(),
    
    bio: z.string()
      .min(50, 'Bio must be at least 50 characters')
      .max(2000, 'Bio must be less than 2000 characters')
      .optional(),
    
    height: z.number()
      .min(100, 'Height must be at least 100 cm')
      .max(250, 'Height must be less than 250 cm')
      .optional(),
    
    weight: z.number()
      .min(30, 'Weight must be at least 30 kg')
      .max(200, 'Weight must be less than 200 kg')
      .optional(),
    
    languages: z.array(z.string())
      .min(1, 'At least one language is required')
      .max(10, 'Maximum 10 languages allowed')
      .optional(),
    
    actingSkills: z.array(z.string())
      .max(20, 'Maximum 20 acting skills allowed')
      .optional(),
    
    danceSkills: z.array(z.string())
      .max(15, 'Maximum 15 dance skills allowed')
      .optional(),
    
    specialSkills: z.array(z.string())
      .max(20, 'Maximum 20 special skills allowed')
      .optional(),
  }),
});

/**
 * Update talent profile schema
 */
export const updateTalentSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
      .optional(),
    
    lastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
      .optional(),
    
    middleName: z.string()
      .min(2, 'Middle name must be at least 2 characters')
      .max(50, 'Middle name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
      .nullable()
      .optional(),
    
    displayName: z.string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be less than 100 characters')
      .nullable()
      .optional(),
    
    dateOfBirth: z.string()
      .or(z.date())
      .transform((val) => new Date(val))
      .refine((date) => {
        const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18 && age <= 100;
      }, 'Age must be between 18 and 100 years')
      .optional(),
    
    gender: GenderEnum.optional(),
    
    nationality: z.string()
      .min(2, 'Nationality must be at least 2 characters')
      .max(50, 'Nationality must be less than 50 characters')
      .optional(),
    
    primaryPhone: z.string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
      .transform((val) => val.replace(/\s/g, ''))
      .optional(),
    
    secondaryPhone: z.string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
      .transform((val) => val.replace(/\s/g, ''))
      .nullable()
      .optional(),
    
    whatsappNumber: z.string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
      .transform((val) => val.replace(/\s/g, ''))
      .nullable()
      .optional(),
    
    email: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .optional(),
    
    alternateEmail: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .nullable()
      .optional(),
    
    currentCity: z.string()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be less than 50 characters')
      .optional(),
    
    currentState: z.string()
      .min(2, 'State must be at least 2 characters')
      .max(50, 'State must be less than 50 characters')
      .optional(),
    
    currentPincode: z.string()
      .regex(/^\d{6}$/, 'Pincode must be 6 digits')
      .nullable()
      .optional(),
    
    hometown: z.string()
      .min(2, 'Hometown must be at least 2 characters')
      .max(50, 'Hometown must be less than 50 characters')
      .nullable()
      .optional(),
    
    preferredLocations: z.array(z.string())
      .max(10, 'Maximum 10 preferred locations allowed')
      .optional(),
    
    willingToRelocate: z.boolean().optional(),
    
    bio: z.string()
      .min(50, 'Bio must be at least 50 characters')
      .max(2000, 'Bio must be less than 2000 characters')
      .nullable()
      .optional(),
    
    // Physical attributes
    height: z.number()
      .min(100, 'Height must be at least 100 cm')
      .max(250, 'Height must be less than 250 cm')
      .nullable()
      .optional(),
    
    weight: z.number()
      .min(30, 'Weight must be at least 30 kg')
      .max(200, 'Weight must be less than 200 kg')
      .nullable()
      .optional(),
    
    chest: z.number()
      .min(20, 'Chest must be at least 20 inches')
      .max(70, 'Chest must be less than 70 inches')
      .nullable()
      .optional(),
    
    waist: z.number()
      .min(20, 'Waist must be at least 20 inches')
      .max(60, 'Waist must be less than 60 inches')
      .nullable()
      .optional(),
    
    hips: z.number()
      .min(20, 'Hips must be at least 20 inches')
      .max(70, 'Hips must be less than 70 inches')
      .nullable()
      .optional(),
    
    shoeSize: z.string()
      .regex(/^(UK |US |EU )?[\d.]+$/, 'Invalid shoe size format')
      .nullable()
      .optional(),
    
    dressSize: z.string()
      .regex(/^(XS|S|M|L|XL|XXL|XXXL|\d+)$/, 'Invalid dress size format')
      .nullable()
      .optional(),
    
    // Professional details
    yearsOfExperience: z.number()
      .min(0, 'Experience cannot be negative')
      .max(50, 'Experience must be less than 50 years')
      .optional(),
    
    unionStatus: UnionStatusEnum.optional(),
    unionId: z.string().nullable().optional(),
    agentId: z.string().nullable().optional(),
    agencyName: z.string().nullable().optional(),
    managerName: z.string().nullable().optional(),
    managerContact: z.string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
      .nullable()
      .optional(),
    
    // Skills
    languages: z.array(z.string())
      .max(10, 'Maximum 10 languages allowed')
      .optional(),
    
    actingSkills: z.array(z.string())
      .max(20, 'Maximum 20 acting skills allowed')
      .optional(),
    
    danceSkills: z.array(z.string())
      .max(15, 'Maximum 15 dance skills allowed')
      .optional(),
    
    martialArts: z.array(z.string())
      .max(10, 'Maximum 10 martial arts allowed')
      .optional(),
    
    musicalInstruments: z.array(z.string())
      .max(10, 'Maximum 10 musical instruments allowed')
      .optional(),
    
    singingSkills: z.array(z.string())
      .max(10, 'Maximum 10 singing skills allowed')
      .optional(),
    
    dialects: z.array(z.string())
      .max(10, 'Maximum 10 dialects allowed')
      .optional(),
    
    accents: z.array(z.string())
      .max(10, 'Maximum 10 accents allowed')
      .optional(),
    
    specialSkills: z.array(z.string())
      .max(20, 'Maximum 20 special skills allowed')
      .optional(),
    
    // Language proficiency
    marathiProficiency: ExperienceLevelEnum.nullable().optional(),
    hindiProficiency: ExperienceLevelEnum.nullable().optional(),
    englishProficiency: ExperienceLevelEnum.nullable().optional(),
    gujaratiProficiency: ExperienceLevelEnum.nullable().optional(),
    
    regionalExperience: z.array(z.string())
      .max(10, 'Maximum 10 regional experiences allowed')
      .optional(),
    
    // Availability and rates
    availabilityStatus: AvailabilityStatusEnum.optional(),
    
    availableFrom: z.string()
      .or(z.date())
      .transform((val) => new Date(val))
      .nullable()
      .optional(),
    
    availableTo: z.string()
      .or(z.date())
      .transform((val) => new Date(val))
      .nullable()
      .optional(),
    
    minimumRate: z.number()
      .min(0, 'Rate cannot be negative')
      .max(10000000, 'Rate must be reasonable')
      .nullable()
      .optional(),
    
    maximumRate: z.number()
      .min(0, 'Rate cannot be negative')
      .max(10000000, 'Rate must be reasonable')
      .nullable()
      .optional(),
    
    preferredRate: z.number()
      .min(0, 'Rate cannot be negative')
      .max(10000000, 'Rate must be reasonable')
      .nullable()
      .optional(),
    
    rateNegotiable: z.boolean().optional(),
    
    // Social and portfolio
    profileImageUrl: z.string()
      .url('Invalid URL format')
      .nullable()
      .optional(),
    
    portfolioUrls: z.array(z.string().url('Invalid URL format'))
      .max(10, 'Maximum 10 portfolio URLs allowed')
      .optional(),
    
    instagramHandle: z.string()
      .regex(/^[a-zA-Z0-9_.]+$/, 'Invalid Instagram handle')
      .nullable()
      .optional(),
    
    facebookProfile: z.string()
      .url('Invalid Facebook URL')
      .nullable()
      .optional(),
    
    linkedinProfile: z.string()
      .url('Invalid LinkedIn URL')
      .nullable()
      .optional(),
    
    youtubeChannel: z.string()
      .url('Invalid YouTube URL')
      .nullable()
      .optional(),
    
    websiteUrl: z.string()
      .url('Invalid website URL')
      .nullable()
      .optional(),
  })
  .refine((data) => {
    // Validate rate range
    if (data.minimumRate && data.maximumRate && data.minimumRate > data.maximumRate) {
      return false;
    }
    // Validate date range
    if (data.availableFrom && data.availableTo && data.availableFrom > data.availableTo) {
      return false;
    }
    return true;
  }, {
    message: 'Invalid rate or date range',
  }),
});

/**
 * Search talents schema
 */
export const searchTalentsSchema = z.object({
  query: z.object({
    // Pagination
    page: z.string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform((val) => parseInt(val, 10))
      .optional(),
    
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform((val) => Math.min(parseInt(val, 10), 100))
      .optional(),
    
    sortBy: z.enum(['createdAt', 'updatedAt', 'rating', 'profileScore', 'yearsOfExperience', 'lastName'])
      .optional(),
    
    sortOrder: z.enum(['asc', 'desc'])
      .optional(),
    
    // Search and filters
    searchQuery: z.string()
      .max(100, 'Search query too long')
      .optional(),
    
    gender: GenderEnum.optional(),
    
    ageMin: z.string()
      .regex(/^\d+$/, 'Age must be a number')
      .transform((val) => parseInt(val, 10))
      .optional(),
    
    ageMax: z.string()
      .regex(/^\d+$/, 'Age must be a number')
      .transform((val) => parseInt(val, 10))
      .optional(),
    
    heightMin: z.string()
      .regex(/^\d+(\.\d+)?$/, 'Height must be a number')
      .transform((val) => parseFloat(val))
      .optional(),
    
    heightMax: z.string()
      .regex(/^\d+(\.\d+)?$/, 'Height must be a number')
      .transform((val) => parseFloat(val))
      .optional(),
    
    weightMin: z.string()
      .regex(/^\d+(\.\d+)?$/, 'Weight must be a number')
      .transform((val) => parseFloat(val))
      .optional(),
    
    weightMax: z.string()
      .regex(/^\d+(\.\d+)?$/, 'Weight must be a number')
      .transform((val) => parseFloat(val))
      .optional(),
    
    currentCity: z.string().optional(),
    currentState: z.string().optional(),
    
    languages: z.union([
      z.string().transform((val) => val.split(',')),
      z.array(z.string()),
    ]).optional(),
    
    actingSkills: z.union([
      z.string().transform((val) => val.split(',')),
      z.array(z.string()),
    ]).optional(),
    
    danceSkills: z.union([
      z.string().transform((val) => val.split(',')),
      z.array(z.string()),
    ]).optional(),
    
    specialSkills: z.union([
      z.string().transform((val) => val.split(',')),
      z.array(z.string()),
    ]).optional(),
    
    availabilityStatus: AvailabilityStatusEnum.optional(),
    experienceLevel: ExperienceLevelEnum.optional(),
    
    isVerified: z.enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
    
    minimumRate: z.string()
      .regex(/^\d+(\.\d+)?$/, 'Rate must be a number')
      .transform((val) => parseFloat(val))
      .optional(),
    
    maximumRate: z.string()
      .regex(/^\d+(\.\d+)?$/, 'Rate must be a number')
      .transform((val) => parseFloat(val))
      .optional(),
  }),
});

/**
 * Get talent by ID schema
 */
export const getTalentByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid talent ID format'),
  }),
});

/**
 * Delete talent schema
 */
export const deleteTalentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid talent ID format'),
  }),
});