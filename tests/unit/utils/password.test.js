"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_1 = require("../../../src/utils/password");
describe('Password Utilities', () => {
    describe('hashPassword', () => {
        it('should hash a password', async () => {
            const password = 'TestPassword123!';
            const hash = await (0, password_1.hashPassword)(password);
            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(50);
        });
        it('should generate different hashes for the same password', async () => {
            const password = 'TestPassword123!';
            const hash1 = await (0, password_1.hashPassword)(password);
            const hash2 = await (0, password_1.hashPassword)(password);
            expect(hash1).not.toBe(hash2);
        });
    });
    describe('comparePassword', () => {
        it('should return true for matching password', async () => {
            const password = 'TestPassword123!';
            const hash = await (0, password_1.hashPassword)(password);
            const result = await (0, password_1.comparePassword)(password, hash);
            expect(result).toBe(true);
        });
        it('should return false for non-matching password', async () => {
            const password = 'TestPassword123!';
            const wrongPassword = 'WrongPassword123!';
            const hash = await (0, password_1.hashPassword)(password);
            const result = await (0, password_1.comparePassword)(wrongPassword, hash);
            expect(result).toBe(false);
        });
    });
    describe('validatePassword', () => {
        it('should validate a strong password', () => {
            const result = (0, password_1.validatePassword)('StrongPass123!');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.strength).toBe('strong');
        });
        it('should reject a weak password', () => {
            const result = (0, password_1.validatePassword)('weak');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.strength).toBe('weak');
        });
        it('should reject password without uppercase', () => {
            const result = (0, password_1.validatePassword)('noupppercase123!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one uppercase letter');
        });
        it('should reject password without lowercase', () => {
            const result = (0, password_1.validatePassword)('NOLOWERCASE123!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one lowercase letter');
        });
        it('should reject password without numbers', () => {
            const result = (0, password_1.validatePassword)('NoNumbers!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one number');
        });
        it('should reject password without special characters', () => {
            const result = (0, password_1.validatePassword)('NoSpecial123');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one special character');
        });
        it('should reject password shorter than 8 characters', () => {
            const result = (0, password_1.validatePassword)('Short1!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must be at least 8 characters long');
        });
    });
    describe('generateRandomPassword', () => {
        it('should generate a password of specified length', () => {
            const password = (0, password_1.generateRandomPassword)(16);
            expect(password).toHaveLength(16);
        });
        it('should generate a valid password', () => {
            const password = (0, password_1.generateRandomPassword)();
            const result = (0, password_1.validatePassword)(password);
            expect(result.isValid).toBe(true);
        });
        it('should generate different passwords each time', () => {
            const password1 = (0, password_1.generateRandomPassword)();
            const password2 = (0, password_1.generateRandomPassword)();
            expect(password1).not.toBe(password2);
        });
    });
    describe('generateOTP', () => {
        it('should generate OTP of specified length', () => {
            const otp = (0, password_1.generateOTP)(6);
            expect(otp).toHaveLength(6);
        });
        it('should generate OTP with only numbers', () => {
            const otp = (0, password_1.generateOTP)();
            expect(otp).toMatch(/^\\d+$/);
        });
        it('should generate different OTPs each time', () => {
            const otp1 = (0, password_1.generateOTP)();
            const otp2 = (0, password_1.generateOTP)();
            expect(otp1).not.toBe(otp2);
        });
    });
});
//# sourceMappingURL=password.test.js.map