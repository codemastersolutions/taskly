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
  TaskConfig,
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
    addGlobalShutdownCallback(async () => {
      // Perform any CLI-specific cleanup here
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
        console.log(getHelp());
        process.exit(0);
      }

      if (options.version) {
        console.log(this.getVersion());
        process.exit(0);
      }

      // Load and merge configuration
      const config = await loadConfig(options.config);
      const mergedOptions = mergeConfig(config, options);

      // Convert to task configurations
      const tasks = await this.createTaskConfigs(mergedOptions, config);

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
          args: args || process.argv.slice(2),
        });
      }

      await this.handleError(error);
    }
  }

  /**
   * Create task configurations from CLI options and config
   */
  private async createTaskConfigs(
    options: CLIOptions,
    config: any
  ): Promise<TaskConfig[]> {
    const tasks: TaskConfig[] = [];

    // If we have commands from CLI, use those
    if (options.commands && options.commands.length > 0) {
      for (let i = 0; i < options.commands.length; i++) {
        const command = options.commands[i];
        const identifier =
          options.names?.[i] || this.generateIdentifier(command, i);
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
      console.error(`\n❌ ${failed.length} task(s) failed:`);
      for (const result of failed) {
        console.error(
          `  • ${result.identifier}: ${result.error || 'Unknown error'}`
        );
      }
      process.exit(1);
    } else {
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
    taskRunner.on('execution:start', (info: any) => {
      console.log(
        `🚀 Starting ${info.totalTasks} task(s)${info.maxConcurrency !== Infinity ? ` (max ${info.maxConcurrency} concurrent)` : ''}`
      );
      if (info.killOthersOnFail) {
        console.log('⚠️  Kill-others-on-fail enabled');
      }
      if (options.verbose) {
        console.log(`📋 Configuration: ${JSON.stringify(info, null, 2)}`);
      }
    });

    // Task start
    taskRunner.on('task:start', (info: any) => {
      const pmInfo = info.packageManagerInfo
        ? ` (${info.packageManagerInfo.name})`
        : '';
      console.log(
        `▶️  [${info.identifier}] Starting: ${info.command}${pmInfo}`
      );

      if (options.verbose && info.retryAttempt > 0) {
        console.log(
          `🔄 [${info.identifier}] Retry attempt ${info.retryAttempt}`
        );
      }
    });

    // Task output (real-time)
    taskRunner.on('task:output', (info: any) => {
      // Output the formatted line directly (already includes colors and prefix)
      process.stdout.write(info.line.formatted);
    });

    // Task completion
    taskRunner.on('task:complete', (info: any) => {
      const duration = (info.duration / 1000).toFixed(2);
      const retryInfo = info.retries > 0 ? ` (${info.retries} retries)` : '';
      console.log(
        `✅ [${info.identifier}] Completed in ${duration}s${retryInfo}`
      );
    });

    // Task failure
    taskRunner.on('task:failed-permanently', (info: any) => {
      const retryInfo =
        info.retries > 0 ? ` after ${info.retries} retries` : '';
      console.error(
        `❌ [${info.identifier}] Failed${retryInfo}: ${info.error.message}`
      );
    });

    // Task retry
    taskRunner.on('task:retry', (info: any) => {
      console.log(
        `🔄 [${info.identifier}] Retrying (${info.attempt}/${info.maxRetries})...`
      );
    });

    // Task killed
    taskRunner.on('task:killed', (info: any) => {
      console.log(`🛑 [${info.identifier}] Killed (${info.signal})`);
    });

    // Kill others on fail
    taskRunner.on('execution:killing-others', (info: any) => {
      console.log(
        `💀 Killing ${info.tasksToKill.length} other task(s) due to failure of [${info.trigger}]`
      );
    });

    // Execution complete
    taskRunner.on('execution:complete', (info: any) => {
      const duration = (info.executionTime / 1000).toFixed(2);
      console.log(`\n🏁 Execution completed in ${duration}s`);
      console.log(`   ✅ Successful: ${info.successful}`);
      if (info.failed > 0) console.log(`   ❌ Failed: ${info.failed}`);
      if (info.killed > 0) console.log(`   🛑 Killed: ${info.killed}`);
      if (info.retried > 0) console.log(`   🔄 Retried: ${info.retried}`);
    });

    // Global timeout
    taskRunner.on('execution:global-timeout', (info: any) => {
      console.error(`⏰ Global timeout reached (${info.timeout}ms)`);
      console.error(`   Running tasks: ${info.runningTasks.join(', ')}`);
      console.error(`   Pending tasks: ${info.pendingTasks}`);
    });

    // Verbose events
    if (options.verbose) {
      taskRunner.on('task:timeout', (info: any) => {
        console.log(`⏰ [${info.identifier}] Task timeout (${info.timeout}ms)`);
      });

      taskRunner.on('task:pm-resolution-warning', (info: any) => {
        console.warn(
          `⚠️  [${info.identifier}] Package manager resolution warning: ${info.error}`
        );
        console.warn(`   Falling back to: ${info.fallbackCommand}`);
      });

      taskRunner.on('execution:statistics', (info: any) => {
        console.log(`\n📊 Execution Statistics:`);
        console.log(`   Total tasks: ${info.totalTasks}`);
        console.log(`   Completed: ${info.completedTasks}`);
        console.log(`   Failed: ${info.failedTasks}`);
        console.log(`   Killed: ${info.killedTasks}`);
        console.log(`   Retried: ${info.retriedTasks}`);
        console.log(`   Total retries: ${info.totalRetries}`);
        console.log(
          `   Execution time: ${(info.executionTime / 1000).toFixed(2)}s`
        );
        console.log(
          `   Average task duration: ${(info.averageTaskDuration / 1000).toFixed(2)}s`
        );
        if (info.longestTask) {
          console.log(
            `   Longest task: ${info.longestTask.identifier} (${(info.longestTask.duration / 1000).toFixed(2)}s)`
          );
        }
        if (info.shortestTask) {
          console.log(
            `   Shortest task: ${info.shortestTask.identifier} (${(info.shortestTask.duration / 1000).toFixed(2)}s)`
          );
        }
      });
    }

    // Error handling
    taskRunner.on('execution:error', (error: TasklyError) => {
      console.error(`💥 Execution error: ${error.message}`);
      if (options.verbose && error.stack) {
        console.error(error.stack);
      }
    });

    // Process cleanup signals
    const cleanup = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, stopping tasks...`);
      await taskRunner.stop(signal as NodeJS.Signals);
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
      ? commandName.split('/').pop() || commandName
      : commandName;
    // Remove file extensions and special characters
    const baseName = fileName
      .replace(/\.[^.]*$/, '')
      .replace(/[^a-zA-Z0-9]/g, '');
    return `${baseName || 'task'}-${index}`;
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
  private async handleError(error: unknown): Promise<void> {
    if (error instanceof TasklyError) {
      // Use the user-friendly message system
      const friendlyMessage = getUserFriendlyMessage(error);
      console.error(`❌ ${friendlyMessage}`);

      // Show detailed context if available
      if (error.context.taskId) {
        console.error(`   Task: ${error.context.taskId}`);
      }

      if (error.context.command) {
        console.error(`   Command: ${error.context.command}`);
      }

      // Show additional help based on error type
      switch (error.code) {
        case ERROR_CODES.VALIDATION_ERROR:
        case ERROR_CODES.CLI_PARSE_ERROR:
          console.error('\n💡 Use --help for usage information.');
          break;

        case ERROR_CODES.CONFIG_ERROR:
        case ERROR_CODES.CONFIG_PARSE_ERROR:
          console.error(
            '\n💡 Check your configuration file syntax and content.'
          );
          break;

        case ERROR_CODES.PM_NOT_FOUND:
        case ERROR_CODES.PM_DETECTION_FAILED:
          console.error(
            '\n💡 Ensure the specified package manager is installed and available in PATH.'
          );
          break;

        case ERROR_CODES.SECURITY_VIOLATION:
        case ERROR_CODES.COMMAND_INJECTION:
          console.error('\n⚠️  This command was blocked for security reasons.');
          console.error(
            "   Please review the command and ensure it's safe to execute."
          );
          break;

        case ERROR_CODES.PERMISSION_DENIED:
          console.error(
            '\n💡 Try running with appropriate permissions or check file ownership.'
          );
          break;

        case ERROR_CODES.RESOURCE_EXHAUSTED:
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
        console.error('\n🔍 Detailed Error Information:');
        console.error(`   Code: ${error.code}`);
        console.error(
          `   Timestamp: ${new Date(error.timestamp).toISOString()}`
        );

        if (error.context && Object.keys(error.context).length > 0) {
          console.error(
            `   Context: ${JSON.stringify(error.context, null, 2)}`
          );
        }

        if (error.originalError) {
          console.error('\n📋 Original Error:');
          console.error(error.originalError);
        }

        if (error.stack) {
          console.error('\n📚 Stack Trace:');
          console.error(error.stack);
        }
      }

      process.exit(1);
    } else {
      // Handle unexpected errors
      console.error(
        `💥 Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );

      if (error instanceof Error && error.stack) {
        console.error('\n📚 Stack trace:');
        console.error(error.stack);
      }

      console.error(
        '\n🐛 This appears to be a bug. Please report it with the following information:'
      );
      console.error('   - Command that caused the error');
      console.error('   - Operating system and Node.js version');
      console.error('   - Full error message and stack trace above');
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
