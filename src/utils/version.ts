/**
 * Version management utilities for automatic semantic versioning
 * Based on conventional commits specification
 */

export interface ConventionalCommit {
  /** Commit type (feat, fix, docs, etc.) */
  type:
    | 'feat'
    | 'fix'
    | 'docs'
    | 'style'
    | 'refactor'
    | 'test'
    | 'chore'
    | 'build'
    | 'ci'
    | 'perf'
    | 'revert';
  /** Optional scope of the change */
  scope?: string;
  /** Commit description */
  description: string;
  /** Optional commit body */
  body?: string;
  /** Optional commit footer */
  footer?: string;
  /** Whether this is a breaking change */
  isBreaking: boolean;
  /** Original commit message */
  raw: string;
  /** Commit SHA */
  sha?: string;
}

export interface CommitAnalysis {
  /** Whether any commits contain breaking changes */
  hasBreakingChanges: boolean;
  /** Whether any commits are features */
  hasFeatures: boolean;
  /** Whether any commits are fixes */
  hasFixes: boolean;
  /** All parsed conventional commits */
  conventionalCommits: ConventionalCommit[];
  /** Non-conventional commits that were skipped */
  skippedCommits: string[];
}

export interface VersionIncrement {
  /** Current version */
  currentVersion: string;
  /** New calculated version */
  newVersion: string;
  /** Type of increment applied */
  incrementType: 'patch' | 'minor' | 'major';
  /** Reason for the increment */
  reason: string;
  /** Commit SHA that triggered the increment */
  commitSha?: string;
}

export type VersionIncrementType = 'patch' | 'minor' | 'major';

/**
 * Regular expression for parsing conventional commit messages
 * Based on https://www.conventionalcommits.org/
 */
const CONVENTIONAL_COMMIT_REGEX =
  /^(?<type>feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)$/;

/**
 * Regular expression for detecting breaking changes in commit body/footer
 */
const BREAKING_CHANGE_REGEX = /^BREAKING CHANGE:\s+(.+)/m;

/**
 * Parse a single commit message into a ConventionalCommit object
 */
export function parseConventionalCommit(
  commitMessage: string,
  sha?: string
): ConventionalCommit | null {
  const lines = commitMessage.trim().split('\n');
  const firstLine = lines[0];

  const match = firstLine.match(CONVENTIONAL_COMMIT_REGEX);
  if (!match?.groups) {
    return null;
  }

  const { type, scope, breaking, description } = match.groups;

  // Extract body and footer (everything after the first line)
  const body = lines.slice(1).join('\n').trim();
  let footer = '';

  // Check for breaking changes in body/footer
  const breakingMatch = body.match(BREAKING_CHANGE_REGEX);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean conversion logic
  const isBreaking = !!breaking || !!breakingMatch;

  // Extract footer (typically starts with keywords like "BREAKING CHANGE:", "Closes:", etc.)
  const footerMatch = body.match(
    /^(BREAKING CHANGE:|Closes?:|Fixes?:|Refs?:)/m
  );
  if (footerMatch) {
    const footerIndex = body.indexOf(footerMatch[0]);
    footer = body.substring(footerIndex);
  }

  return {
    type: type as ConventionalCommit['type'],
    scope,
    description,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally converting empty strings to undefined
    body: body || undefined,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally converting empty strings to undefined
    footer: footer || undefined,
    isBreaking,
    raw: commitMessage,
    sha,
  };
}

/**
 * Analyze a list of commit messages to determine version increment type
 */
export function analyzeCommits(
  commitMessages: string[],
  commitShas?: string[]
): CommitAnalysis {
  const conventionalCommits: ConventionalCommit[] = [];
  const skippedCommits: string[] = [];

  let hasBreakingChanges = false;
  let hasFeatures = false;
  let hasFixes = false;

  commitMessages.forEach((message, index) => {
    const sha = commitShas?.[index];
    const parsed = parseConventionalCommit(message, sha);

    if (parsed) {
      conventionalCommits.push(parsed);

      if (parsed.isBreaking) {
        hasBreakingChanges = true;
      }

      if (parsed.type === 'feat') {
        hasFeatures = true;
      }

      if (parsed.type === 'fix') {
        hasFixes = true;
      }
    } else {
      skippedCommits.push(message);
    }
  });

  return {
    hasBreakingChanges,
    hasFeatures,
    hasFixes,
    conventionalCommits,
    skippedCommits,
  };
}

/**
 * Determine the version increment type based on commit analysis
 */
