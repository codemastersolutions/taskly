import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process module before importing ProcessManager
vi.mock('child_process', () => {
  const createMockChildProcess = () => {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();

    // Add stream methods
    stdout.setEncoding = vi.fn();
    stderr.setEncoding = vi.fn();

    return {
      stdout,
      stderr,
      on: vi.fn(),
      kill: vi.fn(),
      pid: 12345,
    };
  };

  return {
    spawn: vi.fn(() => createMockChildProcess()),
  };
});

import { ProcessManager, ProcessOptions } from '../../core/process-manager.js';
import { TaskConfig, TasklyError, ERROR_CODES } from '../../types/index.js';
import { spawn } from 'child_process';

const mockSpawn = vi.mocked(spawn);

// Get the mock child process instance
const getMockChildProcess = () => {
  const mockCall = mockSpawn.mock.results[mockSpawn.mock.results.length - 1];
  return mockCall?.value;
};

describe('ProcessManager', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    processManager = new ProcessManager();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await processManager.cleanup();
  });

  describe('spawn', () => {
    it('should spawn a process successfully', async () => {
      const task: TaskConfig = {
        command: 'echo "hello world"',
        identifier: 'test-task',
      };

      const processInfo = await processManager.spawn(task);

      expect(processInfo).toEqual({
        identifier: 'test-task',
        command: 'echo "hello world"',
        startTime: expect.any(Number),
        status: 'running',
        pid: 12345,
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'echo',
        ['"hello world"'],
        expect.objectContaining({
          cwd: expect.any(String),
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
          env: expect.any(Object),
        })
      );
    });

    it('should generate identifier if not provided', async () => {
      const task: TaskConfig = {
        command: 'npm test',
      };

      const processInfo = await processManager.spawn(task);

      expect(processInfo.identifier).toMatch(/^npm-[a-z0-9]+$/);
    });

    it('should validate dangerous commands', async () => {
      const dangerousTask: TaskConfig = {
        command: 'rm -rf /',
        identifier: 'dangerous',
      };

      await expect(processManager.spawn(dangerousTask)).rejects.toThrow(
        TasklyError
      );
      await expect(processManager.spawn(dangerousTask)).rejects.toThrow(
        'potentially dangerous pattern'
      );
    });

    it('should apply process options', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const options: ProcessOptions = {
        timeout: 5000,
        maxMemory: 256,
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' },
      };

      await processManager.spawn(task, options);

      expect(mockSpawn).toHaveBeenCalledWith(
        'echo',
        ['test'],
        expect.objectContaining({
          cwd: '/custom/path',
          env: expect.objectContaining({
            CUSTOM_VAR: 'value',
          }),
        })
      );
    });

    it('should handle spawn errors', async () => {
      mockSpawn.mockImplementationOnce(() => {
        throw new Error('Spawn failed');
      });

      const task: TaskConfig = {
        command: 'invalid-command',
        identifier: 'test',
      };

      await expect(processManager.spawn(task)).rejects.toThrow(TasklyError);
      await expect(processManager.spawn(task)).rejects.toThrow(
        'Failed to spawn process'
      );
    });
  });

  describe('terminate', () => {
    it('should terminate a running process', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();
      mockChild.kill.mockReturnValue(true);

      const result = await processManager.terminate('test');

      expect(result).toBe(true);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should return false for non-existent process', async () => {
      const result = await processManager.terminate('non-existent');
      expect(result).toBe(false);
    });

    it('should use custom signal', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();
      mockChild.kill.mockReturnValue(true);

      await processManager.terminate('test', 'SIGKILL');

      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('output handling', () => {
    it('should capture stdout output', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const outputSpy = vi.fn();
      processManager.on('process:output', outputSpy);

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();

      // Simulate stdout data
      mockChild.stdout.emit('data', 'Hello\nWorld\n');

      expect(outputSpy).toHaveBeenCalledTimes(2);
      expect(outputSpy).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          identifier: 'test',
          content: 'Hello',
          type: 'stdout',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should capture stderr output', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const outputSpy = vi.fn();
      processManager.on('process:output', outputSpy);

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();

      // Simulate stderr data
      mockChild.stderr.emit('data', 'Error message\n');

      expect(outputSpy).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          identifier: 'test',
          content: 'Error message',
          type: 'stderr',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle line buffering correctly', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const outputSpy = vi.fn();
      processManager.on('process:output', outputSpy);

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();

      // Simulate partial line data
      mockChild.stdout.emit('data', 'Partial ');
      mockChild.stdout.emit('data', 'line\nComplete line\n');

      expect(outputSpy).toHaveBeenCalledTimes(2);
      expect(outputSpy).toHaveBeenNthCalledWith(
        1,
        'test',
        expect.objectContaining({
          content: 'Partial line',
        })
      );
      expect(outputSpy).toHaveBeenNthCalledWith(
        2,
        'test',
        expect.objectContaining({
          content: 'Complete line',
        })
      );
    });

    it('should format output lines with prefix', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      await processManager.spawn(task);

      const output = processManager.getFormattedOutput('test');
      expect(output).toEqual([]);

      // Add some output
      const outputBuffer = (processManager as any).outputBuffers.get('test');
      outputBuffer.push('Hello World');

      const formatted = processManager.getFormattedOutput('test');
      expect(formatted[0]).toMatch(
        /^\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[test\] Hello World$/
      );
    });
  });

  describe('process lifecycle', () => {
    it('should handle process completion', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const completeSpy = vi.fn();
      processManager.on('process:complete', completeSpy);

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();

      // Simulate process completion
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0, null), 10);
        }
      });

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(completeSpy).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          identifier: 'test',
          exitCode: 0,
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );
    });

    it('should handle process errors', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const errorSpy = vi.fn();
      processManager.on('process:error', errorSpy);

      await processManager.spawn(task);
      const mockChild = getMockChildProcess();

      // Simulate process error
      const testError = new Error('Process failed');
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(testError), 10);
        }
      });

      // Wait for error
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(errorSpy).toHaveBeenCalledWith('test', expect.any(TasklyError));
    });
  });

  describe('resource management', () => {
    it('should set up timeout control', async () => {
      const task: TaskConfig = {
        command: 'sleep 10',
        identifier: 'test',
      };

      const options: ProcessOptions = {
        timeout: 100,
        killOnTimeout: true,
      };

      const timeoutSpy = vi.fn();
      processManager.on('process:timeout', timeoutSpy);

      await processManager.spawn(task, options);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(timeoutSpy).toHaveBeenCalledWith('test', 100);
    });

    it('should monitor resource usage', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      const options: ProcessOptions = {
        maxMemory: 256,
        maxCpu: 80,
      };

      const resourceSpy = vi.fn();
      processManager.on('process:resource-check', resourceSpy);

      await processManager.spawn(task, options);

      // Wait for resource check
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(resourceSpy).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          pid: 12345,
          limits: {
            maxMemory: 256,
            maxCpu: 80,
          },
        })
      );
    });
  });

  describe('utility methods', () => {
    it('should check if process is running', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      expect(processManager.isRunning('test')).toBe(false);

      await processManager.spawn(task);
      expect(processManager.isRunning('test')).toBe(true);
    });

    it('should get process info', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      expect(processManager.getProcessInfo('test')).toBeUndefined();

      const processInfo = await processManager.spawn(task);
      expect(processManager.getProcessInfo('test')).toEqual(processInfo);
    });

    it('should get all process info', async () => {
      const task1: TaskConfig = { command: 'echo 1', identifier: 'test1' };
      const task2: TaskConfig = { command: 'echo 2', identifier: 'test2' };

      await processManager.spawn(task1);
      await processManager.spawn(task2);

      const allInfo = processManager.getAllProcessInfo();
      expect(allInfo).toHaveLength(2);
      expect(allInfo.map(info => info.identifier)).toEqual(['test1', 'test2']);
    });

    it('should get captured output', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      await processManager.spawn(task);

      expect(processManager.getOutput('test')).toEqual([]);

      // Simulate adding output
      const outputBuffer = (processManager as any).outputBuffers.get('test');
      outputBuffer.push('Hello', 'World');

      expect(processManager.getOutput('test')).toEqual(['Hello', 'World']);
    });
  });

  describe('cleanup', () => {
    it('should terminate all processes on cleanup', async () => {
      const task1: TaskConfig = { command: 'echo 1', identifier: 'test1' };
      const task2: TaskConfig = { command: 'echo 2', identifier: 'test2' };

      await processManager.spawn(task1);
      await processManager.spawn(task2);

      // Mock kill for both processes
      const mockChild1 = getMockChildProcess();
      mockChild1.kill.mockReturnValue(true);

      expect(processManager.getAllProcessInfo()).toHaveLength(2);

      await processManager.cleanup();

      expect(processManager.getAllProcessInfo()).toHaveLength(0);
    });

    it('should clear all internal state on cleanup', async () => {
      const task: TaskConfig = {
        command: 'echo test',
        identifier: 'test',
      };

      await processManager.spawn(task);

      expect(processManager.getProcessInfo('test')).toBeDefined();
      expect(processManager.getOutput('test')).toBeDefined();

      await processManager.cleanup();

      expect(processManager.getProcessInfo('test')).toBeUndefined();
      expect(processManager.getOutput('test')).toEqual([]);
    });
  });
});
