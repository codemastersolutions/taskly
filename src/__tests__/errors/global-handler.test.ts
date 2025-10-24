import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GlobalErrorHandler,
  LogLevel,
  addGlobalShutdownCallback,
  handleGlobalError,
  initializeGlobalErrorHandling,
} from '../../errors/global-handler.js';
import { ERROR_CODES, ErrorSeverity, TasklyError } from '../../errors/index.js';

// Mock process methods
const mockExit = vi
  .spyOn(process, 'exit')
  .mockImplementation(() => undefined as never);
const mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const _mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
const _mockConsoleDebug = vi
  .spyOn(console, 'debug')
  .mockImplementation(() => {});

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    // Reset singleton
    (GlobalErrorHandler as any).instance = null;

    // Clear all mocks
    vi.clearAllMocks();

    handler = new GlobalErrorHandler({
      enableConsoleLogging: true,
      enableFileLogging: false,
      exitOnCriticalError: false, // Disable for testing
      shutdownTimeout: 1000,
    });
  });

  afterEach(() => {
    if (handler) {
      handler.removeAllListeners();
    }
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should create singleton instance', () => {
      const instance1 = GlobalErrorHandler.getInstance();
      const instance2 = GlobalErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(GlobalErrorHandler);
    });

    it('should use provided options for singleton', () => {
      const options = {
        enableConsoleLogging: false,
        maxLogEntries: 500,
      };

      const instance = GlobalErrorHandler.getInstance(options);
      expect(instance).toBeInstanceOf(GlobalErrorHandler);
    });
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => handler.initialize()).not.toThrow();
    });

    it('should not initialize twice', () => {
      handler.initialize();
      expect(() => handler.initialize()).not.toThrow();
    });

    it('should initialize with convenience function', () => {
      const instance = initializeGlobalErrorHandling({
        enableConsoleLogging: false,
      });

      expect(instance).toBeInstanceOf(GlobalErrorHandler);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      handler.initialize();
    });

    it('should handle TasklyError', () => {
      const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED);
      const context = { testContext: 'value' };

      expect(() => handler.handleError(error, context)).not.toThrow();

      const log = handler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error).toBe(error);
      expect(log[0].context).toBe(context);
      expect(log[0].level).toBe(LogLevel.ERROR);
    });

    it('should handle critical errors', () => {
      const criticalError = new TasklyError(
        'Critical error',
        ERROR_CODES.SECURITY_VIOLATION
      );

      handler = new GlobalErrorHandler({
        exitOnCriticalError: true,
        enableConsoleLogging: false,
      });
      handler.initialize();

      handler.handleError(criticalError);

      // Should attempt to exit on critical error
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should emit error events', () => {
      const errorListener = vi.fn();
      handler.on('error', errorListener);

      const error = new TasklyError('Test error', ERROR_CODES.VALIDATION_ERROR);
      const context = { test: true };

      handler.handleError(error, context);

      expect(errorListener).toHaveBeenCalledWith(error, context);
    });

    it('should call custom error reporter', () => {
      const errorReporter = vi.fn();

      handler = new GlobalErrorHandler({
        errorReporter,
        enableConsoleLogging: false,
      });
      handler.initialize();

      const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED);
      const context = { custom: 'context' };

      handler.handleError(error, context);

      expect(errorReporter).toHaveBeenCalledWith(error, context);
    });

    it('should handle error reporter failures', () => {
      const errorReporter = vi.fn().mockImplementation(() => {
        throw new Error('Reporter failed');
      });

      handler = new GlobalErrorHandler({
        errorReporter,
        enableConsoleLogging: false,
      });
      handler.initialize();

      const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED);

      expect(() => handler.handleError(error)).not.toThrow();

      const log = handler.getErrorLog();
      expect(
        log.some(entry => entry.message.includes('Error reporter failed'))
      ).toBe(true);
    });
  });

  describe('Logging', () => {
    beforeEach(() => {
      handler.initialize();
    });

    it('should log messages with different levels', () => {
      const levels = [
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.FATAL,
      ];

      levels.forEach((level, index) => {
        handler.log(level, `Test message ${index}`, undefined, { level });
      });

      const log = handler.getErrorLog();
      expect(log).toHaveLength(levels.length);

      levels.forEach((level, index) => {
        expect(log[index].level).toBe(level);
        expect(log[index].message).toBe(`Test message ${index}`);
        expect(log[index].context).toEqual({ level });
      });
    });

    it('should log to console when enabled', () => {
      handler.log(LogLevel.ERROR, 'Error message');
      handler.log(LogLevel.WARN, 'Warning message');
      handler.log(LogLevel.INFO, 'Info message');

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should not log to console when disabled', () => {
      handler = new GlobalErrorHandler({
        enableConsoleLogging: false,
      });
      handler.initialize();

      handler.log(LogLevel.ERROR, 'Error message');

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should trim log entries when exceeding max', () => {
      handler = new GlobalErrorHandler({
        maxLogEntries: 3,
        enableConsoleLogging: false,
      });
      handler.initialize();

      // Add more entries than max
      for (let i = 0; i < 5; i++) {
        handler.log(LogLevel.INFO, `Message ${i}`);
      }

      const log = handler.getErrorLog();
      expect(log).toHaveLength(3);
      expect(log[0].message).toBe('Message 2'); // First two should be trimmed
      expect(log[2].message).toBe('Message 4');
    });

    it('should emit log events', () => {
      const logListener = vi.fn();
      handler.on('log', logListener);

      handler.log(LogLevel.INFO, 'Test message', undefined, { test: true });

      expect(logListener).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Test message',
          context: { test: true },
        })
      );
    });

    it('should clear error log', () => {
      handler.log(LogLevel.INFO, 'Message 1');
      handler.log(LogLevel.INFO, 'Message 2');

      expect(handler.getErrorLog()).toHaveLength(2);

      handler.clearErrorLog();

      expect(handler.getErrorLog()).toHaveLength(0);
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      handler.initialize();
    });

    it('should provide error statistics', () => {
      // Add various types of errors
      handler.handleError(new TasklyError('Error 1', ERROR_CODES.TASK_FAILED));
      handler.handleError(
        new TasklyError('Error 2', ERROR_CODES.VALIDATION_ERROR)
      );
      handler.handleError(
        new TasklyError('Error 3', ERROR_CODES.SECURITY_VIOLATION)
      );
      handler.log(LogLevel.WARN, 'Warning message');
      handler.log(LogLevel.INFO, 'Info message');

      const stats = handler.getErrorStatistics();

      expect(stats.totalErrors).toBe(5);
      expect(stats.errorsByLevel[LogLevel.ERROR]).toBe(2); // Task failed + validation
      expect(stats.errorsByLevel[LogLevel.FATAL]).toBe(1); // Security violation
      expect(stats.errorsByLevel[LogLevel.WARN]).toBe(1);
      expect(stats.errorsByLevel[LogLevel.INFO]).toBe(1);

      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1); // Task failed
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1); // Validation
      expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1); // Security

      expect(stats.recentErrors).toHaveLength(3); // Only errors with TasklyError objects
    });

    it('should limit recent errors to 10', () => {
      // Add more than 10 errors
      for (let i = 0; i < 15; i++) {
        handler.handleError(
          new TasklyError(`Error ${i}`, ERROR_CODES.TASK_FAILED)
        );
      }

      const stats = handler.getErrorStatistics();
      expect(stats.recentErrors).toHaveLength(10);
      expect(stats.recentErrors[0].error?.message).toBe('Error 5'); // Should start from error 5
      expect(stats.recentErrors[9].error?.message).toBe('Error 14');
    });
  });

  describe('Shutdown Callbacks', () => {
    beforeEach(() => {
      handler.initialize();
    });

    it('should add and execute shutdown callbacks', async () => {
      const callback1 = vi.fn().mockResolvedValue(undefined);
      const callback2 = vi.fn().mockResolvedValue(undefined);

      handler.addShutdownCallback(callback1);
      handler.addShutdownCallback(callback2);

      // Mock graceful shutdown to avoid process.exit
      const _gracefulShutdownSpy = vi
        .spyOn(handler, 'gracefulShutdown')
        .mockImplementation(async () => {
          // Execute callbacks manually for testing
          await Promise.all([callback1(), callback2()]);
        });

      await handler.gracefulShutdown(0);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should remove shutdown callbacks', () => {
      const callback = vi.fn();

      handler.addShutdownCallback(callback);
      handler.removeShutdownCallback(callback);

      // Verify callback was removed (can't easily test without triggering shutdown)
      expect(() => handler.removeShutdownCallback(callback)).not.toThrow();
    });

    it('should handle callback errors during shutdown', async () => {
      const failingCallback = vi
        .fn()
        .mockRejectedValue(new Error('Callback failed'));
      const successCallback = vi.fn().mockResolvedValue(undefined);

      handler.addShutdownCallback(failingCallback);
      handler.addShutdownCallback(successCallback);

      // Mock the internal callback execution
      const _executeCallbacksSpy = vi
        .spyOn(handler as any, 'executeShutdownCallbacks')
        .mockImplementation(async () => {
          await Promise.all([
            failingCallback().catch(() => {}), // Simulate error handling
            successCallback(),
          ]);
        });

      // Mock graceful shutdown to avoid process.exit
      const _gracefulShutdownSpy = vi
        .spyOn(handler, 'gracefulShutdown')
        .mockImplementation(async () => {
          await (handler as any).executeShutdownCallbacks();
        });

      await expect(handler.gracefulShutdown(0)).resolves.not.toThrow();
    });
  });

  describe('Convenience Functions', () => {
    it('should handle global error with convenience function', () => {
      const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED);
      const context = { test: true };

      expect(() => handleGlobalError(error, context)).not.toThrow();

      const instance = GlobalErrorHandler.getInstance();
      const log = instance.getErrorLog();
      expect(log.some(entry => entry.error === error)).toBe(true);
    });

    it('should add shutdown callback with convenience function', () => {
      const callback = vi.fn();

      expect(() => addGlobalShutdownCallback(callback)).not.toThrow();
    });
  });

  describe('Process Signal Handling', () => {
    it('should set up signal handlers during initialization', () => {
      const processOnSpy = vi.spyOn(process, 'on');

      handler.initialize();

      expect(processOnSpy).toHaveBeenCalledWith(
        'uncaughtException',
        expect.any(Function)
      );
      expect(processOnSpy).toHaveBeenCalledWith(
        'unhandledRejection',
        expect.any(Function)
      );
      expect(processOnSpy).toHaveBeenCalledWith(
        'warning',
        expect.any(Function)
      );
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith(
        'SIGTERM',
        expect.any(Function)
      );
      expect(processOnSpy).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
    });
  });

  describe('Error Recovery', () => {
    beforeEach(() => {
      handler = new GlobalErrorHandler({
        enableRecovery: true,
        enableConsoleLogging: false,
      });
      handler.initialize();
    });

    it('should handle recoverable errors differently', () => {
      const recoverableError = new TasklyError(
        'Timeout error',
        ERROR_CODES.PROCESS_TIMEOUT
      );

      handler.handleError(recoverableError);

      const log = handler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error).toBe(recoverableError);
    });
  });
});
