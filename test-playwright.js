const { chromium } = require('playwright');

async function testPlaywright() {
  console.log('Starting Playwright test...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to example.com...');
  await page.goto('https://example.com');
  
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  const heading = await page.textContent('h1');
  console.log(`Main heading: ${heading}`);
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'example-screenshot.png' });
  console.log('Screenshot saved as example-screenshot.png');
  
  await browser.close();
  console.log('Test completed successfully!');
}

testPlaywright().catch(console.error);