# Contributing to Taskly

Thank you for your interest in contributing to Taskly! This guide will help you get started with contributing to our zero-dependency TypeScript library for parallel command execution.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 16.0.0
- **npm** >= 7.0.0 (or yarn, pnpm, bun)
- **Git**

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/taskly.git
   cd taskly
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/codemastersolutions/taskly.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```

## 🛠️ Development Setup

### Project Structure

```
taskly/
├── src/                    # Source code
│   ├── cli/               # CLI-related code
│   ├── core/              # Core functionality
│   ├── errors/            # Error handling
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── src/__tests__/         # Test files
├── examples/              # Usage examples
├── docs/                  # Documentation
├── scripts/               # Build and development scripts
└── dist/                  # Compiled output (generated)
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the project for production |
| `npm run dev` | Build and watch for changes |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types |
| `npm run quality` | Run all quality checks |

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Run quality checks**:
   ```bash
   npm run quality
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## 📝 Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- **Bug fixes** - Fix issues in the codebase
- **Features** - Add new functionality
- **Documentation** - Improve or add documentation
- **Tests** - Add or improve test coverage
- **Performance** - Optimize existing code
- **Refactoring** - Improve code structure without changing functionality

### Before You Start

1. **Check existing issues** to see if your contribution is already being worked on
2. **Create an issue** to discuss major changes before implementing them
3. **Read the documentation** to understand the project architecture
4. **Review recent pull requests** to understand the contribution style

### Issue Guidelines

When creating an issue, please:

- Use a clear and descriptive title
- Provide a detailed description of the problem or feature request
- Include steps to reproduce (for bugs)
- Add relevant labels
- Include your environment details (Node.js version, OS, etc.)

#### Bug Report Template

```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. See error

**Expected Behavior**
What you expected to happen.

**Environment**
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.0.0]
- Taskly: [e.g., 1.0.0]

**Additional Context**
Any other context about the problem.
```

#### Feature Request Template

```markdown
**Feature Description**
A clear description of what you want to happen.

**Use Case**
Describe the use case and why this feature would be valuable.

**Proposed Solution**
Describe how you envision this feature working.

**Alternatives Considered**
Any alternative solutions you've considered.
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure all tests pass**: `npm test`
2. **Run quality checks**: `npm run quality`
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Update CHANGELOG.md** if applicable

### Pull Request Guidelines

1. **Use a clear title** that describes the change
2. **Fill out the PR template** completely
3. **Link related issues** using keywords (e.g., "Fixes #123")
4. **Keep changes focused** - one feature/fix per PR
5. **Write good commit messages** following conventional commits

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(cli): add --max-concurrency option
fix(core): resolve memory leak in process manager
docs: update API documentation for TaskRunner
test(utils): add tests for validation functions
```

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)
```

## 📏 Coding Standards

### TypeScript Guidelines

1. **Use strict TypeScript configuration**
2. **Prefer interfaces over types** for object shapes
3. **Use explicit return types** for public methods
4. **Avoid `any` type** - use proper typing
5. **Use meaningful variable names**

### Code Style

We use ESLint and Prettier for consistent code formatting:

```typescript
// ✅ Good
interface TaskConfig {
  command: string;
  identifier?: string;
  color?: string;
}

class TaskRunner {
  private readonly options: TasklyOptions;

  constructor(options: TasklyOptions) {
    this.options = options;
  }

  public async execute(): Promise<TaskResult[]> {
    // Implementation
  }
}

// ❌ Bad
interface taskConfig {
  command: any;
  identifier: any;
}

class taskRunner {
  options: any;
  
  constructor(opts: any) {
    this.options = opts;
  }
  
  execute() {
    // Implementation
  }
}
```

### File Organization

1. **One class per file** (with related interfaces)
2. **Use barrel exports** in index files
3. **Group imports** logically:
   ```typescript
   // Node.js built-ins
   import { spawn } from 'child_process';
   import { join } from 'path';
   
   // Third-party (we have none, but if we did)
   // import thirdParty from 'third-party';
   
   // Internal imports
   import { TaskConfig } from '../types/index.js';
   import { validateCommand } from '../utils/validation.js';
   ```

### Error Handling

