import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Test environment configuration for workflow validation
 * This module provides utilities to set up and validate test environments
 * for GitHub Actions workflows
 */

export interface TestEnvironment {
  workspaceRoot: string;
  githubWorkspace: string;
  nodeVersion: string;
  npmVersion: string;
  gitRepository: string;
  gitBranch: string;
}

export interface WorkflowTestConfig {
  environment: TestEnvironment;
  mockGitHub: boolean;
  mockNpm: boolean;
  mockFileSystem: boolean;
  timeoutMs: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: TestEnvironment;
}

/**
 * Set up test environment for workflow validation
 */
export function setupTestEnvironment(
  config: Partial<WorkflowTestConfig> = {}
): TestEnvironment {
  const defaultConfig: WorkflowTestConfig = {
    environment: {
      workspaceRoot: process.cwd(),
      githubWorkspace: process.env.GITHUB_WORKSPACE || process.cwd(),
      nodeVersion: process.version,
      npmVersion: 'unknown',
      gitRepository: 'test/repo',
      gitBranch: 'main',
    },
    mockGitHub: true,
    mockNpm: true,
    mockFileSystem: false,
    timeoutMs: 30000,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Set up environment variables
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_WORKSPACE = finalConfig.environment.githubWorkspace;
  process.env.GITHUB_REPOSITORY = finalConfig.environment.gitRepository;
  process.env.GITHUB_REF = `refs/heads/${finalConfig.environment.gitBranch}`;
  process.env.GITHUB_SHA = 'test-sha-123456';
  process.env.GITHUB_RUN_ID = '123456789';
  process.env.GITHUB_RUN_NUMBER = '1';

  // Get actual npm version if not mocking
  if (!finalConfig.mockNpm) {
    try {
      finalConfig.environment.npmVersion = execSync('npm --version', {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      finalConfig.environment.npmVersion = 'unknown';
    }
  }

  return finalConfig.environment;
}

/**
 * Validate test environment for workflow execution
 */
export function validateTestEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const environment = setupTestEnvironment();

  // Check required environment variables
  const requiredEnvVars = [
    'GITHUB_ACTIONS',
    'GITHUB_WORKSPACE',
    'GITHUB_REPOSITORY',
    'GITHUB_REF',
    'GITHUB_SHA',
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    errors.push(
      `Node.js version ${nodeVersion} is not supported. Minimum version is 16.0.0`
    );
  }

  // Check workspace directory
  if (!fs.existsSync(environment.workspaceRoot)) {
    errors.push(
      `Workspace directory does not exist: ${environment.workspaceRoot}`
    );
  }

  // Check package.json
  const packageJsonPath = path.join(environment.workspaceRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    errors.push('package.json not found in workspace root');
  } else {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.version) {
        warnings.push('package.json does not contain a version field');
      }
      if (!packageJson.scripts) {
        warnings.push('package.json does not contain scripts');
      }
    } catch (error) {
      errors.push(
        `Invalid package.json: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Check git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    warnings.push(
      'Not in a git repository - some workflow features may not work'
    );
  }

  // Check npm availability
  try {
    execSync('npm --version', { stdio: 'ignore' });
  } catch (error) {
    errors.push('npm is not available in PATH');
  }

  // Check workflow files
  const workflowDir = path.join(
    environment.workspaceRoot,
    '.github',
    'workflows'
  );
  if (fs.existsSync(workflowDir)) {
    const workflowFiles = fs
      .readdirSync(workflowDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
    if (workflowFiles.length === 0) {
      warnings.push('No workflow files found in .github/workflows');
    }
  } else {
    warnings.push('.github/workflows directory does not exist');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment,
  };
}

/**
 * Create a mock GitHub Actions environment
 */
export function createMockGitHubEnvironment(
  options: {
    repository?: string;
    branch?: string;
    sha?: string;
    runId?: string;
    actor?: string;
  } = {}
) {
  const defaults = {
    repository: 'owner/repo',
    branch: 'main',
    sha: 'abc123def456',
    runId: '123456789',
    actor: 'test-user',
  };

  const config = { ...defaults, ...options };

  // Set GitHub Actions environment variables
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_REPOSITORY = config.repository;
  process.env.GITHUB_REF = `refs/heads/${config.branch}`;
  process.env.GITHUB_SHA = config.sha;
  process.env.GITHUB_RUN_ID = config.runId;
  process.env.GITHUB_ACTOR = config.actor;
  process.env.GITHUB_WORKSPACE = process.cwd();
  process.env.GITHUB_EVENT_NAME = 'push';
  process.env.GITHUB_EVENT_PATH = '/github/workflow/event.json';

  return config;
}

/**
 * Validate workflow YAML files
 */
export function validateWorkflowFiles(
  workflowDir: string = '.github/workflows'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const environment = setupTestEnvironment();

  const fullWorkflowDir = path.join(environment.workspaceRoot, workflowDir);

  if (!fs.existsSync(fullWorkflowDir)) {
    errors.push(`Workflow directory does not exist: ${fullWorkflowDir}`);
    return { valid: false, errors, warnings, environment };
  }

  const workflowFiles = fs
    .readdirSync(fullWorkflowDir)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map(file => path.join(fullWorkflowDir, file));

  if (workflowFiles.length === 0) {
    warnings.push('No workflow files found');
  }

  workflowFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Basic YAML validation
      if (!content.includes('name:')) {
        warnings.push(
          `Workflow file ${path.basename(filePath)} missing name field`
        );
      }

      if (!content.includes('on:')) {
        errors.push(
          `Workflow file ${path.basename(filePath)} missing trigger configuration`
        );
      }

      if (!content.includes('jobs:')) {
        errors.push(
          `Workflow file ${path.basename(filePath)} missing jobs configuration`
        );
      }

      // Check for required workflow files
      const fileName = path.basename(filePath);
      if (fileName === 'pr-validation.yml') {
        if (!content.includes('pull_request')) {
          warnings.push(
            'PR validation workflow should trigger on pull_request events'
          );
        }
      }

      if (fileName === 'auto-publish.yml') {
        if (!content.includes('push')) {
          warnings.push('Auto-publish workflow should trigger on push events');
        }
      }
    } catch (error) {
      errors.push(
        `Error reading workflow file ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment,
  };
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment() {
  // Remove test-specific environment variables
  const testEnvVars = [
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
  ];

  testEnvVars.forEach(varName => {
    delete process.env[varName];
  });
}

/**
 * Create test fixtures for workflow validation
 */
export function createTestFixtures(tempDir: string) {
  // Create basic package.json
  const packageJson = {
    name: 'test-package',
    version: '1.0.0',
    scripts: {
      test: 'vitest --run',
      build: 'tsc',
      lint: 'eslint src',
      'format:check': 'prettier --check src',
    },
  };

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create basic workflow files
  const workflowDir = path.join(tempDir, '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });

  const prValidationWorkflow = `
name: PR Validation
on:
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
`;

  const autoPublishWorkflow = `
name: Auto Publish
on:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Publish
        run: npm publish
`;

  fs.writeFileSync(
    path.join(workflowDir, 'pr-validation.yml'),
    prValidationWorkflow
  );
  fs.writeFileSync(
    path.join(workflowDir, 'auto-publish.yml'),
    autoPublishWorkflow
  );
}

/**
 * Simulate workflow execution environment
 */
export function simulateWorkflowExecution(
  workflowName: string,
  jobName: string
) {
  const environment = createMockGitHubEnvironment();

  // Set workflow-specific environment variables
  process.env.GITHUB_WORKFLOW = workflowName;
  process.env.GITHUB_JOB = jobName;
  process.env.GITHUB_ACTION = `__${jobName}`;
  process.env.GITHUB_STEP_SUMMARY = '/tmp/step-summary.md';

  return {
    environment,
    setOutput: (name: string, value: string) => {
      // Simulate GitHub Actions output
      console.log(`::set-output name=${name}::${value}`);
    },
    setFailed: (message: string) => {
      // Simulate GitHub Actions failure
      console.log(`::error::${message}`);
      process.exitCode = 1;
    },
    notice: (message: string) => {
      console.log(`::notice::${message}`);
    },
    warning: (message: string) => {
      console.log(`::warning::${message}`);
    },
  };
}
