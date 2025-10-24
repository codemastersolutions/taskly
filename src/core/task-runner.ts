import { EventEmitter } from 'events';
import {
  GlobalErrorHandler,
  handleGlobalError,
} from '../errors/global-handler.js';
import {
  ERROR_CODES,
  ErrorFactory,
  OutputLine,
  ProcessInfo,
  TaskConfig,
  TaskResult,
  TasklyError,
  TasklyOptions,
} from '../types/index.js';
import { ColorManager } from './color-manager.js';
import { PackageManagerDetector } from './package-manager.js';
import { ProcessManager } from './process-manager.js';

/**
 * Task execution state tracking
 */
interface TaskState {
  config: TaskConfig;
  identifier: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'killed';
  processInfo?: ProcessInfo;
  result?: TaskResult;
  startTime?: number;
  endTime?: number;
}

/**
 * Task dependency configuration
 */
interface TaskDependency {
  identifier: string;
  dependsOn: string[];
  waitForCompletion?: boolean;
}

/**
 * Advanced task management options
 */
interface AdvancedTaskOptions {
  /** Kill all other tasks when one fails */
  killOthersOnFail?: boolean;
  /** Maximum number of concurrent tasks */
  maxConcurrency?: number;
  /** Task dependencies configuration */
  dependencies?: TaskDependency[];
  /** Retry failed tasks */
  retryFailedTasks?: boolean;
  /** Maximum number of retries per task */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Continue execution even if some tasks fail */
  continueOnError?: boolean;
  /** Timeout for individual tasks in milliseconds */
  taskTimeout?: number;
  /** Global execution timeout in milliseconds */
  globalTimeout?: number;
}

/**
 * TaskRunner orchestrates parallel task execution with lifecycle management
 */
export class TaskRunner extends EventEmitter {
  private processManager: ProcessManager;
  private colorManager: ColorManager;
  private tasks: Map<string, TaskState> = new Map();
  private runningTasks: Set<string> = new Set();
  private completedTasks: Set<string> = new Set();
  private failedTasks: Set<string> = new Set();
  private killedTasks: Set<string> = new Set();
  private isRunning = false;
  private shouldKillOthersOnFail = false;
  private maxConcurrency = Infinity;
  private currentConcurrency = 0;
  private taskQueue: TaskState[] = [];
  private dependencies: Map<string, string[]> = new Map();
  private dependents: Map<string, string[]> = new Map();
  private retryFailedTasks = false;
  private maxRetries = 3;
  private retryDelay = 1000;
  private continueOnError = false;
  private taskTimeout = 300000; // 5 minutes
  private globalTimeout = 1800000; // 30 minutes
  private retryCount: Map<string, number> = new Map();
  private globalTimeoutId?: NodeJS.Timeout;

  constructor(options?: Partial<TasklyOptions & AdvancedTaskOptions>) {
    super();

    this.processManager = new ProcessManager();
    this.colorManager = new ColorManager(
      options?.tasks
        ?.map(t => t.color)
        .filter((color): color is string => Boolean(color))
    );
    this.shouldKillOthersOnFail = options?.killOthersOnFail || false;
    this.maxConcurrency = options?.maxConcurrency || Infinity;
    this.retryFailedTasks = options?.retryFailedTasks || false;
    this.maxRetries = options?.maxRetries || 3;
    this.retryDelay = options?.retryDelay || 1000;
    this.continueOnError = options?.continueOnError || false;
    this.taskTimeout = options?.taskTimeout || 300000;
    this.globalTimeout = options?.globalTimeout || 1800000;

    // Set up dependencies if provided
    if (options?.dependencies) {
      this.setupDependencies(options.dependencies);
    }

    this.setupProcessManagerListeners();
    this.setupGlobalErrorHandling();
  }

