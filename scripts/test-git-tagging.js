#!/usr/bin/env node

/**
 * Test script for git tagging functionality
 * This script simulates the git tagging process without actually creating commits/tags
 */

const { execSync } = require('child_process');
const fs = require('fs');

function testGitTagging() {
  console.log('🧪 Testing Git Tagging Functionality\n');

  try {
    // Test 1: Check if we're in a git repository
    console.log('1️⃣ Checking git repository status...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    console.log(
      `   Git status: ${gitStatus.trim() || 'Clean working directory'}`
    );

    // Test 2: Check current branch
    console.log('\n2️⃣ Checking current branch...');
    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf8',
    }).trim();
    console.log(`   Current branch: ${currentBranch}`);

    // Test 3: Check for existing tags
    console.log('\n3️⃣ Checking existing tags...');
    const existingTags = execSync('git tag -l', { encoding: 'utf8' }).trim();
    if (existingTags) {
      console.log(`   Existing tags: ${existingTags.split('\n').join(', ')}`);
    } else {
      console.log('   No existing tags found');
    }

    // Test 4: Get latest commit info
    console.log('\n4️⃣ Getting latest commit info...');
    const latestCommit = execSync('git log -1 --pretty=format:"%H %s"', {
      encoding: 'utf8',
    });
    console.log(`   Latest commit: ${latestCommit}`);

    // Test 5: Simulate version increment
    console.log('\n5️⃣ Simulating version increment...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    const versionParts = currentVersion.split('.').map(Number);
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    const tagName = `v${newVersion}`;

    console.log(`   Current version: ${currentVersion}`);
    console.log(`   New version: ${newVersion}`);
    console.log(`   Tag name: ${tagName}`);

    // Test 6: Check if tag would conflict
    console.log('\n6️⃣ Checking for tag conflicts...');
    try {
      execSync(`git tag -l "${tagName}"`, { encoding: 'utf8' });
      const tagExists = execSync(`git tag -l "${tagName}"`, {
        encoding: 'utf8',
      }).trim();
      if (tagExists) {
        console.log(`   ⚠️  Tag ${tagName} already exists`);
      } else {
        console.log(`   ✅ Tag ${tagName} is available`);
      }
    } catch (error) {
      console.log(`   ✅ Tag ${tagName} is available`);
    }

    // Test 7: Simulate commit message creation
    console.log('\n7️⃣ Simulating commit message creation...');
    const commitMessage = `chore: bump version to ${newVersion}

Version Details:
- Increment type: patch
- Reason: Test version increment
- Breaking changes: false
- New features: false
- Bug fixes: true`;

    console.log('   Commit message preview:');
    console.log('   ' + commitMessage.split('\n').join('\n   '));

    // Test 8: Simulate tag message creation
    console.log('\n8️⃣ Simulating tag message creation...');
    const tagMessage = `Release ${newVersion}

This release includes:
- Increment type: patch
- Reason: Test version increment
- 🐛 Contains bug fixes`;

    console.log('   Tag message preview:');
    console.log('   ' + tagMessage.split('\n').join('\n   '));

    console.log('\n✅ All git tagging tests passed!');
    console.log('\n📋 Summary:');
    console.log(`   - Repository: Ready for tagging`);
    console.log(`   - Branch: ${currentBranch}`);
    console.log(`   - Current version: ${currentVersion}`);
    console.log(`   - Next version: ${newVersion}`);
    console.log(`   - Next tag: ${tagName}`);
  } catch (error) {
    console.error('\n❌ Git tagging test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testGitTagging();
}

module.exports = { testGitTagging };
