# Reusable GitHub Actions

This directory contains reusable GitHub Actions for the npm auto-publish workflow.

## Actions

### 1. Setup Node.js (`setup-node`)

Sets up Node.js environment with optimized caching for dependencies.

**Usage:**
```yaml
- uses: ./.github/actions/setup-node
  with:
    node-version: '18.x'  # Optional, defaults to '18.x'
    cache-dependency-path: 'package-lock.json'  # Optional
    registry-url: 'https://registry.npmjs.org'  # Optional
```

**Features:**
- Automatic dependency installation with cache optimization
- Support for npm, yarn, and pnpm
- Version verification and registry configuration
- Offline-first installation when possible

### 2. Quality Check (`quality-check`)

Runs comprehensive code quality checks including linting, formatting, and type checking.

**Usage:**
```yaml
- uses: ./.github/actions/quality-check
  with:
    fail-on-warnings: 'true'  # Optional, defaults to 'true'
    eslint-config: '.eslintrc.json'  # Optional
    prettier-config: '.prettierrc.json'  # Optional
```

**Outputs:**
- `lint-result`: ESLint check result (success/failure)
- `format-result`: Prettier check result (success/failure)
- `typecheck-result`: TypeScript check result (success/failure)

**Features:**
- ESLint validation with configurable warning handling
- Prettier formatting validation
- TypeScript type checking
- Detailed reporting in GitHub Step Summary
- Individual step results for conditional logic

**Required package.json scripts:**
- `lint`: Run ESLint
- `format:check`: Check Prettier formatting
- `type-check`: Run TypeScript type checking

### 3. Security Audit (`security-audit`)

Performs comprehensive security auditing with detailed reporting.

**Usage:**
```yaml
- uses: ./.github/actions/security-audit
  with:
    audit-level: 'moderate'  # Optional: low, moderate, high, critical
    fail-on-vulnerabilities: 'true'  # Optional, defaults to 'true'
    check-outdated: 'true'  # Optional, defaults to 'true'
    generate-report: 'true'  # Optional, defaults to 'true'
```

**Outputs:**
- `vulnerabilities-found`: Number of vulnerabilities found
- `audit-result`: Security audit result (success/failure/error)
- `outdated-count`: Number of outdated packages

**Features:**
- npm audit with configurable severity levels
- Outdated dependency detection
- Dependency license analysis
- Detailed security reports in GitHub Step Summary
- Artifact upload for security reports
- JSON output for programmatic processing

**Generated Artifacts:**
- `audit-report.json`: Detailed vulnerability report
- `outdated-report.json`: Outdated dependencies report
- `dependencies.json`: Dependency tree analysis

## Integration Example

Here's how to use all three actions together in a workflow:

```yaml
name: Quality & Security Checks
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js Environment
        uses: ./.github/actions/setup-node
        with:
          node-version: '18.x'
      
      - name: Run Quality Checks
        uses: ./.github/actions/quality-check
        with:
          fail-on-warnings: 'true'
      
      - name: Run Security Audit
        uses: ./.github/actions/security-audit
        with:
          audit-level: 'moderate'
          fail-on-vulnerabilities: 'true'
```

## Requirements Mapping

These actions fulfill the following requirements from the specification:

- **Requirement 1.1**: Automated test execution on PR creation/update
- **Requirement 1.2**: Lint verification on PR creation/update  
- **Requirement 1.3**: Security audit on PR creation/update
- **Requirement 3.4**: Security vulnerability verification before publication

## Notes

- All actions are designed to work with the existing project structure
- Actions generate detailed reports in GitHub Step Summary for visibility
- Security reports are uploaded as artifacts for later analysis
- Actions support both success and failure scenarios with appropriate outputs
- Caching is optimized for faster subsequent runs