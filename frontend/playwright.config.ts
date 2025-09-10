import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Includes visual regression, accessibility, and performance testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['list'],
  ],
  
  // Global test settings
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Screenshot and video settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
    
    // Trace settings for debugging
    trace: 'on-first-retry',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Accessibility testing
    colorScheme: 'light',
    
    // Locale settings
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Permission settings
    permissions: ['geolocation', 'notifications', 'camera', 'microphone'],
  },
  
  // Test timeout
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  
  // Projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'] },
    },
    
    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad Pro'] },
    },
    
    // Accessibility testing with screen reader simulation
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force high contrast mode
        colorScheme: 'dark',
        // Reduce motion for accessibility
        reducedMotion: 'reduce',
      },
    },
    
    // Performance testing project
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics
        video: 'on',
        trace: 'on',
        // Throttle CPU and network
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
    
    // Visual regression testing
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1920, height: 1080 },
        // Disable animations for consistent screenshots
        screenshot: {
          mode: 'on',
          fullPage: true,
          animations: 'disabled',
        },
      },
    },
  ],
  
  // Output folder for test artifacts
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});