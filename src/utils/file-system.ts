/**
 * File system utilities for Taskly library
 * Provides package manager detection, directory validation, and config loading
 */

import { promises as fs } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import {
  ERROR_CODES,
  PackageManager,
  TasklyConfig,
  TasklyError,
  ValidationResult,
} from '../types/index.js';

// Package manager lock file mappings
const LOCK_FILE_MAPPINGS: Record<string, PackageManager> = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
};

// Configuration file names to search for
const CONFIG_FILE_NAMES = [
  'taskly.config.json',
  'taskly.config.js',
  '.tasklyrc.json',
  '.tasklyrc.js',
  'taskly.json',
];

/**
 * Checks if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Validates that a working directory exists and is accessible
 */
export async function validateWorkingDirectory(
  cwd: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
  if (!cwd || typeof cwd !== 'string') {
    errors.push('Working directory must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const resolvedPath = resolve(cwd);

  try {
    // Check if directory exists
    const exists = await directoryExists(resolvedPath);
    if (!exists) {
      errors.push(`Directory does not exist: ${resolvedPath}`);
      return { valid: false, errors, warnings };
    }

    // Check if directory is readable
    await fs.access(resolvedPath, fs.constants.R_OK);

    // Check if directory is writable (for potential log files, etc.)
    try {
      await fs.access(resolvedPath, fs.constants.W_OK);
    } catch {
      warnings.push(`Directory is not writable: ${resolvedPath}`);
    }
  } catch (error) {
    errors.push(
      `Cannot access directory: ${resolvedPath} - ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return { valid: false, errors, warnings };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detects package manager from lock files in a directory
 */
export async function detectPackageManagerFromLockFiles(
  cwd: string = process.cwd()
): Promise<PackageManager | null> {
  const resolvedCwd = resolve(cwd);

  // Check for lock files in order of preference
  const lockFiles = Object.keys(LOCK_FILE_MAPPINGS);

  for (const lockFile of lockFiles) {
    const lockFilePath = join(resolvedCwd, lockFile);
    if (await fileExists(lockFilePath)) {
      return LOCK_FILE_MAPPINGS[lockFile];
    }
  }

  return null;
}

/**
 * Detects package manager by checking package.json packageManager field
 */
export async function detectPackageManagerFromPackageJson(
  cwd: string = process.cwd()
): Promise<PackageManager | null> {
  const packageJsonPath = join(resolve(cwd), 'package.json');

  try {
    if (!(await fileExists(packageJsonPath))) {
      return null;
    }

    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    // Check packageManager field (npm v7+ standard)
    if (packageJson.packageManager) {
      const pmSpec = packageJson.packageManager.toLowerCase();
      if (pmSpec.startsWith('npm')) return 'npm';
      if (pmSpec.startsWith('yarn')) return 'yarn';
      if (pmSpec.startsWith('pnpm')) return 'pnpm';
      if (pmSpec.startsWith('bun')) return 'bun';
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detects package manager using multiple strategies
 */
export async function detectPackageManager(
  cwd: string = process.cwd()
): Promise<PackageManager> {
  const resolvedCwd = resolve(cwd);

  // Strategy 1: Check package.json packageManager field
  const pmFromPackageJson =
    await detectPackageManagerFromPackageJson(resolvedCwd);
  if (pmFromPackageJson) {
    return pmFromPackageJson;
  }

  // Strategy 2: Check lock files
  const pmFromLockFiles = await detectPackageManagerFromLockFiles(resolvedCwd);
  if (pmFromLockFiles) {
    return pmFromLockFiles;
  }

  // Strategy 3: Check parent directories (up to 5 levels)
  let currentDir = resolvedCwd;
  for (let i = 0; i < 5; i++) {
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root

    const pmFromParent = await detectPackageManagerFromLockFiles(parentDir);
    if (pmFromParent) {
      return pmFromParent;
    }

    currentDir = parentDir;
  }

  // Default fallback
  return 'npm';
}

/**
 * Searches for configuration files in a directory
 */
export async function findConfigFile(
  cwd: string = process.cwd()
): Promise<string | null> {
  const resolvedCwd = resolve(cwd);

  for (const configFileName of CONFIG_FILE_NAMES) {
    const configPath = join(resolvedCwd, configFileName);
    if (await fileExists(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Loads and parses a JSON configuration file
 */
export async function loadJsonConfig(
  configPath: string
): Promise<TasklyConfig> {
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
    if (!config || typeof config !== 'object') {
      throw new TasklyError(
        'Configuration file must contain a valid JSON object',
        ERROR_CODES.CONFIG_ERROR
      );
    }

    return config as TasklyConfig;
  } catch (error) {
    if (error instanceof TasklyError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new TasklyError(
      `Failed to load configuration file: ${message}`,
      ERROR_CODES.CONFIG_ERROR
    );
  }
}

/**
 * Loads a JavaScript configuration file (dynamic import)
 */
export async function loadJsConfig(configPath: string): Promise<TasklyConfig> {
  try {
    // Convert to file URL for dynamic import
    const fileUrl = `file://${resolve(configPath)}`;
    const configModule = await import(fileUrl);

    // Handle both default export and named exports
    const config = configModule.default ?? configModule;

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
    if (!config || typeof config !== 'object') {
      throw new TasklyError(
        'Configuration file must export a valid configuration object',
        ERROR_CODES.CONFIG_ERROR
      );
    }

    return config as TasklyConfig;
  } catch (error) {
    if (error instanceof TasklyError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new TasklyError(
      `Failed to load JavaScript configuration file: ${message}`,
      ERROR_CODES.CONFIG_ERROR
    );
  }
}

/**
 * Loads configuration from a file (auto-detects format)
 */
export async function loadConfigFile(
  configPath: string
): Promise<TasklyConfig> {
  const resolvedPath = resolve(configPath);

  if (!(await fileExists(resolvedPath))) {
    throw new TasklyError(
      `Configuration file not found: ${resolvedPath}`,
      ERROR_CODES.CONFIG_ERROR
    );
  }

  const ext = basename(resolvedPath).split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return loadJsonConfig(resolvedPath);
    case 'js':
      return loadJsConfig(resolvedPath);
    default:
      // Try JSON first, then JS
      try {
        return await loadJsonConfig(resolvedPath);
      } catch {
        return loadJsConfig(resolvedPath);
      }
  }
}

/**
 * Loads configuration from the current working directory
 */
export async function loadConfig(
  cwd: string = process.cwd()
): Promise<TasklyConfig | null> {
  const configPath = await findConfigFile(cwd);

  if (!configPath) {
    return null;
  }

  return loadConfigFile(configPath);
}

/**
 * Creates a default configuration file
 */
export async function createDefaultConfig(
  cwd: string = process.cwd()
): Promise<string> {
  const configPath = join(resolve(cwd), 'taskly.config.json');

  const defaultConfig: TasklyConfig = {
    packageManager: 'npm',
    killOthersOnFail: false,
    maxConcurrency: 4,
    colors: ['blue', 'green', 'yellow', 'red', 'magenta', 'cyan'],
    tasks: {
      dev: {
        command: 'npm run dev',
        identifier: 'dev',
        color: 'blue',
      },
      test: {
        command: 'npm test',
        identifier: 'test',
        color: 'green',
      },
    },
    options: {
      killOthersOnFail: false,
      maxConcurrency: 4,
      verbose: false,
    },
  };

  await fs.writeFile(
    configPath,
    JSON.stringify(defaultConfig, null, 2),
    'utf-8'
  );
  return configPath;
}

/**
 * Gets the absolute path for a working directory
 */
export function resolveWorkingDirectory(cwd?: string): string {
  return cwd ? resolve(cwd) : process.cwd();
}

/**
 * Ensures a directory exists (creates it if it doesn't)
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new TasklyError(
      `Failed to create directory: ${dirPath} - ${message}`,
      ERROR_CODES.SYSTEM_ERROR
    );
  }
}

/**
 * Safely reads a file with error handling
 */
export async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Safely writes a file with error handling
 */
export async function safeWriteFile(
  filePath: string,
  content: string
): Promise<boolean> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file stats safely
 */
export async function getFileStats(
  filePath: string
): Promise<{ size: number; mtime: Date } | null> {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  } catch {
    return null;
  }
}
