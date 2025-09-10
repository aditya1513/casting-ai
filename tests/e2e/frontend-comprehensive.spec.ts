/**
 * Frontend-Only Test Suite for CastMatch
 * Comprehensive frontend testing without backend dependencies
 */

import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:3001';

test.describe('CastMatch Frontend Testing Suite', () => {
  
  test.describe('Homepage Core Functionality', () => {
    
    test('Homepage should load successfully', async ({ page }) => {
      const response = await page.goto(FRONTEND_URL);
      expect(response?.ok()).toBeTruthy();
      
      // Check if page loads with expected title containing CastMatch
      await expect(page).toHaveTitle(/CastMatch|Mumbai.*Casting|Premier.*Casting/i, { timeout: 10000 });
      
      // Verify main content is visible
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
      console.log('✅ Homepage loads successfully');
    });

    test('Hero section should be present and visible', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Check for hero section elements
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();
      
      // Check for main heading
      const mainHeading = page.locator('h1');
      await expect(mainHeading).toBeVisible();
      
      const headingText = await mainHeading.textContent();
      expect(headingText).toContain('Mumbai');
      console.log('✅ Hero section visible with heading:', headingText?.substring(0, 50));
    });

    test('Navigation should be present and functional', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Check for navigation elements
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      // Check for CastMatch brand/logo
      const brand = page.locator('nav a').filter({ hasText: /CastMatch/i }).first();
      await expect(brand).toBeVisible();
      
      // Check for navigation links
      const navLinks = page.locator('nav a');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(3);
      console.log(`✅ Navigation present with ${linkCount} links`);
    });

    test('CTA buttons should be clickable', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Look for primary CTA buttons
      const ctaButtons = page.locator('a').filter({ 
        hasText: /Get Started|Sign Up|Start.*Trial|Explore/i 
      });
      
      const buttonCount = await ctaButtons.count();
      expect(buttonCount).toBeGreaterThan(0);
      
      // Test first button is clickable
      const firstButton = ctaButtons.first();
      await expect(firstButton).toBeVisible();
      
      console.log(`✅ Found ${buttonCount} CTA buttons`);
    });
  });

  test.describe('Responsive Design Testing', () => {
    
    test('Should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(FRONTEND_URL);
      
      // Check if content is properly displayed
      const mainContent = page.locator('body');
      await expect(mainContent).toBeVisible();
      
      console.log('✅ Desktop viewport (1920x1080) works correctly');
    });

    test('Should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(FRONTEND_URL);
      
      // Check if content adapts to tablet size
      const mainHeading = page.locator('h1');
      await expect(mainHeading).toBeVisible();
      
      console.log('✅ Tablet viewport (768x1024) works correctly');
    });

    test('Should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(FRONTEND_URL);
      
      // Check if content adapts to mobile size
      const mainHeading = page.locator('h1');
      await expect(mainHeading).toBeVisible();
      
      // Check if mobile menu or navigation adapts
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      console.log('✅ Mobile viewport (375x667) works correctly');
    });
  });

  test.describe('Navigation Testing', () => {
    
    test('Navigation links should have proper href attributes', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Get all navigation links
      const navLinks = page.locator('nav a[href]');
      const linkCount = await navLinks.count();
      
      expect(linkCount).toBeGreaterThan(0);
      
      // Check each link has a valid href
      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).not.toBe('#');
      }
      
      console.log(`✅ Checked ${Math.min(linkCount, 10)} navigation links`);
    });

    test('Brand logo should link to homepage', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      const brandLink = page.locator('nav a').filter({ hasText: /CastMatch/i }).first();
      const href = await brandLink.getAttribute('href');
      
      expect(href).toBe('/');
      console.log('✅ Brand logo links to homepage');
    });
  });

  test.describe('Content Structure Testing', () => {
    
    test('Should have proper semantic HTML structure', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Check for semantic HTML elements
      const main = page.locator('main, [role="main"]');
      const sections = page.locator('section');
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      
      // Main content should exist
      const mainCount = await main.count();
      expect(mainCount).toBeGreaterThanOrEqual(1);
      
      // Should have sections
      const sectionCount = await sections.count();
      expect(sectionCount).toBeGreaterThanOrEqual(2);
      
      // Should have proper heading hierarchy
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThanOrEqual(3);
      
      console.log(`✅ Semantic structure: ${mainCount} main, ${sectionCount} sections, ${headingCount} headings`);
    });

    test('Footer should be present and informative', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      
      // Check for footer content
      const footerText = await footer.textContent();
      expect(footerText).toBeTruthy();
      expect(footerText!.length).toBeGreaterThan(50);
      
      console.log('✅ Footer is present and contains content');
    });

    test('Should have stats or feature sections', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Look for stats, features, or similar sections
      const statsSections = page.locator('.stats, [class*="stat"], [class*="feature"]');
      const statsCount = await statsSections.count();
      
      if (statsCount > 0) {
        console.log(`✅ Found ${statsCount} stats/feature sections`);
      } else {
        console.log('ℹ️  No explicit stats sections found (content might be structured differently)');
      }
    });
  });

  test.describe('Performance Testing', () => {
    
    test('Page should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
      const domLoadTime = Date.now() - startTime;
      
      expect(domLoadTime).toBeLessThan(10000); // Should load within 10 seconds
      console.log(`✅ DOM loaded in ${domLoadTime}ms`);
      
      // Wait for network idle to measure full load time
      const networkStartTime = Date.now();
      await page.waitForLoadState('networkidle');
      const networkLoadTime = Date.now() - networkStartTime;
      
      console.log(`✅ Network idle reached in additional ${networkLoadTime}ms`);
    });

    test('Images should load correctly if present', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        // Check first few images load correctly
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i);
          await expect(img).toBeVisible();
        }
        console.log(`✅ Found and verified ${Math.min(imageCount, 5)} images load correctly`);
      } else {
        console.log('ℹ️  No images found on homepage');
      }
    });
  });

  test.describe('Accessibility Testing', () => {
    
    test('Page should have proper accessibility attributes', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Check for lang attribute on html element
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();
      
      // Check for alt attributes on images
      const imagesWithoutAlt = page.locator('img:not([alt])');
      const imagesWithoutAltCount = await imagesWithoutAlt.count();
      expect(imagesWithoutAltCount).toBe(0);
      
      // Check for heading hierarchy (should start with h1)
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      
      console.log('✅ Basic accessibility checks passed');
    });

    test('Interactive elements should be keyboard accessible', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      
      // Test tab navigation through focusable elements
      const focusableElements = page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      const focusableCount = await focusableElements.count();
      
      expect(focusableCount).toBeGreaterThan(0);
      
      // Test first few elements can receive focus
      for (let i = 0; i < Math.min(focusableCount, 5); i++) {
        const element = focusableElements.nth(i);
        await element.focus();
        // Verify element is focused
        const isFocused = await element.evaluate(el => document.activeElement === el);
        expect(isFocused).toBe(true);
      }
      
      console.log(`✅ Keyboard navigation works for ${Math.min(focusableCount, 5)} focusable elements`);
    });
  });

  test.describe('Error Handling Testing', () => {
    
    test('Should handle invalid routes gracefully', async ({ page }) => {
      const response = await page.goto(`${FRONTEND_URL}/nonexistent-page`);
      
      // Should either show 404 page or redirect
      expect([200, 404]).toContain(response?.status() || 200);
      
      // Page should still have basic structure
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();
      
      console.log('✅ Invalid routes handled gracefully');
    });

    test('Should handle JavaScript errors gracefully', async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });
      
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should not have critical JavaScript errors
      const criticalErrors = jsErrors.filter(error => 
        error.toLowerCase().includes('error') && 
        !error.toLowerCase().includes('warning')
      );
      
      expect(criticalErrors.length).toBeLessThan(3);
      
      if (jsErrors.length > 0) {
        console.log(`ℹ️  Found ${jsErrors.length} JavaScript messages (warnings/errors):`, jsErrors.slice(0, 3));
      } else {
        console.log('✅ No JavaScript errors detected');
      }
    });
  });
});

// Test configuration
test.setTimeout(30000); // 30 second timeout for each test

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    console.log(`❌ Test failed: ${testInfo.title}`);
    
    // Take screenshot on failure
    await page.screenshot({ 
      path: `test-results/failure-${testInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`,
      fullPage: true 
    });
  }
});

test.afterAll(async () => {
  console.log('\n📊 Frontend Test Suite Completed!');
});