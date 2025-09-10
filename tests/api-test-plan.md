# CastMatch API Testing & Validation Plan

## Current Status
- ✅ Server running on http://localhost:5002/api
- ✅ Redis connected
- ⚠️  Database connectivity issue (PostgreSQL permissions)
- ✅ Basic health endpoints functional

## Phase 1: Non-Database Dependent Endpoints

### Health Check Endpoints
- [ ] GET /api/health - Basic health check
- [ ] GET /api/health/ready - Readiness probe (may fail due to database)
- [ ] GET /api/health/live - Liveness probe

### Pinecone Health Endpoint
- [ ] GET /api/pinecone/health - AI service health check

## Phase 2: Authentication API Testing (Database Dependent)

### Registration Endpoint (/api/auth/register)
**Required Fields:**
```json
{
  "email": "test@example.com",
  "password": "TestPass123!",
  "confirmPassword": "TestPass123!",
  "firstName": "Test",
  "lastName": "User",
  "role": "ACTOR",
  "acceptTerms": true
}
```

**Test Cases:**
- [ ] Valid registration with all required fields
- [ ] Invalid email format
- [ ] Password complexity validation
- [ ] Password confirmation mismatch
- [ ] Missing required fields
- [ ] Role validation (ACTOR, CASTING_DIRECTOR, PRODUCER)
- [ ] Terms acceptance validation
- [ ] Rate limiting on registration endpoint

### Login Endpoint (/api/auth/login)
**Required Fields:**
```json
{
  "email": "test@example.com",
  "password": "TestPass123!",
  "rememberMe": false
}
```

**Test Cases:**
- [ ] Valid login credentials
- [ ] Invalid email format
- [ ] Wrong password
- [ ] Non-existent user
- [ ] Rate limiting on login endpoint

### Token Management
- [ ] POST /api/auth/refresh - Refresh token functionality
- [ ] POST /api/auth/logout - Logout functionality
- [ ] GET /api/auth/me - Current user retrieval

### Password Management
- [ ] POST /api/auth/forgot-password - Password reset request
- [ ] POST /api/auth/reset-password - Password reset with token
- [ ] POST /api/auth/change-password - Change password for authenticated user
- [ ] POST /api/auth/verify-email - Email verification

## Phase 3: Core API Endpoints

### User Management
- [ ] GET /api/users - List users (with pagination)
- [ ] GET /api/users/:id - Get specific user
- [ ] PUT /api/users/:id - Update user
- [ ] DELETE /api/users/:id - Delete user

### Actor Management
- [ ] GET /api/actors - List actors
- [ ] GET /api/actors/:id - Get specific actor
- [ ] POST /api/actors - Create actor profile
- [ ] PUT /api/actors/:id - Update actor profile

### Project Management
- [ ] GET /api/projects - List projects
- [ ] GET /api/projects/:id - Get specific project
- [ ] POST /api/projects - Create project
- [ ] PUT /api/projects/:id - Update project

### Application Management
- [ ] GET /api/applications - List applications
- [ ] POST /api/applications - Submit application
- [ ] GET /api/applications/:id - Get specific application
- [ ] PUT /api/applications/:id - Update application status

### Audition Management
- [ ] GET /api/auditions - List auditions
- [ ] POST /api/auditions - Schedule audition
- [ ] GET /api/auditions/:id - Get specific audition
- [ ] PUT /api/auditions/:id - Update audition

## Phase 4: Security & Performance Testing

### Security Tests
- [ ] Authentication middleware validation
- [ ] Authorization checks on protected endpoints
- [ ] Input sanitization validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting effectiveness

### Performance Tests
- [ ] Endpoint response times
- [ ] Concurrent request handling
- [ ] Memory usage under load
- [ ] Database query performance
- [ ] Redis caching effectiveness

## Phase 5: Error Handling & Edge Cases

### Error Response Testing
- [ ] 400 Bad Request responses
- [ ] 401 Unauthorized responses
- [ ] 403 Forbidden responses
- [ ] 404 Not Found responses
- [ ] 422 Validation Error responses
- [ ] 500 Internal Server Error handling

### Edge Cases
- [ ] Large payload handling
- [ ] Malformed JSON requests
- [ ] Missing headers
- [ ] Concurrent user operations
- [ ] Network timeout scenarios

## Agent Coordination Plan

### Backend API Developer
- Fix database connectivity issues
- Implement missing test utilities
- Add comprehensive logging for debugging

### Testing QA Developer
- Create automated test suites for each phase
- Implement integration tests
- Set up performance testing tools
- Generate test coverage reports

### DevOps Infrastructure Developer
- Resolve PostgreSQL permissions issue
- Set up monitoring and alerting
- Optimize database configuration
- Configure load balancing if needed

### AI ML Developer
- Test AI-related endpoints (currently disabled)
- Validate Pinecone integration
- Test recommendation algorithms

## Immediate Actions Required

1. **CRITICAL**: Resolve database connectivity issue
   - Fix PostgreSQL permissions for user 'postgres'
   - Ensure schema migrations can execute
   - Verify Prisma client connection

2. **HIGH**: Test non-database endpoints
   - Health checks
   - CORS configuration
   - Rate limiting
   - Error handling

3. **MEDIUM**: Prepare test data and scripts
   - Create test user accounts
   - Prepare sample project data
   - Set up automated test runners

## Success Metrics

- [ ] All endpoints returning expected responses
- [ ] Authentication flow working end-to-end
- [ ] Database operations functioning correctly
- [ ] Security measures properly implemented
- [ ] Performance within acceptable limits
- [ ] Comprehensive error handling
- [ ] API documentation gaps identified