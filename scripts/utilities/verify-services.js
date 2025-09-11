const { chromium } = require('playwright');
const http = require('http');
const { Client } = require('pg');
const redis = require('redis');

async function checkHttpService(url, name) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`✅ ${name}: Running on ${url} (Status: ${res.statusCode})`);
      resolve(true);
    }).on('error', (err) => {
      console.log(`❌ ${name}: NOT running on ${url} - ${err.message}`);
      resolve(false);
    });
  });
}

async function checkPostgreSQL() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'castmatch_db',
    user: 'postgres',
    password: 'castmatch123'
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ PostgreSQL: Running on localhost:5432 (Time: ${res.rows[0].now})`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ PostgreSQL: NOT running - ${error.message}`);
    return false;
  }
}

async function checkRedis() {
  const client = redis.createClient({
    url: 'redis://localhost:6379'
  });
  
  try {
    await client.connect();
    await client.ping();
    console.log(`✅ Redis: Running on localhost:6379`);
    await client.quit();
    return true;
  } catch (error) {
    console.log(`❌ Redis: NOT running - ${error.message}`);
    return false;
  }
}

async function checkWithPlaywright() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = {};
  
  // Check Frontend
  try {
    const page = await context.newPage();
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 5000 });
    const title = await page.title();
    console.log(`✅ Frontend (Next.js): Running on http://localhost:3001 - Title: "${title}"`);
    results.frontend = true;
    await page.close();
  } catch (error) {
    console.log(`❌ Frontend: NOT running on http://localhost:3001 - ${error.message}`);
    results.frontend = false;
  }
  
  // Check Backend API
  try {
    const page = await context.newPage();
    const response = await page.goto('http://localhost:5001/api', { waitUntil: 'domcontentloaded', timeout: 5000 });
    const status = response.status();
    console.log(`✅ Backend API: Running on http://localhost:5001/api (Status: ${status})`);
    results.backend = true;
    await page.close();
  } catch (error) {
    console.log(`❌ Backend API: NOT running on http://localhost:5001 - ${error.message}`);
    results.backend = false;
  }
  
  // Check PgAdmin
  try {
    const page = await context.newPage();
    await page.goto('http://localhost:5050', { waitUntil: 'domcontentloaded', timeout: 5000 });
    const title = await page.title();
    console.log(`✅ PgAdmin: Running on http://localhost:5050 - Title: "${title}"`);
    results.pgadmin = true;
    await page.close();
  } catch (error) {
    console.log(`❌ PgAdmin: NOT running on http://localhost:5050 - ${error.message}`);
    results.pgadmin = false;
  }
  
  // Check Redis Commander
  try {
    const page = await context.newPage();
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 5000 });
    const title = await page.title();
    console.log(`✅ Redis Commander: Running on http://localhost:8081 - Title: "${title}"`);
    results.redisCommander = true;
    await page.close();
  } catch (error) {
    console.log(`❌ Redis Commander: NOT running on http://localhost:8081 - ${error.message}`);
    results.redisCommander = false;
  }
  
  await browser.close();
  return results;
}

async function main() {
  console.log('\\n🔍 CastMatch Service Verification\\n');
  console.log('=' .repeat(50));
  
  const services = {
    postgresql: await checkPostgreSQL(),
    redis: await checkRedis(),
    ...await checkWithPlaywright()
  };
  
  console.log('\\n' + '=' .repeat(50));
  console.log('\\n📊 SUMMARY:\\n');
  
  const runningCount = Object.values(services).filter(s => s).length;
  const totalCount = Object.keys(services).length;
  
  console.log(`Services Running: ${runningCount}/${totalCount}`);
  
  if (runningCount === totalCount) {
    console.log('\\n✅ All services are operational!');
  } else {
    console.log('\\n⚠️  Some services are not running:');
    Object.entries(services).forEach(([name, status]) => {
      if (!status) {
        console.log(`  - ${name}`);
      }
    });
  }
  
  console.log('\\n' + '=' .repeat(50));
  
  // Store the verification results
  const fs = require('fs');
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    services,
    summary: {
      running: runningCount,
      total: totalCount,
      allOperational: runningCount === totalCount
    }
  };
  
  fs.writeFileSync('service-verification-report.json', JSON.stringify(report, null, 2));
  console.log('\\n📝 Report saved to service-verification-report.json\\n');
}

main().catch(console.error);