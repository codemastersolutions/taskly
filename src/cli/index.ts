#!/usr/bin/env node

/**
 * Taskly CLI Entry Point
 * Main command-line interface for Taskly parallel task execution
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TaskRunner } from '../core/task-runner.js';
import {
  addGlobalShutdownCallback,
  handleGlobalError,
  initializeGlobalErrorHandling,
} from '../errors/global-handler.js';
import {
  CLIOptions,
  ERROR_CODES,
  OutputLine,
  PackageManager,
  TaskConfig,
  TaskResult,
  TasklyConfig,
  TasklyError,
  getUserFriendlyMessage,
} from '../types/index.js';
import { ConfigLoader, loadConfig, mergeConfig } from './config.js';
import { getHelp, parseArgs } from './parser.js';

// Get directory path for package.json resolution
const currentDir = process.cwd();

/**
 * CLI Application class
 */
export class TasklyCLI {
  private configLoader: ConfigLoader;

  constructor() {
    this.configLoader = new ConfigLoader();
    this.initializeErrorHandling();
  }

  /**
   * Initialize global error handling for CLI
   */
  private initializeErrorHandling(): void {
    // Initialize with CLI-specific options
    initializeGlobalErrorHandling({
      enableConsoleLogging: true,
      enableFileLogging: false,
      exitOnCriticalError: true, // CLI should exit on critical errors
      enableRecovery: false, // CLI doesn't need recovery
      shutdownTimeout: 5000, // 5 seconds for CLI cleanup
    });

    // Add CLI cleanup to global shutdown callbacks
    addGlobalShutdownCallback(() => {
      // Perform any CLI-specific cleanup here
      // eslint-disable-next-line no-console -- CLI cleanup status message
      console.log('\n🧹 Cleaning up CLI resources...');
    });
  }

