const { chromium } = require('playwright');

async function fetchExcloudDocs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Excloud documentation...');
    await page.goto('https://excloud.in/docs/quickstart/login-and-registration-guide', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    const title = await page.title();
    console.log(`Page title: ${title}\n`);
    
    // Extract main content
    const content = await page.evaluate(() => {
      const main = document.querySelector('main, article, .content, .docs-content, [role="main"]');
      return main ? main.innerText : document.body.innerText;
    });
    
    console.log('Documentation content:');
    console.log('='.repeat(50));
    console.log(content.substring(0, 2000));
    console.log('='.repeat(50));
    
    // Look for API-related links in documentation
    const apiLinks = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a');
      const links = [];
      anchors.forEach(a => {
        const text = a.textContent?.toLowerCase() || '';
        const href = a.href || '';
        if (text.includes('api') || text.includes('storage') || text.includes('s3') || 
            text.includes('object') || text.includes('authentication') || text.includes('key')) {
          links.push({ 
            text: a.textContent?.trim(), 
            href: href.replace(window.location.origin, '')
          });
        }
      });
      return links;
    });
    
    if (apiLinks.length > 0) {
      console.log('\nAPI-related documentation links found:');
      apiLinks.forEach(link => {
        console.log(`- ${link.text}: ${link.href}`);
      });
    }
    
    // Try to find navigation menu items
    const navItems = await page.evaluate(() => {
      const nav = document.querySelector('nav, .sidebar, .navigation, .menu');
      if (nav) {
        const items = nav.querySelectorAll('a');
        return Array.from(items).map(a => ({
          text: a.textContent?.trim(),
          href: a.href
        }));
      }
      return [];
    });
    
    if (navItems.length > 0) {
      console.log('\nDocumentation sections:');
      navItems.forEach(item => {
        if (item.text) {
          console.log(`- ${item.text}`);
        }
      });
    }
    
    // Take screenshot
    await page.screenshot({ path: 'excloud-docs.png', fullPage: true });
    console.log('\nFull page screenshot saved as excloud-docs.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

fetchExcloudDocs().catch(console.error);