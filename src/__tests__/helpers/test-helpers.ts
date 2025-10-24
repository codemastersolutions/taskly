/**
 * Test Helper Utilities
 * Common utilities and mocks for testing
 */

import type { SpawnOptions } from 'child_process';
import { vi } from 'vitest';

// Mock child_process module
export const mockChildProcess = {
  spawn: vi.fn(),
  exec: vi.fn(),
  execSync: vi.fn(),
};

// Mock process utilities
export const mockProcess = {
  stdout: {
    write: vi.fn(),
    on: vi.fn(),
  },
  stderr: {
    write: vi.fn(),
    on: vi.fn(),
  },
  on: vi.fn(),
  kill: vi.fn(),
  exit: vi.fn(),
};

// Mock file system operations
export const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  chmodSync: vi.fn(),
};

// Mock path operations
export const mockPath = {
  join: vi.fn((...args: string[]) => args.join('/')),
  resolve: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn((path: string) => path.split('/').pop() ?? ''),
  extname: vi.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
};

// Test data factories
export const createMockTaskConfig = (overrides: Partial<any> = {}) => ({
  command: 'npm test',
  identifier: 'test-task',
  color: 'blue',
  packageManager: 'npm' as const,
  cwd: process.cwd(),
  ...overrides,
});

export const createMockTaskResult = (overrides: Partial<any> = {}) => ({
  identifier: 'test-task',
  exitCode: 0,
  output: ['Test output line 1', 'Test output line 2'],
  duration: 1000,
  ...overrides,
});

export const createMockProcess = (overrides: Partial<any> = {}) => ({
  pid: 12345,
  stdout: {
    on: vi.fn(),
    pipe: vi.fn(),
  },
  stderr: {
    on: vi.fn(),
    pipe: vi.fn(),
  },
  on: vi.fn(),
  kill: vi.fn(),
  ...overrides,
});

// Test assertion helpers
export const expectToHaveBeenCalledWithCommand = (
  mockFn: ReturnType<typeof vi.fn>,
  expectedCommand: string,
  expectedOptions?: SpawnOptions
) => {
  expect(mockFn).toHaveBeenCalled();
  const calls = mockFn.mock.calls;
  const matchingCall = calls.find(call => {
    const [command, args] = call;
    const fullCommand = Array.isArray(args)
      ? `${command} ${args.join(' ')}`
      : command;
    return fullCommand.includes(expectedCommand);
  });
  expect(matchingCall).toBeDefined();

  if (expectedOptions && matchingCall) {
    const [, , options] = matchingCall;
    expect(options).toMatchObject(expectedOptions);
  }
};

// Async test utilities
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

// Mock environment variables
export const withEnvVars = (
  envVars: Record<string, string>,
  callback: () => void | Promise<void>
) => {
  const originalEnv = { ...process.env };

  // Set test environment variables
  Object.assign(process.env, envVars);

  try {
    return callback();
  } finally {
    // Restore original environment
    process.env = originalEnv;
  }
};

// Console capture utility
export const captureConsole = () => {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => logs.push(args.join(' '));
  console.error = (...args: any[]) => errors.push(args.join(' '));
  console.warn = (...args: any[]) => warns.push(args.join(' '));

  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
};
