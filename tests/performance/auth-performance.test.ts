/**
 * Authentication Performance Tests
 * Load testing for authentication endpoints and dashboard performance
 */

import { performance } from 'perf_hooks';
import request from 'supertest';
import { Worker } from 'worker_threads';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { createMockUser, createBatchMockUsers } from '../factories/user.factory';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

describe('Authentication Performance Tests', () => {
  let prisma: PrismaClient;
  const performanceBaselines = {
    login: { maxResponseTime: 500, minThroughput: 100 },
    register: { maxResponseTime: 800, minThroughput: 50 },
    dashboard: { maxResponseTime: 300, minThroughput: 200 },
    profileSearch: { maxResponseTime: 400, minThroughput: 150 }
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test'
        }
      }
    });

    // Populate test database with users for realistic performance testing
    const testUsers = createBatchMockUsers(1000, 'ACTOR');
    await prisma.user.createMany({
      data: testUsers
    });

    console.log('✅ Performance test database prepared with 1000 users');
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$executeRaw`TRUNCATE TABLE "User", "UserProfile", "Session" CASCADE`;
    await prisma.$disconnect();
  });

  describe('Authentication Endpoint Performance', () => {
    it('should handle login requests within performance baseline', async () => {
      const testUser = createMockUser({
        email: 'perf.test@castmatch.ai'
      });

      // Create user for testing
      await prisma.user.create({
        data: testUser
      });

      const results = await runLoadTest({
        endpoint: '/api/auth/login',
        method: 'POST',
        payload: {
          email: testUser.email,
          password: 'TestPassword123!'
        },
        concurrency: 50,
        duration: 30000, // 30 seconds
        rampUpTime: 5000 // 5 seconds
      });

      console.log('Login Performance Results:', results);

      // Assertions
      expect(results.averageResponseTime).toBeLessThan(performanceBaselines.login.maxResponseTime);
      expect(results.requestsPerSecond).toBeGreaterThan(performanceBaselines.login.minThroughput);
      expect(results.failedRequests / results.totalRequests).toBeLessThan(0.01); // < 1% error rate
    });

    it('should handle registration burst load', async () => {
      const results = await runLoadTest({
        endpoint: '/api/auth/register',
        method: 'POST',
        payload: () => {
          const uniqueEmail = `load.test.${Date.now()}.${Math.random()}@castmatch.ai`;
          return {
            email: uniqueEmail,
            password: 'TestPassword123!',
            firstName: 'Load',
            lastName: 'Test',
            role: 'ACTOR'
          };
        },
        concurrency: 25,
        duration: 20000,
        rampUpTime: 3000
      });

      console.log('Registration Performance Results:', results);

      expect(results.averageResponseTime).toBeLessThan(performanceBaselines.register.maxResponseTime);
      expect(results.requestsPerSecond).toBeGreaterThan(performanceBaselines.register.minThroughput);
      expect(results.failedRequests / results.totalRequests).toBeLessThan(0.02); // < 2% error rate for registration
    });

    it('should handle concurrent token refresh requests', async () => {
      const user = await prisma.user.create({
        data: createMockUser()
      });

      // Generate initial tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'TestPassword123!'
        });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      const results = await runLoadTest({
        endpoint: '/api/auth/refresh-token',
        method: 'POST',
        payload: {
          refreshToken
        },
        concurrency: 20,
        duration: 15000,
        rampUpTime: 2000
      });

      console.log('Token Refresh Performance Results:', results);

      expect(results.averageResponseTime).toBeLessThan(200); // Should be very fast
      expect(results.requestsPerSecond).toBeGreaterThan(200);
    });

    it('should maintain performance under brute force simulation', async () => {
      const user = await prisma.user.create({
        data: createMockUser({
          email: 'brute.force.test@castmatch.ai'
        })
      });

      const startTime = performance.now();
      const responses = [];

      // Simulate brute force attack
      for (let i = 0; i < 100; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'WrongPassword' + i
          });
        
        responses.push({
          status: response.status,
          responseTime: performance.now() - startTime
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Check that rate limiting kicks in
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(90); // Most should be rate limited

      // Check that responses are still reasonably fast even with rate limiting
      const averageResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      expect(averageResponseTime).toBeLessThan(100); // Should respond quickly even when blocking
    });
  });

  describe('Dashboard Performance Tests', () => {
    it('should load dashboard within performance baseline', async () => {
      // Create authenticated user
      const user = await prisma.user.create({
        data: {
          ...createMockUser(),
          profile: {
            create: {
              firstName: 'Dashboard',
              lastName: 'Test',
              bio: 'Performance test user',
              completionScore: 85
            }
          }
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'TestPassword123!'
        });

      const authToken = loginResponse.body.data.tokens.accessToken;

      const results = await runLoadTest({
        endpoint: '/api/dashboard',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        concurrency: 100,
        duration: 30000,
        rampUpTime: 5000
      });

      console.log('Dashboard Performance Results:', results);

      expect(results.averageResponseTime).toBeLessThan(performanceBaselines.dashboard.maxResponseTime);
      expect(results.requestsPerSecond).toBeGreaterThan(performanceBaselines.dashboard.minThroughput);
    });

    it('should handle profile search with large dataset', async () => {
      // Ensure we have enough data for meaningful search
      const additionalUsers = createBatchMockUsers(500, 'ACTOR');
      await prisma.user.createMany({
        data: additionalUsers.map(user => ({
          ...user,
          profile: {
            create: {
              firstName: 'Search',
              lastName: 'Test',
              bio: 'Actor with various skills',
              skills: ['Acting', 'Dancing', 'Singing'],
              location: 'Mumbai, Maharashtra'
            }
          }
        }))
      });

      const castingDirector = await prisma.user.create({
        data: createMockUser({
          role: 'CASTING_DIRECTOR'
        })
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: castingDirector.email,
          password: 'TestPassword123!'
        });

      const authToken = loginResponse.body.data.tokens.accessToken;

      const searchQueries = [
        'Mumbai actor',
        'dancing skills',
        'experienced performer',
        'Hindi speaking actor',
        'theatre background'
      ];

      const results = await runLoadTest({
        endpoint: '/api/profiles/search',
        method: 'GET',
        query: () => {
          const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
          return {
            q: randomQuery,
            skills: 'Acting',
            location: 'Mumbai',
            page: 1,
            limit: 20
          };
        },
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        concurrency: 75,
        duration: 45000,
        rampUpTime: 10000
      });

      console.log('Profile Search Performance Results:', results);

      expect(results.averageResponseTime).toBeLessThan(performanceBaselines.profileSearch.maxResponseTime);
      expect(results.requestsPerSecond).toBeGreaterThan(performanceBaselines.profileSearch.minThroughput);
    });
  });

  describe('Database Performance Under Load', () => {
    it('should maintain database performance with concurrent operations', async () => {
      const startTime = performance.now();
      
      // Simulate concurrent database operations
      const operations = await Promise.allSettled([
        // User registrations
        ...Array(50).fill(0).map(() => 
          prisma.user.create({
            data: createMockUser({
              email: `concurrent.${Date.now()}.${Math.random()}@test.com`
            })
          })
        ),
        
        // Profile updates
        ...Array(30).fill(0).map(async () => {
          const user = await prisma.user.findFirst();
          if (user) {
            return prisma.userProfile.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                firstName: 'Updated',
                lastName: 'User',
                bio: 'Concurrent update test'
              },
              update: {
                bio: `Updated at ${Date.now()}`
              }
            });
          }
        }),
        
        // Search operations
        ...Array(20).fill(0).map(() =>
          prisma.user.findMany({
            where: {
              role: 'ACTOR',
              profile: {
                skills: {
                  hasSome: ['Acting']
                }
              }
            },
            take: 10
          })
        )
      ]);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulOperations = operations.filter(op => op.status === 'fulfilled').length;
      const failedOperations = operations.filter(op => op.status === 'rejected').length;

      console.log(`Database concurrency test: ${successfulOperations} success, ${failedOperations} failed in ${totalTime}ms`);

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds
      
      // Should have high success rate
      expect(successfulOperations / operations.length).toBeGreaterThan(0.95); // 95% success rate
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      const connectionPromises = [];
      
      // Create more connections than the pool size (default ~10)
      for (let i = 0; i < 50; i++) {
        connectionPromises.push(
          prisma.user.count()
        );
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(connectionPromises);
      const endTime = performance.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Connection pool test: ${successful} success, ${failed} failed in ${endTime - startTime}ms`);

      // Should not fail catastrophically
      expect(successful).toBeGreaterThan(40); // At least 80% should succeed
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const response = await request(app)
          .get('/api/health')
          .expect(200);
        
        // Force garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)} MB`);

      // Should not grow excessively
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
    });

    it('should handle file upload performance', async () => {
      const user = await prisma.user.create({
        data: createMockUser()
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'TestPassword123!'
        });

      const authToken = loginResponse.body.data.tokens.accessToken;

      // Test concurrent file uploads
      const uploadPromises = Array(10).fill(0).map(async () => {
        const startTime = performance.now();
        
        const response = await request(app)
          .post('/api/profile/avatar')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('avatar', Buffer.from('fake-image-data'), 'test.jpg');
        
        const endTime = performance.now();
        
        return {
          success: response.status === 200,
          responseTime: endTime - startTime
        };
      });

      const results = await Promise.all(uploadPromises);
      const averageTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const successCount = results.filter(r => r.success).length;

      console.log(`File upload performance: ${averageTime.toFixed(2)}ms average, ${successCount}/10 successful`);

      expect(averageTime).toBeLessThan(2000); // Less than 2 seconds
      expect(successCount).toBeGreaterThanOrEqual(8); // At least 80% success
    });
  });

  // Helper function to run load tests
  async function runLoadTest(config: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    payload?: any | (() => any);
    query?: any | (() => any);
    headers?: any;
    concurrency: number;
    duration: number;
    rampUpTime: number;
  }): Promise<LoadTestResult> {
    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];
    const startTime = Date.now();
    const workers: Promise<any>[] = [];

    // Ramp up workers gradually
    const workerDelay = config.rampUpTime / config.concurrency;

    for (let i = 0; i < config.concurrency; i++) {
      const workerPromise = new Promise(async (resolve) => {
        // Wait for ramp-up
        await new Promise(r => setTimeout(r, i * workerDelay));

        const workerStartTime = Date.now();
        
        while (Date.now() - startTime < config.duration) {
          const requestStartTime = performance.now();
          
          try {
            const payload = typeof config.payload === 'function' ? config.payload() : config.payload;
            const query = typeof config.query === 'function' ? config.query() : config.query;
            
            let requestBuilder = request(app)[config.method.toLowerCase()](config.endpoint);
            
            if (config.headers) {
              Object.entries(config.headers).forEach(([key, value]) => {
                requestBuilder = requestBuilder.set(key, value);
              });
            }
            
            if (query) {
              requestBuilder = requestBuilder.query(query);
            }
            
            if (payload) {
              requestBuilder = requestBuilder.send(payload);
            }

            const response = await requestBuilder;
            
            results.push({
              success: response.status >= 200 && response.status < 400,
              responseTime: performance.now() - requestStartTime
            });
          } catch (error) {
            results.push({
              success: false,
              responseTime: performance.now() - requestStartTime,
              error: error.message
            });
          }

          // Small delay to prevent overwhelming
          await new Promise(r => setTimeout(r, 10));
        }
        
        resolve(null);
      });
      
      workers.push(workerPromise);
    }

    await Promise.all(workers);

    // Calculate metrics
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const requestsPerSecond = results.length / (config.duration / 1000);
    const errors = results.filter(r => r.error).map(r => r.error);

    return {
      endpoint: config.endpoint,
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      requestsPerSecond,
      errors
    };
  }
});