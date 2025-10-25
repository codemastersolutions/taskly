/**
 * Taskly - Zero-dependency TypeScript library for parallel command execution
 *
 * @example
 * ```typescript
 * import { TaskRunner, TaskConfig } from 'taskly';
 *
 * const tasks: TaskConfig[] = [
 *   { command: 'npm run build', identifier: 'build' },
 *   { command: 'npm run test', identifier: 'test' }
 * ];
 *
 * const runner = new TaskRunner({ tasks });
 * const results = await runner.execute(tasks);
 * ```
 */

// Initialize global error handling
import { initializeGlobalErrorHandling } from './errors/global-handler.js';

// Initialize with default options - can be overridden by applications
initializeGlobalErrorHandling({
  enableConsoleLogging: true,
  enableFileLogging: false,
  exitOnCriticalError: false, // Let applications handle critical errors
  enableRecovery: true,
});

// Export all types
export * from './types/index.js';

// Export error handling utilities
export {
  GlobalErrorHandler,
  initializeGlobalErrorHandling,
  handleGlobalError,
  addGlobalShutdownCallback,
  gracefulShutdown,
  LogLevel,
} from './errors/global-handler.js';

// Export core classes
export { TaskRunner } from './core/task-runner.js';
export { ProcessManager } from './core/process-manager.js';
export { ColorManager } from './core/color-manager.js';
export { PackageManagerDetector } from './core/package-manager.js';

// Export utilities (specific exports to avoid conflicts)
export {
  validateCommand,
  validatePackageManager,
  validateColor,
  validateTaskConfig,
  validateTasklyOptions,
  sanitizeCommand,
  createValidationError,
} from './utils/validation.js';

export {
  detectPackageManager,
  loadConfigFile,
  fileExists,
  directoryExists,
} from './utils/file-system.js';

export {
  formatOutputLine,
  stripAnsi,
  getTerminalWidth,
  clearLine,
  cursorUp,
} from './utils/terminal.js';

// Re-export commonly used types for convenience
export type {
  TaskConfig,
  TaskResult,
  TasklyOptions,
  PackageManager,
  Color,
} from './types/index.js';

/**
 * Default export - TaskRunner for convenience
 */
export { TaskRunner as default } from './core/task-runner.js';

/**
 * Convenience function to create and execute tasks
 *
 * @param tasks Array of task configurations
 * @param options Optional execution options
 * @returns Promise resolving to task results
 *
 * @example
 * ```typescript
 * import { runTasks } from 'taskly';
 *
 * const results = await runTasks([
 *   { command: 'npm run build' },
 *   { command: 'npm run test' }
 * ]);
 * ```
 */
export async function runTasks(
  tasks: import('./types/index.js').TaskConfig[],
  options?: Partial<import('./types/index.js').TasklyOptions>
): Promise<import('./types/index.js').TaskResult[]> {
  const { TaskRunner } = await import('./core/task-runner.js');

  const runner = new TaskRunner({
    tasks,
    ...options,
  });

  return runner.execute(tasks);
}
