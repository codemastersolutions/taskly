#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Test Reporter - Generates comprehensive test reports
 * Analyzes test results, coverage data, and generates summaries
 */

class TestReporter {
  constructor(options = {}) {
    this.coverageDir =
      options.coverageDir || path.join(process.cwd(), 'coverage');
    this.outputDir = options.outputDir || this.coverageDir;
    this.verbose = options.verbose || false;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async loadTestResults() {
    const testResultsFile = path.join(this.coverageDir, 'test-results.json');

    if (!fs.existsSync(testResultsFile)) {
      this.log('Test results file not found', 'warn');
      return null;
    }

    try {
      const data = fs.readFileSync(testResultsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.log(`Error loading test results: ${error.message}`, 'error');
      return null;
    }
  }

  async loadCoverageData() {
    const coverageFile = path.join(this.coverageDir, 'coverage-summary.json');

    if (!fs.existsSync(coverageFile)) {
      this.log('Coverage summary file not found', 'warn');
      return null;
    }

    try {
      const data = fs.readFileSync(coverageFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.log(`Error loading coverage data: ${error.message}`, 'error');
      return null;
    }
  }

  generateTestSummary(testResults) {
    if (!testResults) return null;

    const summary = {
      totalTests: testResults.numTotalTests || 0,
      passedTests: testResults.numPassedTests || 0,
      failedTests: testResults.numFailedTests || 0,
      skippedTests: testResults.numPendingTests || 0,
      testSuites: testResults.numTotalTestSuites || 0,
      passedSuites: testResults.numPassedTestSuites || 0,
      failedSuites: testResults.numFailedTestSuites || 0,
      duration: 0,
      success: (testResults.numFailedTests || 0) === 0,
    };

    // Calculate total duration
    if (testResults.testResults) {
      summary.duration = testResults.testResults.reduce((acc, result) => {
        return acc + (result.perfStats?.runtime || 0);
      }, 0);
    }

    return summary;
  }

  generateCoverageSummary(coverageData) {
    if (!coverageData || !coverageData.total) return null;

    const total = coverageData.total;
    const thresholds = {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    };

    const summary = {
      statements: {
        pct: total.statements.pct,
        covered: total.statements.covered,
        total: total.statements.total,
        threshold: thresholds.statements,
        passed: total.statements.pct >= thresholds.statements,
      },
      branches: {
        pct: total.branches.pct,
        covered: total.branches.covered,
        total: total.branches.total,
        threshold: thresholds.branches,
        passed: total.branches.pct >= thresholds.branches,
      },
      functions: {
        pct: total.functions.pct,
        covered: total.functions.covered,
        total: total.functions.total,
        threshold: thresholds.functions,
        passed: total.functions.pct >= thresholds.functions,
      },
      lines: {
        pct: total.lines.pct,
        covered: total.lines.covered,
        total: total.lines.total,
        threshold: thresholds.lines,
        passed: total.lines.pct >= thresholds.lines,
      },
    };

    summary.overallPassed = Object.values(summary).every(metric =>
      typeof metric === 'object' ? metric.passed : true
    );

    return summary;
  }

  generateMarkdownReport(testSummary, coverageSummary) {
    const timestamp = new Date().toISOString();
    let report = `# Test Report\n\n`;
    report += `**Generated:** ${timestamp}\n\n`;

    // Test Results Section
    if (testSummary) {
      report += `## Test Results\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Total Tests | ${testSummary.totalTests} |\n`;
      report += `| Passed | ${testSummary.passedTests} ✅ |\n`;
      report += `| Failed | ${testSummary.failedTests} ${testSummary.failedTests > 0 ? '❌' : '✅'} |\n`;
      report += `| Skipped | ${testSummary.skippedTests} |\n`;
      report += `| Test Suites | ${testSummary.testSuites} |\n`;
      report += `| Duration | ${testSummary.duration}ms |\n`;
      report += `| Status | ${testSummary.success ? '✅ PASSED' : '❌ FAILED'} |\n\n`;
    }

    // Coverage Section
    if (coverageSummary) {
      report += `## Coverage Summary\n\n`;
      report += `| Metric | Coverage | Covered/Total | Threshold | Status |\n`;
      report += `|--------|----------|---------------|-----------|--------|\n`;

      for (const [metric, data] of Object.entries(coverageSummary)) {
        if (typeof data === 'object' && data.pct !== undefined) {
          const status = data.passed ? '✅' : '❌';
          report += `| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${data.pct.toFixed(2)}% | ${data.covered}/${data.total} | ${data.threshold}% | ${status} |\n`;
        }
      }

      report += `\n**Overall Coverage Status:** ${coverageSummary.overallPassed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    }

    // Recommendations
    report += `## Recommendations\n\n`;

    if (testSummary && testSummary.failedTests > 0) {
      report += `- 🔧 Fix ${testSummary.failedTests} failing test(s)\n`;
    }

    if (coverageSummary && !coverageSummary.overallPassed) {
      const failedMetrics = Object.entries(coverageSummary)
        .filter(([key, data]) => typeof data === 'object' && !data.passed)
        .map(([key]) => key);

      report += `- 📈 Improve coverage for: ${failedMetrics.join(', ')}\n`;
    }

    if (
      testSummary &&
      testSummary.success &&
      coverageSummary &&
      coverageSummary.overallPassed
    ) {
      report += `- 🎉 All tests and coverage thresholds are passing!\n`;
    }

    return report;
  }

  generateJsonReport(testSummary, coverageSummary) {
    return {
      timestamp: new Date().toISOString(),
      test: testSummary,
      coverage: coverageSummary,
      overall: {
        success:
          (testSummary?.success ?? true) &&
          (coverageSummary?.overallPassed ?? true),
      },
    };
  }

  async generateReports() {
    this.log('Loading test data...');

    const testResults = await this.loadTestResults();
    const coverageData = await this.loadCoverageData();

    const testSummary = this.generateTestSummary(testResults);
    const coverageSummary = this.generateCoverageSummary(coverageData);

    this.log('Generating reports...');

    // Generate Markdown report
    const markdownReport = this.generateMarkdownReport(
      testSummary,
      coverageSummary
    );
    const markdownFile = path.join(this.outputDir, 'test-report.md');
    fs.writeFileSync(markdownFile, markdownReport);
    this.log(`Markdown report saved to: ${markdownFile}`);

    // Generate JSON report
    const jsonReport = this.generateJsonReport(testSummary, coverageSummary);
    const jsonFile = path.join(this.outputDir, 'test-report.json');
    fs.writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2));
    this.log(`JSON report saved to: ${jsonFile}`);

    // Generate badge data
    const badgeData = this.generateBadgeData(testSummary, coverageSummary);
    const badgeFile = path.join(this.outputDir, 'badges.json');
    fs.writeFileSync(badgeFile, JSON.stringify(badgeData, null, 2));
    this.log(`Badge data saved to: ${badgeFile}`);

    // Console summary
    this.printConsoleSummary(testSummary, coverageSummary);

    return {
      success: jsonReport.overall.success,
      reports: {
        markdown: markdownFile,
        json: jsonFile,
        badges: badgeFile,
      },
    };
  }

  generateBadgeData(testSummary, coverageSummary) {
    const badges = {};

    if (testSummary) {
      badges.tests = {
        schemaVersion: 1,
        label: 'tests',
        message: `${testSummary.passedTests}/${testSummary.totalTests} passed`,
        color: testSummary.success ? 'brightgreen' : 'red',
      };
    }

    if (coverageSummary) {
      const avgCoverage = Math.round(
        (coverageSummary.statements.pct +
          coverageSummary.branches.pct +
          coverageSummary.functions.pct +
          coverageSummary.lines.pct) /
          4
      );

      badges.coverage = {
        schemaVersion: 1,
        label: 'coverage',
        message: `${avgCoverage}%`,
        color:
          avgCoverage >= 90
            ? 'brightgreen'
            : avgCoverage >= 80
              ? 'yellow'
              : 'red',
      };
    }

    return badges;
  }

  printConsoleSummary(testSummary, coverageSummary) {
    console.log('\n' + '='.repeat(60));
    console.log('  TEST REPORT SUMMARY');
    console.log('='.repeat(60));

    if (testSummary) {
      console.log(
        `\n📊 Tests: ${testSummary.passedTests}/${testSummary.totalTests} passed`
      );
      console.log(`⏱️  Duration: ${testSummary.duration}ms`);
      console.log(
        `📁 Suites: ${testSummary.passedSuites}/${testSummary.testSuites} passed`
      );
    }

    if (coverageSummary) {
      console.log(`\n📈 Coverage:`);
      console.log(
        `   Statements: ${coverageSummary.statements.pct.toFixed(2)}% (${coverageSummary.statements.passed ? '✅' : '❌'})`
      );
      console.log(
        `   Branches:   ${coverageSummary.branches.pct.toFixed(2)}% (${coverageSummary.branches.passed ? '✅' : '❌'})`
      );
      console.log(
        `   Functions:  ${coverageSummary.functions.pct.toFixed(2)}% (${coverageSummary.functions.passed ? '✅' : '❌'})`
      );
      console.log(
        `   Lines:      ${coverageSummary.lines.pct.toFixed(2)}% (${coverageSummary.lines.passed ? '✅' : '❌'})`
      );
    }

    const overallSuccess =
      (testSummary?.success ?? true) &&
      (coverageSummary?.overallPassed ?? true);
    console.log(`\n🎯 Overall: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60) + '\n');
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverageDir: args
      .find(arg => arg.startsWith('--coverage-dir='))
      ?.split('=')[1],
    outputDir: args.find(arg => arg.startsWith('--output-dir='))?.split('=')[1],
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/test-reporter.js [options]

Options:
  --coverage-dir=<path>   Coverage directory (default: ./coverage)
  --output-dir=<path>     Output directory for reports (default: same as coverage-dir)
  --verbose, -v           Verbose output
  --help, -h              Show this help message

Examples:
  node scripts/test-reporter.js
  node scripts/test-reporter.js --verbose
  node scripts/test-reporter.js --coverage-dir=./coverage --output-dir=./reports
`);
    process.exit(0);
  }

  const reporter = new TestReporter(options);

  try {
    const result = await reporter.generateReports();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Error generating reports:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestReporter;
