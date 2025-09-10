const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // Navigate to the landing page
  const filePath = 'file://' + path.resolve('/Users/Aditya/Desktop/casting-ai/design-team/landing-page/index-premium.html');
  await page.goto(filePath);
  
  // Wait for the talent showcase cards to be visible
  await page.waitForSelector('.showcase-card', { timeout: 5000 });
  
  // Scroll to the talent showcase section
  await page.evaluate(() => {
    const heroSection = document.querySelector('.hero-visual');
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  
  // Wait a bit for animations
  await page.waitForTimeout(2000);
  
  // Take a screenshot of the talent cards area
  const showcaseSection = await page.$('.talent-showcase');
  if (showcaseSection) {
    await showcaseSection.screenshot({ 
      path: 'talent-cards-check.png',
      type: 'png'
    });
    console.log('Screenshot saved as talent-cards-check.png');
  }
  
  // Also check on mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);
  
  const showcaseSectionMobile = await page.$('.talent-showcase');
  if (showcaseSectionMobile) {
    await showcaseSectionMobile.screenshot({ 
      path: 'talent-cards-mobile-check.png',
      type: 'png'
    });
    console.log('Mobile screenshot saved as talent-cards-mobile-check.png');
  }
  
  // Get the computed styles to check for overlaps
  const overlapCheck = await page.evaluate(() => {
    const cards = document.querySelectorAll('.showcase-card');
    const results = [];
    
    cards.forEach((card, index) => {
      const badge = card.querySelector('.match-badge');
      const header = card.querySelector('.card-header');
      const info = card.querySelector('.card-info h3');
      
      if (badge && header && info) {
        const badgeRect = badge.getBoundingClientRect();
        const infoRect = info.getBoundingClientRect();
        
        // Check if badge overlaps with name
        const overlapping = (
          badgeRect.left < infoRect.right &&
          badgeRect.right > infoRect.left &&
          badgeRect.top < infoRect.bottom &&
          badgeRect.bottom > infoRect.top
        );
        
        results.push({
          card: index + 1,
          overlapping: overlapping,
          badgePosition: {
            left: badgeRect.left,
            top: badgeRect.top,
            right: badgeRect.right,
            bottom: badgeRect.bottom
          },
          namePosition: {
            left: infoRect.left,
            top: infoRect.top,
            right: infoRect.right,
            bottom: infoRect.bottom
          }
        });
      }
    });
    
    return results;
  });
  
  console.log('\n=== Overlap Check Results ===');
  overlapCheck.forEach(result => {
    console.log(`Card ${result.card}: ${result.overlapping ? '❌ OVERLAPPING' : '✅ No overlap'}`);
    if (result.overlapping) {
      console.log(`  Badge: left=${result.badgePosition.left}, right=${result.badgePosition.right}`);
      console.log(`  Name: left=${result.namePosition.left}, right=${result.namePosition.right}`);
    }
  });
  
  await browser.close();
})();