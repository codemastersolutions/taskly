/**
 * Global error handling system for Taskly
 * Implements uncaught exception handling, graceful shutdown procedures, and error logging
 */

import { EventEmitter } from 'events';
import {
  ERROR_CODES,
  ErrorFactory,
  ErrorSeverity,
  TasklyError,
  getErrorSeverity,
} from './index.js';

/**
 * Error logging levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Error log entry interface
 */
export interface ErrorLogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  error?: TasklyError;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Global error handler configuration
 */
export interface GlobalErrorHandlerOptions {
  /** Enable console logging */
  enableConsoleLogging?: boolean;
  /** Enable file logging */
  enableFileLogging?: boolean;
  /** Log file path */
  logFilePath?: string;
  /** Maximum log entries to keep in memory */
  maxLogEntries?: number;
  /** Exit process on critical errors */
  exitOnCriticalError?: boolean;
  /** Custom error reporter function */
  errorReporter?: (
    error: TasklyError,
    context?: Record<string, unknown>
  ) => void;
  /** Graceful shutdown timeout in milliseconds */
  shutdownTimeout?: number;
  /** Enable error recovery attempts */
  enableRecovery?: boolean;
}

/**
 * Global error handler for managing uncaught exceptions and graceful shutdown
 */
export class GlobalErrorHandler extends EventEmitter {
  private static instance: GlobalErrorHandler | null = null;
  private isInitialized = false;
  private isShuttingDown = false;
  private errorLog: ErrorLogEntry[] = [];
  private shutdownCallbacks: Array<() => Promise<void> | void> = [];
  private options: Required<GlobalErrorHandlerOptions>;

  constructor(options: GlobalErrorHandlerOptions = {}) {
    super();

    this.options = {
      enableConsoleLogging: true,
      enableFileLogging: false,
      logFilePath: './taskly-errors.log',
      maxLogEntries: 1000,
      exitOnCriticalError: true,
      errorReporter: () => {}, // Default no-op reporter
      shutdownTimeout: 10000, // 10 seconds
      enableRecovery: true,
      ...options,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: GlobalErrorHandlerOptions): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(options);
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Initialize global error handling
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupUncaughtExceptionHandler();
    this.setupUnhandledRejectionHandler();
    this.setupProcessSignalHandlers();
    this.setupWarningHandler();

    this.isInitialized = true;
    this.log(LogLevel.INFO, 'Global error handler initialized');
  }

  /**
   * Add a callback to be executed during graceful shutdown
   */
  addShutdownCallback(callback: () => Promise<void> | void): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Remove a shutdown callback
   */
  removeShutdownCallback(callback: () => Promise<void> | void): void {
    const index = this.shutdownCallbacks.indexOf(callback);
    if (index >= 0) {
      this.shutdownCallbacks.splice(index, 1);
    }
  }

  /**
   * Handle a TasklyError with appropriate logging and recovery
   */
  handleError(error: TasklyError, context?: Record<string, unknown>): void {
    const severity = getErrorSeverity(error.code);
    const logLevel = this.getLogLevelFromSeverity(severity);

    // Log the error
    this.log(logLevel, error.getDetailedMessage(), error, context);

    // Emit error event for listeners
    this.emit('error', error, context);

    // Call custom error reporter if provided
    if (this.options.errorReporter) {
      try {
        this.options.errorReporter(error, context);
      } catch (reporterError) {
        this.log(LogLevel.ERROR, 'Error reporter failed', undefined, {
          reporterError:
            reporterError instanceof Error
              ? reporterError.message
              : String(reporterError),
        });
      }
    }

    // Handle critical errors
    if (
      severity === ErrorSeverity.CRITICAL &&
      this.options.exitOnCriticalError
    ) {
      this.log(LogLevel.FATAL, 'Critical error detected, initiating shutdown');
      // Don't await gracefulShutdown to avoid blocking
      this.gracefulShutdown(1).catch(() => {
        // Ignore shutdown errors in error handler
      });
    }
  }

  /**
   * Log an entry with specified level
   */
  log(
    level: LogLevel,
    message: string,
    error?: TasklyError,
    context?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      error,
      context,
      stack: error?.stack,
    };

    // Add to in-memory log
    this.errorLog.push(entry);

    // Trim log if it exceeds max entries
    if (this.errorLog.length > this.options.maxLogEntries) {
      this.errorLog.shift();
    }

    // Console logging
    if (this.options.enableConsoleLogging) {
      this.logToConsole(entry);
    }

    // File logging
    if (this.options.enableFileLogging) {
      this.logToFile(entry);
    }