export function determineVersionIncrement(
  analysis: CommitAnalysis
): VersionIncrementType {
  if (analysis.hasBreakingChanges) {
    return 'major';
  }

  if (analysis.hasFeatures) {
    return 'minor';
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for version determination
  if (analysis.hasFixes || analysis.conventionalCommits.length > 0) {
    return 'patch';
  }

  // Default to patch if no conventional commits found but there are changes
  return 'patch';
}

/**
 * Parse a semantic version string into its components
 */
export function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const cleanVersion = version.replace(/^v/, ''); // Remove 'v' prefix if present
  const parts = cleanVersion.split('.');

  if (parts.length !== 3) {
    throw new Error(
      `Invalid version format: ${version}. Expected format: x.y.z`
    );
  }

  const [major, minor, patch] = parts.map(part => {
    const num = parseInt(part, 10);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for validation
    if (isNaN(num) || num < 0) {
      throw new Error(
        `Invalid version component: ${part}. Must be a non-negative integer`
      );
    }
    return num;
  });

  return { major, minor, patch };
}

/**
 * Increment a version based on the increment type
 */
export function incrementVersion(
  currentVersion: string,
  incrementType: VersionIncrementType
): string {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (incrementType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid increment type: ${incrementType}`);
  }
}

/**
 * Calculate the new version based on commit analysis
 */
export function calculateNewVersion(
  currentVersion: string,
  commitMessages: string[],
  commitShas?: string[]
): VersionIncrement {
  const analysis = analyzeCommits(commitMessages, commitShas);
  const incrementType = determineVersionIncrement(analysis);
  const newVersion = incrementVersion(currentVersion, incrementType);

  // Determine the reason for the increment
  let reason = '';
  if (analysis.hasBreakingChanges) {
    reason = 'Breaking changes detected';
  } else if (analysis.hasFeatures) {
    reason = 'New features added';
  } else if (analysis.hasFixes) {
    reason = 'Bug fixes applied';
  } else {
    reason = 'Changes detected';
  }

  // Find the most significant commit SHA
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for commit filtering
  const commitSha = analysis.conventionalCommits.find(
    c => c.isBreaking || c.type === 'feat' || c.type === 'fix'
  )?.sha;

  return {
    currentVersion,
    newVersion,
    incrementType,
    reason,
    commitSha,
  };
}

/**
 * Validate that a version string follows semantic versioning
 */
export function isValidSemanticVersion(version: string): boolean {
  try {
    parseVersion(version);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  if (version1.major !== version2.major) {
    return version1.major - version2.major;
  }

  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor;
  }

  return version1.patch - version2.patch;
}

/**
 * Generate a changelog entry from conventional commits
 */
export function generateChangelogEntry(
  analysis: CommitAnalysis,
  version: string
): string {
  const { conventionalCommits } = analysis;

  if (conventionalCommits.length === 0) {
    return `## ${version}\n\n- Various improvements and fixes\n`;
  }

  let changelog = `## ${version}\n\n`;

  // Group commits by type
  const breakingChanges = conventionalCommits.filter(c => c.isBreaking);
  const features = conventionalCommits.filter(
    c => c.type === 'feat' && !c.isBreaking
  );
  const fixes = conventionalCommits.filter(
    c => c.type === 'fix' && !c.isBreaking
  );
  const others = conventionalCommits.filter(
    c => !c.isBreaking && c.type !== 'feat' && c.type !== 'fix'
  );

  if (breakingChanges.length > 0) {
    changelog += '### ⚠ BREAKING CHANGES\n\n';
    breakingChanges.forEach(commit => {
      const scope = commit.scope ? `**${commit.scope}**: ` : '';
      changelog += `- ${scope}${commit.description}\n`;
    });
    changelog += '\n';
  }

  if (features.length > 0) {
    changelog += '### Features\n\n';
    features.forEach(commit => {
      const scope = commit.scope ? `**${commit.scope}**: ` : '';
      changelog += `- ${scope}${commit.description}\n`;
    });
    changelog += '\n';
  }

  if (fixes.length > 0) {
    changelog += '### Bug Fixes\n\n';
    fixes.forEach(commit => {
      const scope = commit.scope ? `**${commit.scope}**: ` : '';
      changelog += `- ${scope}${commit.description}\n`;
    });
    changelog += '\n';
  }

  if (others.length > 0) {
    changelog += '### Other Changes\n\n';
    others.forEach(commit => {
      const scope = commit.scope ? `**${commit.scope}**: ` : '';
      const typeLabel =
        commit.type.charAt(0).toUpperCase() + commit.type.slice(1);
      changelog += `- **${typeLabel}**: ${scope}${commit.description}\n`;
    });
    changelog += '\n';
  }

  return changelog.trim();
}
