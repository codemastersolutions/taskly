import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock child_process and fs
vi.mock('child_process');
vi.mock('fs');

const mockExecSync = vi.mocked(execSync);
const mockFs = vi.mocked(fs);

// Import the functions we want to test
const versionManagement = await import(
  '../../../scripts/version-management.js'
);

describe('Version Management Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.GITHUB_OUTPUT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommitsSinceLastRelease', () => {
    it('should get commits since last tag when tag exists', () => {
      mockExecSync
        .mockReturnValueOnce('v1.0.0') // git describe --tags
        .mockReturnValueOnce('feat: add new feature\nfix: resolve bug') // git log messages
        .mockReturnValueOnce('abc123\ndef456'); // git log SHAs

      const result = versionManagement.getCommitsSinceLastRelease();

      expect(result).toEqual({
        commitMessages: ['feat: add new feature', 'fix: resolve bug'],
        commitShas: ['abc123', 'def456'],
        lastTag: 'v1.0.0',
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        'git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo ""',
        { encoding: 'utf8' }
      );
    });

    it('should handle case when no previous tags exist', () => {
      mockExecSync
        .mockReturnValueOnce('') // no tags
        .mockReturnValueOnce('feat: initial commit') // git log messages
        .mockReturnValueOnce('abc123'); // git log SHAs

      const result = versionManagement.getCommitsSinceLastRelease();

      expect(result).toEqual({
        commitMessages: ['feat: initial commit'],
        commitShas: ['abc123'],
        lastTag: '',
      });
    });

    it('should filter out empty commit messages', () => {
      mockExecSync
        .mockReturnValueOnce('v1.0.0')
        .mockReturnValueOnce('feat: add feature\n\nfix: resolve bug\n')
        .mockReturnValueOnce('abc123\n\ndef456\n');

      const result = versionManagement.getCommitsSinceLastRelease();

      expect(result.commitMessages).toEqual([
        'feat: add feature',
        'fix: resolve bug',
      ]);
      expect(result.commitShas).toEqual(['abc123', 'def456']);
    });

    it('should throw error when git command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      expect(() => versionManagement.getCommitsSinceLastRelease()).toThrow();
    });
  });

  describe('getCurrentVersion', () => {
    it('should read version from package.json', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.2.3',
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const version = versionManagement.getCurrentVersion();

      expect(version).toBe('1.2.3');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'package.json'),
        'utf8'
      );
    });

    it('should throw error when package.json has no version', () => {
      const mockPackageJson = { name: 'test-package' };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      expect(() => versionManagement.getCurrentVersion()).toThrow(
        'No version field found in package.json'
      );
    });

    it('should throw error when version is invalid', () => {
      const mockPackageJson = { version: 'invalid-version' };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      expect(() => versionManagement.getCurrentVersion()).toThrow(
        'Invalid semantic version in package.json: invalid-version'
      );
    });

    it('should throw error when package.json cannot be read', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => versionManagement.getCurrentVersion()).toThrow();
    });
  });

  describe('updatePackageVersion', () => {
    it('should update package.json with new version', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
      mockFs.writeFileSync.mockImplementation(() => {});

      versionManagement.updatePackageVersion('1.1.0');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'package.json'),
        JSON.stringify({ ...mockPackageJson, version: '1.1.0' }, null, 2) + '\n'
      );
    });

    it('should throw error when package.json cannot be updated', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => versionManagement.updatePackageVersion('1.1.0')).toThrow();
    });
  });

  describe('updatePackageLockVersion', () => {
    it('should update package-lock.json when it exists', () => {
      const mockLockJson = {
        name: 'test-package',
        version: '1.0.0',
        packages: {
          '': { version: '1.0.0' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockLockJson));
      mockFs.writeFileSync.mockImplementation(() => {});

      versionManagement.updatePackageLockVersion('1.1.0');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'package-lock.json'),
        JSON.stringify(
          {
            ...mockLockJson,
            version: '1.1.0',
            packages: { '': { version: '1.1.0' } },
          },
          null,
          2
        ) + '\n'
      );
    });

    it('should skip update when package-lock.json does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      versionManagement.updatePackageLockVersion('1.1.0');

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      // Should not throw, just log warning
      expect(() =>
        versionManagement.updatePackageLockVersion('1.1.0')
      ).not.toThrow();
    });
  });

  describe('updateChangelog', () => {
    it('should create new changelog when file does not exist', () => {
      const mockAnalysis = {
        hasBreakingChanges: false,
        hasFeatures: true,
        hasFixes: false,
        conventionalCommits: [
          {
            type: 'feat' as const,
            description: 'add new feature',
            isBreaking: false,
            raw: 'feat: add new feature',
          },
        ],
        skippedCommits: [],
      };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {});

      // Mock the generateChangelogEntry function
      const _mockGenerateChangelogEntry = vi
        .fn()
        .mockReturnValue('## 1.1.0\n\n### Features\n\n- add new feature\n');

      versionManagement.updateChangelog(mockAnalysis, '1.1.0');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('# Changelog');
      expect(writtenContent).toContain('Keep a Changelog');
    });

    it('should insert new entry into existing changelog', () => {
      const existingChangelog = `# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0

- Initial release
`;

      const mockAnalysis = {
        hasBreakingChanges: false,
        hasFeatures: true,
        hasFixes: false,
        conventionalCommits: [],
        skippedCommits: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(existingChangelog);
      mockFs.writeFileSync.mockImplementation(() => {});

      versionManagement.updateChangelog(mockAnalysis, '1.1.0');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('## 1.1.0');
      expect(writtenContent).toContain('## 1.0.0');
    });
  });

  describe('validateVersionSync', () => {
    it('should return true when versions match', () => {
      const mockPackageJson = { version: '1.1.0' };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = versionManagement.validateVersionSync('1.1.0');

      expect(result).toBe(true);
    });

    it('should return false when versions do not match', () => {
      const mockPackageJson = { version: '1.0.0' };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = versionManagement.validateVersionSync('1.1.0');

      expect(result).toBe(false);
    });

    it('should return false when validation fails', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = versionManagement.validateVersionSync('1.1.0');

      expect(result).toBe(false);
    });
  });
});
