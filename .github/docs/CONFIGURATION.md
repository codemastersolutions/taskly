# CI/CD Configuration Reference

This document provides comprehensive information about configuring the CI/CD pipeline for the Taskly project.

## Configuration Files Overview

| File | Purpose | Location |
|------|---------|----------|
| `pr-validation.yml` | PR validation workflow | `.github/workflows/` |
| `auto-publish.yml` | Auto-publish workflow | `.github/workflows/` |
| `security-config.yml` | Security settings | `.github/` |
| `package.json` | Package configuration | Root directory |

## Workflow Configuration

### PR Validation Workflow

#### Environment Variables

```yaml
env:
  NODE_VERSION: '18.x'          # Primary Node.js version for builds
  MIN_COVERAGE: 80              # Minimum test coverage percentage
  MAX_BUNDLE_SIZE_KB: 50        # Maximum bundle size in kilobytes
```

#### Permissions

```yaml
permissions:
  contents: read                # Read repository contents
  pull-requests: write          # Comment on PRs and update status
  checks: write                 # Update status checks
  actions: read                 # Read workflow information
```

#### Concurrency Control

```yaml
concurrency:
  group: pr-validation-${{ github.event.pull_request.number }}
  cancel-in-progress: true      # Cancel previous runs for same PR
```

### Auto-Publish Workflow

#### Environment Variables

```yaml
env:
  NODE_VERSION: '18.x'          # Primary Node.js version
  MIN_COVERAGE: 80              # Minimum test coverage
  REGISTRY_URL: 'https://registry.npmjs.org'  # NPM registry URL
```

#### Permissions

```yaml
permissions:
  contents: write               # Create tags, commits, and releases
  pull-requests: read           # Read PR information for changelog
  packages: write               # Publish to GitHub Packages (if used)
  actions: read                 # Read workflow information
```

#### Manual Trigger Options

```yaml
workflow_dispatch:
  inputs:
    force-publish:
      description: 'Force publish even if no changes detected'
      required: false
      default: false
      type: boolean
    dry-run:
      description: 'Run in dry-run mode (no actual publishing)'
      required: false
      default: false
      type: boolean
```

## Security Configuration

### Security Config File (`.github/security-config.yml`)

```yaml
# Vulnerability audit configuration
audit:
  # Vulnerability thresholds (number of vulnerabilities allowed)
  critical: 0                   # Block any critical vulnerabilities
  high: 0                       # Block any high vulnerabilities  
  moderate: 10                  # Allow up to 10 moderate vulnerabilities
  low: -1                       # Unlimited low vulnerabilities (-1 = no limit)
  
  # Audit level for npm audit command
  level: 'moderate'             # Options: low, moderate, high, critical
  
  # Whether to fail the workflow on vulnerabilities
  fail-on-vulnerabilities: true
  
  # Check for outdated dependencies
  check-outdated: true

# License validation configuration
licenses:
  check: true                   # Enable license checking
  allowed:                      # List of allowed licenses
    - 'MIT'
    - 'Apache-2.0'
    - 'BSD-2-Clause'
    - 'BSD-3-Clause'
    - 'ISC'
    - 'Unlicense'
  
  # Licenses to explicitly deny
  denied:
    - 'GPL-3.0'
    - 'AGPL-3.0'
    - 'LGPL-3.0'

# Secret detection configuration
secrets:
  check: true                   # Enable secret detection
  patterns:                     # Patterns to search for
    - 'password'
    - 'secret'
    - 'token'
    - 'key'
    - 'api_key'
    - 'apikey'
  
  # File patterns to exclude from secret scanning
  exclude-patterns:
    - '*.test.js'
    - '*.spec.ts'
    - 'test/**'
    - 'tests/**'
```

### Customizing Security Settings

#### Vulnerability Thresholds

Adjust vulnerability thresholds based on your security requirements:

```yaml
# Strict security (recommended for production)
audit:
  critical: 0
  high: 0
  moderate: 0
  low: 5

# Moderate security (development/testing)
audit:
  critical: 0
  high: 2
  moderate: 10
  low: -1

# Permissive (not recommended)
audit:
  critical: 1
  high: 5
  moderate: -1
  low: -1
```

