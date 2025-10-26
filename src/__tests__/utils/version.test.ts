import { describe, expect, it } from 'vitest';
import {
  analyzeCommits,
  calculateNewVersion,
  compareVersions,
  determineVersionIncrement,
  generateChangelogEntry,
  incrementVersion,
  isValidSemanticVersion,
  parseConventionalCommit,
  parseVersion,
} from '../../utils/version.js';

describe('Version Utils', () => {
  describe('parseConventionalCommit', () => {
    it('should parse valid conventional commit messages', () => {
      const commit = parseConventionalCommit('feat: add new feature');
      expect(commit).toEqual({
        type: 'feat',
        scope: undefined,
        description: 'add new feature',
        body: undefined,
        footer: undefined,
        isBreaking: false,
        raw: 'feat: add new feature',
        sha: undefined,
      });
    });

    it('should parse commit with scope', () => {
      const commit = parseConventionalCommit('fix(auth): resolve login issue');
      expect(commit).toEqual({
        type: 'fix',
        scope: 'auth',
        description: 'resolve login issue',
        body: undefined,
        footer: undefined,
        isBreaking: false,
        raw: 'fix(auth): resolve login issue',
        sha: undefined,
      });
    });

    it('should detect breaking changes with exclamation mark', () => {
      const commit = parseConventionalCommit('feat!: remove deprecated API');
      expect(commit?.isBreaking).toBe(true);
    });

    it('should detect breaking changes in body', () => {
      const commitMessage = `feat: add new API

BREAKING CHANGE: The old API has been removed`;
      const commit = parseConventionalCommit(commitMessage);
      expect(commit?.isBreaking).toBe(true);
    });

    it('should return null for non-conventional commits', () => {
      const commit = parseConventionalCommit('random commit message');
      expect(commit).toBeNull();
    });

    it('should include SHA when provided', () => {
      const commit = parseConventionalCommit('feat: new feature', 'abc123');
      expect(commit?.sha).toBe('abc123');
    });
  });

  describe('analyzeCommits', () => {
    it('should analyze multiple commits correctly', () => {
      const commits = [
        'feat: add new feature',
        'fix: resolve bug',
        'feat!: breaking change',
        'docs: update readme',
        'random commit',
      ];

      const analysis = analyzeCommits(commits);

      expect(analysis.hasBreakingChanges).toBe(true);
      expect(analysis.hasFeatures).toBe(true);
      expect(analysis.hasFixes).toBe(true);
      expect(analysis.conventionalCommits).toHaveLength(4);
      expect(analysis.skippedCommits).toHaveLength(1);
    });

    it('should handle empty commit list', () => {
      const analysis = analyzeCommits([]);

      expect(analysis.hasBreakingChanges).toBe(false);
      expect(analysis.hasFeatures).toBe(false);
      expect(analysis.hasFixes).toBe(false);
      expect(analysis.conventionalCommits).toHaveLength(0);
      expect(analysis.skippedCommits).toHaveLength(0);
    });
  });

  describe('determineVersionIncrement', () => {
    it('should return major for breaking changes', () => {
      const analysis = {
        hasBreakingChanges: true,
        hasFeatures: false,
        hasFixes: false,
        conventionalCommits: [],
        skippedCommits: [],
      };

      expect(determineVersionIncrement(analysis)).toBe('major');
    });

    it('should return minor for features without breaking changes', () => {
      const analysis = {
        hasBreakingChanges: false,
        hasFeatures: true,
        hasFixes: false,
        conventionalCommits: [],
        skippedCommits: [],
      };

      expect(determineVersionIncrement(analysis)).toBe('minor');
    });

    it('should return patch for fixes without features or breaking changes', () => {
      const analysis = {
        hasBreakingChanges: false,
        hasFeatures: false,
        hasFixes: true,
        conventionalCommits: [],
        skippedCommits: [],
      };

      expect(determineVersionIncrement(analysis)).toBe('patch');
    });

    it('should return patch for any conventional commits', () => {
      const analysis = {
        hasBreakingChanges: false,
        hasFeatures: false,
        hasFixes: false,
        conventionalCommits: [
          {
            type: 'docs' as const,
            description: 'update documentation',
            isBreaking: false,
            raw: 'docs: update documentation',
          },
        ],
        skippedCommits: [],
      };

      expect(determineVersionIncrement(analysis)).toBe('patch');
    });
  });

  describe('parseVersion', () => {
    it('should parse valid semantic versions', () => {
      expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
      expect(parseVersion('0.0.1')).toEqual({ major: 0, minor: 0, patch: 1 });
    });

    it('should throw for invalid versions', () => {
      expect(() => parseVersion('1.2')).toThrow('Invalid version format');
      expect(() => parseVersion('1.2.3.4')).toThrow('Invalid version format');
      expect(() => parseVersion('1.2.x')).toThrow('Invalid version component');
      expect(() => parseVersion('1.-1.3')).toThrow('Invalid version component');
    });
  });

  describe('incrementVersion', () => {
    it('should increment patch version', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4');
    });

    it('should increment minor version and reset patch', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('should increment major version and reset minor and patch', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0');
    });

    it('should handle version with v prefix', () => {
      expect(incrementVersion('v1.2.3', 'patch')).toBe('1.2.4');
    });
  });

  describe('calculateNewVersion', () => {
    it('should calculate version increment based on commits', () => {
      const commits = ['feat: add new feature', 'fix: resolve bug'];
      const result = calculateNewVersion('1.0.0', commits);

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.newVersion).toBe('1.1.0');
      expect(result.incrementType).toBe('minor');
      expect(result.reason).toBe('New features added');
    });

    it('should handle breaking changes', () => {
      const commits = ['feat!: breaking change'];
      const result = calculateNewVersion('1.0.0', commits);

      expect(result.newVersion).toBe('2.0.0');
      expect(result.incrementType).toBe('major');
      expect(result.reason).toBe('Breaking changes detected');
    });

    it('should include commit SHA when provided', () => {
      const commits = ['feat: new feature'];
      const shas = ['abc123'];
      const result = calculateNewVersion('1.0.0', commits, shas);

      expect(result.commitSha).toBe('abc123');
    });
  });

  describe('isValidSemanticVersion', () => {
    it('should validate correct semantic versions', () => {
      expect(isValidSemanticVersion('1.0.0')).toBe(true);
      expect(isValidSemanticVersion('v1.0.0')).toBe(true);
      expect(isValidSemanticVersion('0.1.0')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(isValidSemanticVersion('1.0')).toBe(false);
      expect(isValidSemanticVersion('1.0.0.0')).toBe(false);
      expect(isValidSemanticVersion('invalid')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
      expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    });
  });

  describe('generateChangelogEntry', () => {
    it('should generate changelog for conventional commits', () => {
      const analysis = {
        hasBreakingChanges: false,
        hasFeatures: true,
        hasFixes: true,
        conventionalCommits: [
          {
            type: 'feat' as const,
            scope: 'auth',
            description: 'add login functionality',
            isBreaking: false,
            raw: 'feat(auth): add login functionality',
          },
          {
            type: 'fix' as const,
            description: 'resolve memory leak',
            isBreaking: false,
            raw: 'fix: resolve memory leak',
          },
        ],
        skippedCommits: [],
      };

      const changelog = generateChangelogEntry(analysis, '1.1.0');

      expect(changelog).toContain('## 1.1.0');
      expect(changelog).toContain('### Features');
      expect(changelog).toContain('**auth**: add login functionality');
      expect(changelog).toContain('### Bug Fixes');
      expect(changelog).toContain('resolve memory leak');
    });

    it('should handle breaking changes', () => {
      const analysis = {
        hasBreakingChanges: true,
        hasFeatures: false,
        hasFixes: false,
        conventionalCommits: [
          {
            type: 'feat' as const,
            description: 'remove old API',
            isBreaking: true,
            raw: 'feat!: remove old API',
          },
        ],
        skippedCommits: [],
      };

      const changelog = generateChangelogEntry(analysis, '2.0.0');

      expect(changelog).toContain('### ⚠ BREAKING CHANGES');
      expect(changelog).toContain('remove old API');
    });

    it('should generate default entry for no conventional commits', () => {
      const analysis = {
        hasBreakingChanges: false,
        hasFeatures: false,
        hasFixes: false,
        conventionalCommits: [],
        skippedCommits: [],
      };

      const changelog = generateChangelogEntry(analysis, '1.0.1');

      expect(changelog).toContain('## 1.0.1');
      expect(changelog).toContain('Various improvements and fixes');
    });
  });
});
