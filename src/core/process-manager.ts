import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { handleGlobalError } from '../errors/global-handler.js';
import {
  ERROR_CODES,
  ErrorFactory,
  OutputLine,
  ProcessInfo,
  SecurityError,
  TaskConfig,
  TaskResult,
  TasklyError,
} from '../types/index.js';

/**
 * Process security and resource management options
 */
export interface ProcessOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum memory usage in MB (default: 512) */
  maxMemory?: number;
  /** Maximum CPU usage percentage (default: 100) */
  maxCpu?: number;
  /** Kill process on timeout (default: true) */
  killOnTimeout?: boolean;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
}

/**
 * ProcessManager handles spawning and managing child processes for task execution
 */
export class ProcessManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private processInfo: Map<string, ProcessInfo> = new Map();
  private outputBuffers: Map<string, string[]> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private resourceMonitors: Map<string, NodeJS.Timeout> = new Map();

  private defaultOptions: ProcessOptions = {
    timeout: 30000, // 30 seconds
    maxMemory: 512, // 512 MB
    maxCpu: 100, // 100%
    killOnTimeout: true,
  };

  /**
   * Spawn a new process for the given task
   */
  spawn(task: TaskConfig, options?: ProcessOptions): ProcessInfo {
    const identifier = task.identifier || this.generateIdentifier(task.command);
    const processOptions = { ...this.defaultOptions, ...options };

    try {
      // Validate and sanitize command
      this.validateCommand(task.command);

      // Parse command and arguments
      const { command, args } = this.parseCommand(task.command);

      // Create process info
      const processInfo: ProcessInfo = {
        identifier,
        command: task.command,
        startTime: Date.now(),
        status: 'starting',
      };

      // Prepare environment variables
      const env = {
        ...process.env,
        ...processOptions.env,
        // Security: Remove potentially dangerous env vars
        NODE_OPTIONS: undefined,
        LD_PRELOAD: undefined,
      };

      // Spawn the child process with security constraints
      const childProcess = spawn(command, args, {
        cwd: processOptions.cwd || task.cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env,
        // Security: Set resource limits if available
        detached: false,
        windowsHide: true,
      });

      // Update process info with PID
      processInfo.pid = childProcess.pid;
      processInfo.status = 'running';

      // Store process references
      this.processes.set(identifier, childProcess);
      this.processInfo.set(identifier, processInfo);
      this.outputBuffers.set(identifier, []);

      // Set up stream handlers
      this.setupStreamHandlers(identifier, childProcess);

      // Set up process event handlers
      this.setupProcessHandlers(identifier, childProcess);

      // Set up timeout and resource monitoring
      this.setupTimeoutControl(identifier, childProcess, processOptions);
      this.setupResourceMonitoring(identifier, childProcess, processOptions);

      // Set up signal handlers for cleanup
      this.setupSignalHandlers();

      this.emit('process:start', processInfo);

      return processInfo;
    } catch (error) {
      const tasklyError = ErrorFactory.fromSpawnError(
        error instanceof Error ? error : new Error(String(error)),
        task.command,
        {
          taskId: identifier,
          cwd: processOptions.cwd || task.cwd,
          packageManager: task.packageManager,
          timestamp: Date.now(),
        }
      );

      // Handle error globally
      handleGlobalError(tasklyError, {
        context: 'process-spawn',
        taskId: identifier,
        command: task.command,
      });

      this.emit('process:error', identifier, tasklyError);
      throw tasklyError;
    }
  }

  /**
   * Terminate a specific process
   */
  terminate(identifier: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const process = this.processes.get(identifier);
    const processInfo = this.processInfo.get(identifier);

    if (!process || !processInfo) {
      return false;
    }

    try {
      // Update status
      processInfo.status = 'killed';

      // Kill the process
      const killed = process.kill(signal);

      if (killed) {
        this.emit('process:terminate', identifier, signal);

        // Create a termination result immediately if the process was killed
        const endTime = Date.now();
        const duration = endTime - processInfo.startTime;
        const outputBuffer = this.outputBuffers.get(identifier) || [];

        const exitCode = signal === 'SIGKILL' ? 137 : 130; // Standard signal exit codes

        const result: TaskResult = {
          identifier,
          exitCode,
          output: [...outputBuffer],
          duration,
          startTime: processInfo.startTime,
          endTime,
          error: `Process terminated by signal ${signal}`,
          terminated: true,
          killedBySignal: true,
        };

        // Clean up references and resources
        this.processes.delete(identifier);
        this.cleanupProcess(identifier);

        // Emit completion with termination result
        this.emit('process:complete', identifier, result);
      }

      return killed;
    } catch (error) {
      const tasklyError = ErrorFactory.createError(
        `Failed to terminate process "${identifier}": ${error instanceof Error ? error.message : String(error)}`,
        ERROR_CODES.SYSTEM_ERROR,
        {
          taskId: identifier,
          pid: processInfo?.pid,
          timestamp: Date.now(),
          metadata: {
            signal,
            processStatus: processInfo?.status,
          },
        },
        error instanceof Error ? error : undefined
      );

      handleGlobalError(tasklyError, {
        context: 'process-termination',
        taskId: identifier,
      });

      this.emit('process:error', identifier, tasklyError);
      return false;
    }
  }

  /**
   * Terminate all running processes
   */
  terminateAll(signal: NodeJS.Signals = 'SIGTERM'): void {
    Array.from(this.processes.keys()).forEach(identifier =>
      this.terminate(identifier, signal)
    );
  }

  /**
   * Get process information by identifier
   */
  getProcessInfo(identifier: string): ProcessInfo | undefined {
    return this.processInfo.get(identifier);
  }

  /**
   * Get all process information
   */
  getAllProcessInfo(): ProcessInfo[] {
    return Array.from(this.processInfo.values());
  }

  /**
   * Check if a process is running
   */
  isRunning(identifier: string): boolean {
    const processInfo = this.processInfo.get(identifier);
    return processInfo?.status === 'running';
  }

  /**
   * Get captured output for a process
   */
  getOutput(identifier: string): string[] {
    return this.outputBuffers.get(identifier) || [];
  }

  /**
   * Parse command string into command and arguments
   */
  private parseCommand(commandString: string): {
    command: string;
    args: string[];
  } {
    // Simple command parsing - split by spaces but respect quotes
    const parts = commandString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const command = parts[0] || '';
    const args = parts.slice(1).map(arg => arg.replace(/^"(.*)"$/, '$1'));

    return { command, args };
  }

  /**
   * Generate a unique identifier for a task
   */
  private generateIdentifier(command: string): string {
    const timestamp = Date.now().toString(36);
    const commandHash = command.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    return `${commandHash}-${timestamp}`;
  }

  /**
   * Set up stdout/stderr stream handlers with line buffering
   */
  private setupStreamHandlers(
    identifier: string,
    childProcess: ChildProcess
  ): void {
    const outputBuffer = this.outputBuffers.get(identifier)!;

    // Line buffers for handling partial lines
    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Handle stdout with line buffering
    if (childProcess.stdout) {
      childProcess.stdout.setEncoding('utf8');
      childProcess.stdout.on('data', (data: string) => {
        stdoutBuffer += data;
        const lines = stdoutBuffer.split('\n');

        // Keep the last incomplete line in buffer
        stdoutBuffer = lines.pop() || '';

        // Process complete lines
        lines.forEach(line => {
          if (line.length > 0) {
            // Include empty lines for formatting
            this.processOutputLine(identifier, line, 'stdout', outputBuffer);
          }
        });
      });

      // Handle any remaining buffer content when stream ends
      childProcess.stdout.on('end', () => {
        if (stdoutBuffer.trim()) {
          this.processOutputLine(
            identifier,
            stdoutBuffer,
            'stdout',
            outputBuffer
          );
        }
      });
    }

    // Handle stderr with line buffering
    if (childProcess.stderr) {
      childProcess.stderr.setEncoding('utf8');
      childProcess.stderr.on('data', (data: string) => {
        stderrBuffer += data;
        const lines = stderrBuffer.split('\n');

        // Keep the last incomplete line in buffer
        stderrBuffer = lines.pop() || '';

        // Process complete lines
        lines.forEach(line => {
          if (line.length > 0) {
            // Include empty lines for formatting
            this.processOutputLine(identifier, line, 'stderr', outputBuffer);
          }
        });
      });

      // Handle any remaining buffer content when stream ends
      childProcess.stderr.on('end', () => {
        if (stderrBuffer.trim()) {
          this.processOutputLine(
            identifier,
            stderrBuffer,
            'stderr',
            outputBuffer
          );
        }
      });
    }
  }

  /**
   * Process a single output line with formatting and prefixing
   */
  private processOutputLine(
    identifier: string,
    content: string,
    type: 'stdout' | 'stderr',
    outputBuffer: string[]
  ): void {
    // Store raw content in buffer
    outputBuffer.push(content);

    // Create output line with basic formatting
    const outputLine: OutputLine = {
      identifier,
      content: content.trim(),
      type,
      timestamp: Date.now(),
      formatted: this.formatOutputLine(identifier, content.trim(), type),
    };

    // Emit for real-time processing
    this.emit('process:output', identifier, outputLine);
  }

  /**
   * Format output line with identifier prefix
   * This provides basic formatting - ColorManager will enhance it with colors
   */
  private formatOutputLine(
    identifier: string,
    content: string,
    type: 'stdout' | 'stderr'
  ): string {
    if (!content.trim()) {
      return '';
    }

    const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
    const prefix = `[${timestamp}] [${identifier}]`;
    const typeIndicator = type === 'stderr' ? ' [ERR]' : '';

    return `${prefix}${typeIndicator} ${content}`;
  }

  /**
   * Get formatted output for a process
   */
  getFormattedOutput(identifier: string): string[] {
    const rawOutput = this.outputBuffers.get(identifier) || [];
    return rawOutput.map(line =>
      this.formatOutputLine(identifier, line, 'stdout')
    );
  }

  /**
   * Stream output to a writable stream with real-time formatting
   */
  streamOutput(identifier: string, outputStream: NodeJS.WritableStream): void {
    const handleOutput = (id: string, outputLine: OutputLine): void => {
      if (id === identifier) {
        outputStream.write(outputLine.formatted + '\n');
      }
    };

    this.on('process:output', handleOutput);

    // Clean up listener when process completes
    const cleanup = (): void => {
      this.off('process:output', handleOutput);
    };

    this.once(`process:complete:${identifier}`, cleanup);
    this.once(`process:error:${identifier}`, cleanup);
  }

  /**
   * Get real-time output stream for a process
   */
  getOutputStream(identifier: string): NodeJS.ReadableStream {
    const { Readable } = require('stream');

    const outputStream = new Readable({
      objectMode: false,
      read(): void {}, // No-op, we'll push data as it comes
    });

    const handleOutput = (id: string, outputLine: OutputLine): void => {
      if (id === identifier) {
        outputStream.push(outputLine.formatted + '\n');
      }
    };

    const handleComplete = (id: string): void => {
      if (id === identifier) {
        outputStream.push(null); // End the stream
      }
    };

    this.on('process:output', handleOutput);
    this.on('process:complete', handleComplete);
    this.on('process:error', handleComplete);

    // Clean up listeners when stream is destroyed
    outputStream.on('close', () => {
      this.off('process:output', handleOutput);
      this.off('process:complete', handleComplete);
      this.off('process:error', handleComplete);
    });

    return outputStream;
  }

  /**
   * Set up process event handlers
   */
  private setupProcessHandlers(
    identifier: string,
    childProcess: ChildProcess
  ): void {
    const processInfo = this.processInfo.get(identifier)!;
    const outputBuffer = this.outputBuffers.get(identifier)!;

    childProcess.on(
      'close',
      (code: number | null, signal: NodeJS.Signals | null) => {
        // Check if this process was already handled (e.g., by timeout or manual termination)
        if (!this.processes.has(identifier)) {
          return; // Already handled, don't emit duplicate completion
        }

        const endTime = Date.now();
        const duration = endTime - processInfo.startTime;

        // Update process status
        if (signal) {
          processInfo.status = 'killed';
        } else if (code === 0) {
          processInfo.status = 'completed';
        } else {
          processInfo.status = 'failed';
        }

        // Create task result
        const result: TaskResult = {
          identifier,
          exitCode: code || 0,
          output: [...outputBuffer],
          duration,
          startTime: processInfo.startTime,
          endTime,
          error: code !== 0 ? `Process exited with code ${code}` : undefined,
        };

        // Clean up references and resources
        this.processes.delete(identifier);
        this.cleanupProcess(identifier);

        this.emit('process:complete', identifier, result);
      }
    );

    childProcess.on('error', (error: Error) => {
      processInfo.status = 'failed';

      const tasklyError = new TasklyError(
        `Process error for task "${identifier}": ${error.message}`,
        ERROR_CODES.SPAWN_FAILED,
        { taskId: identifier },
        error
      );

      // Clean up references and resources
      this.processes.delete(identifier);
      this.cleanupProcess(identifier);

      this.emit('process:error', identifier, tasklyError);
    });
  }

  /**
   * Validate command for security
   */
  private validateCommand(command: string): void {
    if (!command || typeof command !== 'string') {
      throw ErrorFactory.createError(
        'Command must be a non-empty string',
        ERROR_CODES.VALIDATION_ERROR,
        {
          command,
          timestamp: Date.now(),
        }
      );
    }

    // Basic security checks
    const dangerousPatterns = [
      {
        pattern: /rm\s+-rf\s+\//,
        description: 'recursive delete of root directory',
      },
      { pattern: />\s*\/dev\//, description: 'redirect to system devices' },
      { pattern: /curl.*\|\s*sh/, description: 'curl pipe to shell execution' },
      { pattern: /wget.*\|\s*sh/, description: 'wget pipe to shell execution' },
      { pattern: /eval\s*\(/, description: 'eval() function calls' },
      { pattern: /exec\s*\(/, description: 'exec() function calls' },
      { pattern: /\$\(.*\)/, description: 'command substitution' },
      { pattern: /`.*`/, description: 'backtick command execution' },
    ];

    for (const { pattern, description } of dangerousPatterns) {
      if (pattern.test(command)) {
        const securityError = new SecurityError(
          `Command contains potentially dangerous pattern (${description}): ${command}`,
          ERROR_CODES.COMMAND_INJECTION,
          {
            command,
            timestamp: Date.now(),
            metadata: {
              dangerousPattern: description,
              detectedPattern: pattern.toString(),
            },
          }
        );

        // Handle security violation globally
        handleGlobalError(securityError, {
          context: 'command-validation',
          securityViolation: true,
          command,
        });

        throw securityError;
      }
    }
  }

  /**
   * Set up timeout control for a process
   */
  private setupTimeoutControl(
    identifier: string,
    childProcess: ChildProcess,
    options: ProcessOptions
  ): void {
    if (!options.timeout || options.timeout <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const processInfo = this.processInfo.get(identifier);
      if (processInfo && processInfo.status === 'running') {
        this.emit('process:timeout', identifier, options.timeout);

        if (options.killOnTimeout) {
          try {
            // Mark as killed due to timeout
            processInfo.status = 'killed';

            // Kill the process forcefully
            const killed = childProcess.kill('SIGKILL');

            if (killed) {
              // Create a timeout result immediately
              const endTime = Date.now();
              const duration = endTime - processInfo.startTime;
              const outputBuffer = this.outputBuffers.get(identifier) || [];

              const result: TaskResult = {
                identifier,
                exitCode: 124, // Standard timeout exit code
                output: [...outputBuffer],
                duration,
                startTime: processInfo.startTime,
                endTime,
                error: `Task timed out after ${options.timeout}ms`,
                timedOut: true,
              };

              // Clean up references and resources
              this.processes.delete(identifier);
              this.cleanupProcess(identifier);

              // Emit completion with timeout result
              this.emit('process:complete', identifier, result);
            } else {
              this.emit(
                'process:error',
                identifier,
                new TasklyError(
                  `Failed to kill process on timeout`,
                  ERROR_CODES.SYSTEM_ERROR,
                  { taskId: identifier }
                )
              );
            }
          } catch (error) {
            this.emit(
              'process:error',
              identifier,
              new TasklyError(
                `Failed to kill process on timeout: ${error instanceof Error ? error.message : String(error)}`,
                ERROR_CODES.SYSTEM_ERROR,
                { taskId: identifier }
              )
            );
          }
        }
      }
    }, options.timeout);

    this.timeouts.set(identifier, timeoutId);
  }

  /**
   * Set up resource monitoring for a process
   */
  private setupResourceMonitoring(
    identifier: string,
    childProcess: ChildProcess,
    options: ProcessOptions
  ): void {
    if (!childProcess.pid || (!options.maxMemory && !options.maxCpu)) {
      return;
    }

    const monitorId = setInterval(() => {
      void this.checkResourceUsage(identifier, childProcess.pid!, options);
    }, 1000); // Check every second

    this.resourceMonitors.set(identifier, monitorId);
  }

  /**
   * Check resource usage and enforce limits
   */
  private checkResourceUsage(
    identifier: string,
    pid: number,
    options: ProcessOptions
  ): void {
    try {
      // This is a simplified resource check
      // In a production environment, you might want to use more sophisticated monitoring
      const processInfo = this.processInfo.get(identifier);
      if (!processInfo || processInfo.status !== 'running') {
        return;
      }

      // Note: Actual memory/CPU monitoring would require platform-specific implementations
      // This is a placeholder for the monitoring logic
      // On Linux: could use /proc/[pid]/stat and /proc/[pid]/status
      // On macOS: could use ps or system calls
      // On Windows: could use wmic or performance counters

      // For now, we'll emit a monitoring event that could be handled by external tools
      this.emit('process:resource-check', identifier, {
        pid,
        timestamp: Date.now(),
        limits: {
          maxMemory: options.maxMemory,
          maxCpu: options.maxCpu,
        },
      });
    } catch (error) {
      // Don't fail the process for monitoring errors, just log them
      this.emit('process:monitor-error', identifier, error);
    }
  }

  /**
   * Set up signal handlers for graceful cleanup
   */
  private setupSignalHandlers(): void {
    // Avoid setting up multiple handlers
    if (this.listenerCount('cleanup-signal') > 0) {
      return;
    }

    const cleanup = (signal: string) => {
      this.emit('cleanup-signal', signal);
      this.cleanup();
      process.exit(0);
    };

    // Handle common termination signals
    process.once('SIGINT', () => cleanup('SIGINT'));
    process.once('SIGTERM', () => cleanup('SIGTERM'));
    process.once('SIGHUP', () => cleanup('SIGHUP'));

    // Handle uncaught exceptions
    process.once('uncaughtException', error => {
      this.emit('uncaught-exception', error);
      this.cleanup();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.once('unhandledRejection', reason => {
      this.emit('unhandled-rejection', reason);
      this.cleanup();
      process.exit(1);
    });

    this.on('cleanup-signal', () => {}); // Mark that we have handlers
  }

  /**
   * Clean up resources for a specific process
   */
  private cleanupProcess(identifier: string): void {
    // Clear timeout
    const timeoutId = this.timeouts.get(identifier);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(identifier);
    }

    // Clear resource monitor
    const monitorId = this.resourceMonitors.get(identifier);
    if (monitorId) {
      clearInterval(monitorId);
      this.resourceMonitors.delete(identifier);
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // Clear all timeouts and monitors
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    for (const monitorId of this.resourceMonitors.values()) {
      clearInterval(monitorId);
    }

    // Terminate all processes
    this.terminateAll('SIGKILL');

    // Clear all maps
    this.processes.clear();
    this.processInfo.clear();
    this.outputBuffers.clear();
    this.timeouts.clear();
    this.resourceMonitors.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}
