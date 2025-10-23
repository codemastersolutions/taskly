import { describe, it, expect, beforeEach } from 'vitest';
import {
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
  ERROR_CODES,
  ErrorSeverity,
  getErrorSeverity,
  isRecoverableError,
  getUserFriendlyMessage
} from '../../errors/index.js';

describe('Error Classes', () => {
  describe('TasklyError', () => {
    it('should create basic TasklyError', () => {
      const error = new TasklyError('Test error', ERROR_CODES.SYSTEM_ERROR);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('TasklyError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.SYSTEM_ERROR);
      expect(error.timestamp).toBeTypeOf('number');
      expect(error.context).toEqual({});
    });

    it('should create TasklyError with context', () => {
      const context = {
        taskId: 'test-task',
        command: 'echo test',
        cwd: '/test/dir',
        timestamp: Date.now()
      };
      
      const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED, context);
      
      expect(error.context).toEqual(context);
      expect(error.timestamp).toBe(context.timestamp);
    });

    it('should create TasklyError with original error', () => {
      const originalError = new Error('Original error');
      const error = new TasklyError(
        'Wrapped error', 
        ERROR_CODES.SYSTEM_ERROR, 
        {},
        originalError
      );
      
      expect(error.originalError).toBe(originalError);
      expect(error.context.originalStack).toBe(originalError.stack);
    });

    it('should generate detailed message', () => {
      const context = {
        taskId: 'test-task',
        command: 'echo test',
        cwd: '/test/dir',
        packageManager: 'npm',
        exitCode: 1,
        retryAttempt: 2,
        maxRetries: 3
      };
      
      const error = new TasklyError('Test error', ERROR_CODES.TASK_FAILED, context);
      const detailedMessage = error.getDetailedMessage();
      
      expect(detailedMessage).toContain('Test error');
      expect(detailedMessage).toContain('Task: test-task');
      expect(detailedMessage).toContain('Command: echo test');
      expect(detailedMessage).toContain('Working Directory: /test/dir');
      expect(detailedMessage).toContain('Package Manager: npm');
      expect(detailedMessage).toContain('Exit Code: 1');
      expect(detailedMessage).toContain('Retry: 2/3');
    });

    it('should serialize to JSON', () => {
      const context = { taskId: 'test-task' };
      const originalError = new Error('Original');
      const error = new TasklyError(
        'Test error', 
        ERROR_CODES.TASK_FAILED, 
        context,
        originalError
      );
      
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'TasklyError');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', ERROR_CODES.TASK_FAILED);
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('context', context);
      expect(json).toHaveProperty('stack');
      expect(json).toHaveProperty('originalError');
      expect(json.originalError).toHaveProperty('name', 'Error');
      expect(json.originalError).toHaveProperty('message', 'Original');
    });
  });

  describe('Specific Error Types', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should create PackageManagerError', () => {
      const error = new PackageManagerError('PM not found', ERROR_CODES.PM_NOT_FOUND);
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('PackageManagerError');
      expect(error.code).toBe(ERROR_CODES.PM_NOT_FOUND);
    });

    it('should create ProcessError', () => {
      const error = new ProcessError('Spawn failed', ERROR_CODES.SPAWN_FAILED);
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('ProcessError');
      expect(error.code).toBe(ERROR_CODES.SPAWN_FAILED);
    });

    it('should create TaskExecutionError', () => {
      const error = new TaskExecutionError('Task failed');
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('TaskExecutionError');
      expect(error.code).toBe(ERROR_CODES.TASK_FAILED);
    });

    it('should create ConfigurationError', () => {
      const error = new ConfigurationError('Config invalid');
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('ConfigurationError');
      expect(error.code).toBe(ERROR_CODES.CONFIG_ERROR);
    });

    it('should create SecurityError', () => {
      const error = new SecurityError('Security violation');
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('SecurityError');
      expect(error.code).toBe(ERROR_CODES.SECURITY_VIOLATION);
    });

    it('should create CLIError', () => {
      const error = new CLIError('CLI parse error');
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('CLIError');
      expect(error.code).toBe(ERROR_CODES.CLI_PARSE_ERROR);
    });

    it('should create SystemError', () => {
      const error = new SystemError('System failure');
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('SystemError');
      expect(error.code).toBe(ERROR_CODES.SYSTEM_ERROR);
    });
  });

  describe('ErrorFactory', () => {
    it('should create appropriate error types based on code', () => {
      const testCases = [
        { code: ERROR_CODES.VALIDATION_ERROR, expectedType: ValidationError },
        { code: ERROR_CODES.PM_NOT_FOUND, expectedType: PackageManagerError },
        { code: ERROR_CODES.SPAWN_FAILED, expectedType: ProcessError },
        { code: ERROR_CODES.TASK_FAILED, expectedType: TaskExecutionError },
        { code: ERROR_CODES.CONFIG_ERROR, expectedType: ConfigurationError },
        { code: ERROR_CODES.SECURITY_VIOLATION, expectedType: SecurityError },
        { code: ERROR_CODES.CLI_PARSE_ERROR, expectedType: CLIError },
        { code: ERROR_CODES.SYSTEM_ERROR, expectedType: SystemError }
      ];

      testCases.forEach(({ code, expectedType }) => {
        const error = ErrorFactory.createError('Test message', code);
        expect(error).toBeInstanceOf(expectedType);
        expect(error.code).toBe(code);
      });
    });

    it('should create TasklyError for unknown codes', () => {
      const error = ErrorFactory.createError('Test', 'UNKNOWN_CODE' as any);
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.name).toBe('TasklyError');
    });

    it('should create error from system error', () => {
      const systemError: NodeJS.ErrnoException = new Error('File not found');
      systemError.code = 'ENOENT';
      systemError.path = '/test/file';
      systemError.errno = -2;
      systemError.syscall = 'open';

      const error = ErrorFactory.fromSystemError(systemError);
      
      expect(error).toBeInstanceOf(TasklyError);
      expect(error.code).toBe(ERROR_CODES.FILE_SYSTEM_ERROR);
      expect(error.message).toContain('File or directory not found');
      expect(error.context.metadata).toHaveProperty('errno', -2);
      expect(error.context.metadata).toHaveProperty('syscall', 'open');
      expect(error.context.metadata).toHaveProperty('path', '/test/file');
    });

    it('should handle different system error codes', () => {
      const testCases = [
        { code: 'EACCES', expectedErrorCode: ERROR_CODES.PERMISSION_DENIED },
        { code: 'EPERM', expectedErrorCode: ERROR_CODES.PERMISSION_DENIED },
        { code: 'EMFILE', expectedErrorCode: ERROR_CODES.RESOURCE_EXHAUSTED },
        { code: 'ENFILE', expectedErrorCode: ERROR_CODES.RESOURCE_EXHAUSTED },
        { code: 'ENOTDIR', expectedErrorCode: ERROR_CODES.FILE_SYSTEM_ERROR },
        { code: 'EISDIR', expectedErrorCode: ERROR_CODES.FILE_SYSTEM_ERROR },
        { code: 'UNKNOWN', expectedErrorCode: ERROR_CODES.SYSTEM_ERROR }
      ];

      testCases.forEach(({ code, expectedErrorCode }) => {
        const systemError: NodeJS.ErrnoException = new Error('System error');
        systemError.code = code;
        
        const error = ErrorFactory.fromSystemError(systemError);
        expect(error.code).toBe(expectedErrorCode);
      });
    });

    it('should create error from spawn error', () => {
      const spawnError: NodeJS.ErrnoException = new Error('Command not found');
      spawnError.code = 'ENOENT';
      
      const error = ErrorFactory.fromSpawnError(spawnError, 'nonexistent-command');
      
      expect(error).toBeInstanceOf(ProcessError);
      expect(error.code).toBe(ERROR_CODES.SPAWN_FAILED);
      expect(error.message).toContain('Command not found');
      expect(error.context.command).toBe('nonexistent-command');
    });
  });

  describe('Error Utility Functions', () => {
    it('should get correct error severity', () => {
      const testCases = [
        { code: ERROR_CODES.SECURITY_VIOLATION, expected: ErrorSeverity.CRITICAL },
        { code: ERROR_CODES.COMMAND_INJECTION, expected: ErrorSeverity.CRITICAL },
        { code: ERROR_CODES.RESOURCE_EXHAUSTED, expected: ErrorSeverity.CRITICAL },
        { code: ERROR_CODES.SPAWN_FAILED, expected: ErrorSeverity.HIGH },
        { code: ERROR_CODES.TASK_FAILED, expected: ErrorSeverity.HIGH },
        { code: ERROR_CODES.PM_NOT_FOUND, expected: ErrorSeverity.MEDIUM },
        { code: ERROR_CODES.VALIDATION_ERROR, expected: ErrorSeverity.MEDIUM },
        { code: ERROR_CODES.COLOR_ASSIGNMENT_FAILED, expected: ErrorSeverity.LOW }
      ];

      testCases.forEach(({ code, expected }) => {
        expect(getErrorSeverity(code)).toBe(expected);
      });
    });

    it('should identify recoverable errors', () => {
      const recoverableErrors = [
        ERROR_CODES.PROCESS_TIMEOUT,
        ERROR_CODES.RESOURCE_EXHAUSTED,
        ERROR_CODES.SYSTEM_ERROR
      ];

      const nonRecoverableErrors = [
        ERROR_CODES.SECURITY_VIOLATION,
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_CODES.PM_NOT_FOUND
      ];

      recoverableErrors.forEach(code => {
        const error = new TasklyError('Test', code);
        expect(isRecoverableError(error)).toBe(true);
      });

      nonRecoverableErrors.forEach(code => {
        const error = new TasklyError('Test', code);
        expect(isRecoverableError(error)).toBe(false);
      });
    });

    it('should provide user-friendly messages', () => {
      const testCases = [
        {
          code: ERROR_CODES.PM_NOT_FOUND,
          context: { packageManager: 'yarn' },
          expectedContains: 'Package manager not found'
        },
        {
          code: ERROR_CODES.SPAWN_FAILED,
          context: { command: 'test-command' },
          expectedContains: 'Failed to run command "test-command"'
        },
        {
          code: ERROR_CODES.PERMISSION_DENIED,
          context: {},
          expectedContains: 'Permission denied'
        },
        {
          code: ERROR_CODES.PROCESS_TIMEOUT,
          context: {},
          expectedContains: 'Command timed out'
        },
        {
          code: ERROR_CODES.VALIDATION_ERROR,
          context: {},
          expectedContains: 'Invalid configuration'
        },
        {
          code: ERROR_CODES.CONFIG_ERROR,
          context: {},
          expectedContains: 'Configuration error'
        }
      ];

      testCases.forEach(({ code, context, expectedContains }) => {
        const error = new TasklyError('Original message', code, context);
        const friendlyMessage = getUserFriendlyMessage(error);
        expect(friendlyMessage).toContain(expectedContains);
      });
    });

    it('should fall back to original message for unknown error codes', () => {
      const error = new TasklyError('Original message', 'UNKNOWN_CODE' as any);
      const friendlyMessage = getUserFriendlyMessage(error);
      expect(friendlyMessage).toBe('Original message');
    });
  });

  describe('Error Context and Metadata', () => {
    it('should handle complex error context', () => {
      const context = {
        taskId: 'complex-task',
        command: 'complex command with args',
        cwd: '/complex/path',
        packageManager: 'pnpm',
        pid: 12345,
        exitCode: 2,
        timestamp: Date.now(),
        metadata: {
          customField: 'custom value',
          nestedObject: {
            key: 'value'
          },
          arrayField: [1, 2, 3]
        },
        retryAttempt: 1,
        maxRetries: 5
      };

      const error = new TasklyError('Complex error', ERROR_CODES.TASK_FAILED, context);
      
      expect(error.context).toEqual(context);
      expect(error.timestamp).toBe(context.timestamp);
      
      const json = error.toJSON();
      expect(json.context).toEqual(context);
    });

    it('should handle missing context gracefully', () => {
      const error = new TasklyError('Simple error', ERROR_CODES.SYSTEM_ERROR);
      
      expect(error.context).toEqual({});
      expect(error.timestamp).toBeTypeOf('number');
      
      const detailedMessage = error.getDetailedMessage();
      expect(detailedMessage).toBe('Simple error');
    });

    it('should preserve original error stack trace', () => {
      const originalError = new Error('Original error');
      const originalStack = originalError.stack;
      
      const error = new TasklyError(
        'Wrapped error',
        ERROR_CODES.SYSTEM_ERROR,
        {},
        originalError
      );
      
      expect(error.originalError).toBe(originalError);
      expect(error.context.originalStack).toBe(originalStack);
    });
  });
});