#### License Management

Add or remove allowed licenses:

```yaml
licenses:
  allowed:
    - 'MIT'                     # Most permissive
    - 'Apache-2.0'              # Patent protection
    - 'BSD-3-Clause'            # BSD variant
    - 'CC0-1.0'                 # Public domain
    - 'Zlib'                    # Zlib license
```

#### Secret Detection Patterns

Customize secret detection patterns:

```yaml
secrets:
  patterns:
    # API keys
    - 'api[_-]?key'
    - 'apikey'
    
    # Tokens
    - 'access[_-]?token'
    - 'auth[_-]?token'
    - 'bearer[_-]?token'
    
    # Passwords
    - 'password'
    - 'passwd'
    - 'pwd'
    
    # Database URLs
    - 'database[_-]?url'
    - 'db[_-]?url'
    
    # Custom patterns (regex supported)
    - 'sk_[a-zA-Z0-9]{24}'      # Stripe secret key pattern
```

## Package Configuration

### Package.json Settings

#### Publishing Configuration

```json
{
  "name": "@codemastersolutions/taskly",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

#### Entry Points

```json
{
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "bin": {
    "taskly": "dist/cjs/bin/taskly.js"
  },
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

#### Scripts Configuration

```json
{
  "scripts": {
    "prepublishOnly": "npm run quality && npm run build:prod && npm run test",
    "build:prod": "npm run clean && npm run build:cjs && npm run build:esm && npm run build:types",
    "quality": "npm run lint && npm run format:check && npm run type-check",
    "test:ci": "npm test -- --coverage --watchAll=false"
  }
}
```

## Matrix Testing Configuration

### Node.js Version Matrix

Configure which Node.js versions to test:

```yaml
strategy:
  matrix:
    node-version: ['16.x', '18.x', '20.x']  # LTS versions
    # For cutting-edge testing, add:
    # node-version: ['16.x', '18.x', '20.x', '21.x']
```

### Operating System Matrix

Configure which operating systems to test:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    # For specific versions:
    # os: [ubuntu-20.04, windows-2022, macos-12]
```

### Package Manager Matrix

Test with different package managers:

```yaml
strategy:
  matrix:
    package-manager: [npm, yarn, pnpm]
    include:
      - package-manager: npm
        install-cmd: 'npm ci'
      - package-manager: yarn
        install-cmd: 'yarn install --frozen-lockfile'
      - package-manager: pnpm
        install-cmd: 'pnpm install --frozen-lockfile'
```

## Environment Configuration

### Development Environment

```yaml
# For development/testing branches
env:
  NODE_VERSION: '18.x'
  MIN_COVERAGE: 70              # Lower threshold for development
  MAX_BUNDLE_SIZE_KB: 60        # More lenient size limit
  SECURITY_AUDIT_LEVEL: 'high'  # Less strict security
```

### Production Environment

```yaml
# For main/production branch
env:
  NODE_VERSION: '18.x'
  MIN_COVERAGE: 80              # Strict coverage requirement
  MAX_BUNDLE_SIZE_KB: 50        # Strict size limit
  SECURITY_AUDIT_LEVEL: 'moderate'  # Strict security
```

### Environment-Specific Secrets

Use GitHub Environments for different deployment stages:

```yaml
# Production environment
environment:
  name: production
  url: https://www.npmjs.com/package/@codemastersolutions/taskly

# Staging environment  
environment:
  name: staging
  url: https://staging.npmjs.com/package/@codemastersolutions/taskly
```

## Notification Configuration

### Slack Integration

Configure Slack notifications (optional):

```yaml
# Add to workflow steps
- name: Notify Slack on success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: success
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Notifications

Configure email notifications:

```yaml
- name: Send email notification
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: 'CI/CD Pipeline Failed'
    to: maintainer@example.com
    from: ci-cd@example.com
```

## Performance Optimization

### Caching Configuration

#### Node.js Dependencies

```yaml
- name: Setup Node.js with cache
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'npm'                # Enable npm cache
    cache-dependency-path: 'package-lock.json'
```

#### Custom Cache Configuration

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Parallel Job Execution

```yaml
jobs:
  quality-gates:
    # Runs in parallel with other jobs
    
  security-audit:
    # Runs in parallel with quality-gates
    
  test-matrix:
    needs: []                   # No dependencies, runs immediately
```

## Monitoring Configuration

### Workflow Metrics

Track workflow performance:

```yaml
- name: Collect metrics
  uses: ./.github/actions/collect-metrics
  with:
    workflow-name: ${{ github.workflow }}
    job-name: ${{ github.job }}
    start-time: ${{ steps.start.outputs.time }}
```

### Bundle Size Tracking

Monitor bundle size over time:

```yaml
- name: Track bundle size
  run: |
    BUNDLE_SIZE=$(stat -c%s dist/cjs/index.js)
    echo "bundle-size=$BUNDLE_SIZE" >> $GITHUB_OUTPUT
    
    # Store in metrics (custom implementation)
    echo "$BUNDLE_SIZE" > .metrics/bundle-size.txt
```

## Customization Examples

### Custom Quality Gates

Add additional quality checks:

```yaml
- name: Custom quality check
  run: |
    # Check for TODO comments in production code
    if grep -r "TODO\|FIXME" src/ --exclude-dir=__tests__; then
      echo "❌ TODO/FIXME comments found in production code"
      exit 1
    fi
    
    # Check for console.log statements
    if grep -r "console\.log" src/ --exclude-dir=__tests__; then
      echo "❌ console.log statements found in production code"
      exit 1
    fi
```

### Custom Security Checks

Add project-specific security validations:

```yaml
- name: Custom security check
  run: |
    # Check for hardcoded URLs
    if grep -r "http://\|https://" src/ --exclude-dir=__tests__; then
      echo "⚠️ Hardcoded URLs found - consider using environment variables"
    fi
    
    # Check for sensitive file patterns
    find . -name "*.key" -o -name "*.pem" -o -name "*.p12" | while read file; do
      echo "❌ Sensitive file found: $file"
      exit 1
    done
```

### Custom Build Validation

Add specific build checks:

```yaml
- name: Validate CLI help output
  run: |
    # Test that CLI help works
    node dist/cjs/bin/taskly.js --help | grep -q "Usage:"
    
    # Test that version output is correct
    VERSION=$(node -p "require('./package.json').version")
    CLI_VERSION=$(node dist/cjs/bin/taskly.js --version)
    
    if [ "$VERSION" != "$CLI_VERSION" ]; then
      echo "❌ Version mismatch: package.json=$VERSION, CLI=$CLI_VERSION"
      exit 1
    fi
```

## Migration and Updates

### Updating Workflow Versions

When updating workflow dependencies:

```yaml
# Update action versions
- uses: actions/checkout@v4      # Was v3
- uses: actions/setup-node@v4    # Was v3
- uses: actions/cache@v3         # Was v2
```

### Configuration Migration

When migrating configurations:

1. **Backup existing configurations**
2. **Test changes in feature branch**
3. **Validate with dry-run mode**
4. **Monitor first production run**

### Version Compatibility

Ensure compatibility when updating:

```yaml
# Check Node.js version compatibility
strategy:
  matrix:
    node-version: ['16.x', '18.x', '20.x']
    
# Update minimum version in package.json
{
  "engines": {
    "node": ">=16.0.0"
  }
}
```

## Validation and Testing

### Configuration Validation

Test configuration changes:

```bash
# Validate YAML syntax
yamllint .github/workflows/*.yml

# Test workflow locally (using act)
act -j quality-gates

# Validate package.json
npm pkg fix
```

### Dry Run Testing

Test publishing workflow without actual publishing:

```yaml
# Use dry-run mode
workflow_dispatch:
  inputs:
    dry-run:
      default: true
```

## Additional Resources

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [NPM Package.json Configuration](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)