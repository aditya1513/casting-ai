/**
 * Minimal Test Server for POST-PRODUCTION API Validation
 * CastMatch Mumbai Market Launch - January 13, 2025
 */

const express = require('express');
const cors = require('cors');
const { performance } = require('perf_hooks');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = performance.now();
  res.on('finish', () => {
    const duration = performance.now() - req.startTime;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration.toFixed(2)}ms`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'test',
    version: '1.0.0'
  });
});

// Talent endpoints (simulated)
app.get('/api/talents', (req, res) => {
  // Simulate database query delay
  setTimeout(() => {
    res.json({
      data: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Talent ${i + 1}`,
        skills: ['acting', 'dancing'],
        location: 'mumbai',
        experience: Math.floor(Math.random() * 10) + 1
      })),
      total: 1000,
      page: 1,
      limit: 50
    });
  }, Math.random() * 50); // 0-50ms delay
});

app.get('/api/talents/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id: parseInt(id),
    name: `Talent ${id}`,
    skills: ['acting', 'dancing'],
    location: 'mumbai',
    experience: Math.floor(Math.random() * 10) + 1,
    portfolio: {
      photos: ['photo1.jpg', 'photo2.jpg'],
      videos: ['video1.mp4']
    }
  });
});

// Search endpoint
app.get('/api/search/talents', (req, res) => {
  const { skills, location, experience } = req.query;
  
  // Simulate search delay
  setTimeout(() => {
    res.json({
      data: Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Search Result ${i + 1}`,
        skills: skills ? skills.split(',') : ['acting'],
        location: location || 'mumbai',
        experience: parseInt(experience) || Math.floor(Math.random() * 10) + 1,
        matchScore: 0.8 + Math.random() * 0.2
      })),
      total: 150,
      query: { skills, location, experience }
    });
  }, Math.random() * 100); // 0-100ms delay
});

// Projects endpoints
app.get('/api/projects', (req, res) => {
  setTimeout(() => {
    res.json({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Project ${i + 1}`,
        type: 'ott',
        location: 'mumbai',
        status: 'casting',
        budget: Math.floor(Math.random() * 1000000) + 100000,
        deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      })),
      total: 100
    });
  }, Math.random() * 75);
});

// Auditions endpoints
app.get('/api/auditions', (req, res) => {
  setTimeout(() => {
    res.json({
      data: Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        title: `Audition ${i + 1}`,
        project: `Project ${Math.floor(Math.random() * 20) + 1}`,
        location: 'mumbai',
        date: new Date(Date.now() + Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: ['open', 'closed', 'scheduled'][Math.floor(Math.random() * 3)],
        requirements: {
          age: [18, 35],
          skills: ['acting'],
          experience: Math.floor(Math.random() * 5) + 1
        }
      })),
      total: 200
    });
  }, Math.random() * 60);
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simulate auth processing
  setTimeout(() => {
    if (email && password) {
      res.json({
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: 1,
          email,
          role: 'talent',
          name: 'Test User'
        },
        expiresIn: '1h'
      });
    } else {
      res.status(400).json({ error: 'Invalid credentials' });
    }
  }, Math.random() * 200); // 0-200ms delay for auth
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  
  setTimeout(() => {
    res.status(201).json({
      message: 'User created successfully',
      user: { id: Date.now(), name, email, role: role || 'talent' }
    });
  }, Math.random() * 150);
});

// User profile endpoints
app.get('/api/me', (req, res) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  res.json({
    id: 1,
    name: 'Test User',
    email: 'test@castmatch.com',
    role: 'talent',
    profile: {
      skills: ['acting', 'dancing'],
      experience: 3,
      location: 'mumbai'
    }
  });
});

// Applications endpoints
app.get('/api/me/applications', (req, res) => {
  setTimeout(() => {
    res.json({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        audition: `Audition ${i + 1}`,
        project: `Project ${i + 1}`,
        status: ['pending', 'accepted', 'rejected'][Math.floor(Math.random() * 3)],
        appliedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }))
    });
  }, Math.random() * 80);
});

app.post('/api/applications', (req, res) => {
  const { auditionId } = req.body;
  
  setTimeout(() => {
    if (auditionId) {
      res.status(201).json({
        message: 'Application submitted successfully',
        applicationId: Date.now()
      });
    } else {
      res.status(400).json({ error: 'Audition ID required' });
    }
  }, Math.random() * 120);
});

// Rate limiting simulation
let requestCounts = new Map();

app.use('/api', (req, res, next) => {
  const clientId = req.ip || 'default';
  const currentTime = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 1, resetTime: currentTime + 60000 });
    return next();
  }
  
  const clientData = requestCounts.get(clientId);
  
  if (currentTime > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = currentTime + 60000;
  } else {
    clientData.count++;
    if (clientData.count > 1000) { // 1000 requests per minute limit
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientData.resetTime - currentTime) / 1000)
      });
    }
  }
  
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Performance monitoring
let requestStats = {
  totalRequests: 0,
  responseTimes: [],
  errorCount: 0
};

app.use((req, res, next) => {
  requestStats.totalRequests++;
  
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = performance.now() - req.startTime;
    requestStats.responseTimes.push(responseTime);
    
    if (res.statusCode >= 400) {
      requestStats.errorCount++;
    }
    
    // Keep only last 1000 response times for memory efficiency
    if (requestStats.responseTimes.length > 1000) {
      requestStats.responseTimes = requestStats.responseTimes.slice(-1000);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const sortedTimes = [...requestStats.responseTimes].sort((a, b) => a - b);
  const len = sortedTimes.length;
  
  if (len === 0) {
    return res.json({
      totalRequests: requestStats.totalRequests,
      errorCount: requestStats.errorCount,
      message: 'No response time data available'
    });
  }
  
  res.json({
    totalRequests: requestStats.totalRequests,
    errorCount: requestStats.errorCount,
    errorRate: ((requestStats.errorCount / requestStats.totalRequests) * 100).toFixed(2),
    responseTimeStats: {
      min: sortedTimes[0]?.toFixed(2) || 0,
      max: sortedTimes[len - 1]?.toFixed(2) || 0,
      avg: (sortedTimes.reduce((sum, time) => sum + time, 0) / len).toFixed(2),
      p50: sortedTimes[Math.floor(len * 0.5)]?.toFixed(2) || 0,
      p95: sortedTimes[Math.floor(len * 0.95)]?.toFixed(2) || 0,
      p99: sortedTimes[Math.floor(len * 0.99)]?.toFixed(2) || 0
    },
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`
🚀 MINIMAL TEST SERVER FOR POST-PRODUCTION VALIDATION
=====================================================
Port: ${port}
API URL: http://localhost:${port}/api
Health Check: http://localhost:${port}/api/health
Metrics: http://localhost:${port}/api/metrics
=====================================================

Available Endpoints:
- GET  /api/health
- GET  /api/talents
- GET  /api/talents/:id  
- GET  /api/search/talents
- GET  /api/projects
- GET  /api/auditions
- POST /api/auth/login
- POST /api/auth/register
- GET  /api/me
- GET  /api/me/applications
- POST /api/applications
- GET  /api/metrics

Ready for POST-PRODUCTION stress testing...
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;