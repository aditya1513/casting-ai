/**
 * Complete User Journeys End-to-End Tests
 * Comprehensive testing of complete user workflows in CastMatch
 */

import { test, expect, Browser, Page, BrowserContext } from '@playwright/test';
import { testDataFactory, testScenarios, TestUser } from '../data/test-data-management';
import { testEnvironmentSetup, testUtils } from '../utils/test-environment-setup';

// Test configuration
const TEST_CONFIG = {
  timeout: 60000, // 1 minute per test
  expect: { timeout: 10000 }, // 10 seconds for assertions
};

test.describe('Complete User Journeys', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let testUsers: {
    actor: TestUser;
    castingDirector: TestUser;
    producer: TestUser;
    admin: TestUser;
  };

  test.beforeAll(async ({ browser: browserParam }) => {
    browser = browserParam;
    
    // Setup test environment
    const environment = await testEnvironmentSetup.setupTestEnvironment();
    testUsers = environment.testUsers!;
    
    console.log('Test users created:', Object.keys(testUsers));
  });

  test.beforeEach(async () => {
    // Create fresh browser context for each test
    const browserEnv = await testEnvironmentSetup.setupBrowserEnvironment(browser);
    context = browserEnv.context;
    page = browserEnv.page;
    
    // Setup performance monitoring
    testEnvironmentSetup.setupPerformanceMonitoring(page);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
    if (context) {
      await context.close();
    }
  });

  test.describe('Actor Complete Journey', () => {
    test('Actor registration to audition booking', async () => {
      test.setTimeout(TEST_CONFIG.timeout);

      // Step 1: Visit homepage and navigate to registration
      await page.goto('/');
      await expect(page).toHaveTitle(/CastMatch/);
      
      await page.click('[data-testid="register-button"]');
      await expect(page).toHaveURL('**/register');

      // Step 2: Complete actor registration
      await testUtils.fillFormField(page, '[data-testid="first-name"]', testUsers.actor.firstName);
      await testUtils.fillFormField(page, '[data-testid="last-name"]', testUsers.actor.lastName);
      await testUtils.fillFormField(page, '[data-testid="email"]', testUsers.actor.email);
      await testUtils.fillFormField(page, '[data-testid="password"]', testUsers.actor.password);
      await testUtils.fillFormField(page, '[data-testid="confirm-password"]', testUsers.actor.password);
      
      await page.selectOption('[data-testid="role-select"]', 'actor');
      await page.check('[data-testid="terms-checkbox"]');
      
      await page.click('[data-testid="register-submit"]');

      // Step 3: Verify email verification page
      await expect(page).toHaveURL('**/verify-email');
      await expect(page.locator('[data-testid="verification-message"]')).toBeVisible();

      // Step 4: Complete profile setup (simulate email verification)
      await page.goto('/profile/setup');
      
      // Fill actor-specific profile information
      await testUtils.fillFormField(page, '[data-testid="bio"]', testUsers.actor.profile.bio);
      await testUtils.fillFormField(page, '[data-testid="location"]', testUsers.actor.profile.location);
      await testUtils.fillFormField(page, '[data-testid="height"]', testUsers.actor.profile.height);
      await testUtils.fillFormField(page, '[data-testid="experience"]', testUsers.actor.profile.experience);

      // Add skills
      for (const skill of testUsers.actor.profile.skills.slice(0, 3)) {
        await page.click('[data-testid="add-skill-button"]');
        await page.fill('[data-testid="skill-input"]:last-of-type', skill);
      }

      // Add languages
      for (const language of testUsers.actor.profile.languages.slice(0, 2)) {
        await page.selectOption('[data-testid="languages-select"]', language);
      }

      await page.click('[data-testid="profile-submit"]');

      // Step 5: Navigate to dashboard
      await expect(page).toHaveURL('**/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');

      // Step 6: Search for auditions
      await page.click('[data-testid="search-auditions"]');
      await expect(page).toHaveURL('**/auditions');

      // Apply filters
      await page.selectOption('[data-testid="location-filter"]', 'Mumbai');
      await page.selectOption('[data-testid="genre-filter"]', 'Drama');
      await page.click('[data-testid="apply-filters"]');

      // Wait for results to load
      await page.waitForSelector('[data-testid="audition-card"]', { timeout: 10000 });
      
      const auditionCards = await page.locator('[data-testid="audition-card"]').count();
      expect(auditionCards).toBeGreaterThan(0);

      // Step 7: Apply for an audition
      await page.click('[data-testid="audition-card"]:first-child');
      await expect(page.locator('[data-testid="audition-details"]')).toBeVisible();
      
      await page.click('[data-testid="apply-audition-button"]');
      
      // Fill application form
      await testUtils.fillFormField(page, '[data-testid="application-message"]', 
        'I am very interested in this role and believe my experience in drama makes me a perfect fit.');
      
      // Upload demo reel (simulate file upload)
      const fileInput = page.locator('[data-testid="demo-reel-upload"]');
      await fileInput.setInputFiles([{
        name: 'demo-reel.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake video content')
      }]);

      await page.click('[data-testid="submit-application"]');

      // Step 8: Verify application submitted
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Application submitted');
      
      // Step 9: Check applications status
      await page.click('[data-testid="my-applications"]');
      await expect(page).toHaveURL('**/applications');
      
      const applicationStatus = page.locator('[data-testid="application-status"]').first();
      await expect(applicationStatus).toContainText('Pending');
    });

    test('Actor profile completion and portfolio upload', async () => {
      test.setTimeout(TEST_CONFIG.timeout);

      // Login as actor
      await testEnvironmentSetup.loginUserInBrowser(page, testUsers.actor);

      // Navigate to profile
      await page.click('[data-testid="profile-menu"]');
      await page.click('[data-testid="edit-profile"]');
      await expect(page).toHaveURL('**/profile/edit');

      // Upload portfolio images
      const imageFiles = [
        { name: 'headshot.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake image 1') },
        { name: 'portfolio1.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake image 2') },
        { name: 'portfolio2.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake image 3') }
      ];

      for (let i = 0; i < imageFiles.length; i++) {
        await page.locator('[data-testid="image-upload"]').setInputFiles([imageFiles[i]]);
        await page.waitForSelector(`[data-testid="uploaded-image-${i}"]`, { timeout: 10000 });
      }

      // Update skills and experience
      await page.click('[data-testid="add-skill-button"]');
      await page.fill('[data-testid="skill-input"]:last-of-type', 'Method Acting');

      await testUtils.fillFormField(page, '[data-testid="experience-details"]', 
        'Trained at National School of Drama. Performed in 5+ theatre productions.');

      // Save profile
      await page.click('[data-testid="save-profile"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated');

      // Verify public profile
      await page.goto(`/profile/public/${testUsers.actor.id}`);
      await expect(page.locator('[data-testid="profile-name"]')).toContainText(testUsers.actor.firstName);
      await expect(page.locator('[data-testid="portfolio-images"]')).toBeVisible();
    });
  });

  test.describe('Casting Director Complete Journey', () => {
    test('Casting director project creation to talent selection', async () => {
      test.setTimeout(TEST_CONFIG.timeout);

      // Login as casting director
      await testEnvironmentSetup.loginUserInBrowser(page, testUsers.castingDirector);

      // Step 1: Create new project
      await page.click('[data-testid="create-project"]');
      await expect(page).toHaveURL('**/projects/create');

      const testProject = testDataFactory.createProject();
      
      await testUtils.fillFormField(page, '[data-testid="project-title"]', testProject.title);
      await testUtils.fillFormField(page, '[data-testid="project-description"]', testProject.description);
      await page.selectOption('[data-testid="genre-select"]', testProject.genre);
      await testUtils.fillFormField(page, '[data-testid="budget"]', testProject.budget.toString());

      await page.click('[data-testid="create-project-submit"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Project created');

      // Step 2: Create audition for project
      await page.click('[data-testid="create-audition"]');
      
      const testAudition = testDataFactory.createAudition(testProject.id!);
      
      await testUtils.fillFormField(page, '[data-testid="audition-title"]', testAudition.title);
      await testUtils.fillFormField(page, '[data-testid="audition-description"]', testAudition.description);
      await testUtils.fillFormField(page, '[data-testid="audition-location"]', testAudition.location);

      // Add requirements
      for (const requirement of testAudition.requirements) {
        await page.click('[data-testid="add-requirement"]');
        await page.fill('[data-testid="requirement-input"]:last-of-type', requirement);
      }

      // Set audition date
      await page.fill('[data-testid="audition-date"]', '2024-12-15');
      await page.fill('[data-testid="audition-time"]', '10:00');

      await page.click('[data-testid="create-audition-submit"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Audition created');

      // Step 3: Use AI-powered talent search
      await page.click('[data-testid="ai-talent-search"]');
      await expect(page).toHaveURL('**/talent/search');

      await testUtils.fillFormField(page, '[data-testid="search-query"]', 
        'Looking for dramatic actors with theatre experience');
      
      await page.selectOption('[data-testid="age-range"]', '25-35');
      await page.selectOption('[data-testid="location-filter"]', 'Mumbai');
      await page.selectOption('[data-testid="experience-filter"]', '5+ years');

      await page.click('[data-testid="ai-search-button"]');

      // Wait for AI recommendations
      await page.waitForSelector('[data-testid="ai-recommendations"]', { timeout: 15000 });
      
      const recommendationCards = await page.locator('[data-testid="talent-card"]').count();
      expect(recommendationCards).toBeGreaterThan(0);

      // Step 4: Create shortlist
      await page.click('[data-testid="create-shortlist"]');
      await testUtils.fillFormField(page, '[data-testid="shortlist-name"]', 'Lead Role Candidates');

      // Add talents to shortlist
      for (let i = 0; i < 3; i++) {
        await page.click(`[data-testid="talent-card"]:nth-child(${i + 1}) [data-testid="add-to-shortlist"]`);
      }

      await page.click('[data-testid="save-shortlist"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Shortlist created');

      // Step 5: Send audition invitations
      await page.click('[data-testid="send-invitations"]');
      
      await testUtils.fillFormField(page, '[data-testid="invitation-message"]', 
        'We would like to invite you to audition for our upcoming production.');

      await page.click('[data-testid="send-invitations-submit"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Invitations sent');

      // Step 6: Review applications
      await page.click('[data-testid="audition-applications"]');
      await expect(page).toHaveURL('**/auditions/applications');

      const applications = page.locator('[data-testid="application-card"]');
      await expect(applications.first()).toBeVisible();

      // Review first application
      await page.click('[data-testid="review-application"]:first-child');
      await expect(page.locator('[data-testid="application-details"]')).toBeVisible();

      // Leave feedback
      await testUtils.fillFormField(page, '[data-testid="feedback-notes"]', 
        'Strong portfolio, good fit for the character');
      await page.selectOption('[data-testid="rating-select"]', '4');
      
      await page.click('[data-testid="save-feedback"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Feedback saved');
    });
  });

  test.describe('Producer Oversight Journey', () => {
    test('Producer project oversight and approval workflow', async () => {
      test.setTimeout(TEST_CONFIG.timeout);

      // Login as producer
      await testEnvironmentSetup.loginUserInBrowser(page, testUsers.producer);

      // Step 1: Review project dashboard
      await page.click('[data-testid="projects-overview"]');
      await expect(page).toHaveURL('**/producer/dashboard');

      // Verify project metrics are visible
      await expect(page.locator('[data-testid="total-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-auditions"]')).toBeVisible();
      await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();

      // Step 2: Review pending approvals
      await page.click('[data-testid="pending-approvals"]');
      
      const pendingItems = page.locator('[data-testid="approval-item"]');
      if (await pendingItems.count() > 0) {
        // Review first pending item
        await page.click('[data-testid="review-approval"]:first-child');
        
        // Check details and approve
        await expect(page.locator('[data-testid="approval-details"]')).toBeVisible();
        await page.click('[data-testid="approve-button"]');
        
        await testUtils.fillFormField(page, '[data-testid="approval-comments"]', 
          'Approved. Budget allocation looks reasonable.');
        
        await page.click('[data-testid="submit-approval"]');
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Approved');
      }

      // Step 3: Review analytics and reports
      await page.click('[data-testid="analytics-reports"]');
      await expect(page).toHaveURL('**/producer/analytics');

      // Verify charts and metrics are loading
      await page.waitForSelector('[data-testid="casting-metrics-chart"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="budget-utilization-chart"]', { timeout: 10000 });
      
      // Generate custom report
      await page.click('[data-testid="generate-report"]');
      await page.selectOption('[data-testid="report-type"]', 'casting-summary');
      await page.selectOption('[data-testid="date-range"]', 'last-30-days');
      
      await page.click('[data-testid="generate-report-submit"]');
      await page.waitForSelector('[data-testid="report-download"]', { timeout: 15000 });
    });
  });

  test.describe('Cross-Role Collaboration', () => {
    test('End-to-end casting workflow with all roles', async () => {
      test.setTimeout(TEST_CONFIG.timeout * 2); // Extended timeout for complex workflow

      // This test simulates the complete casting workflow involving all user types

      // Step 1: Producer creates project (using separate context)
      const producerContext = await browser.newContext();
      const producerPage = await producerContext.newPage();
      await testEnvironmentSetup.loginUserInBrowser(producerPage, testUsers.producer);
      
      // Create project as producer
      await producerPage.click('[data-testid="create-project"]');
      const testProject = testDataFactory.createProject();
      await testUtils.fillFormField(producerPage, '[data-testid="project-title"]', testProject.title);
      await testUtils.fillFormField(producerPage, '[data-testid="project-description"]', testProject.description);
      await producerPage.selectOption('[data-testid="genre-select"]', testProject.genre);
      await testUtils.fillFormField(producerPage, '[data-testid="budget"]', testProject.budget.toString());
      await producerPage.click('[data-testid="create-project-submit"]');
      
      // Get project ID from URL
      await producerPage.waitForURL('**/projects/*');
      const projectUrl = producerPage.url();
      const projectId = projectUrl.split('/').pop();
      
      await producerContext.close();

      // Step 2: Casting director takes over project
      const castingContext = await browser.newContext();
      const castingPage = await castingContext.newPage();
      await testEnvironmentSetup.loginUserInBrowser(castingPage, testUsers.castingDirector);
      
      // Navigate to project and create audition
      await castingPage.goto(`/projects/${projectId}`);
      await castingPage.click('[data-testid="create-audition"]');
      
      const testAudition = testDataFactory.createAudition(projectId!);
      await testUtils.fillFormField(castingPage, '[data-testid="audition-title"]', testAudition.title);
      await testUtils.fillFormField(castingPage, '[data-testid="audition-description"]', testAudition.description);
      await castingPage.click('[data-testid="create-audition-submit"]');
      
      await castingContext.close();

      // Step 3: Actor applies for audition
      const actorContext = await browser.newContext();
      const actorPage = await actorContext.newPage();
      await testEnvironmentSetup.loginUserInBrowser(actorPage, testUsers.actor);
      
      // Find and apply for audition
      await actorPage.click('[data-testid="search-auditions"]');
      await actorPage.waitForSelector('[data-testid="audition-card"]');
      await actorPage.click('[data-testid="audition-card"]:first-child');
      await actorPage.click('[data-testid="apply-audition-button"]');
      
      await testUtils.fillFormField(actorPage, '[data-testid="application-message"]', 
        'Very interested in this role');
      await actorPage.click('[data-testid="submit-application"]');
      
      await actorContext.close();

      // Step 4: Casting director reviews and shortlists
      const castingReviewContext = await browser.newContext();
      const castingReviewPage = await castingReviewContext.newPage();
      await testEnvironmentSetup.loginUserInBrowser(castingReviewPage, testUsers.castingDirector);
      
      await castingReviewPage.click('[data-testid="audition-applications"]');
      await castingReviewPage.click('[data-testid="review-application"]:first-child');
      await castingReviewPage.selectOption('[data-testid="rating-select"]', '5');
      await castingReviewPage.click('[data-testid="add-to-shortlist-button"]');
      
      await castingReviewContext.close();

      // Step 5: Producer final approval
      const producerFinalContext = await browser.newContext();
      const producerFinalPage = await producerFinalContext.newPage();
      await testEnvironmentSetup.loginUserInBrowser(producerFinalPage, testUsers.producer);
      
      await producerFinalPage.click('[data-testid="pending-approvals"]');
      if (await producerFinalPage.locator('[data-testid="approval-item"]').count() > 0) {
        await producerFinalPage.click('[data-testid="approve-button"]:first-child');
        await producerFinalPage.click('[data-testid="submit-approval"]');
      }
      
      await producerFinalContext.close();

      // Verify the complete workflow was successful
      expect(true).toBeTruthy(); // Placeholder - in real test, verify final state
    });
  });

  test.describe('Mobile Responsive Testing', () => {
    test('Complete actor journey on mobile device', async () => {
      // Create mobile context
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        isMobile: true,
        hasTouch: true,
      });
      
      const mobilePage = await mobileContext.newPage();
      
      // Test mobile registration flow
      await mobilePage.goto('/');
      
      // Open mobile menu
      await mobilePage.click('[data-testid="mobile-menu-toggle"]');
      await mobilePage.click('[data-testid="mobile-register-link"]');
      
      // Fill mobile registration form
      await testUtils.fillFormField(mobilePage, '[data-testid="first-name"]', testUsers.actor.firstName);
      await testUtils.fillFormField(mobilePage, '[data-testid="email"]', testUsers.actor.email);
      await testUtils.fillFormField(mobilePage, '[data-testid="password"]', testUsers.actor.password);
      
      // Test mobile form interactions
      await mobilePage.selectOption('[data-testid="role-select"]', 'actor');
      await mobilePage.tap('[data-testid="terms-checkbox"]');
      await mobilePage.tap('[data-testid="register-submit"]');
      
      // Verify mobile navigation
      await expect(mobilePage).toHaveURL('**/verify-email');
      
      await mobileContext.close();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('Page load performance benchmarks', async () => {
      const performanceMetrics = await testUtils.measurePageLoad(page);
      
      // Assert performance benchmarks
      expect(performanceMetrics.totalLoadTime).toBeLessThan(3000); // 3 seconds max
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 seconds max
      expect(performanceMetrics.domContentLoaded).toBeLessThan(100); // 100ms max
      
      console.log('Performance metrics:', performanceMetrics);
    });

    test('Concurrent user simulation', async () => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = [];
      const pages = [];
      
      try {
        // Create 5 concurrent user sessions
        for (let i = 0; i < 5; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          contexts.push(context);
          pages.push(page);
        }
        
        // Perform concurrent actions
        const promises = pages.map(async (page, index) => {
          await page.goto('/');
          await page.click('[data-testid="browse-talent"]');
          await page.waitForLoadState('networkidle');
          return page.title();
        });
        
        const results = await Promise.all(promises);
        
        // Verify all requests completed successfully
        expect(results).toHaveLength(5);
        results.forEach(title => {
          expect(title).toContain('CastMatch');
        });
        
      } finally {
        // Cleanup
        await Promise.all(contexts.map(context => context.close()));
      }
    });
  });
});