#!/usr/bin/env node

/**
 * Script to configure branch protection rules for the main branch
 * This ensures that all PRs go through proper validation before merging
 */

const { Octokit } = require('@octokit/rest');

async function setupBranchProtection() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!repository) {
    console.error('❌ GITHUB_REPOSITORY environment variable is required');
    process.exit(1);
  }

  const [owner, repo] = repository.split('/');
  const octokit = new Octokit({ auth: token });

  console.log(`🔒 Setting up branch protection for ${owner}/${repo}`);

  try {
    // Define the branch protection configuration
    const protectionConfig = {
      owner,
      repo,
      branch: 'main',
      required_status_checks: {
        strict: true, // Require branches to be up to date before merging
        contexts: [
          // PR Validation workflow checks
          'Quality Gates',
          'Security Audit',
          'Test Matrix',
          'Build Validation',
          'PR Summary',
        ],
      },
      enforce_admins: false, // Allow admins to bypass restrictions in emergencies
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true, // Dismiss reviews when new commits are pushed
        require_code_owner_reviews: false, // Set to true if you have CODEOWNERS file
        require_last_push_approval: true, // Require approval after the last push
      },
      restrictions: null, // No user/team restrictions - anyone can push to PRs
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false, // Allow creating the branch
      required_conversation_resolution: true, // Require all conversations to be resolved
    };

    // Apply branch protection
    await octokit.rest.repos.updateBranchProtection(protectionConfig);

    console.log('✅ Branch protection rules configured successfully');
    console.log('');
    console.log('📋 Protection Summary:');
    console.log('- ✅ Required status checks enabled');
    console.log('- ✅ Require branches to be up to date');
    console.log('- ✅ Required PR reviews (1 approval minimum)');
    console.log('- ✅ Dismiss stale reviews on new commits');
    console.log('- ✅ Require conversation resolution');
    console.log('- ✅ Prevent force pushes and deletions');
    console.log('');
    console.log('🔍 Required Status Checks:');
    protectionConfig.required_status_checks.contexts.forEach(check => {
      console.log(`  - ${check}`);
    });
  } catch (error) {
    console.error('❌ Failed to configure branch protection:', error.message);

    if (error.status === 403) {
      console.error('');
      console.error('💡 This might be due to insufficient permissions.');
      console.error(
        '   Make sure the token has "repo" scope and admin access to the repository.'
      );
    } else if (error.status === 404) {
      console.error('');
      console.error('💡 Repository not found or branch does not exist.');
      console.error(
        '   Make sure the main branch exists and the repository name is correct.'
      );
    }

    process.exit(1);
  }
}

// Validate branch protection configuration
async function validateBranchProtection() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token || !repository) {
    console.log(
      '⚠️ Cannot validate - missing GITHUB_TOKEN or GITHUB_REPOSITORY'
    );
    return;
  }

  const [owner, repo] = repository.split('/');
  const octokit = new Octokit({ auth: token });

  try {
    console.log('🔍 Validating current branch protection...');

    const { data: protection } = await octokit.rest.repos.getBranchProtection({
      owner,
      repo,
      branch: 'main',
    });

    console.log('✅ Branch protection is active');
    console.log('');
    console.log('📊 Current Configuration:');
    console.log(
      `- Required status checks: ${protection.required_status_checks ? '✅' : '❌'}`
    );
    console.log(
      `- Required PR reviews: ${protection.required_pull_request_reviews ? '✅' : '❌'}`
    );
    console.log(
      `- Enforce for admins: ${protection.enforce_admins.enabled ? '✅' : '❌'}`
    );
    console.log(
      `- Allow force pushes: ${protection.allow_force_pushes.enabled ? '❌' : '✅'}`
    );
    console.log(
      `- Allow deletions: ${protection.allow_deletions.enabled ? '❌' : '✅'}`
    );

    if (protection.required_status_checks) {
      console.log('');
      console.log('📋 Required Status Checks:');
      protection.required_status_checks.contexts.forEach(check => {
        console.log(`  - ${check}`);
      });
    }

    if (protection.required_pull_request_reviews) {
      console.log('');
      console.log('👥 PR Review Requirements:');
      console.log(
        `  - Required approvals: ${protection.required_pull_request_reviews.required_approving_review_count}`
      );
      console.log(
        `  - Dismiss stale reviews: ${protection.required_pull_request_reviews.dismiss_stale_reviews ? '✅' : '❌'}`
      );
      console.log(
        `  - Require code owner reviews: ${protection.required_pull_request_reviews.require_code_owner_reviews ? '✅' : '❌'}`
      );
    }
  } catch (error) {
    if (error.status === 404) {
      console.log('⚠️ No branch protection configured for main branch');
    } else {
      console.error('❌ Failed to validate branch protection:', error.message);
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'setup':
      await setupBranchProtection();
      break;
    case 'validate':
      await validateBranchProtection();
      break;
    case 'both':
      await setupBranchProtection();
      console.log('');
      await validateBranchProtection();
      break;
    default:
      console.log(
        'Usage: node setup-branch-protection.js <setup|validate|both>'
      );
      console.log('');
      console.log('Commands:');
      console.log('  setup    - Configure branch protection rules');
      console.log('  validate - Check current branch protection status');
      console.log('  both     - Setup and then validate');
      console.log('');
      console.log('Environment variables required:');
      console.log('  GITHUB_TOKEN      - GitHub token with repo admin access');
      console.log('  GITHUB_REPOSITORY - Repository in format "owner/repo"');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  setupBranchProtection,
  validateBranchProtection,
};
