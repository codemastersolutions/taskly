#!/usr/bin/env node

/**
 * Build script for Taskly library
 * Handles dual compilation, optimization, and post-build tasks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST_DIR = 'dist';
const CJS_DIR = path.join(DIST_DIR, 'cjs');
const ESM_DIR = path.join(DIST_DIR, 'esm');
const TYPES_DIR = path.join(DIST_DIR, 'types');

function log(message) {
  console.log(`[BUILD] ${message}`);
}

function exec(command, options = {}) {
  log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`[BUILD ERROR] Command failed: ${command}`);
    process.exit(1);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writePackageJson(dir, type) {
  const packageJsonPath = path.join(dir, 'package.json');
  const content = JSON.stringify({ type }, null, 2);
  fs.writeFileSync(packageJsonPath, content);
  log(`Created ${packageJsonPath} with type: ${type}`);
}

function makeExecutable(filePath) {
  if (fs.existsSync(filePath)) {
    fs.chmodSync(filePath, '755');
    log(`Made ${filePath} executable`);
  }
}

async function main() {
  log('Starting Taskly build process...');

  // Clean previous build
  log('Cleaning previous build...');
  if (fs.existsSync(DIST_DIR)) {
    exec(`rm -rf ${DIST_DIR}`);
  }

  // Ensure directories exist
  ensureDir(CJS_DIR);
  ensureDir(ESM_DIR);
  ensureDir(TYPES_DIR);

  // Build CommonJS
  log('Building CommonJS...');
  exec('tsc -p tsconfig.cjs.json');

  // Build ESM
  log('Building ESM...');
  exec('tsc -p tsconfig.esm.json');

  // Build types
  log('Building type definitions...');
  exec('tsc -p tsconfig.types.json');

  // Create package.json files for dual package support
  writePackageJson(CJS_DIR, 'commonjs');
  writePackageJson(ESM_DIR, 'module');

  // Make CLI executable
  const cliPath = path.join(CJS_DIR, 'bin', 'taskly.js');
  makeExecutable(cliPath);

  // Minify if in production mode
  if (process.env.NODE_ENV === 'production') {
    log('Minifying JavaScript files...');
    
    // Minify CommonJS
    exec(`find ${CJS_DIR} -name '*.js' -not -path '*/node_modules/*' -exec terser {} -o {} --compress --mangle \\;`);
    
    // Minify ESM
    exec(`find ${ESM_DIR} -name '*.js' -not -path '*/node_modules/*' -exec terser {} -o {} --compress --mangle --module \\;`);
  }

  log('Build completed successfully!');
  
  // Display build stats
  const stats = {
    cjs: fs.readdirSync(CJS_DIR).length,
    esm: fs.readdirSync(ESM_DIR).length,
    types: fs.readdirSync(TYPES_DIR).length
  };
  
  log(`Build statistics:`);
  log(`  CommonJS files: ${stats.cjs}`);
  log(`  ESM files: ${stats.esm}`);
  log(`  Type definition files: ${stats.types}`);
}

main().catch((error) => {
  console.error('[BUILD ERROR]', error);
  process.exit(1);
});