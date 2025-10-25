#!/usr/bin/env node

/**
 * Anomaly Detector for CI/CD Metrics
 * Detects unusual patterns in workflow metrics and triggers alerts
 */

const fs = require('fs');
const path = require('path');

class AnomalyDetector {
  constructor() {
    this.metricsDir = path.join(process.cwd(), '.github', 'metrics');
    this.thresholds = this.loadThresholds();
  }

  /**
   * Load anomaly detection thresholds
   */
  loadThresholds() {
    const defaultThresholds = {
      bundleSize: {
        maxIncreasePercent: 20,
        maxSizeBytes: 1024 * 1024, // 1MB
        alertOnConsecutiveIncreases: 3,
      },
      workflowDuration: {
        maxIncreasePercent: 50,
        maxDurationSeconds: 1800, // 30 minutes
        alertOnConsecutiveSlowdowns: 2,
      },
      testCoverage: {
        minCoveragePercent: 80,
        maxDecreasePercent: 5,
        alertOnConsecutiveDecreases: 2,
      },
      securityVulnerabilities: {
        critical: 0,
        high: 2,
        moderate: 10,
        alertOnNewVulnerabilities: true,
      },
      releaseFrequency: {
        minDaysBetweenReleases: 1,
        maxDaysBetweenReleases: 30,
        alertOnFrequencyChange: true,
      },
      jobFailureRate: {
        maxFailurePercent: 10,
        windowSize: 20, // Last 20 jobs
        alertOnSpike: true,
      },
    };

    // Try to load custom thresholds
    const configPath = '.github/notification-config.json';
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.thresholds) {
          return { ...defaultThresholds, ...config.thresholds };
        }
      } catch (error) {
        console.warn('Failed to load custom thresholds, using defaults');
      }
    }

    return defaultThresholds;
  }

  /**
   * Detect all types of anomalies
   */
  async detectAnomalies() {
    const anomalies = [];

    try {
      // Load metrics data
      const bundleMetrics = this.loadMetrics('bundle');
      const workflowMetrics = this.loadMetrics('workflow');
      const jobMetrics = this.loadMetrics('job');
      const releaseMetrics = this.loadMetrics('release');

      // Detect bundle size anomalies
      const bundleAnomalies = this.detectBundleSizeAnomalies(bundleMetrics);
      anomalies.push(...bundleAnomalies);

      // Detect workflow duration anomalies
      const workflowAnomalies =
        this.detectWorkflowDurationAnomalies(workflowMetrics);
      anomalies.push(...workflowAnomalies);

      // Detect job failure rate anomalies
      const jobAnomalies = this.detectJobFailureAnomalies(jobMetrics);
      anomalies.push(...jobAnomalies);

      // Detect release frequency anomalies
      const releaseAnomalies =
        this.detectReleaseFrequencyAnomalies(releaseMetrics);
      anomalies.push(...releaseAnomalies);

      // Detect test coverage anomalies
      const coverageAnomalies =
        this.detectTestCoverageAnomalies(workflowMetrics);
      anomalies.push(...coverageAnomalies);
    } catch (error) {
      console.error('Error detecting anomalies:', error.message);
    }

    return anomalies;
  }

  /**
   * Detect bundle size anomalies
   */
  detectBundleSizeAnomalies(metrics) {
    const anomalies = [];

    if (metrics.length < 2) return anomalies;

    const recent = metrics.slice(-10); // Last 10 builds
    const threshold = this.thresholds.bundleSize;

    // Check for size increases
    let consecutiveIncreases = 0;
    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];

      if (current.totalSize && previous.totalSize) {
        const increasePercent =
          ((current.totalSize - previous.totalSize) / previous.totalSize) * 100;

        if (increasePercent > threshold.maxIncreasePercent) {
          anomalies.push({
            type: 'bundle-size-increase',
            severity: 'warning',
            metric: 'Bundle Size',
            currentValue: `${Math.round(current.totalSize / 1024)}KB`,
            previousValue: `${Math.round(previous.totalSize / 1024)}KB`,
            change: `+${increasePercent.toFixed(1)}%`,
            threshold: `${threshold.maxIncreasePercent}%`,
            message: `Bundle size increased by ${increasePercent.toFixed(1)}% (threshold: ${threshold.maxIncreasePercent}%)`,
            timestamp: current.timestamp,
            version: current.version,
          });
        }

        if (increasePercent > 0) {
          consecutiveIncreases++;
        } else {
          consecutiveIncreases = 0;
        }
      }
    }

    // Check for consecutive increases
    if (consecutiveIncreases >= threshold.alertOnConsecutiveIncreases) {
      anomalies.push({
        type: 'bundle-size-trend',
        severity: 'warning',
        metric: 'Bundle Size Trend',
        message: `Bundle size has increased for ${consecutiveIncreases} consecutive builds`,
        consecutiveIncreases: consecutiveIncreases,
        threshold: threshold.alertOnConsecutiveIncreases,
        timestamp: recent[recent.length - 1].timestamp,
      });
    }

    // Check absolute size limit
    const latest = recent[recent.length - 1];
    if (latest.totalSize > threshold.maxSizeBytes) {
      anomalies.push({
        type: 'bundle-size-limit',
        severity: 'error',
        metric: 'Bundle Size Limit',
        currentValue: `${Math.round(latest.totalSize / 1024)}KB`,
        threshold: `${Math.round(threshold.maxSizeBytes / 1024)}KB`,
        message: `Bundle size exceeds maximum allowed size`,
        timestamp: latest.timestamp,
        version: latest.version,
      });
    }

    return anomalies;
  }

  /**
   * Detect workflow duration anomalies
   */
  detectWorkflowDurationAnomalies(metrics) {
    const anomalies = [];

    if (metrics.length < 5) return anomalies;

    const recent = metrics.slice(-20); // Last 20 workflows
    const threshold = this.thresholds.workflowDuration;

    // Calculate baseline (average of first 10)
    const baseline = recent.slice(0, 10);
    const averageBaseline =
      baseline.reduce((sum, m) => sum + (m.duration || 0), 0) / baseline.length;

    // Check recent workflows against baseline
    const recentWorkflows = recent.slice(-5);
    let consecutiveSlowdowns = 0;

    recentWorkflows.forEach((workflow, index) => {
      if (workflow.duration) {
        const increasePercent =
          ((workflow.duration - averageBaseline) / averageBaseline) * 100;

        if (increasePercent > threshold.maxIncreasePercent) {
          anomalies.push({
            type: 'workflow-duration-increase',
            severity: 'warning',
            metric: 'Workflow Duration',
            currentValue: `${workflow.duration}s`,
            baselineValue: `${Math.round(averageBaseline)}s`,
            change: `+${increasePercent.toFixed(1)}%`,
            threshold: `${threshold.maxIncreasePercent}%`,
            message: `Workflow duration increased by ${increasePercent.toFixed(1)}% compared to baseline`,
            timestamp: workflow.timestamp,
            workflowName: workflow.workflowName,
          });

          consecutiveSlowdowns++;
        } else {
          consecutiveSlowdowns = 0;
        }

        // Check absolute duration limit
        if (workflow.duration > threshold.maxDurationSeconds) {
          anomalies.push({
            type: 'workflow-duration-limit',
            severity: 'error',
            metric: 'Workflow Duration Limit',
            currentValue: `${workflow.duration}s`,
            threshold: `${threshold.maxDurationSeconds}s`,
            message: `Workflow duration exceeds maximum allowed time`,
            timestamp: workflow.timestamp,
            workflowName: workflow.workflowName,
          });
        }
      }
    });

    // Check for consecutive slowdowns
    if (consecutiveSlowdowns >= threshold.alertOnConsecutiveSlowdowns) {
      anomalies.push({
        type: 'workflow-duration-trend',
        severity: 'warning',
        metric: 'Workflow Duration Trend',
        message: `Workflow has been slower than baseline for ${consecutiveSlowdowns} consecutive runs`,
        consecutiveSlowdowns: consecutiveSlowdowns,
        threshold: threshold.alertOnConsecutiveSlowdowns,
        timestamp: recentWorkflows[recentWorkflows.length - 1].timestamp,
      });
    }

    return anomalies;
  }

  /**
   * Detect job failure rate anomalies
   */
  detectJobFailureAnomalies(metrics) {
    const anomalies = [];

    if (metrics.length < 10) return anomalies;

    const threshold = this.thresholds.jobFailureRate;
    const windowSize = Math.min(threshold.windowSize, metrics.length);
    const recent = metrics.slice(-windowSize);

    // Calculate failure rate
    const failures = recent.filter(
      job => job.status === 'failure' || job.status === 'cancelled'
    ).length;
    const failureRate = (failures / recent.length) * 100;

    if (failureRate > threshold.maxFailurePercent) {
      anomalies.push({
        type: 'job-failure-rate',
        severity:
          failureRate > threshold.maxFailurePercent * 2 ? 'error' : 'warning',
        metric: 'Job Failure Rate',
        currentValue: `${failureRate.toFixed(1)}%`,
        threshold: `${threshold.maxFailurePercent}%`,
        windowSize: windowSize,
        failures: failures,
        totalJobs: recent.length,
        message: `Job failure rate (${failureRate.toFixed(1)}%) exceeds threshold (${threshold.maxFailurePercent}%) in last ${windowSize} jobs`,
        timestamp: recent[recent.length - 1].timestamp,
      });
    }

    return anomalies;
  }

  /**
   * Detect release frequency anomalies
   */
  detectReleaseFrequencyAnomalies(metrics) {
    const anomalies = [];

    if (metrics.length < 2) return anomalies;

    const threshold = this.thresholds.releaseFrequency;
    const recent = metrics.slice(-5); // Last 5 releases

    // Check time between releases
    for (let i = 1; i < recent.length; i++) {
      const current = new Date(recent[i].timestamp);
      const previous = new Date(recent[i - 1].timestamp);
      const daysBetween = (current - previous) / (1000 * 60 * 60 * 24);

      if (daysBetween < threshold.minDaysBetweenReleases) {
        anomalies.push({
          type: 'release-frequency-high',
          severity: 'warning',
          metric: 'Release Frequency',
          currentValue: `${daysBetween.toFixed(1)} days`,
          threshold: `${threshold.minDaysBetweenReleases} days minimum`,
          message: `Releases are too frequent (${daysBetween.toFixed(1)} days between releases)`,
          timestamp: recent[i].timestamp,
          version: recent[i].version,
        });
      }

      if (daysBetween > threshold.maxDaysBetweenReleases) {
        anomalies.push({
          type: 'release-frequency-low',
          severity: 'warning',
          metric: 'Release Frequency',
          currentValue: `${daysBetween.toFixed(1)} days`,
          threshold: `${threshold.maxDaysBetweenReleases} days maximum`,
          message: `Too much time between releases (${daysBetween.toFixed(1)} days)`,
          timestamp: recent[i].timestamp,
          version: recent[i].version,
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect test coverage anomalies
   */
  detectTestCoverageAnomalies(metrics) {
    const anomalies = [];

    // Filter metrics that have coverage data
    const coverageMetrics = metrics.filter(m => m.testCoverage !== undefined);

    if (coverageMetrics.length < 2) return anomalies;

    const threshold = this.thresholds.testCoverage;
    const recent = coverageMetrics.slice(-10);

    let consecutiveDecreases = 0;

    // Check coverage decreases
    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];

      const decreasePercent = previous.testCoverage - current.testCoverage;

      if (decreasePercent > threshold.maxDecreasePercent) {
        anomalies.push({
          type: 'test-coverage-decrease',
          severity: 'warning',
          metric: 'Test Coverage',
          currentValue: `${current.testCoverage}%`,
          previousValue: `${previous.testCoverage}%`,
          change: `-${decreasePercent.toFixed(1)}%`,
          threshold: `${threshold.maxDecreasePercent}%`,
          message: `Test coverage decreased by ${decreasePercent.toFixed(1)}%`,
          timestamp: current.timestamp,
        });

        consecutiveDecreases++;
      } else if (current.testCoverage > previous.testCoverage) {
        consecutiveDecreases = 0;
      }

      // Check minimum coverage
      if (current.testCoverage < threshold.minCoveragePercent) {
        anomalies.push({
          type: 'test-coverage-minimum',
          severity: 'error',
          metric: 'Test Coverage Minimum',
          currentValue: `${current.testCoverage}%`,
          threshold: `${threshold.minCoveragePercent}%`,
          message: `Test coverage below minimum threshold`,
          timestamp: current.timestamp,
        });
      }
    }

    // Check for consecutive decreases
    if (consecutiveDecreases >= threshold.alertOnConsecutiveDecreases) {
      anomalies.push({
        type: 'test-coverage-trend',
        severity: 'warning',
        metric: 'Test Coverage Trend',
        message: `Test coverage has decreased for ${consecutiveDecreases} consecutive builds`,
        consecutiveDecreases: consecutiveDecreases,
        threshold: threshold.alertOnConsecutiveDecreases,
        timestamp: recent[recent.length - 1].timestamp,
      });
    }

    return anomalies;
  }

  /**
   * Load metrics from JSONL files
   */
  loadMetrics(type) {
    const metrics = [];

    if (!fs.existsSync(this.metricsDir)) {
      return metrics;
    }

    const files = fs.readdirSync(this.metricsDir);
    const typeFiles = files.filter(
      file => file.startsWith(`${type}-`) && file.endsWith('.jsonl')
    );

    typeFiles.forEach(file => {
      const filepath = path.join(this.metricsDir, file);
      const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');

      lines.forEach(line => {
        if (line.trim()) {
          try {
            metrics.push(JSON.parse(line));
          } catch (error) {
            console.warn(`Failed to parse metrics line: ${line}`);
          }
        }
      });
    });

    // Sort by timestamp
    return metrics.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  /**
   * Save anomaly report
   */
  saveAnomalyReport(anomalies) {
    const report = {
      timestamp: new Date().toISOString(),
      totalAnomalies: anomalies.length,
      severityBreakdown: {
        error: anomalies.filter(a => a.severity === 'error').length,
        warning: anomalies.filter(a => a.severity === 'warning').length,
        info: anomalies.filter(a => a.severity === 'info').length,
      },
      anomalies: anomalies,
    };

    const outputDir = path.join(process.cwd(), 'anomaly-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `anomaly-report-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`Anomaly report saved: ${filepath}`);
    return filepath;
  }

  /**
   * Generate anomaly summary for notifications
   */
  generateAnomalySummary(anomalies) {
    if (anomalies.length === 0) {
      return {
        hasAnomalies: false,
        message: 'No anomalies detected',
        summary: 'All metrics are within normal ranges',
      };
    }

    const errors = anomalies.filter(a => a.severity === 'error');
    const warnings = anomalies.filter(a => a.severity === 'warning');

    let message = `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected`;

    if (errors.length > 0) {
      message += ` (${errors.length} error${errors.length === 1 ? '' : 's'}`;
      if (warnings.length > 0) {
        message += `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`;
      }
      message += ')';
    } else if (warnings.length > 0) {
      message += ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`;
    }

    const topAnomalies = anomalies
      .sort((a, b) => {
        const severityOrder = { error: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5);

    return {
      hasAnomalies: true,
      message: message,
      summary: topAnomalies.map(a => `• ${a.message}`).join('\n'),
      totalCount: anomalies.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      topAnomalies: topAnomalies,
    };
  }
}

// CLI interface
if (require.main === module) {
  const detector = new AnomalyDetector();

  async function main() {
    try {
      console.log('🔍 Detecting anomalies in CI/CD metrics...');

      const anomalies = await detector.detectAnomalies();

      if (anomalies.length === 0) {
        console.log('✅ No anomalies detected');
        return;
      }

      console.log(`⚠️ Found ${anomalies.length} anomalies:`);

      anomalies.forEach(anomaly => {
        const icon =
          anomaly.severity === 'error'
            ? '🚨'
            : anomaly.severity === 'warning'
              ? '⚠️'
              : 'ℹ️';
        console.log(
          `${icon} [${anomaly.severity.toUpperCase()}] ${anomaly.message}`
        );
      });

      // Save report
      const reportPath = detector.saveAnomalyReport(anomalies);

      // Generate summary for notifications
      const summary = detector.generateAnomalySummary(anomalies);

      // Save summary for use by notification system
      const summaryPath = 'anomaly-summary.json';
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

      console.log(`📊 Anomaly summary saved: ${summaryPath}`);

      // Exit with error code if there are error-level anomalies
      const hasErrors = anomalies.some(a => a.severity === 'error');
      if (hasErrors) {
        console.log('❌ Critical anomalies detected');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error during anomaly detection:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = AnomalyDetector;
