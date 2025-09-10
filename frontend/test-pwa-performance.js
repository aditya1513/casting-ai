#!/usr/bin/env node

const https = require('https');
const http = require('http');

// PWA Performance Test Suite for Mumbai Market Launch
const testSuite = {
  name: 'CastMatch PWA Performance Validation',
  baseUrl: 'http://localhost:3001',
  tests: [],
  results: {
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

function addTest(name, testFn) {
  testSuite.tests.push({ name, testFn });
}

function log(level, message) {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[level] || colors.info}${message}${colors.reset}`);
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data,
          responseTime: Date.now() - startTime
        });
      });
    });
    
    const startTime = Date.now();
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.abort();
      reject(new Error('Request timeout'));
    });
  });
}

// Test 1: Service Worker Registration
addTest('Service Worker Registration', async () => {
  try {
    const response = await makeRequest(`${testSuite.baseUrl}/sw.js`);
    if (response.statusCode === 200) {
      log('success', '✓ Service worker accessible');
      if (response.body.includes('workbox') || response.body.includes('cache')) {
        log('success', '✓ Service worker contains caching logic');
        return { status: 'passed', message: 'Service worker properly configured' };
      } else {
        log('warning', '⚠ Service worker may not have caching strategies');
        return { status: 'warning', message: 'Service worker exists but caching unclear' };
      }
    } else {
      throw new Error(`Service worker returned ${response.statusCode}`);
    }
  } catch (error) {
    log('error', '✗ Service worker test failed:', error.message);
    return { status: 'failed', message: error.message };
  }
});

// Test 2: Manifest.json Validation
addTest('Web App Manifest Validation', async () => {
  try {
    const response = await makeRequest(`${testSuite.baseUrl}/manifest.json`);
    if (response.statusCode === 200) {
      const manifest = JSON.parse(response.body);
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      const missing = requiredFields.filter(field => !manifest[field]);
      
      if (missing.length === 0) {
        log('success', '✓ Manifest has all required fields');
        
        // Check icons
        if (manifest.icons && manifest.icons.length >= 2) {
          log('success', '✓ Manifest has sufficient icons');
          return { status: 'passed', message: 'Web App Manifest properly configured' };
        } else {
          log('warning', '⚠ Manifest should have more icon sizes');
          return { status: 'warning', message: 'Manifest valid but needs more icons' };
        }
      } else {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }
    } else {
      throw new Error(`Manifest returned ${response.statusCode}`);
    }
  } catch (error) {
    log('error', '✗ Manifest validation failed:', error.message);
    return { status: 'failed', message: error.message };
  }
});

// Test 3: Critical Resource Loading
addTest('Critical Resource Performance', async () => {
  try {
    const response = await makeRequest(testSuite.baseUrl);
    
    if (response.statusCode === 200) {
      const loadTime = response.responseTime;
      const bodySize = response.body.length;
      
      log('info', `HTML load time: ${loadTime}ms`);
      log('info', `HTML size: ${(bodySize / 1024).toFixed(2)}KB`);
      
      // Mumbai market targets (slower networks)
      if (loadTime < 2000) {
        log('success', '✓ HTML loads quickly for Mumbai networks');
      } else {
        log('warning', '⚠ HTML load time may be slow on 3G networks');
      }
      
      if (bodySize < 50000) { // 50KB
        log('success', '✓ HTML size optimized for mobile data');
      } else {
        log('warning', '⚠ HTML size may be large for mobile data plans');
      }
      
      return {
        status: loadTime < 2000 && bodySize < 50000 ? 'passed' : 'warning',
        message: `HTML: ${loadTime}ms, ${(bodySize/1024).toFixed(2)}KB`
      };
    } else {
      throw new Error(`HTML returned ${response.statusCode}`);
    }
  } catch (error) {
    log('error', '✗ Critical resource test failed:', error.message);
    return { status: 'failed', message: error.message };
  }
});

// Test 4: PWA Icon Accessibility
addTest('PWA Icons Availability', async () => {
  const iconSizes = ['16x16', '32x32', '192x192', '512x512'];
  let passedIcons = 0;
  
  for (const size of iconSizes) {
    try {
      const response = await makeRequest(`${testSuite.baseUrl}/icons/icon-${size}.png`);
      if (response.statusCode === 200) {
        log('success', `✓ Icon ${size} available`);
        passedIcons++;
      } else {
        log('warning', `⚠ Icon ${size} returned ${response.statusCode}`);
      }
    } catch (error) {
      log('warning', `⚠ Icon ${size} failed: ${error.message}`);
    }
  }
  
  if (passedIcons >= 3) {
    return { status: 'passed', message: `${passedIcons}/${iconSizes.length} icons available` };
  } else if (passedIcons >= 1) {
    return { status: 'warning', message: `Only ${passedIcons}/${iconSizes.length} icons available` };
  } else {
    return { status: 'failed', message: 'No PWA icons found' };
  }
});

// Test 5: Mumbai Market Mobile Performance
addTest('Mumbai Mobile Performance Check', async () => {
  try {
    const startTime = Date.now();
    const response = await makeRequest(testSuite.baseUrl);
    const totalTime = Date.now() - startTime;
    
    log('info', `Total page load simulation: ${totalTime}ms`);
    
    // Mumbai network conditions (simulate slower speeds)
    const fastTime = 1500;  // Good 4G
    const slowTime = 3000;  // Slow 3G
    
    if (totalTime < fastTime) {
      log('success', '✓ Excellent performance for Mumbai 4G networks');
      return { status: 'passed', message: `${totalTime}ms - Excellent for Mumbai market` };
    } else if (totalTime < slowTime) {
      log('success', '✓ Good performance for Mumbai 3G networks');
      return { status: 'passed', message: `${totalTime}ms - Good for Mumbai market` };
    } else {
      log('warning', '⚠ May be slow on Mumbai 3G networks');
      return { status: 'warning', message: `${totalTime}ms - Optimize for Mumbai 3G` };
    }
  } catch (error) {
    log('error', '✗ Mumbai performance test failed:', error.message);
    return { status: 'failed', message: error.message };
  }
});

// Test Runner
async function runTests() {
  log('info', `🚀 Starting ${testSuite.name}`);
  log('info', `📱 Testing Mumbai market readiness on ${testSuite.baseUrl}`);
  log('info', '=====================================\n');
  
  for (const test of testSuite.tests) {
    log('info', `Testing: ${test.name}`);
    try {
      const result = await test.testFn();
      testSuite.results[result.status]++;
      
      if (result.status === 'passed') {
        log('success', `✅ PASSED: ${result.message}\n`);
      } else if (result.status === 'warning') {
        log('warning', `⚠️  WARNING: ${result.message}\n`);
      } else {
        log('error', `❌ FAILED: ${result.message}\n`);
      }
    } catch (error) {
      testSuite.results.failed++;
      log('error', `❌ ERROR: ${error.message}\n`);
    }
  }
  
  // Final Results
  log('info', '=====================================');
  log('info', '📊 FINAL RESULTS:');
  log('success', `✅ Passed: ${testSuite.results.passed}`);
  log('warning', `⚠️  Warnings: ${testSuite.results.warnings}`);
  log('error', `❌ Failed: ${testSuite.results.failed}`);
  
  const total = testSuite.results.passed + testSuite.results.warnings + testSuite.results.failed;
  const score = Math.round((testSuite.results.passed / total) * 100);
  
  log('info', `\n🎯 Mumbai Launch Readiness Score: ${score}%`);
  
  if (score >= 80) {
    log('success', '🌟 EXCELLENT - Ready for Mumbai market launch!');
  } else if (score >= 60) {
    log('warning', '⚠️  GOOD - Minor optimizations recommended');
  } else {
    log('error', '❌ NEEDS WORK - Address critical issues before launch');
  }
  
  return score;
}

// Export for use in other scripts
if (require.main === module) {
  runTests().then(score => {
    process.exit(score >= 60 ? 0 : 1);
  }).catch(error => {
    log('error', 'Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests, testSuite };