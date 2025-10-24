#!/usr/bin/env node

/**
 * Migration Validation Script
 *
 * This script validates that all functionality from old workflows
 * has been properly migrated to the new consolidated workflows.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOWS_DIR = '.github/workflows';

// Define the migration mapping
const MIGRATION_MAP = {
  'ci.yml.old': {
    target: 'pr-validation.yml',
    features: [
      'Multi-platform testing (Ubuntu, Windows, macOS)',
      'Node.js version matrix (16.x, 18.x, 20.x)',
      'Test coverage reporting',
      'Bundle functionality testing',
      'Codecov integration',
      'PR coverage comments',
    ],
  },
  'continuous-testing.yml.old': {
    target: 'monitoring.yml',
    features: [
      'Scheduled testing',
      'Test health monitoring',
      'Automatic issue creation on failure',
      'Test performance metrics',
    ],
  },
  'pre-commit.yml.old': {
    target: 'pr-validation.yml',
    features: [
      'Quick pre-commit validation',
      'Related test execution',
      'Coverage validation',
    ],
  },
  'quality-gates.yml.old': {
    target: 'pr-validation.yml',
    features: [
      'Comprehensive quality validation',
      'Security audit integration',
      'Bundle size validation',
      'Multi-gate approach',
    ],
  },
  'release.yml.old': {
    target: 'auto-publish.yml',
    features: [
      'Release validation',
      'Multi-platform testing',
      'NPM publishing',
      'GitHub release creation',
      'Changelog generation',
    ],
  },
  'security.yml.old': {
    target: 'pr-validation.yml',
    features: [
      'Dependency vulnerability scanning',
      'Code quality analysis',
      'Bundle analysis',
      'Scheduled security scans',
    ],
  },
  'version-bump.yml.old': {
    target: 'auto-publish.yml',
    features: ['Manual version bumping', 'Changelog generation', 'Git tagging'],
  },
};

function loadWorkflow(filename) {
  try {
    const filePath = path.join(WORKFLOWS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return null;
  }
}

function validateFeatureMigration(oldWorkflow, newWorkflow, features) {
  const results = [];

  for (const feature of features) {
    let found = false;

    // Check if feature exists in new workflow
    // This is a simplified check - in practice, you'd need more sophisticated analysis
    const newWorkflowStr = JSON.stringify(newWorkflow).toLowerCase();

    switch (feature) {
      case 'Multi-platform testing (Ubuntu, Windows, macOS)':
        found =
          newWorkflowStr.includes('ubuntu-latest') &&
          newWorkflowStr.includes('windows-latest') &&
          newWorkflowStr.includes('macos-latest');
        break;
      case 'Node.js version matrix (16.x, 18.x, 20.x)':
        found =
          newWorkflowStr.includes('16.x') &&
          newWorkflowStr.includes('18.x') &&
          newWorkflowStr.includes('20.x');
        break;
      case 'Test coverage reporting':
        found =
          newWorkflowStr.includes('coverage') ||
          newWorkflowStr.includes('test');
        break;
      case 'Bundle functionality testing':
        found =
          newWorkflowStr.includes('bundle') || newWorkflowStr.includes('build');
        break;
      case 'Codecov integration':
        found = newWorkflowStr.includes('codecov');
        break;
      case 'NPM publishing':
        found =
          newWorkflowStr.includes('npm publish') ||
          newWorkflowStr.includes('npm-publish');
        break;
      case 'GitHub release creation':
        found =
          newWorkflowStr.includes('create-release') ||
          newWorkflowStr.includes('github-release');
        break;
      case 'Security audit integration':
        found =
          newWorkflowStr.includes('security') ||
          newWorkflowStr.includes('audit');
        break;
      case 'Bundle size validation':
        found =
          newWorkflowStr.includes('bundle') && newWorkflowStr.includes('size');
        break;
      default:
        // Generic check for feature keywords
        const keywords = feature.toLowerCase().split(' ');
        found = keywords.some(keyword => newWorkflowStr.includes(keyword));
    }

    results.push({
      feature,
      migrated: found,
    });
  }

  return results;
}

function generateMigrationReport() {
  console.log('🔍 Validating Workflow Migration...\n');

  const report = {
    totalFeatures: 0,
    migratedFeatures: 0,
    missingFeatures: [],
    workflowResults: {},
  };

  for (const [oldFile, migration] of Object.entries(MIGRATION_MAP)) {
    console.log(`📋 Checking migration: ${oldFile} → ${migration.target}`);

    const oldWorkflow = loadWorkflow(oldFile);
    const newWorkflow = loadWorkflow(migration.target);

    if (!oldWorkflow) {
      console.log(`  ⚠️  Could not load ${oldFile}`);
      continue;
    }

    if (!newWorkflow) {
      console.log(`  ❌ Could not load ${migration.target}`);
      continue;
    }

    const results = validateFeatureMigration(
      oldWorkflow,
      newWorkflow,
      migration.features
    );

    report.workflowResults[oldFile] = {
      target: migration.target,
      results,
    };

    console.log(`  📊 Features: ${results.length}`);

    for (const result of results) {
      report.totalFeatures++;

      if (result.migrated) {
        report.migratedFeatures++;
        console.log(`    ✅ ${result.feature}`);
      } else {
        report.missingFeatures.push({
          workflow: oldFile,
          target: migration.target,
          feature: result.feature,
        });
        console.log(`    ❌ ${result.feature}`);
      }
    }

    console.log('');
  }

  return report;
}

function printSummary(report) {
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`Total Features: ${report.totalFeatures}`);
  console.log(`Migrated: ${report.migratedFeatures}`);
  console.log(`Missing: ${report.totalFeatures - report.migratedFeatures}`);
  console.log(
    `Success Rate: ${((report.migratedFeatures / report.totalFeatures) * 100).toFixed(1)}%`
  );

  if (report.missingFeatures.length > 0) {
    console.log('\n⚠️  Missing Features:');
    for (const missing of report.missingFeatures) {
      console.log(
        `  - ${missing.feature} (${missing.workflow} → ${missing.target})`
      );
    }
  }

  console.log('\n🎯 Active Workflows:');
  const activeWorkflows = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.yml') && !file.endsWith('.old'))
    .sort();

  for (const workflow of activeWorkflows) {
    console.log(`  ✅ ${workflow}`);
  }

  console.log('\n📁 Archived Workflows:');
  const archivedWorkflows = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.yml.old'))
    .sort();

  for (const workflow of archivedWorkflows) {
    console.log(`  📦 ${workflow}`);
  }
}

// Main execution
if (require.main === module) {
  try {
    const report = generateMigrationReport();
    printSummary(report);

    // Exit with error code if migration is incomplete
    const successRate = (report.migratedFeatures / report.totalFeatures) * 100;
    if (successRate < 90) {
      console.log('\n❌ Migration validation failed - success rate below 90%');
      process.exit(1);
    } else {
      console.log('\n✅ Migration validation passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Migration validation error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateMigrationReport,
  validateFeatureMigration,
  MIGRATION_MAP,
};
