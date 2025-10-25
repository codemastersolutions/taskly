#!/usr/bin/env node

/**
 * Notification System for GitHub Actions
 * Sends notifications to external services (Slack, Discord, Email, etc.)
 */

const https = require('https');
const fs = require('fs');

class NotificationSystem {
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load notification configuration
   */
  loadConfig() {
    const defaultConfig = {
      slack: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#ci-cd',
        username: 'GitHub Actions',
        iconEmoji: ':robot_face:',
      },
      discord: {
        enabled: false,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        username: 'GitHub Actions',
      },
      email: {
        enabled: false,
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT || 587,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        fromEmail: process.env.FROM_EMAIL,
        toEmails: process.env.TO_EMAILS ? process.env.TO_EMAILS.split(',') : [],
      },
      teams: {
        enabled: false,
        webhookUrl: process.env.TEAMS_WEBHOOK_URL,
      },
    };

    // Try to load custom config
    const configPath = '.github/notification-config.json';
    if (fs.existsSync(configPath)) {
      try {
        const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...customConfig };
      } catch (error) {
        console.warn(
          'Failed to load custom notification config, using defaults'
        );
      }
    }

    return defaultConfig;
  }

  /**
   * Send notification about workflow completion
   */
  async sendWorkflowNotification(data) {
    const message = this.formatWorkflowMessage(data);

    const promises = [];

    if (this.config.slack.enabled && this.config.slack.webhookUrl) {
      promises.push(this.sendSlackNotification(message, data));
    }

    if (this.config.discord.enabled && this.config.discord.webhookUrl) {
      promises.push(this.sendDiscordNotification(message, data));
    }

    if (this.config.email.enabled && this.config.email.toEmails.length > 0) {
      promises.push(this.sendEmailNotification(message, data));
    }

    if (this.config.teams.enabled && this.config.teams.webhookUrl) {
      promises.push(this.sendTeamsNotification(message, data));
    }

    const results = await Promise.allSettled(promises);

    // Log results
    results.forEach((result, index) => {
      const services = ['Slack', 'Discord', 'Email', 'Teams'];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${services[index]} notification sent successfully`);
      } else {
        console.error(
          `❌ ${services[index]} notification failed:`,
          result.reason
        );
      }
    });

    return results;
  }

  /**
   * Send notification about publication
   */
  async sendPublicationNotification(data) {
    const message = this.formatPublicationMessage(data);

    // Publication notifications are more important, so we send to all configured channels
    return this.sendWorkflowNotification({
      ...data,
      message,
      type: 'publication',
    });
  }

  /**
   * Send notification about security issues
   */
  async sendSecurityNotification(data) {
    const message = this.formatSecurityMessage(data);

    // Security notifications are critical
    return this.sendWorkflowNotification({
      ...data,
      message,
      type: 'security',
      priority: 'high',
    });
  }

  /**
   * Send notification about metrics anomalies
   */
  async sendMetricsAnomalyNotification(data) {
    const message = this.formatMetricsAnomalyMessage(data);

    return this.sendWorkflowNotification({
      ...data,
      message,
      type: 'metrics-anomaly',
    });
  }

  /**
   * Format workflow completion message
   */
  formatWorkflowMessage(data) {
    const status = data.status || 'unknown';
    const emoji = this.getStatusEmoji(status);
    const color = this.getStatusColor(status);

    return {
      text: `${emoji} Workflow ${status}: ${data.workflowName || 'Unknown'}`,
      color: color,
      fields: [
        {
          title: 'Repository',
          value: data.repository || 'Unknown',
          short: true,
        },
        {
          title: 'Branch',
          value: data.branch || data.ref || 'Unknown',
          short: true,
        },
        {
          title: 'Triggered by',
          value: data.actor || 'Unknown',
          short: true,
        },
        {
          title: 'Duration',
          value: data.duration ? `${data.duration}s` : 'Unknown',
          short: true,
        },
        {
          title: 'Run ID',
          value: data.runId || 'Unknown',
          short: true,
        },
        {
          title: 'Commit',
          value: data.sha ? data.sha.substring(0, 7) : 'Unknown',
          short: true,
        },
      ],
      actions: [
        {
          type: 'button',
          text: 'View Workflow',
          url:
            data.workflowUrl ||
            `https://github.com/${data.repository}/actions/runs/${data.runId}`,
        },
      ],
    };
  }

  /**
   * Format publication message
   */
  formatPublicationMessage(data) {
    const emoji = data.success ? '🚀' : '❌';
    const color = data.success ? 'good' : 'danger';

    return {
      text: `${emoji} Package Publication ${data.success ? 'Successful' : 'Failed'}: ${data.packageName}@${data.version}`,
      color: color,
      fields: [
        {
          title: 'Package',
          value: data.packageName || 'Unknown',
          short: true,
        },
        {
          title: 'Version',
          value: data.version || 'Unknown',
          short: true,
        },
        {
          title: 'Registry',
          value: data.registryUrl || 'NPM',
          short: true,
        },
        {
          title: 'Size',
          value: data.packageSize || 'Unknown',
          short: true,
        },
        {
          title: 'Increment Type',
          value: data.incrementType || 'Unknown',
          short: true,
        },
        {
          title: 'Duration',
          value: data.publicationDuration || 'Unknown',
          short: true,
        },
      ],
      actions: data.success
        ? [
            {
              type: 'button',
              text: 'View on NPM',
              url: data.npmUrl,
            },
            {
              type: 'button',
              text: 'GitHub Release',
              url: data.githubReleaseUrl,
            },
          ]
        : [
            {
              type: 'button',
              text: 'View Logs',
              url: data.workflowUrl,
            },
          ],
    };
  }

  /**
   * Format security alert message
   */
  formatSecurityMessage(data) {
    const severity = data.severity || 'unknown';
    const emoji =
      severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : '🔒';

    return {
      text: `${emoji} Security Alert: ${data.vulnerabilityCount || 0} vulnerabilities found`,
      color: 'danger',
      fields: [
        {
          title: 'Severity',
          value: severity.toUpperCase(),
          short: true,
        },
        {
          title: 'Critical',
          value: data.criticalCount || 0,
          short: true,
        },
        {
          title: 'High',
          value: data.highCount || 0,
          short: true,
        },
        {
          title: 'Moderate',
          value: data.moderateCount || 0,
          short: true,
        },
        {
          title: 'Repository',
          value: data.repository || 'Unknown',
          short: true,
        },
        {
          title: 'Branch',
          value: data.branch || 'Unknown',
          short: true,
        },
      ],
      actions: [
        {
          type: 'button',
          text: 'View Security Report',
          url: data.reportUrl || data.workflowUrl,
        },
      ],
    };
  }

  /**
   * Format metrics anomaly message
   */
  formatMetricsAnomalyMessage(data) {
    return {
      text: `📊 Metrics Anomaly Detected: ${data.anomalyType}`,
      color: 'warning',
      fields: [
        {
          title: 'Metric',
          value: data.metricName || 'Unknown',
          short: true,
        },
        {
          title: 'Current Value',
          value: data.currentValue || 'Unknown',
          short: true,
        },
        {
          title: 'Expected Range',
          value: data.expectedRange || 'Unknown',
          short: true,
        },
        {
          title: 'Deviation',
          value: data.deviation || 'Unknown',
          short: true,
        },
        {
          title: 'Threshold',
          value: data.threshold || 'Unknown',
          short: true,
        },
        {
          title: 'Trend',
          value: data.trend || 'Unknown',
          short: true,
        },
      ],
      actions: [
        {
          type: 'button',
          text: 'View Metrics Dashboard',
          url: data.dashboardUrl,
        },
      ],
    };
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(message, data) {
    const payload = {
      channel: this.config.slack.channel,
      username: this.config.slack.username,
      icon_emoji: this.config.slack.iconEmoji,
      attachments: [
        {
          color: message.color,
          title: message.text,
          fields: message.fields.map(field => ({
            title: field.title,
            value: field.value,
            short: field.short,
          })),
          actions: message.actions,
          footer: 'GitHub Actions',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    return this.sendWebhook(this.config.slack.webhookUrl, payload);
  }

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(message, data) {
    const embed = {
      title: message.text,
      color: this.getDiscordColor(message.color),
      fields: message.fields.map(field => ({
        name: field.title,
        value: field.value,
        inline: field.short,
      })),
      footer: {
        text: 'GitHub Actions',
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: this.config.discord.username,
      embeds: [embed],
    };

    return this.sendWebhook(this.config.discord.webhookUrl, payload);
  }

  /**
   * Send Microsoft Teams notification
   */
  async sendTeamsNotification(message, data) {
    const facts = message.fields.map(field => ({
      name: field.title,
      value: field.value,
    }));

    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: message.text,
      themeColor: this.getTeamsColor(message.color),
      sections: [
        {
          activityTitle: message.text,
          activitySubtitle: 'GitHub Actions Notification',
          facts: facts,
        },
      ],
      potentialAction: message.actions.map(action => ({
        '@type': 'OpenUri',
        name: action.text,
        targets: [
          {
            os: 'default',
            uri: action.url,
          },
        ],
      })),
    };

    return this.sendWebhook(this.config.teams.webhookUrl, payload);
  }

  /**
   * Send email notification (simplified - would need proper SMTP library in production)
   */
  async sendEmailNotification(message, data) {
    // This is a placeholder implementation
    // In production, you would use nodemailer or similar
    console.log('Email notification would be sent:', {
      to: this.config.email.toEmails,
      subject: message.text,
      body: this.formatEmailBody(message, data),
    });

    return Promise.resolve({
      success: true,
      message: 'Email notification logged',
    });
  }

  /**
   * Format email body
   */
  formatEmailBody(message, data) {
    let body = `${message.text}\n\n`;

    message.fields.forEach(field => {
      body += `${field.title}: ${field.value}\n`;
    });

    if (message.actions && message.actions.length > 0) {
      body += '\nActions:\n';
      message.actions.forEach(action => {
        body += `- ${action.text}: ${action.url}\n`;
      });
    }

    body += `\nSent at: ${new Date().toISOString()}`;

    return body;
  }

  /**
   * Send webhook request
   */
  async sendWebhook(url, payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, res => {
        let responseData = '';

        res.on('data', chunk => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              statusCode: res.statusCode,
              data: responseData,
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(status) {
    const emojis = {
      success: '✅',
      failure: '❌',
      cancelled: '⏹️',
      skipped: '⏭️',
      unknown: '❓',
    };

    return emojis[status] || emojis.unknown;
  }

  /**
   * Get status color for Slack
   */
  getStatusColor(status) {
    const colors = {
      success: 'good',
      failure: 'danger',
      cancelled: 'warning',
      skipped: '#808080',
      unknown: '#808080',
    };

    return colors[status] || colors.unknown;
  }

  /**
   * Get Discord color (decimal)
   */
  getDiscordColor(slackColor) {
    const colors = {
      good: 0x36a64f,
      danger: 0xff0000,
      warning: 0xffaa00,
      '#808080': 0x808080,
    };

    return colors[slackColor] || 0x808080;
  }

  /**
   * Get Teams color (hex)
   */
  getTeamsColor(slackColor) {
    const colors = {
      good: '36a64f',
      danger: 'ff0000',
      warning: 'ffaa00',
      '#808080': '808080',
    };

    return colors[slackColor] || '808080';
  }

  /**
   * Test notification configuration
   */
  async testNotifications() {
    const testData = {
      workflowName: 'Test Notification',
      repository: 'test/repo',
      branch: 'main',
      actor: 'test-user',
      duration: 120,
      runId: '12345',
      sha: 'abc123def456',
      status: 'success',
    };

    console.log('Testing notification configuration...');

    try {
      const results = await this.sendWorkflowNotification(testData);
      console.log('Test notifications completed');
      return results;
    } catch (error) {
      console.error('Test notifications failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const notifier = new NotificationSystem();
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node notification-system.js <command> [options]');
    console.error(
      'Commands: workflow, publication, security, metrics-anomaly, test'
    );
    process.exit(1);
  }

  const [command] = args;

  async function main() {
    try {
      switch (command) {
        case 'workflow':
          if (args.length < 2) {
            console.error(
              'Usage: node notification-system.js workflow <data-file>'
            );
            process.exit(1);
          }

          const workflowData = JSON.parse(fs.readFileSync(args[1], 'utf8'));
          await notifier.sendWorkflowNotification(workflowData);
          break;

        case 'publication':
          if (args.length < 2) {
            console.error(
              'Usage: node notification-system.js publication <data-file>'
            );
            process.exit(1);
          }

          const publicationData = JSON.parse(fs.readFileSync(args[1], 'utf8'));
          await notifier.sendPublicationNotification(publicationData);
          break;

        case 'security':
          if (args.length < 2) {
            console.error(
              'Usage: node notification-system.js security <data-file>'
            );
            process.exit(1);
          }

          const securityData = JSON.parse(fs.readFileSync(args[1], 'utf8'));
          await notifier.sendSecurityNotification(securityData);
          break;

        case 'metrics-anomaly':
          if (args.length < 2) {
            console.error(
              'Usage: node notification-system.js metrics-anomaly <data-file>'
            );
            process.exit(1);
          }

          const metricsData = JSON.parse(fs.readFileSync(args[1], 'utf8'));
          await notifier.sendMetricsAnomalyNotification(metricsData);
          break;

        case 'test':
          await notifier.testNotifications();
          break;

        default:
          console.error(`Unknown command: ${command}`);
          process.exit(1);
      }

      console.log('✅ Notification command completed successfully');
    } catch (error) {
      console.error('❌ Notification command failed:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = NotificationSystem;
