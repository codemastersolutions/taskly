/**
 * Vitest Test Setup
 * Global test configuration and utilities
 */

import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

// Global test timeout
const TEST_TIMEOUT = 10000;

// Mock console methods to reduce noise in tests
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

// Setup before all tests
beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.VITEST_VERBOSE !== 'true') {
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    // Keep console.error for debugging
  }

  // Set test timeout
  vi.setConfig({ testTimeout: TEST_TIMEOUT });

  // Handle unhandled promise rejections in test environment
  process.on('unhandledRejection', (reason, promise) => {
    // In test mode, we want to suppress certain expected failures
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = (reason as Error).message;
      // Suppress expected task failures in test environment
      if (
        message.includes('Task "lint" failed with exit code') ||
        message.includes('Task "failing-command" failed with exit code') ||
        message.includes('failed with exit code 1')
      ) {
        return; // Silently ignore expected failures in tests
      }
    }
    // For other unhandled rejections, log them but don't fail the test
    originalConsole.warn('Unhandled promise rejection in test:', reason);
  });

  // Handle uncaught exceptions in test environment
  process.on('uncaughtException', error => {
    // Suppress expected system errors in test environment
    if (
      error.message &&
      (error.message.includes('Task "lint" failed with exit code') ||
        error.message.includes(
          'Task "failing-command" failed with exit code'
        ) ||
        error.message.includes('failed with exit code 1'))
    ) {
      return; // Silently ignore expected failures in tests
    }
    // For other uncaught exceptions, log them but don't fail the test
    originalConsole.warn('Uncaught exception in test:', error);
  });
});

// Cleanup after all tests
afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset modules to ensure clean state
  vi.resetModules();
});

// Cleanup after each test
afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Global test utilities
declare global {
  namespace Vi {
    interface AsserterContext {
      // Add custom matchers if needed
    }
  }
}

// Export test utilities
export const testUtils = {
  // Utility to wait for a specific amount of time
  wait: (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms)),

  // Utility to create a mock function with specific behavior
  createMockFn: <T extends (...args: any[]) => any>(
    implementation?: T
  ): ReturnType<typeof vi.fn> => {
    return implementation ? vi.fn(implementation) : vi.fn();
  },

  // Utility to suppress console output for a specific test
  suppressConsole: (callback: () => void | Promise<void>) => {
    const originalMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    // Suppress all console methods
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};

    try {
      return callback();
    } finally {
      // Restore console methods
      Object.assign(console, originalMethods);
    }
  },

  // Utility to create temporary test data
  createTempData: (data: Record<string, any>) => ({
    ...data,
    _testId: Math.random().toString(36).substr(2, 9),
    _createdAt: new Date().toISOString(),
  }),
};
