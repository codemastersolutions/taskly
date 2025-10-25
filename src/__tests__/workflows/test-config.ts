/**
 * Test configuration for workflow validation
 * This module provides configuration and utilities for testing GitHub Actions workflows
 */

export interface WorkflowTestConfig {
  // Environment configuration
  environment: {
    nodeVersion: string;
    npmVersion: string;
    gitRepository: string;
    gitBranch: string;
    workspaceRoot: string;
  };

  // Mock configuration
  mocks: {
    enableGitHubActions: boolean;
    enableFileSystem: boolean;
    enableChildProcess: boolean;
  };

  // Test timeouts
  timeouts: {
    unitTests: number;
    integrationTests: number;
    workflowSimulation: number;
  };

  // Validation rules
  validation: {
    requiredEnvVars: string[];
    minimumNodeVersion: number;
    requiredFiles: string[];
    workflowFiles: string[];
  };
}

export const defaultTestConfig: WorkflowTestConfig = {
  environment: {
    nodeVersion: process.version,
    npmVersion: '8.0.0',
    gitRepository: 'codemastersolutions/taskly',
    gitBranch: 'main',
    workspaceRoot: process.cwd(),
  },

  mocks: {
    enableGitHubActions: true,
    enableFileSystem: true,
    enableChildProcess: true,
  },

  timeouts: {
    unitTests: 5000,
    integrationTests: 10000,
    workflowSimulation: 15000,
  },

  validation: {
    requiredEnvVars: [
      'GITHUB_ACTIONS',
      'GITHUB_WORKSPACE',
      'GITHUB_REPOSITORY',
      'GITHUB_REF',
      'GITHUB_SHA',
    ],
    minimumNodeVersion: 16,
    requiredFiles: ['package.json', 'tsconfig.json'],
    workflowFiles: [
      '.github/workflows/pr-validation.yml',
      '.github/workflows/auto-publish.yml',
    ],
  },
};

/**
 * Create a test environment for workflow validation
 */
