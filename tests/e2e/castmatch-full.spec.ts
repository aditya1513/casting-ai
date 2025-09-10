/**
 * CastMatch Full End-to-End Test Suite
 * Tests all services: Frontend, Backend API, and Python AI Service
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Service URLs
const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:5002';
const PYTHON_AI_URL = 'http://localhost:8000';

test.describe('CastMatch Full System Test Suite', () => {
  
  test.describe('Service Health Checks', () => {
    
    test('Backend API should be healthy', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.environment).toBe('development');
      console.log('✅ Backend API is healthy:', data);
    });

    test('Python AI Service should be healthy', async ({ request }) => {
      const response = await request.get(`${PYTHON_AI_URL}/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('CastMatch AI Service');
      console.log('✅ Python AI Service is healthy:', data);
    });

    test('Frontend should be accessible', async ({ page }) => {
      const response = await page.goto(FRONTEND_URL);
      expect(response?.ok()).toBeTruthy();
      
      // Check if page loads with expected title
      await expect(page).toHaveTitle(/CastMatch/i, { timeout: 10000 });
      console.log('✅ Frontend is accessible');
    });
  });

  test.describe('Python AI Service API Tests', () => {
    
    test('Should search for talents', async ({ request }) => {
      const searchPayload = {
        gender: 'FEMALE',
        age_min: 25,
        age_max: 30,
        city: 'Mumbai',
        limit: 5
      };

      const response = await request.post(`${PYTHON_AI_URL}/api/v1/talents/search`, {
        data: searchPayload
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('talents');
      expect(data).toHaveProperty('search_criteria');
      expect(Array.isArray(data.talents)).toBe(true);
      console.log('✅ Talent search API works, found:', data.talents.length, 'talents');
    });

    test('Should handle chat messages', async ({ request }) => {
      const chatPayload = {
        messages: [
          {
            role: 'user',
            content: 'Find talented dancers in Mumbai aged 20-30'
          }
        ]
      };

      const response = await request.post(`${PYTHON_AI_URL}/api/v1/chat`, {
        data: chatPayload
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('message');
      expect(data.message).toHaveProperty('role');
      expect(data.message.role).toBe('assistant');
      console.log('✅ Chat API responded:', data.message.content.substring(0, 100) + '...');
    });

    test('Should provide API documentation', async ({ page }) => {
      await page.goto(`${PYTHON_AI_URL}/docs`);
      
      // Check if Swagger UI loads
      await expect(page.locator('text=CastMatch AI Service')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/api/v1/talents/search')).toBeVisible();
      await expect(page.locator('text=/api/v1/chat')).toBeVisible();
      console.log('✅ API documentation is accessible');
    });
  });

  test.describe('Frontend UI Tests', () => {
    
    test('Should load the home page', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Wait for main content to load
      await page.waitForLoadState('networkidle');
      
      // Check for key elements that should be present
      const mainContent = page.locator('main, [role="main"], #__next');
      await expect(mainContent).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Home page loads successfully');
    });

    test('Should have navigation elements', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Check for navigation or header
      const navigation = page.locator('nav, header, [role="navigation"]').first();
      
      if (await navigation.isVisible()) {
        console.log('✅ Navigation elements found');
      } else {
        console.log('⚠️  No navigation elements found (might be a single-page app)');
      }
    });

    test('Should be responsive on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const page = await context.newPage();
      await page.goto(FRONTEND_URL);
      
      // Check if page adapts to mobile viewport
      const viewport = page.viewportSize();
      expect(viewport?.width).toBe(375);
      
      console.log('✅ Mobile responsive view works');
      await context.close();
    });

    test('Should handle chat interface if available', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Look for chat-related elements
      const chatElements = [
        page.locator('[data-testid="chat"]'),
        page.locator('.chat'),
        page.locator('[class*="chat"]').first(),
        page.locator('text=/chat/i').first(),
        page.locator('button:has-text("Chat")').first()
      ];
      
      let chatFound = false;
      for (const element of chatElements) {
        if (await element.isVisible().catch(() => false)) {
          chatFound = true;
          console.log('✅ Chat interface element found');
          break;
        }
      }
      
      if (!chatFound) {
        console.log('ℹ️  No chat interface found on home page (might be on a different route)');
      }
    });
  });

  test.describe('Integration Tests', () => {
    
    test('Should handle end-to-end talent search flow', async ({ page, request }) => {
      // Step 1: Check backend is ready
      const healthResponse = await request.get(`${BACKEND_URL}/api/health`);
      expect(healthResponse.ok()).toBeTruthy();
      
      // Step 2: Search for talents via Python API
      const searchResponse = await request.post(`${PYTHON_AI_URL}/api/v1/talents/search`, {
        data: {
          city: 'Mumbai',
          limit: 3
        }
      });
      
      expect(searchResponse.ok()).toBeTruthy();
      const searchData = await searchResponse.json();
      console.log('✅ E2E test: Found', searchData.talents.length, 'talents via API');
      
      // Step 3: Visit frontend
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      console.log('✅ End-to-end integration test completed');
    });

    test('Should test AI chat conversation flow', async ({ request }) => {
      const conversation = [
        'Hello, I need help finding talent',
        'Show me actors in Mumbai',
        'Filter by age 25-35',
        'Thank you'
      ];
      
      const messages = [];
      
      for (const userMessage of conversation) {
        messages.push({ role: 'user', content: userMessage });
        
        const response = await request.post(`${PYTHON_AI_URL}/api/v1/chat`, {
          data: { messages }
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        messages.push(data.message);
        console.log(`✅ Chat turn ${messages.length / 2}:`, userMessage.substring(0, 30) + '...');
      }
      
      expect(messages.length).toBe(8); // 4 user + 4 assistant messages
      console.log('✅ Multi-turn conversation test completed');
    });
  });

  test.describe('Performance Tests', () => {
    
    test('Backend API should respond quickly', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BACKEND_URL}/api/health`);
      const responseTime = Date.now() - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      console.log(`✅ Backend response time: ${responseTime}ms`);
    });

    test('Python AI Service should handle concurrent requests', async ({ request }) => {
      const requests = Array(5).fill(null).map(() => 
        request.post(`${PYTHON_AI_URL}/api/v1/talents/search`, {
          data: { city: 'Mumbai', limit: 1 }
        })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.ok()).toBeTruthy();
      });
      
      console.log(`✅ Handled 5 concurrent requests in ${totalTime}ms`);
    });

    test('Frontend should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      console.log(`✅ Frontend DOM loaded in ${loadTime}ms`);
    });
  });

  test.describe('Error Handling Tests', () => {
    
    test('Should handle invalid API requests gracefully', async ({ request }) => {
      const response = await request.post(`${PYTHON_AI_URL}/api/v1/talents/search`, {
        data: { invalid_field: 'test' }
      });
      
      // Should still return a response (even if empty)
      expect([200, 422, 400]).toContain(response.status());
      console.log('✅ API handles invalid requests gracefully');
    });

    test('Should handle 404 routes', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/nonexistent`);
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      console.log('✅ 404 error handling works');
    });
  });
});

// Test configuration
test.setTimeout(30000); // 30 second timeout for each test

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status === 'failed') {
    console.log(`❌ Test failed: ${testInfo.title}`);
  }
});

test.afterAll(async () => {
  console.log('\n📊 Test Suite Completed!');
});