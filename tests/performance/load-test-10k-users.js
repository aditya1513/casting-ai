/**
 * Load Testing Configuration for 10,000+ Concurrent Users
 * High-performance load testing using k6 for CastMatch production readiness
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const wsConnections = new Counter('ws_connections');
const apiCalls = new Counter('api_calls');
const userRegistrations = new Counter('user_registrations');
const auditionApplications = new Counter('audition_applications');

// Test configuration
export const options = {
  scenarios: {
    // Ramp-up scenario: Gradually increase to 10,000 users
    ramp_up_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users in 2 minutes
        { duration: '3m', target: 500 },   // Ramp up to 500 users in 3 minutes
        { duration: '5m', target: 2000 },  // Ramp up to 2000 users in 5 minutes
        { duration: '5m', target: 5000 },  // Ramp up to 5000 users in 5 minutes
        { duration: '10m', target: 10000 }, // Ramp up to 10000 users in 10 minutes
        { duration: '15m', target: 10000 }, // Stay at 10000 users for 15 minutes
        { duration: '5m', target: 5000 },  // Ramp down to 5000 users
        { duration: '5m', target: 0 },     // Ramp down to 0 users
      ],
    },

    // Spike testing: Sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startTime: '30m', // Start after ramp-up test
      stages: [
        { duration: '1m', target: 1000 },  // Normal traffic
        { duration: '30s', target: 15000 }, // Sudden spike to 15k users
        { duration: '2m', target: 15000 },  // Sustain spike
        { duration: '1m', target: 1000 },   // Return to normal
        { duration: '1m', target: 0 },      // Ramp down
      ],
    },

    // Soak testing: Extended duration with constant load
    soak_test: {
      executor: 'constant-vus',
      vus: 2000,
      duration: '1h',
      startTime: '40m', // Start after spike test
    },

    // WebSocket connections testing
    websocket_test: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30m',
      exec: 'websocket_scenario',
    },

    // API stress testing
    api_stress_test: {
      executor: 'ramping-vus',
      startTime: '10m',
      stages: [
        { duration: '5m', target: 3000 },
        { duration: '10m', target: 3000 },
        { duration: '5m', target: 0 },
      ],
      exec: 'api_stress_scenario',
    },
  },

  // Performance thresholds
  thresholds: {
    errors: ['rate<0.1'], // Error rate should be less than 10%
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 2s
    http_req_failed: ['rate<0.05'], // Failed requests should be less than 5%
    'http_req_duration{scenario:ramp_up_users}': ['p(99)<5000'], // 99% within 5s
    ws_connecting: ['p(95)<1000'], // WebSocket connections within 1s
    'group_duration{group:::API Operations}': ['avg<1500'], // API operations avg < 1.5s
    'group_duration{group:::User Journey}': ['avg<3000'], // User journey avg < 3s
  },

  // Global test options
  userAgent: 'CastMatch-LoadTest/1.0',
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  noVUConnectionReuse: false,
  batchPerHost: 20,
  discardResponseBodies: false,
};

// Base configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';

// Test data pools
const testUsers = generateTestUsers(1000);
const testProjects = generateTestProjects(100);
const testAuditions = generateTestAuditions(500);

// Default scenario: Complete user journey simulation
export default function () {
  const userType = randomItem(['actor', 'casting_director', 'producer']);
  const user = getRandomUser(userType);

  group('User Journey', () => {
    switch (userType) {
      case 'actor':
        actorJourney(user);
        break;
      case 'casting_director':
        castingDirectorJourney(user);
        break;
      case 'producer':
        producerJourney(user);
        break;
    }
  });

  sleep(randomIntBetween(1, 5)); // Think time between requests
}

// WebSocket testing scenario
export function websocket_scenario() {
  group('WebSocket Chat', () => {
    const user = getRandomUser('actor');
    const token = authenticateUser(user);

    if (token) {
      const wsUrl = `${WS_URL}/socket.io/?token=${token}&EIO=4&transport=websocket`;
      
      const response = ws.connect(wsUrl, {
        timeout: '10s',
      }, function (socket) {
        wsConnections.add(1);

        socket.on('open', () => {
          console.log('WebSocket connected');
          
          // Join chat room
          socket.send(JSON.stringify({
            event: 'join_room',
            data: { roomId: 'audition_' + randomIntBetween(1, 100) }
          }));
        });

        socket.on('message', (data) => {
          check(data, {
            'WebSocket message received': (data) => data !== undefined,
          });
        });

        // Send messages periodically
        socket.setInterval(() => {
          socket.send(JSON.stringify({
            event: 'message',
            data: {
              text: `Test message ${randomString(10)}`,
              timestamp: Date.now()
            }
          }));
        }, randomIntBetween(5000, 15000));

        sleep(randomIntBetween(30, 120)); // Keep connection alive
      });

      check(response, {
        'WebSocket connection established': (r) => r && r.status === 101,
      });
    }
  });
}

// API stress testing scenario
export function api_stress_scenario() {
  group('API Stress Test', () => {
    const user = getRandomUser('casting_director');
    const token = authenticateUser(user);

    if (token) {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Parallel API calls to stress the system
      const requests = [
        ['GET', `${BASE_URL}/api/projects`, null, headers],
        ['GET', `${BASE_URL}/api/auditions`, null, headers],
        ['GET', `${BASE_URL}/api/talent/search?query=actor`, null, headers],
        ['GET', `${BASE_URL}/api/applications`, null, headers],
        ['POST', `${BASE_URL}/api/analytics/metrics`, JSON.stringify({
          timeRange: '7d',
          metrics: ['applications', 'views', 'shortlists']
        }), headers],
      ];

      const responses = http.batch(requests);
      
      responses.forEach((response, index) => {
        apiCalls.add(1);
        check(response, {
          [`API call ${index + 1} successful`]: (r) => r.status >= 200 && r.status < 300,
          [`API call ${index + 1} fast enough`]: (r) => r.timings.duration < 3000,
        });
      });
    }
  });
}

// Actor user journey simulation
function actorJourney(user) {
  let token = null;

  group('Actor Registration/Login', () => {
    const isNewUser = Math.random() < 0.3; // 30% new users, 70% existing

    if (isNewUser) {
      // Register new user
      const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'actor',
        profile: user.profile
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

      const registerSuccess = check(registerResponse, {
        'Actor registration successful': (r) => r.status === 201 || r.status === 409,
        'Registration response time < 3s': (r) => r.timings.duration < 3000,
      });

      if (registerSuccess) {
        userRegistrations.add(1);
      } else {
        errorRate.add(1);
      }
    }

    // Login
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    const loginSuccess = check(loginResponse, {
      'Actor login successful': (r) => r.status === 200,
      'Login response time < 2s': (r) => r.timings.duration < 2000,
    });

    if (loginSuccess) {
      token = JSON.parse(loginResponse.body).token || JSON.parse(loginResponse.body).accessToken;
    } else {
      errorRate.add(1);
      return; // Exit if login failed
    }
  });

  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  group('Actor Profile Management', () => {
    // View profile
    const profileResponse = http.get(`${BASE_URL}/api/profile`, { headers });
    check(profileResponse, {
      'Profile fetch successful': (r) => r.status === 200,
      'Profile response time < 1s': (r) => r.timings.duration < 1000,
    });

    // Update profile (30% of users)
    if (Math.random() < 0.3) {
      const updateData = {
        bio: `Updated bio ${randomString(50)}`,
        skills: user.profile.skills.concat([randomItem(['Dancing', 'Singing', 'Acting'])]),
      };

      const updateResponse = http.put(`${BASE_URL}/api/profile`, JSON.stringify(updateData), { headers });
      check(updateResponse, {
        'Profile update successful': (r) => r.status === 200,
        'Profile update response time < 2s': (r) => r.timings.duration < 2000,
      });
    }
  });

  group('Audition Search and Application', () => {
    // Search auditions
    const searchParams = new URLSearchParams({
      location: 'Mumbai',
      genre: randomItem(['Drama', 'Comedy', 'Action', 'Romance']),
      page: '1',
      limit: '20'
    });

    const searchResponse = http.get(`${BASE_URL}/api/auditions?${searchParams}`, { headers });
    const searchSuccess = check(searchResponse, {
      'Audition search successful': (r) => r.status === 200,
      'Search response time < 2s': (r) => r.timings.duration < 2000,
    });

    if (searchSuccess) {
      const auditions = JSON.parse(searchResponse.body).auditions || [];
      
      if (auditions.length > 0) {
        // Apply to random audition (50% chance)
        if (Math.random() < 0.5) {
          const audition = randomItem(auditions);
          const applicationData = {
            auditionId: audition.id,
            message: `I'm very interested in this ${audition.title} role. ${randomString(100)}`,
            availability: 'flexible'
          };

          const applicationResponse = http.post(`${BASE_URL}/api/auditions/${audition.id}/apply`, 
            JSON.stringify(applicationData), { headers });
          
          const applicationSuccess = check(applicationResponse, {
            'Audition application successful': (r) => r.status === 201 || r.status === 409, // 409 if already applied
            'Application response time < 3s': (r) => r.timings.duration < 3000,
          });

          if (applicationSuccess) {
            auditionApplications.add(1);
          }
        }
      }
    }
  });

  group('Actor Dashboard', () => {
    // Get dashboard data
    const dashboardResponse = http.get(`${BASE_URL}/api/actor/dashboard`, { headers });
    check(dashboardResponse, {
      'Dashboard load successful': (r) => r.status === 200,
      'Dashboard response time < 2s': (r) => r.timings.duration < 2000,
    });

    // Get applications status
    const applicationsResponse = http.get(`${BASE_URL}/api/actor/applications`, { headers });
    check(applicationsResponse, {
      'Applications fetch successful': (r) => r.status === 200,
      'Applications response time < 1.5s': (r) => r.timings.duration < 1500,
    });
  });
}

// Casting Director user journey simulation
function castingDirectorJourney(user) {
  const token = authenticateUser(user);
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  group('Casting Director Operations', () => {
    // Create project (20% of users)
    if (Math.random() < 0.2) {
      const project = randomItem(testProjects);
      const projectResponse = http.post(`${BASE_URL}/api/projects`, JSON.stringify(project), { headers });
      check(projectResponse, {
        'Project creation successful': (r) => r.status === 201,
        'Project creation response time < 3s': (r) => r.timings.duration < 3000,
      });
    }

    // AI talent search
    const searchQuery = randomItem([
      'experienced dramatic actor',
      'young comedy performer',
      'action specialist with martial arts',
      'classical dancer with acting skills'
    ]);

    const aiSearchResponse = http.post(`${BASE_URL}/api/ai/talent-search`, JSON.stringify({
      query: searchQuery,
      filters: {
        location: 'Mumbai',
        experience: randomItem(['0-2', '3-5', '5-10', '10+']),
        ageRange: randomItem(['18-25', '26-35', '36-45', '45+'])
      }
    }), { headers });

    check(aiSearchResponse, {
      'AI talent search successful': (r) => r.status === 200,
      'AI search response time < 5s': (r) => r.timings.duration < 5000,
    });

    // Review applications
    const applicationsResponse = http.get(`${BASE_URL}/api/casting-director/applications`, { headers });
    check(applicationsResponse, {
      'Applications review successful': (r) => r.status === 200,
      'Applications response time < 2s': (r) => r.timings.duration < 2000,
    });
  });
}

// Producer user journey simulation
function producerJourney(user) {
  const token = authenticateUser(user);
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  group('Producer Operations', () => {
    // View analytics dashboard
    const analyticsResponse = http.get(`${BASE_URL}/api/producer/analytics`, { headers });
    check(analyticsResponse, {
      'Analytics dashboard successful': (r) => r.status === 200,
      'Analytics response time < 3s': (r) => r.timings.duration < 3000,
    });

    // Review pending approvals
    const approvalsResponse = http.get(`${BASE_URL}/api/producer/approvals`, { headers });
    check(approvalsResponse, {
      'Approvals fetch successful': (r) => r.status === 200,
      'Approvals response time < 2s': (r) => r.timings.duration < 2000,
    });

    // Generate report (10% of users)
    if (Math.random() < 0.1) {
      const reportRequest = {
        type: randomItem(['casting-summary', 'budget-analysis', 'talent-metrics']),
        dateRange: randomItem(['7d', '30d', '90d']),
        format: 'pdf'
      };

      const reportResponse = http.post(`${BASE_URL}/api/producer/reports`, JSON.stringify(reportRequest), { headers });
      check(reportResponse, {
        'Report generation successful': (r) => r.status === 200 || r.status === 202,
        'Report response time < 10s': (r) => r.timings.duration < 10000,
      });
    }
  });
}

// Helper functions
function authenticateUser(user) {
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return body.token || body.accessToken;
  }
  
  errorRate.add(1);
  return null;
}

function getRandomUser(role) {
  return testUsers.find(user => user.role === role) || testUsers[0];
}

function generateTestUsers(count) {
  const users = [];
  const roles = ['actor', 'casting_director', 'producer'];
  const firstNames = ['Aarav', 'Aditi', 'Arjun', 'Ananya', 'Ishaan', 'Kavya', 'Rohan', 'Priya'];
  const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Jain', 'Shah', 'Mehta'];

  for (let i = 0; i < count; i++) {
    const role = roles[i % roles.length];
    users.push({
      id: `test-user-${i}`,
      email: `loadtest${i}@castmatch.test`,
      password: 'TestPassword123!',
      firstName: randomItem(firstNames),
      lastName: randomItem(lastNames),
      role: role,
      profile: generateUserProfile(role)
    });
  }

  return users;
}

function generateUserProfile(role) {
  const baseProfile = {
    phone: `+91${randomIntBetween(7000000000, 9999999999)}`,
    location: randomItem(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune']),
    bio: `${role} with ${randomIntBetween(1, 20)} years experience`,
  };

  if (role === 'actor') {
    return {
      ...baseProfile,
      height: `${randomIntBetween(150, 200)} cm`,
      age: randomIntBetween(18, 65),
      skills: ['Acting', 'Dancing', 'Singing'].slice(0, randomIntBetween(1, 3)),
      languages: ['Hindi', 'English', 'Marathi'].slice(0, randomIntBetween(1, 3)),
    };
  }

  return baseProfile;
}

function generateTestProjects(count) {
  const projects = [];
  const titles = ['The Mumbai Chronicles', 'Digital Dreams', 'City of Lights', 'Modern Love Stories'];
  const genres = ['Drama', 'Comedy', 'Thriller', 'Romance', 'Action'];

  for (let i = 0; i < count; i++) {
    projects.push({
      title: `${randomItem(titles)} - Season ${randomIntBetween(1, 3)}`,
      description: `A compelling ${randomItem(genres).toLowerCase()} series set in Mumbai`,
      genre: randomItem(genres),
      budget: randomIntBetween(1000000, 50000000),
      status: randomItem(['development', 'pre_production', 'production'])
    });
  }

  return projects;
}

function generateTestAuditions(count) {
  const auditions = [];
  const roles = ['Lead Actor', 'Supporting Actor', 'Character Artist', 'Background Artist'];

  for (let i = 0; i < count; i++) {
    auditions.push({
      id: `audition-${i}`,
      title: `Audition for ${randomItem(roles)}`,
      description: `Seeking talented individuals for ${randomItem(roles).toLowerCase()} role`,
      requirements: ['Mumbai based', 'Age 25-35', 'Previous experience'],
      location: randomItem(['Andheri', 'Bandra', 'Goregaon', 'Malad']),
      status: 'scheduled'
    });
  }

  return auditions;
}