export function createTestEnvironment(
  config: Partial<WorkflowTestConfig> = {}
) {
  const finalConfig = { ...defaultTestConfig, ...config };

  // Set up GitHub Actions environment variables
  if (finalConfig.mocks.enableGitHubActions) {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_WORKSPACE = finalConfig.environment.workspaceRoot;
    process.env.GITHUB_REPOSITORY = finalConfig.environment.gitRepository;
    process.env.GITHUB_REF = `refs/heads/${finalConfig.environment.gitBranch}`;
    process.env.GITHUB_SHA =
      'test-sha-' + Math.random().toString(36).substr(2, 9);
    process.env.GITHUB_RUN_ID = Math.floor(Math.random() * 1000000).toString();
    process.env.GITHUB_RUN_NUMBER = '1';
    process.env.GITHUB_ACTOR = 'github-actions[bot]';
    process.env.GITHUB_EVENT_NAME = 'push';
  }

  return finalConfig;
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment() {
  const envVarsToClean = [
    'GITHUB_ACTIONS',
    'GITHUB_WORKSPACE',
    'GITHUB_REPOSITORY',
    'GITHUB_REF',
    'GITHUB_SHA',
    'GITHUB_RUN_ID',
    'GITHUB_RUN_NUMBER',
    'GITHUB_ACTOR',
    'GITHUB_EVENT_NAME',
    'GITHUB_EVENT_PATH',
    'GITHUB_WORKFLOW',
    'GITHUB_JOB',
    'GITHUB_ACTION',
    'GITHUB_STEP_SUMMARY',
  ];

  envVarsToClean.forEach(varName => {
    delete process.env[varName];
  });
}

/**
 * Validate test environment
 */
export function validateTestEnvironment(config: WorkflowTestConfig) {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < config.validation.minimumNodeVersion) {
    errors.push(
      `Node.js version ${nodeVersion} is below minimum ${config.validation.minimumNodeVersion}`
    );
  }

  // Check required environment variables (if GitHub Actions mocking is enabled)
  if (config.mocks.enableGitHubActions) {
    config.validation.requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Environment variable ${varName} is not set`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Mock GitHub Actions core functions
 */
export function createGitHubActionsMocks() {
  return {
    setOutput: (name: string, value: string) => {
      console.log(`::set-output name=${name}::${value}`);
    },

    setFailed: (message: string) => {
      console.log(`::error::${message}`);
      process.exitCode = 1;
    },

    notice: (message: string) => {
      console.log(`::notice::${message}`);
    },

    warning: (message: string) => {
      console.log(`::warning::${message}`);
    },

    info: (message: string) => {
      console.log(message);
    },

    debug: (message: string) => {
      console.log(`::debug::${message}`);
    },

    group: (name: string, fn: () => void) => {
      console.log(`::group::${name}`);
      fn();
      console.log('::endgroup::');
    },

    summary: {
      addHeading: (text: string) => ({ text }),
      addTable: (data: any[]) => ({ data }),
      write: () => Promise.resolve(),
    },
  };
}

/**
 * Test data generators
 */
export const testData = {
  // Generate mock commit messages
  generateCommits: (count: number = 5) => {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
    const scopes = ['auth', 'api', 'ui', 'core', 'utils'];
    const descriptions = [
      'add new functionality',
      'resolve critical bug',
      'update documentation',
      'improve performance',
      'refactor code structure',
    ];

    return Array.from({ length: count }, () => {
      const type = types[Math.floor(Math.random() * types.length)];
      const scope =
        Math.random() > 0.5
          ? `(${scopes[Math.floor(Math.random() * scopes.length)]})`
          : '';
      const breaking = Math.random() > 0.9 ? '!' : '';
      const description =
        descriptions[Math.floor(Math.random() * descriptions.length)];

      return `${type}${scope}${breaking}: ${description}`;
    });
  },

  // Generate mock package.json
  generatePackageJson: (version: string = '1.0.0') => ({
    name: '@codemastersolutions/taskly',
    version,
    description:
      'Zero-dependency TypeScript library for parallel command execution',
    main: './dist/cjs/index.js',
    module: './dist/esm/index.js',
    types: './dist/types/index.d.ts',
    scripts: {
      build: 'npm run build:prod',
      test: 'vitest --run',
      lint: 'eslint src --ext .ts',
      'format:check': 'prettier --check "src/**/*.ts"',
    },
    devDependencies: {
      typescript: '^5.0.0',
      vitest: '^1.0.0',
      eslint: '^8.0.0',
      prettier: '^3.0.0',
    },
  }),

  // Generate mock workflow file content
  generateWorkflowYaml: (name: string, trigger: string) => `
name: ${name}
on:
  ${trigger}:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
`,

  // Generate mock git tags
  generateGitTags: (count: number = 3) => {
    return Array.from({ length: count }, (_, i) => `v1.${i}.0`);
  },

  // Generate mock SHAs
  generateShas: (count: number = 5) => {
    return Array.from({ length: count }, () => {
      // Generate a 40-character SHA by combining multiple random strings
      let sha = '';
      while (sha.length < 40) {
        sha += Math.random().toString(36).substr(2);
      }
      return sha.substr(0, 40);
    });
  },
};

/**
 * Workflow simulation helpers
 */
export const workflowHelpers = {
  // Simulate workflow step execution
  executeStep: async (
    stepName: string,
    command: string,
    shouldFail: boolean = false
  ) => {
    const startTime = Date.now();

    try {
      if (shouldFail) {
        throw new Error(`Step ${stepName} failed`);
      }

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

      return {
        name: stepName,
        command,
        success: true,
        duration: Date.now() - startTime,
        output: `${stepName} completed successfully`,
      };
    } catch (error) {
      return {
        name: stepName,
        command,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Simulate workflow job execution
  executeJob: async (
    jobName: string,
    steps: Array<{ name: string; command: string; shouldFail?: boolean }>
  ) => {
    const startTime = Date.now();
    const results = [];

    for (const step of steps) {
      const result = await workflowHelpers.executeStep(
        step.name,
        step.command,
        step.shouldFail
      );
      results.push(result);

      // Stop execution if step fails
      if (!result.success) {
        break;
      }
    }

    return {
      name: jobName,
      success: results.every(r => r.success),
      duration: Date.now() - startTime,
      steps: results,
    };
  },

  // Simulate complete workflow execution
  executeWorkflow: async (
    workflowName: string,
    jobs: Array<{
      name: string;
      steps: Array<{ name: string; command: string; shouldFail?: boolean }>;
    }>
  ) => {
    const startTime = Date.now();
    const results = [];

    for (const job of jobs) {
      const result = await workflowHelpers.executeJob(job.name, job.steps);
      results.push(result);

      // Continue with other jobs even if one fails (parallel execution simulation)
    }

    return {
      name: workflowName,
      success: results.every(r => r.success),
      duration: Date.now() - startTime,
      jobs: results,
    };
  },
};
