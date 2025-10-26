import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { ERROR_CODES, PackageManager, TasklyError } from '../types/index.js';

/**
 * Package manager detection and validation utility
 */
export class PackageManagerDetector {
  private static readonly LOCK_FILE_MAP: Record<string, PackageManager> = {
    'package-lock.json': 'npm',
    'npm-shrinkwrap.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm',
    'bun.lockb': 'bun',
  };

  private static readonly PM_COMMANDS: Record<PackageManager, string[]> = {
    npm: ['npm', '--version'],
    yarn: ['yarn', '--version'],
    pnpm: ['pnpm', '--version'],
    bun: ['bun', '--version'],
  };

  /**
   * Detect the package manager for a given directory
   * @param cwd Working directory to check (defaults to process.cwd())
   * @param preferredPM Preferred package manager to use if available
   * @returns Detected package manager
   */
  public static detect(
    cwd: string = process.cwd(),
    preferredPM?: PackageManager
  ): PackageManager {
    // If a preferred PM is specified and available, use it
    if (preferredPM && this.isAvailable(preferredPM)) {
      return preferredPM;
    }

    // Try to detect from lock files
    const detectedFromLockFile = this.detectFromLockFiles(cwd);
    if (detectedFromLockFile && this.isAvailable(detectedFromLockFile)) {
      return detectedFromLockFile;
    }

    // Fallback to npm (should always be available in Node.js environments)
    if (this.isAvailable('npm')) {
      return 'npm';
    }

    throw new TasklyError(
      'No package manager found. Please install npm, yarn, pnpm, or bun.',
      ERROR_CODES.PM_NOT_FOUND
    );
  }

