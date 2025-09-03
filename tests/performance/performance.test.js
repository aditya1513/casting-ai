/**
 * Performance Testing Suite
 * Node.js-based performance tests for CastMatch API
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class PerformanceTest {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.concurrency = config.concurrency || 10;
    this.duration = config.duration || 60000; // 1 minute
    this.rampUpTime = config.rampUpTime || 10000; // 10 seconds
    this.results = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  async makeRequest(options, data = null) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const client = this.baseUrl.startsWith('https') ? https : http;
      
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          let parsedData = null;
          try {
            parsedData = JSON.parse(responseData);
          } catch (e) {
            // Response might not be JSON
          }
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: parsedData,
            error: null,
          });
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: 0,
          responseTime,
          data: null,
          error: error.message,
        });
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async authenticateUser(email, password) {
    const url = new URL('/api/auth/login', this.baseUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const result = await this.makeRequest(options, { email, password });
    
    if (result.statusCode === 200 && result.data?.data?.tokens?.accessToken) {
      return result.data.data.tokens.accessToken;
    }
    
    return null;
  }

  async testAuthenticationFlow() {
    console.log('Testing Authentication Flow Performance...');
    
    const testResults = {
      registration: [],
      login: [],
      getCurrentUser: [],
      logout: [],
    };
    
    const concurrentUsers = Array.from({ length: this.concurrency }, (_, i) => ({
      email: `perftest${i}@example.com`,
      password: 'PerfTest123!',
      firstName: 'Perf',
      lastName: `Test${i}`,
    }));
    
    // Test registration performance
    console.log('Testing user registration...');
    const registrationPromises = concurrentUsers.map(async (user) => {
      const url = new URL('/api/auth/register', this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const result = await this.makeRequest(options, {
        ...user,
        confirmPassword: user.password,
        role: 'ACTOR',
        acceptTerms: true,
      });
      
      testResults.registration.push(result);
      return result;
    });
    
    await Promise.all(registrationPromises);
    
    // Test login performance
    console.log('Testing user login...');
    const loginPromises = concurrentUsers.map(async (user) => {
      const url = new URL('/api/auth/login', this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const result = await this.makeRequest(options, {
        email: user.email,
        password: user.password,
      });
      
      testResults.login.push(result);
      return result;
    });
    
    const loginResults = await Promise.all(loginPromises);
    
    // Test authenticated requests
    console.log('Testing authenticated requests...');
    const authenticatedPromises = loginResults
      .filter(result => result.statusCode === 200 && result.data?.data?.tokens?.accessToken)
      .map(async (loginResult) => {
        const token = loginResult.data.data.tokens.accessToken;
        const url = new URL('/api/auth/me', this.baseUrl);
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        };
        
        const result = await this.makeRequest(options);
        testResults.getCurrentUser.push(result);
        return result;
      });
    
    await Promise.all(authenticatedPromises);
    
    return testResults;
  }

  async testDatabasePerformance() {
    console.log('Testing Database Performance...');
    
    const results = {
      userCreation: [],
      userRetrieval: [],
      userUpdate: [],
      concurrentReads: [],
    };
    
    // Test concurrent user creation
    const userCreationPromises = Array.from({ length: this.concurrency }, async (_, i) => {
      const url = new URL('/api/auth/register', this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const result = await this.makeRequest(options, {
        email: `dbtest${i}@example.com`,
        password: 'DbTest123!',
        confirmPassword: 'DbTest123!',
        firstName: 'DB',
        lastName: `Test${i}`,
        role: 'ACTOR',
        acceptTerms: true,
      });
      
      results.userCreation.push(result);
      return result;
    });
    
    await Promise.all(userCreationPromises);
    
    // Test concurrent reads
    const readPromises = Array.from({ length: this.concurrency * 2 }, async (_, i) => {
      const token = await this.authenticateUser(`dbtest${i % this.concurrency}@example.com`, 'DbTest123!');
      
      if (token) {
        const url = new URL('/api/auth/me', this.baseUrl);
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        };
        
        const result = await this.makeRequest(options);
        results.concurrentReads.push(result);
        return result;
      }
    });
    
    await Promise.all(readPromises);
    
    return results;
  }

  async testEndpointPerformance() {
    console.log('Testing Individual Endpoint Performance...');
    
    const endpoints = [
      { path: '/api/auth/login', method: 'POST', data: { email: 'test@example.com', password: 'Test123!' } },
      { path: '/api/auth/me', method: 'GET', requiresAuth: true },
      { path: '/api/profile', method: 'GET', requiresAuth: true },
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
      
      let token = null;
      if (endpoint.requiresAuth) {
        token = await this.authenticateUser('test@example.com', 'Test123!');
      }
      
      const endpointResults = [];
      
      const requests = Array.from({ length: 50 }, async () => {
        const url = new URL(endpoint.path, this.baseUrl);
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        };
        
        const result = await this.makeRequest(options, endpoint.data);
        endpointResults.push(result);
        return result;
      });
      
      await Promise.all(requests);
      results[`${endpoint.method}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`] = endpointResults;
    }
    
    return results;
  }

  calculateStatistics(results) {
    if (!results || results.length === 0) {
      return { count: 0 };
    }
    
    const responseTimes = results.map(r => r.responseTime).filter(t => t != null);
    const statusCodes = results.map(r => r.statusCode);
    const errors = results.filter(r => r.error || r.statusCode >= 400);
    
    responseTimes.sort((a, b) => a - b);
    
    const stats = {
      count: results.length,
      successCount: results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length,
      errorCount: errors.length,
      errorRate: (errors.length / results.length) * 100,
      responseTime: {
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
        p90: responseTimes[Math.floor(responseTimes.length * 0.9)],
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      },
      statusCodeDistribution: statusCodes.reduce((acc, code) => {
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {}),
    };
    
    return stats;
  }

  printReport(testName, stats) {
    console.log(`\n=== ${testName} Performance Report ===`);
    
    if (typeof stats === 'object' && !Array.isArray(stats)) {
      for (const [key, value] of Object.entries(stats)) {
        if (Array.isArray(value)) {
          const keyStats = this.calculateStatistics(value);
          console.log(`\n${key}:`);
          this.printStats(keyStats);
        } else if (typeof value === 'object') {
          console.log(`\n${key}:`);
          this.printStats(value);
        }
      }
    } else {
      this.printStats(stats);
    }
  }

  printStats(stats) {
    console.log(`  Requests: ${stats.count}`);
    console.log(`  Successful: ${stats.successCount} (${((stats.successCount / stats.count) * 100).toFixed(2)}%)`);
    console.log(`  Errors: ${stats.errorCount} (${stats.errorRate?.toFixed(2)}%)`);
    
    if (stats.responseTime) {
      console.log(`  Response Time (ms):`);
      console.log(`    Min: ${stats.responseTime.min?.toFixed(2)}`);
      console.log(`    Max: ${stats.responseTime.max?.toFixed(2)}`);
      console.log(`    Avg: ${stats.responseTime.avg?.toFixed(2)}`);
      console.log(`    P50: ${stats.responseTime.p50?.toFixed(2)}`);
      console.log(`    P90: ${stats.responseTime.p90?.toFixed(2)}`);
      console.log(`    P95: ${stats.responseTime.p95?.toFixed(2)}`);
      console.log(`    P99: ${stats.responseTime.p99?.toFixed(2)}`);
    }
    
    if (stats.statusCodeDistribution) {
      console.log(`  Status Codes:`);
      for (const [code, count] of Object.entries(stats.statusCodeDistribution)) {
        console.log(`    ${code}: ${count}`);
      }
    }
  }

  async run() {
    console.log('Starting CastMatch Performance Tests...');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Concurrency: ${this.concurrency}`);
    console.log(`Duration: ${this.duration}ms\n`);
    
    this.startTime = Date.now();
    
    try {
      // Run authentication flow tests
      const authResults = await this.testAuthenticationFlow();
      this.printReport('Authentication Flow', authResults);
      
      // Run database performance tests
      const dbResults = await this.testDatabasePerformance();
      this.printReport('Database Performance', dbResults);
      
      // Run endpoint performance tests
      const endpointResults = await this.testEndpointPerformance();
      this.printReport('Endpoint Performance', endpointResults);
      
      this.endTime = Date.now();
      
      console.log(`\n=== Overall Test Summary ===`);
      console.log(`Total Test Duration: ${(this.endTime - this.startTime) / 1000}s`);
      console.log('Performance testing completed successfully!');
      
    } catch (error) {
      console.error('Performance testing failed:', error);
      process.exit(1);
    }
  }
}

// Run performance tests if this file is executed directly
if (require.main === module) {
  const config = {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    concurrency: parseInt(process.env.CONCURRENCY || '10'),
    duration: parseInt(process.env.DURATION || '60000'),
  };
  
  const performanceTest = new PerformanceTest(config);
  performanceTest.run().catch(console.error);
}

module.exports = PerformanceTest;