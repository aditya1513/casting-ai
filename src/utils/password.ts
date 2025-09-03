/**
 * Password Utility Functions
 * Secure password hashing and validation
 */

import bcrypt from 'bcryptjs';
import { config } from '../config/config';

/**
 * Hash a plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(config.security.bcryptRounds);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Validate password strength
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let strengthScore = 0;
  
  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    strengthScore++;
  }
  
  // Maximum length check
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    strengthScore++;
  }
  
  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    strengthScore++;
  }
  
  // Contains number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    strengthScore++;
  }
  
  // Contains special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    strengthScore++;
  }
  
  // Additional strength checks
  if (password.length >= 12) strengthScore++;
  if (password.length >= 16) strengthScore++;
  
  // Determine strength
  let strength: PasswordValidation['strength'];
  if (strengthScore <= 2) {
    strength = 'weak';
  } else if (strengthScore <= 4) {
    strength = 'medium';
  } else if (strengthScore <= 6) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * Generate random password
 */
export const generateRandomPassword = (length: number = 16): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + special;
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate OTP (One-Time Password)
 */
export const generateOTP = (length: number = 6): string => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
};

/**
 * Hash OTP for storage
 */
export const hashOTP = async (otp: string): Promise<string> => {
  // Use fewer rounds for OTP as it's short-lived
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Compare OTP
 */
export const compareOTP = async (otp: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(otp, hash);
};