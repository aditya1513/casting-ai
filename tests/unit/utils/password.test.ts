/**
 * Password Utility Tests
 */

import {
  hashPassword,
  comparePassword,
  validatePassword,
  generateRandomPassword,
  generateOTP,
} from '../../../src/utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });
    
    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });
    
    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });
  
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = validatePassword('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });
    
    it('should reject a weak password', () => {
      const result = validatePassword('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.strength).toBe('weak');
    });
    
    it('should reject password without uppercase', () => {
      const result = validatePassword('noupppercase123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });
    
    it('should reject password without lowercase', () => {
      const result = validatePassword('NOLOWERCASE123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });
    
    it('should reject password without numbers', () => {
      const result = validatePassword('NoNumbers!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });
    
    it('should reject password without special characters', () => {
      const result = validatePassword('NoSpecial123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
    
    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Short1!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });
  
  describe('generateRandomPassword', () => {
    it('should generate a password of specified length', () => {
      const password = generateRandomPassword(16);
      expect(password).toHaveLength(16);
    });
    
    it('should generate a valid password', () => {
      const password = generateRandomPassword();
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should generate different passwords each time', () => {
      const password1 = generateRandomPassword();
      const password2 = generateRandomPassword();
      
      expect(password1).not.toBe(password2);
    });
  });
  
  describe('generateOTP', () => {
    it('should generate OTP of specified length', () => {
      const otp = generateOTP(6);
      expect(otp).toHaveLength(6);
    });
    
    it('should generate OTP with only numbers', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\\d+$/);
    });
    
    it('should generate different OTPs each time', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      
      // Small chance they could be the same, but unlikely
      expect(otp1).not.toBe(otp2);
    });
  });
});