/**
 * Authentication Validation Schemas
 * Zod schemas for auth-related request validation
 */

import { z } from 'zod';

/**
 * Email validation
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Password validation
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

/**
 * Phone validation (Indian format)
 */
const phoneSchema = z
  .string()
  .regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number')
  .transform(val => {
    // Normalize to +91 format
    if (val.startsWith('+91')) return val;
    return `+91${val}`;
  });

/**
 * Registration schema
 */
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(2).max(50).trim(),
    lastName: z.string().min(2).max(50).trim(),
    phone: phoneSchema.optional(),
    role: z.enum(['ACTOR', 'CASTING_DIRECTOR', 'PRODUCER']),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }).refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }),
});

/**
 * Verify email schema
 */
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

/**
 * Verify OTP schema
 */
export const verifyOTPSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
  }),
});

/**
 * Resend verification schema
 */
export const resendVerificationSchema = z.object({
  body: z.object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    type: z.enum(['email', 'phone']),
  }).refine(data => {
    if (data.type === 'email' && !data.email) {
      return false;
    }
    if (data.type === 'phone' && !data.phone) {
      return false;
    }
    return true;
  }, {
    message: 'Email or phone is required based on verification type',
  }),
});

// Export types
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>['body'];
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>['body'];