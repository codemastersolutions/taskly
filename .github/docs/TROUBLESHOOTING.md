# CI/CD Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the CI/CD pipeline.

## Quick Diagnosis

### Workflow Status Check

1. **Go to Actions tab** in your GitHub repository
2. **Find the failed workflow** run
3. **Click on the failed job** to see detailed logs
4. **Look for red X marks** indicating failed steps

### Common Failure Patterns

| Error Pattern | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `npm ERR! 401` | NPM authentication | Check NPM_TOKEN secret |
| `ESLint errors` | Code quality issues | Run `npm run lint:fix` |
| `Coverage below threshold` | Insufficient tests | Add tests or lower threshold |
| `Bundle size exceeded` | Package too large | Optimize dependencies |
| `Type errors` | TypeScript issues | Run `npm run type-check` |

## PR Validation Issues

### Quality Gate Failures

#### ESLint Errors

**Symptoms:**
```
❌ ESLint failed with 5 errors
```

**Diagnosis:**
```bash
# Run ESLint locally
npm run lint
```

**Solutions:**
```bash
# Auto-fix issues
npm run lint:fix

# Manual fixes for remaining issues
# Check specific error messages in workflow logs
```

**Prevention:**
- Set up pre-commit hooks
- Configure IDE ESLint integration
- Run `npm run lint` before committing

#### Prettier Formatting Issues

**Symptoms:**
```
❌ Code formatting check failed
```

**Diagnosis:**
```bash
# Check formatting
npm run format:check
```

**Solutions:**
```bash
# Auto-format code
npm run format

# Or use Prettier directly
npx prettier --write .
```

**Prevention:**
- Configure IDE auto-formatting
- Set up format-on-save
- Use pre-commit hooks

#### TypeScript Type Errors

**Symptoms:**
```
❌ TypeScript compilation failed
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
```

**Diagnosis:**
```bash
# Check types locally
npm run type-check
```

**Solutions:**
1. **Fix type errors** in the reported files
2. **Update type definitions** if using external libraries
3. **Add proper type annotations** to your code

**Common Type Issues:**
```typescript
// ❌ Incorrect
function processId(id) {
  return id.toString();
}

// ✅ Correct
function processId(id: string | number): string {
  return id.toString();
}
```

### Security Audit Failures

#### Vulnerability Detection

**Symptoms:**
```
❌ 3 high severity vulnerabilities found
```

**Diagnosis:**
```bash
# Run security audit
npm audit

# Get detailed report
npm audit --audit-level high
```

**Solutions:**
```bash
# Auto-fix vulnerabilities
npm audit fix

# Force fix (use with caution)
npm audit fix --force

# Update specific packages
npm update package-name
```

**Manual Resolution:**
1. **Review vulnerability details** in npm audit report
2. **Update affected packages** to secure versions
3. **Consider alternative packages** if no fix available
4. **Add to audit exceptions** if risk is acceptable (not recommended)

#### License Compliance Issues

**Symptoms:**
```
❌ Incompatible license detected: GPL-3.0
```

**Diagnosis:**
```bash
# Check package licenses
npx license-checker --summary
```

**Solutions:**
1. **Remove packages** with incompatible licenses
2. **Find alternative packages** with compatible licenses
3. **Update license configuration** if license is actually acceptable

**Allowed Licenses (default):**
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC

### Test Failures

#### Coverage Below Threshold

**Symptoms:**
```
❌ Coverage 75% is below minimum threshold of 80%
```

**Diagnosis:**
```bash
# Generate coverage report
npm run test:coverage

# View detailed report
open coverage/lcov-report/index.html
```

**Solutions:**
1. **Add tests** for uncovered code
2. **Remove dead code** that's not being tested
3. **Adjust coverage threshold** if appropriate

**Coverage Improvement Strategy:**
```javascript
// Identify uncovered lines in coverage report
// Add targeted tests
describe('uncovered function', () => {
  it('should handle edge case', () => {
    // Test the specific uncovered code path
  });
});
```

#### Test Suite Failures

**Symptoms:**
```
❌ Test suite failed with 2 failing tests
```

**Diagnosis:**
```bash
# Run tests locally
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run with verbose output
npm test -- --verbose
```

**Solutions:**
1. **Fix failing test logic**
2. **Update test expectations** if behavior changed
3. **Check for environment differences** (Node.js version, OS)

### Build Validation Issues

#### Bundle Size Exceeded

**Symptoms:**
```
❌ Bundle size 65KB exceeds limit of 50KB
```

**Diagnosis:**
```bash
# Build and check sizes
npm run build:prod
ls -la dist/

# Analyze bundle composition
npm run build:analyze  # if available
```

**Solutions:**
1. **Remove unused dependencies**
```bash
# Find unused dependencies
npx depcheck

# Remove unused packages
npm uninstall unused-package
```

2. **Optimize imports**
```javascript
// ❌ Import entire library
import * as lodash from 'lodash';

// ✅ Import only needed functions
import { debounce } from 'lodash';
```

3. **Use tree shaking**
```javascript
// Ensure your bundler can tree-shake unused code
// Use ES modules instead of CommonJS when possible
```

#### Entry Point Validation Failures

**Symptoms:**
```
❌ Entry point dist/types/index.d.ts not found
```

**Diagnosis:**
```bash
# Check build output
npm run build:prod
ls -la dist/

# Verify package.json entry points
cat package.json | jq '.main, .module, .types, .bin'
```

**Solutions:**
1. **Fix build configuration** to generate missing files
2. **Update package.json** entry points to match actual files
3. **Check TypeScript configuration** for declaration generation

