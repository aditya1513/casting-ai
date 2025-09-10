/**
 * End-to-End Authentication Workflow Tests
 * Complete user journey testing using Playwright
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;

// Test data
const testUsers = {
  actor: {
    email: 'actor.e2e@test.com',
    password: 'ActorPass123!',
    firstName: 'John',
    lastName: 'Actor',
    role: 'ACTOR',
  },
  castingDirector: {
    email: 'cd.e2e@test.com',
    password: 'CdPass123!',
    firstName: 'Jane',
    lastName: 'Director',
    role: 'CASTING_DIRECTOR',
  },
  producer: {
    email: 'producer.e2e@test.com',
    password: 'ProducerPass123!',
    firstName: 'Bob',
    lastName: 'Producer',
    role: 'PRODUCER',
  },
};

test.describe('Authentication E2E Workflows', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.beforeEach(async () => {
    // Clean up database
    await prisma.session.deleteMany();
    await prisma.actor.deleteMany();
    await prisma.castingDirector.deleteMany();
    await prisma.producer.deleteMany();
    await prisma.user.deleteMany();
  });

  test.afterAll(async () => {
    await context.close();
    await prisma.$disconnect();
  });

  test.describe('User Registration Workflows', () => {
    test('should complete actor registration flow', async () => {
      const { actor } = testUsers;

      // Navigate to registration page
      await page.goto(`${BASE_URL}/register`);
      await expect(page).toHaveTitle(/Register/);

      // Fill registration form
      await page.fill('[data-testid="email-input"]', actor.email);
      await page.fill('[data-testid="password-input"]', actor.password);
      await page.fill('[data-testid="confirm-password-input"]', actor.password);
      await page.fill('[data-testid="first-name-input"]', actor.firstName);
      await page.fill('[data-testid="last-name-input"]', actor.lastName);
      
      // Select role
      await page.selectOption('[data-testid="role-select"]', actor.role);
      
      // Accept terms
      await page.check('[data-testid="accept-terms-checkbox"]');
      
      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Should redirect to dashboard or onboarding
      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

      // Verify success message or welcome content
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      
      // Verify user is created in database
      const dbUser = await prisma.user.findUnique({
        where: { email: actor.email },
        include: { actor: true },
      });
      
      expect(dbUser).toBeTruthy();
      expect(dbUser?.role).toBe('ACTOR');
      expect(dbUser?.actor?.firstName).toBe(actor.firstName);
    });

    test('should complete casting director registration flow', async () => {
      const { castingDirector } = testUsers;

      await page.goto(`${BASE_URL}/register`);
      
      await page.fill('[data-testid="email-input"]', castingDirector.email);
      await page.fill('[data-testid="password-input"]', castingDirector.password);
      await page.fill('[data-testid="confirm-password-input"]', castingDirector.password);
      await page.fill('[data-testid="first-name-input"]', castingDirector.firstName);
      await page.fill('[data-testid="last-name-input"]', castingDirector.lastName);
      
      await page.selectOption('[data-testid="role-select"]', castingDirector.role);
      await page.check('[data-testid="accept-terms-checkbox"]');
      
      await page.click('[data-testid="register-button"]');

      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

      const dbUser = await prisma.user.findUnique({
        where: { email: castingDirector.email },
        include: { castingDirector: true },
      });
      
      expect(dbUser?.role).toBe('CASTING_DIRECTOR');
      expect(dbUser?.castingDirector?.firstName).toBe(castingDirector.firstName);
    });

    test('should complete producer registration flow', async () => {
      const { producer } = testUsers;

      await page.goto(`${BASE_URL}/register`);
      
      await page.fill('[data-testid="email-input"]', producer.email);
      await page.fill('[data-testid="password-input"]', producer.password);
      await page.fill('[data-testid="confirm-password-input"]', producer.password);
      await page.fill('[data-testid="first-name-input"]', producer.firstName);
      await page.fill('[data-testid="last-name-input"]', producer.lastName);
      
      await page.selectOption('[data-testid="role-select"]', producer.role);
      await page.check('[data-testid="accept-terms-checkbox"]');
      
      await page.click('[data-testid="register-button"]');

      await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

      const dbUser = await prisma.user.findUnique({
        where: { email: producer.email },
        include: { producer: true },
      });
      
      expect(dbUser?.role).toBe('PRODUCER');
      expect(dbUser?.producer?.firstName).toBe(producer.firstName);
    });

    test('should handle registration validation errors', async () => {
      await page.goto(`${BASE_URL}/register`);

      // Submit empty form
      await page.click('[data-testid="register-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();

      // Fill with invalid data
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'different');
      
      await page.click('[data-testid="register-button"]');

      // Should show specific validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('at least 8 characters');
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('match');
    });

    test('should prevent duplicate email registration', async () => {
      const { actor } = testUsers;

      // Create existing user
      await prisma.user.create({
        data: {
          email: actor.email,
          password: await hashPassword(actor.password),
          role: 'ACTOR',
          actor: {
            create: {
              firstName: actor.firstName,
              lastName: actor.lastName,
              dateOfBirth: new Date('1990-01-01'),
              gender: 'MALE',
              city: 'Mumbai',
              state: 'Maharashtra',
              languages: ['English'],
              skills: ['Acting'],
            },
          },
        },
      });

      await page.goto(`${BASE_URL}/register`);
      
      await page.fill('[data-testid="email-input"]', actor.email);
      await page.fill('[data-testid="password-input"]', actor.password);
      await page.fill('[data-testid="confirm-password-input"]', actor.password);
      await page.fill('[data-testid="first-name-input"]', actor.firstName);
      await page.fill('[data-testid="last-name-input"]', actor.lastName);
      
      await page.selectOption('[data-testid="role-select"]', actor.role);
      await page.check('[data-testid="accept-terms-checkbox"]');
      
      await page.click('[data-testid="register-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('already registered');
      
      // Should stay on registration page
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('User Login Workflows', () => {
    test.beforeEach(async () => {
      // Create test users for login tests
      await prisma.user.create({
        data: {
          email: testUsers.actor.email,
          password: await hashPassword(testUsers.actor.password),
          role: 'ACTOR',
          isActive: true,
          actor: {
            create: {
              firstName: testUsers.actor.firstName,
              lastName: testUsers.actor.lastName,
              dateOfBirth: new Date('1990-01-01'),
              gender: 'MALE',
              city: 'Mumbai',
              state: 'Maharashtra',
              languages: ['English'],
              skills: ['Acting'],
            },
          },
        },
      });
    });

    test('should complete successful login flow', async () => {
      const { actor } = testUsers;

      await page.goto(`${BASE_URL}/login`);
      await expect(page).toHaveTitle(/Login/);

      // Fill login form
      await page.fill('[data-testid="email-input"]', actor.email);
      await page.fill('[data-testid="password-input"]', actor.password);
      
      // Optional: Check remember me
      await page.check('[data-testid="remember-me-checkbox"]');
      
      await page.click('[data-testid="login-button"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Should show user information
      await expect(page.locator('[data-testid="user-name"]')).toContainText(actor.firstName);
      
      // Verify session is created in database
      const sessions = await prisma.session.findMany({
        where: {
          user: {
            email: actor.email,
          },
        },
      });
      
      expect(sessions.length).toBe(1);
    });

    test('should handle login with invalid credentials', async () => {
      const { actor } = testUsers;

      await page.goto(`${BASE_URL}/login`);
      
      await page.fill('[data-testid="email-input"]', actor.email);
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
      
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
      
      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle login with non-existent user', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
      await page.fill('[data-testid="password-input"]', 'AnyPassword123!');
      
      await page.click('[data-testid="login-button"]');

      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle login form validation', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      // Submit empty form
      await page.click('[data-testid="login-button"]');

      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

      // Fill invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="login-button"]');

      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
    });

    test('should redirect authenticated users away from login page', async () => {
      // First login
      await loginUser(page, testUsers.actor);
      
      // Try to access login page again
      await page.goto(`${BASE_URL}/login`);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Password Reset Workflows', () => {
    test.beforeEach(async () => {
      await prisma.user.create({
        data: {
          email: testUsers.actor.email,
          password: await hashPassword(testUsers.actor.password),
          role: 'ACTOR',
          isActive: true,
          actor: {
            create: {
              firstName: testUsers.actor.firstName,
              lastName: testUsers.actor.lastName,
              dateOfBirth: new Date('1990-01-01'),
              gender: 'MALE',
              city: 'Mumbai',
              state: 'Maharashtra',
              languages: ['English'],
              skills: ['Acting'],
            },
          },
        },
      });
    });

    test('should initiate password reset flow', async () => {
      const { actor } = testUsers;

      await page.goto(`${BASE_URL}/forgot-password`);
      
      await page.fill('[data-testid="email-input"]', actor.email);
      await page.click('[data-testid="send-reset-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('reset instructions');
      
      // Verify reset token is stored in database
      const user = await prisma.user.findUnique({
        where: { email: actor.email },
      });
      
      expect(user?.resetToken).toBeTruthy();
      expect(user?.resetTokenExpiry).toBeTruthy();
    });

    test('should handle password reset with non-existent email', async () => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      await page.fill('[data-testid="email-input"]', 'nonexistent@test.com');
      await page.click('[data-testid="send-reset-button"]');

      // Should show same success message (security measure)
      await expect(page.locator('[data-testid="success-message"]')).toContainText('reset instructions');
    });

    test('should complete password reset with valid token', async () => {
      // This test would require access to generated reset token
      // In a real scenario, you might need to mock email service or access token from database
      const { actor } = testUsers;

      // First, initiate password reset
      const response = await page.request.post(`${API_BASE_URL}/auth/forgot-password`, {
        data: { email: actor.email },
      });
      expect(response.ok()).toBeTruthy();

      // Get reset token from database (in real scenario, user would get this via email)
      const user = await prisma.user.findUnique({
        where: { email: actor.email },
      });
      const resetToken = user?.resetToken;

      // Navigate to reset password page with token
      await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`);
      
      const newPassword = 'NewSecurePass123!';
      await page.fill('[data-testid="password-input"]', newPassword);
      await page.fill('[data-testid="confirm-password-input"]', newPassword);
      
      await page.click('[data-testid="reset-password-button"]');

      // Should redirect to login with success message
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="success-message"]')).toContainText('password reset');

      // Should be able to login with new password
      await page.fill('[data-testid="email-input"]', actor.email);
      await page.fill('[data-testid="password-input"]', newPassword);
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('User Profile Management Workflows', () => {
    test.beforeEach(async () => {
      await prisma.user.create({
        data: {
          email: testUsers.actor.email,
          password: await hashPassword(testUsers.actor.password),
          role: 'ACTOR',
          isActive: true,
          actor: {
            create: {
              firstName: testUsers.actor.firstName,
              lastName: testUsers.actor.lastName,
              dateOfBirth: new Date('1990-01-01'),
              gender: 'MALE',
              city: 'Mumbai',
              state: 'Maharashtra',
              languages: ['English'],
              skills: ['Acting'],
            },
          },
        },
      });
    });

    test('should access and update profile information', async () => {
      const { actor } = testUsers;

      await loginUser(page, actor);
      
      // Navigate to profile page
      await page.click('[data-testid="profile-menu"]');
      await page.click('[data-testid="edit-profile-link"]');
      
      await expect(page).toHaveURL(/\/profile/);
      
      // Update profile information
      await page.fill('[data-testid="bio-textarea"]', 'Updated bio for E2E test');
      await page.selectOption('[data-testid="city-select"]', 'Delhi');
      
      // Add new language
      await page.click('[data-testid="add-language-button"]');
      await page.selectOption('[data-testid="language-select-1"]', 'Hindi');
      
      // Save changes
      await page.click('[data-testid="save-profile-button"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated');
      
      // Verify changes in database
      const updatedUser = await prisma.user.findUnique({
        where: { email: actor.email },
        include: { actor: true },
      });
      
      expect(updatedUser?.actor?.bio).toBe('Updated bio for E2E test');
      expect(updatedUser?.actor?.city).toBe('Delhi');
      expect(updatedUser?.actor?.languages).toContain('Hindi');
    });

    test('should handle profile image upload', async () => {
      const { actor } = testUsers;

      await loginUser(page, actor);
      await page.goto(`${BASE_URL}/profile`);
      
      // Upload profile image (mock file upload)
      const fileInput = page.locator('[data-testid="profile-image-input"]');
      await fileInput.setInputFiles({
        name: 'profile.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-content'),
      });
      
      await page.click('[data-testid="upload-image-button"]');
      
      // Should show upload success
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Image uploaded');
      
      // Profile image should be updated
      await expect(page.locator('[data-testid="profile-image"]')).toHaveAttribute('src', /\/uploads\//);
    });
  });

  test.describe('Session Management Workflows', () => {
    test.beforeEach(async () => {
      await prisma.user.create({
        data: {
          email: testUsers.actor.email,
          password: await hashPassword(testUsers.actor.password),
          role: 'ACTOR',
          isActive: true,
          actor: {
            create: {
              firstName: testUsers.actor.firstName,
              lastName: testUsers.actor.lastName,
              dateOfBirth: new Date('1990-01-01'),
              gender: 'MALE',
              city: 'Mumbai',
              state: 'Maharashtra',
              languages: ['English'],
              skills: ['Acting'],
            },
          },
        },
      });
    });

    test('should logout user successfully', async () => {
      const { actor } = testUsers;

      await loginUser(page, actor);
      
      // Logout
      await page.click('[data-testid="profile-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should show logout success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('logged out');
      
      // Session should be removed from database
      const sessions = await prisma.session.findMany({
        where: {
          user: {
            email: actor.email,
          },
        },
      });
      
      expect(sessions.length).toBe(0);
      
      // Should not be able to access protected routes
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle session expiration gracefully', async () => {
      const { actor } = testUsers;

      await loginUser(page, actor);
      
      // Manually expire session in database
      await prisma.session.updateMany({
        where: {
          user: {
            email: actor.email,
          },
        },
        data: {
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });
      
      // Try to access protected route
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="error-message"]')).toContainText('session expired');
    });

    test('should maintain session across browser refresh', async () => {
      const { actor } = testUsers;

      await loginUser(page, actor);
      
      // Refresh page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="user-name"]')).toContainText(actor.firstName);
    });
  });

  // Helper function to login user
  async function loginUser(page: Page, user: { email: string; password: string }) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/\/dashboard/);
  }
});