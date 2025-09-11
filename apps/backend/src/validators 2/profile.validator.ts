/**
 * Profile Validation Schemas
 * Validation schemas for profile management endpoints
 */

import { z } from 'zod';

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  display_name: z.string().trim().min(2).max(100).optional(),
  first_name: z.string().trim().min(1).max(50).optional(),
  last_name: z.string().trim().min(1).max(50).optional(),
  phone_number: z.string().regex(/^\+?[\d\s-()]+$/).min(10).max(20).optional(),
  date_of_birth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  location: z.string().trim().max(255).optional(),
  bio: z.string().trim().max(2000).optional(),
  preferred_language: z.enum(['ENGLISH', 'HINDI', 'MARATHI', 'GUJARATI', 'TAMIL', 'TELUGU', 'BENGALI', 'KANNADA', 'MALAYALAM', 'PUNJABI', 'URDU']).optional(),
  timezone: z.string().optional(),
  privacy_settings: z.object({
    show_email: z.boolean().optional(),
    show_phone: z.boolean().optional(),
    allow_messages: z.boolean().optional(),
    public_profile: z.boolean().optional()
  }).optional()
});

/**
 * Social account link schema
 */
export const linkSocialAccountSchema = z.object({
  provider: z.enum(['GOOGLE', 'GITHUB', 'LINKEDIN', 'FACEBOOK']),
  access_token: z.string(),
  provider_account_id: z.string(),
  provider_display_name: z.string().optional(),
  is_primary: z.boolean().optional().default(false)
});

/**
 * Social account unlink schema
 */
export const unlinkSocialAccountSchema = z.object({
  provider: z.enum(['GOOGLE', 'GITHUB', 'LINKEDIN', 'FACEBOOK'])
});

/**
 * Password reset request schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim()
});

/**
 * Password reset schema
 */
export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});