## Auto-Publish Issues

### NPM Authentication Failures

#### Invalid Token

**Symptoms:**
```
❌ npm ERR! 401 Unauthorized
```

**Diagnosis:**
1. **Check token validity**
```bash
# Test token locally (if safe to do so)
export NPM_TOKEN="your-token"
npm whoami
```

2. **Verify token in GitHub secrets**
   - Go to repository Settings → Secrets
   - Check NPM_TOKEN is set and not expired

**Solutions:**
1. **Generate new NPM token**
   - Go to npmjs.com → Access Tokens
   - Create new "Automation" token
   - Update GitHub secret

2. **Verify token permissions**
   - Ensure token has publish access
   - Check package name availability

#### Package Publishing Failures

**Symptoms:**
```
❌ npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@scope/package
```

**Common Causes:**
1. **Package name conflict** - Name already taken
2. **Insufficient permissions** - No publish access
3. **Scope issues** - Incorrect package scope

**Solutions:**
1. **Check package availability**
```bash
npm view @your-scope/your-package
```

2. **Verify package name** in package.json
3. **Ensure proper scoping** and permissions

### Version Management Issues

#### No Changes Detected

**Symptoms:**
```
ℹ️ No changes detected, skipping publish
```

**Diagnosis:**
```bash
# Check recent commits
git log --oneline --since="1 week ago"

# Verify conventional commit format
git log --grep="^feat\|^fix\|^BREAKING"
```

**Solutions:**
1. **Use conventional commit format**
```bash
# Instead of: "update readme"
git commit -m "docs: update installation instructions"

# Instead of: "bug fix"
git commit -m "fix: resolve memory leak in task runner"
```

2. **Force publish if needed**
   - Use workflow_dispatch with force-publish option
   - Manually trigger from GitHub Actions tab

#### Version Conflict

**Symptoms:**
```
❌ Tag v1.2.3 already exists
```

**Solutions:**
1. **Delete conflicting tag** (if safe)
```bash
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3
```

2. **Manual version bump**
```bash
npm version patch  # or minor/major
git push --follow-tags
```

### GitHub Release Failures

#### Release Creation Issues

**Symptoms:**
```
❌ Failed to create GitHub release
```

**Common Causes:**
1. **Insufficient permissions** - GITHUB_TOKEN lacks access
2. **Tag conflicts** - Tag already exists
3. **Network issues** - Temporary GitHub API problems

**Solutions:**
1. **Check workflow permissions**
```yaml
permissions:
  contents: write  # Required for releases
```

2. **Retry the workflow** - May be temporary issue
3. **Manual release creation** if automated fails

## Environment-Specific Issues

### Node.js Version Compatibility

**Symptoms:**
```
❌ Tests fail on Node.js 16.x but pass on 18.x
```

**Solutions:**
1. **Update minimum Node.js version** in package.json
2. **Fix compatibility issues** in code
3. **Use appropriate polyfills** for missing features

### Platform-Specific Failures

**Symptoms:**
```
❌ Tests fail on Windows but pass on Ubuntu
```

**Common Issues:**
1. **Path separators** - Use `path.join()` instead of hardcoded `/`
2. **Line endings** - Configure git to handle CRLF/LF
3. **Case sensitivity** - File system differences

**Solutions:**
```javascript
// ❌ Platform-specific
const filePath = 'src/utils/helper.js';

// ✅ Cross-platform
const filePath = path.join('src', 'utils', 'helper.js');
```

## Performance Issues

### Slow Workflow Execution

**Symptoms:**
- Workflows taking longer than expected
- Timeouts in CI/CD steps

**Optimization Strategies:**
1. **Enable dependency caching**
2. **Parallelize independent jobs**
3. **Optimize test execution**
4. **Use faster runners** if available

### Resource Limitations

**Symptoms:**
```
❌ Process killed due to memory limit
```

**Solutions:**
1. **Increase Node.js memory limit**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

2. **Optimize memory usage** in tests and builds
3. **Split large operations** into smaller chunks

## Getting Help

### Self-Diagnosis Checklist

Before seeking help, try these steps:

- [ ] Check workflow logs for specific error messages
- [ ] Run failing commands locally to reproduce
- [ ] Verify all required secrets are configured
- [ ] Check recent changes that might have caused issues
- [ ] Review this troubleshooting guide for similar issues

### Escalation Process

1. **Search existing issues** in the repository
2. **Check GitHub Actions status** for platform-wide issues
3. **Create detailed issue** with:
   - Workflow run URL
   - Error messages
   - Steps to reproduce
   - Environment details

### Useful Debug Information

When reporting issues, include:

```bash
# Node.js and npm versions
node --version
npm --version

# Package.json relevant sections
cat package.json | jq '.scripts, .dependencies, .devDependencies'

# Recent commits
git log --oneline -10

# Workflow file checksums (to verify integrity)
sha256sum .github/workflows/*.yml
```

## Prevention Strategies

### Pre-commit Validation

Set up local validation to catch issues early:

```bash
# Install pre-commit hooks
npm install --save-dev husky lint-staged

# Configure package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,ts}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### Local Testing

Test changes locally before pushing:

```bash
# Run full validation suite
npm run lint && npm run type-check && npm test && npm run build:prod

# Test package installation
npm pack && npm install -g ./package-name-version.tgz
```

### Monitoring and Alerts

Set up monitoring for:
- Workflow failure rates
- Performance degradation
- Security vulnerability trends
- Dependency update needs

## Additional Resources

- [GitHub Actions Troubleshooting](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
- [NPM Publishing Troubleshooting](https://docs.npmjs.com/troubleshooting)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)