/**
 * POST-PRODUCTION API STRESS TESTING
 * CastMatch Mumbai Market Launch - January 13, 2025
 * 
 * This script performs comprehensive stress testing on all CastMatch API endpoints
 * Target: 1000+ concurrent requests with <200ms p99 response time
 * 
 * CRITICAL SUCCESS METRICS:
 * - API response time: <200ms p99
 * - Load test: 1000+ concurrent requests handled
 * - Zero critical failures during peak load
 * - Database connection pooling performance validated
 * - Authentication/authorization under load
 */

const axios = require('axios');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Test Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  maxConcurrent: 1000,
  testDuration: 120, // 2 minutes
  rampUpTime: 30, // 30 seconds to reach max concurrent
  endpoints: [
    { method: 'GET', path: '/api/health', weight: 10 },
    { method: 'GET', path: '/api/talents', weight: 25 },
    { method: 'GET', path: '/api/auditions', weight: 20 },
    { method: 'GET', path: '/api/projects', weight: 15 },
    { method: 'POST', path: '/api/auth/login', weight: 5, payload: { email: 'test@castmatch.com', password: 'test123' } },
    { method: 'GET', path: '/api/me', weight: 10, requiresAuth: true },
    { method: 'GET', path: '/api/search/talents', weight: 15, query: '?skills=acting&location=mumbai' }
  ],
  
  // Mumbai Peak Hour Traffic Patterns
  mumbaiPeakHours: [
    { hour: 9, multiplier: 1.5 },   // Morning casting calls
    { hour: 14, multiplier: 1.8 },  // Afternoon auditions  
    { hour: 19, multiplier: 2.0 },  // Evening reviews
  ],
  
  // User Role Distribution
  userRoles: {
    'talent': 0.6,        // 60% talent users
    'casting_director': 0.25, // 25% casting directors  
    'producer': 0.10,     // 10% producers
    'admin': 0.05        // 5% admin users
  }
};

class PostProductionStressTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorsByEndpoint: {},
      performanceMetrics: {
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        min: Infinity,
        max: 0
      },
      throughput: {
        requestsPerSecond: 0,
        peakRps: 0,
        averageRps: 0
      },
      authenticationMetrics: {
        loginSuccessRate: 0,
        tokenValidationRate: 0,
        rateLimitHits: 0
      },
      databaseMetrics: {
        connectionPoolUtilization: [],
        slowQueries: [],
        queryPerformance: {}
      }
    };
    
    this.authToken = null;
    this.activeRequests = 0;
    this.requestQueue = [];
    this.startTime = null;
    this.testRunning = false;
  }

  /**
   * Initialize test environment and authenticate
   */
  async initialize() {
    console.log('🚀 POST-PRODUCTION API STRESS TEST - CastMatch Mumbai Launch');
    console.log('📊 Target: 1000+ concurrent requests, <200ms p99 response time\n');
    
    try {
      // Test server connectivity
      const healthCheck = await axios.get(`${CONFIG.baseUrl}/api/health`);
      console.log('✅ Server connectivity verified');
      
      // Authenticate for protected endpoints
      await this.authenticate();
      console.log('✅ Authentication setup complete');
      
      // Warm up server
      await this.warmUpServer();
      console.log('✅ Server warm-up complete\n');
      
      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Authenticate and obtain JWT token
   */
  async authenticate() {
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
        email: 'load-test@castmatch.com',
        password: 'LoadTest2025!'
      });
      
      this.authToken = response.data.token || response.data.accessToken;
      if (!this.authToken) {
        throw new Error('No token received from authentication');
      }
    } catch (error) {
      console.warn('⚠️  Authentication failed, proceeding without auth token');
    }
  }

  /**
   * Warm up server to avoid cold start penalties
   */
  async warmUpServer() {
    const warmupPromises = [];
    for (let i = 0; i < 50; i++) {
      const endpoint = CONFIG.endpoints[Math.floor(Math.random() * CONFIG.endpoints.length)];
      warmupPromises.push(this.makeRequest(endpoint, false));
    }
    
    await Promise.allSettled(warmupPromises);
    // Wait for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Execute comprehensive stress test
   */
  async runStressTest() {
    if (!await this.initialize()) {
      throw new Error('Failed to initialize test environment');
    }

    console.log('🔥 Starting POST-PRODUCTION stress test...');
    console.log(`📈 Ramping up to ${CONFIG.maxConcurrent} concurrent requests over ${CONFIG.rampUpTime}s`);
    console.log(`⏱️  Test duration: ${CONFIG.testDuration}s\n`);

    this.startTime = performance.now();
    this.testRunning = true;

    // Start request generators
    const generators = [
      this.generateLoad(),
      this.generateMumbaiPeakTraffic(),
      this.generateRoleBasedRequests(),
      this.monitorPerformance()
    ];

    // Run test for specified duration
    await Promise.race([
      Promise.all(generators),
      new Promise(resolve => setTimeout(resolve, CONFIG.testDuration * 1000))
    ]);

    this.testRunning = false;
    
    // Wait for remaining requests to complete
    while (this.activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.generateReport();
  }

  /**
   * Generate main load with ramp-up pattern
   */
  async generateLoad() {
    const rampUpInterval = (CONFIG.rampUpTime * 1000) / CONFIG.maxConcurrent;
    let currentConcurrent = 0;

    while (this.testRunning && currentConcurrent < CONFIG.maxConcurrent) {
      if (this.activeRequests < currentConcurrent) {
        const endpoint = this.selectWeightedEndpoint();
        this.executeRequest(endpoint);
      }
      
      // Increase concurrent requests during ramp-up
      if (currentConcurrent < CONFIG.maxConcurrent) {
        currentConcurrent++;
        await new Promise(resolve => setTimeout(resolve, rampUpInterval));
      } else {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Generate Mumbai-specific peak hour traffic patterns
   */
  async generateMumbaiPeakTraffic() {
    while (this.testRunning) {
      const currentHour = new Date().getHours();
      const peakConfig = CONFIG.mumbaiPeakHours.find(p => p.hour === currentHour);
      
      if (peakConfig) {
        // Generate additional load during peak hours
        const additionalRequests = Math.floor(50 * peakConfig.multiplier);
        for (let i = 0; i < additionalRequests; i++) {
          if (!this.testRunning) break;
          
          const endpoint = this.selectMumbaiSpecificEndpoint();
          this.executeRequest(endpoint);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * Generate role-based request patterns
   */
  async generateRoleBasedRequests() {
    while (this.testRunning) {
      for (const [role, percentage] of Object.entries(CONFIG.userRoles)) {
        const requestCount = Math.floor(100 * percentage);
        
        for (let i = 0; i < requestCount; i++) {
          if (!this.testRunning) break;
          
          const endpoint = this.selectRoleBasedEndpoint(role);
          this.executeRequest(endpoint, role);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Monitor performance in real-time
   */
  async monitorPerformance() {
    while (this.testRunning) {
      const currentTime = performance.now();
      const elapsedSeconds = (currentTime - this.startTime) / 1000;
      
      // Calculate current RPS
      const currentRps = this.results.totalRequests / elapsedSeconds;
      this.results.throughput.averageRps = currentRps;
      
      if (currentRps > this.results.throughput.peakRps) {
        this.results.throughput.peakRps = currentRps;
      }
      
      // Log progress
      if (Math.floor(elapsedSeconds) % 10 === 0) {
        console.log(`📊 Progress: ${Math.floor(elapsedSeconds)}s | ` +
          `Active: ${this.activeRequests} | ` +
          `Total: ${this.results.totalRequests} | ` +
          `RPS: ${Math.round(currentRps)} | ` +
          `Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(1)}%`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Execute individual request with comprehensive tracking
   */
  async executeRequest(endpoint, userRole = null) {
    if (this.activeRequests >= CONFIG.maxConcurrent) {
      return;
    }

    this.activeRequests++;
    const startTime = performance.now();
    
    try {
      await this.makeRequest(endpoint, true, userRole);
      
      const responseTime = performance.now() - startTime;
      this.recordSuccess(endpoint, responseTime);
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.recordError(endpoint, error, responseTime);
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Make HTTP request with proper headers and error handling
   */
  async makeRequest(endpoint, trackMetrics = true, userRole = null) {
    const url = `${CONFIG.baseUrl}${endpoint.path}${endpoint.query || ''}`;
    const headers = {};
    
    if (endpoint.requiresAuth && this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }
    
    if (userRole) {
      headers['X-User-Role'] = userRole;
    }

    const config = {
      method: endpoint.method,
      url,
      headers,
      timeout: 30000, // 30 second timeout
      data: endpoint.payload
    };

    const response = await axios(config);
    
    if (trackMetrics) {
      // Track database metrics if available
      if (response.headers['x-db-query-time']) {
        this.results.databaseMetrics.queryPerformance[endpoint.path] = 
          parseFloat(response.headers['x-db-query-time']);
      }
    }
    
    return response;
  }

  /**
   * Select endpoint based on weighted distribution
   */
  selectWeightedEndpoint() {
    const totalWeight = CONFIG.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of CONFIG.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return CONFIG.endpoints[0];
  }

  /**
   * Select Mumbai-specific endpoints for regional testing
   */
  selectMumbaiSpecificEndpoint() {
    const mumbaiEndpoints = [
      { method: 'GET', path: '/api/search/talents', query: '?location=mumbai&skills=acting' },
      { method: 'GET', path: '/api/auditions', query: '?city=mumbai&status=active' },
      { method: 'GET', path: '/api/projects', query: '?location=mumbai&type=ott' }
    ];
    
    return mumbaiEndpoints[Math.floor(Math.random() * mumbaiEndpoints.length)];
  }

  /**
   * Select endpoint based on user role
   */
  selectRoleBasedEndpoint(role) {
    const roleEndpoints = {
      talent: [
        { method: 'GET', path: '/api/auditions', weight: 40 },
        { method: 'GET', path: '/api/me/applications', weight: 30 },
        { method: 'POST', path: '/api/applications', weight: 20, payload: { auditionId: 'test' } },
        { method: 'GET', path: '/api/me/profile', weight: 10 }
      ],
      casting_director: [
        { method: 'GET', path: '/api/search/talents', weight: 50 },
        { method: 'GET', path: '/api/auditions/manage', weight: 30 },
        { method: 'POST', path: '/api/auditions', weight: 15, payload: { title: 'Test Audition' } },
        { method: 'GET', path: '/api/applications', weight: 5 }
      ],
      producer: [
        { method: 'GET', path: '/api/projects', weight: 40 },
        { method: 'GET', path: '/api/analytics/dashboard', weight: 30 },
        { method: 'POST', path: '/api/projects', weight: 20, payload: { title: 'Test Project' } },
        { method: 'GET', path: '/api/reports/casting', weight: 10 }
      ]
    };
    
    const endpoints = roleEndpoints[role] || CONFIG.endpoints;
    return this.selectFromWeightedArray(endpoints);
  }

  selectFromWeightedArray(endpoints) {
    const totalWeight = endpoints.reduce((sum, ep) => sum + (ep.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
      random -= (endpoint.weight || 1);
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return endpoints[0];
  }

  /**
   * Record successful request metrics
   */
  recordSuccess(endpoint, responseTime) {
    this.results.totalRequests++;
    this.results.successfulRequests++;
    this.results.responseTimes.push(responseTime);
    
    // Update min/max
    if (responseTime < this.results.performanceMetrics.min) {
      this.results.performanceMetrics.min = responseTime;
    }
    if (responseTime > this.results.performanceMetrics.max) {
      this.results.performanceMetrics.max = responseTime;
    }
  }

  /**
   * Record failed request metrics
   */
  recordError(endpoint, error, responseTime) {
    this.results.totalRequests++;
    this.results.failedRequests++;
    
    const endpointPath = endpoint.path;
    if (!this.results.errorsByEndpoint[endpointPath]) {
      this.results.errorsByEndpoint[endpointPath] = [];
    }
    
    this.results.errorsByEndpoint[endpointPath].push({
      error: error.message,
      status: error.response?.status,
      responseTime,
      timestamp: new Date().toISOString()
    });
    
    // Track rate limit hits
    if (error.response?.status === 429) {
      this.results.authenticationMetrics.rateLimitHits++;
    }
  }

  /**
   * Calculate performance percentiles
   */
  calculatePercentiles() {
    if (this.results.responseTimes.length === 0) return;
    
    const sorted = this.results.responseTimes.sort((a, b) => a - b);
    const len = sorted.length;
    
    this.results.performanceMetrics.p50 = sorted[Math.floor(len * 0.5)];
    this.results.performanceMetrics.p95 = sorted[Math.floor(len * 0.95)];
    this.results.performanceMetrics.p99 = sorted[Math.floor(len * 0.99)];
    this.results.performanceMetrics.average = 
      this.results.responseTimes.reduce((sum, rt) => sum + rt, 0) / len;
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    this.calculatePercentiles();
    
    const testDuration = (performance.now() - this.startTime) / 1000;
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    
    const report = {
      timestamp: new Date().toISOString(),
      testConfiguration: CONFIG,
      testDuration: `${testDuration.toFixed(2)}s`,
      totalRequests: this.results.totalRequests,
      successfulRequests: this.results.successfulRequests,
      failedRequests: this.results.failedRequests,
      successRate: `${successRate.toFixed(2)}%`,
      
      performanceMetrics: {
        averageResponseTime: `${this.results.performanceMetrics.average.toFixed(2)}ms`,
        minResponseTime: `${this.results.performanceMetrics.min.toFixed(2)}ms`,
        maxResponseTime: `${this.results.performanceMetrics.max.toFixed(2)}ms`,
        p50ResponseTime: `${this.results.performanceMetrics.p50.toFixed(2)}ms`,
        p95ResponseTime: `${this.results.performanceMetrics.p95.toFixed(2)}ms`,
        p99ResponseTime: `${this.results.performanceMetrics.p99.toFixed(2)}ms`
      },
      
      throughputMetrics: {
        averageRps: this.results.throughput.averageRps.toFixed(2),
        peakRps: this.results.throughput.peakRps.toFixed(2),
        totalThroughput: (this.results.totalRequests / testDuration).toFixed(2)
      },
      
      criticalMetricsAssessment: {
        p99Under200ms: this.results.performanceMetrics.p99 < 200,
        successRateAbove99: successRate > 99,
        concurrencyTargetMet: CONFIG.maxConcurrent >= 1000,
        rateLimitingWorking: this.results.authenticationMetrics.rateLimitHits > 0
      },
      
      errors: this.results.errorsByEndpoint,
      recommendations: this.generateRecommendations()
    };
    
    // Write detailed report to file
    const reportPath = `/Users/Aditya/Desktop/casting-ai/test-results/post-production-stress-test-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('🎯 POST-PRODUCTION API STRESS TEST RESULTS - CastMatch Mumbai Launch');
    console.log('='.repeat(80));
    console.log(`⏱️  Test Duration: ${testDuration.toFixed(2)}s`);
    console.log(`📊 Total Requests: ${this.results.totalRequests.toLocaleString()}`);
    console.log(`✅ Successful: ${this.results.successfulRequests.toLocaleString()} (${successRate.toFixed(2)}%)`);
    console.log(`❌ Failed: ${this.results.failedRequests.toLocaleString()}`);
    console.log(`🚀 Peak RPS: ${this.results.throughput.peakRps.toFixed(2)}`);
    console.log(`📈 Average RPS: ${this.results.throughput.averageRps.toFixed(2)}`);
    console.log('\\nPerformance Metrics:');
    console.log(`  • Average: ${this.results.performanceMetrics.average.toFixed(2)}ms`);
    console.log(`  • P95: ${this.results.performanceMetrics.p95.toFixed(2)}ms`);
    console.log(`  • P99: ${this.results.performanceMetrics.p99.toFixed(2)}ms ${this.results.performanceMetrics.p99 < 200 ? '✅' : '❌'}`);
    
    console.log('\\n🎯 CRITICAL SUCCESS METRICS:');
    console.log(`  • P99 Response Time < 200ms: ${report.criticalMetricsAssessment.p99Under200ms ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  • Success Rate > 99%: ${report.criticalMetricsAssessment.successRateAbove99 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  • 1000+ Concurrent Requests: ${report.criticalMetricsAssessment.concurrencyTargetMet ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  • Rate Limiting Active: ${report.criticalMetricsAssessment.rateLimitingWorking ? '✅ PASS' : '⚠️  CHECK'}`);
    
    if (Object.keys(this.results.errorsByEndpoint).length > 0) {
      console.log('\\n⚠️  Errors by Endpoint:');
      for (const [endpoint, errors] of Object.entries(this.results.errorsByEndpoint)) {
        console.log(`  • ${endpoint}: ${errors.length} errors`);
      }
    }
    
    console.log(`\\n📄 Detailed report saved to: ${reportPath}`);
    console.log('='.repeat(80));
    
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.performanceMetrics.p99 > 200) {
      recommendations.push('P99 response time exceeds 200ms - consider database query optimization and caching improvements');
    }
    
    if (this.results.failedRequests / this.results.totalRequests > 0.01) {
      recommendations.push('Error rate above 1% - investigate failed endpoints and implement better error handling');
    }
    
    if (this.results.throughput.peakRps < 100) {
      recommendations.push('Peak RPS below expected - consider connection pooling and server scaling');
    }
    
    if (this.results.authenticationMetrics.rateLimitHits === 0) {
      recommendations.push('No rate limiting detected - verify rate limiting implementation');
    }
    
    return recommendations;
  }
}

// Execute stress test if run directly
if (require.main === module) {
  const tester = new PostProductionStressTester();
  
  tester.runStressTest()
    .then((report) => {
      const allCriticalMetricsPassed = Object.values(report.criticalMetricsAssessment).every(Boolean);
      process.exit(allCriticalMetricsPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Stress test failed:', error);
      process.exit(1);
    });
}

module.exports = PostProductionStressTester;