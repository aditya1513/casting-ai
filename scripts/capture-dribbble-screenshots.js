const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function captureScreenshots() {
  const browser = await chromium.launch({ 
    headless: false,
    viewport: { width: 1920, height: 1080 }
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High quality screenshots
  });
  
  const page = await context.newPage();
  
  // Create directories if they don't exist
  const glebDir = path.join(process.cwd(), 'design-research/inspiration/glebich');
  const uxerflowDir = path.join(process.cwd(), 'design-research/inspiration/uxerflow-ai-agent-platform');
  
  await fs.mkdir(glebDir, { recursive: true });
  await fs.mkdir(uxerflowDir, { recursive: true });
  
  console.log('📸 Starting screenshot capture...\n');
  
  // Capture Gleb Kuznetsov's work
  console.log('🎨 Capturing Gleb Kuznetsov projects...');
  await page.goto('https://dribbble.com/glebich', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Capture main profile
  await page.screenshot({ 
    path: path.join(glebDir, 'gleb-profile-overview.png'),
    fullPage: true 
  });
  console.log('✓ Captured profile overview');
  
  // Scroll to load more shots
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(2000);
  }
  
  // Get all shot links
  const glebShots = await page.evaluate(() => {
    const shots = [];
    document.querySelectorAll('a[href*="/shots/"]').forEach(link => {
      const href = link.href;
      const title = link.querySelector('img')?.alt || 'untitled';
      if (href && !shots.find(s => s.href === href)) {
        shots.push({ href, title: title.replace(/[^a-z0-9]/gi, '-').toLowerCase() });
      }
    });
    return shots.slice(0, 15); // Top 15 projects
  });
  
  // Capture individual shots
  for (let i = 0; i < glebShots.length; i++) {
    const shot = glebShots[i];
    console.log(`📷 Capturing: ${shot.title}`);
    
    try {
      await page.goto(shot.href, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Capture the shot
      await page.screenshot({ 
        path: path.join(glebDir, `gleb-${i+1}-${shot.title}.png`),
        fullPage: true 
      });
      
      // Try to capture video/gif if present
      const hasVideo = await page.$('video');
      if (hasVideo) {
        await page.screenshot({ 
          path: path.join(glebDir, `gleb-${i+1}-${shot.title}-video-frame.png`),
        });
      }
    } catch (err) {
      console.log(`⚠️ Error capturing ${shot.title}: ${err.message}`);
    }
  }
  
  console.log('\n🤖 Capturing UXerflow AI Platform designs...');
  await page.goto('https://dribbble.com/uxerflow', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Capture main profile
  await page.screenshot({ 
    path: path.join(uxerflowDir, 'uxerflow-profile-overview.png'),
    fullPage: true 
  });
  console.log('✓ Captured profile overview');
  
  // Scroll to load shots
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(2000);
  }
  
  // Get AI-related shots
  const uxerflowShots = await page.evaluate(() => {
    const shots = [];
    document.querySelectorAll('a[href*="/shots/"]').forEach(link => {
      const href = link.href;
      const img = link.querySelector('img');
      const title = img?.alt || 'untitled';
      // Filter for AI-related projects
      if (href && (title.toLowerCase().includes('ai') || 
                   title.toLowerCase().includes('agent') || 
                   title.toLowerCase().includes('chat') ||
                   title.toLowerCase().includes('dashboard') ||
                   title.toLowerCase().includes('platform'))) {
        shots.push({ 
          href, 
          title: title.replace(/[^a-z0-9]/gi, '-').toLowerCase() 
        });
      }
    });
    return shots.slice(0, 15); // Top 15 AI projects
  });
  
  // Capture individual AI platform shots
  for (let i = 0; i < uxerflowShots.length; i++) {
    const shot = uxerflowShots[i];
    console.log(`📷 Capturing: ${shot.title}`);
    
    try {
      await page.goto(shot.href, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: path.join(uxerflowDir, `uxerflow-ai-${i+1}-${shot.title}.png`),
        fullPage: true 
      });
      
      // Capture any interactive states if visible
      const buttons = await page.$$('button, .btn, [role="button"]');
      if (buttons.length > 0) {
        await buttons[0].hover();
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: path.join(uxerflowDir, `uxerflow-ai-${i+1}-${shot.title}-hover.png`),
        });
      }
    } catch (err) {
      console.log(`⚠️ Error capturing ${shot.title}: ${err.message}`);
    }
  }
  
  // Capture additional general shots from UXerflow
  console.log('\n📱 Capturing additional UXerflow designs...');
  const allUxerflowShots = await page.evaluate(() => {
    const shots = [];
    document.querySelectorAll('a[href*="/shots/"]').forEach(link => {
      const href = link.href;
      const title = link.querySelector('img')?.alt || 'untitled';
      if (href && !shots.find(s => s.href === href)) {
        shots.push({ href, title: title.replace(/[^a-z0-9]/gi, '-').toLowerCase() });
      }
    });
    return shots.slice(0, 10); // Top 10 general projects
  });
  
  for (let i = 0; i < allUxerflowShots.length; i++) {
    const shot = allUxerflowShots[i];
    if (!uxerflowShots.find(s => s.href === shot.href)) {
      console.log(`📷 Capturing: ${shot.title}`);
      
      try {
        await page.goto(shot.href, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(uxerflowDir, `uxerflow-${i+1}-${shot.title}.png`),
          fullPage: true 
        });
      } catch (err) {
        console.log(`⚠️ Error capturing ${shot.title}: ${err.message}`);
      }
    }
  }
  
  console.log('\n✅ Screenshot capture complete!');
  console.log(`📁 Gleb screenshots saved to: ${glebDir}`);
  console.log(`📁 UXerflow screenshots saved to: ${uxerflowDir}`);
  
  await browser.close();
}

// Run the capture
captureScreenshots().catch(console.error);