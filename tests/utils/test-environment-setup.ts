/**
 * Test Environment Setup and Utilities
 * Comprehensive test environment configuration and helpers
 */

import { Browser, Page, BrowserContext } from '@playwright/test';
import supertest from 'supertest';
import { testDataFactory, TestUser } from '../data/test-data-management';

export interface TestEnvironment {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  apiClient?: supertest.SuperTest<supertest.Test>;
  testUsers?: {
    actor: TestUser;
    castingDirector: TestUser;
    producer: TestUser;
    admin: TestUser;
  };
  authTokens?: {
    actor: string;
    castingDirector: string;
    producer: string;
    admin: string;
  };
}

export class TestEnvironmentSetup {
  private static instance: TestEnvironmentSetup;
  
  public static getInstance(): TestEnvironmentSetup {
    if (!TestEnvironmentSetup.instance) {
      TestEnvironmentSetup.instance = new TestEnvironmentSetup();
    }
    return TestEnvironmentSetup.instance;
  }

  /**
   * Setup complete test environment
   */
  async setupTestEnvironment(): Promise<TestEnvironment> {
    // Create test users
    const testUsers = {
      actor: testDataFactory.createIndianUser('actor'),
      castingDirector: testDataFactory.createIndianUser('casting_director'),
      producer: testDataFactory.createIndianUser('producer'),
      admin: testDataFactory.createUser('admin')
    };

    // Setup API client
    const apiClient = this.setupApiClient();

    // Register test users and get auth tokens
    const authTokens = await this.registerTestUsersAndGetTokens(apiClient, testUsers);

    return {
      testUsers,
      authTokens,
      apiClient
    };
  }

  /**
   * Setup API client for testing
   */
  setupApiClient(): supertest.SuperTest<supertest.Test> {
    // Assuming we have an Express app export
    const app = require('../../src/server');
    return supertest(app);
  }

  /**
   * Register test users and get authentication tokens
   */
  private async registerTestUsersAndGetTokens(
    apiClient: supertest.SuperTest<supertest.Test>,
    testUsers: TestEnvironment['testUsers']
  ): Promise<TestEnvironment['authTokens']> {
    const authTokens: any = {};

    if (!testUsers) return authTokens;

    for (const [role, user] of Object.entries(testUsers)) {
      try {
        // Register user
        await apiClient
          .post('/api/auth/register')
          .send({
            email: user.email,
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            profile: user.profile
          })
          .expect((res) => {
            // Accept either 201 (created) or 409 (already exists)
            if (![201, 409].includes(res.status)) {
              throw new Error(`Registration failed for ${role}: ${res.status}`);
            }
          });

        // Login to get token
        const loginResponse = await apiClient
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: user.password
          })
          .expect(200);

        authTokens[role] = loginResponse.body.token || loginResponse.body.accessToken;
      } catch (error) {
        console.warn(`Failed to setup ${role} user:`, error);
      }
    }

    return authTokens;
  }

  /**
   * Setup browser environment for E2E tests
   */
  async setupBrowserEnvironment(browser: Browser): Promise<{
    context: BrowserContext;
    page: Page;
  }> {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      permissions: ['clipboard-read', 'clipboard-write'],
      recordVideo: process.env.CI ? { dir: 'test-results/videos/' } : undefined,
    });

    const page = await context.newPage();

    // Set up common page configurations
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
    });

    return { context, page };
  }

  /**
   * Login user in browser
   */
  async loginUserInBrowser(page: Page, user: TestUser): Promise<void> {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  }

  /**
   * Setup test database with clean state
   */
  async setupTestDatabase(): Promise<void> {
    // This would typically reset the test database to a clean state
    // Implementation depends on your database setup
    console.log('Setting up test database...');
    
    // Example: Clear test data, run migrations, seed basic data
    try {
      // Clear existing test data
      await this.clearTestData();
      
      // Run any necessary migrations
      await this.runTestMigrations();
      
      // Seed basic test data if needed
      await this.seedTestData();
      
      console.log('Test database setup complete');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Clear test data from database
   */
  private async clearTestData(): Promise<void> {
    // Implementation would depend on your database setup
    // This is a placeholder
    console.log('Clearing test data...');
  }

  /**
   * Run test migrations
   */
  private async runTestMigrations(): Promise<void> {
    // Implementation would depend on your database setup
    // This is a placeholder
    console.log('Running test migrations...');
  }

  /**
   * Seed basic test data
   */
  private async seedTestData(): Promise<void> {
    // Implementation would depend on your database setup
    // This is a placeholder
    console.log('Seeding test data...');
  }

  /**
   * Wait for API to be ready
   */
  async waitForApiReady(
    apiClient: supertest.SuperTest<supertest.Test>,
    maxRetries: number = 10,
    retryDelay: number = 2000
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await apiClient.get('/api/health').expect(200);
        console.log('API is ready');
        return true;
      } catch (error) {
        console.log(`API not ready, retrying in ${retryDelay}ms... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error(`API not ready after ${maxRetries} attempts`);
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring(page: Page): void {
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });

    // Monitor failed requests
    page.on('requestfailed', request => {
      console.error('Request failed:', request.url(), request.failure()?.errorText);
    });
  }

  /**
   * Take screenshot on failure
   */
  async takeScreenshotOnFailure(page: Page, testName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `test-results/screenshots/${testName}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    return screenshotPath;
  }

  /**
   * Generate test report data
   */
  generateTestReportData(testResults: any): any {
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      environment: process.env.NODE_ENV || 'test',
      testResults,
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
      }
    };
  }

  /**
   * Cleanup test environment
   */
  async cleanup(environment: TestEnvironment): Promise<void> {
    try {
      // Close browser resources
      if (environment.page) {
        await environment.page.close();
      }
      
      if (environment.context) {
        await environment.context.close();
      }

      // Clean up test data
      await this.clearTestData();
      
      console.log('Test environment cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

/**
 * Global test environment setup instance
 */
export const testEnvironmentSetup = TestEnvironmentSetup.getInstance();

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for element to be visible and stable
   */
  async waitForStableElement(page: Page, selector: string, timeout: number = 5000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    // Wait a bit more for any animations to complete
    await page.waitForTimeout(100);
  },

  /**
   * Fill form with validation
   */
  async fillFormField(page: Page, selector: string, value: string): Promise<void> {
    await page.fill(selector, ''); // Clear first
    await page.fill(selector, value);
    await page.waitForTimeout(100); // Allow for validation
  },

  /**
   * Take performance measurements
   */
  async measurePageLoad(page: Page): Promise<any> {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      };
    });
    
    return {
      totalLoadTime: loadTime,
      ...metrics
    };
  },

  /**
   * Wait for API response
   */
  async waitForApiResponse(page: Page, urlPattern: string, timeout: number = 10000): Promise<any> {
    const response = await page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() === 200,
      { timeout }
    );
    return response.json();
  }
};