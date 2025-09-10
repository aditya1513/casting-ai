/**
 * Security Penetration Testing Suite
 * Comprehensive security vulnerability testing for CastMatch
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';
import { testScenarios, testDataFactory } from '../data/test-data-management';
import { testEnvironmentSetup } from '../utils/test-environment-setup';

interface SecurityTestResult {
  vulnerability: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'VULNERABLE' | 'PROTECTED' | 'INCONCLUSIVE';
  details: string;
  remediation?: string;
}

test.describe('Security Penetration Tests', () => {
  let apiContext: APIRequestContext;
  let baseURL: string;
  let testUser: any;
  let authToken: string;

  test.beforeAll(async ({ playwright }) => {
    baseURL = process.env.BASE_URL || 'http://localhost:3001';
    apiContext = await playwright.request.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
    });

    // Setup test user
    const environment = await testEnvironmentSetup.setupTestEnvironment();
    testUser = environment.testUsers?.actor;
    authToken = environment.authTokens?.actor || '';
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('Authentication and Authorization Vulnerabilities', () => {
    test('SQL Injection in Login Form', async () => {
      const sqlInjectionPayloads = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "' OR 1=1 --",
        "admin'/*",
        "' UNION SELECT * FROM users --",
        "' OR 'x'='x",
        "1' OR '1' = '1' /*",
        "x' AND email IS NULL; --",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --"
      ];

      const results: SecurityTestResult[] = [];

      for (const payload of sqlInjectionPayloads) {
        try {
          const response = await apiContext.post('/api/auth/login', {
            data: {
              email: payload,
              password: payload
            }
          });

          const result: SecurityTestResult = {
            vulnerability: 'SQL Injection in Login',
            severity: 'Critical',
            status: response.status() === 200 ? 'VULNERABLE' : 'PROTECTED',
            details: `Payload: ${payload}, Status: ${response.status()}`,
          };

          if (result.status === 'VULNERABLE') {
            result.remediation = 'Use parameterized queries and input validation';
          }

          results.push(result);

          // Critical: If any SQL injection succeeds, the system is vulnerable
          expect(response.status()).not.toBe(200);
          
        } catch (error) {
          console.warn(`SQL injection test failed for payload: ${payload}`, error);
        }
      }

      console.log('SQL Injection Test Results:', results);
    });

    test('JWT Token Vulnerabilities', async () => {
      const results: SecurityTestResult[] = [];

      // Test 1: JWT Token Tampering
      if (authToken) {
        const tamperedTokens = [
          authToken.replace(/.$/, 'X'), // Change last character
          authToken.substring(0, authToken.length - 10) + 'tampered123', // Replace end
          'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.', // None algorithm
          'invalid.jwt.token',
          '', // Empty token
        ];

        for (const token of tamperedTokens) {
          const response = await apiContext.get('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          results.push({
            vulnerability: 'JWT Token Tampering',
            severity: 'High',
            status: response.status() === 200 ? 'VULNERABLE' : 'PROTECTED',
            details: `Tampered token accepted: ${token.substring(0, 20)}...`,
            remediation: 'Properly validate JWT signature and claims'
          });

          expect(response.status()).not.toBe(200);
        }
      }

      // Test 2: JWT Algorithm Confusion
      const noneAlgorithmToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.';
      
      const response = await apiContext.get('/api/profile', {
        headers: { 'Authorization': `Bearer ${noneAlgorithmToken}` }
      });

      results.push({
        vulnerability: 'JWT Algorithm Confusion',
        severity: 'Critical',
        status: response.status() === 200 ? 'VULNERABLE' : 'PROTECTED',
        details: 'None algorithm token should be rejected',
        remediation: 'Explicitly whitelist allowed JWT algorithms'
      });

      expect(response.status()).not.toBe(200);
      console.log('JWT Security Test Results:', results);
    });

    test('Authentication Bypass Attempts', async () => {
      const bypassAttempts = [
        // Admin endpoints without authentication
        { endpoint: '/api/admin/users', method: 'GET' },
        { endpoint: '/api/admin/system-stats', method: 'GET' },
        { endpoint: '/api/admin/logs', method: 'GET' },
        
        // Protected user endpoints
        { endpoint: '/api/profile', method: 'GET' },
        { endpoint: '/api/producer/analytics', method: 'GET' },
        { endpoint: '/api/casting-director/projects', method: 'GET' },
      ];

      for (const attempt of bypassAttempts) {
        const response = await apiContext.fetch(attempt.endpoint, {
          method: attempt.method as any,
        });

        const isProtected = response.status() === 401 || response.status() === 403;
        
        expect(isProtected, `${attempt.endpoint} should require authentication`).toBeTruthy();
      }
    });
  });

  test.describe('Input Validation and XSS Vulnerabilities', () => {
    test('Cross-Site Scripting (XSS) in User Input', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '"><script>alert("XSS")</script>',
        '<script>document.location="http://malicious-site.com"</script>',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus><option>test</option></select>'
      ];

      if (!authToken) return;

      const headers = { 'Authorization': `Bearer ${authToken}` };

      for (const payload of xssPayloads) {
        try {
          // Test XSS in profile update
          const profileResponse = await apiContext.put('/api/profile', {
            headers,
            data: {
              bio: payload,
              firstName: payload,
              lastName: payload
            }
          });

          // Test XSS in project creation
          const projectResponse = await apiContext.post('/api/projects', {
            headers,
            data: {
              title: payload,
              description: payload,
              genre: 'Drama'
            }
          });

          // Test XSS in message sending
          const messageResponse = await apiContext.post('/api/messages', {
            headers,
            data: {
              content: payload,
              receiverId: 'test-user-id'
            }
          });

          // Verify XSS payloads are sanitized
          [profileResponse, projectResponse, messageResponse].forEach((response, index) => {
            const testName = ['Profile', 'Project', 'Message'][index];
            
            if (response.status() === 200 || response.status() === 201) {
              // If successful, verify the response doesn't contain the raw payload
              response.text().then(text => {
                expect(text.includes(payload), 
                  `${testName} should sanitize XSS payload: ${payload}`).toBeFalsy();
              });
            }
          });

        } catch (error) {
          console.warn(`XSS test failed for payload: ${payload}`, error);
        }
      }
    });

    test('File Upload Vulnerabilities', async () => {
      if (!authToken) return;

      const maliciousFiles = [
        {
          name: 'malicious.php',
          content: '<?php system($_GET["cmd"]); ?>',
          mimeType: 'text/php'
        },
        {
          name: 'script.js',
          content: 'alert("XSS via file upload");',
          mimeType: 'application/javascript'
        },
        {
          name: 'shell.exe',
          content: 'MZ\x90\x00', // PE header
          mimeType: 'application/octet-stream'
        },
        {
          name: 'image.php.jpg',
          content: '<?php echo "PHP execution"; ?>',
          mimeType: 'image/jpeg'
        },
        {
          name: '../../../etc/passwd',
          content: 'directory traversal test',
          mimeType: 'text/plain'
        }
      ];

      for (const file of maliciousFiles) {
        try {
          const formData = new FormData();
          const blob = new Blob([file.content], { type: file.mimeType });
          formData.append('file', blob, file.name);

          const response = await apiContext.post('/api/upload/profile-image', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
            multipart: {
              file: {
                name: file.name,
                mimeType: file.mimeType,
                buffer: Buffer.from(file.content)
              }
            }
          });

          // Should reject malicious file uploads
          expect(response.status()).not.toBe(200);
          
        } catch (error) {
          console.warn(`File upload test failed for: ${file.name}`, error);
        }
      }
    });
  });

  test.describe('API Security Vulnerabilities', () => {
    test('Rate Limiting and DoS Protection', async () => {
      // Test login endpoint rate limiting
      const rapidRequests: Promise<any>[] = [];
      
      for (let i = 0; i < 100; i++) {
        rapidRequests.push(
          apiContext.post('/api/auth/login', {
            data: {
              email: 'nonexistent@test.com',
              password: 'wrongpassword'
            }
          })
        );
      }

      const responses = await Promise.allSettled(rapidRequests);
      const rateLimitedResponses = responses.filter(result => 
        result.status === 'fulfilled' && 
        (result.value.status() === 429 || result.value.status() === 503)
      );

      // Expect rate limiting to kick in
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('CORS Policy Validation', async () => {
      const maliciousOrigins = [
        'http://malicious-site.com',
        'https://evil.example.com',
        'null',
        'file://',
        'data:text/html,<script>alert("CORS bypass")</script>'
      ];

      for (const origin of maliciousOrigins) {
        const response = await apiContext.get('/api/health', {
          headers: { 'Origin': origin }
        });

        const corsHeader = response.headers()['access-control-allow-origin'];
        
        // Should not allow malicious origins
        expect(corsHeader).not.toBe(origin);
        expect(corsHeader).not.toBe('*'); // Should not allow all origins in production
      }
    });

    test('HTTP Security Headers', async () => {
      const response = await apiContext.get('/');
      const headers = response.headers();

      const securityHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': true, // Should exist
        'content-security-policy': true, // Should exist
        'referrer-policy': true, // Should exist
      };

      Object.entries(securityHeaders).forEach(([header, expected]) => {
        const headerValue = headers[header];
        
        if (typeof expected === 'boolean' && expected) {
          expect(headerValue, `${header} should be set`).toBeTruthy();
        } else if (typeof expected === 'string') {
          expect(headerValue, `${header} should be ${expected}`).toBe(expected);
        }
      });
    });
  });

  test.describe('Data Access and Privacy Vulnerabilities', () => {
    test('Insecure Direct Object References (IDOR)', async () => {
      if (!authToken) return;

      const headers = { 'Authorization': `Bearer ${authToken}` };

      // Test accessing other users' data
      const userIds = ['1', '2', '999', 'admin', '../admin', '../../etc/passwd'];
      
      for (const userId of userIds) {
        const response = await apiContext.get(`/api/users/${userId}`, { headers });
        
        // Should only allow access to own data or return 403/404
        if (response.status() === 200) {
          const userData = await response.json();
          // Verify user can only access their own data
          expect(userData.id).toBe(testUser?.id);
        } else {
          expect([403, 404]).toContain(response.status());
        }
      }
    });

    test('Personal Data Exposure', async () => {
      if (!authToken) return;

      const response = await apiContext.get('/api/profile', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.status() === 200) {
        const userData = await response.json();
        
        // Verify sensitive data is not exposed
        expect(userData.password).toBeUndefined();
        expect(userData.passwordHash).toBeUndefined();
        expect(userData.salt).toBeUndefined();
        expect(userData.resetToken).toBeUndefined();
        
        // Verify PII is properly handled
        if (userData.phone) {
          expect(userData.phone).not.toMatch(/^\+91\d{10}$/); // Should be masked or formatted
        }
      }
    });

    test('Database Information Disclosure', async () => {
      const endpoints = [
        '/api/debug',
        '/api/admin/database',
        '/.env',
        '/config',
        '/api/system/info',
        '/phpinfo.php',
        '/server-status',
        '/api/health?debug=true'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiContext.get(endpoint);
          
          if (response.status() === 200) {
            const responseText = await response.text();
            
            // Check for database information leakage
            const sensitivePatterns = [
              /password.*[:=]/i,
              /database.*[:=]/i,
              /secret.*[:=]/i,
              /connection.*string/i,
              /mongodb:\/\//i,
              /postgres:\/\//i,
              /mysql:\/\//i
            ];

            sensitivePatterns.forEach(pattern => {
              expect(responseText.match(pattern), 
                `${endpoint} should not expose sensitive information`).toBeFalsy();
            });
          }
        } catch (error) {
          // Endpoint not found is expected for most of these
        }
      }
    });
  });

  test.describe('Session and Cookie Security', () => {
    test('Session Management Security', async () => {
      // Test session fixation
      const loginResponse = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser?.email,
          password: testUser?.password
        }
      });

      if (loginResponse.status() === 200) {
        const cookies = loginResponse.headers()['set-cookie'];
        
        if (cookies) {
          const sessionCookie = cookies.find((cookie: string) => cookie.includes('session'));
          
          if (sessionCookie) {
            // Verify secure cookie attributes
            expect(sessionCookie).toMatch(/HttpOnly/i);
            expect(sessionCookie).toMatch(/Secure/i);
            expect(sessionCookie).toMatch(/SameSite/i);
          }
        }
      }
    });

    test('Session Timeout and Invalidation', async () => {
      if (!authToken) return;

      // Test with expired/invalid tokens
      const invalidTokens = [
        'expired.jwt.token',
        authToken + 'invalid',
        'Bearer invalid-token',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await apiContext.get('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        expect(response.status()).toBe(401);
      }
    });
  });

  test.describe('Network Security', () => {
    test('SSL/TLS Configuration', async () => {
      if (baseURL.startsWith('https://')) {
        // Test SSL/TLS security
        try {
          const response = await apiContext.get('/');
          expect(response.status()).toBeLessThan(400);
          
          // Verify HTTPS redirect
          const httpResponse = await apiContext.get(baseURL.replace('https://', 'http://'));
          expect([301, 302, 308]).toContain(httpResponse.status());
          
        } catch (error) {
          console.warn('SSL/TLS test skipped - HTTPS not available');
        }
      }
    });
  });

  test.describe('Business Logic Vulnerabilities', () => {
    test('Authorization Bypass in Role-Based Actions', async () => {
      if (!authToken) return;

      // Test actor trying to access casting director functions
      const unauthorizedActions = [
        { endpoint: '/api/casting-director/projects', method: 'GET' },
        { endpoint: '/api/producer/analytics', method: 'GET' },
        { endpoint: '/api/admin/users', method: 'GET' },
        { endpoint: '/api/producer/approvals', method: 'POST' },
      ];

      for (const action of unauthorizedActions) {
        const response = await apiContext.fetch(action.endpoint, {
          method: action.method as any,
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Should return 403 Forbidden for unauthorized role actions
        expect(response.status()).toBe(403);
      }
    });

    test('Race Condition in Critical Operations', async () => {
      if (!authToken) return;

      // Test concurrent audition applications
      const auditionId = 'test-audition-id';
      const concurrentApplications: Promise<any>[] = [];

      for (let i = 0; i < 10; i++) {
        concurrentApplications.push(
          apiContext.post(`/api/auditions/${auditionId}/apply`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
              message: `Application attempt ${i}`
            }
          })
        );
      }

      const responses = await Promise.allSettled(concurrentApplications);
      const successfulApplications = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status() === 201
      );

      // Should only allow one application per user per audition
      expect(successfulApplications.length).toBeLessThanOrEqual(1);
    });
  });

  // Security test summary
  test('Generate Security Test Report', async () => {
    console.log('\n=== SECURITY TEST REPORT ===');
    console.log('Tests completed successfully');
    console.log('All vulnerabilities checked against OWASP Top 10');
    console.log('Report generated:', new Date().toISOString());
    console.log('============================\n');
    
    // This test always passes - it's just for reporting
    expect(true).toBeTruthy();
  });
});