# CastMatch Testing Documentation

This document provides comprehensive information about the testing strategy, frameworks, and procedures for the CastMatch platform.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Types and Structure](#test-types-and-structure)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Continuous Integration](#continuous-integration)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Best Practices](#best-practices)

## Testing Strategy

Our testing strategy follows the testing pyramid approach with comprehensive coverage at all levels:

- **Unit Tests (70%)**: Fast, isolated tests for individual functions and components
- **Integration Tests (20%)**: Tests for database operations and service interactions
- **End-to-End Tests (10%)**: Complete workflow tests using real browsers
- **Security Tests**: Dedicated security validation and penetration testing
- **Performance Tests**: Load testing and performance benchmarking

## Test Types and Structure

### Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── utils/              # Utility function tests
│   │   ├── password.test.ts
│   │   └── jwt.test.ts
│   └── services/           # Service layer tests
│       └── auth.service.test.ts
├── integration/            # Integration tests
│   ├── auth.test.ts       # Authentication integration tests
│   └── database.test.ts   # Database integration tests
├── security/              # Security tests
│   └── auth.security.test.ts
├── api/                   # API endpoint tests
│   └── endpoints.test.ts
├── e2e/                   # End-to-end tests
│   ├── auth.workflows.test.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
├── performance/           # Performance tests
│   ├── artillery-config.yml
│   ├── performance.test.js
│   └── test-data.csv
└── setup.ts              # Global test setup
```

### Test Technologies

- **Jest**: Unit and integration testing framework
- **Playwright**: End-to-end testing across browsers
- **Supertest**: HTTP assertion library for API testing
- **Artillery**: Load testing and performance benchmarking
- **Prisma**: Database testing utilities

## Running Tests

### Prerequisites

Ensure you have the following running:
- PostgreSQL database
- Redis server
- Node.js 18+

### Environment Setup

Create a `.env.test` file with test-specific environment variables:

```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5432/castmatch_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-jwt-secret
```

### Test Commands

#### All Tests
```bash
npm run test:all          # Run all test suites
npm test                  # Run Jest tests only
```

#### Individual Test Suites
```bash
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:security     # Security tests only
npm run test:api         # API endpoint tests only
npm run test:e2e         # End-to-end tests only
```

#### Coverage Reports
```bash
npm run test:coverage     # Generate combined coverage report
npm run test:unit         # Unit test coverage
npm run test:integration  # Integration test coverage
```

#### Performance Tests
```bash
npm run test:performance  # Node.js performance tests
npm run test:artillery    # Artillery load tests
```

#### Development Commands
```bash
npm run test:watch        # Watch mode for Jest tests
npm run test:e2e:ui      # Playwright UI mode
```

## Test Coverage

### Coverage Requirements

- **Unit Tests**: Minimum 90% code coverage
- **Integration Tests**: 100% endpoint coverage
- **Security Tests**: All security scenarios covered
- **E2E Tests**: All critical user workflows

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```
coverage/
├── unit/           # Unit test coverage
├── integration/    # Integration test coverage
├── security/       # Security test coverage
├── api/           # API test coverage
└── combined/      # Combined coverage report
```

### Viewing Coverage Reports

```bash
# Generate and view HTML coverage report
npm run test:coverage
open coverage/combined/lcov-report/index.html
```

## Test Data Management

### Database Setup

Tests use a separate test database that is:
- Cleaned before each test suite
- Seeded with consistent test data
- Isolated from development/production data

### Test User Accounts

Standard test users are created for different roles:

```typescript
// Actor test user
{
  email: 'actor.test@example.com',
  password: 'TestPass123!',
  role: 'ACTOR'
}

// Casting Director test user
{
  email: 'cd.test@example.com',
  password: 'TestPass123!',
  role: 'CASTING_DIRECTOR'
}

// Producer test user
{
  email: 'producer.test@example.com',
  password: 'TestPass123!',
  role: 'PRODUCER'
}
```

## Continuous Integration

### GitHub Actions Pipeline

Our CI/CD pipeline includes:

1. **Code Quality**: Linting and formatting checks
2. **Unit Tests**: Fast unit test execution
3. **Integration Tests**: Database and service integration tests
4. **Security Tests**: Security vulnerability scanning
5. **API Tests**: Comprehensive endpoint testing
6. **E2E Tests**: Browser-based workflow testing
7. **Performance Tests**: Load testing and benchmarking
8. **Coverage Reports**: Combined coverage analysis

### Pipeline Triggers

- **Pull Requests**: Run all test suites except performance tests
- **Main Branch**: Run complete test suite including performance tests
- **Scheduled**: Daily security scans and performance benchmarks

### Quality Gates

All tests must pass before code can be merged:
- ✅ Linting and formatting
- ✅ Unit tests (90%+ coverage)
- ✅ Integration tests (100% endpoint coverage)
- ✅ Security tests (no high/critical vulnerabilities)
- ✅ E2E tests (all critical workflows)

## Performance Testing

### Load Testing with Artillery

Artillery configuration includes multiple phases:
- **Warm-up**: 5 req/sec for 60 seconds
- **Ramp-up**: 5-50 req/sec over 300 seconds
- **Sustained**: 50 req/sec for 600 seconds
- **Peak**: 100 req/sec for 180 seconds
- **Cool-down**: 100-10 req/sec over 120 seconds

### Performance Scenarios

1. **Authentication Flow**: Registration, login, token refresh, logout
2. **Profile Management**: Get and update user profiles
3. **Search Operations**: Actor search and filtering
4. **Error Scenarios**: Invalid requests and error handling

### Performance Benchmarks

- **Response Time**: 95% < 1 second, 99% < 2 seconds
- **Throughput**: Minimum 40 requests per second
- **Error Rate**: Maximum 5% (mostly authentication errors)
- **Database**: Connection pool efficiency and query performance

## Security Testing

### Security Test Categories

1. **Input Validation**: SQL injection, XSS, malformed data
2. **Authentication**: Token validation, session management, rate limiting
3. **Authorization**: Role-based access control, privilege escalation
4. **Data Protection**: Sensitive data exposure, error handling
5. **Infrastructure**: Headers, CORS, CSRF protection

### Security Tools

- **Custom Tests**: Manual security test scenarios
- **npm audit**: Dependency vulnerability scanning
- **Snyk**: Advanced security vulnerability analysis
- **OWASP ZAP**: Automated security scanning (future)

### Security Standards

- OWASP Top 10 compliance
- Data encryption in transit and at rest
- Secure authentication and session management
- Input validation and sanitization
- Security headers and CSRF protection

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern
3. **Isolation**: Tests should not depend on each other
4. **Realistic Data**: Use realistic test data
5. **Error Cases**: Test both success and failure scenarios

### Test Organization

1. **Logical Grouping**: Group related tests in describe blocks
2. **Setup/Teardown**: Use beforeEach/afterEach for consistent state
3. **Helper Functions**: Extract common test utilities
4. **Data Factories**: Use factories for consistent test data
5. **Mocking**: Mock external dependencies appropriately

### Performance Guidelines

1. **Fast Execution**: Unit tests should complete in milliseconds
2. **Parallel Execution**: Tests should be parallelizable
3. **Resource Cleanup**: Always clean up resources
4. **Database Transactions**: Use transactions for test isolation
5. **Minimal Dependencies**: Keep test dependencies minimal

### Debugging Tests

1. **IDE Integration**: Use VS Code Jest extension
2. **Debug Mode**: Run tests with --inspect flag
3. **Console Logging**: Use console.log for debugging (remove before commit)
4. **Test Isolation**: Run individual tests to isolate issues
5. **Coverage Reports**: Use coverage to identify untested code

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Check for port conflicts on 3000, 5432, 6379
3. **Environment Variables**: Verify .env.test configuration
4. **Dependencies**: Run `npm ci` to ensure clean dependencies
5. **Permissions**: Check file permissions for test artifacts

### Performance Issues

1. **Slow Tests**: Check database queries and network calls
2. **Memory Leaks**: Monitor memory usage in long-running tests
3. **Concurrency**: Adjust test concurrency based on system resources
4. **Timeouts**: Increase timeouts for slow operations

### CI/CD Issues

1. **Flaky Tests**: Identify and fix non-deterministic tests
2. **Resource Limits**: Monitor CI resource usage
3. **Environment Differences**: Ensure consistency between local and CI
4. **Artifact Storage**: Check test artifact upload/storage

## Reporting Issues

If you encounter testing issues:

1. Check this documentation first
2. Search existing GitHub issues
3. Create a new issue with:
   - Test command that failed
   - Error messages and stack traces
   - Environment information
   - Steps to reproduce

## Future Enhancements

Planned testing improvements:

1. **Visual Regression Testing**: Screenshot comparison testing
2. **Accessibility Testing**: WCAG 2.1 AA compliance testing
3. **Contract Testing**: API contract validation with Pact
4. **Chaos Engineering**: Failure injection testing
5. **Mobile Testing**: Native mobile app testing
6. **Cross-browser Testing**: Extended browser compatibility testing