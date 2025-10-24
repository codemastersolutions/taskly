#!/usr/bin/env node

/**
 * Security Configuration Loader
 * Reads security configuration from .github/security-config.yml and applies it to workflows
 */

const fs = require('fs');
const path = require('path');

// Simple YAML parser for basic configuration
function parseYaml(yamlContent) {
  const lines = yamlContent.split('\n');
  const result = {};
  let currentSection = result;
  let sectionStack = [result];
  let currentIndent = 0;

  for (let line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') continue;

    const indent = line.length - line.trimLeft().length;
    const trimmedLine = line.trim();

    // Handle section changes based on indentation
    if (indent < currentIndent) {
      // Pop sections until we match the current indent
      while (sectionStack.length > 1 && indent < currentIndent) {
        sectionStack.pop();
        currentIndent -= 2;
      }
      currentSection = sectionStack[sectionStack.length - 1];
    }

    if (trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      const value = valueParts.join(':').trim();

      if (value === '' || value === '{}' || value === '[]') {
        // This is a section header
        currentSection[key.trim()] = {};
        sectionStack.push(currentSection[key.trim()]);
        currentSection = currentSection[key.trim()];
        currentIndent = indent;
      } else {
        // This is a key-value pair
        let parsedValue = value;

        // Parse different value types
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (/^\d+$/.test(value)) parsedValue = parseInt(value);
        else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          parsedValue = value.slice(1, -1);
        }

        currentSection[key.trim()] = parsedValue;
      }
    } else if (trimmedLine.startsWith('- ')) {
      // Handle array items
      const item = trimmedLine.substring(2).trim();
      const parentKey = Object.keys(currentSection).pop();

      if (!Array.isArray(currentSection[parentKey])) {
        currentSection[parentKey] = [];
      }

      let parsedItem = item;
      if (item.startsWith('"') && item.endsWith('"')) {
        parsedItem = item.slice(1, -1);
      }

      currentSection[parentKey].push(parsedItem);
    }
  }

  return result;
}

function loadSecurityConfig(configPath = '.github/security-config.yml') {
  try {
    if (!fs.existsSync(configPath)) {
      console.log(`⚠️ Security config file not found: ${configPath}`);
      console.log('Using default security configuration');
      return getDefaultConfig();
    }

    const yamlContent = fs.readFileSync(configPath, 'utf8');
    const config = parseYaml(yamlContent);

    console.log('✅ Security configuration loaded successfully');
    return mergeWithDefaults(config);
  } catch (error) {
    console.error('❌ Error loading security config:', error.message);
    console.log('Falling back to default configuration');
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    vulnerabilities: {
      critical: 0,
      high: 0,
      moderate: 5,
      low: 20,
      fail_on_threshold: true,
      audit_level: 'moderate',
    },
    licenses: {
      enabled: true,
      allowed: [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC',
        '0BSD',
        'Unlicense',
      ],
      review_required: [
        'GPL-2.0',
        'GPL-3.0',
        'LGPL-2.1',
        'LGPL-3.0',
        'AGPL-3.0',
        'MPL-2.0',
      ],
      forbidden: ['UNLICENSED', 'UNKNOWN'],
    },
    secrets: {
      enabled: true,
      custom_patterns: [],
      exclude_patterns: ['*.test.js', '*.test.ts', '*.spec.js', '*.spec.ts'],
    },
    dependencies: {
      check_outdated: true,
      outdated_threshold: 10,
      auto_update_patch: false,
      auto_update_minor: false,
    },
    scoring: {
      base_score: 100,
      deductions: {
        critical_vulnerability: 25,
        high_vulnerability: 15,
        moderate_vulnerability: 5,
        low_vulnerability: 1,
        license_issue: 3,
        hardcoded_secret: 10,
        outdated_dependency: 1,
      },
      grades: { A: 90, B: 80, C: 70, D: 60, F: 0 },
    },
  };
}

function mergeWithDefaults(config) {
  const defaults = getDefaultConfig();

  // Simple deep merge
  function deepMerge(target, source) {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  return deepMerge(defaults, config);
}

function exportForGitHubActions(config) {
  // Export configuration as GitHub Actions outputs
  const outputs = {
    // Vulnerability thresholds
    'critical-threshold': config.vulnerabilities.critical,
    'high-threshold': config.vulnerabilities.high,
    'moderate-threshold': config.vulnerabilities.moderate,
    'audit-level': config.vulnerabilities.audit_level,
    'fail-on-vulnerabilities': config.vulnerabilities.fail_on_threshold,

    // License configuration
    'check-licenses': config.licenses.enabled,
    'allowed-licenses': config.licenses.allowed.join(','),

    // Secrets configuration
    'check-secrets': config.secrets.enabled,
    'secrets-patterns': JSON.stringify(config.secrets.custom_patterns || []),

    // Dependencies
    'check-outdated': config.dependencies.check_outdated,
  };

  // Set GitHub Actions outputs
  for (const [key, value] of Object.entries(outputs)) {
    console.log(`${key}=${value}`);

    // If running in GitHub Actions, set the output
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
    }
  }

  return outputs;
}

function validateConfig(config) {
  const errors = [];

  // Validate vulnerability thresholds
  if (config.vulnerabilities.critical < 0) {
    errors.push('Critical vulnerability threshold must be >= 0');
  }

  if (config.vulnerabilities.high < 0) {
    errors.push('High vulnerability threshold must be >= 0');
  }

  if (config.vulnerabilities.moderate < 0) {
    errors.push('Moderate vulnerability threshold must be >= 0');
  }

  // Validate license configuration
  if (
    config.licenses.enabled &&
    (!config.licenses.allowed || config.licenses.allowed.length === 0)
  ) {
    errors.push(
      'At least one license must be allowed when license checking is enabled'
    );
  }

  // Validate scoring configuration
  if (config.scoring.base_score <= 0 || config.scoring.base_score > 100) {
    errors.push('Base score must be between 1 and 100');
  }

  return errors;
}

// Main execution
function main() {
  const command = process.argv[2];
  const configPath = process.argv[3] || '.github/security-config.yml';

  switch (command) {
    case 'load':
      const config = loadSecurityConfig(configPath);
      console.log(JSON.stringify(config, null, 2));
      break;

    case 'export':
      const loadedConfig = loadSecurityConfig(configPath);
      exportForGitHubActions(loadedConfig);
      break;

    case 'validate':
      const configToValidate = loadSecurityConfig(configPath);
      const errors = validateConfig(configToValidate);

      if (errors.length === 0) {
        console.log('✅ Security configuration is valid');
        process.exit(0);
      } else {
        console.log('❌ Security configuration validation failed:');
        errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }
      break;

    default:
      console.log(
        'Usage: node security-config-loader.js <load|export|validate> [config-path]'
      );
      console.log('');
      console.log('Commands:');
      console.log('  load     - Load and display configuration');
      console.log('  export   - Export configuration for GitHub Actions');
      console.log('  validate - Validate configuration file');
      console.log('');
      console.log('Default config path: .github/security-config.yml');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadSecurityConfig,
  exportForGitHubActions,
  validateConfig,
  getDefaultConfig,
};
