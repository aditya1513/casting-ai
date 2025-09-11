const { chromium } = require('playwright');

async function verifyServices() {
  console.log('\\n🔍 CastMatch Service Verification with Playwright\\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  const services = [
    { name: 'Frontend (Next.js)', url: 'http://localhost:3001', expectedTitle: /Next|React|CastMatch/i },
    { name: 'Backend API', url: 'http://localhost:5001/api', checkStatus: true },
    { name: 'Backend Health', url: 'http://localhost:5001/health', checkStatus: true },
    { name: 'PgAdmin', url: 'http://localhost:5050', expectedTitle: /pgAdmin/i },
    { name: 'Redis Commander', url: 'http://localhost:8081', expectedTitle: /Redis/i }
  ];
  
  const results = [];
  
  for (const service of services) {
    const page = await context.newPage();
    try {
      const response = await page.goto(service.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000 
      });
      
      const status = response.status();
      let details = `Status: ${status}`;
      
      if (service.expectedTitle) {
        const title = await page.title();
        const matches = service.expectedTitle.test(title);
        details += `, Title: "${title}" ${matches ? '✓' : '✗'}`;
      }
      
      if (service.checkStatus) {
        details += `, API Response: ${status < 400 ? 'OK' : 'ERROR'}`;
      }
      
      console.log(`✅ ${service.name}: Running`);
      console.log(`   URL: ${service.url}`);
      console.log(`   ${details}`);
      
      results.push({ 
        service: service.name, 
        url: service.url, 
        status: 'running', 
        httpStatus: status,
        details 
      });
      
    } catch (error) {
      console.log(`❌ ${service.name}: NOT running`);
      console.log(`   URL: ${service.url}`);
      console.log(`   Error: ${error.message.split('\\n')[0]}`);
      
      results.push({ 
        service: service.name, 
        url: service.url, 
        status: 'not_running', 
        error: error.message.split('\\n')[0] 
      });
    }
    await page.close();
    console.log('');
  }
  
  await browser.close();
  
  // Summary
  console.log('=' .repeat(60));
  console.log('\\n📊 SUMMARY:\\n');
  
  const running = results.filter(r => r.status === 'running').length;
  const total = results.length;
  
  console.log(`Services Running: ${running}/${total}`);
  
  if (running === total) {
    console.log('\\n✅ All services are operational and verified with Playwright!');
  } else {
    console.log('\\n⚠️  Some services are not accessible:');
    results.filter(r => r.status === 'not_running').forEach(r => {
      console.log(`  - ${r.service}: ${r.error}`);
    });
  }
  
  // Take screenshots of running services
  console.log('\\n📸 Taking screenshots of running services...\\n');
  
  const screenshotBrowser = await chromium.launch({ headless: true });
  const screenshotContext = await screenshotBrowser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  for (const result of results.filter(r => r.status === 'running')) {
    try {
      const page = await screenshotContext.newPage();
      await page.goto(result.url, { waitUntil: 'networkidle', timeout: 10000 });
      const filename = `screenshot-${result.service.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`📷 Screenshot saved: ${filename}`);
      await page.close();
    } catch (error) {
      console.log(`⚠️  Could not screenshot ${result.service}: ${error.message.split('\\n')[0]}`);
    }
  }
  
  await screenshotBrowser.close();
  
  console.log('\\n' + '=' .repeat(60));
  console.log('\\n✨ Verification complete!\\n');
  
  return results;
}

verifyServices().catch(console.error);