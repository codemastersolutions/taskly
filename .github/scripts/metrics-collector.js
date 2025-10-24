#!/usr/bin/env node

/**
 * Metrics Collector for GitHub Actions
 * Collects and stores workflow metrics for analysis and monitoring
 */

const fs = require('fs');
const path = require('path');

class MetricsCollector {
  constructor() {
    this.metricsDir = path.join(process.cwd(), '.github', 'metrics');
    this.ensureMetricsDirectory();
  }

  ensureMetricsDirectory() {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  /**
   * Collect workflow execution metrics
   */
  collectWorkflowMetrics(data) {
    const metrics = {
      timestamp: new Date().toISOString(),
      workflowName: data.workflowName || process.env.GITHUB_WORKFLOW,
      runId: data.runId || process.env.GITHUB_RUN_ID,
      runNumber: data.runNumber || process.env.GITHUB_RUN_NUMBER,
      runAttempt: data.runAttempt || process.env.GITHUB_RUN_ATTEMPT,
      actor: data.actor || process.env.GITHUB_ACTOR,
      event: data.event || process.env.GITHUB_EVENT_NAME,
      ref: data.ref || process.env.GITHUB_REF,
      sha: data.sha || process.env.GITHUB_SHA,
      repository: data.repository || process.env.GITHUB_REPOSITORY,

      // Timing metrics
      startTime: data.startTime,
      endTime: data.endTime || new Date().toISOString(),
      duration: data.duration || this.calculateDuration(data.startTime),

      // Job metrics
      jobs: data.jobs || [],
      totalJobs: data.totalJobs || 0,
      successfulJobs: data.successfulJobs || 0,
      failedJobs: data.failedJobs || 0,
      skippedJobs: data.skippedJobs || 0,

      // Resource metrics
      resourceUsage: data.resourceUsage || {},

      // Custom metrics
      customMetrics: data.customMetrics || {},
    };

    this.saveMetrics('workflow', metrics);
    return metrics;
  }

  /**
   * Collect bundle size metrics over time
   */
  collectBundleMetrics(data) {
    const metrics = {
      timestamp: new Date().toISOString(),
      version: data.version,
      commit: data.commit || process.env.GITHUB_SHA,

      // Bundle sizes
      totalSize: data.totalSize,
      gzippedSize: data.gzippedSize,

      // Format-specific sizes
      cjsSize: data.cjsSize,
      cjsGzipped: data.cjsGzipped,
      esmSize: data.esmSize,
      esmGzipped: data.esmGzipped,
      umdSize: data.umdSize,
      umdGzipped: data.umdGzipped,

      // Entry point sizes
      mainSize: data.mainSize,
      moduleSize: data.moduleSize,
      typesSize: data.typesSize,
      binSize: data.binSize,

      // Performance metrics
      parseTime: data.parseTime,
      executionTime: data.executionTime,
      memoryUsage: data.memoryUsage,

      // Composition
      dependencyCount: data.dependencyCount,
      treeShakingEfficiency: data.treeShakingEfficiency,

      // Size changes
      sizeChange: data.sizeChange,
      sizeChangePercent: data.sizeChangePercent,
    };

    this.saveMetrics('bundle', metrics);
    this.updateBundleTrends(metrics);
    return metrics;
  }

  /**
   * Collect release frequency and type metrics
   */
  collectReleaseMetrics(data) {
    const metrics = {
      timestamp: new Date().toISOString(),
      version: data.version,
      previousVersion: data.previousVersion,
      incrementType: data.incrementType, // major, minor, patch
      releaseType: data.releaseType, // stable, prerelease, etc.

      // Release content
      breakingChanges: data.breakingChanges || 0,
      newFeatures: data.newFeatures || 0,
      bugFixes: data.bugFixes || 0,
      otherChanges: data.otherChanges || 0,

      // Timing
      timeSinceLastRelease: data.timeSinceLastRelease,
      developmentDuration: data.developmentDuration,

      // Quality metrics at release
      testCoverage: data.testCoverage,
      securityScore: data.securityScore,
      qualityScore: data.qualityScore,

      // Publication metrics
      publicationDuration: data.publicationDuration,
      npmPublishSuccess: data.npmPublishSuccess,
      githubReleaseSuccess: data.githubReleaseSuccess,

      // Post-release metrics
      downloadCount: data.downloadCount,
      installationSuccess: data.installationSuccess,
    };

    this.saveMetrics('release', metrics);
    this.updateReleaseTrends(metrics);
    return metrics;
  }

  /**
   * Collect job-specific metrics
   */
  collectJobMetrics(data) {
    const metrics = {
      timestamp: new Date().toISOString(),
      workflowRunId: process.env.GITHUB_RUN_ID,
      jobName: data.jobName,

      // Timing
      startTime: data.startTime,
      endTime: data.endTime || new Date().toISOString(),
      duration: data.duration || this.calculateDuration(data.startTime),

      // Status
      status: data.status, // success, failure, cancelled, skipped
      conclusion: data.conclusion,

      // Steps
      totalSteps: data.totalSteps || 0,
      successfulSteps: data.successfulSteps || 0,
      failedSteps: data.failedSteps || 0,
      skippedSteps: data.skippedSteps || 0,

      // Resource usage
      cpuUsage: data.cpuUsage,
      memoryUsage: data.memoryUsage,
      diskUsage: data.diskUsage,
      networkUsage: data.networkUsage,

      // Job-specific metrics
      testResults: data.testResults,
      coverageResults: data.coverageResults,
      lintResults: data.lintResults,
      buildResults: data.buildResults,
      securityResults: data.securityResults,
    };

    this.saveMetrics('job', metrics);
    return metrics;
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics(data) {
    const metrics = {
      timestamp: new Date().toISOString(),

      // Workflow performance
      workflowDuration: data.workflowDuration,
      queueTime: data.queueTime,
      setupTime: data.setupTime,

      // Job performance
      jobDurations: data.jobDurations || {},
      parallelEfficiency: data.parallelEfficiency,

      // Step performance
      slowestSteps: data.slowestSteps || [],
      averageStepDuration: data.averageStepDuration,

      // Resource efficiency
      cpuEfficiency: data.cpuEfficiency,
      memoryEfficiency: data.memoryEfficiency,
      cacheHitRate: data.cacheHitRate,

      // Network performance
      downloadSpeed: data.downloadSpeed,
      uploadSpeed: data.uploadSpeed,

      // Build performance
      buildTime: data.buildTime,
      testTime: data.testTime,
      lintTime: data.lintTime,

      // Bottlenecks
      bottlenecks: data.bottlenecks || [],
    };

    this.saveMetrics('performance', metrics);
    return metrics;
  }

  /**
   * Calculate duration between start and end times
   */
  calculateDuration(startTime, endTime = null) {
    if (!startTime) return null;

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();

    return Math.round((end - start) / 1000); // Duration in seconds
  }

  /**
   * Save metrics to file
   */
  saveMetrics(type, metrics) {
    const filename = `${type}-${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(this.metricsDir, filename);

    // Append to JSONL file (one JSON object per line)
    const line = JSON.stringify(metrics) + '\n';
    fs.appendFileSync(filepath, line, 'utf8');

    console.log(`Metrics saved: ${filepath}`);
  }

  /**
   * Update bundle size trends
   */
  updateBundleTrends(metrics) {
    const trendsFile = path.join(this.metricsDir, 'bundle-trends.json');
    let trends = { history: [] };

    if (fs.existsSync(trendsFile)) {
      trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
    }

    // Add current metrics to history
    trends.history.push({
      timestamp: metrics.timestamp,
      version: metrics.version,
      totalSize: metrics.totalSize,
      gzippedSize: metrics.gzippedSize,
      sizeChange: metrics.sizeChange,
      sizeChangePercent: metrics.sizeChangePercent,
    });

    // Keep only last 100 entries
    if (trends.history.length > 100) {
      trends.history = trends.history.slice(-100);
    }

    // Calculate trends
    trends.averageSize = this.calculateAverage(trends.history, 'totalSize');
    trends.averageGzippedSize = this.calculateAverage(
      trends.history,
      'gzippedSize'
    );
    trends.sizeGrowthTrend = this.calculateTrend(trends.history, 'totalSize');
    trends.lastUpdated = metrics.timestamp;

    fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2), 'utf8');
  }

  /**
   * Update release frequency trends
   */
  updateReleaseTrends(metrics) {
    const trendsFile = path.join(this.metricsDir, 'release-trends.json');
    let trends = { history: [] };

    if (fs.existsSync(trendsFile)) {
      trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
    }

    // Add current release to history
    trends.history.push({
      timestamp: metrics.timestamp,
      version: metrics.version,
      incrementType: metrics.incrementType,
      timeSinceLastRelease: metrics.timeSinceLastRelease,
      breakingChanges: metrics.breakingChanges,
      newFeatures: metrics.newFeatures,
      bugFixes: metrics.bugFixes,
    });

    // Keep only last 50 releases
    if (trends.history.length > 50) {
      trends.history = trends.history.slice(-50);
    }

    // Calculate trends
    trends.releaseFrequency = this.calculateReleaseFrequency(trends.history);
    trends.incrementTypeDistribution = this.calculateIncrementDistribution(
      trends.history
    );
    trends.averageTimeBetweenReleases =
      this.calculateAverageTimeBetweenReleases(trends.history);
    trends.lastUpdated = metrics.timestamp;

    fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2), 'utf8');
  }

  /**
   * Calculate average value for a property in an array
   */
  calculateAverage(array, property) {
    if (array.length === 0) return 0;

    const sum = array.reduce((acc, item) => {
      const value = parseFloat(item[property]) || 0;
      return acc + value;
    }, 0);

    return Math.round(sum / array.length);
  }

  /**
   * Calculate trend (positive = growing, negative = shrinking)
   */
  calculateTrend(array, property) {
    if (array.length < 2) return 0;

    const recent = array.slice(-10); // Last 10 entries
    if (recent.length < 2) return 0;

    const first = parseFloat(recent[0][property]) || 0;
    const last = parseFloat(recent[recent.length - 1][property]) || 0;

    if (first === 0) return 0;

    return Math.round(((last - first) / first) * 100); // Percentage change
  }

  /**
   * Calculate release frequency (releases per month)
   */
  calculateReleaseFrequency(releases) {
    if (releases.length < 2) return 0;

    const firstRelease = new Date(releases[0].timestamp);
    const lastRelease = new Date(releases[releases.length - 1].timestamp);

    const monthsDiff =
      (lastRelease - firstRelease) / (1000 * 60 * 60 * 24 * 30);

    if (monthsDiff === 0) return 0;

    return Math.round((releases.length / monthsDiff) * 100) / 100;
  }

  /**
   * Calculate distribution of increment types
   */
  calculateIncrementDistribution(releases) {
    const distribution = { major: 0, minor: 0, patch: 0 };

    releases.forEach(release => {
      if (distribution.hasOwnProperty(release.incrementType)) {
        distribution[release.incrementType]++;
      }
    });

    return distribution;
  }

  /**
   * Calculate average time between releases
   */
  calculateAverageTimeBetweenReleases(releases) {
    if (releases.length < 2) return 0;

    let totalTime = 0;
    let intervals = 0;

    for (let i = 1; i < releases.length; i++) {
      const current = new Date(releases[i].timestamp);
      const previous = new Date(releases[i - 1].timestamp);

      totalTime += current - previous;
      intervals++;
    }

    if (intervals === 0) return 0;

    // Return average in days
    return Math.round(totalTime / intervals / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate metrics summary
   */
  generateMetricsSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      bundleTrends: this.loadTrends('bundle-trends.json'),
      releaseTrends: this.loadTrends('release-trends.json'),
      recentWorkflows: this.getRecentMetrics('workflow', 10),
      recentJobs: this.getRecentMetrics('job', 20),
      performanceMetrics: this.getRecentMetrics('performance', 5),
    };

    return summary;
  }

  /**
   * Load trends from file
   */
  loadTrends(filename) {
    const filepath = path.join(this.metricsDir, filename);

    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }

    return null;
  }

  /**
   * Get recent metrics of a specific type
   */
  getRecentMetrics(type, count = 10) {
    const today = new Date().toISOString().split('T')[0];
    const filename = `${type}-${today}.jsonl`;
    const filepath = path.join(this.metricsDir, filename);

    if (!fs.existsSync(filepath)) {
      return [];
    }

    const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
    const metrics = lines
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .slice(-count);

    return metrics;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(outputPath, format = 'json') {
    const summary = this.generateMetricsSummary();

    if (format === 'json') {
      fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
    } else if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csv = this.convertToCSV(summary);
      fs.writeFileSync(outputPath, csv, 'utf8');
    }

    console.log(`Metrics exported to: ${outputPath}`);
  }

  /**
   * Convert metrics to CSV format
   */
  convertToCSV(data) {
    // This is a simplified CSV conversion
    // In a real implementation, you might want to use a proper CSV library
    let csv = 'Type,Timestamp,Metric,Value\n';

    // Add bundle trends
    if (data.bundleTrends && data.bundleTrends.history) {
      data.bundleTrends.history.forEach(entry => {
        csv += `bundle,${entry.timestamp},totalSize,${entry.totalSize}\n`;
        csv += `bundle,${entry.timestamp},gzippedSize,${entry.gzippedSize}\n`;
      });
    }

    // Add release trends
    if (data.releaseTrends && data.releaseTrends.history) {
      data.releaseTrends.history.forEach(entry => {
        csv += `release,${entry.timestamp},version,${entry.version}\n`;
        csv += `release,${entry.timestamp},incrementType,${entry.incrementType}\n`;
      });
    }

    return csv;
  }
}

// CLI interface
if (require.main === module) {
  const collector = new MetricsCollector();
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node metrics-collector.js <command> [options]');
    console.error('Commands: collect, summary, export');
    process.exit(1);
  }

  const [command] = args;

  try {
    switch (command) {
      case 'collect':
        if (args.length < 3) {
          console.error(
            'Usage: node metrics-collector.js collect <type> <data-file>'
          );
          console.error('Types: workflow, bundle, release, job, performance');
          process.exit(1);
        }

        const [, type, dataFile] = args;
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

        let result;
        switch (type) {
          case 'workflow':
            result = collector.collectWorkflowMetrics(data);
            break;
          case 'bundle':
            result = collector.collectBundleMetrics(data);
            break;
          case 'release':
            result = collector.collectReleaseMetrics(data);
            break;
          case 'job':
            result = collector.collectJobMetrics(data);
            break;
          case 'performance':
            result = collector.collectPerformanceMetrics(data);
            break;
          default:
            console.error(`Unknown metrics type: ${type}`);
            process.exit(1);
        }

        console.log('Metrics collected successfully');
        break;

      case 'summary':
        const summary = collector.generateMetricsSummary();
        console.log(JSON.stringify(summary, null, 2));
        break;

      case 'export':
        if (args.length < 2) {
          console.error(
            'Usage: node metrics-collector.js export <output-file> [format]'
          );
          process.exit(1);
        }

        const [, outputFile, format = 'json'] = args;
        collector.exportMetrics(outputFile, format);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = MetricsCollector;
