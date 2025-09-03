# 🎭 CastMatch Testing Framework

A comprehensive testing framework for the CastMatch platform, ensuring reliability, security, and performance across all authentication and profile features.

## 📋 Overview

This testing framework provides complete coverage for CastMatch's authentication system and profile management features with:

- **Unit Tests** - Individual component and service testing
- **Integration Tests** - API endpoint and database interaction testing  
- **Security Tests** - Comprehensive security vulnerability testing
- **Performance Tests** - Load testing and performance benchmarking
- **End-to-End Tests** - Complete user workflow testing
- **Accessibility Tests** - WCAG 2.1 AA compliance verification

## 🚀 Quick Start

### Running All Tests

```bash
# Run comprehensive test suite
npm run test:comprehensive

# Run specific test phases
npm run test:comprehensive unit integration security

# Skip optional phases
npm run test:comprehensive --skip-optional

# Continuous testing mode
npm run test:comprehensive --continuous
```

### Individual Test Categories

```bash
# Unit tests with coverage
npm run test:unit

# Integration tests
npm run test:integration

# Security tests  
npm run test:security

# Performance tests
npm run test:performance

# End-to-end tests
npm run test:e2e

# API tests
npm run test:api
```

## 📁 Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── auth/               # Authentication unit tests
│   └── profile/            # Profile management unit tests
├── integration/            # Integration tests
│   ├── auth/              # Auth API integration tests
│   └── rbac.integration.test.ts  # Role-based access control
├── security/              # Security tests
│   └── auth-security.test.ts     # Authentication security
├── performance/           # Performance tests
│   └── auth-performance.test.ts  # Auth performance testing
├── e2e/                   # End-to-end tests
│   └── user-workflows.spec.ts    # Complete user journeys
├── factories/             # Test data factories
│   └── user.factory.ts    # User data generation
├── mocks/                 # Mock implementations
│   ├── express.ts         # Express mocks
│   └── external-services.ts      # External service mocks
├── setup/                 # Test configuration
│   ├── test-environment.ts       # Test environment setup
│   └── jest.setup.ts      # Jest global configuration
└── utils/                 # Testing utilities
    └── test-reports.ts    # Test reporting and analytics
```

## 🧪 Test Categories

### 1. Authentication Tests

**Unit Tests** (`tests/unit/auth/`)
- ✅ All auth controller endpoints
- ✅ Login/register validation
- ✅ Token generation and validation
- ✅ Password security
- ✅ Email verification flows

**Integration Tests** (`tests/integration/auth/`)
- ✅ OAuth flows (Google, GitHub)
- ✅ Session management
- ✅ Password reset workflows
- ✅ Account linking/unlinking
- ✅ Token refresh mechanisms

**Security Tests** (`tests/security/`)
- ✅ JWT security validation
- ✅ Password strength enforcement
- ✅ Rate limiting and brute force protection
- ✅ CSRF protection
- ✅ Session security
- ✅ Input validation and sanitization

### 2. Profile Management Tests

**Unit Tests** (`tests/unit/profile/`)
- ✅ Profile creation and updates
- ✅ File upload management
- ✅ Role-based permissions
- ✅ Data validation rules
- ✅ Privacy settings
- ✅ Profile search and filtering

### 3. Role-Based Access Control Tests

**Integration Tests** (`tests/integration/`)
- ✅ Multi-role permission testing
- ✅ Resource access validation
- ✅ Permission inheritance
- ✅ Security edge cases

### 4. Performance Tests

**Load Tests** (`tests/performance/`)
- ✅ Authentication endpoint performance
- ✅ Concurrent user simulation
- ✅ Database performance under load
- ✅ Memory usage monitoring
- ✅ File upload performance

### 5. End-to-End Tests

**Workflow Tests** (`tests/e2e/`)
- ✅ Complete user registration
- ✅ Social authentication flows
- ✅ Password recovery workflows
- ✅ Profile management journeys
- ✅ Cross-role interactions
- ✅ Accessibility compliance
- ✅ Responsive design testing
- ✅ Error handling scenarios

## 📊 Coverage Requirements

The framework maintains strict coverage requirements:

- **Unit Tests**: 90% code coverage minimum
- **Controllers**: 95% coverage required
- **Services**: 90% coverage required  
- **Middleware**: 90% coverage required
- **Global**: 85% coverage minimum

### Coverage Thresholds

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/controllers/': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
  },
  './src/services/': {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Test Database
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/castmatch_test

# Test Redis  
TEST_REDIS_URL=redis://localhost:6379/1

# JWT Secret for Testing
JWT_SECRET=test-jwt-secret-key-for-testing-only

# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Result Upload
UPLOAD_ENDPOINT=https://api.example.com/test-results
```

### Test Data

The framework uses factories to generate consistent test data:

```typescript
// Create test user
const user = createMockUser({
  email: 'test@castmatch.ai',
  role: UserRole.ACTOR
});

// Create batch users
const users = createBatchMockUsers(100, UserRole.ACTOR);

// Create test profile
const profile = createMockActorProfile({
  skills: ['Acting', 'Dancing', 'Singing']
});
```

