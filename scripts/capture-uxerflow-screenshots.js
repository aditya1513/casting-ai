const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function captureUxerflowScreenshots() {
  const browser = await chromium.launch({ 
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High quality screenshots
  });
  
  const page = await context.newPage();
  
  const uxerflowDir = path.join(process.cwd(), 'design-research/inspiration/uxerflow-ai-agent-platform');
  await fs.mkdir(uxerflowDir, { recursive: true });
  
  console.log('🤖 Capturing UXerflow AI Platform designs...\n');
  
  await page.goto('https://dribbble.com/uxerflow', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Capture main profile
  await page.screenshot({ 
    path: path.join(uxerflowDir, 'uxerflow-profile-overview.png'),
    fullPage: true 
  });
  console.log('✓ Captured profile overview');
  
  // Scroll to load all shots
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(2000);
  }
  
  // Get ALL shots, especially AI-related ones
  const allShots = await page.evaluate(() => {
    const shots = [];
    document.querySelectorAll('a[href*="/shots/"]').forEach(link => {
      const href = link.href;
      const img = link.querySelector('img');
      const title = img?.alt || 'untitled';
      
      if (href && !shots.find(s => s.href === href)) {
        // Prioritize AI-related projects
        const isAI = title.toLowerCase().includes('ai') || 
                     title.toLowerCase().includes('agent') || 
                     title.toLowerCase().includes('chat') ||
                     title.toLowerCase().includes('dashboard') ||
                     title.toLowerCase().includes('platform') ||
                     title.toLowerCase().includes('app') ||
                     title.toLowerCase().includes('interface');
        
        shots.push({ 
          href, 
          title: title.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
          priority: isAI ? 1 : 2
        });
      }
    });
    
    // Sort by priority (AI projects first)
    return shots.sort((a, b) => a.priority - b.priority).slice(0, 25);
  });
  
  console.log(`Found ${allShots.length} projects to capture\n`);
  
  // Capture individual shots with better naming
  for (let i = 0; i < allShots.length; i++) {
    const shot = allShots[i];
    const prefix = shot.priority === 1 ? 'ai-platform' : 'design';
    
    console.log(`📷 [${i+1}/${allShots.length}] Capturing: ${shot.title}`);
    
    try {
      await page.goto(shot.href, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Main screenshot
      await page.screenshot({ 
        path: path.join(uxerflowDir, `uxerflow-${prefix}-${i+1}-${shot.title}.png`),
        fullPage: true 
      });
      
      // Check for multiple images in the shot
      const images = await page.$$('.shot-media-container img, .media-wrapper img');
      if (images.length > 1) {
        console.log(`  └─ Found ${images.length} images in this shot`);
        
        for (let j = 0; j < Math.min(images.length, 3); j++) {
          await images[j].scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await page.screenshot({ 
            path: path.join(uxerflowDir, `uxerflow-${prefix}-${i+1}-${shot.title}-view-${j+1}.png`),
          });
        }
      }
      
      // Try to capture hover states
      const interactiveElements = await page.$$('button, .btn, [role="button"], .card, .component');
      if (interactiveElements.length > 0 && shot.priority === 1) {
        await interactiveElements[0].hover();
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: path.join(uxerflowDir, `uxerflow-${prefix}-${i+1}-${shot.title}-hover.png`),
        });
      }
      
    } catch (err) {
      console.log(`  ⚠️ Error: ${err.message}`);
    }
  }
  
  console.log('\n✅ UXerflow screenshot capture complete!');
  console.log(`📁 Screenshots saved to: ${uxerflowDir}`);
  
  // List captured files
  const files = await fs.readdir(uxerflowDir);
  console.log(`\n📊 Total screenshots captured: ${files.length}`);
  console.log('📷 AI Platform shots:', files.filter(f => f.includes('ai-platform')).length);
  console.log('🎨 Other design shots:', files.filter(f => f.includes('design')).length);
  
  await browser.close();
}

// Run the capture
captureUxerflowScreenshots().catch(console.error);