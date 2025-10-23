import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // CI-specific test configuration
    reporter: ['verbose', 'junit', 'json'],
    outputFile: {
      junit: './coverage/junit.xml',
      json: './coverage/test-results.json'
    },
    coverage: {
      ...baseConfig.test?.coverage,
      reporter: ['text', 'json', 'lcov', 'clover', 'cobertura', 'text-summary'],
      reportOnFailure: true,
      watermarks: {
        statements: [80, 90],
        functions: [80, 90],
        branches: [80, 90],
        lines: [80, 90]
      },
    },
    // Disable watch mode in CI
    watch: false,
    // Run tests in single thread for more predictable CI results
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        minThreads: 1,
        maxThreads: 1
      }
    },
    // Longer timeout for CI environment
    testTimeout: 15000,
    hookTimeout: 15000,
    // Fail fast in CI
    bail: 1,
    // Retry failed tests once in CI
    retry: 1
  }
});