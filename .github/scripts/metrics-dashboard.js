#!/usr/bin/env node

/**
 * Metrics Dashboard Generator
 * Creates HTML dashboards and reports from collected metrics
 */

const fs = require('fs');
const path = require('path');

class MetricsDashboard {
  constructor() {
    this.metricsDir = path.join(process.cwd(), '.github', 'metrics');
    this.outputDir = path.join(process.cwd(), 'metrics-dashboard');
  }

  /**
   * Generate complete metrics dashboard
   */
  generateDashboard() {
    this.ensureOutputDirectory();
    
    const data = this.loadAllMetrics();
    const html = this.generateDashboardHTML(data);
    
    const outputPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    
    // Generate supporting files
    this.generateCSS();
    this.generateJS();
    
    console.log(`Dashboard generated: ${outputPath}`);
    return outputPath;
  }

  /**
   * Load all available metrics
   */
  loadAllMetrics() {
    const data = {
      workflows: [],
      bundles: [],
      releases: [],
      jobs: [],
      performance: [],
      bundleTrends: null,
      releaseTrends: null
    };

    if (!fs.existsSync(this.metricsDir)) {
      return data;
    }

    // Load JSONL files
    const files = fs.readdirSync(this.metricsDir);
    
    files.forEach(file => {
      const filepath = path.join(this.metricsDir, file);
      
      if (file.endsWith('.jsonl')) {
        const type = file.split('-')[0];
        const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
        
        const metrics = lines
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
        
        if (data[type + 's']) {
          data[type + 's'].push(...metrics);
        }
      } else if (file.endsWith('-trends.json')) {
        const type = file.replace('-trends.json', '');
        data[type + 'Trends'] = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      }
    });

    return data;
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CI/CD Metrics Dashboard</title>
    <link rel="stylesheet" href="dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>📊 CI/CD Metrics Dashboard</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </header>

        <div class="metrics-grid">
            ${this.generateOverviewSection(data)}
            ${this.generateWorkflowSection(data)}
            ${this.generateBundleSection(data)}
            ${this.generateReleaseSection(data)}
            ${this.generatePerformanceSection(data)}
        </div>
    </div>

    <script src="dashboard.js"></script>
    <script>
        // Initialize dashboard with data
        window.metricsData = ${JSON.stringify(data, null, 2)};
        initializeDashboard();
    </script>
</body>
</html>`;
  }

  /**
   * Generate overview section
   */
  generateOverviewSection(data) {
    const totalWorkflows = data.workflows.length;
    const successfulWorkflows = data.workflows.filter(w => w.status === 'success').length;
    const successRate = totalWorkflows > 0 ? Math.round((successfulWorkflows / totalWorkflows) * 100) : 0;
    
    const totalReleases = data.releases.length;
    const lastRelease = data.releases.length > 0 ? data.releases[data.releases.length - 1] : null;
    
    const avgBundleSize = data.bundleTrends ? data.bundleTrends.averageSize : 'N/A';

    return `
    <section class="metrics-section overview">
        <h2>📈 Overview</h2>
        <div class="metrics-cards">
            <div class="metric-card">
                <h3>Workflow Success Rate</h3>
                <div class="metric-value">${successRate}%</div>
                <div class="metric-detail">${successfulWorkflows}/${totalWorkflows} workflows</div>
            </div>
            <div class="metric-card">
                <h3>Total Releases</h3>
                <div class="metric-value">${totalReleases}</div>
                <div class="metric-detail">${lastRelease ? `Latest: ${lastRelease.version}` : 'No releases'}</div>
            </div>
            <div class="metric-card">
                <h3>Average Bundle Size</h3>
                <div class="metric-value">${avgBundleSize}</div>
                <div class="metric-detail">Across all builds</div>
            </div>
            <div class="metric-card">
                <h3>Total Jobs</h3>
                <div class="metric-value">${data.jobs.length}</div>
                <div class="metric-detail">All time</div>
            </div>
        </div>
    </section>`;
  }

  /**
   * Generate workflow metrics section
   */
  generateWorkflowSection(data) {
    return `
    <section class="metrics-section workflows">
        <h2>🔄 Workflow Metrics</h2>
        <div class="charts-container">
            <div class="chart-container">
                <h3>Workflow Success Rate Over Time</h3>
                <canvas id="workflowSuccessChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Average Workflow Duration</h3>
                <canvas id="workflowDurationChart"></canvas>
            </div>
        </div>
        <div class="recent-workflows">
            <h3>Recent Workflows</h3>
            <table class="metrics-table">
                <thead>
                    <tr>
                        <th>Workflow</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Jobs</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.workflows.slice(-10).map(w => `
                    <tr>
                        <td>${w.workflowName || 'Unknown'}</td>
                        <td><span class="status ${w.status || 'unknown'}">${w.status || 'Unknown'}</span></td>
                        <td>${w.duration ? w.duration + 's' : 'N/A'}</td>
                        <td>${w.totalJobs || 0}</td>
                        <td>${new Date(w.timestamp).toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </section>`;
  }

  /**
   * Generate bundle metrics section
   */
  generateBundleSection(data) {
    return `
    <section class="metrics-section bundles">
        <h2>📦 Bundle Metrics</h2>
        <div class="charts-container">
            <div class="chart-container">
                <h3>Bundle Size Trend</h3>
                <canvas id="bundleSizeChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Bundle Composition</h3>
                <canvas id="bundleCompositionChart"></canvas>
            </div>
        </div>
        ${data.bundleTrends ? `
        <div class="bundle-trends">
            <h3>Bundle Trends</h3>
            <div class="trend-stats">
                <div class="trend-stat">
                    <label>Average Size:</label>
                    <span>${data.bundleTrends.averageSize} bytes</span>
                </div>
                <div class="trend-stat">
                    <label>Average Gzipped:</label>
                    <span>${data.bundleTrends.averageGzippedSize} bytes</span>
                </div>
                <div class="trend-stat">
                    <label>Size Growth:</label>
                    <span class="${data.bundleTrends.sizeGrowthTrend > 0 ? 'negative' : 'positive'}">
                        ${data.bundleTrends.sizeGrowthTrend}%
                    </span>
                </div>
            </div>
        </div>
        ` : ''}
    </section>`;
  }

  /**
   * Generate release metrics section
   */
  generateReleaseSection(data) {
    return `
    <section class="metrics-section releases">
        <h2>🚀 Release Metrics</h2>
        <div class="charts-container">
            <div class="chart-container">
                <h3>Release Frequency</h3>
                <canvas id="releaseFrequencyChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Release Types Distribution</h3>
                <canvas id="releaseTypesChart"></canvas>
            </div>
        </div>
        ${data.releaseTrends ? `
        <div class="release-trends">
            <h3>Release Trends</h3>
            <div class="trend-stats">
                <div class="trend-stat">
                    <label>Release Frequency:</label>
                    <span>${data.releaseTrends.releaseFrequency} per month</span>
                </div>
                <div class="trend-stat">
                    <label>Avg Time Between:</label>
                    <span>${data.releaseTrends.averageTimeBetweenReleases} days</span>
                </div>
            </div>
            <div class="increment-distribution">
                <h4>Increment Type Distribution</h4>
                <div class="distribution-bars">
                    <div class="bar">
                        <label>Major:</label>
                        <div class="bar-fill" style="width: ${(data.releaseTrends.incrementTypeDistribution.major / data.releases.length) * 100}%"></div>
                        <span>${data.releaseTrends.incrementTypeDistribution.major}</span>
                    </div>
                    <div class="bar">
                        <label>Minor:</label>
                        <div class="bar-fill" style="width: ${(data.releaseTrends.incrementTypeDistribution.minor / data.releases.length) * 100}%"></div>
                        <span>${data.releaseTrends.incrementTypeDistribution.minor}</span>
                    </div>
                    <div class="bar">
                        <label>Patch:</label>
                        <div class="bar-fill" style="width: ${(data.releaseTrends.incrementTypeDistribution.patch / data.releases.length) * 100}%"></div>
                        <span>${data.releaseTrends.incrementTypeDistribution.patch}</span>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    </section>`;
  }

  /**
   * Generate performance metrics section
   */
  generatePerformanceSection(data) {
    return `
    <section class="metrics-section performance">
        <h2>⚡ Performance Metrics</h2>
        <div class="charts-container">
            <div class="chart-container">
                <h3>Job Duration Trends</h3>
                <canvas id="jobDurationChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Resource Usage</h3>
                <canvas id="resourceUsageChart"></canvas>
            </div>
        </div>
        <div class="performance-summary">
            <h3>Performance Summary</h3>
            <div class="performance-stats">
                <div class="perf-stat">
                    <label>Avg Workflow Duration:</label>
                    <span>${this.calculateAverageWorkflowDuration(data.workflows)}s</span>
                </div>
                <div class="perf-stat">
                    <label>Fastest Job:</label>
                    <span>${this.getFastestJob(data.jobs)}</span>
                </div>
                <div class="perf-stat">
                    <label>Slowest Job:</label>
                    <span>${this.getSlowestJob(data.jobs)}</span>
                </div>
            </div>
        </div>
    </section>`;
  }

  /**
   * Generate CSS file
   */
  generateCSS() {
    const css = `
/* Dashboard Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f5f7fa;
    color: #333;
    line-height: 1.6;
}

.dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.dashboard-header {
    text-align: center;
    margin-bottom: 40px;
    padding: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.dashboard-header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
}

.metrics-grid {
    display: flex;
    flex-direction: column;
    gap: 30px;
}

.metrics-section {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.metrics-section h2 {
    font-size: 1.8rem;
    margin-bottom: 25px;
    color: #2d3748;
    border-bottom: 3px solid #e2e8f0;
    padding-bottom: 10px;
}

.metrics-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.metric-card {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    padding: 25px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.metric-card h3 {
    font-size: 1rem;
    margin-bottom: 15px;
    opacity: 0.9;
}

.metric-value {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 10px;
}

.metric-detail {
    font-size: 0.9rem;
    opacity: 0.8;
}

.charts-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 30px;
    margin-bottom: 30px;
}

.chart-container {
    background: #f8fafc;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.chart-container h3 {
    margin-bottom: 15px;
    color: #4a5568;
}

.metrics-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

.metrics-table th,
.metrics-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
}

.metrics-table th {
    background-color: #f7fafc;
    font-weight: 600;
    color: #4a5568;
}

.status {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
}

.status.success {
    background-color: #c6f6d5;
    color: #22543d;
}

.status.failure {
    background-color: #fed7d7;
    color: #742a2a;
}

.status.unknown {
    background-color: #e2e8f0;
    color: #4a5568;
}

.trend-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.trend-stat {
    display: flex;
    justify-content: space-between;
    padding: 15px;
    background: #f7fafc;
    border-radius: 6px;
    border-left: 4px solid #4299e1;
}

.trend-stat label {
    font-weight: 600;
    color: #4a5568;
}

.positive {
    color: #38a169;
}

.negative {
    color: #e53e3e;
}

.distribution-bars {
    margin-top: 15px;
}

.bar {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    gap: 10px;
}

.bar label {
    min-width: 60px;
    font-weight: 500;
}

.bar-fill {
    height: 20px;
    background: linear-gradient(90deg, #4299e1, #63b3ed);
    border-radius: 10px;
    min-width: 20px;
}

.performance-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.perf-stat {
    display: flex;
    justify-content: space-between;
    padding: 15px;
    background: #edf2f7;
    border-radius: 6px;
}

@media (max-width: 768px) {
    .dashboard {
        padding: 10px;
    }
    
    .charts-container {
        grid-template-columns: 1fr;
    }
    
    .metrics-cards {
        grid-template-columns: 1fr;
    }
}
`;

    fs.writeFileSync(path.join(this.outputDir, 'dashboard.css'), css, 'utf8');
  }

  /**
   * Generate JavaScript file
   */
  generateJS() {
    const js = `
// Dashboard JavaScript
function initializeDashboard() {
    if (typeof window.metricsData === 'undefined') {
        console.error('Metrics data not available');
        return;
    }

    const data = window.metricsData;
    
    // Initialize charts
    initWorkflowCharts(data);
    initBundleCharts(data);
    initReleaseCharts(data);
    initPerformanceCharts(data);
}

function initWorkflowCharts(data) {
    // Workflow Success Rate Chart
    const successCtx = document.getElementById('workflowSuccessChart');
    if (successCtx && data.workflows.length > 0) {
        const dailyData = groupWorkflowsByDay(data.workflows);
        
        new Chart(successCtx, {
            type: 'line',
            data: {
                labels: Object.keys(dailyData),
                datasets: [{
                    label: 'Success Rate %',
                    data: Object.values(dailyData).map(day => 
                        Math.round((day.successful / day.total) * 100)
                    ),
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // Workflow Duration Chart
    const durationCtx = document.getElementById('workflowDurationChart');
    if (durationCtx && data.workflows.length > 0) {
        const recentWorkflows = data.workflows.slice(-20);
        
        new Chart(durationCtx, {
            type: 'bar',
            data: {
                labels: recentWorkflows.map((w, i) => \`Run \${i + 1}\`),
                datasets: [{
                    label: 'Duration (seconds)',
                    data: recentWorkflows.map(w => w.duration || 0),
                    backgroundColor: 'rgba(72, 187, 120, 0.8)',
                    borderColor: '#48bb78',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function initBundleCharts(data) {
    // Bundle Size Trend Chart
    const sizeCtx = document.getElementById('bundleSizeChart');
    if (sizeCtx && data.bundles.length > 0) {
        const recentBundles = data.bundles.slice(-20);
        
        new Chart(sizeCtx, {
            type: 'line',
            data: {
                labels: recentBundles.map(b => b.version || 'Unknown'),
                datasets: [{
                    label: 'Total Size (bytes)',
                    data: recentBundles.map(b => b.totalSize || 0),
                    borderColor: '#ed8936',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Gzipped Size (bytes)',
                    data: recentBundles.map(b => b.gzippedSize || 0),
                    borderColor: '#38b2ac',
                    backgroundColor: 'rgba(56, 178, 172, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Bundle Composition Chart
    const compositionCtx = document.getElementById('bundleCompositionChart');
    if (compositionCtx && data.bundles.length > 0) {
        const latestBundle = data.bundles[data.bundles.length - 1];
        
        new Chart(compositionCtx, {
            type: 'doughnut',
            data: {
                labels: ['CJS', 'ESM', 'Types', 'Binary'],
                datasets: [{
                    data: [
                        latestBundle.cjsSize || 0,
                        latestBundle.esmSize || 0,
                        latestBundle.typesSize || 0,
                        latestBundle.binSize || 0
                    ],
                    backgroundColor: [
                        '#4299e1',
                        '#48bb78',
                        '#ed8936',
                        '#9f7aea'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

function initReleaseCharts(data) {
    // Release Frequency Chart
    const frequencyCtx = document.getElementById('releaseFrequencyChart');
    if (frequencyCtx && data.releases.length > 0) {
        const monthlyData = groupReleasesByMonth(data.releases);
        
        new Chart(frequencyCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(monthlyData),
                datasets: [{
                    label: 'Releases per Month',
                    data: Object.values(monthlyData),
                    backgroundColor: 'rgba(159, 122, 234, 0.8)',
                    borderColor: '#9f7aea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Release Types Chart
    const typesCtx = document.getElementById('releaseTypesChart');
    if (typesCtx && data.releases.length > 0) {
        const typeDistribution = data.releases.reduce((acc, release) => {
            acc[release.incrementType] = (acc[release.incrementType] || 0) + 1;
            return acc;
        }, {});
        
        new Chart(typesCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(typeDistribution),
                datasets: [{
                    data: Object.values(typeDistribution),
                    backgroundColor: [
                        '#f56565',
                        '#ed8936',
                        '#48bb78'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

function initPerformanceCharts(data) {
    // Job Duration Chart
    const jobDurationCtx = document.getElementById('jobDurationChart');
    if (jobDurationCtx && data.jobs.length > 0) {
        const recentJobs = data.jobs.slice(-20);
        
        new Chart(jobDurationCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Job Duration',
                    data: recentJobs.map((job, i) => ({
                        x: i,
                        y: job.duration || 0
                    })),
                    backgroundColor: 'rgba(245, 101, 101, 0.6)',
                    borderColor: '#f56565'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (seconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Job Index'
                        }
                    }
                }
            }
        });
    }
}

function groupWorkflowsByDay(workflows) {
    return workflows.reduce((acc, workflow) => {
        const date = new Date(workflow.timestamp).toISOString().split('T')[0];
        if (!acc[date]) {
            acc[date] = { total: 0, successful: 0 };
        }
        acc[date].total++;
        if (workflow.status === 'success') {
            acc[date].successful++;
        }
        return acc;
    }, {});
}

function groupReleasesByMonth(releases) {
    return releases.reduce((acc, release) => {
        const date = new Date(release.timestamp);
        const month = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {});
}
`;

    fs.writeFileSync(path.join(this.outputDir, 'dashboard.js'), js, 'utf8');
  }

  /**
   * Helper methods for performance calculations
   */
  calculateAverageWorkflowDuration(workflows) {
    if (workflows.length === 0) return 0;
    
    const totalDuration = workflows.reduce((sum, w) => sum + (w.duration || 0), 0);
    return Math.round(totalDuration / workflows.length);
  }

  getFastestJob(jobs) {
    if (jobs.length === 0) return 'N/A';
    
    const fastest = jobs.reduce((min, job) => {
      const duration = job.duration || Infinity;
      return duration < (min.duration || Infinity) ? job : min;
    }, {});
    
    return fastest.jobName ? `${fastest.jobName} (${fastest.duration}s)` : 'N/A';
  }

  getSlowestJob(jobs) {
    if (jobs.length === 0) return 'N/A';
    
    const slowest = jobs.reduce((max, job) => {
      const duration = job.duration || 0;
      return duration > (max.duration || 0) ? job : max;
    }, {});
    
    return slowest.jobName ? `${slowest.jobName} (${slowest.duration}s)` : 'N/A';
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

// CLI interface
if (require.main === module) {
  const dashboard = new MetricsDashboard();
  
  try {
    const outputPath = dashboard.generateDashboard();
    console.log(`✅ Dashboard generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating dashboard:', error.message);
    process.exit(1);
  }
}

module.exports = MetricsDashboard;
`;

    fs.writeFileSync(path.join(this.outputDir, 'dashboard.js'), js, 'utf8');
  }

  /**
   * Helper methods for performance calculations
   */
  calculateAverageWorkflowDuration(workflows) {
    if (workflows.length === 0) return 0;
    
    const totalDuration = workflows.reduce((sum, w) => sum + (w.duration || 0), 0);
    return Math.round(totalDuration / workflows.length);
  }

  getFastestJob(jobs) {
    if (jobs.length === 0) return 'N/A';
    
    const fastest = jobs.reduce((min, job) => {
      const duration = job.duration || Infinity;
      return duration < (min.duration || Infinity) ? job : min;
    }, {});
    
    return fastest.jobName ? `${fastest.jobName} (${fastest.duration}s)` : 'N/A';
  }

  getSlowestJob(jobs) {
    if (jobs.length === 0) return 'N/A';
    
    const slowest = jobs.reduce((max, job) => {
      const duration = job.duration || 0;
      return duration > (max.duration || 0) ? job : max;
    }, {});
    
    return slowest.jobName ? `${slowest.jobName} (${slowest.duration}s)` : 'N/A';
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

// CLI interface
if (require.main === module) {
  const dashboard = new MetricsDashboard();
  
  try {
    const outputPath = dashboard.generateDashboard();
    console.log(`✅ Dashboard generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating dashboard:', error.message);
    process.exit(1);
  }
}

module.exports = MetricsDashboard;