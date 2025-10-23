/**
 * Core type definitions for Taskly library
 */

// Package Manager Types
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

// Color Types
export type Color = 
  | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan'
  | 'brightRed' | 'brightGreen' | 'brightYellow' | 'brightBlue'
  | 'brightMagenta' | 'brightCyan'
  | 'white' | 'black' | 'gray';

// Core Task Configuration Interface
export interface TaskConfig {
  /** The command to execute */
  command: string;
  /** Optional custom identifier for the task */
  identifier?: string;
  /** Optional custom color for task output */
  color?: Color | string;
  /** Package manager to use for this task */
  packageManager?: PackageManager;
  /** Working directory for the command */
  cwd?: string;
}

// Task Execution Result Interface
export interface TaskResult {
  /** Task identifier */
  identifier: string;
  /** Process exit code */
  exitCode: number;
  /** Captured output lines */
  output: string[];
  /** Error message if task failed */
  error?: string;
  /** Task execution duration in milliseconds */
  duration: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
}

// Main Taskly Options Interface
export interface TasklyOptions {
  /** Array of tasks to execute */
  tasks: TaskConfig[];
  /** Kill all other tasks when one fails */
  killOthersOnFail?: boolean;
  /** Maximum number of concurrent tasks */
  maxConcurrency?: number;
  /** Prefix format for task output */
  prefix?: string;
  /** Timestamp format for output */
  timestampFormat?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

// CLI Options Interface
export interface CLIOptions {
  /** Array of commands to execute */
  commands: string[];
  /** Custom names for each command */
  names?: string[];
  /** Custom colors for each command */
  colors?: string[];
  /** Package manager to use */
  packageManager?: PackageManager;
  /** Kill others on fail flag */
  killOthersOnFail?: boolean;
  /** Maximum concurrency */
  maxConcurrency?: number;
  /** Configuration file path */
  config?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Show help */
  help?: boolean;
  /** Show version */
  version?: boolean;
}

// Re-export error types from the dedicated errors module
export type { 
  ErrorCode, 
  ErrorContext, 
  ErrorSeverity 
} from '../errors/index.js';

export { 
  ERROR_CODES,
  TasklyError,
  ValidationError,
  PackageManagerError,
  ProcessError,
  TaskExecutionError,
  ConfigurationError,
  SecurityError,
  CLIError,
  SystemError,
  ErrorFactory,
  getErrorSeverity,
  isRecoverableError,
  getUserFriendlyMessage
} from '../errors/index.js';

// Process Management Types
export interface ProcessInfo {
  /** Process ID */
  pid?: number;
  /** Task identifier */
  identifier: string;
  /** Command being executed */
  command: string;
  /** Process start time */
  startTime: number;
  /** Current process status */
  status: ProcessStatus;
}

export type ProcessStatus = 'starting' | 'running' | 'completed' | 'failed' | 'killed';

// Color Management Types
export interface ColorAssignment {
  /** Task identifier */
  identifier: string;
  /** Assigned color */
  color: Color | string;
  /** ANSI color code */
  ansiCode: string;
}

// Configuration File Types
export interface TasklyConfig {
  /** Default package manager */
  packageManager?: PackageManager;
  /** Default kill others on fail */
  killOthersOnFail?: boolean;
  /** Default max concurrency */
  maxConcurrency?: number;
  /** Default colors */
  colors?: (Color | string)[];
  /** Task definitions */
  tasks?: Record<string, TaskConfig>;
  /** Global options */
  options?: Partial<TasklyOptions>;
}

// Validation Types
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

// Stream Types for Output Management
export interface OutputLine {
  /** Task identifier */
  identifier: string;
  /** Output content */
  content: string;
  /** Output type */
  type: 'stdout' | 'stderr';
  /** Timestamp */
  timestamp: number;
  /** Formatted line with colors and prefix */
  formatted: string;
}

// Event Types for Task Lifecycle
export type TaskEvent = 
  | { type: 'task:start'; identifier: string; command: string }
  | { type: 'task:output'; identifier: string; line: OutputLine }
  | { type: 'task:complete'; identifier: string; result: TaskResult }
  | { type: 'task:error'; identifier: string; error: TasklyError }
  | { type: 'all:complete'; results: TaskResult[] }
  | { type: 'all:error'; error: TasklyError };

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Re-export commonly used types
export type { TaskConfig as Task };
export type { TaskResult as Result };
export type { TasklyOptions as Options };
