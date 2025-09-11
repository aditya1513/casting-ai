const { chromium } = require('playwright');

async function fetchExcloudDetails() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Excloud website...');
    await page.goto('https://excloud.in', { waitUntil: 'networkidle' });
    
    // Get page title and main content
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Look for API or documentation links
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a');
      const relevantLinks = [];
      anchors.forEach(a => {
        const text = a.textContent?.toLowerCase() || '';
        const href = a.href || '';
        if (text.includes('api') || text.includes('doc') || text.includes('developer') || text.includes('storage')) {
          relevantLinks.push({ text: a.textContent?.trim(), href });
        }
      });
      return relevantLinks;
    });
    
    console.log('\nFound relevant links:');
    links.forEach(link => {
      console.log(`- ${link.text}: ${link.href}`);
    });
    
    // Try to find pricing or features section
    const features = await page.evaluate(() => {
      const text = document.body.innerText;
      const lines = text.split('\n');
      const relevantLines = lines.filter(line => 
        line.toLowerCase().includes('storage') || 
        line.toLowerCase().includes('api') ||
        line.toLowerCase().includes('cloud') ||
        line.toLowerCase().includes('s3')
      );
      return relevantLines.slice(0, 10);
    });
    
    console.log('\nRelevant content found:');
    features.forEach(feature => {
      console.log(`- ${feature}`);
    });
    
    // Check console page
    console.log('\nChecking console page...');
    await page.goto('https://console.excloud.in', { waitUntil: 'networkidle' });
    
    const consoleTitle = await page.title();
    console.log(`Console page title: ${consoleTitle}`);
    
    // Take screenshots
    await page.screenshot({ path: 'excloud-console.png' });
    console.log('Screenshot saved as excloud-console.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

fetchExcloudDetails().catch(console.error);