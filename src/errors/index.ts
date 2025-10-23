/**
 * Comprehensive error handling system for Taskly
 * Provides specific error types for different failure modes with context and debugging information
 */

// Base error codes - expanded from the original set
export const ERROR_CODES = {
  // Validation errors
  INVALID_COMMAND: 'INVALID_COMMAND',
  INVALID_TASK_CONFIG: 'INVALID_TASK_CONFIG',
  INVALID_OPTIONS: 'INVALID_OPTIONS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Package manager errors
  PM_NOT_FOUND: 'PM_NOT_FOUND',
  PM_DETECTION_FAILED: 'PM_DETECTION_FAILED',
  PM_VALIDATION_FAILED: 'PM_VALIDATION_FAILED',
  
  // Process execution errors
  SPAWN_FAILED: 'SPAWN_FAILED',
  PROCESS_TIMEOUT: 'PROCESS_TIMEOUT',
  PROCESS_KILLED: 'PROCESS_KILLED',
  PROCESS_RESOURCE_LIMIT: 'PROCESS_RESOURCE_LIMIT',
  
  // Task execution errors
  TASK_FAILED: 'TASK_FAILED',
  TASK_DEPENDENCY_FAILED: 'TASK_DEPENDENCY_FAILED',
  TASK_RETRY_EXHAUSTED: 'TASK_RETRY_EXHAUSTED',
  
  // Configuration errors
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIG_FILE_NOT_FOUND: 'CONFIG_FILE_NOT_FOUND',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',
  
  // System errors
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  
  // Security errors
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  
  // CLI errors
  CLI_PARSE_ERROR: 'CLI_PARSE_ERROR',
  CLI_INVALID_ARGUMENT: 'CLI_INVALID_ARGUMENT',
  
  // Color management errors
  COLOR_ASSIGNMENT_FAILED: 'COLOR_ASSIGNMENT_FAILED',
  INVALID_COLOR: 'INVALID_COLOR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Error context interface for providing additional debugging information
 */
export interface ErrorContext {
  /** Task identifier if error is task-specific */
  taskId?: string;
  /** Command that caused the error */
  command?: string;
  /** Working directory */
  cwd?: string;
  /** Package manager being used */
  packageManager?: string;
  /** Process ID if applicable */
  pid?: number;
  /** Exit code if applicable */
  exitCode?: number;
  /** Timestamp when error occurred */
  timestamp?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Stack trace from original error */
  originalStack?: string;
  /** Retry attempt number */
  retryAttempt?: number;
  /** Maximum retries allowed */
  maxRetries?: number;
}

/**
 * Base TasklyError class with enhanced context and debugging information
 */
export class TasklyError extends Error {
  public readonly name = 'TasklyError';
  public readonly timestamp: number;
  
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context: ErrorContext = {},
    public readonly originalError?: Error
  ) {
    super(message);
    
    this.timestamp = context.timestamp || Date.now();
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TasklyError);
    }
    
    // Store original stack trace if available
    if (originalError?.stack) {
      this.context.originalStack = originalError.stack;
    }
  }

  /**
   * Get a detailed error message with context
   */
  getDetailedMessage(): string {
    const parts = [this.message];
    
    if (this.context.taskId) {
      parts.push(`Task: ${this.context.taskId}`);
    }
    
    if (this.context.command) {
      parts.push(`Command: ${this.context.command}`);
    }
    
    if (this.context.cwd) {
      parts.push(`Working Directory: ${this.context.cwd}`);
    }
    
    if (this.context.packageManager) {
      parts.push(`Package Manager: ${this.context.packageManager}`);
    }
    
    if (this.context.exitCode !== undefined) {
      parts.push(`Exit Code: ${this.context.exitCode}`);
    }
    
    if (this.context.retryAttempt !== undefined && this.context.maxRetries !== undefined) {
      parts.push(`Retry: ${this.context.retryAttempt}/${this.context.maxRetries}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Get error information as a structured object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Validation error for invalid input or configuration
 */
export class ValidationError extends TasklyError {
  constructor(
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR, context, originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Package manager related errors
 */
export class PackageManagerError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.PM_NOT_FOUND,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'PackageManagerError';
  }
}

/**
 * Process execution errors
 */
export class ProcessError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.SPAWN_FAILED,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'ProcessError';
  }
}

/**
 * Task execution errors
 */
export class TaskExecutionError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.TASK_FAILED,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'TaskExecutionError';
  }
}

/**
 * Configuration related errors
 */
export class ConfigurationError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.CONFIG_ERROR,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'ConfigurationError';
  }
}

/**
 * Security related errors
 */
export class SecurityError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.SECURITY_VIOLATION,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'SecurityError';
  }
}

/**
 * CLI related errors
 */
export class CLIError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.CLI_PARSE_ERROR,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'CLIError';
  }
}

/**
 * System level errors
 */
export class SystemError extends TasklyError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.SYSTEM_ERROR,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, code, context, originalError);
    this.name = 'SystemError';
  }
}

/**
 * Error factory for creating appropriate error types based on context
 */
export class ErrorFactory {
  /**
   * Create an appropriate error based on the error code and context
   */
  static createError(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    originalError?: Error
  ): TasklyError {
    switch (code) {
      case ERROR_CODES.VALIDATION_ERROR:
      case ERROR_CODES.INVALID_COMMAND:
      case ERROR_CODES.INVALID_TASK_CONFIG:
      case ERROR_CODES.INVALID_OPTIONS:
        return new ValidationError(message, context, originalError);
        
      case ERROR_CODES.PM_NOT_FOUND:
      case ERROR_CODES.PM_DETECTION_FAILED:
      case ERROR_CODES.PM_VALIDATION_FAILED:
        return new PackageManagerError(message, code, context, originalError);
        
      case ERROR_CODES.SPAWN_FAILED:
      case ERROR_CODES.PROCESS_TIMEOUT:
      case ERROR_CODES.PROCESS_KILLED:
      case ERROR_CODES.PROCESS_RESOURCE_LIMIT:
        return new ProcessError(message, code, context, originalError);
        
      case ERROR_CODES.TASK_FAILED:
      case ERROR_CODES.TASK_DEPENDENCY_FAILED:
      case ERROR_CODES.TASK_RETRY_EXHAUSTED:
        return new TaskExecutionError(message, code, context, originalError);
        
      case ERROR_CODES.CONFIG_ERROR:
      case ERROR_CODES.CONFIG_FILE_NOT_FOUND:
      case ERROR_CODES.CONFIG_PARSE_ERROR:
        return new ConfigurationError(message, code, context, originalError);
        
      case ERROR_CODES.SECURITY_VIOLATION:
      case ERROR_CODES.COMMAND_INJECTION:
        return new SecurityError(message, code, context, originalError);
        
      case ERROR_CODES.CLI_PARSE_ERROR:
      case ERROR_CODES.CLI_INVALID_ARGUMENT:
        return new CLIError(message, code, context, originalError);
        
      case ERROR_CODES.SYSTEM_ERROR:
      case ERROR_CODES.FILE_SYSTEM_ERROR:
      case ERROR_CODES.PERMISSION_DENIED:
      case ERROR_CODES.RESOURCE_EXHAUSTED:
        return new SystemError(message, code, context, originalError);
        
      default:
        return new TasklyError(message, code, context, originalError);
    }
  }

  /**
   * Create error from Node.js system error
   */
  static fromSystemError(
    error: NodeJS.ErrnoException,
    context: ErrorContext = {}
  ): TasklyError {
    let code: ErrorCode;
    let message = error.message;

    switch (error.code) {
      case 'ENOENT':
        code = ERROR_CODES.FILE_SYSTEM_ERROR;
        message = `File or directory not found: ${error.path || 'unknown'}`;
        break;
      case 'EACCES':
      case 'EPERM':
        code = ERROR_CODES.PERMISSION_DENIED;
        message = `Permission denied: ${error.path || 'unknown'}`;
        break;
      case 'EMFILE':
      case 'ENFILE':
        code = ERROR_CODES.RESOURCE_EXHAUSTED;
        message = 'Too many open files';
        break;
      case 'ENOTDIR':
        code = ERROR_CODES.FILE_SYSTEM_ERROR;
        message = `Not a directory: ${error.path || 'unknown'}`;
        break;
      case 'EISDIR':
        code = ERROR_CODES.FILE_SYSTEM_ERROR;
        message = `Is a directory: ${error.path || 'unknown'}`;
        break;
      default:
        code = ERROR_CODES.SYSTEM_ERROR;
        message = `System error: ${error.message}`;
    }

    return ErrorFactory.createError(message, code, {
      ...context,
      metadata: {
        ...context.metadata,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path
      }
    }, error);
  }

  /**
   * Create error from spawn error
   */
  static fromSpawnError(
    error: Error,
    command: string,
    context: ErrorContext = {}
  ): ProcessError {
    const errorContext: ErrorContext = {
      ...context,
      command,
      metadata: {
        ...context.metadata,
        errorType: 'spawn'
      }
    };

    if ('code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      switch (nodeError.code) {
        case 'ENOENT':
          return new ProcessError(
            `Command not found: ${command}`,
            ERROR_CODES.SPAWN_FAILED,
            errorContext,
            error
          );
        case 'EACCES':
          return new ProcessError(
            `Permission denied executing command: ${command}`,
            ERROR_CODES.SPAWN_FAILED,
            errorContext,
            error
          );
        default:
          return new ProcessError(
            `Failed to spawn process: ${error.message}`,
            ERROR_CODES.SPAWN_FAILED,
            errorContext,
            error
          );
      }
    }

    return new ProcessError(
      `Process spawn failed: ${error.message}`,
      ERROR_CODES.SPAWN_FAILED,
      errorContext,
      error
    );
  }
}

/**
 * Error severity levels for logging and handling
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Get error severity based on error code
 */
export function getErrorSeverity(code: ErrorCode): ErrorSeverity {
  switch (code) {
    case ERROR_CODES.SECURITY_VIOLATION:
    case ERROR_CODES.COMMAND_INJECTION:
    case ERROR_CODES.RESOURCE_EXHAUSTED:
      return ErrorSeverity.CRITICAL;
      
    case ERROR_CODES.SPAWN_FAILED:
    case ERROR_CODES.TASK_FAILED:
    case ERROR_CODES.PERMISSION_DENIED:
    case ERROR_CODES.CONFIG_ERROR:
      return ErrorSeverity.HIGH;
      
    case ERROR_CODES.PM_NOT_FOUND:
    case ERROR_CODES.PROCESS_TIMEOUT:
    case ERROR_CODES.VALIDATION_ERROR:
    case ERROR_CODES.CLI_PARSE_ERROR:
      return ErrorSeverity.MEDIUM;
      
    default:
      return ErrorSeverity.LOW;
  }
}

/**
 * Check if error is recoverable (can be retried)
 */
export function isRecoverableError(error: TasklyError): boolean {
  const recoverableCodes = [
    ERROR_CODES.PROCESS_TIMEOUT,
    ERROR_CODES.RESOURCE_EXHAUSTED,
    ERROR_CODES.SYSTEM_ERROR
  ];
  
  return recoverableCodes.includes(error.code);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: TasklyError): string {
  switch (error.code) {
    case ERROR_CODES.PM_NOT_FOUND:
      return `Package manager not found. Please install ${error.context.packageManager || 'the required package manager'}.`;
      
    case ERROR_CODES.SPAWN_FAILED:
      return `Failed to run command "${error.context.command || 'unknown'}". Check if the command exists and is executable.`;
      
    case ERROR_CODES.PERMISSION_DENIED:
      return `Permission denied. Check file permissions and try running with appropriate privileges.`;
      
    case ERROR_CODES.PROCESS_TIMEOUT:
      return `Command timed out. Consider increasing the timeout or optimizing the command.`;
      
    case ERROR_CODES.VALIDATION_ERROR:
      return `Invalid configuration. Please check your command syntax and options.`;
      
    case ERROR_CODES.CONFIG_ERROR:
      return `Configuration error. Please check your taskly configuration file.`;
      
    default:
      return error.message;
  }
}