#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Test automation script for continuous testing
 * Supports various test execution modes and reporting
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${COLORS[color] || ''}${text}${COLORS.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function logSection(title) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(`  ${title}`, 'bright'));
  console.log(colorize('='.repeat(60), 'cyan') + '\n');
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkCoverageThresholds() {
  const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coverageFile)) {
    log('Coverage summary not found, skipping threshold check', 'yellow');
    return true;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const total = coverage.total;
    
    const thresholds = {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    };

    let passed = true;
    
    logSection('Coverage Threshold Check');
    
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const actual = total[metric].pct;
      const status = actual >= threshold ? 'PASS' : 'FAIL';
      const color = actual >= threshold ? 'green' : 'red';
      
      log(`${metric.padEnd(12)}: ${actual.toFixed(2)}% (threshold: ${threshold}%) - ${colorize(status, color)}`, color);
      
      if (actual < threshold) {
        passed = false;
      }
    }
    
    if (passed) {
      log('\n✅ All coverage thresholds passed!', 'green');
    } else {
      log('\n❌ Some coverage thresholds failed!', 'red');
    }
    
    return passed;
  } catch (error) {
    log(`Error reading coverage file: ${error.message}`, 'red');
    return false;
  }
}

async function generateTestReport() {
  const reportDir = path.join(process.cwd(), 'coverage');
  const testResultsFile = path.join(reportDir, 'test-results.json');
  
  if (!fs.existsSync(testResultsFile)) {
    log('Test results file not found', 'yellow');
    return;
  }

  try {
    const results = JSON.parse(fs.readFileSync(testResultsFile, 'utf8'));
    
    logSection('Test Results Summary');
    
    log(`Total Tests: ${results.numTotalTests || 0}`, 'blue');
    log(`Passed: ${colorize(results.numPassedTests || 0, 'green')}`, 'green');
    log(`Failed: ${colorize(results.numFailedTests || 0, 'red')}`, 'red');
    log(`Skipped: ${colorize(results.numPendingTests || 0, 'yellow')}`, 'yellow');
    log(`Duration: ${results.testResults ? results.testResults.reduce((acc, r) => acc + (r.perfStats?.runtime || 0), 0) : 0}ms`, 'cyan');
    
    if (results.numFailedTests > 0) {
      log('\n❌ Some tests failed!', 'red');
      return false;
    } else {
      log('\n✅ All tests passed!', 'green');
      return true;
    }
  } catch (error) {
    log(`Error reading test results: ${error.message}`, 'red');
    return false;
  }
}

async function runTests(mode = 'default') {
  const modes = {
    default: {
      command: 'npm',
      args: ['run', 'test'],
      description: 'Run tests once'
    },
    coverage: {
      command: 'npm',
      args: ['run', 'test:coverage'],
      description: 'Run tests with coverage'
    },
    ci: {
      command: 'npm',
      args: ['run', 'test:ci'],
      description: 'Run tests in CI mode'
    },
    watch: {
      command: 'npm',
      args: ['run', 'test:watch'],
      description: 'Run tests in watch mode'
    },
    verbose: {
      command: 'npm',
      args: ['run', 'test:verbose'],
      description: 'Run tests with verbose output'
    }
  };

  const config = modes[mode];
  if (!config) {
    log(`Unknown test mode: ${mode}`, 'red');
    log(`Available modes: ${Object.keys(modes).join(', ')}`, 'yellow');
    process.exit(1);
  }

  logSection(`Running Tests - ${config.description}`);
  
  try {
    await runCommand(config.command, config.args);
    log('✅ Tests completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Tests failed: ${error.message}`, 'red');
    return false;
  }
}

async function runQualityChecks() {
  logSection('Quality Checks');
  
  const checks = [
    { name: 'Type Check', command: 'npm', args: ['run', 'type-check'] },
    { name: 'Linting', command: 'npm', args: ['run', 'lint:check'] },
    { name: 'Formatting', command: 'npm', args: ['run', 'format:check'] }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      log(`Running ${check.name}...`, 'blue');
      await runCommand(check.command, check.args);
      log(`✅ ${check.name} passed`, 'green');
    } catch (error) {
      log(`❌ ${check.name} failed`, 'red');
      allPassed = false;
    }
  }

  return allPassed;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'default';
  const options = {
    skipQuality: args.includes('--skip-quality'),
    skipCoverage: args.includes('--skip-coverage'),
    failFast: args.includes('--fail-fast'),
    generateReport: args.includes('--report') || mode === 'ci'
  };

  log(colorize('🧪 Taskly Test Automation', 'bright'));
  log(`Mode: ${mode}`, 'cyan');
  log(`Options: ${JSON.stringify(options)}`, 'cyan');

  let exitCode = 0;

  try {
    // Run quality checks first (unless skipped)
    if (!options.skipQuality && mode !== 'watch') {
      const qualityPassed = await runQualityChecks();
      if (!qualityPassed && options.failFast) {
        log('❌ Quality checks failed, exiting early', 'red');
        process.exit(1);
      }
      if (!qualityPassed) exitCode = 1;
    }

    // Run tests
    const testsPassed = await runTests(mode);
    if (!testsPassed) {
      exitCode = 1;
      if (options.failFast) {
        log('❌ Tests failed, exiting early', 'red');
        process.exit(1);
      }
    }

    // Check coverage thresholds (for coverage modes)
    if (!options.skipCoverage && (mode === 'coverage' || mode === 'ci')) {
      const coveragePassed = await checkCoverageThresholds();
      if (!coveragePassed) {
        exitCode = 1;
        if (options.failFast) {
          log('❌ Coverage thresholds not met, exiting early', 'red');
          process.exit(1);
        }
      }
    }

    // Generate test report
    if (options.generateReport) {
      const reportGenerated = await generateTestReport();
      if (!reportGenerated && exitCode === 0) {
        exitCode = 1;
      }
    }

    // Final summary
    logSection('Final Summary');
    if (exitCode === 0) {
      log('🎉 All checks passed successfully!', 'green');
    } else {
      log('💥 Some checks failed!', 'red');
    }

  } catch (error) {
    log(`💥 Unexpected error: ${error.message}`, 'red');
    exitCode = 1;
  }

  process.exit(exitCode);
}

// Handle CLI usage
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node scripts/test.js [mode] [options]

Modes:
  default   - Run tests once (default)
  coverage  - Run tests with coverage
  ci        - Run tests in CI mode with full reporting
  watch     - Run tests in watch mode
  verbose   - Run tests with verbose output

Options:
  --skip-quality    Skip quality checks (type-check, lint, format)
  --skip-coverage   Skip coverage threshold checks
  --fail-fast       Exit immediately on first failure
  --report          Generate detailed test report
  --help, -h        Show this help message

Examples:
  node scripts/test.js                    # Run default tests
  node scripts/test.js coverage           # Run with coverage
  node scripts/test.js ci --report        # Full CI mode with reporting
  node scripts/test.js watch              # Watch mode for development
`);
    process.exit(0);
  }

  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  runQualityChecks,
  checkCoverageThresholds,
  generateTestReport
};