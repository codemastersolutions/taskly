#!/usr/bin/env node

/**
 * Report Generator for GitHub Actions
 * Generates formatted reports using templates and data
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates', 'reports');
  }

  /**
   * Simple template engine - replaces {{VARIABLE}} with values
   * Supports basic conditionals: {{#if VARIABLE}} content {{/if}}
   * Supports loops: {{#each ARRAY}} {{this.property}} {{/each}}
   */
  processTemplate(template, data) {
    let processed = template;

    // Process conditionals first
    processed = this.processConditionals(processed, data);

    // Process loops
    processed = this.processLoops(processed, data);

    // Process simple variable replacements
    processed = this.processVariables(processed, data);

    return processed;
  }

  processConditionals(template, data) {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, variable, content) => {
      const value = data[variable];
      if (value && value !== '' && value !== 0 && value !== false) {
        return content;
      }
      return '';
    });
  }

  processLoops(template, data) {
    const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array) || array.length === 0) {
        return '';
      }

      return array
        .map(item => {
          let itemContent = content;

          // Replace {{this.property}} with item properties
          const thisRegex = /\{\{this\.(\w+)\}\}/g;
          itemContent = itemContent.replace(thisRegex, (match, prop) => {
            return item[prop] || '';
          });

          // Replace {{this}} with the item itself (for primitive arrays)
          itemContent = itemContent.replace(/\{\{this\}\}/g, item);

          return itemContent;
        })
        .join('');
    });
  }

  processVariables(template, data) {
    const variableRegex = /\{\{(\w+)\}\}/g;

    return template.replace(variableRegex, (match, variable) => {
      return data[variable] || '';
    });
  }

  /**
   * Generate a quality report
   */
  generateQualityReport(data) {
    const template = fs.readFileSync(
      path.join(this.templatesDir, 'quality-report.md'),
      'utf8'
    );

    const reportData = {
      LINT_STATUS: data.lintResult === 'success' ? '✅ Passed' : '❌ Failed',
      LINT_ERRORS: data.lintErrors || 0,
      LINT_WARNINGS: data.lintWarnings || 0,
      LINT_FILES_COUNT: data.lintFilesCount || 0,
      LINT_ERRORS_DETAILS: data.lintErrorsDetails || '',

      FORMAT_STATUS:
        data.formatResult === 'success' ? '✅ Passed' : '❌ Failed',
      FORMAT_FILES_COUNT: data.formatFilesCount || 0,
      FORMAT_ISSUES: data.formatIssues || 0,
      FORMAT_ISSUES_DETAILS: data.formatIssuesDetails || '',

      TYPECHECK_STATUS:
        data.typecheckResult === 'success' ? '✅ Passed' : '❌ Failed',
      TYPECHECK_ERRORS: data.typecheckErrors || 0,
      TYPECHECK_FILES_COUNT: data.typecheckFilesCount || 0,
      TYPECHECK_ERRORS_DETAILS: data.typecheckErrorsDetails || '',

      COMPLEXITY_SCORE: data.complexityScore || 'N/A',
      MAINTAINABILITY_SCORE: data.maintainabilityScore || 'N/A',
      TECH_DEBT_MINUTES: data.techDebtMinutes || 0,

      QUALITY_SCORE: this.calculateQualityScore(data),
      QUALITY_RECOMMENDATIONS: data.qualityRecommendations || '',

      TIMESTAMP: new Date().toISOString(),
    };

    return this.processTemplate(template, reportData);
  }

  /**
   * Generate a security report
   */
  generateSecurityReport(data) {
    const template = fs.readFileSync(
      path.join(this.templatesDir, 'security-report.md'),
      'utf8'
    );

    const reportData = {
      TOTAL_VULNERABILITIES: data.totalVulnerabilities || 0,
      CRITICAL_COUNT: data.criticalCount || 0,
      HIGH_COUNT: data.highCount || 0,
      MODERATE_COUNT: data.moderateCount || 0,
      LOW_COUNT: data.lowCount || 0,
      SECURITY_SCORE: this.calculateSecurityScore(data),

      AUDIT_LEVEL: data.auditLevel || 'moderate',
      THRESHOLD_MET: data.thresholdMet ? '✅ Yes' : '❌ No',
      ACTION_REQUIRED: data.actionRequired ? '⚠️ Yes' : '✅ No',

      VULNERABILITIES_DETAILS: data.vulnerabilitiesDetails || [],

      TOTAL_DEPENDENCIES: data.totalDependencies || 0,
      DIRECT_DEPENDENCIES: data.directDependencies || 0,
      OUTDATED_COUNT: data.outdatedCount || 0,
      DEPRECATED_COUNT: data.deprecatedCount || 0,
      OUTDATED_DETAILS: data.outdatedDetails || [],

      LICENSE_CHECK_STATUS: data.licenseCheckStatus || 'Not checked',
      ALLOWED_LICENSES: data.allowedLicenses || 'MIT, Apache-2.0, BSD-3-Clause',
      LICENSE_ISSUES_COUNT: data.licenseIssuesCount || 0,
      LICENSE_ISSUES: data.licenseIssues || [],

      SECRETS_FOUND: data.secretsFound || 0,
      PATTERNS_CHECKED: data.patternsChecked || 0,
      SECRETS_DETAILS: data.secretsDetails || [],

      SECURITY_RECOMMENDATIONS: data.securityRecommendations || '',

      TIMESTAMP: new Date().toISOString(),
    };

    return this.processTemplate(template, reportData);
  }

  /**
   * Generate a bundle analysis report
   */
  generateBundleReport(data) {
    const template = fs.readFileSync(
      path.join(this.templatesDir, 'bundle-analysis.md'),
      'utf8'
    );

    const reportData = {
      TOTAL_SIZE: data.totalSize || 'Unknown',
      GZIPPED_SIZE: data.gzippedSize || 'Unknown',
      SIZE_LIMIT: data.sizeLimit || 'Not set',
      SIZE_STATUS: data.sizeStatus || 'Unknown',

      CJS_SIZE: data.cjsSize || 'N/A',
      CJS_GZIPPED: data.cjsGzipped || 'N/A',
      CJS_LIMIT: data.cjsLimit || 'N/A',
      CJS_STATUS: data.cjsStatus || 'Unknown',

      ESM_SIZE: data.esmSize || 'N/A',
      ESM_GZIPPED: data.esmGzipped || 'N/A',
      ESM_LIMIT: data.esmLimit || 'N/A',
      ESM_STATUS: data.esmStatus || 'Unknown',

      UMD_SIZE: data.umdSize || 'N/A',
      UMD_GZIPPED: data.umdGzipped || 'N/A',
      UMD_LIMIT: data.umdLimit || 'N/A',
      UMD_STATUS: data.umdStatus || 'N/A',

      MAIN_PATH: data.mainPath || 'N/A',
      MAIN_SIZE: data.mainSize || 'N/A',
      MAIN_STATUS: data.mainStatus || 'Unknown',

      MODULE_PATH: data.modulePath || 'N/A',
      MODULE_SIZE: data.moduleSize || 'N/A',
      MODULE_STATUS: data.moduleStatus || 'Unknown',

      TYPES_PATH: data.typesPath || 'N/A',
      TYPES_SIZE: data.typesSize || 'N/A',
      TYPES_STATUS: data.typesStatus || 'Unknown',

      BIN_PATH: data.binPath || 'N/A',
      BIN_SIZE: data.binSize || 'N/A',
      BIN_STATUS: data.binStatus || 'Unknown',

      SIZE_HISTORY: data.sizeHistory || [],
      BUNDLE_COMPOSITION: data.bundleComposition || [],

      PARSE_TIME: data.parseTime || 'N/A',
      EXECUTION_TIME: data.executionTime || 'N/A',
      MEMORY_USAGE: data.memoryUsage || 'N/A',
      TREE_SHAKING_EFFICIENCY: data.treeShakingEfficiency || 'N/A',

      OPTIMIZATION_SUGGESTIONS: data.optimizationSuggestions || [],

      BUNDLE_HEALTH_SCORE: this.calculateBundleHealthScore(data),
      SIZE_EFFICIENCY_SCORE: data.sizeEfficiencyScore || 0,
      PERFORMANCE_SCORE: data.performanceScore || 0,
      TREE_SHAKING_SCORE: data.treeShakingScore || 0,
      DEPENDENCIES_SCORE: data.dependenciesScore || 0,

      BUNDLE_WARNINGS: data.bundleWarnings || [],

      TIMESTAMP: new Date().toISOString(),
    };

    return this.processTemplate(template, reportData);
  }

  /**
   * Generate a publication report
   */
  generatePublicationReport(data) {
    const template = fs.readFileSync(
      path.join(this.templatesDir, 'publication-report.md'),
      'utf8'
    );

    const reportData = {
      PREVIOUS_VERSION: data.previousVersion || 'N/A',
      NEW_VERSION: data.newVersion || 'N/A',
      INCREMENT_TYPE: data.incrementType || 'N/A',
      RELEASE_TYPE: data.releaseType || 'N/A',

      VERSION_STATUS: data.versionStatus || 'Unknown',
      VERSION_DETAILS: data.versionDetails || '',
      VALIDATION_STATUS: data.validationStatus || 'Unknown',
      VALIDATION_DETAILS: data.validationDetails || '',
      NPM_STATUS: data.npmStatus || 'Unknown',
      NPM_DETAILS: data.npmDetails || '',
      GITHUB_STATUS: data.githubStatus || 'Unknown',
      GITHUB_DETAILS: data.githubDetails || '',

      PACKAGE_NAME: data.packageName || '@codemastersolutions/taskly',
      REGISTRY_URL: data.registryUrl || 'https://registry.npmjs.org',
      PACKAGE_SIZE: data.packageSize || 'Unknown',
      PUBLISHED_FILES_COUNT: data.publishedFilesCount || 0,
      PUBLISHED_FILES_LIST: data.publishedFilesList || '',

      BREAKING_CHANGES: data.breakingChanges || [],
      NEW_FEATURES: data.newFeatures || [],
      BUG_FIXES: data.bugFixes || [],
      OTHER_CHANGES: data.otherChanges || [],

      TEST_COVERAGE: data.testCoverage || 0,
      SECURITY_SCORE: data.securityScore || 0,
      QUALITY_SCORE: data.qualityScore || 0,
      BUNDLE_HEALTH: data.bundleHealth || 0,

      // Cross-platform validation matrix
      UBUNTU_16_STATUS: data.ubuntuNode16 || '❓',
      UBUNTU_18_STATUS: data.ubuntuNode18 || '❓',
      UBUNTU_20_STATUS: data.ubuntuNode20 || '❓',
      WINDOWS_16_STATUS: data.windowsNode16 || '❓',
      WINDOWS_18_STATUS: data.windowsNode18 || '❓',
      WINDOWS_20_STATUS: data.windowsNode20 || '❓',
      MACOS_16_STATUS: data.macosNode16 || '❓',
      MACOS_18_STATUS: data.macosNode18 || '❓',
      MACOS_20_STATUS: data.macosNode20 || '❓',

      VERIFICATION_RESULTS: data.verificationResults || [],

      PUBLICATION_DURATION: data.publicationDuration || 'N/A',
      DOWNLOAD_TIME_1MBPS: data.downloadTime1Mbps || 'N/A',
      DOWNLOAD_TIME_10MBPS: data.downloadTime10Mbps || 'N/A',
      INSTALL_TIME: data.installTime || 'N/A',

      NPM_URL: data.npmUrl || '',
      GITHUB_RELEASE_URL: data.githubReleaseUrl || '',
      DOCUMENTATION_URL: data.documentationUrl || '',
      ISSUES_URL: data.issuesUrl || '',
      DISCUSSIONS_URL: data.discussionsUrl || '',

      NEXT_STEPS: data.nextSteps || [],
      PUBLICATION_WARNINGS: data.publicationWarnings || [],

      WORKFLOW_NAME: data.workflowName || 'Auto Publish',
      WORKFLOW_URL: data.workflowUrl || '',

      TIMESTAMP: new Date().toISOString(),
    };

    return this.processTemplate(template, reportData);
  }

  /**
   * Calculate quality score based on various metrics
   */
  calculateQualityScore(data) {
    let score = 100;

    // Deduct points for lint errors/warnings
    if (data.lintResult !== 'success') score -= 30;
    if (data.lintWarnings > 0) score -= Math.min(data.lintWarnings * 2, 20);

    // Deduct points for format issues
    if (data.formatResult !== 'success') score -= 20;

    // Deduct points for type errors
    if (data.typecheckResult !== 'success') score -= 25;

    // Deduct points for complexity
    if (data.complexityScore > 7) score -= 15;

    return Math.max(score, 0);
  }

  /**
   * Calculate security score based on vulnerabilities
   */
  calculateSecurityScore(data) {
    let score = 100;

    // Deduct points based on vulnerability severity
    score -= (data.criticalCount || 0) * 25;
    score -= (data.highCount || 0) * 15;
    score -= (data.moderateCount || 0) * 5;
    score -= (data.lowCount || 0) * 1;

    // Deduct points for outdated dependencies
    score -= Math.min((data.outdatedCount || 0) * 2, 20);

    // Deduct points for license issues
    score -= (data.licenseIssuesCount || 0) * 10;

    // Deduct points for secrets
    score -= (data.secretsFound || 0) * 20;

    return Math.max(score, 0);
  }

  /**
   * Calculate bundle health score
   */
  calculateBundleHealthScore(data) {
    const sizeScore = data.sizeEfficiencyScore || 0;
    const performanceScore = data.performanceScore || 0;
    const treeShakingScore = data.treeShakingScore || 0;
    const dependenciesScore = data.dependenciesScore || 0;

    return sizeScore + performanceScore + treeShakingScore + dependenciesScore;
  }

  /**
   * Save report to file
   */
  saveReport(content, filename) {
    const outputDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');

    return filepath;
  }

  /**
   * Add report to GitHub Step Summary
   */
  addToStepSummary(content) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
      fs.appendFileSync(summaryFile, content + '\n');
    }
  }
}

// CLI interface
if (require.main === module) {
  const generator = new ReportGenerator();
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node report-generator.js <type> <data-file>');
    console.error('Types: quality, security, bundle, publication');
    process.exit(1);
  }

  const [type, dataFile] = args;

  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    let report;

    switch (type) {
      case 'quality':
        report = generator.generateQualityReport(data);
        break;
      case 'security':
        report = generator.generateSecurityReport(data);
        break;
      case 'bundle':
        report = generator.generateBundleReport(data);
        break;
      case 'publication':
        report = generator.generatePublicationReport(data);
        break;
      default:
        console.error(`Unknown report type: ${type}`);
        process.exit(1);
    }

    // Save to file
    const filename = `${type}-report-${Date.now()}.md`;
    const filepath = generator.saveReport(report, filename);
    console.log(`Report saved to: ${filepath}`);

    // Add to GitHub Step Summary if in GitHub Actions
    generator.addToStepSummary(report);
  } catch (error) {
    console.error('Error generating report:', error.message);
    process.exit(1);
  }
}

module.exports = ReportGenerator;
