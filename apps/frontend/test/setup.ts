import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: () => [],
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation(cb => {
  setTimeout(cb, 0);
  return 0;
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock fetch for tRPC
global.fetch = vi.fn();

// Setup environment variables for testing
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_pk_test';

// Mock Clerk for testing
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn().mockResolvedValue('test-token'),
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    },
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () => null,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock framer-motion for tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    button: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
  }),
}));

// Setup test utilities
export const mockTRPCClient = {
  scripts: {
    getUploadUrl: {
      mutate: vi.fn().mockResolvedValue({
        fileId: 'test-file-id',
        uploadUrl: 'https://test-upload-url.com',
        filePath: 'scripts/test-user/test-file-id',
      }),
    },
    confirmUpload: {
      mutate: vi.fn().mockResolvedValue({ success: true }),
    },
    analyzeScript: {
      mutate: vi.fn().mockResolvedValue({ analysisId: 'test-analysis-id' }),
    },
    getAnalysisStatus: {
      query: vi.fn().mockResolvedValue({
        id: 'test-analysis-id',
        status: 'completed',
        metadata: { title: 'Test Script' },
      }),
    },
    listAnalyses: {
      query: vi.fn().mockResolvedValue({
        analyses: [],
        total: 0,
        hasMore: false,
      }),
    },
  },
  talents: {
    search: {
      query: vi.fn().mockResolvedValue({
        talents: [],
        total: 0,
      }),
    },
  },
};

// Export test utilities
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 100));

export const createMockFile = (
  name: string = 'test.pdf',
  size: number = 1024 * 1024, // 1MB
  type: string = 'application/pdf'
): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const createMockFileList = (...files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    ...files.reduce((acc, file, index) => ({ ...acc, [index]: file }), {}),
  };
  return fileList as FileList;
};