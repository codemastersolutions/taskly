import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskRunner } from '../../core/task-runner.js';
import { TaskConfig, TasklyError } from '../../types/index.js';

describe('TaskRunner Integration Tests', () => {
  let taskRunner: TaskRunner;

  beforeEach(() => {
    taskRunner = new TaskRunner();
  });

  afterEach(() => {
    if (taskRunner) {
      taskRunner.cleanup();
    }
  });

  describe('Basic Task Execution', () => {
    it('should create TaskRunner instance', () => {
      expect(taskRunner).toBeDefined();
      expect(taskRunner).toBeInstanceOf(TaskRunner);
    });

    it('should validate task configuration', async () => {
      const invalidTasks: TaskConfig[] = [
        { command: '', identifier: 'empty-command' },
      ];

      await expect(taskRunner.execute(invalidTasks)).rejects.toThrow(
        TasklyError
      );
    });

    it('should handle duplicate task identifiers', async () => {
      const tasks: TaskConfig[] = [
        { command: 'echo "task1"', identifier: 'duplicate' },
        { command: 'echo "task2"', identifier: 'duplicate' },
      ];

      await expect(taskRunner.execute(tasks)).rejects.toThrow(TasklyError);
    });

    it('should get execution status', () => {
      const status = taskRunner.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('totalTasks');
      expect(status).toHaveProperty('runningTasks');
      expect(status).toHaveProperty('completedTasks');
      expect(status).toHaveProperty('failedTasks');
      expect(status).toHaveProperty('pendingTasks');

      expect(status.isRunning).toBe(false);
      expect(status.totalTasks).toBe(0);
    });

    it('should generate error report', () => {
      const errorReport = taskRunner.generateErrorReport();

      expect(errorReport).toHaveProperty('hasErrors');
      expect(errorReport).toHaveProperty('summary');
      expect(errorReport).toHaveProperty('failedTasks');
      expect(errorReport).toHaveProperty('systemErrors');

      expect(errorReport.hasErrors).toBe(false);
      expect(errorReport.summary.totalTasks).toBe(0);
    });
  });

  describe('Advanced Task Management', () => {
    it('should create TaskRunner with advanced options', () => {
      const advancedTaskRunner = new TaskRunner({
        maxConcurrency: 2,
        killOthersOnFail: true,
        retryFailedTasks: true,
        maxRetries: 3,
        continueOnError: false,
      });

      expect(advancedTaskRunner).toBeDefined();
      expect(advancedTaskRunner.getStatus().totalTasks).toBe(0);
    });

    it('should get execution statistics', () => {
      const stats = taskRunner.getExecutionStats();

      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('failedTasks');
      expect(stats).toHaveProperty('killedTasks');
      expect(stats).toHaveProperty('runningTasks');
      expect(stats).toHaveProperty('pendingTasks');
      expect(stats).toHaveProperty('retriedTasks');
      expect(stats).toHaveProperty('averageRetries');
      expect(stats).toHaveProperty('executionTime');

      expect(stats.totalTasks).toBe(0);
      expect(stats.executionTime).toBe(0);
    });
  });

  describe('Error Handling and Cleanup', () => {
    it('should handle empty task array', async () => {
      const tasks: TaskConfig[] = [];

      await expect(taskRunner.execute(tasks)).rejects.toThrow(TasklyError);
    });

    it('should handle null task configuration', async () => {
      const tasks: any[] = [null];

      await expect(taskRunner.execute(tasks)).rejects.toThrow(TasklyError);
    });

    it('should stop execution gracefully', () => {
      // Test that stop() can be called even when not running
      expect(() => taskRunner.stop()).not.toThrow();
    });

    it('should cleanup resources', () => {
      expect(() => taskRunner.cleanup()).not.toThrow();
    });
  });

  describe('Event System', () => {
    it('should be an EventEmitter', () => {
      expect(taskRunner.on).toBeDefined();
      expect(taskRunner.emit).toBeDefined();
      expect(taskRunner.removeAllListeners).toBeDefined();
    });

    it('should handle event listeners', () => {
      const mockListener = vi.fn();

      taskRunner.on('test-event', mockListener);
      taskRunner.emit('test-event', { data: 'test' });

      expect(mockListener).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('Task State Management', () => {
    it('should track task states', () => {
      const allStates = taskRunner.getAllTaskStates();
      expect(Array.isArray(allStates)).toBe(true);
      expect(allStates).toHaveLength(0);
    });

    it('should get task state by identifier', () => {
      const taskState = taskRunner.getTaskState('non-existent');
      expect(taskState).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle task configuration validation during execution', async () => {
      // Test that validation happens during the execute call
      const tasks: TaskConfig[] = [
        { command: 'echo "valid"', identifier: 'valid-task' },
        { command: '', identifier: 'invalid-task' },
      ];

      await expect(taskRunner.execute(tasks)).rejects.toThrow(TasklyError);
    });

    it('should handle concurrent execution prevention', async () => {
      // Start one execution
      const firstExecution = taskRunner.execute([
        { command: 'echo "first"', identifier: 'first-task' },
      ]);

      // Try to start another execution while first is running
      await expect(
        taskRunner.execute([
          { command: 'echo "second"', identifier: 'second-task' },
        ])
      ).rejects.toThrow(TasklyError);

      // Wait for first execution to complete
      await firstExecution;
    });

    it('should generate task identifiers when not provided', async () => {
      const tasks: TaskConfig[] = [
        { command: 'echo "test1"' },
        { command: 'echo "test2"' },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(2);
      expect(results[0].identifier).toBeDefined();
      expect(results[1].identifier).toBeDefined();
      expect(results[0].identifier).not.toBe(results[1].identifier);
    });
  });
});
