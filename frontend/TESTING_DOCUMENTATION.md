# CastMatch Testing Infrastructure Documentation

## Overview

This document provides comprehensive documentation for the CastMatch testing infrastructure, covering unit tests, integration tests, E2E tests, accessibility testing, performance testing, and visual regression testing.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Running Tests](#running-tests)
3. [Test Coverage Requirements](#test-coverage-requirements)
4. [Testing Categories](#testing-categories)
5. [Writing Tests](#writing-tests)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

## Testing Architecture

### Technology Stack

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Component testing with user-centric approach
- **Playwright**: End-to-end testing across browsers
- **axe-core**: Accessibility testing and WCAG compliance
- **jest-axe**: Jest integration for accessibility testing

### Directory Structure

```
frontend/
├── tests/
│   ├── accessibility/     # WCAG compliance tests
│   ├── unit/              # Component unit tests
│   ├── integration/       # API and feature integration tests
│   ├── performance/       # Performance and animation tests
│   ├── e2e/              # End-to-end user journey tests
│   │   ├── .auth/        # Stored authentication states
│   │   ├── global-setup.ts
│   │   └── global-teardown.ts
│   └── utils/            # Testing utilities and helpers
├── jest.config.ts        # Jest configuration
├── jest.setup.ts         # Jest setup file
├── playwright.config.ts  # Playwright configuration
└── __mocks__/           # Mock files for assets

```

## Running Tests

### Installation

```bash
# Install all dependencies including testing packages
npm install

# Install Playwright browsers
npx playwright install
```

### Test Commands

```bash
# Run all tests in watch mode
npm test

# Run tests in CI mode with coverage
npm run test:ci

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:accessibility  # Accessibility tests only
npm run test:performance    # Performance tests only

# Run E2E tests
npm run test:e2e            # Run all E2E tests
npm run test:e2e:ui         # Open Playwright UI mode
npm run test:e2e:debug      # Debug mode with browser

# Generate coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- button.test

# Run tests in a specific file
npm test -- tests/unit/components/button.test.tsx

# Run tests with specific description
npm test -- --testNamePattern="should render"
```

## Test Coverage Requirements

### Coverage Thresholds

All code must meet the following coverage thresholds:

- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## Testing Categories

### 1. Accessibility Testing (WCAG 2.1 AA)

Located in `tests/accessibility/`

#### Key Areas Tested:

- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Visible focus indicators
- **Form Accessibility**: Proper labels and error messages
- **Alternative Text**: All images have appropriate alt text

#### Example Test:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

test('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 2. Unit Testing

Located in `tests/unit/`

#### Component Testing Guidelines:

- Test all props and their variations
- Test user interactions (click, hover, focus)
- Test state changes
- Test error boundaries
- Test TypeScript types

#### Example Test:

```typescript
import { renderWithProviders, screen, setupUser } from '@/tests/utils/test-utils';

test('should handle click events', async () => {
  const handleClick = jest.fn();
  const user = setupUser();
  
  renderWithProviders(<Button onClick={handleClick}>Click Me</Button>);
  
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 3. Performance Testing

Located in `tests/performance/`

#### Performance Metrics:

- **Frame Rate**: Minimum 55fps (allowing variance from 60fps)
- **Render Time**: Maximum 16.67ms for 60fps
- **Memory Usage**: Maximum 50MB increase
- **Response Time**: User input response within 100ms

#### Example Test:

```typescript
import { performanceUtils } from '@/tests/utils/test-utils';

test('should maintain 60fps during animations', async () => {
  renderWithProviders(<AnimatedComponent />);
  const fps = await performanceUtils.measureFPS(1000);
  expect(fps).toBeGreaterThanOrEqual(55);
});
```

### 4. End-to-End Testing

Located in `tests/e2e/`

#### User Journeys Tested:

1. **Casting Director Workflow**
   - Login → Search talents → Review profiles → Schedule auditions
   
2. **Producer Oversight**
   - Dashboard → Project review → Approval workflows
   
3. **Actor Management**
   - Profile creation → Audition tracking → Availability updates

#### Example E2E Test:

```typescript
import { test, expect } from '@playwright/test';

test('complete casting workflow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL('/dashboard');
});
```

### 5. Visual Regression Testing

Located in `tests/e2e/visual-regression.spec.ts`

#### Visual Tests Include:

- Component appearance across themes
- Responsive layout at different breakpoints
- Hover and interaction states
- Cross-browser consistency

#### Example Visual Test:

```typescript
test('button visual consistency', async ({ page }) => {
  await page.goto('/components/buttons');
  await expect(page.locator('[data-testid="button"]')).toHaveScreenshot(
    'button-default.png',
    { maxDiffPixels: 100 }
  );
});
```

## Writing Tests

### Test Utilities

Custom utilities are available in `tests/utils/test-utils.tsx`:

```typescript
import {
  renderWithProviders,  // Render with all providers
  setupUser,           // Setup user event
  mockFactory,         // Create mock data
  performanceUtils,    // Performance testing utilities
  a11yUtils,          // Accessibility utilities
  visualUtils,        // Visual testing helpers
} from '@/tests/utils/test-utils';
```

### Mock Data Factories

```typescript
const talent = mockFactory.talent({
  name: 'Custom Name',
  role: 'Lead Actor',
});

const message = mockFactory.message({
  content: 'Test message',
  sender: 'ai',
});
```

### Testing Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Test user behavior**, not implementation details
3. **Keep tests isolated** - each test should be independent
4. **Use descriptive test names** that explain what is being tested
5. **Follow AAA pattern**: Arrange, Act, Assert
6. **Mock external dependencies** to ensure consistent tests
7. **Test error states** and edge cases
8. **Use async/await** for asynchronous operations

## CI/CD Integration

### GitHub Actions Configuration

```yaml
name: Test Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - run: npx playwright install
      - run: npm run test:e2e
      
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit",
      "pre-push": "npm run test:ci"
    }
  }
}
```

## Quality Gates

### Mandatory Passing Criteria

- ✅ 100% WCAG 2.1 AA accessibility compliance
- ✅ >90% test coverage for all components
- ✅ 60fps animation performance across devices
- ✅ <3s initial page load time
- ✅ All E2E user journeys passing
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- ✅ Mobile/tablet/desktop responsive validation
- ✅ TypeScript strict mode with zero errors

## Troubleshooting

### Common Issues and Solutions

#### 1. Tests Failing Due to Animations

**Problem**: Visual tests fail due to animation timing
**Solution**: Disable animations in tests

```typescript
await page.addStyleTag({
  content: `* { animation-duration: 0s !important; }`
});
```

#### 2. Flaky E2E Tests

**Problem**: Tests pass/fail inconsistently
**Solution**: Add proper waits and retries

```typescript
await page.waitForSelector('[data-testid="element"]', {
  state: 'visible',
  timeout: 30000
});
```

#### 3. Memory Leaks in Tests

**Problem**: Tests consuming too much memory
**Solution**: Clean up after each test

```typescript
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});
```

#### 4. Playwright Browser Installation

**Problem**: Playwright browsers not installed
**Solution**: Install browsers

```bash
npx playwright install
# Or install specific browser
npx playwright install chromium
```

#### 5. Coverage Not Meeting Threshold

**Problem**: Coverage below 90% threshold
**Solution**: Add more tests for uncovered code

```bash
# Check coverage report for uncovered lines
npm run test:coverage
open coverage/lcov-report/index.html
```

## Debugging Tests

### Jest Debugging

```bash
# Run tests in debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Use VS Code debugger with launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### Playwright Debugging

