/**
 * Dribbble Screenshot Capture Script - Production Version
 * Fixes loading state issues and profile mismatch problems
 * Version: 2.0
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  profiles: {
    'glebich': {
      url: 'https://dribbble.com/glebich',
      displayName: 'Gleb Kuznetsov✈',
      verificationSelectors: ['a[href="/glebich"]', 'span:text("Gleb Kuznetsov")'],
      maxShots: 20
    },
    'uxerflow': {
      url: 'https://dribbble.com/uxerflow',
      displayName: 'UXerflow',
      verificationSelectors: ['a[href="/uxerflow"]', 'span:text("UXerflow")'],
      maxShots: 20
    }
  },
  viewport: { width: 1920, height: 1080 },
  screenshotQuality: 90,
  retryAttempts: 3,
  delayBetweenCaptures: { min: 3000, max: 7000 },
  outputDir: './screenshots'
};

// Utility Functions
function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function getRandomDelay() {
  return Math.floor(
    Math.random() * (CONFIG.delayBetweenCaptures.max - CONFIG.delayBetweenCaptures.min) + 
    CONFIG.delayBetweenCaptures.min
  );
}

async function ensureDirectories(profileName) {
  const date = new Date().toISOString().split('T')[0];
  const dirs = [
    path.join(CONFIG.outputDir, profileName, date),
    path.join(CONFIG.outputDir, '_rejected'),
    path.join(CONFIG.outputDir, '_metadata')
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  return path.join(CONFIG.outputDir, profileName, date);
}

// Core Loading Functions
async function waitForFullLoad(page) {
  console.log('  ⏳ Waiting for full page load...');
  
  try {
    // Strategy 1: Basic load states
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    console.log('  ✓ Network idle achieved');
    
    // Strategy 2: Wait for Dribbble-specific content
    await page.waitForSelector('img[src*="cdn.dribbble"]', { 
      state: 'visible',
      timeout: 20000 
    });
    console.log('  ✓ Dribbble images detected');
    
    // Strategy 3: Ensure all images are loaded
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      if (images.length === 0) return false;
      return images.every(img => {
        if (!img.src) return true; // Skip images without src
        return img.complete && img.naturalHeight !== 0;
      });
    }, { timeout: 30000 });
    console.log('  ✓ All images loaded');
    
    // Strategy 4: Check for absence of loading indicators
    await page.waitForFunction(() => {
      const loaders = document.querySelectorAll(
        '.spinner, .loader, .loading, [class*="load"], [class*="spin"], .skeleton'
      );
      return loaders.length === 0 || 
             Array.from(loaders).every(el => {
               const style = window.getComputedStyle(el);
               return style.display === 'none' || 
                      style.visibility === 'hidden' ||
                      style.opacity === '0';
             });
    }, { timeout: 15000 });
    console.log('  ✓ No loading indicators visible');
    
    // Strategy 5: Additional stability buffer
    await page.waitForTimeout(5000);
    console.log('  ✓ Stability buffer complete');
    
    return true;
  } catch (error) {
    console.error('  ✗ Full load wait failed:', error.message);
    return false;
  }
}

async function verifyProfileOwnership(page, profileName) {
  try {
    const profileConfig = CONFIG.profiles[profileName];
    
    for (const selector of profileConfig.verificationSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`  ✓ Profile verified: ${profileName}`);
        return true;
      }
    }
    
    console.error(`  ✗ Profile verification failed for: ${profileName}`);
    return false;
  } catch (error) {
    console.error('  ✗ Error during profile verification:', error.message);
    return false;
  }
}

async function collectVerifiedShots(page, profileName) {
  console.log(`\n📋 Collecting shots from ${profileName}...`);
  
  const shots = await page.evaluate((profile) => {
    const shotElements = document.querySelectorAll('li[data-thumbnail]');
    const verifiedShots = [];
    
    shotElements.forEach((shot, index) => {
      // Multiple verification strategies
      const authorLink = shot.querySelector('a.hoverable');
      const shotLink = shot.querySelector('a.dribbble-link, a[href*="/shots/"]');
      const thumbnail = shot.querySelector('img');
      
      // Verify author ownership
      let isVerified = false;
      if (authorLink && authorLink.href.includes(`/${profile}`)) {
        isVerified = true;
      } else {
        // Check for profile name in any link within the shot
        const allLinks = shot.querySelectorAll('a');
        for (const link of allLinks) {
          if (link.href.includes(`/${profile}`)) {
            isVerified = true;
            break;
          }
        }
      }
      
      if (isVerified && shotLink) {
        verifiedShots.push({
          url: shotLink.href,
          title: thumbnail?.alt || `shot-${index}`,
          thumbnail: thumbnail?.src,
          verified: true,
          index: index
        });
      }
    });
    
    return verifiedShots;
  }, profileName);
  
  console.log(`  ✓ Found ${shots.length} verified shots`);
  return shots;
}

async function performQualityCheck(page) {
  const checks = await page.evaluate(() => {
    const results = {
      passed: true,
      checks: {},
      reason: null,
      metrics: {}
    };
    
    // Check 1: No loading indicators
    const loaders = document.querySelectorAll('.spinner, .loader, .loading, .skeleton');
    const visibleLoaders = Array.from(loaders).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0';
    });
    results.checks.noLoaders = visibleLoaders.length === 0;
    results.metrics.loadersFound = visibleLoaders.length;
    
    // Check 2: Images loaded
    const images = Array.from(document.querySelectorAll('img'));
    const loadedImages = images.filter(img => img.complete && img.naturalHeight > 0);
    results.checks.imagesLoaded = images.length === 0 || loadedImages.length === images.length;
    results.metrics.imagesTotal = images.length;
    results.metrics.imagesLoaded = loadedImages.length;
    
    // Check 3: Main content visible
    const mainContent = document.querySelector(
      '.shot-content, .media-content, [class*="shot"], .shot-details-container'
    );
    results.checks.contentVisible = mainContent && mainContent.offsetHeight > 100;
    results.metrics.contentHeight = mainContent ? mainContent.offsetHeight : 0;
    
    // Check 4: No error messages
    const errorElements = document.querySelectorAll('.error, .not-found, [class*="404"]');
    results.checks.noErrors = errorElements.length === 0;
    
    // Check 5: Dribbble-specific content present
    const dribbbleContent = document.querySelector('img[src*="cdn.dribbble"]');
    results.checks.hasDribbbleContent = dribbbleContent !== null;
    
    // Determine overall pass/fail
    if (!results.checks.imagesLoaded) {
      results.passed = false;
      results.reason = `Images not fully loaded (${results.metrics.imagesLoaded}/${results.metrics.imagesTotal})`;
    } else if (!results.checks.contentVisible) {
      results.passed = false;
      results.reason = 'Main content not visible or too small';
    } else if (!results.checks.noErrors) {
      results.passed = false;
      results.reason = 'Error state detected on page';
    } else if (results.metrics.loadersFound > 0) {
      results.passed = false;
      results.reason = `Loading indicators still visible (${results.metrics.loadersFound} found)`;
    } else if (!results.checks.hasDribbbleContent) {
      results.passed = false;
      results.reason = 'No Dribbble content detected';
    }
    
    return results;
  });
  
  return checks;
}

async function getContentBounds(page) {
  return await page.evaluate(() => {
    const content = document.querySelector(
      '.shot-content, .media-content, [class*="shot"], .shot-details-container'
    );
    
    if (!content) {
      // Fallback to viewport
      return {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };
    }
    
    const rect = content.getBoundingClientRect();
    const padding = 20; // Add some padding
    
    return {
      x: Math.max(0, rect.x - padding),
      y: Math.max(0, rect.y - padding),
      width: Math.min(window.innerWidth, rect.width + (padding * 2)),
      height: Math.min(window.innerHeight, rect.height + (padding * 2))
    };
  });
}

async function captureShot(page, shot, profileName, outputDir, attempt = 1) {
  console.log(`\n🎯 Capturing: ${shot.title} (Attempt ${attempt})`);
  
  try {
    // Navigate to shot
    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for full load
    const loaded = await waitForFullLoad(page);
    if (!loaded) {
      throw new Error('Page did not fully load');
    }
    
    // Verify ownership on detail page
    const isCorrectAuthor = await page.evaluate((profile) => {
      // Check multiple possible author link locations
      const selectors = [
        `a[href*="/${profile}"]`,
        `a[href="/${profile}"]`,
        `.shot-user a[href*="${profile}"]`,
        `.attribution a[href*="${profile}"]`
      ];
      
      for (const selector of selectors) {
        const links = document.querySelectorAll(selector);
        if (links.length > 0) return true;
      }
      
      return false;
    }, profileName);
    
    if (!isCorrectAuthor) {
      console.error(`  ✗ REJECTED: Shot not by ${profileName}`);
      return null;
    }
    console.log(`  ✓ Ownership verified`);
    
    // Perform quality check
    const qualityCheck = await performQualityCheck(page);
    if (!qualityCheck.passed) {
      console.error(`  ✗ REJECTED: ${qualityCheck.reason}`);
      console.log(`    Metrics:`, qualityCheck.metrics);
      return null;
    }
    console.log(`  ✓ Quality check passed`);
    
    // Get content bounds for better screenshot
    const bounds = await getContentBounds(page);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];
    const filename = path.join(
      outputDir,
      `${profileName}_${String(shot.index).padStart(3, '0')}_${timestamp}_${sanitizeFilename(shot.title)}.png`
    );
    
    // Capture screenshot
    await page.screenshot({
      path: filename,
      quality: CONFIG.screenshotQuality,
      clip: bounds
    });
    
    console.log(`  ✓ Screenshot saved: ${path.basename(filename)}`);
    
    return {
      filename,
      shot,
      timestamp: new Date().toISOString(),
      qualityCheck,
      attempt
    };
    
  } catch (error) {
    console.error(`  ✗ Error capturing shot:`, error.message);
    return null;
  }
}

async function captureWithRetry(page, shot, profileName, outputDir) {
  let lastResult = null;
  
  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    const result = await captureShot(page, shot, profileName, outputDir, attempt);
    
    if (result) {
      return result;
    }
    
    if (attempt < CONFIG.retryAttempts) {
      console.log(`  ⏳ Retrying in 5 seconds...`);
      await page.waitForTimeout(5000);
    }
    
    lastResult = result;
  }
  
  console.error(`  ✗ Failed after ${CONFIG.retryAttempts} attempts`);
  return lastResult;
}

async function generateReport(metadata, outputDir) {
  const reportPath = path.join(outputDir, '..', '_metadata', `report_${metadata.profile}_${Date.now()}.md`);
  
  const report = `# Screenshot Capture Report
## Profile: ${metadata.profile}
## Date: ${metadata.captureDate}

### Summary Statistics
- **Total Shots Attempted**: ${metadata.totalShots}
- **Successful Captures**: ${metadata.successfulCaptures}
- **Rejected Captures**: ${metadata.rejectedCaptures}
- **Success Rate**: ${(metadata.successfulCaptures / metadata.totalShots * 100).toFixed(1)}%
- **Average Attempts**: ${metadata.averageAttempts.toFixed(1)}

### Captured Shots
${metadata.captures.map((c, i) => `
${i + 1}. **${c.shot.title}**
   - File: \`${path.basename(c.filename)}\`
   - URL: ${c.shot.url}
   - Attempts: ${c.attempt}
   - Quality Checks:
     - Images Loaded: ${c.qualityCheck.checks.imagesLoaded ? '✅' : '❌'} (${c.qualityCheck.metrics.imagesLoaded}/${c.qualityCheck.metrics.imagesTotal})
     - Content Visible: ${c.qualityCheck.checks.contentVisible ? '✅' : '❌'} (Height: ${c.qualityCheck.metrics.contentHeight}px)
     - No Loaders: ${c.qualityCheck.checks.noLoaders ? '✅' : '❌'} (Found: ${c.qualityCheck.metrics.loadersFound})
     - No Errors: ${c.qualityCheck.checks.noErrors ? '✅' : '❌'}
     - Has Dribbble Content: ${c.qualityCheck.checks.hasDribbbleContent ? '✅' : '❌'}
`).join('\n')}

### Performance Metrics
- **Total Execution Time**: ${metadata.executionTime}
- **Average Time Per Shot**: ${metadata.averageTimePerShot}

### Notes
- All screenshots verified for correct profile ownership
- Multiple load strategies employed to ensure complete rendering
- Quality checks performed before each capture
`;
  
  await fs.writeFile(reportPath, report);
  console.log(`\n📊 Report saved: ${reportPath}`);
  return reportPath;
}

// Main Capture Function
async function captureProfile(profileName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting capture for profile: ${profileName}`);
  console.log(`${'='.repeat(60)}`);
  
  const startTime = Date.now();
  const profileConfig = CONFIG.profiles[profileName];
  
  if (!profileConfig) {
    console.error(`Profile ${profileName} not configured`);
    return;
  }
  
  // Setup directories
  const outputDir = await ensureDirectories(profileName);
  
  // Launch browser
  const browser = await chromium.launch({
    headless: false, // Set to true for production
    viewport: CONFIG.viewport
  });
  
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to profile
    console.log(`\n📍 Navigating to ${profileConfig.url}`);
    await page.goto(profileConfig.url, { waitUntil: 'networkidle' });
    
    // Wait for initial load
    await waitForFullLoad(page);
    
    // Verify profile
    const profileVerified = await verifyProfileOwnership(page, profileName);
    if (!profileVerified) {
      throw new Error(`Failed to verify profile: ${profileName}`);
    }
    
    // Collect shots
    const shots = await collectVerifiedShots(page, profileName);
    const shotsToCapture = shots.slice(0, profileConfig.maxShots);
    
    console.log(`\n📸 Starting capture of ${shotsToCapture.length} shots`);
    
    // Capture each shot
    const captures = [];
    for (let i = 0; i < shotsToCapture.length; i++) {
      const shot = shotsToCapture[i];
      
      // Add random delay between captures
      if (i > 0) {
        const delay = getRandomDelay();
        console.log(`\n⏳ Waiting ${delay}ms before next capture...`);
        await page.waitForTimeout(delay);
      }
      
      const result = await captureWithRetry(page, shot, profileName, outputDir);
      captures.push(result);
      
      // Memory management - restart context every 20 captures
      if ((i + 1) % 20 === 0 && i < shotsToCapture.length - 1) {
        console.log('\n🔄 Restarting browser context for memory management...');
        await page.close();
        await context.close();
        const newContext = await browser.newContext({
          viewport: CONFIG.viewport,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });
        page = await newContext.newPage();
      }
    }
    
    // Generate metadata and report
    const successfulCaptures = captures.filter(c => c !== null);
    const metadata = {
      profile: profileName,
      captureDate: new Date().toISOString(),
      totalShots: shotsToCapture.length,
      successfulCaptures: successfulCaptures.length,
      rejectedCaptures: captures.filter(c => c === null).length,
      captures: successfulCaptures,
      averageAttempts: successfulCaptures.reduce((acc, c) => acc + c.attempt, 0) / successfulCaptures.length || 1,
      executionTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      averageTimePerShot: `${((Date.now() - startTime) / shotsToCapture.length / 1000).toFixed(1)}s`
    };
    
    // Save metadata
    const metadataPath = path.join(outputDir, '..', '_metadata', `${profileName}_${Date.now()}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Generate report
    await generateReport(metadata, outputDir);
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ CAPTURE COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Profile: ${profileName}`);
    console.log(`Success Rate: ${(metadata.successfulCaptures / metadata.totalShots * 100).toFixed(1)}%`);
    console.log(`Total Time: ${metadata.executionTime}`);
    console.log(`Output Directory: ${outputDir}`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error(`\n❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node capture-dribbble-improved.js <profile_name|all>');
    console.log('Available profiles:', Object.keys(CONFIG.profiles).join(', '));
    process.exit(1);
  }
  
  const profileArg = args[0];
  
  if (profileArg === 'all') {
    for (const profileName of Object.keys(CONFIG.profiles)) {
      await captureProfile(profileName);
    }
  } else if (CONFIG.profiles[profileArg]) {
    await captureProfile(profileArg);
  } else {
    console.error(`Unknown profile: ${profileArg}`);
    console.log('Available profiles:', Object.keys(CONFIG.profiles).join(', '));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  captureProfile,
  waitForFullLoad,
  performQualityCheck,
  CONFIG
};