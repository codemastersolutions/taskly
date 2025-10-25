import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupTestEnvironment,
  createMockGitHubEnvironment,
  setupTestEnvironment,
  simulateWorkflowExecution,
  validateTestEnvironment,
  validateWorkflowFiles,
} from './test-environment.js';

// Mock fs for controlled testing
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('Workflow Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Test Environment Setup', () => {
    it('should set up test environment with default values', () => {
      const environment = setupTestEnvironment();

      expect(environment.workspaceRoot).toBeDefined();
      expect(environment.githubWorkspace).toBeDefined();
      expect(environment.nodeVersion).toBeDefined();
      expect(environment.gitRepository).toBe('test/repo');
      expect(environment.gitBranch).toBe('main');
    });

    it('should set up test environment with custom values', () => {
      const customConfig = {
        environment: {
          workspaceRoot: '/custom/workspace',
          githubWorkspace: '/custom/github',
          nodeVersion: 'v18.0.0',
          npmVersion: '8.0.0',
          gitRepository: 'custom/repo',
          gitBranch: 'develop',
        },
      };

      const environment = setupTestEnvironment(customConfig);

      expect(environment.workspaceRoot).toBe('/custom/workspace');
      expect(environment.gitRepository).toBe('custom/repo');
      expect(environment.gitBranch).toBe('develop');
    });

    it('should set required environment variables', () => {
      setupTestEnvironment();

      expect(process.env.GITHUB_ACTIONS).toBe('true');
      expect(process.env.GITHUB_WORKSPACE).toBeDefined();
      expect(process.env.GITHUB_REPOSITORY).toBeDefined();
      expect(process.env.GITHUB_REF).toBeDefined();
      expect(process.env.GITHUB_SHA).toBeDefined();
    });
  });

  describe('Environment Validation', () => {
    it('should validate a correct test environment', () => {
      setupTestEnvironment();

      // Mock file system checks
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
          scripts: { test: 'vitest' },
        })
      );

      const result = validateTestEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing environment variables', () => {
      // Don't set up environment
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITHUB_WORKSPACE;

      const result = validateTestEnvironment();

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error => error.includes('GITHUB_ACTIONS'))
      ).toBe(true);
      expect(
        result.errors.some(error => error.includes('GITHUB_WORKSPACE'))
      ).toBe(true);
    });

    it('should detect missing package.json', () => {
      setupTestEnvironment();
      mockFs.existsSync.mockReturnValue(false);

      const result = validateTestEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('package.json'))).toBe(
        true
      );
    });

    it('should detect invalid package.json', () => {
      setupTestEnvironment();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = validateTestEnvironment();

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error => error.includes('Invalid package.json'))
      ).toBe(true);
    });

    it('should generate warnings for missing optional fields', () => {
      setupTestEnvironment();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

      const result = validateTestEnvironment();

      expect(
        result.warnings.some(warning => warning.includes('version field'))
      ).toBe(true);
      expect(result.warnings.some(warning => warning.includes('scripts'))).toBe(
        true
      );
    });
  });

  describe('Workflow File Validation', () => {
    it('should validate correct workflow files', () => {
      setupTestEnvironment();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        'pr-validation.yml',
        'auto-publish.yml',
      ]);
      mockFs.readFileSync.mockImplementation(filePath => {
        if (filePath.includes('pr-validation.yml')) {
          return `
name: PR Validation
on:
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
        }
        if (filePath.includes('auto-publish.yml')) {
          return `
name: Auto Publish
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
        }
        return '';
      });

      const result = validateWorkflowFiles();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing workflow directory', () => {
      setupTestEnvironment();
      mockFs.existsSync.mockReturnValue(false);

      const result = validateWorkflowFiles();

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error => error.includes('does not exist'))
      ).toBe(true);
    });

    it('should detect missing required fields in workflow files', () => {
      setupTestEnvironment();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['invalid.yml']);
      mockFs.readFileSync.mockReturnValue('invalid: workflow');

      const result = validateWorkflowFiles();

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(error => error.includes('missing trigger'))
      ).toBe(true);
      expect(result.errors.some(error => error.includes('missing jobs'))).toBe(
        true
      );
    });

    it('should generate warnings for workflow best practices', () => {
      setupTestEnvironment();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['pr-validation.yml']);
      mockFs.readFileSync.mockReturnValue(`
name: PR Validation
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);

      const result = validateWorkflowFiles();

      expect(
        result.warnings.some(warning =>
          warning.includes('should trigger on pull_request events')
        )
      ).toBe(true);
    });
  });

  describe('Mock GitHub Environment', () => {
    it('should create mock GitHub environment with defaults', () => {
      const config = createMockGitHubEnvironment();

      expect(config.repository).toBe('owner/repo');
      expect(config.branch).toBe('main');
      expect(config.sha).toBeDefined();
      expect(config.runId).toBeDefined();
      expect(config.actor).toBe('test-user');

      expect(process.env.GITHUB_ACTIONS).toBe('true');
      expect(process.env.GITHUB_REPOSITORY).toBe('owner/repo');
      expect(process.env.GITHUB_REF).toBe('refs/heads/main');
    });

    it('should create mock GitHub environment with custom options', () => {
      const options = {
        repository: 'custom/repo',
        branch: 'develop',
        sha: 'custom-sha',
        runId: '999',
        actor: 'custom-user',
      };

      const config = createMockGitHubEnvironment(options);

      expect(config.repository).toBe('custom/repo');
      expect(config.branch).toBe('develop');
      expect(config.sha).toBe('custom-sha');
      expect(config.runId).toBe('999');
      expect(config.actor).toBe('custom-user');

      expect(process.env.GITHUB_REPOSITORY).toBe('custom/repo');
      expect(process.env.GITHUB_REF).toBe('refs/heads/develop');
      expect(process.env.GITHUB_SHA).toBe('custom-sha');
    });
  });

  describe('Workflow Execution Simulation', () => {
    it('should simulate workflow execution environment', () => {
      const simulation = simulateWorkflowExecution('Test Workflow', 'test-job');

      expect(simulation.environment).toBeDefined();
      expect(process.env.GITHUB_WORKFLOW).toBe('Test Workflow');
      expect(process.env.GITHUB_JOB).toBe('test-job');
      expect(process.env.GITHUB_ACTION).toBe('__test-job');
    });

    it('should provide GitHub Actions helper functions', () => {
      const simulation = simulateWorkflowExecution('Test Workflow', 'test-job');

      // Test helper functions exist
      expect(typeof simulation.setOutput).toBe('function');
      expect(typeof simulation.setFailed).toBe('function');
      expect(typeof simulation.notice).toBe('function');
      expect(typeof simulation.warning).toBe('function');

      // Test that functions can be called without errors
      expect(() => simulation.setOutput('test', 'value')).not.toThrow();
      expect(() => simulation.notice('Test notice')).not.toThrow();
      expect(() => simulation.warning('Test warning')).not.toThrow();
    });

    it('should handle workflow failure simulation', () => {
      const simulation = simulateWorkflowExecution('Test Workflow', 'test-job');
      const originalExitCode = process.exitCode;

      simulation.setFailed('Test failure');

      expect(process.exitCode).toBe(1);

      // Restore original exit code
      process.exitCode = originalExitCode;
    });
  });

  describe('Environment Cleanup', () => {
    it('should clean up test environment variables', () => {
      setupTestEnvironment();
      createMockGitHubEnvironment();

      // Verify variables are set
      expect(process.env.GITHUB_ACTIONS).toBe('true');
      expect(process.env.GITHUB_REPOSITORY).toBeDefined();

      cleanupTestEnvironment();

      // Verify variables are removed
      expect(process.env.GITHUB_ACTIONS).toBeUndefined();
      expect(process.env.GITHUB_REPOSITORY).toBeUndefined();
      expect(process.env.GITHUB_WORKSPACE).toBeUndefined();
    });

    it('should not affect non-test environment variables', () => {
      const originalPath = process.env.PATH;
      const originalHome = process.env.HOME;

      setupTestEnvironment();
      cleanupTestEnvironment();

      expect(process.env.PATH).toBe(originalPath);
      expect(process.env.HOME).toBe(originalHome);
    });
  });

  describe('Integration with Actual Workflow Scripts', () => {
    it('should validate that workflow scripts can run in test environment', () => {
      const environment = setupTestEnvironment();

      // Mock required files and commands
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        })
      );

      // Verify environment is suitable for workflow execution
      const validation = validateTestEnvironment();

      // Should be valid for testing (even with warnings)
      expect(validation.errors).toHaveLength(0);
      expect(environment.workspaceRoot).toBeDefined();
      expect(process.env.GITHUB_ACTIONS).toBe('true');
    });

    it('should provide realistic test data for workflow scripts', () => {
      createMockGitHubEnvironment({
        repository: 'codemastersolutions/taskly',
        branch: 'main',
        sha: 'abc123def456789',
        actor: 'github-actions[bot]',
      });

      expect(process.env.GITHUB_REPOSITORY).toBe('codemastersolutions/taskly');
      expect(process.env.GITHUB_REF).toBe('refs/heads/main');
      expect(process.env.GITHUB_SHA).toBe('abc123def456789');
      expect(process.env.GITHUB_ACTOR).toBe('github-actions[bot]');
    });
  });
});