```bash
# Debug mode with headed browser
npm run test:e2e:debug

# Use Playwright Inspector
PWDEBUG=1 npm run test:e2e

# Generate trace for debugging
npm run test:e2e -- --trace on
```

## Performance Monitoring

### Metrics Collection

Tests automatically collect performance metrics:

- **FPS**: Frame rate during animations
- **Render Time**: Component render duration
- **Memory Usage**: Heap size changes
- **Response Time**: User interaction latency

### Performance Reports

Performance results are logged in test output:

```
PASS Animation Performance Tests
  ✓ maintains 60fps during animations (58.2 fps average)
  ✓ renders within frame budget (12.3ms average)
  ✓ handles rapid interactions (23ms response time)
```

## Continuous Improvement

### Regular Audits

1. **Weekly**: Review test coverage reports
2. **Bi-weekly**: Update visual regression baselines
3. **Monthly**: Performance benchmark review
4. **Quarterly**: Accessibility audit with manual testing

### Test Maintenance

- Keep tests up-to-date with component changes
- Remove obsolete tests
- Refactor tests for better maintainability
- Update mock data to reflect real scenarios

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)

## Support

For testing-related questions or issues:

1. Check this documentation
2. Review existing test examples
3. Consult team lead for complex scenarios
4. Create issue in project repository

---

Last Updated: January 2025
Version: 1.0.0