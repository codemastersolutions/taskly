/**
 * Utility module exports
 */

export {
  createValidationError,
  sanitizeCommand,
  validateColor,
  validateCommand,
  validatePackageManager,
  validateTaskConfig,
  validateTasklyOptions,
} from './validation.js';

export {
  detectPackageManager,
  directoryExists,
  fileExists,
  loadConfigFile,
} from './file-system.js';

export {
  clearLine,
  cursorUp,
  formatOutputLine,
  getTerminalWidth,
  stripAnsi,
} from './terminal.js';

export {
  analyzeCommits,
  calculateNewVersion,
  compareVersions,
  determineVersionIncrement,
  generateChangelogEntry,
  incrementVersion,
  isValidSemanticVersion,
  parseConventionalCommit,
  parseVersion,
} from './version.js';

export type {
  CommitAnalysis,
  ConventionalCommit,
  VersionIncrement,
  VersionIncrementType,
} from './version.js';