  /**
   * Check if a package manager is available in the system PATH
   * @param pm Package manager to check
   * @returns True if available, false otherwise
   */
  public static isAvailable(pm: PackageManager): boolean {
    try {
      const [command, ...args] = this.PM_COMMANDS[pm];
      execSync(`${command} ${args.join(' ')}`, {
        stdio: 'ignore',
        timeout: 5000, // 5 second timeout
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that a package manager is available before execution
   * @param pm Package manager to validate
   * @param customPath Optional custom path to the package manager
   * @throws TasklyError if package manager is not available
   */
  public static validate(pm: PackageManager, customPath?: string): void {
    if (customPath) {
      // Check if custom path exists and is executable
      if (!existsSync(customPath)) {
        throw new TasklyError(
          `Custom package manager path not found: ${customPath}`,
          ERROR_CODES.PM_NOT_FOUND
        );
      }

      try {
        execSync(`"${customPath}" --version`, {
          stdio: 'ignore',
          timeout: 5000,
        });
      } catch (error) {
        throw new TasklyError(
          `Custom package manager at ${customPath} is not executable or invalid`,
          ERROR_CODES.PM_NOT_FOUND,
          undefined,
          error as Error
        );
      }
    } else {
      // Check if PM is available in PATH
      if (!this.isAvailable(pm)) {
        throw new TasklyError(
          `Package manager '${pm}' is not installed or not available in PATH`,
          ERROR_CODES.PM_NOT_FOUND
        );
      }
    }
  }

  /**
   * Get the command to execute for a given package manager
   * @param pm Package manager
   * @param customPath Optional custom path
   * @returns Command string
   */
  public static getCommand(pm: PackageManager, customPath?: string): string {
    if (customPath) {
      return customPath;
    }
    return pm;
  }

  /**
   * Detect package manager from lock files in the given directory
   * @param cwd Directory to check for lock files
   * @returns Detected package manager or null if none found
   */
  public static detectFromLockFiles(cwd: string): PackageManager | null {
    for (const [lockFile, pm] of Object.entries(this.LOCK_FILE_MAP)) {
      const lockFilePath = join(cwd, lockFile);
      if (existsSync(lockFilePath)) {
        return pm;
      }
    }
    return null;
  }

  /**
   * Get all available package managers on the system
   * @returns Array of available package managers
   */
  public static getAvailablePackageManagers(): PackageManager[] {
    const available: PackageManager[] = [];

    for (const pm of ['npm', 'yarn', 'pnpm', 'bun'] as PackageManager[]) {
      if (this.isAvailable(pm)) {
        available.push(pm);
      }
    }

    return available;
  }

  /**
   * Get package manager information including version
   * @param pm Package manager to get info for
   * @returns Package manager info or null if not available
   */
  public static getPackageManagerInfo(
    pm: PackageManager
  ): { name: PackageManager; version: string } | null {
    try {
      const [command, ...args] = this.PM_COMMANDS[pm];
      const version = execSync(`${command} ${args.join(' ')}`, {
        encoding: 'utf8',
        timeout: 5000,
      }).trim();

      return {
        name: pm,
        version,
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate package manager before task execution with comprehensive checks
   * @param pm Package manager to validate
   * @param cwd Working directory for the task
   * @param customPath Optional custom path to package manager
   * @returns Validation result with detailed information
   */
  public static validateForExecution(
    pm: PackageManager,
    cwd: string = process.cwd(),
    customPath?: string
  ): {
    valid: boolean;
    pm: PackageManager;
    command: string;
    warnings: string[];
  } {
    const warnings: string[] = [];

    try {
      // First validate the package manager is available
      this.validate(pm, customPath);

      // Check if the working directory has a package.json
      const packageJsonPath = join(cwd, 'package.json');
      if (!existsSync(packageJsonPath)) {
        warnings.push(
          `No package.json found in ${cwd}. Some package manager commands may fail.`
        );
      }

      // Check if lock file matches the package manager
      const detectedPM = this.detectFromLockFiles(cwd);
      if (detectedPM && detectedPM !== pm) {
        warnings.push(
          `Lock file suggests ${detectedPM} but using ${pm}. This may cause dependency conflicts.`
        );
      }

      // Get the final command to use
      const command = this.getCommand(pm, customPath);

      return {
        valid: true,
        pm,
        command,
        warnings,
      };
    } catch (error) {
      if (error instanceof TasklyError) {
        throw error;
      }

      throw new TasklyError(
        `Package manager validation failed: ${error instanceof Error ? error.message : String(error)}`,
        ERROR_CODES.PM_NOT_FOUND,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if a custom package manager path is valid and executable
   * @param customPath Path to check
   * @returns True if valid, false otherwise
   */
  public static isValidCustomPath(customPath: string): boolean {
    try {
      if (!existsSync(customPath)) {
        return false;
      }

      // Try to execute --version to verify it's a valid package manager
      execSync(`"${customPath}" --version`, {
        stdio: 'ignore',
        timeout: 5000,
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve the best package manager to use for a given context
   * @param preferredPM User's preferred package manager
   * @param cwd Working directory
   * @param customPath Optional custom path
   * @returns Resolved package manager configuration
   */
  public static resolve(
    preferredPM?: PackageManager,
    cwd: string = process.cwd(),
    customPath?: string
  ): {
    pm: PackageManager;
    command: string;
    source: 'preferred' | 'lockfile' | 'fallback';
  } {
    // If custom path is provided, validate it first
    if (customPath) {
      if (!this.isValidCustomPath(customPath)) {
        throw new TasklyError(
          `Invalid custom package manager path: ${customPath}`,
          ERROR_CODES.PM_NOT_FOUND
        );
      }

      // Try to determine which PM the custom path represents
      // This is a best-effort attempt based on the path
      const pmFromPath = this.detectPMFromPath(customPath);
      const finalPM = preferredPM || pmFromPath || 'npm';

      return {
        pm: finalPM,
        command: customPath,
        source: 'preferred',
      };
    }

    // Try preferred PM first
    if (preferredPM && this.isAvailable(preferredPM)) {
      return {
        pm: preferredPM,
        command: preferredPM,
        source: 'preferred',
      };
    }

    // Try to detect from lock files
    const detectedPM = this.detectFromLockFiles(cwd);
    if (detectedPM && this.isAvailable(detectedPM)) {
      return {
        pm: detectedPM,
        command: detectedPM,
        source: 'lockfile',
      };
    }

    // Fallback to npm
    if (this.isAvailable('npm')) {
      return {
        pm: 'npm',
        command: 'npm',
        source: 'fallback',
      };
    }

    throw new TasklyError(
      'No package manager available. Please install npm, yarn, pnpm, or bun.',
      ERROR_CODES.PM_NOT_FOUND
    );
  }

  /**
   * Attempt to detect package manager type from a custom path
   * @param customPath Path to analyze
   * @returns Detected package manager or null
   */
  private static detectPMFromPath(customPath: string): PackageManager | null {
    const lowerPath = customPath.toLowerCase();

    if (lowerPath.includes('npm')) return 'npm';
    if (lowerPath.includes('yarn')) return 'yarn';
    if (lowerPath.includes('pnpm')) return 'pnpm';
    if (lowerPath.includes('bun')) return 'bun';

    return null;
  }

  // Instance methods for backward compatibility with integration tests

  /**
   * Instance method: Check if a package manager is available in the system PATH
   * @param pm Package manager to check
   * @returns True if available, false otherwise
   */
  public isAvailable(pm: PackageManager): boolean {
    return PackageManagerDetector.isAvailable(pm);
  }

  /**
   * Instance method: Detect package manager from lock files in the given directory
   * @param cwd Directory to check for lock files
   * @returns Detected package manager or null if none found
   */
  public detectFromLockFiles(cwd: string): PackageManager | null {
    return PackageManagerDetector.detectFromLockFiles(cwd);
  }
}
