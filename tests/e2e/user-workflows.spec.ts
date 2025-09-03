/**
 * End-to-End User Workflow Tests
 * Complete user journey testing for all critical workflows
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data generators
const generateUserData = () => ({
  email: faker.internet.email(),
  password: 'SecurePass123!',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phoneNumber: faker.phone.number('+91##########')
});

const generateActorProfile = () => ({
  bio: faker.lorem.paragraph(3),
  location: 'Mumbai, Maharashtra',
  languages: ['English', 'Hindi', 'Marathi'],
  skills: ['Acting', 'Dancing', 'Singing'],
  experience: faker.lorem.sentences(2)
});

test.describe('Complete User Workflows', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // Emulate device
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    page = await context.newPage();

    // Setup network monitoring
    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        console.log(`❌ ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Actor Registration and Onboarding Flow', () => {
    let actorData: ReturnType<typeof generateUserData>;
    let profileData: ReturnType<typeof generateActorProfile>;

    test.beforeEach(() => {
      actorData = generateUserData();
      profileData = generateActorProfile();
    });

    test('Complete actor registration and profile setup', async () => {
      // Step 1: Navigate to registration
      await page.goto('/auth/register');
      await expect(page).toHaveTitle(/Register.*CastMatch/);

      // Step 2: Fill registration form
      await page.fill('[data-testid="email-input"]', actorData.email);
      await page.fill('[data-testid="password-input"]', actorData.password);
      await page.fill('[data-testid="confirm-password-input"]', actorData.password);
      await page.fill('[data-testid="first-name-input"]', actorData.firstName);
      await page.fill('[data-testid="last-name-input"]', actorData.lastName);
      
      // Select role
      await page.selectOption('[data-testid="role-select"]', 'ACTOR');

      // Step 3: Submit registration
      await page.click('[data-testid="register-button"]');

      // Step 4: Check for successful registration
      await expect(page.locator('[data-testid="success-message"]'))
        .toContainText('Registration successful');

      // Step 5: Verify email verification prompt
      await expect(page.locator('[data-testid="verification-notice"]'))
        .toContainText('verify your email');

      // Step 6: Simulate email verification (in real test, would check email)
      // For now, navigate to verification endpoint directly
      const verificationToken = 'mock-verification-token';
      await page.goto(`/auth/verify-email?token=${verificationToken}`);

      // Step 7: Verify email confirmation
      await expect(page.locator('[data-testid="email-verified"]'))
        .toContainText('Email verified successfully');

      // Step 8: Complete profile setup
      await page.goto('/profile/setup');
      
      // Fill profile details
      await page.fill('[data-testid="bio-textarea"]', profileData.bio);
      await page.fill('[data-testid="location-input"]', profileData.location);
      await page.fill('[data-testid="phone-input"]', actorData.phoneNumber);

      // Add languages
      for (const language of profileData.languages) {
        await page.click('[data-testid="add-language-button"]');
        await page.fill('[data-testid="language-input"]:last-child', language);
      }

      // Add skills
      for (const skill of profileData.skills) {
        await page.click('[data-testid="add-skill-button"]');
        await page.selectOption('[data-testid="skill-select"]:last-child', skill);
      }

      // Step 9: Upload profile picture
      const fileInput = page.locator('[data-testid="avatar-upload"]');
      await fileInput.setInputFiles({
        name: 'profile.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      // Step 10: Submit profile
      await page.click('[data-testid="save-profile-button"]');

      // Step 11: Verify profile completion
      await expect(page.locator('[data-testid="profile-completion-score"]'))
        .toContainText(/\d+%/);
      
      // Step 12: Navigate to dashboard
      await page.click('[data-testid="go-to-dashboard"]');
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Step 13: Verify dashboard elements
      await expect(page.locator('[data-testid="welcome-message"]'))
        .toContainText(`Welcome, ${actorData.firstName}`);
      
      await expect(page.locator('[data-testid="user-role"]'))
        .toContainText('Actor');

      // Step 14: Check profile completeness indicators
      await expect(page.locator('[data-testid="profile-completeness"]'))
        .toBeVisible();
    });

    test('Registration with validation errors', async () => {
      await page.goto('/auth/register');

      // Try to submit without required fields
      await page.click('[data-testid="register-button"]');

      // Check validation errors
      await expect(page.locator('[data-testid="email-error"]'))
        .toContainText('Email is required');
      
      // Fill invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="email-error"]'))
        .toContainText('Invalid email format');

      // Fill weak password
      await page.fill('[data-testid="email-input"]', actorData.email);
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="password-error"]'))
        .toContainText('Password must be at least');
    });
  });

  test.describe('Social Authentication Flows', () => {
    test('Google OAuth registration flow', async () => {
      await page.goto('/auth/login');

      // Mock Google OAuth redirect
      await page.route('https://accounts.google.com/oauth/authorize*', route => {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/auth/callback/google?code=mock-auth-code&state=mock-state'
          }
        });
      });

      // Mock OAuth callback
      await page.route('/auth/callback/google*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'google-user-123',
                email: 'google.user@gmail.com',
                firstName: 'Google',
                lastName: 'User'
              },
              token: 'mock-jwt-token'
            }
          })
        });
      });

      // Click Google login
      await page.click('[data-testid="google-login-button"]');

      // Should redirect to dashboard after successful OAuth
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="welcome-message"]'))
        .toContainText('Welcome, Google');
    });

    test('GitHub OAuth registration flow', async () => {
      await page.goto('/auth/login');

      // Similar mock setup for GitHub
      await page.route('https://github.com/login/oauth/authorize*', route => {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/auth/callback/github?code=mock-github-code&state=mock-state'
          }
        });
      });

      await page.click('[data-testid="github-login-button"]');
      
      // Verify successful GitHub OAuth
      await expect(page).toHaveURL(/.*\/dashboard/);
    });
  });

  test.describe('Password Recovery Flow', () => {
    test('Complete password reset workflow', async () => {
      const userEmail = 'reset.user@castmatch.ai';

      // Step 1: Go to login page
      await page.goto('/auth/login');
      await page.click('[data-testid="forgot-password-link"]');

      // Step 2: Fill forgot password form
      await expect(page).toHaveURL(/.*\/auth\/forgot-password/);
      await page.fill('[data-testid="reset-email-input"]', userEmail);
      await page.click('[data-testid="send-reset-button"]');

      // Step 3: Verify reset email sent message
      await expect(page.locator('[data-testid="reset-sent-message"]'))
        .toContainText('password reset link has been sent');

      // Step 4: Simulate clicking reset link from email
      const resetToken = 'mock-reset-token-123';
      await page.goto(`/auth/reset-password?token=${resetToken}`);

      // Step 5: Fill new password form
      const newPassword = 'NewSecurePass123!';
      await page.fill('[data-testid="new-password-input"]', newPassword);
      await page.fill('[data-testid="confirm-new-password-input"]', newPassword);
      await page.click('[data-testid="reset-password-button"]');

      // Step 6: Verify password reset success
      await expect(page.locator('[data-testid="password-reset-success"]'))
        .toContainText('Password reset successful');

      // Step 7: Test login with new password
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', userEmail);
      await page.fill('[data-testid="password-input"]', newPassword);
      await page.click('[data-testid="login-button"]');

      // Step 8: Verify successful login
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('Invalid reset token handling', async () => {
      await page.goto('/auth/reset-password?token=invalid-token');
      
      await expect(page.locator('[data-testid="error-message"]'))
        .toContainText('Invalid or expired reset token');
      
      // Should redirect to forgot password page
      await expect(page).toHaveURL(/.*\/auth\/forgot-password/);
    });
  });

  test.describe('Profile Management Workflows', () => {
    test.beforeEach(async () => {
      // Login as existing user
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'test.actor@castmatch.ai');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('Complete profile editing workflow', async () => {
      // Navigate to profile settings
      await page.click('[data-testid="profile-menu"]');
      await page.click('[data-testid="edit-profile-link"]');

      // Update basic information
      await page.fill('[data-testid="bio-textarea"]', 'Updated professional bio');
      await page.fill('[data-testid="location-input"]', 'Delhi, India');

      // Update skills
      await page.click('[data-testid="remove-skill-0"]'); // Remove first skill
      await page.click('[data-testid="add-skill-button"]');
      await page.selectOption('[data-testid="skill-select"]:last-child', 'Voice Acting');

      // Update experience
      await page.click('[data-testid="add-experience-button"]');
      await page.fill('[data-testid="experience-title-0"]', 'Lead Actor');
      await page.fill('[data-testid="experience-company-0"]', 'Mumbai Theatre');
      await page.fill('[data-testid="experience-duration-0"]', '2020-2023');

      // Save changes
      await page.click('[data-testid="save-profile-button"]');

      // Verify success message
      await expect(page.locator('[data-testid="profile-updated-message"]'))
        .toContainText('Profile updated successfully');

      // Verify changes are reflected
      await expect(page.locator('[data-testid="bio-display"]'))
        .toContainText('Updated professional bio');
    });

    test('Avatar upload workflow', async () => {
      await page.goto('/profile/edit');

      // Upload new avatar
      const fileInput = page.locator('[data-testid="avatar-upload-input"]');
      await fileInput.setInputFiles({
        name: 'new-avatar.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('new-avatar-data')
      });

      // Wait for upload to complete
      await expect(page.locator('[data-testid="upload-progress"]')).toBeHidden();

      // Verify avatar preview updated
      await expect(page.locator('[data-testid="avatar-preview"]'))
        .toHaveAttribute('src', /.*new-avatar.*/);

      // Save changes
      await page.click('[data-testid="save-profile-button"]');
      
      // Verify avatar in dashboard
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="user-avatar"]'))
        .toHaveAttribute('src', /.*new-avatar.*/);
    });

    test('Privacy settings management', async () => {
      await page.goto('/profile/privacy');

      // Update privacy settings
      await page.uncheck('[data-testid="show-email-checkbox"]');
      await page.uncheck('[data-testid="show-phone-checkbox"]');
      await page.check('[data-testid="allow-messages-checkbox"]');

      // Set profile to private
      await page.uncheck('[data-testid="public-profile-checkbox"]');

      await page.click('[data-testid="save-privacy-button"]');

      // Verify settings saved
      await expect(page.locator('[data-testid="privacy-saved-message"]'))
        .toContainText('Privacy settings updated');

      // Test public profile view (should be restricted)
      await page.goto('/profile/123/public');
      await expect(page.locator('[data-testid="private-profile-message"]'))
        .toContainText('This profile is private');
    });
  });

  test.describe('Cross-Role Interaction Workflows', () => {
    test('Casting Director searching and contacting Actors', async () => {
      // Login as Casting Director
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'director@castmatch.ai');
      await page.fill('[data-testid="password-input"]', 'DirectorPass123!');
      await page.click('[data-testid="login-button"]');

      // Navigate to talent search
      await page.click('[data-testid="search-talent-menu"]');
      
      // Use advanced search filters
      await page.fill('[data-testid="search-query"]', 'Mumbai actor');
      await page.selectOption('[data-testid="skills-filter"]', 'Acting');
      await page.selectOption('[data-testid="location-filter"]', 'Mumbai');
      await page.selectOption('[data-testid="language-filter"]', 'Hindi');
      
      await page.click('[data-testid="search-button"]');

      // Wait for results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="result-count"]'))
        .toContainText(/\d+ results found/);

      // View actor profile
      await page.click('[data-testid="view-profile-0"]');
      
      // Verify profile details visible to casting director
      await expect(page.locator('[data-testid="actor-bio"]')).toBeVisible();
      await expect(page.locator('[data-testid="actor-skills"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-button"]')).toBeVisible();

      // Send message to actor
      await page.click('[data-testid="contact-button"]');
      await page.fill('[data-testid="message-subject"]', 'Audition Opportunity');
      await page.fill('[data-testid="message-body"]', 'We have an exciting role...');
      await page.click('[data-testid="send-message-button"]');

      // Verify message sent
      await expect(page.locator('[data-testid="message-sent-confirmation"]'))
        .toContainText('Message sent successfully');
    });

    test('Actor responding to casting opportunities', async () => {
      // Login as Actor
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'actor@castmatch.ai');
      await page.fill('[data-testid="password-input"]', 'ActorPass123!');
      await page.click('[data-testid="login-button"]');

      // Check for notifications
      await expect(page.locator('[data-testid="notification-badge"]'))
        .toContainText('1');

      // Open notifications
      await page.click('[data-testid="notifications-button"]');
      await expect(page.locator('[data-testid="notification-0"]'))
        .toContainText('New message from casting director');

      // View message
      await page.click('[data-testid="view-message-0"]');
      await expect(page.locator('[data-testid="message-subject"]'))
        .toContainText('Audition Opportunity');

      // Reply to message
      await page.click('[data-testid="reply-button"]');
      await page.fill('[data-testid="reply-message"]', 'I am very interested...');
      await page.click('[data-testid="send-reply-button"]');

      // Mark interest in opportunity
      await page.click('[data-testid="mark-interested-button"]');
      await expect(page.locator('[data-testid="interest-marked"]'))
        .toContainText('Interest registered');

      // Update availability
      await page.goto('/profile/availability');
      await page.check('[data-testid="available-checkbox"]');
      await page.fill('[data-testid="availability-notes"]', 'Available for shoots in Mumbai');
      await page.click('[data-testid="save-availability"]');
    });
  });

  test.describe('Accessibility Compliance Tests', () => {
    test('Keyboard navigation throughout application', async () => {
      await page.goto('/');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'main-nav');

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'login-link');

      // Navigate to login
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/.*\/auth\/login/);

      // Fill form using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.type('user@castmatch.ai');
      
      await page.keyboard.press('Tab');
      await page.keyboard.type('password123');

      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Submit form
    });

    test('Screen reader compatibility', async () => {
      await page.goto('/auth/register');

      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="email-input"]'))
        .toHaveAttribute('aria-label', 'Email address');

      await expect(page.locator('[data-testid="password-input"]'))
        .toHaveAttribute('aria-label', 'Password');

      // Check for form validation announcements
      await page.fill('[data-testid="email-input"]', 'invalid');
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('[aria-live="polite"]'))
        .toContainText('Please enter a valid email address');
    });

    test('Color contrast and visual accessibility', async () => {
      await page.goto('/');

      // Check that important elements meet contrast ratios
      const loginButton = page.locator('[data-testid="login-button"]');
      const buttonStyles = await loginButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      });

      // Verify sufficient contrast (basic check - in real tests would use axe-core)
      expect(buttonStyles.backgroundColor).not.toBe(buttonStyles.color);
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('Mobile registration workflow', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/auth/register');

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();

      // Complete registration on mobile
      const mobileUser = generateUserData();
      
      await page.fill('[data-testid="email-input"]', mobileUser.email);
      await page.fill('[data-testid="password-input"]', mobileUser.password);
      await page.fill('[data-testid="first-name-input"]', mobileUser.firstName);
      await page.fill('[data-testid="last-name-input"]', mobileUser.lastName);
      await page.selectOption('[data-testid="role-select"]', 'ACTOR');

      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('Tablet dashboard experience', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Login and navigate to dashboard
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'tablet.user@castmatch.ai');
      await page.fill('[data-testid="password-input"]', 'TabletPass123!');
      await page.click('[data-testid="login-button"]');

      // Verify tablet-optimized layout
      await expect(page.locator('[data-testid="tablet-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-grid"]'))
        .toHaveClass(/tablet-grid/);

      // Test touch interactions
      await page.tap('[data-testid="profile-card"]');
      await expect(page).toHaveURL(/.*\/profile/);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Network failure recovery', async () => {
      await page.goto('/auth/login');

      // Simulate network failure
      await page.route('**/api/auth/login', route => {
        route.abort('connectionrefused');
      });

      await page.fill('[data-testid="email-input"]', 'user@castmatch.ai');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-button"]');

      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]'))
        .toContainText('Unable to connect');
      
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Simulate network recovery
      await page.unroute('**/api/auth/login');
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { user: {}, token: 'mock-token' }
          })
        });
      });

      // Retry and verify success
      await page.click('[data-testid="retry-button"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('Session expiry handling', async () => {
      // Login normally
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'session.user@castmatch.ai');
      await page.fill('[data-testid="password-input"]', 'SessionPass123!');
      await page.click('[data-testid="login-button"]');

      // Simulate expired session
      await page.route('**/api/**', route => {
        if (route.request().headers()['authorization']) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Token expired'
            })
          });
        } else {
          route.continue();
        }
      });

      // Try to access protected resource
      await page.goto('/profile/edit');

      // Should redirect to login with message
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await expect(page.locator('[data-testid="session-expired-message"]'))
        .toContainText('Your session has expired');
    });
  });
});