## 📈 Reporting

### Test Reports

The framework generates comprehensive reports:

- **HTML Report**: Visual test results with coverage
- **JSON Report**: Machine-readable test data  
- **JUnit XML**: CI/CD integration format
- **Coverage Reports**: Detailed coverage analysis
- **Performance Metrics**: Load testing results

### Report Locations

```
coverage/
├── index.html              # Main coverage report
├── test-report.html        # Comprehensive test report
├── test-report.json        # JSON test results
├── junit.xml              # CI/CD compatible results
└── performance-report.json # Performance metrics
```

### Slack Integration

Automatic Slack notifications with test results:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
npm run test:comprehensive
```

## 🛠️ Mock Services

The framework includes comprehensive mocks for external services:

- **Email Services** (SendGrid, Nodemailer)
- **SMS Services** (Twilio)  
- **File Storage** (AWS S3)
- **OAuth Providers** (Google, GitHub)
- **Analytics** (Mixpanel, PostHog)
- **Payment** (Stripe)
- **Push Notifications**
- **AI/ML Services**

## 🔒 Security Testing

Comprehensive security testing includes:

- **Authentication Security**
  - JWT token validation
  - Password strength enforcement
  - Session security
  - Brute force protection

- **Input Validation**
  - SQL injection prevention
  - XSS protection
  - CSRF protection
  - Input sanitization

- **Authorization Testing**
  - Role-based access control
  - Permission validation
  - Resource ownership
  - Privilege escalation prevention

## ⚡ Performance Testing

Performance benchmarks and testing:

- **Authentication Endpoints**
  - Login: < 500ms average response
  - Registration: < 800ms average response
  - Token refresh: < 200ms average response

- **Load Testing**
  - Concurrent users: 100+ simultaneous
  - Throughput: 100+ requests/second
  - Error rate: < 1% under normal load

- **Database Performance**
  - Connection pool management
  - Query optimization
  - Concurrent operation handling

## 🎨 Accessibility Testing

WCAG 2.1 AA compliance testing:

- **Keyboard Navigation**
  - Tab order validation
  - Focus management
  - Keyboard shortcuts

- **Screen Reader Compatibility**
  - ARIA label validation
  - Semantic HTML structure
  - Live region announcements

- **Visual Accessibility**
  - Color contrast validation
  - Text sizing
  - Visual focus indicators

## 🚀 CI/CD Integration

The testing framework integrates with CI/CD pipelines:

### GitHub Actions

```yaml
- name: Run Comprehensive Tests
  run: npm run test:comprehensive
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    
- name: Upload Test Results
  uses: actions/upload-artifact@v2
  with:
    name: test-results
    path: coverage/
```

### Quality Gates

Tests must pass before deployment:

- All required test phases must pass
- Coverage thresholds must be met
- Security tests must pass
- Performance benchmarks must be met

## 🤝 Contributing

When adding new tests:

1. **Follow Naming Conventions**
   ```typescript
   describe('ComponentName', () => {
     it('should perform expected behavior', () => {
       // Test implementation
     });
   });
   ```

2. **Use Test Factories**
   ```typescript
   const user = createMockUser({ role: 'ACTOR' });
   const profile = createMockProfile();
   ```

3. **Mock External Services**
   ```typescript
   import { mockEmailService } from '../mocks/external-services';
   mockEmailService.sendEmail.mockResolvedValue({ success: true });
   ```

4. **Test Edge Cases**
   - Invalid inputs
   - Network failures
   - Concurrent operations
   - Error conditions

5. **Maintain Coverage**
   - Ensure new code has tests
   - Meet coverage thresholds
   - Test both success and failure paths

## 📚 Documentation

- [Testing Best Practices](./docs/testing-best-practices.md)
- [Mock Service Guide](./docs/mock-services.md)
- [Performance Testing Guide](./docs/performance-testing.md)
- [Security Testing Guide](./docs/security-testing.md)
- [Accessibility Testing Guide](./docs/accessibility-testing.md)

## 🎯 Test Philosophy

Our testing approach follows these principles:

1. **Confidence Over Coverage** - Tests should provide confidence in the system
2. **Realistic Scenarios** - Test real user workflows and edge cases
3. **Fast Feedback** - Tests should run quickly and provide clear feedback
4. **Maintainable** - Tests should be easy to understand and modify
5. **Comprehensive** - Cover security, performance, and accessibility

## 🔍 Debugging Tests

Common debugging techniques:

```bash
# Run specific test file
npm test -- auth.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="should login successfully"
```

---

## 📞 Support

For questions about the testing framework:

- **Documentation**: Check this README and linked guides
- **Issues**: Create GitHub issues for bugs or feature requests
- **Slack**: #testing channel for quick questions
- **Code Review**: Include testing team in PRs with test changes

---

**Happy Testing! 🎭✨**

*Ensuring CastMatch delivers reliable, secure, and performant experiences for all users.*