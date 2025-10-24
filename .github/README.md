# CI/CD Documentation

This directory contains the complete CI/CD pipeline configuration for the Taskly library. The workflows are designed to ensure code quality, security, and reliable releases.

## 📚 Documentation Index

### Core Documentation
- **[CI/CD Guide](docs/CICD_GUIDE.md)** - Comprehensive pipeline overview and architecture
- **[Configuration Reference](docs/CONFIGURATION.md)** - Complete configuration options and settings
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Secrets Setup](docs/SECRETS_SETUP.md)** - Security configuration and token management

### Quick Links
- [Workflow Overview](#workflows-overview) - Summary of all workflows
- [Quality Standards](#quality-standards) - Code quality requirements
- [Usage Examples](#usage-examples) - Common workflow operations
- [Monitoring](#monitoring-and-alerts) - Health monitoring and alerts

## Workflows Overview

### 1. PR Validation Workflow (`pr-validation.yml`)
**Triggers:** Pull Requests to main branch
**Purpose:** Comprehensive validation before merge

- **Quality Gates**: ESLint, Prettier, and TypeScript validation
- **Security Audit**: Dependency vulnerability scanning and license validation
- **Test Matrix**: Cross-platform testing (Ubuntu, Windows, macOS) with Node.js 16.x, 18.x, 20.x
- **Build Validation**: Production build verification and bundle size checks
- **Coverage Requirements**: Minimum 80% test coverage across all metrics
- **PR Summary**: Automated status reporting and merge blocking

### 2. Auto-Publish Workflow (`auto-publish.yml`)
**Triggers:** Push to main branch, Manual dispatch
**Purpose:** Automated NPM publishing and GitHub releases

- **Version Management**: Conventional commit analysis and automatic versioning
- **Pre-Publish Validation**: Complete quality and security validation
- **Matrix Testing**: Cross-platform package installation and functionality testing
- **NPM Publishing**: Secure publishing with verification and rollback support
- **GitHub Releases**: Automated changelog generation and asset uploads
- **Post-Publish Tasks**: Comprehensive reporting and notifications

### 3. Monitoring Workflow (`monitoring.yml`)
**Triggers:** Scheduled (daily), Manual dispatch
**Purpose:** Proactive system health monitoring

- **Dependency Health**: Outdated and deprecated package detection
- **Performance Monitoring**: Build and test performance tracking
- **Security Monitoring**: Continuous vulnerability scanning
- **Automated Reporting**: Health metrics and anomaly detection

### Legacy Workflows (Migrated)
The following workflows have been consolidated into the main workflows above:
- `ci.yml.old` - Functionality moved to `pr-validation.yml`
- `release.yml.old` - Functionality moved to `auto-publish.yml`
- `security.yml.old` - Functionality integrated into both main workflows
- `quality-gates.yml.old` - Functionality integrated into `pr-validation.yml`

## Quality Standards

### Code Quality Requirements
- **TypeScript**: Strict mode, no compilation errors
- **ESLint**: Zero errors, warnings treated as errors in CI
- **Prettier**: Consistent code formatting, automatic validation
- **Test Coverage**: Minimum 80% across all metrics (statements, branches, functions, lines)

### Security Requirements
- **Critical Vulnerabilities**: Zero tolerance - blocks PR merge and publishing
- **High Vulnerabilities**: Zero tolerance - blocks PR merge and publishing
- **Moderate Vulnerabilities**: Configurable threshold (default: 10 allowed)
- **License Compliance**: Only approved licenses (MIT, Apache-2.0, BSD variants, ISC)
- **Secret Detection**: Automated scanning for hardcoded secrets

### Build and Bundle Requirements
- **Bundle Size Limit**: Maximum 50KB per format (CJS/ESM)
- **Entry Point Validation**: All declared entry points must exist and be functional
- **Cross-Platform Compatibility**: Must work on Ubuntu, Windows, and macOS
- **Multi-Version Support**: Compatible with Node.js 16.x, 18.x, and 20.x
- **CLI Functionality**: Executable must work correctly across all platforms

## Secrets Configuration

The following secrets must be configured in the GitHub repository:

### Required Secrets
- `NPM_TOKEN`: NPM authentication token for publishing
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Optional Secrets
- `CODECOV_TOKEN`: For enhanced Codecov integration
- `SLACK_WEBHOOK_URL`: For Slack notifications (if implemented)

## Branch Protection Rules

Recommended branch protection settings for `main` branch:

```yaml
Protection Rules:
  - Require pull request reviews: 1 reviewer minimum
  - Require status checks: 
    - CI / Test on Node.js 18.x and ubuntu-latest
    - CI / Quality Gates
    - Quality Gates / Quality Gate Validation
  - Require branches to be up to date: true
  - Restrict pushes: true
  - Allow force pushes: false
  - Allow deletions: false
```

## Usage Examples

### Manual Publishing
```bash
# Force publish even if no changes detected
gh workflow run auto-publish.yml -f force-publish=true

# Run in dry-run mode (no actual publishing)
gh workflow run auto-publish.yml -f dry-run=true

# Normal automatic publishing happens on merge to main
```

### Manual Validation
```bash
# Run PR validation on current branch
gh workflow run pr-validation.yml

# Run monitoring checks
gh workflow run monitoring.yml
```

### Local Development
```bash
# Run the same checks locally before pushing
npm run lint && npm run type-check && npm test && npm run build:prod

# Fix common issues
npm run lint:fix
npm run format
```

## Monitoring and Alerts

### Automated Issue Creation
The workflows automatically create GitHub issues for:
- Continuous testing failures
- Security vulnerabilities
- Performance degradation
- Dependency issues

### Notification Channels
- **GitHub Issues**: Automated issue creation for failures
- **Pull Request Comments**: Coverage reports and quality feedback
- **Workflow Summaries**: Detailed reports in GitHub Actions UI

## Troubleshooting

For detailed troubleshooting information, see the **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)**.

### Quick Fixes

1. **PR Validation Failures**
   ```bash
   # Fix code quality issues
   npm run lint:fix && npm run format
   
   # Check test coverage
   npm run test:coverage
   ```

2. **Security Issues**
   ```bash
   # Fix vulnerabilities
   npm audit fix
   
   # Check for updates
   npm outdated
   ```

3. **Build Issues**
   ```bash
   # Clean and rebuild
   npm run clean && npm run build:prod
   
   # Test CLI functionality
   node dist/cjs/bin/taskly.js --version
   ```

### Getting Help

1. **Check workflow logs** in GitHub Actions for detailed error messages
2. **Review the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)** for comprehensive solutions
3. **Run commands locally** to reproduce and debug issues
4. **Open an issue** with detailed error information if problems persist

## Maintenance

### Regular Tasks
- **Weekly**: Review dependency updates
- **Monthly**: Update GitHub Actions versions
- **Quarterly**: Review and update quality thresholds

### Workflow Updates
When updating workflows:
1. Test changes in a feature branch
2. Validate with manual workflow dispatch
3. Monitor first few automated runs
4. Update documentation as needed

## Performance Metrics

### Target Benchmarks
- **Build Time**: < 30 seconds
- **Test Execution**: < 60 seconds
- **Bundle Size**: < 50KB per format
- **Coverage**: > 90% all metrics

### Monitoring
All workflows include performance monitoring and will alert if benchmarks are exceeded.