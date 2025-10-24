#!/usr/bin/env node

/**
 * Cleanup Old Workflows Script
 *
 * This script removes the archived (.old) workflow files after validation period.
 * It should only be run after confirming that the new workflows are working correctly.
 */

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = '.github/workflows';

function listOldWorkflows() {
  try {
    const files = fs.readdirSync(WORKFLOWS_DIR);
    return files.filter(file => file.endsWith('.yml.old'));
  } catch (error) {
    console.error('Error reading workflows directory:', error.message);
    return [];
  }
}

function removeOldWorkflows(dryRun = true) {
  const oldWorkflows = listOldWorkflows();

  if (oldWorkflows.length === 0) {
    console.log('✅ No old workflows found to remove');
    return;
  }

  console.log(`🗑️  Found ${oldWorkflows.length} old workflow(s) to remove:`);
  console.log('');

  for (const workflow of oldWorkflows) {
    const filePath = path.join(WORKFLOWS_DIR, workflow);
    console.log(`  📁 ${workflow}`);

    if (!dryRun) {
      try {
        fs.unlinkSync(filePath);
        console.log(`    ✅ Removed`);
      } catch (error) {
        console.log(`    ❌ Error removing: ${error.message}`);
      }
    } else {
      console.log(`    🔍 Would be removed (dry-run mode)`);
    }
  }

  console.log('');

  if (dryRun) {
    console.log('🔍 This was a dry-run. To actually remove files, run:');
    console.log('   node .github/scripts/cleanup-old-workflows.js --confirm');
  } else {
    console.log('✅ Cleanup completed');
  }
}

function validateBeforeCleanup() {
  console.log('🔍 Running pre-cleanup validation...');

  // Check if new workflows exist
  const requiredWorkflows = [
    'pr-validation.yml',
    'auto-publish.yml',
    'monitoring.yml',
  ];

  const missingWorkflows = [];

  for (const workflow of requiredWorkflows) {
    const filePath = path.join(WORKFLOWS_DIR, workflow);
    if (!fs.existsSync(filePath)) {
      missingWorkflows.push(workflow);
    }
  }

  if (missingWorkflows.length > 0) {
    console.log('❌ Validation failed: Missing required workflows:');
    for (const workflow of missingWorkflows) {
      console.log(`  - ${workflow}`);
    }
    return false;
  }

  console.log('✅ All required workflows are present');
  return true;
}

function showCleanupPlan() {
  console.log('📋 Workflow Cleanup Plan');
  console.log('='.repeat(50));
  console.log('');

  console.log('🎯 Active Workflows (will be kept):');
  const activeWorkflows = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.yml') && !file.endsWith('.old'))
    .sort();

  for (const workflow of activeWorkflows) {
    console.log(`  ✅ ${workflow}`);
  }

  console.log('');
  console.log('🗑️  Archived Workflows (will be removed):');
  const oldWorkflows = listOldWorkflows();

  for (const workflow of oldWorkflows) {
    console.log(`  📦 ${workflow}`);
  }

  console.log('');
  console.log('⚠️  Important Notes:');
  console.log('  - This action cannot be undone');
  console.log('  - Ensure new workflows have been tested');
  console.log('  - Verify branch protection rules are updated');
  console.log('  - Confirm team has been notified of changes');
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const plan = args.includes('--plan');

  console.log('🧹 Workflow Cleanup Tool');
  console.log('');

  if (plan) {
    showCleanupPlan();
    return;
  }

  // Validate before cleanup
  if (!validateBeforeCleanup()) {
    console.log('');
    console.log('❌ Cleanup aborted due to validation failure');
    process.exit(1);
  }

  console.log('');

  if (!confirm) {
    console.log('🔍 Running in dry-run mode...');
    console.log('');
    removeOldWorkflows(true);
    console.log('');
    console.log('💡 To see the cleanup plan, run:');
    console.log('   node .github/scripts/cleanup-old-workflows.js --plan');
  } else {
    console.log('⚠️  CONFIRMATION REQUIRED');
    console.log('');
    console.log(
      'This will permanently delete the following archived workflows:'
    );

    const oldWorkflows = listOldWorkflows();
    for (const workflow of oldWorkflows) {
      console.log(`  - ${workflow}`);
    }

    console.log('');
    console.log(
      'Are you sure you want to proceed? This action cannot be undone.'
    );
    console.log('');
    console.log('If you are sure, please run the following command:');
    console.log('   rm .github/workflows/*.yml.old');
    console.log('');
    console.log('Or to remove them individually:');
    for (const workflow of oldWorkflows) {
      console.log(`   rm .github/workflows/${workflow}`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listOldWorkflows,
  removeOldWorkflows,
  validateBeforeCleanup,
};
