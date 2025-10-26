#!/usr/bin/env node

/**
 * Taskly CLI Binary Entry Point
 * This file serves as the main executable for the Taskly CLI
 */

// Use require for CommonJS compatibility
import { main } from '../cli/index.js';

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- CLI fatal startup error
  console.error('Fatal error starting Taskly CLI:', error);
  process.exit(1);
});