  /**
   * Execute multiple tasks in parallel with advanced management features
   */
  async execute(tasks: TaskConfig[]): Promise<TaskResult[]> {
    if (this.isRunning) {
      throw new TasklyError(
        'TaskRunner is already executing tasks',
        ERROR_CODES.SYSTEM_ERROR
      );
    }

    try {
      this.isRunning = true;
      this.reset();

      // Set up global timeout
      this.setupGlobalTimeout();

      // Validate and prepare tasks
      const taskStates = await this.prepareTasks(tasks);

      // Initialize task queue with dependency-aware ordering
      this.taskQueue = this.orderTasksByDependencies(taskStates);

      // Emit start event
      this.emit('execution:start', {
        totalTasks: taskStates.length,
        maxConcurrency: this.maxConcurrency,
        killOthersOnFail: this.shouldKillOthersOnFail,
        retryFailedTasks: this.retryFailedTasks,
        maxRetries: this.maxRetries,
        continueOnError: this.continueOnError,
        hasDependencies: this.dependencies.size > 0,
      });

      // Start initial batch of tasks
      await this.processTaskQueue();

      // Wait for all tasks to complete
      const results = await this.waitForCompletion();

      // Clear global timeout
      if (this.globalTimeoutId) {
        clearTimeout(this.globalTimeoutId);
      }

      // Emit completion event
      this.emit('execution:complete', {
        results,
        totalTasks: taskStates.length,
        successful: results.filter(r => r.exitCode === 0).length,
        failed: results.filter(r => r.exitCode !== 0).length,
        killed: this.killedTasks.size,
        retried: Array.from(this.retryCount.entries()).filter(
          ([, count]) => count > 0
        ).length,
      });

      return results;
    } catch (error) {
      // Clear global timeout on error
      if (this.globalTimeoutId) {
        clearTimeout(this.globalTimeoutId);
      }

      const tasklyError =
        error instanceof TasklyError
          ? error
          : ErrorFactory.createError(
              `Task execution failed: ${error instanceof Error ? error.message : String(error)}`,
              ERROR_CODES.TASK_FAILED,
              {
                timestamp: Date.now(),
                metadata: {
                  totalTasks: this.tasks.size,
                  runningTasks: this.runningTasks.size,
                  completedTasks: this.completedTasks.size,
                  failedTasks: this.failedTasks.size,
                },
              },
              error instanceof Error ? error : undefined
            );

      // Handle error globally
      handleGlobalError(tasklyError, {
        context: 'task-execution',
        executionStats: this.getExecutionStats(),
      });

      this.emit('execution:error', tasklyError);
      throw tasklyError;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop all running tasks
   */
  async stop(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.emit('execution:stopping', { signal });

    // Mark all pending tasks as killed
    for (const [, taskState] of this.tasks) {
      if (taskState.status === 'pending') {
        taskState.status = 'killed';
        taskState.endTime = Date.now();
      }
    }

    // Clear task queue
    this.taskQueue = [];

    // Terminate all running processes
    await this.processManager.terminateAll(signal);

    this.isRunning = false;
    this.emit('execution:stopped', { signal });
  }

  /**
   * Get current execution status
   */
  getStatus(): {
    isRunning: boolean;
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingTasks: number;
  } {
    return {
      isRunning: this.isRunning,
      totalTasks: this.tasks.size,
      runningTasks: this.runningTasks.size,
      completedTasks: this.completedTasks.size,
      failedTasks: this.failedTasks.size,
      pendingTasks: this.taskQueue.length,
    };
  }

  /**
   * Get task state by identifier
   */
  getTaskState(identifier: string): TaskState | undefined {
    return this.tasks.get(identifier);
  }

  /**
   * Get all task states
   */
  getAllTaskStates(): TaskState[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Prepare and validate tasks for execution
   */
  private async prepareTasks(tasks: TaskConfig[]): Promise<TaskState[]> {
    if (!tasks || tasks.length === 0) {
      throw new TasklyError(
        'No tasks provided for execution',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const taskStates: TaskState[] = [];
    const identifiers = new Set<string>();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // Validate task configuration
      this.validateTaskConfig(task, i);

      // Generate or use provided identifier
      const identifier =
        task.identifier || this.generateTaskIdentifier(task, i);

      // Ensure unique identifiers
      if (identifiers.has(identifier)) {
        throw new TasklyError(
          `Duplicate task identifier: ${identifier}`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      identifiers.add(identifier);

      // Validate package manager if specified
      if (task.packageManager) {
        try {
          PackageManagerDetector.validate(task.packageManager);
        } catch (error) {
          throw new TasklyError(
            `Invalid package manager for task "${identifier}": ${error instanceof Error ? error.message : String(error)}`,
            ERROR_CODES.PM_NOT_FOUND,
            { taskId: identifier },
            error instanceof Error ? error : undefined
          );
        }
      }

      // Assign color
      this.colorManager.assignColor(identifier, task.color);

      // Create task state
      const taskState: TaskState = {
        config: { ...task, identifier },
        identifier,
        status: 'pending',
      };

      taskStates.push(taskState);
      this.tasks.set(identifier, taskState);
    }

    return taskStates;
  }

  /**
   * Validate individual task configuration
   */
  private validateTaskConfig(task: TaskConfig, index: number): void {
    if (!task) {
      throw new TasklyError(
        `Task at index ${index} is null or undefined`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (
      !task.command ||
      typeof task.command !== 'string' ||
      task.command.trim() === ''
    ) {
      throw new TasklyError(
        `Task at index ${index} has invalid command`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (
      task.identifier &&
      (typeof task.identifier !== 'string' || task.identifier.trim() === '')
    ) {
      throw new TasklyError(
        `Task at index ${index} has invalid identifier`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (task.cwd && typeof task.cwd !== 'string') {
      throw new TasklyError(
        `Task at index ${index} has invalid working directory`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  /**
   * Generate a unique identifier for a task
   */
  private generateTaskIdentifier(task: TaskConfig, index: number): string {
    // Extract command name (first word)
    const commandName = task.command.trim().split(/\s+/)[0];
    const baseName = commandName.replace(/[^a-zA-Z0-9]/g, '');

    // Create identifier with index
    return `${baseName || 'task'}-${index}`;
  }

  /**
   * Process the task queue respecting concurrency limits and dependencies
   */
  private async processTaskQueue(): Promise<void> {
    if (!this.shouldContinueExecution()) {
      return;
    }

    // Get tasks that are ready to start (dependencies satisfied)
    const readyTasks = this.getReadyTasks();

    // Start tasks up to concurrency limit
    const tasksToStart = readyTasks.slice(
      0,
      this.maxConcurrency - this.currentConcurrency
    );

    for (const taskState of tasksToStart) {
      // Remove from queue
      const index = this.taskQueue.indexOf(taskState);
      if (index >= 0) {
        this.taskQueue.splice(index, 1);
      }

      await this.startTask(taskState);
    }
  }

  /**
   * Start execution of a single task
   */
  private async startTask(taskState: TaskState): Promise<void> {
    try {
      taskState.status = 'running';
      taskState.startTime = Date.now();

      this.runningTasks.add(taskState.identifier);
      this.currentConcurrency++;

      // Resolve package manager and command with validation
      const { resolvedCommand, packageManagerInfo } =
        await this.resolveCommandWithValidation(taskState.config);

      // Emit task start event with detailed information
      this.emit('task:start', {
        identifier: taskState.identifier,
        command: taskState.config.command,
        resolvedCommand,
        packageManager: taskState.config.packageManager,
        packageManagerInfo,
        cwd: taskState.config.cwd,
        color: this.colorManager.getAssignment(taskState.identifier)?.color,
        dependencies: this.dependencies.get(taskState.identifier) || [],
        retryAttempt: this.retryCount.get(taskState.identifier) || 0,
      });

      // Start the process
      const processInfo = await this.processManager.spawn(
        {
          ...taskState.config,
          command: resolvedCommand,
        },
        {
          cwd: taskState.config.cwd,
          timeout: this.taskTimeout,
          env: this.buildTaskEnvironment(taskState.config),
        }
      );

      taskState.processInfo = processInfo;
    } catch (error) {
      await this.handleTaskError(taskState, error);
    }
  }

  /**
   * Resolve command with package manager validation and detailed info
   */
  private async resolveCommandWithValidation(config: TaskConfig): Promise<{
    resolvedCommand: string;
    packageManagerInfo?: { name: string; version: string; source: string };
  }> {
    if (!config.packageManager) {
      return { resolvedCommand: config.command };
    }

    try {
      // Validate and resolve package manager
      const resolved = PackageManagerDetector.resolve(
        config.packageManager,
        config.cwd || process.cwd()
      );

      // Get package manager info
      const pmInfo = PackageManagerDetector.getPackageManagerInfo(resolved.pm);
      const packageManagerInfo = pmInfo
        ? {
            name: pmInfo.name,
            version: pmInfo.version,
            source: resolved.source,
          }
        : undefined;

      // Resolve command based on package manager
      const command = config.command.trim();
      let resolvedCommand: string;

      // Check if command should be prefixed with package manager
      if (this.shouldUsePMPrefix(command)) {
        resolvedCommand = `${resolved.command} ${command}`;
      } else {
        resolvedCommand = command;
      }

      return { resolvedCommand, packageManagerInfo };
    } catch (error) {
      // Log warning but continue with original command
      this.emit('task:pm-resolution-warning', {
        identifier: config.identifier,
        packageManager: config.packageManager,
        error: error instanceof Error ? error.message : String(error),
        fallbackCommand: config.command,
      });

      return { resolvedCommand: config.command };
    }
  }

  /**
   * Check if command should be prefixed with package manager
   */
  private shouldUsePMPrefix(command: string): boolean {
    const pmCommands = [
      'run ',
      'exec ',
      'install',
      'add ',
      'remove ',
      'uninstall',
      'update ',
      'upgrade ',
      'audit',
      'test',
      'start',
      'build',
      'dev',
      'serve',
      'lint',
      'format',
    ];

    return pmCommands.some(pmCmd => command.startsWith(pmCmd));
  }

  /**
   * Build environment variables for task execution
   */
  private buildTaskEnvironment(config: TaskConfig): Record<string, string> {
    const env: Record<string, string> = {
      // Inherit process environment
      ...process.env,

      // Add Taskly-specific environment variables
      TASKLY_TASK_ID: config.identifier || '',
      TASKLY_TASK_COMMAND: config.command,
      TASKLY_TASK_CWD: config.cwd || process.cwd(),
      TASKLY_PACKAGE_MANAGER: config.packageManager || 'npm',

      // Security: Remove potentially dangerous environment variables
      // These will be deleted below
    };

    // Security: Remove potentially dangerous environment variables
    delete env.NODE_OPTIONS;
    delete env.LD_PRELOAD;

    // Add color information if available
    const colorAssignment = this.colorManager.getAssignment(
      config.identifier || ''
    );
    if (colorAssignment) {
      env.TASKLY_TASK_COLOR = colorAssignment.color;
      env.TASKLY_TASK_ANSI_CODE = colorAssignment.ansiCode;
    }

    return env;
  }

  /**
   * Handle task completion
   */
  private async handleTaskComplete(
    identifier: string,
    result: TaskResult
  ): Promise<void> {
    const taskState = this.tasks.get(identifier);
    if (!taskState) {
      return;
    }

    taskState.result = result;
    taskState.endTime = Date.now();

    this.runningTasks.delete(identifier);
    this.currentConcurrency--;

    if (result.exitCode === 0) {
      taskState.status = 'completed';
      this.completedTasks.add(identifier);

      this.emit('task:complete', {
        identifier,
        result,
        duration: result.duration,
        retries: this.retryCount.get(identifier) || 0,
      });

      // Notify dependent tasks that this task is complete
      const dependents = this.dependents.get(identifier) || [];
      if (dependents.length > 0) {
        this.emit('task:dependencies-satisfied', {
          identifier,
          dependents,
        });
      }
    } else {
      // Handle failure with retry logic
      await this.handleTaskFailure(taskState);
      return;
    }

    // Process next tasks in queue (including newly available dependent tasks)
    await this.processTaskQueue();
  }

  /**
   * Handle task error
   */
  private async handleTaskError(
    taskState: TaskState,
    error: unknown
  ): Promise<void> {
    this.runningTasks.delete(taskState.identifier);
    this.currentConcurrency--;

    const tasklyError =
      error instanceof TasklyError
        ? error
        : new TasklyError(
            `Task "${taskState.identifier}" failed: ${error instanceof Error ? error.message : String(error)}`,
            ERROR_CODES.TASK_FAILED,
            { taskId: taskState.identifier },
            error instanceof Error ? error : undefined
          );

    this.emit('task:error', {
      identifier: taskState.identifier,
      error: tasklyError,
      retries: this.retryCount.get(taskState.identifier) || 0,
    });

    // Handle failure with retry logic
    await this.handleTaskFailure(taskState, tasklyError);
  }

  /**
   * Kill all other running tasks (used for kill-others-on-fail)
   */
  private async killOtherTasks(excludeIdentifier: string): Promise<void> {
    const tasksToKill = Array.from(this.runningTasks).filter(
      id => id !== excludeIdentifier
    );

    if (tasksToKill.length === 0) {
      return;
    }

    this.emit('execution:killing-others', {
      trigger: excludeIdentifier,
      tasksToKill,
    });

    // Kill all other running tasks
    const killPromises = tasksToKill.map(async identifier => {
      const taskState = this.tasks.get(identifier);
      if (taskState) {
        taskState.status = 'killed';
        taskState.endTime = Date.now();
        this.runningTasks.delete(identifier);
        this.currentConcurrency--;
      }

      await this.processManager.terminate(identifier, 'SIGKILL');
    });

    // Clear task queue
    this.taskQueue.forEach(taskState => {
      taskState.status = 'killed';
      taskState.endTime = Date.now();
    });
    this.taskQueue = [];

    await Promise.all(killPromises);
  }

  /**
   * Wait for all tasks to complete with enhanced result aggregation
   */
  private async waitForCompletion(): Promise<TaskResult[]> {
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const totalTasks = this.tasks.size;
        const finishedTasks =
          this.completedTasks.size +
          this.failedTasks.size +
          this.killedTasks.size;
        const pendingTasks = this.taskQueue.filter(
          t => t.status === 'pending'
        ).length;

        // Check if all tasks are finished or if we should stop due to failures
        const shouldComplete =
          (finishedTasks >= totalTasks &&
            this.runningTasks.size === 0 &&
            pendingTasks === 0) ||
          (!this.shouldContinueExecution() && this.runningTasks.size === 0);

        if (shouldComplete) {
          // Collect and enhance results
          const results = this.aggregateResults();

          // Emit detailed completion statistics
          this.emit('execution:statistics', {
            totalTasks,
            completedTasks: this.completedTasks.size,
            failedTasks: this.failedTasks.size,
            killedTasks: this.killedTasks.size,
            retriedTasks: Array.from(this.retryCount.values()).filter(
              count => count > 0
            ).length,
            totalRetries: Array.from(this.retryCount.values()).reduce(
              (sum, count) => sum + count,
              0
            ),
            executionTime: this.calculateTotalExecutionTime(),
            averageTaskDuration: this.calculateAverageTaskDuration(results),
            longestTask: this.findLongestTask(results),
            shortestTask: this.findShortestTask(results),
          });

          resolve(results);
        }
      };

      // Set up completion checking with more frequent checks for responsiveness
      const completionTimer = setInterval(checkCompletion, 50);

      // The global timeout is handled separately in setupGlobalTimeout
      // This is just a safety net
      const safetyTimeout = setTimeout(() => {
        clearInterval(completionTimer);
        reject(
          new TasklyError(
            'Task execution safety timeout - this should not happen if global timeout is working',
            ERROR_CODES.SYSTEM_ERROR
          )
        );
      }, this.globalTimeout + 60000); // 1 minute after global timeout

      // Clean up on completion
      const cleanup = () => {
        clearInterval(completionTimer);
        clearTimeout(safetyTimeout);
      };

      // Check immediately
      checkCompletion();

      // Clean up when done
      this.once('execution:complete', cleanup);
      this.once('execution:error', cleanup);
    });
  }

  /**
   * Aggregate results from all tasks with enhanced information
   */
  private aggregateResults(): TaskResult[] {
    const results: TaskResult[] = [];

    for (const taskState of this.tasks.values()) {
      let result: TaskResult;

      if (taskState.result) {
        // Enhance existing result with additional information
        result = {
          ...taskState.result,
          // Add retry information to the result
          retries: this.retryCount.get(taskState.identifier) || 0,
        } as TaskResult & { retries: number };
      } else {
        // Create a result for tasks that didn't complete normally
        result = {
          identifier: taskState.identifier,
          exitCode: this.getExitCodeForStatus(taskState.status),
          output: this.processManager.getOutput(taskState.identifier) || [],
          duration: this.calculateTaskDuration(taskState),
          startTime: taskState.startTime || Date.now(),
          endTime: taskState.endTime || Date.now(),
          error: this.getErrorMessageForStatus(taskState.status),
          retries: this.retryCount.get(taskState.identifier) || 0,
        } as TaskResult & { retries: number };
      }

      results.push(result);
    }

    // Sort results by start time for consistent ordering
    return results.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get appropriate exit code for task status
   */
  private getExitCodeForStatus(status: string): number {
    switch (status) {
      case 'completed':
        return 0;
      case 'killed':
        return 130; // SIGINT
      case 'failed':
        return 1;
      case 'pending':
        return 2; // Never started
      default:
        return 1;
    }
  }

  /**
   * Get appropriate error message for task status
   */
  private getErrorMessageForStatus(status: string): string | undefined {
    switch (status) {
      case 'completed':
        return undefined;
      case 'killed':
        return 'Task was killed';
      case 'failed':
        return 'Task failed to complete';
      case 'pending':
        return 'Task never started';
      default:
        return 'Unknown task status';
    }
  }

  /**
   * Calculate task duration safely
   */
  private calculateTaskDuration(taskState: TaskState): number {
    if (taskState.startTime && taskState.endTime) {
      return taskState.endTime - taskState.startTime;
    }
    if (taskState.startTime) {
      return Date.now() - taskState.startTime;
    }
    return 0;
  }

  /**
   * Calculate total execution time
   */
  private calculateTotalExecutionTime(): number {
    const startTimes = Array.from(this.tasks.values())
      .map(task => task.startTime)
      .filter(Boolean) as number[];

    const endTimes = Array.from(this.tasks.values())
      .map(task => task.endTime)
      .filter(Boolean) as number[];

    if (startTimes.length === 0) return 0;

    const earliestStart = Math.min(...startTimes);
    const latestEnd = endTimes.length > 0 ? Math.max(...endTimes) : Date.now();

    return latestEnd - earliestStart;
  }

  /**
   * Calculate average task duration
   */
  private calculateAverageTaskDuration(results: TaskResult[]): number {
    const durations = results.map(r => r.duration).filter(d => d > 0);
    return durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
  }

  /**
   * Find the longest running task
   */
  private findLongestTask(
    results: TaskResult[]
  ): { identifier: string; duration: number } | undefined {
    const longest = results.reduce(
      (max, result) => (result.duration > (max?.duration || 0) ? result : max),
      undefined as TaskResult | undefined
    );

    return longest
      ? { identifier: longest.identifier, duration: longest.duration }
      : undefined;
  }

  /**
   * Find the shortest running task
   */
  private findShortestTask(
    results: TaskResult[]
  ): { identifier: string; duration: number } | undefined {
    const completedResults = results.filter(
      r => r.exitCode === 0 && r.duration > 0
    );
    const shortest = completedResults.reduce(
      (min, result) =>
        result.duration < (min?.duration || Infinity) ? result : min,
      undefined as TaskResult | undefined
    );

    return shortest
      ? { identifier: shortest.identifier, duration: shortest.duration }
      : undefined;
  }

  /**
   * Set up process manager event listeners with enhanced error propagation
   */
  private setupProcessManagerListeners(): void {
    // Task completion handling
    this.processManager.on(
      'process:complete',
      (identifier: string, result: TaskResult) => {
        this.handleTaskComplete(identifier, result);
      }
    );

    // Task error handling
    this.processManager.on(
      'process:error',
      (identifier: string, error: TasklyError) => {
        const taskState = this.tasks.get(identifier);
        if (taskState) {
          this.handleTaskError(taskState, error);
        }
      }
    );

    // Real-time output handling with color formatting
    this.processManager.on(
      'process:output',
      (identifier: string, outputLine: OutputLine) => {
        // Format output with colors and emit
        const formattedLine = this.colorManager.formatOutputLine(
          identifier,
          outputLine.content,
          identifier
        );

        this.emit('task:output', {
          identifier,
          line: {
            ...outputLine,
            formatted: formattedLine,
          },
          taskInfo: {
            status: this.tasks.get(identifier)?.status,
            retries: this.retryCount.get(identifier) || 0,
          },
        });
      }
    );

    // Process timeout handling
    this.processManager.on(
      'process:timeout',
      (identifier: string, timeout: number) => {
        this.emit('task:timeout', {
          identifier,
          timeout,
          retries: this.retryCount.get(identifier) || 0,
        });
      }
    );

    // Process termination handling
    this.processManager.on(
      'process:terminate',
      (identifier: string, signal: NodeJS.Signals) => {
        const taskState = this.tasks.get(identifier);
        if (taskState && !this.killedTasks.has(identifier)) {
          taskState.status = 'killed';
          taskState.endTime = Date.now();
          this.killedTasks.add(identifier);

          this.emit('task:terminated', {
            identifier,
            signal,
            reason: 'external',
          });
        }
      }
    );

    // Resource monitoring events
    this.processManager.on(
      'process:resource-check',
      (identifier: string, resourceInfo: any) => {
        this.emit('task:resource-check', {
          identifier,
          ...resourceInfo,
        });
      }
    );

    // Process monitoring errors (non-fatal)
    this.processManager.on(
      'process:monitor-error',
      (identifier: string, error: unknown) => {
        this.emit('task:monitor-warning', {
          identifier,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );

    // Global process manager events
    this.processManager.on('cleanup-signal', (signal: string) => {
      this.emit('execution:cleanup-signal', { signal });
    });

    this.processManager.on('uncaught-exception', (error: Error) => {
      this.emit('execution:uncaught-exception', {
        error: error.message,
        stack: error.stack,
      });
    });

    this.processManager.on('unhandled-rejection', (reason: unknown) => {
      this.emit('execution:unhandled-rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });
  }

  /**
   * Reset internal state for new execution
   */
  private reset(): void {
    this.tasks.clear();
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.killedTasks.clear();
    this.taskQueue = [];
    this.currentConcurrency = 0;
    this.retryCount.clear();
    this.colorManager.reset();

    if (this.globalTimeoutId) {
      clearTimeout(this.globalTimeoutId);
      this.globalTimeoutId = undefined;
    }
  }

  /**
   * Set up task dependencies
   */
  private setupDependencies(dependencies: TaskDependency[]): void {
    this.dependencies.clear();
    this.dependents.clear();

    for (const dep of dependencies) {
      this.dependencies.set(dep.identifier, dep.dependsOn);

      // Build reverse dependency map
      for (const dependency of dep.dependsOn) {
        if (!this.dependents.has(dependency)) {
          this.dependents.set(dependency, []);
        }
        this.dependents.get(dependency)!.push(dep.identifier);
      }
    }
  }

  /**
   * Order tasks by dependencies using topological sort
   */
  private orderTasksByDependencies(taskStates: TaskState[]): TaskState[] {
    if (this.dependencies.size === 0) {
      return [...taskStates];
    }

    const taskMap = new Map(taskStates.map(task => [task.identifier, task]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: TaskState[] = [];

    const visit = (identifier: string): void => {
      if (visited.has(identifier)) {
        return;
      }

      if (visiting.has(identifier)) {
        throw new TasklyError(
          `Circular dependency detected involving task: ${identifier}`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      visiting.add(identifier);

      const dependencies = this.dependencies.get(identifier) || [];
      for (const dep of dependencies) {
        if (taskMap.has(dep)) {
          visit(dep);
        }
      }

      visiting.delete(identifier);
      visited.add(identifier);

      const task = taskMap.get(identifier);
      if (task) {
        ordered.push(task);
      }
    };

    // Visit all tasks
    for (const task of taskStates) {
      visit(task.identifier);
    }

    return ordered;
  }

  /**
   * Check if a task can be started based on dependencies
   */
  private canStartTask(identifier: string): boolean {
    const dependencies = this.dependencies.get(identifier);
    if (!dependencies || dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    return dependencies.every(dep => this.completedTasks.has(dep));
  }

  /**
   * Get tasks that are ready to start (dependencies satisfied)
   */
  private getReadyTasks(): TaskState[] {
    return this.taskQueue.filter(
      task => task.status === 'pending' && this.canStartTask(task.identifier)
    );
  }

  /**
   * Set up global execution timeout
   */
  private setupGlobalTimeout(): void {
    if (this.globalTimeout <= 0) {
      return;
    }

    this.globalTimeoutId = setTimeout(async () => {
      this.emit('execution:global-timeout', {
        timeout: this.globalTimeout,
        runningTasks: Array.from(this.runningTasks),
        pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      });

      await this.stop('SIGKILL');

      throw new TasklyError(
        `Global execution timeout reached (${this.globalTimeout}ms)`,
        ERROR_CODES.SYSTEM_ERROR
      );
    }, this.globalTimeout);
  }

  /**
   * Retry a failed task
   */
  private async retryTask(taskState: TaskState): Promise<boolean> {
    const currentRetries = this.retryCount.get(taskState.identifier) || 0;

    if (currentRetries >= this.maxRetries) {
      return false;
    }

    // Increment retry count
    this.retryCount.set(taskState.identifier, currentRetries + 1);

    // Emit retry event
    this.emit('task:retry', {
      identifier: taskState.identifier,
      attempt: currentRetries + 1,
      maxRetries: this.maxRetries,
      delay: this.retryDelay,
    });

    // Wait for retry delay
    if (this.retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }

    // Reset task state for retry
    taskState.status = 'pending';
    taskState.result = undefined;
    taskState.processInfo = undefined;
    taskState.startTime = undefined;
    taskState.endTime = undefined;

    // Remove from failed tasks and add back to queue
    this.failedTasks.delete(taskState.identifier);
    this.taskQueue.unshift(taskState); // Add to front of queue for immediate retry

    return true;
  }

  /**
   * Handle task failure with retry logic
   */
  private async handleTaskFailure(
    taskState: TaskState,
    error?: unknown
  ): Promise<void> {
    // Try to retry if enabled
    if (this.retryFailedTasks) {
      const retried = await this.retryTask(taskState);
      if (retried) {
        // Process the retry
        await this.processTaskQueue();
        return;
      }
    }

    // Mark as permanently failed
    taskState.status = 'failed';
    taskState.endTime = Date.now();

    this.runningTasks.delete(taskState.identifier);
    this.currentConcurrency--;
    this.failedTasks.add(taskState.identifier);

    const tasklyError =
      error instanceof TasklyError
        ? error
        : new TasklyError(
            `Task "${taskState.identifier}" failed after ${this.retryCount.get(taskState.identifier) || 0} retries: ${error instanceof Error ? error.message : String(error)}`,
            ERROR_CODES.TASK_FAILED,
            { taskId: taskState.identifier },
            error instanceof Error ? error : undefined
          );

    this.emit('task:failed-permanently', {
      identifier: taskState.identifier,
      error: tasklyError,
      retries: this.retryCount.get(taskState.identifier) || 0,
    });

    // Handle kill-others-on-fail (only if not continuing on error)
    if (this.shouldKillOthersOnFail && !this.continueOnError) {
      await this.killOtherTasks(taskState.identifier);
      return;
    }

    // Process next tasks in queue
    await this.processTaskQueue();
  }

  /**
   * Check if execution should continue based on current state
   */
  private shouldContinueExecution(): boolean {
    // If continue on error is disabled and we have failures, stop
    if (!this.continueOnError && this.failedTasks.size > 0) {
      return false;
    }

    // If kill others on fail is enabled and we have failures, stop
    if (this.shouldKillOthersOnFail && this.failedTasks.size > 0) {
      return false;
    }

    return true;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    killedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    retriedTasks: number;
    averageRetries: number;
    executionTime: number;
  } {
    const retriedTasks = Array.from(this.retryCount.values()).filter(
      count => count > 0
    ).length;
    const totalRetries = Array.from(this.retryCount.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      totalTasks: this.tasks.size,
      completedTasks: this.completedTasks.size,
      failedTasks: this.failedTasks.size,
      killedTasks: this.killedTasks.size,
      runningTasks: this.runningTasks.size,
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      retriedTasks,
      averageRetries: retriedTasks > 0 ? totalRetries / retriedTasks : 0,
      executionTime: this.isRunning
        ? Date.now() - (this.getEarliestStartTime() || Date.now())
        : 0,
    };
  }

  /**
   * Get the earliest start time of all tasks
   */
  private getEarliestStartTime(): number | undefined {
    let earliest: number | undefined;

    for (const task of this.tasks.values()) {
      if (task.startTime && (!earliest || task.startTime < earliest)) {
        earliest = task.startTime;
      }
    }

    return earliest;
  }

  /**
   * Force kill a specific task
   */
  async killTask(
    identifier: string,
    signal: NodeJS.Signals = 'SIGTERM'
  ): Promise<boolean> {
    const taskState = this.tasks.get(identifier);
    if (!taskState || taskState.status !== 'running') {
      return false;
    }

    taskState.status = 'killed';
    taskState.endTime = Date.now();

    this.runningTasks.delete(identifier);
    this.currentConcurrency--;
    this.killedTasks.add(identifier);

    const killed = await this.processManager.terminate(identifier, signal);

    if (killed) {
      this.emit('task:killed', {
        identifier,
        signal,
        reason: 'manual',
      });

      // Process next tasks in queue
      await this.processTaskQueue();
    }

    return killed;
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport(): {
    hasErrors: boolean;
    summary: {
      totalTasks: number;
      failedTasks: number;
      killedTasks: number;
      errorRate: number;
    };
    failedTasks: Array<{
      identifier: string;
      command: string;
      error: string;
      exitCode: number;
      retries: number;
      duration: number;
      output: string[];
    }>;
    systemErrors: Array<{
      type: string;
      message: string;
      task?: string;
    }>;
  } {
    const failedTaskDetails = Array.from(this.failedTasks).map(identifier => {
      const taskState = this.tasks.get(identifier);
      const result = taskState?.result;

      return {
        identifier,
        command: taskState?.config.command || 'Unknown',
        error: result?.error || 'Unknown error',
        exitCode: result?.exitCode || 1,
        retries: this.retryCount.get(identifier) || 0,
        duration: result?.duration || 0,
        output: result?.output || [],
      };
    });

    const killedTaskDetails = Array.from(this.killedTasks).map(identifier => {
      const taskState = this.tasks.get(identifier);

      return {
        identifier,
        command: taskState?.config.command || 'Unknown',
        error: 'Task was killed',
        exitCode: 130,
        retries: this.retryCount.get(identifier) || 0,
        duration: this.calculateTaskDuration(taskState!),
        output: this.processManager.getOutput(identifier) || [],
      };
    });

    const allFailedTasks = [...failedTaskDetails, ...killedTaskDetails];
    const totalTasks = this.tasks.size;
    const totalFailures = this.failedTasks.size + this.killedTasks.size;

    return {
      hasErrors: totalFailures > 0,
      summary: {
        totalTasks,
        failedTasks: this.failedTasks.size,
        killedTasks: this.killedTasks.size,
        errorRate: totalTasks > 0 ? (totalFailures / totalTasks) * 100 : 0,
      },
      failedTasks: allFailedTasks,
      systemErrors: [], // Could be populated with system-level errors
    };
  }

  /**
   * Pause execution (stop starting new tasks)
   */
  pause(): void {
    if (!this.isRunning) {
      return;
    }

    this.emit('execution:paused', {
      runningTasks: Array.from(this.runningTasks),
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
    });
  }

  /**
   * Resume execution (continue starting new tasks)
   */
  async resume(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.emit('execution:resumed', {
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
    });

    await this.processTaskQueue();
  }

  /**
   * Set up global error handling integration
   */
  private setupGlobalErrorHandling(): void {
    const globalHandler = GlobalErrorHandler.getInstance();

    // Add TaskRunner cleanup to global shutdown callbacks
    globalHandler.addShutdownCallback(async () => {
      if (this.isRunning) {
        await this.stop('SIGTERM');
      }
      await this.cleanup();
    });

    // Handle global errors from TaskRunner
    this.on('execution:error', (error: TasklyError) => {
      handleGlobalError(error, {
        context: 'task-runner',
        executionStats: this.getExecutionStats(),
      });
    });

    // Handle task-specific errors
    this.on(
      'task:error',
      (data: { identifier: string; error: TasklyError }) => {
        handleGlobalError(data.error, {
          context: 'task-execution',
          taskId: data.identifier,
          executionStats: this.getExecutionStats(),
        });
      }
    );

    // Handle critical system errors
    this.on(
      'execution:uncaught-exception',
      (data: { error: string; stack?: string }) => {
        const error = ErrorFactory.createError(
          `Uncaught exception in task execution: ${data.error}`,
          ERROR_CODES.SYSTEM_ERROR,
          {
            timestamp: Date.now(),
            metadata: {
              stack: data.stack,
              executionContext: 'task-runner',
            },
          }
        );

        handleGlobalError(error, {
          context: 'uncaught-exception',
          executionStats: this.getExecutionStats(),
        });
      }
    );
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.globalTimeoutId) {
      clearTimeout(this.globalTimeoutId);
    }

    await this.stop('SIGKILL');
    await this.processManager.cleanup();
    this.removeAllListeners();
  }
}
