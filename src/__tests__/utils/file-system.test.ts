import { promises as fs } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectPackageManagerFromLockFiles,
  detectPackageManagerFromPackageJson,
  directoryExists,
  fileExists,
  findConfigFile,
  loadJsonConfig,
  resolveWorkingDirectory,
  safeReadFile,
  safeWriteFile,
  validateWorkingDirectory,
} from '../../utils/file-system.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

const mockFs = vi.mocked(fs);

describe('File System Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const result = await fileExists('test.txt');
      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      const result = await fileExists('nonexistent.txt');
      expect(result).toBe(false);
    });
  });

  describe('directoryExists', () => {
    it('should return true if directory exists', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      const result = await directoryExists('test-dir');
      expect(result).toBe(true);
    });

    it('should return false if path is not a directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
      } as any);
      const result = await directoryExists('test-file');
      expect(result).toBe(false);
    });

    it('should return false if path does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('Path not found'));
      const result = await directoryExists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('validateWorkingDirectory', () => {
    it('should validate existing readable directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFs.access
        .mockResolvedValueOnce(undefined) // First call (directory exists)
        .mockResolvedValueOnce(undefined) // Second call (R_OK)
        .mockResolvedValueOnce(undefined); // Third call (W_OK)

      const result = await validateWorkingDirectory('./test');
      expect(result.valid).toBe(true);
    });

    it('should reject non-existent directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      const result = await validateWorkingDirectory('./nonexistent');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about non-writable directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockFs.access
        .mockResolvedValueOnce(undefined) // First call (directory exists)
        .mockResolvedValueOnce(undefined) // Second call (R_OK) succeeds
        .mockRejectedValueOnce(new Error('Permission denied')); // Third call (W_OK) fails

      const result = await validateWorkingDirectory('./readonly');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Directory is not writable: ' + join(process.cwd(), 'readonly')
      );
    });
  });

  describe('detectPackageManagerFromLockFiles', () => {
    it('should detect yarn from yarn.lock', async () => {
      mockFs.access.mockResolvedValueOnce(undefined); // yarn.lock found first

      const result = await detectPackageManagerFromLockFiles('./test');
      expect(result).toBe('yarn');
    });

    it('should detect npm from package-lock.json', async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error()) // yarn.lock not found
        .mockResolvedValueOnce(undefined); // package-lock.json found

      const result = await detectPackageManagerFromLockFiles('./test');
      expect(result).toBe('npm');
    });

    it('should return null if no lock files found', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));

      const result = await detectPackageManagerFromLockFiles('./test');
      expect(result).toBe(null);
    });
  });

  describe('detectPackageManagerFromPackageJson', () => {
    it('should detect package manager from packageManager field', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          packageManager: 'yarn@3.0.0',
        })
      );

      const result = await detectPackageManagerFromPackageJson('./test');
      expect(result).toBe('yarn');
    });

    it('should return null if package.json not found', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));

      const result = await detectPackageManagerFromPackageJson('./test');
      expect(result).toBe(null);
    });

    it('should return null if packageManager field not found', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          name: 'test-package',
        })
      );

      const result = await detectPackageManagerFromPackageJson('./test');
      expect(result).toBe(null);
    });
  });

  describe('findConfigFile', () => {
    it('should find first existing config file', async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error()) // taskly.config.json not found
        .mockResolvedValueOnce(undefined); // taskly.config.js found

      const result = await findConfigFile('./test');
      expect(result).toBe(join(process.cwd(), 'test', 'taskly.config.js'));
    });

    it('should return null if no config files found', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));

      const result = await findConfigFile('./test');
      expect(result).toBe(null);
    });
  });

  describe('loadJsonConfig', () => {
    it('should load valid JSON config', async () => {
      const config = { packageManager: 'npm', tasks: {} };
      mockFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await loadJsonConfig('./config.json');
      expect(result).toEqual(config);
    });

    it('should throw error for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(loadJsonConfig('./config.json')).rejects.toThrow();
    });

    it('should throw error for non-object config', async () => {
      mockFs.readFile.mockResolvedValue('"string config"');

      await expect(loadJsonConfig('./config.json')).rejects.toThrow();
    });
  });

  describe('resolveWorkingDirectory', () => {
    it('should resolve provided directory', () => {
      const result = resolveWorkingDirectory('./test');
      expect(result).toBe(join(process.cwd(), 'test'));
    });

    it('should return current directory if no path provided', () => {
      const result = resolveWorkingDirectory();
      expect(result).toBe(process.cwd());
    });
  });

  describe('safeReadFile', () => {
    it('should return file content on success', async () => {
      mockFs.readFile.mockResolvedValue('file content');

      const result = await safeReadFile('./test.txt');
      expect(result).toBe('file content');
    });

    it('should return null on error', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await safeReadFile('./nonexistent.txt');
      expect(result).toBe(null);
    });
  });

  describe('safeWriteFile', () => {
    it('should return true on successful write', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await safeWriteFile('./test.txt', 'content');
      expect(result).toBe(true);
    });

    it('should return false on write error', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const result = await safeWriteFile('./readonly.txt', 'content');
      expect(result).toBe(false);
    });
  });
});
