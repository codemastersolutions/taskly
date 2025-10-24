import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { PackageManagerDetector } from '../../core/package-manager.js';
import { TasklyError, ERROR_CODES } from '../../types/index.js';

// Mock Node.js modules
vi.mock('fs');
vi.mock('child_process');

const mockExistsSync = vi.mocked(existsSync);
const mockExecSync = vi.mocked(execSync);

describe('PackageManagerDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when package manager is available', () => {
      mockExecSync.mockReturnValue('1.0.0');

      const result = PackageManagerDetector.isAvailable('npm');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('npm --version', {
        stdio: 'ignore',
        timeout: 5000,
      });
    });

    it('should return false when package manager is not available', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = PackageManagerDetector.isAvailable('yarn');

      expect(result).toBe(false);
    });

    it('should handle all supported package managers', () => {
      mockExecSync.mockReturnValue('1.0.0');

      expect(PackageManagerDetector.isAvailable('npm')).toBe(true);
      expect(PackageManagerDetector.isAvailable('yarn')).toBe(true);
      expect(PackageManagerDetector.isAvailable('pnpm')).toBe(true);
      expect(PackageManagerDetector.isAvailable('bun')).toBe(true);
    });
  });

  describe('detect', () => {
    it('should return preferred PM when available', () => {
      mockExecSync.mockReturnValue('1.0.0');

      const result = PackageManagerDetector.detect('/test/dir', 'yarn');

      expect(result).toBe('yarn');
    });

    it('should detect from lock files when preferred PM is not available', () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('yarn not found');
        })
        .mockReturnValue('1.0.0');

      mockExistsSync.mockImplementation(path => {
        return path.toString().endsWith('yarn.lock');
      });

      const result = PackageManagerDetector.detect('/test/dir', 'yarn');

      expect(result).toBe('yarn');
    });

    it('should fallback to npm when no lock files found', () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('yarn not found');
        })
        .mockReturnValue('1.0.0');

      mockExistsSync.mockReturnValue(false);

      const result = PackageManagerDetector.detect('/test/dir', 'yarn');

      expect(result).toBe('npm');
    });

    it('should throw error when no package manager is available', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });
      mockExistsSync.mockReturnValue(false);

      expect(() => PackageManagerDetector.detect('/test/dir')).toThrow(
        TasklyError
      );
      expect(() => PackageManagerDetector.detect('/test/dir')).toThrow(
        'No package manager found'
      );
    });
  });

  describe('lock file detection', () => {
    it('should detect npm from package-lock.json', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        return path.toString().endsWith('package-lock.json');
      });

      const result = PackageManagerDetector.detect('/test/dir');

      expect(result).toBe('npm');
    });

    it('should detect yarn from yarn.lock', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        return path.toString().endsWith('yarn.lock');
      });

      const result = PackageManagerDetector.detect('/test/dir');

      expect(result).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        return path.toString().endsWith('pnpm-lock.yaml');
      });

      const result = PackageManagerDetector.detect('/test/dir');

      expect(result).toBe('pnpm');
    });

    it('should detect bun from bun.lockb', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        return path.toString().endsWith('bun.lockb');
      });

      const result = PackageManagerDetector.detect('/test/dir');

      expect(result).toBe('bun');
    });

    it('should prioritize first found lock file when multiple exist', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        const pathStr = path.toString();
        return (
          pathStr.endsWith('package-lock.json') || pathStr.endsWith('yarn.lock')
        );
      });

      const result = PackageManagerDetector.detect('/test/dir');

      // Should return npm since package-lock.json is checked first
      expect(result).toBe('npm');
    });
  });

  describe('validate', () => {
    it('should pass validation for available package manager', () => {
      mockExecSync.mockReturnValue('1.0.0');

      expect(() => PackageManagerDetector.validate('npm')).not.toThrow();
    });

    it('should throw error for unavailable package manager', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      expect(() => PackageManagerDetector.validate('yarn')).toThrow(
        TasklyError
      );

      try {
        PackageManagerDetector.validate('yarn');
      } catch (error) {
        expect(error).toBeInstanceOf(TasklyError);
        expect((error as TasklyError).code).toBe(ERROR_CODES.PM_NOT_FOUND);
      }
    });

    it('should validate custom path when provided', () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('1.0.0');

      expect(() =>
        PackageManagerDetector.validate('npm', '/custom/npm')
      ).not.toThrow();
      expect(mockExistsSync).toHaveBeenCalledWith('/custom/npm');
      expect(mockExecSync).toHaveBeenCalledWith('"/custom/npm" --version', {
        stdio: 'ignore',
        timeout: 5000,
      });
    });

    it('should throw error for non-existent custom path', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() =>
        PackageManagerDetector.validate('npm', '/nonexistent/npm')
      ).toThrow(TasklyError);
      expect(() =>
        PackageManagerDetector.validate('npm', '/nonexistent/npm')
      ).toThrow('Custom package manager path not found');
    });

    it('should throw error for non-executable custom path', () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() =>
        PackageManagerDetector.validate('npm', '/invalid/npm')
      ).toThrow(TasklyError);
      expect(() =>
        PackageManagerDetector.validate('npm', '/invalid/npm')
      ).toThrow('not executable or invalid');
    });
  });

  describe('getCommand', () => {
    it('should return custom path when provided', () => {
      const result = PackageManagerDetector.getCommand('npm', '/custom/npm');
      expect(result).toBe('/custom/npm');
    });

    it('should return package manager name when no custom path', () => {
      const result = PackageManagerDetector.getCommand('yarn');
      expect(result).toBe('yarn');
    });
  });

  describe('getAvailablePackageManagers', () => {
    it('should return all available package managers', () => {
      mockExecSync.mockReturnValue('1.0.0');

      const result = PackageManagerDetector.getAvailablePackageManagers();

      expect(result).toEqual(['npm', 'yarn', 'pnpm', 'bun']);
    });

    it('should return only available package managers', () => {
      mockExecSync.mockImplementation(command => {
        const cmd = command.toString();
        if (cmd === 'npm --version' || cmd === 'yarn --version') {
          return '1.0.0';
        }
        throw new Error('Command not found');
      });

      const result = PackageManagerDetector.getAvailablePackageManagers();

      expect(result).toEqual(['npm', 'yarn']);
    });

    it('should return empty array when no package managers available', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = PackageManagerDetector.getAvailablePackageManagers();

      expect(result).toEqual([]);
    });
  });

  describe('getPackageManagerInfo', () => {
    it('should return package manager info when available', () => {
      mockExecSync.mockReturnValue('1.2.3\n');

      const result = PackageManagerDetector.getPackageManagerInfo('npm');

      expect(result).toEqual({
        name: 'npm',
        version: '1.2.3',
      });
    });

    it('should return null when package manager not available', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = PackageManagerDetector.getPackageManagerInfo('yarn');

      expect(result).toBeNull();
    });
  });

  describe('validateForExecution', () => {
    it('should return valid result with warnings for mismatched lock file', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        const pathStr = path.toString();
        return (
          pathStr.includes('package.json') || pathStr.includes('yarn.lock')
        );
      });

      const result = PackageManagerDetector.validateForExecution(
        'npm',
        '/test/dir'
      );

      expect(result.valid).toBe(true);
      expect(result.pm).toBe('npm');
      expect(result.command).toBe('npm');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some(w =>
          w.includes('Lock file suggests yarn but using npm')
        )
      ).toBe(true);
    });

    it('should warn when no package.json found', () => {
      mockExecSync.mockReturnValue('1.0.0');
      mockExistsSync.mockImplementation(path => {
        return !path.toString().includes('package.json');
      });

      const result = PackageManagerDetector.validateForExecution(
        'npm',
        '/test/dir'
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some(w => w.includes('No package.json found'))
      ).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should resolve to preferred PM when available', () => {
      mockExecSync.mockReturnValue('1.0.0');

      const result = PackageManagerDetector.resolve('yarn', '/test/dir');

      expect(result).toEqual({
        pm: 'yarn',
        command: 'yarn',
        source: 'preferred',
      });
    });

    it('should resolve to lock file PM when preferred not available', () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('yarn not found');
        })
        .mockReturnValue('1.0.0');

      mockExistsSync.mockImplementation(path => {
        return path.toString().endsWith('pnpm-lock.yaml');
      });

      const result = PackageManagerDetector.resolve('yarn', '/test/dir');

      expect(result).toEqual({
        pm: 'pnpm',
        command: 'pnpm',
        source: 'lockfile',
      });
    });

    it('should resolve to npm fallback', () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('yarn not found');
        })
        .mockReturnValue('1.0.0');

      mockExistsSync.mockReturnValue(false);

      const result = PackageManagerDetector.resolve('yarn', '/test/dir');

      expect(result).toEqual({
        pm: 'npm',
        command: 'npm',
        source: 'fallback',
      });
    });

    it('should handle custom path', () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('1.0.0');

      const result = PackageManagerDetector.resolve(
        'npm',
        '/test/dir',
        '/custom/npm'
      );

      expect(result).toEqual({
        pm: 'npm',
        command: '/custom/npm',
        source: 'preferred',
      });
    });
  });
});
