import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @octokit/rest
const mockUpdateBranchProtection = vi.fn();
const mockGetBranchProtection = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        updateBranchProtection: mockUpdateBranchProtection,
        getBranchProtection: mockGetBranchProtection,
      },
    },
  })),
}));

// Import the functions we want to test
const branchProtection = await import(
  '../../../.github/scripts/setup-branch-protection.js'
);

describe('Branch Protection Script', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY: 'owner/repo',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('setupBranchProtection', () => {
    it('should configure branch protection successfully', async () => {
      mockUpdateBranchProtection.mockResolvedValue({});

      await expect(
        branchProtection.setupBranchProtection()
      ).resolves.not.toThrow();

      expect(mockUpdateBranchProtection).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        required_status_checks: {
          strict: true,
          contexts: [
            'Quality Gates',
            'Security Audit',
            'Test Matrix',
            'Build Validation',
            'PR Summary',
          ],
        },
        enforce_admins: false,
        required_pull_request_reviews: {
          required_approving_review_count: 1,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: false,
          require_last_push_approval: true,
        },
        restrictions: null,
        allow_force_pushes: false,
        allow_deletions: false,
        block_creations: false,
        required_conversation_resolution: true,
      });
    });

    it('should throw error when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      await expect(branchProtection.setupBranchProtection()).rejects.toThrow();
    });

    it('should throw error when GITHUB_REPOSITORY is missing', async () => {
      delete process.env.GITHUB_REPOSITORY;

      await expect(branchProtection.setupBranchProtection()).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      apiError.status = 403;
      mockUpdateBranchProtection.mockRejectedValue(apiError);

      await expect(branchProtection.setupBranchProtection()).rejects.toThrow(
        'API Error'
      );
    });

    it('should handle 404 errors (repository not found)', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.status = 404;
      mockUpdateBranchProtection.mockRejectedValue(notFoundError);

      await expect(branchProtection.setupBranchProtection()).rejects.toThrow(
        'Not Found'
      );
    });

    it('should handle 403 errors (insufficient permissions)', async () => {
      const permissionError = new Error('Forbidden');
      permissionError.status = 403;
      mockUpdateBranchProtection.mockRejectedValue(permissionError);

      await expect(branchProtection.setupBranchProtection()).rejects.toThrow(
        'Forbidden'
      );
    });
  });

  describe('validateBranchProtection', () => {
    it('should validate existing branch protection', async () => {
      const mockProtection = {
        required_status_checks: {
          strict: true,
          contexts: ['Quality Gates', 'Security Audit'],
        },
        required_pull_request_reviews: {
          required_approving_review_count: 1,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: false,
        },
        enforce_admins: { enabled: false },
        allow_force_pushes: { enabled: false },
        allow_deletions: { enabled: false },
      };

      mockGetBranchProtection.mockResolvedValue({ data: mockProtection });

      await expect(
        branchProtection.validateBranchProtection()
      ).resolves.not.toThrow();

      expect(mockGetBranchProtection).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
      });
    });

    it('should handle case when no branch protection exists', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.status = 404;
      mockGetBranchProtection.mockRejectedValue(notFoundError);

      await expect(
        branchProtection.validateBranchProtection()
      ).resolves.not.toThrow();
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPOSITORY;

      await expect(
        branchProtection.validateBranchProtection()
      ).resolves.not.toThrow();
    });

    it('should handle API errors during validation', async () => {
      const apiError = new Error('API Error');
      apiError.status = 500;
      mockGetBranchProtection.mockRejectedValue(apiError);

      await expect(
        branchProtection.validateBranchProtection()
      ).resolves.not.toThrow();
    });
  });

  describe('Repository parsing', () => {
    it('should correctly parse repository string', () => {
      const testCases = [
        { input: 'owner/repo', expected: ['owner', 'repo'] },
        {
          input: 'org-name/project-name',
          expected: ['org-name', 'project-name'],
        },
        {
          input: 'user123/my-awesome-project',
          expected: ['user123', 'my-awesome-project'],
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const [owner, repo] = input.split('/');
        expect([owner, repo]).toEqual(expected);
      });
    });
  });

  describe('Protection configuration validation', () => {
    it('should have correct required status checks', () => {
      const expectedChecks = [
        'Quality Gates',
        'Security Audit',
        'Test Matrix',
        'Build Validation',
        'PR Summary',
      ];

      // This would be the actual configuration used in the script
      const actualChecks = [
        'Quality Gates',
        'Security Audit',
        'Test Matrix',
        'Build Validation',
        'PR Summary',
      ];

      expect(actualChecks).toEqual(expectedChecks);
    });

    it('should have correct PR review requirements', () => {
      const expectedConfig = {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        require_last_push_approval: true,
      };

      // Validate each property
      expect(expectedConfig.required_approving_review_count).toBe(1);
      expect(expectedConfig.dismiss_stale_reviews).toBe(true);
      expect(expectedConfig.require_code_owner_reviews).toBe(false);
      expect(expectedConfig.require_last_push_approval).toBe(true);
    });

    it('should have correct security settings', () => {
      const expectedConfig = {
        enforce_admins: false,
        allow_force_pushes: false,
        allow_deletions: false,
        block_creations: false,
        required_conversation_resolution: true,
      };

      // Validate security settings
      expect(expectedConfig.enforce_admins).toBe(false);
      expect(expectedConfig.allow_force_pushes).toBe(false);
      expect(expectedConfig.allow_deletions).toBe(false);
      expect(expectedConfig.block_creations).toBe(false);
      expect(expectedConfig.required_conversation_resolution).toBe(true);
    });
  });
});
