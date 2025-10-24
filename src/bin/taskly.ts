#!/usr/bin/env node

/**
 * Taskly CLI Binary Entry Point
 * This file serves as the main executable for the Taskly CLI
 */

// Use require for CommonJS compatibility
const { main } = require('../cli/index.js');

main().catch((error: unknown) => {
  console.error('Fatal error starting Taskly CLI:', error);
  process.exit(1);
});
