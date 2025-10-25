#!/usr/bin/env node

/**
 * Version Management Script for GitHub Actions
 * Analyzes commits since last release and determines version increment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import our version utilities (try built version first, fallback to source)
let versionUtils;
try {
  versionUtils = require('../dist/cjs/utils/version.js');
} catch (error) {
  // Fallback: use a simplified version for testing
  console.log('⚠️  Built version not available, using fallback implementation');
  versionUtils = {
    calculateNewVersion: (currentVersion, commitMessages) => ({
      currentVersion,
      newVersion: incrementVersionSimple(currentVersion, 'patch'),
      incrementType: 'patch',
      reason: 'Changes detected (fallback mode)',
    }),
    generateChangelogEntry: (analysis, version) =>
      `## ${version}\n\n- Various improvements and fixes\n`,
    analyzeCommits: commitMessages => ({
      hasBreakingChanges: false,
      hasFeatures: false,
      hasFixes: false,
      conventionalCommits: [],
      skippedCommits: commitMessages,
    }),
    isValidSemanticVersion: version =>
      /^\d+\.\d+\.\d+$/.test(version.replace(/^v/, '')),
  };
}

const {
  calculateNewVersion,
  generateChangelogEntry,
  analyzeCommits,
  isValidSemanticVersion,
} = versionUtils;

/**
 * Simple version increment for fallback mode
 */
function incrementVersionSimple(version, type = 'patch') {
  const cleanVersion = version.replace(/^v/, '');
  const parts = cleanVersion.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

/**
 * Get commits since last tag/release
 */
function getCommitsSinceLastRelease() {
  try {
    // Try to get the last tag
    const lastTag = execSync(
      'git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo ""',
      {
        encoding: 'utf8',
      }
    ).trim();

    let commitRange;
    if (lastTag) {
      commitRange = `${lastTag}..HEAD`;
      console.log(`📋 Analyzing commits since last release: ${lastTag}`);
    } else {
      // No previous tags, get all commits
      commitRange = 'HEAD';
      console.log('📋 No previous releases found, analyzing all commits');
    }

    // Get commit messages and SHAs
    const commitMessages = execSync(
      `git log --pretty=format:"%s" ${commitRange}`,
      {
        encoding: 'utf8',
      }
    )
      .split('\n')
      .filter(msg => msg.trim());

    const commitShas = execSync(`git log --pretty=format:"%H" ${commitRange}`, {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(sha => sha.trim());

    return { commitMessages, commitShas, lastTag };
  } catch (error) {
    console.error('❌ Error getting commits:', error.message);
    process.exit(1);
  }
}

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    if (!packageJson.version) {
      throw new Error('No version field found in package.json');
    }

    if (!isValidSemanticVersion(packageJson.version)) {
      throw new Error(
        `Invalid semantic version in package.json: ${packageJson.version}`
      );
    }

    return packageJson.version;
  } catch (error) {
    console.error('❌ Error reading current version:', error.message);
    // In test environment, throw the error instead of exiting
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      throw error;
    }
    process.exit(1);
  }
}

/**
 * Update package.json with new version
 */