1. **Use custom error classes** for domain-specific errors
2. **Provide meaningful error messages**
3. **Include error codes** for programmatic handling
4. **Handle async errors** properly

```typescript
// ✅ Good
throw new TasklyError(
  'Package manager not found: yarn',
  ERROR_CODES.PM_NOT_FOUND,
  'build-task'
);

// ❌ Bad
throw new Error('Something went wrong');
```

## 🧪 Testing Guidelines

### Test Structure

We use Vitest for testing. Tests should be:

1. **Fast** - Unit tests should run quickly
2. **Isolated** - Tests should not depend on each other
3. **Deterministic** - Same input should always produce same output
4. **Readable** - Test names should clearly describe what they test

### Test Organization

```
src/__tests__/
├── cli/                   # CLI tests
├── core/                  # Core functionality tests
├── errors/                # Error handling tests
├── utils/                 # Utility function tests
└── helpers/               # Test helper functions
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskRunner } from '../core/task-runner.js';

describe('TaskRunner', () => {
  let runner: TaskRunner;

  beforeEach(() => {
    runner = new TaskRunner({
      tasks: [{ command: 'echo "test"' }]
    });
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('should execute tasks successfully', async () => {
    const results = await runner.execute();
    
    expect(results).toHaveLength(1);
    expect(results[0].exitCode).toBe(0);
    expect(results[0].identifier).toBeDefined();
  });

  it('should handle task failures gracefully', async () => {
    const failingRunner = new TaskRunner({
      tasks: [{ command: 'exit 1' }]
    });

    const results = await failingRunner.execute();
    
    expect(results[0].exitCode).toBe(1);
    expect(results[0].error).toBeDefined();
  });
});
```

### Test Coverage

- **Minimum coverage**: 90%
- **Focus on critical paths** and edge cases
- **Mock external dependencies** appropriately
- **Test both success and failure scenarios**

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- task-runner.test.ts

# Run tests matching pattern
npm test -- --grep "TaskRunner"
```

## 📚 Documentation

### Documentation Standards

1. **Keep documentation up-to-date** with code changes
2. **Use clear, concise language**
3. **Include code examples** for complex features
4. **Document public APIs** thoroughly
5. **Provide usage examples** for different scenarios

### Types of Documentation

1. **README files** - Project overview and quick start
2. **API documentation** - Detailed API reference
3. **Examples** - Practical usage examples
4. **Inline comments** - Code documentation
5. **CHANGELOG** - Version history and changes

### Writing Documentation

- Use **active voice** when possible
- **Start with examples** before diving into details
- **Include both simple and advanced examples**
- **Cross-reference related documentation**
- **Keep examples up-to-date** with current API

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Release Checklist

1. **Update version** in package.json
2. **Update CHANGELOG.md** with new version details
3. **Run full test suite**: `npm test`
4. **Run quality checks**: `npm run quality`
5. **Build project**: `npm run build`
6. **Create git tag**: `git tag v1.0.0`
7. **Push changes**: `git push && git push --tags`
8. **GitHub Actions** will automatically publish to npm

### Changelog Format

```markdown
## [1.0.0] - 2024-01-15

### Added
- New feature X
- Support for Y

### Changed
- Improved performance of Z
- Updated API for better usability

### Fixed
- Bug in feature A
- Memory leak in component B

### Deprecated
- Old API method (use newMethod instead)

### Removed
- Deprecated feature from v0.9.0

### Security
- Fixed vulnerability in dependency X
```

## 🆘 Getting Help

### Community Support

- **GitHub Issues** - For bug reports and feature requests
- **GitHub Discussions** - For questions and community discussions
- **Documentation** - Check our comprehensive docs first

### Maintainer Contact

For security issues or urgent matters, contact the maintainers directly:

- Email: [security@codemastersolutions.com](mailto:security@codemastersolutions.com)
- GitHub: [@codemastersolutions](https://github.com/codemastersolutions)

## 🙏 Recognition

Contributors will be recognized in:

- **CONTRIBUTORS.md** file
- **GitHub contributors** section
- **Release notes** for significant contributions
- **Special thanks** in documentation

## 📄 License

By contributing to Taskly, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Taskly! Your efforts help make this project better for everyone. 🎉