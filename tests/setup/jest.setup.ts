/**
 * Jest Global Setup
 * Configures Jest environment before all tests
 */

import { setupAllMocks, clearAllMocks } from '../mocks/external-services';

// Setup global test environment
beforeAll(() => {
  // Configure console behavior in tests
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Suppress known noisy warnings in tests
    const message = args[0]?.toString() || '';
    const suppressWarnings = [
      'Warning: ReactDOM.render is deprecated',
      'Warning: componentWillReceiveProps has been renamed',
      'ExperimentalWarning: The Fetch API is an experimental feature',
    ];

    if (!suppressWarnings.some(warning => message.includes(warning))) {
      originalConsoleError.apply(console, args);
    }
  };

  // Setup all service mocks
  setupAllMocks();

  // Configure test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  
  console.log('🧪 Jest global setup completed');
});

beforeEach(() => {
  // Clear all mocks before each test to avoid interference
  clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  console.log('🧹 Jest global cleanup completed');
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
      toBeValidUUID(): R;
      toBeValidJWT(): R;
      toBeWithinTimeRange(start: Date, end: Date): R;
      toHaveValidationError(field: string): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () => 
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
      pass,
    };
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      message: () => 
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    return {
      message: () => 
        pass
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
      pass,
    };
  },

  toBeWithinTimeRange(received: Date, start: Date, end: Date) {
    const receivedTime = received.getTime();
    const startTime = start.getTime();
    const endTime = end.getTime();
    
    const pass = receivedTime >= startTime && receivedTime <= endTime;
    
    return {
      message: () => 
        pass
          ? `expected ${received.toISOString()} not to be between ${start.toISOString()} and ${end.toISOString()}`
          : `expected ${received.toISOString()} to be between ${start.toISOString()} and ${end.toISOString()}`,
      pass,
    };
  },

  toHaveValidationError(received: any, field: string) {
    const hasError = received?.errors && 
                    Array.isArray(received.errors) &&
                    received.errors.some((error: any) => 
                      error.field === field || error.path === field
                    );
    
    return {
      message: () => 
        hasError
          ? `expected not to have validation error for field ${field}`
          : `expected to have validation error for field ${field}`,
      pass: hasError,
    };
  },
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export {};