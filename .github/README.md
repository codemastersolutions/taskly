# CI/CD Documentation

This directory contains the complete CI/CD pipeline configuration for the Taskly library. The workflows are designed to ensure code quality, security, and reliable releases.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)
**Triggers:** Push to main/develop, Pull Requests
**Purpose:** Comprehensive testing and validation

- **Multi-platform Testing**: Tests on Ubuntu, Windows, and macOS
- **Multi-version Testing**: Tests on Node.js 16.x, 18.x, and 20.x
- **Quality Gates**: TypeScript, ESLint, Prettier, and security checks
- **Build Validation**: Tests both CommonJS and ESM builds
- **Coverage Reporting**: Uploads coverage to Codecov

### 2. Release Workflow (`release.yml`)
**Triggers:** Git tags (v*), Manual dispatch
**Purpose:** Automated NPM publishing and GitHub releases

- **Version Validation**: Ensures semantic versioning compliance
- **Cross-platform Testing**: Validates builds on all platforms
- **NPM Publishing**: Publishes to NPM registry with proper tagging
- **GitHub Releases**: Creates releases with auto-generated changelogs
- **Rollback Support**: Handles pre-releases and stable releases

### 3. Version Bump Workflow (`version-bump.yml`)
**Triggers:** Manual dispatch
**Purpose:** Automated version management

- **Semantic Versioning**: Supports patch, minor, major, and prerelease bumps
- **Changelog Generation**: Auto-updates CHANGELOG.md
- **Git Tagging**: Creates and pushes version tags
- **Release Triggering**: Optionally triggers release workflow

### 4. Security Scanning (`security.yml`)
**Triggers:** Push, Pull Requests, Daily schedule
**Purpose:** Continuous security monitoring

- **Dependency Scanning**: NPM audit for vulnerabilities
- **Code Quality**: ESLint and Prettier validation
- **Bundle Analysis**: Size monitoring and optimization alerts
- **Automated Reporting**: Security summaries and alerts

### 5. Quality Gates (`quality-gates.yml`)
**Triggers:** Pull Requests, Push to main/develop
**Purpose:** Comprehensive quality validation

- **4-Stage Validation**:
  1. Code Standards (TypeScript, ESLint, Prettier)
  2. Test Coverage (90% minimum)
  3. Security & Dependencies (Vulnerability scanning)
  4. Build & Bundle (Size limits, functionality tests)

### 6. Monitoring & Alerts (`monitoring.yml`)
**Triggers:** Twice daily schedule, Manual dispatch
**Purpose:** Proactive health monitoring

- **Dependency Health**: Outdated and deprecated package detection
- **Performance Monitoring**: Build and test performance tracking
- **Security Monitoring**: Continuous vulnerability scanning
- **Automated Issues**: Creates GitHub issues for failures

### 7. Continuous Testing (`continuous-testing.yml`)
**Triggers:** Every 6 hours, Manual dispatch
**Purpose:** Ongoing test suite validation

- **Scheduled Testing**: Regular test execution
- **Test Health Checks**: Performance and reliability monitoring
- **Failure Reporting**: Automated issue creation for failures

### 8. Pre-commit Checks (`pre-commit.yml`)
**Triggers:** Pull Requests, Push to main/develop
**Purpose:** Fast feedback for developers

- **Quick Validation**: Essential checks before full CI
- **Coverage Validation**: Ensures minimum coverage requirements
- **Changed Test Detection**: Runs only relevant tests

## Quality Standards

### Code Quality Requirements
- **TypeScript**: Strict mode, no compilation errors
- **ESLint**: Zero errors, warnings allowed but discouraged
- **Prettier**: Consistent code formatting
- **Test Coverage**: Minimum 90% across all metrics

### Security Requirements
- **Critical/High Vulnerabilities**: Zero tolerance
- **Moderate Vulnerabilities**: Maximum 5 allowed
- **Dependency Updates**: Regular monitoring and updates

### Bundle Size Limits
- **Individual Bundles**: Maximum 50KB per format
- **Total Bundle**: Monitored for growth trends
- **Compression**: Gzip analysis for optimization

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

### Manual Release
```bash
# Trigger version bump
gh workflow run version-bump.yml -f bump_type=minor -f create_release=true

# Or create release from existing tag
gh workflow run release.yml -f version=1.2.0
```

### Security Scan
```bash
# Run security scan manually
gh workflow run security.yml

# Run specific monitoring check
gh workflow run monitoring.yml -f check_type=security
```

### Quality Check
```bash
# Run quality gates manually
gh workflow run quality-gates.yml
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

### Common Issues

1. **NPM Publishing Fails**
   - Check NPM_TOKEN secret is valid
   - Verify package.json version matches release tag
   - Ensure package name is available on NPM

2. **Coverage Failures**
   - Run `npm run test:coverage` locally
   - Check for untested code paths
   - Review coverage thresholds in vitest.config.ts

3. **Security Scan Failures**
   - Run `npm audit` locally
   - Update vulnerable dependencies
   - Consider using `npm audit fix`

4. **Bundle Size Exceeded**
   - Analyze bundle with `npm run build:prod`
   - Check for unnecessary dependencies
   - Consider code splitting or tree shaking

### Debug Commands
```bash
# Local testing
npm run test:ci
npm run quality
npm run build:prod

# Security check
npm audit --audit-level moderate

# Bundle analysis
npm run build:prod && du -sh dist/*
```

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