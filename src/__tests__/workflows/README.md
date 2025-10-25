# Workflow Testing Suite

This directory contains comprehensive tests for GitHub Actions workflows and related scripts used in the npm auto-publish system.

## Test Structure

### Unit Tests for Version Management Scripts

#### `workflow-scripts.test.ts`
- **Version Management Logic**: Tests for semantic version parsing, incrementing, and validation
- **Git Operations Simulation**: Mock git commands for testing commit analysis and tagging
- **File Operations Simulation**: Mock file system operations for package.json updates
- **Workflow Environment Validation**: Tests for GitHub Actions environment setup

#### `comprehensive-workflow.test.ts`
- **Version Parsing and Validation**: Comprehensive semantic version handling
- **Conventional Commit Analysis**: Parsing and analyzing conventional commit messages
- **Git Operations**: Simulated git operations with proper error handling
- **File Operations**: Package.json and other file manipulations

### Integration Tests for Workflows

#### `workflow-integration.test.ts`
- **PR Validation Workflow**: Complete simulation of pull request validation pipeline
- **Auto-Publish Workflow**: End-to-end testing of automatic publishing process
- **Matrix Testing**: Cross-platform and multi-version testing simulation
- **Failure Scenarios**: Comprehensive error handling and recovery testing

#### `simple-workflow.test.ts`
- **Basic Environment Setup**: Simple GitHub Actions environment configuration
- **Core Functionality**: Essential workflow operations without complex dependencies
- **Data Generation**: Test data creation utilities
- **Configuration Validation**: Basic workflow file and environment validation

### Test Environment Configuration

#### `test-config.ts`
- **Environment Setup**: Utilities for creating test environments
- **Mock Configuration**: GitHub Actions mocking and test data generation
- **Validation Helpers**: Environment and configuration validation functions
- **Workflow Simulation**: Helper functions for simulating workflow execution

#### `test-environment.ts`
- **Advanced Environment Setup**: Comprehensive test environment configuration
- **Workflow Validation**: Advanced workflow file and environment validation
- **Test Fixtures**: Creation of test fixtures and mock data
- **Performance Monitoring**: Workflow execution tracking and metrics

## Key Features Tested

### 1. Version Management
- Semantic version parsing and validation
- Version increment logic (major, minor, patch)
- Conventional commit analysis
- Changelog generation

### 2. Git Operations
- Commit history analysis
- Tag creation and management
- Branch protection validation
- Repository state checking

### 3. Workflow Execution
- PR validation pipeline
- Auto-publish workflow
- Matrix testing across environments
- Error handling and recovery

### 4. Environment Validation
- GitHub Actions environment setup
- Node.js version compatibility
- Required dependencies validation
- Configuration file validation

### 5. Security and Quality
- NPM audit simulation
- Code quality checks (ESLint, Prettier, TypeScript)
- Dependency analysis
- License validation

## Running the Tests

### Run All Workflow Tests
```bash
npm test -- src/__tests__/workflows
```

### Run Specific Test Files
```bash
# Simple workflow tests
npx vitest run src/__tests__/workflows/simple-workflow.test.ts

# Comprehensive workflow tests
npx vitest run src/__tests__/workflows/comprehensive-workflow.test.ts

# Integration tests
npx vitest run src/__tests__/workflows/workflow-integration.test.ts
```

### Run with Coverage
```bash
npm run test:coverage -- src/__tests__/workflows
```

## Test Configuration

### Environment Variables
The tests automatically set up GitHub Actions environment variables:
- `GITHUB_ACTIONS=true`
- `GITHUB_WORKSPACE=/github/workspace`
- `GITHUB_REPOSITORY=codemastersolutions/taskly`
- `GITHUB_REF=refs/heads/main`
- `GITHUB_SHA=<generated-sha>`

### Mock Configuration
- **Child Process**: All `execSync` calls are mocked for git and npm commands
- **File System**: File operations are mocked for safe testing
- **GitHub API**: Octokit operations are mocked for branch protection tests

## Test Data Generation

The test suite includes utilities for generating realistic test data:

### Commit Messages
```typescript
const commits = testData.generateCommits(5);
// Generates: ['feat: add feature', 'fix: resolve bug', ...]
```

### Package.json
```typescript
const pkg = testData.generatePackageJson('1.2.3');
// Generates complete package.json with specified version
```

### Git SHAs
```typescript
const shas = testData.generateShas(3);
// Generates: ['abc123...', 'def456...', ...]
```

## Workflow Simulation

### PR Validation Simulation
```typescript
const result = await workflowHelpers.executeJob('pr-validation', [
  { name: 'Checkout', command: 'actions/checkout@v4' },
  { name: 'ESLint', command: 'npm run lint' },
  { name: 'Tests', command: 'npm test' },
]);
```

### Auto-Publish Simulation
```typescript
const result = await workflowHelpers.executeWorkflow('auto-publish', [
  { name: 'version-management', steps: [...] },
  { name: 'npm-publish', steps: [...] },
]);
```

## Error Handling

The tests include comprehensive error handling scenarios:
- Git command failures
- File system errors
- Network timeouts
- Invalid configurations
- Security vulnerabilities
- Build failures

## Performance Monitoring

Tests include performance tracking:
- Execution time measurement
- Memory usage monitoring
- Success/failure rate tracking
- Average duration calculation

## Best Practices

### Test Isolation
- Each test cleans up environment variables
- Mocks are reset between tests
- No shared state between test cases

### Realistic Simulation
- Uses actual command patterns from workflows
- Generates realistic test data
- Simulates real-world failure scenarios

### Comprehensive Coverage
- Unit tests for individual functions
- Integration tests for complete workflows
- Environment validation tests
- Performance and monitoring tests

## Troubleshooting

### Common Issues

1. **Mock Not Working**: Ensure mocks are properly set up in `beforeEach`
2. **Environment Variables**: Check that cleanup happens in `afterEach`
3. **Async Operations**: Use proper `await` for async test functions
4. **Type Errors**: Ensure proper TypeScript types for mock returns

### Debug Mode
```bash
# Run with verbose output
npx vitest run src/__tests__/workflows --reporter=verbose

# Run with debug information
DEBUG=* npx vitest run src/__tests__/workflows
```

## Contributing

When adding new workflow tests:

1. Follow the existing test structure
2. Include both success and failure scenarios
3. Add proper cleanup in `afterEach`
4. Use realistic test data
5. Document any new test utilities
6. Ensure tests are isolated and deterministic

## Requirements Coverage

This test suite covers all requirements from the task:

✅ **Unit tests for version management scripts**
- Semantic version parsing and validation
- Version increment logic
- Conventional commit analysis
- Git operations simulation

✅ **Integration tests for workflows**
- Complete PR validation pipeline
- Auto-publish workflow simulation
- Cross-environment matrix testing
- Error handling and recovery

✅ **Test environment configuration for workflow validation**
- GitHub Actions environment setup
- Mock configuration and data generation
- Workflow file validation
- Performance monitoring and metrics