  /**
   * Main CLI entry point
   */
  async run(args?: string[]): Promise<void> {
    try {
      // Parse command line arguments
      const { options } = parseArgs(args);

      // Handle help and version flags
      if (options.help) {
        // eslint-disable-next-line no-console -- CLI help output
        console.log(getHelp());
        process.exit(0);
      }

      if (options.version) {
        // eslint-disable-next-line no-console -- CLI version output
        console.log(this.getVersion());
        process.exit(0);
      }

      // Load and merge configuration
      const config = await loadConfig(options.config);
      const mergedOptions = mergeConfig(config, options);

      // Convert to task configurations
      const tasks = this.createTaskConfigs(mergedOptions, config);

      // Validate we have tasks to run
      if (tasks.length === 0) {
        throw new TasklyError(
          'No tasks to execute. Provide commands or use a configuration file.',
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Execute tasks
      await this.executeTasks(tasks, mergedOptions);
    } catch (error) {
      // Handle error globally first
      if (error instanceof TasklyError) {
        handleGlobalError(error, {
          context: 'cli-execution',
          args: args ?? process.argv.slice(2),
        });
      }

      this.handleError(error);
    }
  }

  /**
   * Create task configurations from CLI options and config
   */
  private createTaskConfigs(
    options: CLIOptions,
    config: TasklyConfig | null
  ): TaskConfig[] {
    const tasks: TaskConfig[] = [];

    // If we have commands from CLI, use those
    if (options.commands && options.commands.length > 0) {
      for (let i = 0; i < options.commands.length; i++) {
        const command = options.commands[i];
        const identifier =
          options.names?.[i] ?? this.generateIdentifier(command, i);
        const color = options.colors?.[i];

        tasks.push({
          command,
          identifier,
          color,
          packageManager: options.packageManager,
          cwd: process.cwd(),
        });
      }
    } else if (config?.tasks) {
      // Use tasks from configuration file
      const configTasks = this.configLoader.convertConfigTasks(config);
      tasks.push(...configTasks);
    }

    // Validate we have tasks
    if (tasks.length === 0) {
      throw new TasklyError(
        'No tasks to execute. Provide commands or use a configuration file.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    return tasks;
  }

  /**
   * Execute tasks using TaskRunner
   */
  private async executeTasks(
    tasks: TaskConfig[],
    options: CLIOptions
  ): Promise<void> {
    // Create TaskRunner with options
    const taskRunner = new TaskRunner({
      tasks,
      killOthersOnFail: options.killOthersOnFail,
      maxConcurrency: options.maxConcurrency,
      verbose: options.verbose,
    });

    // Set up event listeners for CLI output
    this.setupTaskRunnerListeners(taskRunner, options);

    // Execute tasks
    const results = await taskRunner.execute(tasks);

    // Handle results
    const failed = results.filter(r => r.exitCode !== 0);
    if (failed.length > 0) {
      // eslint-disable-next-line no-console -- CLI task failure summary
      console.error(`\n❌ ${failed.length} task(s) failed:`);
      for (const result of failed) {
        // eslint-disable-next-line no-console -- CLI task failure details
        console.error(
          `  • ${result.identifier}: ${result.error ?? 'Unknown error'}`
        );
      }
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console -- CLI task success summary
      console.log(`\n✅ All ${results.length} task(s) completed successfully`);
      process.exit(0);
    }
  }

  /**
   * Set up TaskRunner event listeners for CLI output
   */
  private setupTaskRunnerListeners(
    taskRunner: TaskRunner,
    options: CLIOptions
  ): void {
    // Execution start
    taskRunner.on(
      'execution:start',
      (info: {
        totalTasks: number;
        maxConcurrency: number;
        killOthersOnFail: boolean;
        retryFailedTasks?: boolean;
        maxRetries?: number;
        continueOnError?: boolean;
        hasDependencies?: boolean;
      }) => {
        // eslint-disable-next-line no-console -- CLI task execution start message
        console.log(
          `🚀 Starting ${info.totalTasks} task(s)${info.maxConcurrency !== Infinity ? ` (max ${info.maxConcurrency} concurrent)` : ''}`
        );
        if (info.killOthersOnFail) {
          // eslint-disable-next-line no-console -- CLI kill-others-on-fail status
          console.log('⚠️  Kill-others-on-fail enabled');
        }
        if (options.verbose) {
          // eslint-disable-next-line no-console -- CLI verbose configuration output
          console.log(`📋 Configuration: ${JSON.stringify(info, null, 2)}`);
        }
      }
    );

    // Task start
    taskRunner.on(
      'task:start',
      (info: {
        identifier: string;
        command: string;
        resolvedCommand?: string;
        packageManager?: PackageManager;
        packageManagerInfo?: { name: string; version: string; source: string };
        cwd?: string;
        color?: string;
        dependencies?: string[];
        retryAttempt?: number;
      }) => {
        const pmInfo = info.packageManagerInfo
          ? ` (${info.packageManagerInfo.name})`
          : '';
        // eslint-disable-next-line no-console -- CLI task start message
        console.log(
          `▶️  [${info.identifier}] Starting: ${info.command}${pmInfo}`
        );

        if (options.verbose && (info.retryAttempt ?? 0) > 0) {
          // eslint-disable-next-line no-console -- CLI verbose retry attempt message
          console.log(
            `🔄 [${info.identifier}] Retry attempt ${info.retryAttempt}`
          );
        }
      }
    );

    // Task output (real-time)
    taskRunner.on(
      'task:output',
      (info: {
        identifier: string;
        line: OutputLine & { formatted: string };
        taskInfo?: {
          status?: string;
          retries?: number;
        };
      }) => {
        // Output the formatted line directly (already includes colors and prefix)
        process.stdout.write(info.line.formatted);
      }
    );

    // Task completion
    taskRunner.on(
      'task:complete',
      (info: {
        identifier: string;
        result: TaskResult;
        duration: number;
        retries: number;
      }) => {
        const duration = (info.duration / 1000).toFixed(2);
        const retryInfo = info.retries > 0 ? ` (${info.retries} retries)` : '';
        // eslint-disable-next-line no-console -- CLI task completion message
        console.log(
          `✅ [${info.identifier}] Completed in ${duration}s${retryInfo}`
        );
      }
    );

    // Task failure
    taskRunner.on(
      'task:failed-permanently',
      (info: { identifier: string; error: TasklyError; retries: number }) => {
        const retryInfo =
          info.retries > 0 ? ` after ${info.retries} retries` : '';
        // eslint-disable-next-line no-console -- CLI task failure message
        console.error(
          `❌ [${info.identifier}] Failed${retryInfo}: ${info.error.message}`
        );
      }
    );

    // Task retry
    taskRunner.on(
      'task:retry',
      (info: {
        identifier: string;
        attempt: number;
        maxRetries: number;
        delay?: number;
      }) => {
        // eslint-disable-next-line no-console -- CLI task retry message
        console.log(
          `🔄 [${info.identifier}] Retrying (${info.attempt}/${info.maxRetries})...`
        );
      }
    );

    // Task killed
    taskRunner.on(
      'task:killed',
      (info: {
        identifier: string;
        signal: NodeJS.Signals;
        reason?: string;
      }) => {
        // eslint-disable-next-line no-console -- CLI task killed message
        console.log(`🛑 [${info.identifier}] Killed (${info.signal})`);
      }
    );

    // Kill others on fail
    taskRunner.on(
      'execution:killing-others',
      (info: { trigger: string; tasksToKill: string[] }) => {
        // eslint-disable-next-line no-console -- CLI kill-others-on-fail message
        console.log(
          `💀 Killing ${info.tasksToKill.length} other task(s) due to failure of [${info.trigger}]`
        );
      }
    );

    // Execution complete
    taskRunner.on(
      'execution:complete',
      (info: {
        results: TaskResult[];
        totalTasks: number;
        successful: number;
        failed: number;
        killed: number;
        retried: number;
        executionTime?: number;
      }) => {
        const duration = ((info.executionTime ?? 0) / 1000).toFixed(2);
        // eslint-disable-next-line no-console -- CLI execution completion summary
        console.log(`\n🏁 Execution completed in ${duration}s`);
        // eslint-disable-next-line no-console -- CLI execution success count
        console.log(`   ✅ Successful: ${info.successful}`);
        // eslint-disable-next-line no-console -- CLI execution failure count
        if (info.failed > 0) console.log(`   ❌ Failed: ${info.failed}`);
        // eslint-disable-next-line no-console -- CLI execution killed count
        if (info.killed > 0) console.log(`   🛑 Killed: ${info.killed}`);
        // eslint-disable-next-line no-console -- CLI execution retry count
        if (info.retried > 0) console.log(`   🔄 Retried: ${info.retried}`);
      }
    );

    // Global timeout
    taskRunner.on(
      'execution:global-timeout',
      (info: {
        timeout: number;
        runningTasks: string[];
        pendingTasks: number;
      }) => {
        // eslint-disable-next-line no-console -- CLI global timeout error message
        console.error(`⏰ Global timeout reached (${info.timeout}ms)`);
        // eslint-disable-next-line no-console -- CLI running tasks info
        console.error(`   Running tasks: ${info.runningTasks.join(', ')}`);
        // eslint-disable-next-line no-console -- CLI pending tasks info
        console.error(`   Pending tasks: ${info.pendingTasks}`);
      }
    );

    // Verbose events
    if (options.verbose) {
      taskRunner.on(
        'task:timeout',
        (info: { identifier: string; timeout: number; retries?: number }) => {
          // eslint-disable-next-line no-console -- CLI verbose task timeout message
          console.log(
            `⏰ [${info.identifier}] Task timeout (${info.timeout}ms)`
          );
        }
      );

      taskRunner.on(
        'task:pm-resolution-warning',
        (info: {
          identifier: string;
          packageManager?: string;
          error: string;
          fallbackCommand?: string;
        }) => {
          // eslint-disable-next-line no-console -- CLI verbose package manager warning
          console.warn(
            `⚠️  [${info.identifier}] Package manager resolution warning: ${info.error}`
          );
          // eslint-disable-next-line no-console -- CLI verbose fallback command info
          console.warn(`   Falling back to: ${info.fallbackCommand}`);
        }
      );

      taskRunner.on(
        'execution:statistics',
        (info: {
          totalTasks: number;
          completedTasks: number;
          failedTasks: number;
          killedTasks: number;
          retriedTasks: number;
          totalRetries: number;
          executionTime: number;
          averageTaskDuration: number;
          longestTask?: { identifier: string; duration: number };
          shortestTask?: { identifier: string; duration: number };
        }) => {
          // eslint-disable-next-line no-console -- CLI verbose execution statistics
          console.log(`\n📊 Execution Statistics:`);
          // eslint-disable-next-line no-console -- CLI verbose total tasks
          console.log(`   Total tasks: ${info.totalTasks}`);
          // eslint-disable-next-line no-console -- CLI verbose completed tasks
          console.log(`   Completed: ${info.completedTasks}`);
          // eslint-disable-next-line no-console -- CLI verbose failed tasks
          console.log(`   Failed: ${info.failedTasks}`);
          // eslint-disable-next-line no-console -- CLI verbose killed tasks
          console.log(`   Killed: ${info.killedTasks}`);
          // eslint-disable-next-line no-console -- CLI verbose retried tasks
          console.log(`   Retried: ${info.retriedTasks}`);
          // eslint-disable-next-line no-console -- CLI verbose total retries
          console.log(`   Total retries: ${info.totalRetries}`);
          // eslint-disable-next-line no-console -- CLI verbose execution time
          console.log(
            `   Execution time: ${(info.executionTime / 1000).toFixed(2)}s`
          );
          // eslint-disable-next-line no-console -- CLI verbose average task duration
          console.log(
            `   Average task duration: ${(info.averageTaskDuration / 1000).toFixed(2)}s`
          );
          if (info.longestTask) {
            // eslint-disable-next-line no-console -- CLI verbose longest task info
            console.log(
              `   Longest task: ${info.longestTask.identifier} (${(info.longestTask.duration / 1000).toFixed(2)}s)`
            );
          }
          if (info.shortestTask) {
            // eslint-disable-next-line no-console -- CLI verbose shortest task info
            console.log(
              `   Shortest task: ${info.shortestTask.identifier} (${(info.shortestTask.duration / 1000).toFixed(2)}s)`
            );
          }
        }
      );
    }

    // Error handling
    taskRunner.on('execution:error', (error: TasklyError) => {
      // eslint-disable-next-line no-console -- CLI execution error message
      console.error(`💥 Execution error: ${error.message}`);
      if (options.verbose && error.stack) {
        // eslint-disable-next-line no-console -- CLI verbose error stack trace
        console.error(error.stack);
      }
    });

    // Process cleanup signals
    const cleanup = (signal: string) => {
      // eslint-disable-next-line no-console -- CLI signal handling message
      console.log(`\n🛑 Received ${signal}, stopping tasks...`);
      taskRunner.stop(signal as NodeJS.Signals);
      process.exit(130);
    };

    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
  }

  /**
   * Generate task identifier from command
   */
  private generateIdentifier(command: string, index: number): string {
    const commandName = command.trim().split(/\s+/)[0];
    // Extract just the filename from paths like ./build.sh
    const fileName = commandName.includes('/')
      ? (commandName.split('/').pop() ?? commandName)
      : commandName;
    // Remove file extensions and special characters
    const baseName = fileName
      .replace(/\.[^.]*$/, '')
      .replace(/[^a-zA-Z0-9]/g, '');
    return `${baseName ?? 'task'}-${index}`;
  }

  /**
   * Get version from package.json
   */
  private getVersion(): string {
    try {
      const packageJsonPath = resolve(currentDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return `Taskly v${packageJson.version}`;
    } catch (error) {
      return 'Taskly v1.0.0 (version unknown)';
    }
  }

  /**
   * Handle CLI errors with user-friendly messages
   */
  private handleError(error: unknown): void {
    if (error instanceof TasklyError) {
      // Use the user-friendly message system
      const friendlyMessage = getUserFriendlyMessage(error);
      // eslint-disable-next-line no-console -- CLI error message
      console.error(`❌ ${friendlyMessage}`);

      // Show detailed context if available
      if (error.context.taskId) {
        // eslint-disable-next-line no-console -- CLI error task context
        console.error(`   Task: ${error.context.taskId}`);
      }

      if (error.context.command) {
        // eslint-disable-next-line no-console -- CLI error command context
        console.error(`   Command: ${error.context.command}`);
      }

      // Show additional help based on error type
      switch (error.code) {
        case ERROR_CODES.VALIDATION_ERROR:
        case ERROR_CODES.CLI_PARSE_ERROR:
          // eslint-disable-next-line no-console -- CLI help suggestion
          console.error('\n💡 Use --help for usage information.');
          break;

        case ERROR_CODES.CONFIG_ERROR:
        case ERROR_CODES.CONFIG_PARSE_ERROR:
          // eslint-disable-next-line no-console -- CLI config error help
          console.error(
            '\n💡 Check your configuration file syntax and content.'
          );
          break;

        case ERROR_CODES.PM_NOT_FOUND:
        case ERROR_CODES.PM_DETECTION_FAILED:
          // eslint-disable-next-line no-console -- CLI package manager error help
          console.error(
            '\n💡 Ensure the specified package manager is installed and available in PATH.'
          );
          break;

        case ERROR_CODES.SECURITY_VIOLATION:
        case ERROR_CODES.COMMAND_INJECTION:
          // eslint-disable-next-line no-console -- CLI security error warning
          console.error('\n⚠️  This command was blocked for security reasons.');
          // eslint-disable-next-line no-console -- CLI security error help
          console.error(
            "   Please review the command and ensure it's safe to execute."
          );
          break;

        case ERROR_CODES.PERMISSION_DENIED:
          // eslint-disable-next-line no-console -- CLI permission error help
          console.error(
            '\n💡 Try running with appropriate permissions or check file ownership.'
          );
          break;

        case ERROR_CODES.RESOURCE_EXHAUSTED:
          // eslint-disable-next-line no-console -- CLI resource error help
          console.error(
            '\n💡 Close other applications or increase system resources.'
          );
          break;
      }

      // Show detailed error information in verbose mode
      const isVerbose =
        process.env.TASKLY_VERBOSE === 'true' ||
        process.argv.includes('--verbose');
      if (isVerbose) {
        // eslint-disable-next-line no-console -- CLI verbose error details header
        console.error('\n🔍 Detailed Error Information:');
        // eslint-disable-next-line no-console -- CLI verbose error code
        console.error(`   Code: ${error.code}`);
        // eslint-disable-next-line no-console -- CLI verbose error timestamp
        console.error(
          `   Timestamp: ${new Date(error.timestamp).toISOString()}`
        );

        if (error.context && Object.keys(error.context).length > 0) {
          // eslint-disable-next-line no-console -- CLI verbose error context
          console.error(
            `   Context: ${JSON.stringify(error.context, null, 2)}`
          );
        }

        if (error.originalError) {
          // eslint-disable-next-line no-console -- CLI verbose original error header
          console.error('\n📋 Original Error:');
          // eslint-disable-next-line no-console -- CLI verbose original error details
          console.error(error.originalError);
        }

        if (error.stack) {
          // eslint-disable-next-line no-console -- CLI verbose stack trace header
          console.error('\n📚 Stack Trace:');
          // eslint-disable-next-line no-console -- CLI verbose stack trace
          console.error(error.stack);
        }
      }

      process.exit(1);
    } else {
      // Handle unexpected errors
      // eslint-disable-next-line no-console -- CLI unexpected error message
      console.error(
        `💥 Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );

      if (error instanceof Error && error.stack) {
        // eslint-disable-next-line no-console -- CLI unexpected error stack trace header
        console.error('\n📚 Stack trace:');
        // eslint-disable-next-line no-console -- CLI unexpected error stack trace
        console.error(error.stack);
      }

      // eslint-disable-next-line no-console -- CLI bug report instructions
      console.error(
        '\n🐛 This appears to be a bug. Please report it with the following information:'
      );
      // eslint-disable-next-line no-console -- CLI bug report command info
      console.error('   - Command that caused the error');
      // eslint-disable-next-line no-console -- CLI bug report system info
      console.error('   - Operating system and Node.js version');
      // eslint-disable-next-line no-console -- CLI bug report error info
      console.error('   - Full error message and stack trace above');
      // eslint-disable-next-line no-console -- CLI bug report URL
      console.error(
        '\n📝 Report at: https://github.com/codemastersolutions/taskly/issues'
      );
      process.exit(1);
    }
  }
}

/**
 * Main CLI execution function
 */
async function main(): Promise<void> {
  const cli = new TasklyCLI();
  await cli.run();
}

// Run CLI if this file is executed directly
// This will be handled by the bin/taskly.ts entry point

export { main };
