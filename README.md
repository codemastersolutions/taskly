# Taskly

[![npm version](https://badge.fury.io/js/%40codemastersolutions%2Ftaskly.svg)](https://badge.fury.io/js/%40codemastersolutions%2Ftaskly)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Zero-dependency TypeScript library for parallel command execution with visual identification and multi-package manager support.

## ✨ Features

- 🚀 **Zero Dependencies** - No external runtime dependencies
- ⚡ **Parallel Execution** - Run multiple commands simultaneously
- 🎨 **Visual Identification** - Color-coded output with custom identifiers
- 📦 **Multi-Package Manager** - Support for npm, yarn, pnpm, and bun
- 🔧 **TypeScript First** - Full TypeScript support with complete type definitions
- 🌐 **Dual Format** - CommonJS and ESM support
- 🛡️ **Secure** - Input validation and command sanitization
- 📱 **CLI & API** - Use as CLI tool or programmatic library

## 📦 Installation

```bash
# npm
npm install @codemastersolutions/taskly

# yarn
yarn add @codemastersolutions/taskly

# pnpm
pnpm add @codemastersolutions/taskly

# bun
bun add @codemastersolutions/taskly
```

## 🚀 Quick Start

### CLI Usage

```bash
# Run multiple commands in parallel
taskly "npm run dev" "npm run test:watch"

# With custom names and colors
taskly --names "dev,test" --colors "blue,green" "npm run dev" "npm run test"

# Kill all tasks when one fails
taskly --kill-others-on-fail "npm start" "npm run test"

# Specify package manager
taskly --package-manager yarn "yarn dev" "yarn test"

# Limit concurrency
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"
```

### Programmatic Usage

```typescript
import { TaskRunner, runTasks } from '@codemastersolutions/taskly';

// Simple usage with convenience function
const results = await runTasks([
  { command: 'npm run build' },
  { command: 'npm run test' }
]);

// Advanced usage with TaskRunner
const runner = new TaskRunner({
  tasks: [
    { 
      command: 'npm run dev', 
      identifier: 'dev', 
      color: 'blue',
      packageManager: 'npm'
    },
    { 
      command: 'npm run test:watch', 
      identifier: 'test', 
      color: 'green',
      packageManager: 'npm'
    }
  ],
  killOthersOnFail: true,
  maxConcurrency: 2
});

const results = await runner.execute();
```

## 📖 CLI Reference

### Basic Syntax

```bash
taskly [options] <command1> [command2] [...]
```

### Options

| Option | Alias | Description | Type | Default |
|--------|-------|-------------|------|---------|
| `--help` | `-h` | Show help information | boolean | - |
| `--version` | `-v` | Show version number | boolean | - |
| `--names` | `-n` | Comma-separated list of custom names | string | auto-generated |
| `--colors` | `-c` | Comma-separated list of colors | string | auto-assigned |
| `--package-manager` | `-p` | Package manager to use | string | auto-detect |
| `--kill-others-on-fail` | `-k` | Kill all tasks when one fails | boolean | false |
| `--max-concurrency` | `-m` | Maximum concurrent tasks | number | unlimited |
| `--config` | - | Path to configuration file | string | - |
| `--verbose` | `-V` | Enable verbose output | boolean | false |

### Package Managers

Taskly supports automatic detection and manual specification of package managers:

- **npm** - Default fallback
- **yarn** - Detected via `yarn.lock`
- **pnpm** - Detected via `pnpm-lock.yaml`
- **bun** - Detected via `bun.lockb`

### Colors

Available colors for output identification:

- `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`
- `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`

## 🔧 Configuration File

Create a `taskly.config.json` file for reusable configurations:

```json
{
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "dev",
      "color": "blue",
      "packageManager": "npm"
    },
    {
      "command": "npm run test:watch",
      "identifier": "test",
      "color": "green",
      "packageManager": "npm"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 2,
  "verbose": false
}
```

Use with:

```bash
taskly --config taskly.config.json
```

## 📚 API Reference

### TaskConfig

```typescript
interface TaskConfig {
  command: string;              // Command to execute
  identifier?: string;          // Custom identifier (auto-generated if not provided)
  color?: string;              // Output color (auto-assigned if not provided)
  packageManager?: PackageManager; // Package manager to use
  cwd?: string;                // Working directory
}
```

### TasklyOptions

```typescript
interface TasklyOptions {
  tasks: TaskConfig[];         // Array of tasks to execute
  killOthersOnFail?: boolean;  // Kill all tasks when one fails
  maxConcurrency?: number;     // Maximum concurrent tasks
  prefix?: string;             // Output prefix format
  timestampFormat?: string;    // Timestamp format for output
}
```

### TaskResult

```typescript
interface TaskResult {
  identifier: string;          // Task identifier
  exitCode: number;           // Process exit code
  output: string[];           // Captured output lines
  error?: string;             // Error message if failed
  duration: number;           // Execution duration in milliseconds
}
```

### Core Classes

#### TaskRunner

Main class for executing tasks:

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';

const runner = new TaskRunner(options);
const results = await runner.execute(tasks);
```

#### ColorManager

Manage colors for task output:

```typescript
import { ColorManager } from '@codemastersolutions/taskly/core';

const colorManager = new ColorManager();
const coloredOutput = colorManager.colorize('Hello', 'blue');
```

#### PackageManagerDetector

Detect and validate package managers:

```typescript
import { PackageManagerDetector } from '@codemastersolutions/taskly/core';

const detector = new PackageManagerDetector();
const pm = await detector.detect('/path/to/project');
```

## 🌍 Examples

### Development Workflow

```bash
# Start dev server and watch tests
taskly --names "dev,test" --kill-others-on-fail "npm run dev" "npm run test:watch"
```

### Build Pipeline

```bash
# Run build steps in parallel with limited concurrency
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"
```

### Multi-Project Development

```bash
# Different package managers for different projects
taskly --names "frontend,backend" \
  --package-manager yarn "yarn dev" \
  --package-manager npm "npm run dev"
```

### Custom Colors and Identifiers

```bash
# Custom visual identification
taskly --names "🚀 Server,🧪 Tests" --colors "blue,green" \
  "npm run dev" "npm run test:watch"
```

## 🛠️ Development

### Prerequisites

- Node.js >= 16.0.0
- npm, yarn, pnpm, or bun

### Setup

```bash
# Clone the repository
git clone https://github.com/codemastersolutions/taskly.git
cd taskly

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build for production |
| `npm run dev` | Build and watch for changes |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types |

## 🚀 CI/CD Pipeline

This project uses an automated CI/CD pipeline that ensures code quality and handles automatic publishing to NPM.

### Pull Request Validation

Every pull request is automatically validated through comprehensive checks:

- **Quality Gates**: ESLint, Prettier, and TypeScript type checking
- **Security Audit**: Dependency vulnerability scanning and license validation
- **Test Matrix**: Full test suite across Node.js 16.x, 18.x, 20.x on Ubuntu, Windows, and macOS
- **Build Validation**: Production build verification and bundle size checks

### Automatic Publishing

When a PR is merged to `main`, the system automatically:

1. **Analyzes commits** using conventional commit format to determine version increment
2. **Runs comprehensive validation** including quality checks, security audit, and cross-platform testing
3. **Publishes to NPM** with proper versioning and package optimization
4. **Creates GitHub releases** with automated changelog generation
5. **Provides detailed reports** and notifications

### Conventional Commits

The project follows [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `BREAKING CHANGE:` or `!:` - Breaking changes (major version bump)
- `docs:`, `style:`, `refactor:`, `test:`, `chore:` - No version bump

### Configuration

The CI/CD system is configured through:

- **Workflows**: `.github/workflows/pr-validation.yml` and `.github/workflows/auto-publish.yml`
- **Security Config**: `.github/security-config.yml`
- **Quality Thresholds**: Minimum 80% test coverage, bundle size limits
- **Cross-platform Testing**: Node.js 16.x, 18.x, 20.x on Ubuntu, Windows, macOS

For detailed setup instructions, see [CI/CD Documentation](.github/docs/CICD_GUIDE.md).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for your changes
5. Ensure tests pass: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/codemastersolutions/taskly/issues).

## 📈 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## 🙏 Acknowledgments

- Inspired by [concurrently](https://github.com/open-cli-tools/concurrently)
- Built with TypeScript and modern Node.js practices
- Zero dependencies for maximum compatibility and security