function updatePackageVersion(newVersion) {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    packageJson.version = newVersion;

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json version to ${newVersion}`);
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    process.exit(1);
  }
}

/**
 * Update package-lock.json with new version
 */
function updatePackageLockVersion(newVersion) {
  try {
    const lockPath = path.join(process.cwd(), 'package-lock.json');

    if (fs.existsSync(lockPath)) {
      const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      lockJson.version = newVersion;

      // Update the root package version in lockfile v2/v3 format
      if (lockJson.packages && lockJson.packages['']) {
        lockJson.packages[''].version = newVersion;
      }

      fs.writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n');
      console.log(`✅ Updated package-lock.json version to ${newVersion}`);
    }
  } catch (error) {
    console.error(
      '⚠️  Warning: Could not update package-lock.json:',
      error.message
    );
  }
}

/**
 * Update CHANGELOG.md with new version entry
 */
function updateChangelog(analysis, newVersion) {
  try {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    const newEntry = generateChangelogEntry(analysis, newVersion);

    let existingContent = '';
    if (fs.existsSync(changelogPath)) {
      existingContent = fs.readFileSync(changelogPath, 'utf8');
    } else {
      // Create new changelog header
      existingContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
    }

    // Insert new entry after the header
    const lines = existingContent.split('\n');
    const headerEndIndex = lines.findIndex(line => line.startsWith('## '));

    if (headerEndIndex === -1) {
      // No existing entries, append to end
      existingContent += '\n' + newEntry + '\n';
    } else {
      // Insert before first existing entry
      lines.splice(headerEndIndex, 0, newEntry, '');
      existingContent = lines.join('\n');
    }

    fs.writeFileSync(changelogPath, existingContent);
    console.log(`✅ Updated CHANGELOG.md with version ${newVersion}`);
  } catch (error) {
    console.error('❌ Error updating CHANGELOG.md:', error.message);
    process.exit(1);
  }
}

/**
 * Set GitHub Actions outputs
 */
function setGitHubOutputs(versionInfo, analysis) {
  const outputs = {
    'current-version': versionInfo.currentVersion,
    'new-version': versionInfo.newVersion,
    'increment-type': versionInfo.incrementType,
    reason: versionInfo.reason,
    'commit-sha': versionInfo.commitSha || '',
    'has-changes': analysis.conventionalCommits.length > 0 ? 'true' : 'false',
    'breaking-changes': analysis.hasBreakingChanges ? 'true' : 'false',
    features: analysis.hasFeatures ? 'true' : 'false',
    fixes: analysis.hasFixes ? 'true' : 'false',
  };

  // Set GitHub Actions outputs
  if (process.env.GITHUB_OUTPUT) {
    const outputFile = process.env.GITHUB_OUTPUT;
    const outputContent =
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n';

    fs.appendFileSync(outputFile, outputContent);
    console.log('✅ GitHub Actions outputs set');
  }

  // Also log outputs for debugging
  console.log('\n📊 Version Analysis Results:');
  Object.entries(outputs).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

/**
 * Validate that version synchronization is correct
 */
function validateVersionSync(expectedVersion) {
  try {
    const packageVersion = getCurrentVersion();

    if (packageVersion !== expectedVersion) {
      throw new Error(
        `Version mismatch: package.json has ${packageVersion}, expected ${expectedVersion}`
      );
    }

    console.log(`✅ Version synchronization validated: ${expectedVersion}`);
    return true;
  } catch (error) {
    console.error('❌ Version synchronization failed:', error.message);
    return false;
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🚀 Starting version management analysis...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipUpdate = args.includes('--skip-update');

  if (dryRun) {
    console.log('🔍 Running in dry-run mode (no files will be modified)\n');
  }

  try {
    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(`📦 Current version: ${currentVersion}`);

    // Get commits since last release
    const { commitMessages, commitShas, lastTag } =
      getCommitsSinceLastRelease();

    if (commitMessages.length === 0) {
      console.log('ℹ️  No commits found since last release');

      // Set outputs indicating no changes
      if (process.env.GITHUB_OUTPUT) {
        setGitHubOutputs(
          {
            currentVersion,
            newVersion: currentVersion,
            incrementType: 'patch',
            reason: 'No changes detected',
          },
          {
            hasBreakingChanges: false,
            hasFeatures: false,
            hasFixes: false,
            conventionalCommits: [],
            skippedCommits: [],
          }
        );
      }

      return;
    }

    console.log(`📝 Found ${commitMessages.length} commits to analyze`);

    // Analyze commits and calculate new version
    const versionInfo = calculateNewVersion(
      currentVersion,
      commitMessages,
      commitShas
    );
    const analysis = analyzeCommits(commitMessages, commitShas);

    console.log(
      `\n🎯 Version increment: ${versionInfo.currentVersion} → ${versionInfo.newVersion}`
    );
    console.log(`📈 Increment type: ${versionInfo.incrementType}`);
    console.log(`💡 Reason: ${versionInfo.reason}`);

    if (analysis.conventionalCommits.length > 0) {
      console.log(
        `\n📋 Conventional commits found: ${analysis.conventionalCommits.length}`
      );
      console.log(
        `⚠️  Breaking changes: ${analysis.hasBreakingChanges ? 'Yes' : 'No'}`
      );
      console.log(`✨ Features: ${analysis.hasFeatures ? 'Yes' : 'No'}`);
      console.log(`🐛 Fixes: ${analysis.hasFixes ? 'Yes' : 'No'}`);
    }

    if (analysis.skippedCommits.length > 0) {
      console.log(
        `\n⏭️  Non-conventional commits skipped: ${analysis.skippedCommits.length}`
      );
    }

    // Set GitHub Actions outputs
    setGitHubOutputs(versionInfo, analysis);

    // Update files if not in dry-run mode and not skipping updates
    if (!dryRun && !skipUpdate) {
      console.log('\n📝 Updating version files...');

      updatePackageVersion(versionInfo.newVersion);
      updatePackageLockVersion(versionInfo.newVersion);
      updateChangelog(analysis, versionInfo.newVersion);

      // Validate synchronization
      if (!validateVersionSync(versionInfo.newVersion)) {
        process.exit(1);
      }

      console.log('\n✅ Version management completed successfully!');
    } else {
      console.log('\n🔍 Dry-run completed - no files were modified');
    }
  } catch (error) {
    console.error('\n❌ Version management failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getCommitsSinceLastRelease,
  getCurrentVersion,
  updatePackageVersion,
  updatePackageLockVersion,
  updateChangelog,
  validateVersionSync,
};
