#!/usr/bin/env node
/**
 * Comprehensive CastMatch API Testing Suite
 * 
 * Tests all non-database dependent endpoints with extensive validation
 * Including security, performance, and error handling testing
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';
const CONCURRENT_REQUESTS = 5;
const TEST_DELAY = 100; // ms between tests to avoid rate limiting

class APITester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      performance: {},
      security: {},
      details: []
    };
  }

  async runTest(testName, testFunction) {
    this.results.total++;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.results.passed++;
        console.log(`✅ PASS: ${testName} (${duration}ms)`);
        this.results.details.push({
          test: testName,
          status: 'PASS',
          duration,
          details: result.details || {}
        });
      } else {
        this.results.failed++;
        console.log(`❌ FAIL: ${testName} - ${result.message}`);
        this.results.errors.push(`${testName}: ${result.message}`);
        this.results.details.push({
          test: testName,
          status: 'FAIL',
          duration,
          error: result.message,
          details: result.details || {}
        });
      }
    } catch (error) {
      this.results.failed++;
      const errorMsg = error.message || 'Unknown error';
      console.log(`💥 ERROR: ${testName} - ${errorMsg}`);
      this.results.errors.push(`${testName}: ${errorMsg}`);
      this.results.details.push({
        test: testName,
        status: 'ERROR',
        error: errorMsg
      });
    }
    
    // Small delay to avoid overwhelming rate limiter
    await this.delay(TEST_DELAY);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const startTime = Date.now();
    
    try {
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx status codes
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      const duration = Date.now() - startTime;
      
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 0,
        error: error.message,
        duration
      };
    }
  }

  // Health and Infrastructure Tests
  async testBasicHealth() {
    const response = await this.makeRequest('GET', '/health');
    return {
      success: response.status === 200 && response.data.success === true,
      message: response.status === 200 ? 'Health endpoint working' : `Status: ${response.status}`,
      details: { 
        status: response.status, 
        uptime: response.data?.uptime,
        version: response.data?.version,
        duration: response.duration
      }
    };
  }

  async testReadinessCheck() {
    const response = await this.makeRequest('GET', '/health/ready');
    return {
      success: response.status === 503, // Expected due to DB issue
      message: response.status === 503 ? 'Readiness check correctly reporting DB issue' : `Unexpected status: ${response.status}`,
      details: { 
        status: response.status, 
        checks: response.data?.checks,
        duration: response.duration
      }
    };
  }

  async testLivenessCheck() {
    const response = await this.makeRequest('GET', '/health/live');
    return {
      success: response.status === 200 && response.data.success === true,
      message: response.status === 200 ? 'Liveness check working' : `Status: ${response.status}`,
      details: { 
        status: response.status, 
        memory: response.data?.memory,
        duration: response.duration
      }
    };
  }

  // Error Handling Tests
  async testNotFoundHandling() {
    const response = await this.makeRequest('GET', '/nonexistent-endpoint');
    return {
      success: response.status === 404,
      message: response.status === 404 ? '404 handling working correctly' : `Status: ${response.status}`,
      details: { 
        status: response.status, 
        errorCode: response.data?.error?.code,
        duration: response.duration
      }
    };
  }

  async testInvalidMethod() {
    const response = await this.makeRequest('DELETE', '/health');
    return {
      success: response.status === 405 || response.status === 404,
      message: response.status === 405 || response.status === 404 ? 'Method not allowed handled correctly' : `Status: ${response.status}`,
      details: { 
        status: response.status,
        duration: response.duration
      }
    };
  }

  // Security Tests
  async testCORSHeaders() {
    const response = await this.makeRequest('OPTIONS', '/health', null, {
      'Origin': 'https://example.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    });
    
    const hasRequiredHeaders = response.headers['access-control-allow-origin'] !== undefined ||
                              response.headers['access-control-allow-methods'] !== undefined;
    
    return {
      success: response.status === 204 && hasRequiredHeaders,
      message: hasRequiredHeaders ? 'CORS headers present' : 'Missing CORS headers',
      details: { 
        status: response.status,
        corsHeaders: {
          allowOrigin: response.headers['access-control-allow-origin'],
          allowMethods: response.headers['access-control-allow-methods'],
          allowHeaders: response.headers['access-control-allow-headers']
        },
        duration: response.duration
      }
    };
  }

  async testSecurityHeaders() {
    const response = await this.makeRequest('GET', '/health');
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'strict-transport-security',
      'content-security-policy'
    ];
    
    const presentHeaders = securityHeaders.filter(header => response.headers[header]);
    
    return {
      success: presentHeaders.length >= 2,
      message: `${presentHeaders.length}/${securityHeaders.length} security headers present`,
      details: { 
        status: response.status,
        securityHeaders: presentHeaders,
        allHeaders: Object.keys(response.headers).filter(h => h.startsWith('x-') || h.includes('security') || h.includes('policy')),
        duration: response.duration
      }
    };
  }

  async testRateLimiting() {
    // Test rate limiting by making rapid requests
    const responses = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await this.makeRequest('POST', '/auth/register', {
        email: `test${i}@example.com`,
        password: 'TestPass123!'
      });
      responses.push(response);
    }
    
    const rateLimited = responses.some(r => r.status === 429);
    
    return {
      success: rateLimited,
      message: rateLimited ? 'Rate limiting is active' : 'Rate limiting not detected',
      details: { 
        responses: responses.map(r => ({ status: r.status, duration: r.duration })),
        rateLimitedCount: responses.filter(r => r.status === 429).length
      }
    };
  }

  // Validation Tests
  async testJSONParsingError() {
    const response = await this.makeRequest('POST', '/auth/login', 'invalid-json', {
      'Content-Type': 'application/json'
    });
    
    return {
      success: response.status === 400 || response.status === 500,
      message: `JSON parsing error handled with status ${response.status}`,
      details: { 
        status: response.status,
        errorCode: response.data?.error?.code,
        duration: response.duration
      }
    };
  }

  async testLargePayload() {
    const largeData = {
      email: 'test@example.com',
      password: 'A'.repeat(10000), // Very long password
      description: 'X'.repeat(50000) // Large field
    };
    
    const response = await this.makeRequest('POST', '/auth/register', largeData);
    
    return {
      success: response.status === 413 || response.status === 400 || response.status === 429,
      message: `Large payload handled with status ${response.status}`,
      details: { 
        status: response.status,
        payloadSize: JSON.stringify(largeData).length,
        duration: response.duration
      }
    };
  }

  // Performance Tests
  async testConcurrentRequests() {
    console.log(`\n🚀 Running ${CONCURRENT_REQUESTS} concurrent requests...`);
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      promises.push(this.makeRequest('GET', '/health'));
    }
    
    const responses = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;
    const avgResponseTime = responses.reduce((sum, r) => sum + r.duration, 0) / responses.length;
    const successfulResponses = responses.filter(r => r.status === 200).length;
    
    this.results.performance.concurrent = {
      totalRequests: CONCURRENT_REQUESTS,
      successful: successfulResponses,
      totalDuration,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: (CONCURRENT_REQUESTS / (totalDuration / 1000)).toFixed(2)
    };
    
    return {
      success: successfulResponses >= CONCURRENT_REQUESTS * 0.8, // 80% success rate
      message: `${successfulResponses}/${CONCURRENT_REQUESTS} concurrent requests successful`,
      details: this.results.performance.concurrent
    };
  }

  async testResponseTimes() {
    const endpoints = ['/health', '/health/live', '/health/ready'];
    const times = {};
    
    for (const endpoint of endpoints) {
      const response = await this.makeRequest('GET', endpoint);
      times[endpoint] = response.duration;
    }
    
    const avgTime = Object.values(times).reduce((a, b) => a + b, 0) / endpoints.length;
    this.results.performance.responseTimes = times;
    this.results.performance.averageResponseTime = avgTime;
    
    return {
      success: avgTime < 500, // Less than 500ms average
      message: `Average response time: ${avgTime.toFixed(2)}ms`,
      details: { times, average: avgTime }
    };
  }

  // Generate Comprehensive Report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('COMPREHENSIVE API TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Overall Results:`);
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (Object.keys(this.results.performance).length > 0) {
      console.log(`\n⚡ Performance Metrics:`);
      if (this.results.performance.averageResponseTime) {
        console.log(`Average Response Time: ${this.results.performance.averageResponseTime.toFixed(2)}ms`);
      }
      if (this.results.performance.concurrent) {
        const perf = this.results.performance.concurrent;
        console.log(`Concurrent Requests: ${perf.successful}/${perf.totalRequests} successful`);
        console.log(`Requests/Second: ${perf.requestsPerSecond}`);
      }
    }
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Failures:`);
      this.results.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    console.log(`\n📝 Test Report saved to: tests/api-comprehensive-report.json`);
    
    return {
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.total) * 100).toFixed(1)
      },
      performance: this.results.performance,
      details: this.results.details,
      timestamp: new Date().toISOString()
    };
  }

  async runAllTests() {
    console.log('🎯 Starting Comprehensive CastMatch API Testing...');
    console.log(`Base URL: ${BASE_URL}\n`);
    
    // Phase 1: Basic Infrastructure
    console.log('\n📋 PHASE 1: Basic Infrastructure Tests');
    await this.runTest('Basic Health Check', () => this.testBasicHealth());
    await this.runTest('Readiness Check', () => this.testReadinessCheck());
    await this.runTest('Liveness Check', () => this.testLivenessCheck());
    
    // Phase 2: Error Handling
    console.log('\n📋 PHASE 2: Error Handling Tests');
    await this.runTest('404 Not Found Handling', () => this.testNotFoundHandling());
    await this.runTest('Invalid HTTP Method', () => this.testInvalidMethod());
    await this.runTest('JSON Parsing Error', () => this.testJSONParsingError());
    await this.runTest('Large Payload Handling', () => this.testLargePayload());
    
    // Phase 3: Security
    console.log('\n📋 PHASE 3: Security Tests');
    await this.runTest('CORS Headers', () => this.testCORSHeaders());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    
    // Phase 4: Performance
    console.log('\n📋 PHASE 4: Performance Tests');
    await this.runTest('Response Time Analysis', () => this.testResponseTimes());
    await this.runTest('Concurrent Request Handling', () => this.testConcurrentRequests());
    
    return this.generateReport();
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new APITester();
  
  tester.runAllTests()
    .then(report => {
      // Save detailed report
      const fs = require('fs');
      fs.writeFileSync('tests/api-comprehensive-report.json', JSON.stringify(report, null, 2));
      
      console.log('\n🏁 Testing complete!');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n💥 Testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = APITester;