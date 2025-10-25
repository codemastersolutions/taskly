# Secrets Configuration Guide

This document provides comprehensive instructions for setting up and managing secrets required for the auto-publish workflow.

## Required Secrets

### 1. NPM_TOKEN

**Purpose:** Authenticate with NPM registry for package publishing

**How to obtain:**
1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to Access Tokens in your account settings
3. Click "Generate New Token"
4. Select "Automation" token type (recommended for CI/CD)
5. Copy the generated token (starts with `npm_`)

**Permissions required:**
- Publish packages to NPM registry
- Read package information

**Security considerations:**
- Use "Automation" tokens for CI/CD (more secure than "Publish" tokens)
- Tokens should have minimal required scope
- Regularly rotate tokens (recommended: every 90 days)
- Monitor token usage in NPM dashboard

### 2. GITHUB_TOKEN

**Purpose:** Authenticate with GitHub API for repository operations

**How it works:**
- Automatically provided by GitHub Actions
- No manual configuration required
- Scoped to the current repository

**Permissions used:**
- `contents: write` - Create tags and commits
- `pull-requests: write` - Comment on PRs
- `packages: write` - Publish to GitHub Packages (if used)
- `actions: read` - Read workflow information

## Setting Up Secrets

### Repository Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `NPM_TOKEN` | `npm_xxxxxxxx...` | NPM automation token |

### Environment Secrets (Recommended)

For additional security, use environment-specific secrets:

1. Go to **Settings** → **Environments**
2. Create a `production` environment
3. Add protection rules:
   - Required reviewers (optional)
   - Wait timer (optional)
   - Deployment branches: `main` only
4. Add secrets to the environment

## Workflow Permissions

### Minimal Permissions Configuration

```yaml
permissions:
  contents: write    # Create tags and update files
  pull-requests: write # Comment on PRs
  packages: write    # Publish packages (if using GitHub Packages)
  actions: read      # Read workflow information
  checks: write      # Update status checks
```

### Environment Protection

```yaml
environment:
  name: production
  url: https://www.npmjs.com/package/@your-org/your-package
```

## Security Best Practices

### Token Security

1. **Use Automation Tokens**
   - More secure than classic tokens
   - Better audit trail
   - Automatic expiration

2. **Scope Limitation**
   - Only grant minimum required permissions
   - Use environment-specific secrets when possible
   - Regularly audit token permissions

3. **Token Rotation**
   ```bash
   # Set up token rotation reminder
   # Recommended: Every 90 days
   ```

### Workflow Security

1. **Environment Protection**
   - Use protected environments for production
   - Require manual approval for sensitive operations
   - Limit deployment branches

2. **Secret Validation**
   - Always validate secrets before use
   - Fail fast if secrets are invalid
   - Log validation results (without exposing secrets)

3. **Audit Trail**
   - Monitor secret usage
   - Track token access patterns
   - Set up alerts for unusual activity

## Troubleshooting

### Common Issues

#### NPM Token Issues

**Error:** `npm ERR! 401 Unauthorized`
- **Cause:** Invalid or expired NPM token
- **Solution:** Generate new token and update secret

**Error:** `npm ERR! 403 Forbidden`
- **Cause:** Insufficient permissions or package name conflict
- **Solution:** Check package name and token permissions

#### GitHub Token Issues

**Error:** `403 Resource not accessible by integration`
- **Cause:** Insufficient workflow permissions
- **Solution:** Update workflow permissions in YAML

**Error:** `404 Not Found`
- **Cause:** Repository not found or token lacks access
- **Solution:** Verify repository name and token scope

### Validation Commands

Test your secrets locally (for debugging):

```bash
# Test NPM token
export NPM_TOKEN="your-token-here"
npm whoami

# Test GitHub token
export GITHUB_TOKEN="your-token-here"
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Secret Validation Workflow

The auto-publish system includes automatic secret validation:

```yaml
- name: Validate secrets
  uses: ./.github/actions/validate-secrets
  with:
    npm-token: ${{ secrets.NPM_TOKEN }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Monitoring and Alerts

### NPM Token Monitoring

1. **Usage Tracking**
   - Monitor token usage in NPM dashboard
   - Set up alerts for unusual activity
   - Track download statistics

2. **Expiration Alerts**
   - Set calendar reminders for token rotation
   - Monitor token expiration dates
   - Automate rotation where possible

### GitHub Token Monitoring

1. **Audit Logs**
   - Review repository audit logs regularly
   - Monitor API usage patterns
   - Track workflow execution history

2. **Security Alerts**
   - Enable GitHub security alerts
   - Monitor for suspicious activity
   - Review access patterns

## Emergency Procedures

### Token Compromise

If you suspect a token has been compromised:

1. **Immediate Actions**
   - Revoke the compromised token immediately
   - Generate a new token
   - Update repository secrets
   - Review recent activity logs

2. **Investigation**
   - Check NPM package downloads for anomalies
   - Review GitHub audit logs
   - Scan for unauthorized package versions

3. **Recovery**
   - Update all affected secrets
   - Re-run validation workflows
   - Notify team members if necessary

### Workflow Failures

If workflows fail due to secret issues:

1. **Check Secret Validity**
   ```bash
   # Run validation action
   gh workflow run validate-secrets
   ```

2. **Update Secrets**
   - Generate new tokens if expired
   - Update repository secrets
   - Re-run failed workflows

3. **Verify Permissions**
   - Check workflow permissions
   - Verify environment protection rules
   - Update YAML configuration if needed

## Additional Resources

- [NPM Token Documentation](https://docs.npmjs.com/about-access-tokens)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)