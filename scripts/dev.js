#!/usr/bin/env node

/**
 * Development helper script for Taskly
 * Provides utilities for development workflow
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[DEV] ${message}`);
}

function exec(command, options = {}) {
  log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`[DEV ERROR] Command failed: ${command}`);
    process.exit(1);
  }
}

function runInParallel(commands) {
  const processes = commands.map(cmd => {
    log(`Starting: ${cmd}`);
    return spawn('npm', ['run', cmd], { stdio: 'inherit' });
  });

  // Handle process cleanup
  process.on('SIGINT', () => {
    log('Cleaning up processes...');
    processes.forEach(proc => proc.kill('SIGINT'));
    process.exit(0);
  });

  return Promise.all(processes.map(proc => new Promise((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
  })));
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'setup':
      log('Setting up development environment...');
      exec('npm install');
      exec('npm run build:dev');
      log('Development environment ready!');
      break;

    case 'watch':
      log('Starting development watch mode...');
      await runInParallel(['dev', 'test:watch']);
      break;

    case 'check':
      log('Running quality checks...');
      exec('npm run quality');
      log('All quality checks passed!');
      break;

    case 'reset':
      log('Resetting development environment...');
      exec('npm run clean');
      exec('rm -rf node_modules package-lock.json');
      exec('npm install');
      exec('npm run build:dev');
      log('Development environment reset!');
      break;

    default:
      console.log(`
Usage: node scripts/dev.js <command>

Commands:
  setup   - Set up development environment
  watch   - Start development watch mode (build + test)
  check   - Run quality checks (type-check, lint, format)
  reset   - Reset development environment
      `);
  }
}

main().catch((error) => {
  console.error('[DEV ERROR]', error);
  process.exit(1);
});