    // Emit log event
    this.emit('log', entry);
  }

  /**
   * Get error log entries
   */
  getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByLevel: Record<LogLevel, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: ErrorLogEntry[];
  } {
    const errorsByLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0,
    };

    const errorsBySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    for (const entry of this.errorLog) {
      errorsByLevel[entry.level]++;

      if (entry.error) {
        const severity = getErrorSeverity(entry.error.code);
        errorsBySeverity[severity]++;
      }
    }

    // Get recent errors (last 10)
    const recentErrors = this.errorLog.filter(entry => entry.error).slice(-10);

    return {
      totalErrors: this.errorLog.length,
      errorsByLevel,
      errorsBySeverity,
      recentErrors,
    };
  }

  /**
   * Perform graceful shutdown
   */
  async gracefulShutdown(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.log(LogLevel.INFO, 'Initiating graceful shutdown');
    this.emit('shutdown:start', { exitCode });

    try {
      // Execute shutdown callbacks with timeout
      const shutdownPromise = this.executeShutdownCallbacks();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error('Shutdown timeout')),
          this.options.shutdownTimeout
        );
      });

      await Promise.race([shutdownPromise, timeoutPromise]);

      this.log(LogLevel.INFO, 'Graceful shutdown completed');
      this.emit('shutdown:complete', { exitCode });
    } catch (error) {
      this.log(LogLevel.ERROR, 'Error during graceful shutdown', undefined, {
        shutdownError: error instanceof Error ? error.message : String(error),
      });
      this.emit('shutdown:error', { error, exitCode });
    }

    // Final cleanup
    this.cleanup();

    // Exit process
    process.exit(exitCode);
  }

  /**
   * Setup uncaught exception handler
   */
  private setupUncaughtExceptionHandler(): void {
    process.on('uncaughtException', (error: Error) => {
      const tasklyError = ErrorFactory.createError(
        `Uncaught exception: ${error.message}`,
        ERROR_CODES.SYSTEM_ERROR,
        {
          metadata: {
            type: 'uncaughtException',
            originalName: error.name,
          },
        },
        error
      );

      this.handleError(tasklyError, { type: 'uncaughtException' });

      // Always exit on uncaught exceptions after logging
      this.gracefulShutdown(1);
    });
  }

  /**
   * Setup unhandled rejection handler
   */
  private setupUnhandledRejectionHandler(): void {
    process.on(
      'unhandledRejection',
      (reason: unknown, promise: Promise<unknown>) => {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));

        const tasklyError = ErrorFactory.createError(
          `Unhandled promise rejection: ${error.message}`,
          ERROR_CODES.SYSTEM_ERROR,
          {
            metadata: {
              type: 'unhandledRejection',
              reason: String(reason),
            },
          },
          error
        );

        this.handleError(tasklyError, {
          type: 'unhandledRejection',
          promise: promise.toString(),
        });

        // Don't exit on unhandled rejections by default, just log them
        // The application can decide whether to continue or not
      }
    );
  }

  /**
   * Setup process signal handlers
   */
  private setupProcessSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    for (const signal of signals) {
      process.on(signal, () => {
        this.log(LogLevel.INFO, `Received ${signal} signal`);
        this.emit('signal', { signal });
        this.gracefulShutdown(0);
      });
    }
  }

  /**
   * Setup warning handler
   */
  private setupWarningHandler(): void {
    process.on('warning', (warning: Error) => {
      this.log(
        LogLevel.WARN,
        `Process warning: ${warning.message}`,
        undefined,
        {
          warningName: warning.name,
          warningStack: warning.stack,
        }
      );
    });
  }

  /**
   * Execute all shutdown callbacks
   */
  private async executeShutdownCallbacks(): Promise<void> {
    const promises = this.shutdownCallbacks.map(async callback => {
      try {
        await callback();
      } catch (error) {
        this.log(LogLevel.ERROR, 'Shutdown callback failed', undefined, {
          callbackError: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get log level from error severity
   */
  private getLogLevelFromSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return LogLevel.FATAL;
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * Log entry to console with formatting
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const message = `[${timestamp}] [${level}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        console.error(message);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.DEBUG:
        console.debug(message);
        break;
    }

    // Log context if available
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('Context:', JSON.stringify(entry.context, null, 2));
    }
  }

  /**
   * Log entry to file (simplified implementation)
   */
  private logToFile(entry: ErrorLogEntry): void {
    // This is a simplified file logging implementation
    // In a production environment, you might want to use a proper logging library
    try {
      const fs = require('fs');
      const timestamp = new Date(entry.timestamp).toISOString();
      const level = entry.level.toUpperCase();
      const logLine = `[${timestamp}] [${level}] ${entry.message}\n`;

      fs.appendFileSync(this.options.logFilePath, logLine);

      if (entry.error?.stack) {
        fs.appendFileSync(this.options.logFilePath, `${entry.error.stack}\n`);
      }

      if (entry.context) {
        fs.appendFileSync(
          this.options.logFilePath,
          `Context: ${JSON.stringify(entry.context)}\n`
        );
      }

      fs.appendFileSync(this.options.logFilePath, '\n');
    } catch (fileError) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', fileError);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.removeAllListeners();
    this.shutdownCallbacks = [];
    this.isInitialized = false;
    GlobalErrorHandler.instance = null;
  }
}

/**
 * Convenience function to initialize global error handling
 */
export function initializeGlobalErrorHandling(
  options?: GlobalErrorHandlerOptions
): GlobalErrorHandler {
  const handler = GlobalErrorHandler.getInstance(options);
  handler.initialize();
  return handler;
}

/**
 * Convenience function to handle errors globally
 */
export function handleGlobalError(
  error: TasklyError,
  context?: Record<string, unknown>
): void {
  const handler = GlobalErrorHandler.getInstance();
  handler.handleError(error, context);
}

/**
 * Convenience function to add shutdown callback
 */
export function addGlobalShutdownCallback(
  callback: () => Promise<void> | void
): void {
  const handler = GlobalErrorHandler.getInstance();
  handler.addShutdownCallback(callback);
}

/**
 * Convenience function to perform graceful shutdown
 */
export function gracefulShutdown(exitCode = 0): Promise<void> {
  const handler = GlobalErrorHandler.getInstance();
  return handler.gracefulShutdown(exitCode);
}
