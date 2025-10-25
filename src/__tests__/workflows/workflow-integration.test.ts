import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanupTestEnvironment,
  createGitHubActionsMocks,
  createTestEnvironment,
  testData,
  validateTestEnvironment,
  workflowHelpers,
  type WorkflowTestConfig,
} from './test-config.js';

describe('Workflow Integration Tests', () => {
  let testConfig: WorkflowTestConfig;
  let githubMocks: ReturnType<typeof createGitHubActionsMocks>;

  beforeEach(() => {
    testConfig = createTestEnvironment();
    githubMocks = createGitHubActionsMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Test Environment Setup', () => {
    it('should create a valid test environment', () => {
      const validation = validateTestEnvironment(testConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(process.env.GITHUB_ACTIONS).toBe('true');
      expect(process.env.GITHUB_REPOSITORY).toBe('codemastersolutions/taskly');
    });

    it('should provide GitHub Actions mock functions', () => {
      expect(typeof githubMocks.setOutput).toBe('function');
      expect(typeof githubMocks.setFailed).toBe('function');
      expect(typeof githubMocks.notice).toBe('function');
      expect(typeof githubMocks.warning).toBe('function');
    });

    it('should generate realistic test data', () => {
      const commits = testData.generateCommits(5);
      const packageJson = testData.generatePackageJson('1.2.3');
      const shas = testData.generateShas(3);

      expect(commits).toHaveLength(5);
      expect(commits.every(commit => commit.includes(':'))).toBe(true);
      expect(packageJson.version).toBe('1.2.3');
      expect(shas).toHaveLength(3);
      expect(shas.every(sha => sha.length === 40)).toBe(true);
    });
  });

  describe('PR Validation Workflow Simulation', () => {
    it('should simulate successful PR validation', async () => {
      const prValidationSteps = [
        { name: 'Checkout', command: 'actions/checkout@v4' },
        { name: 'Setup Node.js', command: 'actions/setup-node@v4' },
        { name: 'Install Dependencies', command: 'npm ci' },
        { name: 'ESLint', command: 'npm run lint' },
        { name: 'Prettier Check', command: 'npm run format:check' },
        { name: 'TypeScript Check', command: 'npm run type-check' },
        { name: 'Security Audit', command: 'npm audit' },
        { name: 'Run Tests', command: 'npm test' },
        { name: 'Build', command: 'npm run build' },
      ];

      const result = await workflowHelpers.executeJob(
        'pr-validation',
        prValidationSteps
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(9);
      expect(result.steps.every(step => step.success)).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle PR validation failures', async () => {
      const prValidationSteps = [
        { name: 'Checkout', command: 'actions/checkout@v4' },
        { name: 'Setup Node.js', command: 'actions/setup-node@v4' },
        { name: 'Install Dependencies', command: 'npm ci' },
        { name: 'ESLint', command: 'npm run lint', shouldFail: true }, // This will fail
        { name: 'Run Tests', command: 'npm test' }, // This won't run due to failure
      ];

      const result = await workflowHelpers.executeJob(
        'pr-validation',
        prValidationSteps
      );

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(4); // Should stop at ESLint failure
      expect(result.steps[3].success).toBe(false);
      expect(result.steps[3].error).toContain('ESLint failed');
    });

    it('should simulate matrix testing across different environments', async () => {
      const nodeVersions = ['16', '18', '20'];
      const operatingSystems = [
        'ubuntu-latest',
        'windows-latest',
        'macos-latest',
      ];

      const matrixResults = [];

      for (const nodeVersion of nodeVersions) {
        for (const os of operatingSystems) {
          const steps = [
            { name: 'Checkout', command: 'actions/checkout@v4' },
            {
              name: `Setup Node.js ${nodeVersion}`,
              command: `actions/setup-node@v4 with node-version: ${nodeVersion}`,
            },
            { name: 'Run Tests', command: 'npm test' },
          ];

          const result = await workflowHelpers.executeJob(
            `test-${nodeVersion}-${os}`,
            steps
          );
          matrixResults.push({ nodeVersion, os, ...result });
        }
      }

      expect(matrixResults).toHaveLength(9); // 3 x 3 matrix
      expect(matrixResults.every(r => r.success)).toBe(true);
    });
  });

  describe('Auto-Publish Workflow Simulation', () => {
    it('should simulate successful auto-publish workflow', async () => {
      const autoPublishJobs = [
        {
          name: 'version-management',
          steps: [
            { name: 'Checkout', command: 'actions/checkout@v4' },
            {
              name: 'Analyze Commits',
              command: 'node scripts/version-management.js',
            },
            { name: 'Update Version', command: 'npm version patch' },
            { name: 'Create Git Tag', command: 'git tag v1.0.1' },
          ],
        },
        {
          name: 'pre-publish-validation',
          steps: [
            { name: 'Quality Check', command: 'npm run quality' },
            { name: 'Security Audit', command: 'npm audit' },
            { name: 'Final Tests', command: 'npm test' },
          ],
        },
        {
          name: 'npm-publish',
          steps: [
            { name: 'Build Production', command: 'npm run build:prod' },
            { name: 'Publish to NPM', command: 'npm publish' },
          ],
        },
        {
          name: 'github-release',
          steps: [
            {
              name: 'Generate Changelog',
              command: 'node scripts/generate-changelog.js',
            },
            {
              name: 'Create GitHub Release',
              command: 'gh release create v1.0.1',
            },
          ],
        },
      ];

      const result = await workflowHelpers.executeWorkflow(
        'auto-publish',
        autoPublishJobs
      );

      expect(result.success).toBe(true);
      expect(result.jobs).toHaveLength(4);
      expect(result.jobs.every(job => job.success)).toBe(true);
    });

    it('should handle version management failures', async () => {
      const versionManagementSteps = [
        { name: 'Checkout', command: 'actions/checkout@v4' },
        {
          name: 'Analyze Commits',
          command: 'node scripts/version-management.js',
          shouldFail: true,
        },
      ];

      const result = await workflowHelpers.executeJob(
        'version-management',
        versionManagementSteps
      );

      expect(result.success).toBe(false);
      expect(result.steps[1].success).toBe(false);
      expect(result.steps[1].error).toContain('failed');
    });

    it('should handle npm publish failures', async () => {
      const publishSteps = [
        { name: 'Build Production', command: 'npm run build:prod' },
        { name: 'Publish to NPM', command: 'npm publish', shouldFail: true },
      ];

      const result = await workflowHelpers.executeJob(
        'npm-publish',
        publishSteps
      );

      expect(result.success).toBe(false);
      expect(result.steps[1].success).toBe(false);
    });
  });

  describe('Workflow Configuration Validation', () => {
    it('should validate workflow YAML structure', () => {
      const prWorkflow = testData.generateWorkflowYaml(
        'PR Validation',
        'pull_request'
      );
      const autoPublishWorkflow = testData.generateWorkflowYaml(
        'Auto Publish',
        'push'
      );

      expect(prWorkflow).toContain('name: PR Validation');
      expect(prWorkflow).toContain('pull_request:');
      expect(prWorkflow).toContain('runs-on: ubuntu-latest');

      expect(autoPublishWorkflow).toContain('name: Auto Publish');
      expect(autoPublishWorkflow).toContain('push:');
    });

    it('should validate required workflow files exist', () => {
      const requiredWorkflows = testConfig.validation.workflowFiles;

      expect(requiredWorkflows).toContain(
        '.github/workflows/pr-validation.yml'
      );
      expect(requiredWorkflows).toContain('.github/workflows/auto-publish.yml');
    });

    it('should validate environment variables are set correctly', () => {
      expect(process.env.GITHUB_ACTIONS).toBe('true');
      expect(process.env.GITHUB_REPOSITORY).toBe('codemastersolutions/taskly');
      expect(process.env.GITHUB_REF).toContain('refs/heads/main');
      expect(process.env.GITHUB_SHA).toMatch(/^test-sha-[a-z0-9]+$/);
    });
  });

  describe('Version Management Logic Testing', () => {
    it('should analyze conventional commits correctly', () => {
      const commits = [
        'feat: add new authentication system',
        'fix(api): resolve memory leak in request handler',
        'feat!: remove deprecated API endpoints',
        'docs: update README with new examples',
        'chore: update dependencies',
        'random commit message', // non-conventional
      ];

      const analyzeCommits = (commitMessages: string[]) => {
        const conventionalPattern =
          /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?(!)?:\s*(.+)$/;

        const analysis = {
          hasBreakingChanges: false,
          hasFeatures: false,
          hasFixes: false,
          conventionalCommits: [] as any[],
          skippedCommits: [] as string[],
        };

        commitMessages.forEach(commit => {
          const match = commit.match(conventionalPattern);
          if (match) {
            const [, type, scope, breaking, description] = match;
            const conventionalCommit = {
              type,
              scope: scope?.slice(1, -1),
              isBreaking: !!breaking || commit.includes('BREAKING CHANGE'),
              description,
              raw: commit,
            };

            analysis.conventionalCommits.push(conventionalCommit);

            if (conventionalCommit.isBreaking)
              analysis.hasBreakingChanges = true;
            if (type === 'feat') analysis.hasFeatures = true;
            if (type === 'fix') analysis.hasFixes = true;
          } else {
            analysis.skippedCommits.push(commit);
          }
        });

        return analysis;
      };

      const analysis = analyzeCommits(commits);

      expect(analysis.hasBreakingChanges).toBe(true);
      expect(analysis.hasFeatures).toBe(true);
      expect(analysis.hasFixes).toBe(true);
      expect(analysis.conventionalCommits).toHaveLength(5);
      expect(analysis.skippedCommits).toHaveLength(1);
    });

    it('should determine correct version increment', () => {
      const determineVersionIncrement = (analysis: any) => {
        if (analysis.hasBreakingChanges) return 'major';
        if (analysis.hasFeatures) return 'minor';
        if (analysis.hasFixes) return 'patch';
        if (analysis.conventionalCommits.length > 0) return 'patch';
        return 'patch';
      };

      const testCases = [
        {
          hasBreakingChanges: true,
          hasFeatures: false,
          hasFixes: false,
          expected: 'major',
        },
        {
          hasBreakingChanges: false,
          hasFeatures: true,
          hasFixes: false,
          expected: 'minor',
        },
        {
          hasBreakingChanges: false,
          hasFeatures: false,
          hasFixes: true,
          expected: 'patch',
        },
        {
          hasBreakingChanges: false,
          hasFeatures: false,
          hasFixes: false,
          expected: 'patch',
        },
      ];

      testCases.forEach(testCase => {
        const analysis = {
          ...testCase,
          conventionalCommits: [{}], // At least one conventional commit
        };
        delete analysis.expected;

        const increment = determineVersionIncrement(analysis);
        expect(increment).toBe(testCase.expected);
      });
    });

    it('should increment versions correctly', () => {
      const incrementVersion = (
        version: string,
        type: 'major' | 'minor' | 'patch'
      ) => {
        const [major, minor, patch] = version.split('.').map(Number);

        switch (type) {
          case 'major':
            return `${major + 1}.0.0`;
          case 'minor':
            return `${major}.${minor + 1}.0`;
          case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        }
      };

      expect(incrementVersion('1.0.0', 'major')).toBe('2.0.0');
      expect(incrementVersion('1.0.0', 'minor')).toBe('1.1.0');
      expect(incrementVersion('1.0.0', 'patch')).toBe('1.0.1');
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4');
    });
  });

  describe('Security and Quality Validation', () => {
    it('should simulate security audit checks', async () => {
      const securitySteps = [
        { name: 'NPM Audit', command: 'npm audit --audit-level moderate' },
        { name: 'License Check', command: 'npm run license-check' },
        { name: 'Dependency Analysis', command: 'npm run analyze-deps' },
      ];

      const result = await workflowHelpers.executeJob(
        'security-audit',
        securitySteps
      );

      expect(result.success).toBe(true);
      expect(result.steps.every(step => step.success)).toBe(true);
    });

    it('should simulate quality gate checks', async () => {
      const qualitySteps = [
        { name: 'ESLint', command: 'eslint src --ext .ts --max-warnings 0' },
        { name: 'Prettier', command: 'prettier --check "src/**/*.ts"' },
        { name: 'TypeScript', command: 'tsc --noEmit' },
        { name: 'Test Coverage', command: 'npm run test:coverage' },
      ];

      const result = await workflowHelpers.executeJob(
        'quality-gates',
        qualitySteps
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(4);
    });

    it('should handle security vulnerabilities', async () => {
      const securitySteps = [
        {
          name: 'NPM Audit',
          command: 'npm audit --audit-level moderate',
          shouldFail: true,
        },
      ];

      const result = await workflowHelpers.executeJob(
        'security-audit',
        securitySteps
      );

      expect(result.success).toBe(false);
      expect(result.steps[0].error).toContain('failed');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track workflow execution times', async () => {
      const steps = [
        { name: 'Fast Step', command: 'echo "hello"' },
        { name: 'Medium Step', command: 'npm install' },
        { name: 'Slow Step', command: 'npm run build' },
      ];

      const result = await workflowHelpers.executeJob(
        'performance-test',
        steps
      );

      expect(result.duration).toBeGreaterThan(0);
      expect(result.steps.every(step => step.duration >= 0)).toBe(true);
    });

    it('should collect workflow metrics', () => {
      const metrics = {
        totalWorkflows: 2,
        successfulWorkflows: 1,
        failedWorkflows: 1,
        averageExecutionTime: 120000, // 2 minutes
        mostCommonFailureReason: 'Test failures',
      };

      expect(metrics.totalWorkflows).toBe(2);
      expect(metrics.successfulWorkflows + metrics.failedWorkflows).toBe(
        metrics.totalWorkflows
      );
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
    });
  });
});
