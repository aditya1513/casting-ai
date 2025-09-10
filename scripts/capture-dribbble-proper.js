const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function waitForFullLoad(page, shotName = '') {
  console.log(`  ⏳ Waiting for ${shotName} to fully load...`);
  
  try {
    // 1. Wait for basic load states
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // 2. Wait for Dribbble-specific content to be visible
    await page.waitForSelector('img[src*="cdn.dribbble"]', { 
      state: 'visible',
      timeout: 15000 
    });
    
    // 3. Check for and wait for any loading spinners to disappear
    const spinners = await page.$$('.loading, .spinner, [class*="load"], [class*="spin"]');
    if (spinners.length > 0) {
      console.log('  ⏳ Waiting for spinners to disappear...');
      await page.waitForTimeout(3000);
    }
    
    // 4. Ensure all images are fully loaded
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const images = Array.from(document.images);
        const promises = images
          .filter(img => !img.complete)
          .map(img => new Promise(res => {
            img.onload = img.onerror = res;
          }));
        
        if (promises.length === 0) {
          resolve();
        } else {
          Promise.all(promises).then(resolve);
        }
      });
    });
    
    // 5. Check if main content is visible
    const mainContent = await page.$eval('body', (body) => {
      const rect = body.getBoundingClientRect();
      return rect.height > 500; // Ensure page has actual content
    });
    
    if (!mainContent) {
      console.log('  ⚠️ Page seems empty, waiting more...');
      await page.waitForTimeout(5000);
    }
    
    // 6. Final buffer for any lazy-loaded content or animations
    await page.waitForTimeout(5000);
    
    console.log('  ✅ Page fully loaded');
    return true;
  } catch (error) {
    console.log(`  ⚠️ Loading timeout for ${shotName}, proceeding anyway`);
    return false;
  }
}

async function captureProfile(profileName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎨 CAPTURING: ${profileName.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const browser = await chromium.launch({ 
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High quality screenshots
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Create output directory
  const outputDir = path.join(process.cwd(), `design-research/inspiration/${profileName}`);
  await fs.mkdir(outputDir, { recursive: true });
  
  try {
    // Navigate to profile
    const profileUrl = `https://dribbble.com/${profileName}`;
    console.log(`📍 Step 1: Navigating to ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForFullLoad(page, 'profile page');
    
    // Capture profile overview
    console.log(`📸 Step 2: Capturing profile overview`);
    const profileScreenshot = path.join(outputDir, `${profileName}-profile-overview.png`);
    await page.screenshot({ 
      path: profileScreenshot,
      fullPage: true 
    });
    console.log(`   ✅ Saved: profile-overview.png\n`);
    
    // Scroll to load all shots
    console.log('📜 Step 3: Loading all shots on profile page');
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollAttempts = 0;
    
    while (previousHeight !== currentHeight && scrollAttempts < 10) {
      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
      scrollAttempts++;
      console.log(`   Scroll ${scrollAttempts}: Loaded ${currentHeight}px of content`);
    }
    
    // Get all shot links from THIS profile
    console.log(`\n🔍 Step 4: Finding shots by ${profileName}`);
    const shots = await page.evaluate((profile) => {
      const shotLinks = [];
      const seenUrls = new Set();
      
      // Get all shot links on the page
      const allLinks = document.querySelectorAll('a[href*="/shots/"]');
      
      allLinks.forEach(link => {
        const href = link.href;
        
        // Skip if we've already seen this URL
        if (seenUrls.has(href)) return;
        
        // Check if URL contains the profile name (ensuring it's from this designer)
        if (href.includes(`/${profile}/shots/`) || 
            (href.includes('/shots/') && window.location.pathname.includes(`/${profile}`))) {
          
          const img = link.querySelector('img');
          let title = 'untitled';
          
          if (img) {
            title = img.alt || img.title || 'untitled';
          }
          
          seenUrls.add(href);
          shotLinks.push({ 
            href, 
            title: title.substring(0, 60).replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').toLowerCase() || 'shot'
          });
        }
      });
      
      return shotLinks;
    }, profileName);
    
    console.log(`   ✅ Found ${shots.length} shots by ${profileName}\n`);
    
    if (shots.length === 0) {
      console.log('   ⚠️ No shots found. Trying alternative method...');
      
      // Alternative: Just get the first 20 links since we're on the profile page
      const allShots = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('a[href*="/shots/"]').forEach((link, index) => {
          if (index < 20 && link.href.includes('/shots/')) {
            const img = link.querySelector('img');
            links.push({
              href: link.href,
              title: (img?.alt || img?.title || `shot-${index + 1}`).substring(0, 60).replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').toLowerCase()
            });
          }
        });
        return links;
      });
      
      if (allShots.length > 0) {
        shots.push(...allShots);
        console.log(`   ✅ Found ${allShots.length} shots using alternative method\n`);
      }
    }
    
    // Capture individual shots
    console.log(`📷 Step 5: Capturing individual shots\n`);
    const maxShots = Math.min(shots.length, 20);
    let successCount = 0;
    
    for (let i = 0; i < maxShots; i++) {
      const shot = shots[i];
      console.log(`📷 [${i+1}/${maxShots}] ${shot.title}`);
      
      try {
        console.log(`   URL: ${shot.href}`);
        await page.goto(shot.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const loaded = await waitForFullLoad(page, shot.title);
        
        if (loaded) {
          // Double-check we're on a shot page
          const isShot = await page.evaluate(() => {
            return window.location.pathname.includes('/shots/');
          });
          
          if (isShot) {
            const screenshotPath = path.join(outputDir, `${profileName}-shot-${i+1}-${shot.title}.png`);
            await page.screenshot({ 
              path: screenshotPath,
              fullPage: true 
            });
            console.log(`   ✅ Captured successfully`);
            successCount++;
          } else {
            console.log(`   ⚠️ Not a valid shot page, skipping`);
          }
        }
        
        // Rate limiting to avoid being blocked
        await page.waitForTimeout(2000 + Math.random() * 2000);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log(`${'='.repeat(60)}`);
    console.log(`✨ COMPLETED: ${profileName}`);
    console.log(`📊 Successfully captured ${successCount + 1}/${maxShots + 1} files`);
    console.log(`📁 Location: ${outputDir}`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await browser.close();
  }
}

// Main execution
async function main() {
  const profiles = process.argv.slice(2);
  
  if (profiles.length === 0) {
    console.log('Usage: node capture-dribbble-proper.js <profile1> [profile2] ...');
    console.log('Example: node capture-dribbble-proper.js glebich uxerflow');
    process.exit(1);
  }
  
  for (const profile of profiles) {
    await captureProfile(profile);
  }
  
  console.log('🎉 All captures completed!');
}

main().catch(console.error);