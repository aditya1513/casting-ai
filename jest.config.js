/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/e2e/', // E2E tests run separately with Playwright
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
    }],
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/server.ts',
    '!src/config/**',
    '!src/types/**',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary', 
    'lcov',
    'html',
    'json',
    'cobertura'
  ],
  
  // Coverage thresholds
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
    },
    './src/middleware/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  
  // Setup files
  setupFiles: ['<rootDir>/tests/setup/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Global configuration
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  
  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/jest-html-report',
        filename: 'index.html',
        expand: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Projects for different test types
  projects: [
    // Unit tests
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    },
    
    // Integration tests
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 60000,
    },
    
    // API tests
    {
      displayName: 'api',
      testMatch: ['<rootDir>/tests/api/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 30000,
    },
    
    // Security tests
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 45000,
    },
  ],
};