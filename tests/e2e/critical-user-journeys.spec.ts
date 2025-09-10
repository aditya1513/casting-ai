/**
 * Critical User Journey E2E Tests
 * End-to-end tests for main user workflows in CastMatch
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data
const testUsers = {
  castingDirector: {
    email: `cd_${faker.string.uuid()}@castmatch.com`,
    password: 'CastDir123!',
    firstName: 'Sarah',
    lastName: 'Director',
    role: 'CASTING_DIRECTOR',
  },
  actor: {
    email: `actor_${faker.string.uuid()}@castmatch.com`,
    password: 'Actor123!',
    firstName: 'Raj',
    lastName: 'Kumar',
    role: 'ACTOR',
  },
  producer: {
    email: `producer_${faker.string.uuid()}@castmatch.com`,
    password: 'Producer123!',
    firstName: 'Karan',
    lastName: 'Producer',
    role: 'PRODUCER',
  },
};

// Page Object Models
class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async register(userData: any) {
    await this.page.click('[data-testid="register-link"]');
    await this.page.fill('[data-testid="firstName-input"]', userData.firstName);
    await this.page.fill('[data-testid="lastName-input"]', userData.lastName);
    await this.page.fill('[data-testid="email-input"]', userData.email);
    await this.page.fill('[data-testid="password-input"]', userData.password);
    await this.page.selectOption('[data-testid="role-select"]', userData.role);
    await this.page.click('[data-testid="register-button"]');
    await this.page.waitForURL('/dashboard');
  }
}

class DashboardPage {
  constructor(private page: Page) {}

  async startNewChat() {
    await this.page.click('[data-testid="new-chat-button"]');
    await expect(this.page.locator('[data-testid="chat-interface"]')).toBeVisible();
  }

  async navigateToTalentSearch() {
    await this.page.click('[data-testid="talent-search-nav"]');
    await this.page.waitForURL('/talent/search');
  }

  async navigateToProjects() {
    await this.page.click('[data-testid="projects-nav"]');
    await this.page.waitForURL('/projects');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }
}

class ChatPage {
  constructor(private page: Page) {}

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');
    
    // Wait for AI response
    await expect(this.page.locator('[data-testid="ai-response"]').last()).toBeVisible({
      timeout: 10000,
    });
  }

  async verifyResponse(expectedContent: string) {
    const lastResponse = this.page.locator('[data-testid="ai-response"]').last();
    await expect(lastResponse).toContainText(expectedContent, {
      timeout: 5000,
    });
  }

  async verifySuggestions() {
    await expect(this.page.locator('[data-testid="suggestions-panel"]')).toBeVisible();
    const suggestions = await this.page.locator('[data-testid="suggestion-card"]').count();
    expect(suggestions).toBeGreaterThan(0);
  }

  async selectSuggestion(index: number) {
    await this.page.locator('[data-testid="suggestion-card"]').nth(index).click();
    await expect(this.page.locator('[data-testid="talent-profile-modal"]')).toBeVisible();
  }
}

class TalentSearchPage {
  constructor(private page: Page) {}

  async searchTalent(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.click('[data-testid="search-button"]');
    
    // Wait for results
    await expect(this.page.locator('[data-testid="search-results"]')).toBeVisible({
      timeout: 5000,
    });
  }

  async applyFilters(filters: any) {
    if (filters.ageMin) {
      await this.page.fill('[data-testid="age-min-input"]', filters.ageMin.toString());
    }
    if (filters.ageMax) {
      await this.page.fill('[data-testid="age-max-input"]', filters.ageMax.toString());
    }
    if (filters.location) {
      await this.page.selectOption('[data-testid="location-select"]', filters.location);
    }
    if (filters.languages) {
      for (const lang of filters.languages) {
        await this.page.check(`[data-testid="language-${lang}"]`);
      }
    }
    await this.page.click('[data-testid="apply-filters-button"]');
  }

  async verifyResults(minCount: number) {
    const results = await this.page.locator('[data-testid="talent-card"]').count();
    expect(results).toBeGreaterThanOrEqual(minCount);
  }

  async addToShortlist(index: number) {
    await this.page.locator('[data-testid="talent-card"]').nth(index).hover();
    await this.page.locator('[data-testid="add-to-shortlist"]').nth(index).click();
    await expect(this.page.locator('[data-testid="shortlist-notification"]')).toBeVisible();
  }
}

class ProjectPage {
  constructor(private page: Page) {}

  async createProject(projectData: any) {
    await this.page.click('[data-testid="create-project-button"]');
    await this.page.fill('[data-testid="project-title"]', projectData.title);
    await this.page.selectOption('[data-testid="project-type"]', projectData.type);
    await this.page.fill('[data-testid="project-budget"]', projectData.budget.toString());
    await this.page.fill('[data-testid="start-date"]', projectData.startDate);
    await this.page.fill('[data-testid="end-date"]', projectData.endDate);
    await this.page.click('[data-testid="save-project-button"]');
    
    await expect(this.page.locator('[data-testid="project-created-notification"]')).toBeVisible();
  }

  async uploadScript(filePath: string) {
    await this.page.click('[data-testid="upload-script-button"]');
    await this.page.setInputFiles('[data-testid="script-file-input"]', filePath);
    await this.page.click('[data-testid="analyze-script-button"]');
    
    // Wait for analysis
    await expect(this.page.locator('[data-testid="script-analysis"]')).toBeVisible({
      timeout: 15000,
    });
  }

  async scheduleAudition(actorId: string, date: string, time: string) {
    await this.page.click(`[data-testid="schedule-audition-${actorId}"]`);
    await this.page.fill('[data-testid="audition-date"]', date);
    await this.page.fill('[data-testid="audition-time"]', time);
    await this.page.fill('[data-testid="audition-location"]', 'Studio A, Mumbai');
    await this.page.click('[data-testid="confirm-audition-button"]');
    
    await expect(this.page.locator('[data-testid="audition-scheduled-notification"]')).toBeVisible();
  }
}

// Test Suites
test.describe('User Registration and Login Journey', () => {
  let context: BrowserContext;
  let page: Page;
  let loginPage: LoginPage;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    loginPage = new LoginPage(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Casting Director Registration → Login → Dashboard', async () => {
    await loginPage.navigate();
    await loginPage.register(testUsers.castingDirector);
    
    // Verify dashboard loaded
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(
      testUsers.castingDirector.firstName
    );
    
    // Verify role-specific features
    await expect(page.locator('[data-testid="casting-tools"]')).toBeVisible();
    
    // Logout and login again
    const dashboard = new DashboardPage(page);
    await dashboard.logout();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    // Verify successful re-login
    await expect(page).toHaveURL('/dashboard');
  });

  test('Actor Registration with Profile Setup', async () => {
    await loginPage.navigate();
    await loginPage.register(testUsers.actor);
    
    // Complete profile setup
    await page.click('[data-testid="complete-profile-button"]');
    await page.fill('[data-testid="bio-input"]', 'Experienced actor with 5 years in theater');
    await page.fill('[data-testid="height-input"]', '180');
    await page.selectOption('[data-testid="body-type-select"]', 'athletic');
    await page.setInputFiles('[data-testid="headshot-upload"]', 'tests/fixtures/headshot.jpg');
    await page.click('[data-testid="save-profile-button"]');
    
    await expect(page.locator('[data-testid="profile-complete-badge"]')).toBeVisible();
  });

  test('Email Verification Flow', async () => {
    await loginPage.navigate();
    await loginPage.register(testUsers.producer);
    
    // Check for verification prompt
    await expect(page.locator('[data-testid="verify-email-prompt"]')).toBeVisible();
    
    // Simulate clicking verification link (in real test, would check email)
    await page.goto(`/verify-email?token=test_token_${testUsers.producer.email}`);
    
    await expect(page.locator('[data-testid="email-verified-success"]')).toBeVisible();
  });
});

test.describe('AI Chat and Talent Search Journey', () => {
  let page: Page;
  let dashboard: DashboardPage;
  let chat: ChatPage;
  let talentSearch: TalentSearchPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Login as casting director
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    dashboard = new DashboardPage(page);
    chat = new ChatPage(page);
    talentSearch = new TalentSearchPage(page);
  });

  test('Send Message → Receive AI Response → View Suggestions', async () => {
    await dashboard.startNewChat();
    
    // Send casting query
    await chat.sendMessage('I need a young romantic lead for a Bollywood movie, age 25-30');
    
    // Verify AI response
    await chat.verifyResponse('Based on your requirements');
    
    // Verify suggestions appear
    await chat.verifySuggestions();
    
    // Open talent profile from suggestion
    await chat.selectSuggestion(0);
    
    // Verify profile modal
    await expect(page.locator('[data-testid="talent-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="talent-age"]')).toBeVisible();
    await expect(page.locator('[data-testid="talent-experience"]')).toBeVisible();
  });

  test('Advanced Talent Search with Filters', async () => {
    await dashboard.navigateToTalentSearch();
    
    // Perform search with natural language
    await talentSearch.searchTalent('experienced actors who can dance');
    await talentSearch.verifyResults(1);
    
    // Apply additional filters
    await talentSearch.applyFilters({
      ageMin: 25,
      ageMax: 35,
      location: 'Mumbai',
      languages: ['Hindi', 'English'],
    });
    
    await talentSearch.verifyResults(1);
    
    // Add to shortlist
    await talentSearch.addToShortlist(0);
  });

  test('Script Upload → Analysis → Recommendations', async () => {
    await dashboard.navigateToProjects();
    
    const projectPage = new ProjectPage(page);
    
    // Create project
    await projectPage.createProject({
      title: 'New Romantic Drama',
      type: 'FEATURE_FILM',
      budget: 5000000,
      startDate: '2024-06-01',
      endDate: '2024-08-31',
    });
    
    // Upload and analyze script
    await projectPage.uploadScript('tests/fixtures/sample-script.pdf');
    
    // Verify character extraction
    await expect(page.locator('[data-testid="character-list"]')).toBeVisible();
    const characters = await page.locator('[data-testid="character-card"]').count();
    expect(characters).toBeGreaterThan(0);
    
    // Get AI recommendations for each character
    await page.click('[data-testid="get-recommendations-button"]');
    await expect(page.locator('[data-testid="casting-recommendations"]')).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Audition Scheduling and Management', () => {
  test('Schedule Audition → Send Notification → Track Status', async ({ page }) => {
    // Login as casting director
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    // Navigate to shortlist
    await page.click('[data-testid="shortlist-nav"]');
    
    // Schedule audition for shortlisted actor
    const projectPage = new ProjectPage(page);
    await projectPage.scheduleAudition('actor_123', '2024-05-15', '14:00');
    
    // Verify calendar update
    await page.click('[data-testid="calendar-nav"]');
    await expect(page.locator('[data-testid="audition-event-2024-05-15"]')).toBeVisible();
    
    // Check notification was sent
    await page.click('[data-testid="notifications-icon"]');
    await expect(page.locator('[data-testid="notification-item"]').first()).toContainText(
      'Audition scheduled'
    );
  });

  test('Actor Views and Confirms Audition', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as actor
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.actor.email, testUsers.actor.password);
    
    // Check notifications
    await page.click('[data-testid="notifications-icon"]');
    await expect(page.locator('[data-testid="audition-invitation"]')).toBeVisible();
    
    // View audition details
    await page.click('[data-testid="view-audition-details"]');
    await expect(page.locator('[data-testid="audition-info"]')).toBeVisible();
    
    // Confirm availability
    await page.click('[data-testid="confirm-availability-button"]');
    await expect(page.locator('[data-testid="availability-confirmed"]')).toBeVisible();
    
    await context.close();
  });
});

test.describe('Real-time Collaboration', () => {
  test('Multiple Users in Same Conversation', async ({ browser }) => {
    // User 1: Casting Director
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const loginPage1 = new LoginPage(page1);
    await loginPage1.navigate();
    await loginPage1.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    // Start conversation
    const dashboard1 = new DashboardPage(page1);
    await dashboard1.startNewChat();
    const chat1 = new ChatPage(page1);
    await chat1.sendMessage('Looking for action heroes');
    
    // Get conversation ID
    const conversationUrl = page1.url();
    const conversationId = conversationUrl.split('/').pop();
    
    // User 2: Producer joins same conversation
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const loginPage2 = new LoginPage(page2);
    await loginPage2.navigate();
    await loginPage2.login(testUsers.producer.email, testUsers.producer.password);
    
    // Join conversation
    await page2.goto(`/chat/${conversationId}`);
    
    // Producer sends message
    const chat2 = new ChatPage(page2);
    await chat2.sendMessage('What about budget considerations?');
    
    // Verify message appears for casting director
    await expect(page1.locator('[data-testid="message"]').last()).toContainText(
      'budget considerations'
    );
    
    // Cleanup
    await context1.close();
    await context2.close();
  });
});

test.describe('Mobile Responsiveness', () => {
  test('Critical flows work on mobile devices', async ({ browser }) => {
    // iPhone 12 viewport
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    
    // Test login on mobile
    await loginPage.navigate();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    // Verify mobile menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Navigate to chat
    await page.click('[data-testid="mobile-chat-nav"]');
    
    // Send message on mobile
    const chat = new ChatPage(page);
    await chat.sendMessage('Test from mobile device');
    await chat.verifyResponse('Based on');
    
    // Verify touch interactions work
    const firstSuggestion = page.locator('[data-testid="suggestion-card"]').first();
    await firstSuggestion.tap();
    await expect(page.locator('[data-testid="talent-profile-modal"]')).toBeVisible();
    
    await context.close();
  });
});

test.describe('Accessibility Compliance', () => {
  test('Keyboard Navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    
    // Tab through login form
    await page.keyboard.press('Tab'); // Focus email
    await page.keyboard.type(testUsers.castingDirector.email);
    await page.keyboard.press('Tab'); // Focus password
    await page.keyboard.type(testUsers.castingDirector.password);
    await page.keyboard.press('Tab'); // Focus login button
    await page.keyboard.press('Enter'); // Submit
    
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate dashboard with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Open chat
    
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  });

  test('Screen Reader Compatibility', async ({ page }) => {
    await page.goto('/');
    
    // Check for ARIA labels
    const mainNav = page.locator('nav[aria-label="Main navigation"]');
    await expect(mainNav).toBeVisible();
    
    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').count();
    expect(h1).toBe(1);
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // Check for form labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('Color Contrast', async ({ page }) => {
    await page.goto('/');
    
    // Use axe-core for accessibility testing
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js',
    });
    
    const violations = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        axe.run().then(results => {
          resolve(results.violations.filter(v => v.id === 'color-contrast'));
        });
      });
    });
    
    expect(violations).toHaveLength(0);
  });
});

test.describe('Performance Critical Paths', () => {
  test('Page Load Performance', async ({ page }) => {
    // Start measuring
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
      };
    });
    
    // Assert performance targets
    expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(metrics.loadComplete).toBeLessThan(3000); // 3 seconds
  });

  test('AI Response Time', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    const dashboard = new DashboardPage(page);
    await dashboard.startNewChat();
    
    // Measure AI response time
    const startTime = Date.now();
    const chat = new ChatPage(page);
    await chat.sendMessage('Quick test message');
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(2000); // Target: < 2 seconds
  });
});

test.describe('Error Recovery', () => {
  test('Graceful Network Error Handling', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    // Simulate network failure
    await context.setOffline(true);
    
    const dashboard = new DashboardPage(page);
    await dashboard.startNewChat();
    
    const chat = new ChatPage(page);
    await chat.sendMessage('Test message while offline');
    
    // Should show offline notification
    await expect(page.locator('[data-testid="offline-notification"]')).toBeVisible();
    
    // Restore network
    await context.setOffline(false);
    
    // Should auto-retry
    await expect(page.locator('[data-testid="message-sent-indicator"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Session Timeout Recovery', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    
    // Simulate session expiry
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
    });
    
    // Try to perform action
    await page.click('[data-testid="new-chat-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    
    // Can login again
    await loginPage.login(testUsers.castingDirector.email, testUsers.castingDirector.password);
    await expect(page).toHaveURL('/dashboard');
  });
});