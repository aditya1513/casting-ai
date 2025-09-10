const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function waitForFullLoad(page) {
  console.log('  ⏳ Waiting for full page load...');
  
  // 1. Wait for basic load states
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  console.log('  ✓ Network idle achieved');
  
  // 2. Wait for Dribbble-specific content
  try {
    await page.waitForSelector('img[src*="cdn.dribbble"]', { 
      state: 'visible',
      timeout: 10000 
    });
    console.log('  ✓ Dribbble images detected');
  } catch (e) {
    console.log('  ⚠️ No Dribbble images found, continuing...');
  }
  
  // 3. Wait for all images to load
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.onload = img.onerror = resolve;
        }))
    );
  });
  console.log('  ✓ All images loaded');
  
  // 4. Extra buffer for any animations
  await page.waitForTimeout(5000);
  console.log('  ✓ Ready for screenshot');
}

async function captureProfile(profileName) {
  console.log(`\n🎨 Starting capture for: ${profileName}`);
  console.log('============================================\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High quality
  });
  
  const page = await context.newPage();
  
  // Create output directory
  const outputDir = path.join(process.cwd(), `design-research/inspiration/${profileName}`);
  await fs.mkdir(outputDir, { recursive: true });
  
  try {
    // Navigate to profile
    const profileUrl = `https://dribbble.com/${profileName}`;
    console.log(`📍 Navigating to ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForFullLoad(page);
    
    // Capture profile overview
    const profileScreenshot = path.join(outputDir, `${profileName}-profile-overview.png`);
    await page.screenshot({ 
      path: profileScreenshot,
      fullPage: true 
    });
    console.log(`✅ Captured profile overview\n`);
    
    // Scroll to load more shots
    console.log('📜 Loading all shots...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(3000);
    }
    
    // Get shots that belong to this profile
    console.log('🔍 Finding shots by ' + profileName + '...');
    const shots = await page.evaluate((profile) => {
      const shotLinks = [];
      
      // Since we're on the profile page, all shots shown belong to this profile
      // Find all shot links on the page
      document.querySelectorAll('a[href*="/shots/"]').forEach(link => {
        // Make sure it's a shot link (contains /shots/ in the URL)
        if (link.href && link.href.includes('/shots/') && link.href.includes('dribbble.com')) {
          const href = link.href;
          const img = link.querySelector('img');
          const title = img?.alt || img?.title || 'untitled';
          
          // Avoid duplicates
          if (!shotLinks.find(s => s.href === href) && title) {
            shotLinks.push({ 
              href, 
              title: title.substring(0, 50).replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').toLowerCase() || 'shot'
            });
          }
        }
      });
      
      return shotLinks;
    }, profileName);
    
    console.log(`✓ Found ${shots.length} shots by ${profileName}\n`);
    
    // Capture individual shots
    for (let i = 0; i < Math.min(shots.length, 20); i++) {
      const shot = shots[i];
      console.log(`📷 [${i+1}/${Math.min(shots.length, 20)}] Capturing: ${shot.title}`);
      
      try {
        await page.goto(shot.href, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForFullLoad(page);
        
        // Verify this is still the correct author's work
        const isCorrectAuthor = await page.evaluate((profile) => {
          const authorLinks = document.querySelectorAll(`a[href="/${profile}"]`);
          return authorLinks.length > 0;
        }, profileName);
        
        if (!isCorrectAuthor) {
          console.log(`  ⚠️ Skipping - not by ${profileName}`);
          continue;
        }
        
        // Take screenshot
        const screenshotPath = path.join(outputDir, `${profileName}-shot-${i+1}-${shot.title}.png`);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        console.log(`  ✅ Saved: ${shot.title}`);
        
        // Rate limiting
        await page.waitForTimeout(3000 + Math.random() * 2000);
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n✨ Completed capturing ${profileName}'s portfolio!`);
    console.log(`📁 Screenshots saved to: ${outputDir}`);
    
    // List files captured
    const files = await fs.readdir(outputDir);
    console.log(`📊 Total files captured: ${files.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await browser.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const profile = args[0];
  
  if (!profile) {
    console.log('Usage: node capture-dribbble-fixed.js <profile>');
    console.log('Example: node capture-dribbble-fixed.js glebich');
    console.log('Example: node capture-dribbble-fixed.js uxerflow');
    process.exit(1);
  }
  
  await captureProfile(profile);
}

main().catch(console.error);