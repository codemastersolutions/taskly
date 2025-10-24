# Taskly API Reference

Complete API documentation for the Taskly library.

## 📚 Table of Contents

- [Core Classes](#core-classes)
- [Interfaces](#interfaces)
- [Utility Functions](#utility-functions)
- [Error Handling](#error-handling)
- [Events](#events)
- [Configuration](#configuration)

## 🏗️ Core Classes

### TaskRunner

Main class for executing parallel tasks.

```typescript
class TaskRunner {
  constructor(options: TasklyOptions)
  execute(tasks?: TaskConfig[]): Promise<TaskResult[]>
  stop(): Promise<void>
  on(event: string, listener: Function): this
  off(event: string, listener: Function): this
}
```

#### Constructor

```typescript
new TaskRunner(options: TasklyOptions)
```

**Parameters:**
- `options` - Configuration options for the task runner

**Example:**
```typescript
const runner = new TaskRunner({
  tasks: [
    { command: 'npm run build' },
    { command: 'npm run test' }
  ],
  killOthersOnFail: true,
  maxConcurrency: 2
});
```

#### Methods

##### execute(tasks?)

Executes the configured tasks or provided tasks.

```typescript
execute(tasks?: TaskConfig[]): Promise<TaskResult[]>
```

**Parameters:**
- `tasks` (optional) - Array of tasks to execute. If not provided, uses tasks from constructor options.

**Returns:** Promise resolving to array of task results.

**Example:**
```typescript
const results = await runner.execute();
console.log(`Executed ${results.length} tasks`);
```

##### stop()

Stops all running tasks gracefully.

```typescript
stop(): Promise<void>
```

**Example:**
```typescript
// Stop all tasks after 30 seconds
setTimeout(() => {
  runner.stop();
}, 30000);
```

### ColorManager

Manages color assignment and output formatting.

```typescript
class ColorManager {
  constructor(options?: ColorManagerOptions)
  assignColor(identifier: string): string
  colorize(text: string, color: string): string
  stripColors(text: string): string
  setCustomColors(colors: string[]): void
}
```

#### Methods

##### assignColor(identifier)

Assigns a color to a task identifier.

```typescript
assignColor(identifier: string): string
```

**Parameters:**
- `identifier` - Task identifier

**Returns:** Color name assigned to the identifier.

##### colorize(text, color)

Applies color formatting to text.

```typescript
colorize(text: string, color: string): string
```

**Parameters:**
- `text` - Text to colorize
- `color` - Color name or ANSI code

**Returns:** Colorized text with ANSI codes.

**Example:**
```typescript
const colorManager = new ColorManager();
const coloredText = colorManager.colorize('Hello World', 'blue');
console.log(coloredText); // Outputs blue text
```

### ProcessManager

Manages individual process execution and output capture.

```typescript
class ProcessManager {
  constructor(options?: ProcessManagerOptions)
  spawn(config: TaskConfig): Promise<TaskResult>
  kill(processId: string): Promise<void>
  killAll(): Promise<void>
}
```

#### Methods

##### spawn(config)

Spawns a new process for the given task configuration.

```typescript
spawn(config: TaskConfig): Promise<TaskResult>
```

**Parameters:**
- `config` - Task configuration

**Returns:** Promise resolving to task result.

### PackageManagerDetector

Detects and validates package managers.

```typescript
class PackageManagerDetector {
  constructor()
  detect(cwd?: string): Promise<PackageManager>
  isAvailable(pm: PackageManager): Promise<boolean>
  getCommand(pm: PackageManager): string
}
```

#### Methods

##### detect(cwd?)

Detects the package manager for a project directory.

```typescript
detect(cwd?: string): Promise<PackageManager>
```

**Parameters:**
- `cwd` (optional) - Working directory to check. Defaults to current directory.

**Returns:** Promise resolving to detected package manager.

**Example:**
```typescript
const detector = new PackageManagerDetector();
const pm = await detector.detect('./my-project');
console.log(`Detected package manager: ${pm}`);
```

## 🔧 Interfaces

### TaskConfig

Configuration for a single task.

```typescript
interface TaskConfig {
  command: string;              // Command to execute
  identifier?: string;          // Custom identifier (auto-generated if not provided)
  color?: string;              // Output color (auto-assigned if not provided)
  packageManager?: PackageManager; // Package manager to use
  cwd?: string;                // Working directory
}
```

**Properties:**

- **command** (required): The shell command to execute
- **identifier** (optional): Custom name for the task. Auto-generated if not provided.
- **color** (optional): Color for output formatting. Auto-assigned if not provided.
- **packageManager** (optional): Specific package manager to use ('npm', 'yarn', 'pnpm', 'bun')
- **cwd** (optional): Working directory for the command

**Example:**
```typescript
const task: TaskConfig = {
  command: 'npm run build',
  identifier: 'build-process',
  color: 'blue',
  packageManager: 'npm',
  cwd: './packages/frontend'
};
```

### TasklyOptions

Configuration options for TaskRunner.

```typescript
interface TasklyOptions {
  tasks: TaskConfig[];         // Array of tasks to execute
  killOthersOnFail?: boolean;  // Kill all tasks when one fails (default: false)
  maxConcurrency?: number;     // Maximum concurrent tasks (default: unlimited)
  prefix?: string;             // Output prefix format (default: '[{identifier}] ')
  timestampFormat?: string;    // Timestamp format for output (default: none)
}
```

**Properties:**

- **tasks** (required): Array of task configurations
- **killOthersOnFail** (optional): If true, stops all tasks when any task fails
- **maxConcurrency** (optional): Maximum number of tasks to run simultaneously
- **prefix** (optional): Template for output line prefixes. Use `{identifier}` placeholder.
- **timestampFormat** (optional): Timestamp format using standard format strings

**Example:**
```typescript
const options: TasklyOptions = {
  tasks: [
    { command: 'npm run api' },
    { command: 'npm run web' }
  ],
  killOthersOnFail: true,
  maxConcurrency: 4,
  prefix: '[{identifier}] ',
  timestampFormat: 'HH:mm:ss'
};
```

### TaskResult

Result of task execution.

```typescript
interface TaskResult {
  identifier: string;          // Task identifier
  exitCode: number;           // Process exit code (0 = success)
  output: string[];           // Captured output lines
  error?: string;             // Error message if failed
  duration: number;           // Execution duration in milliseconds
}
```

**Properties:**

- **identifier**: The task identifier used during execution
- **exitCode**: Process exit code (0 indicates success)
- **output**: Array of output lines captured from stdout/stderr
- **error**: Error message if the task failed
- **duration**: Task execution time in milliseconds

### CLIOptions

CLI-specific options interface.

```typescript
interface CLIOptions {
  commands: string[];          // Commands to execute
  names?: string[];           // Custom names for commands
  colors?: string[];          // Custom colors for commands
  packageManager?: PackageManager; // Package manager to use
  killOthersOnFail?: boolean; // Kill others on fail flag
  maxConcurrency?: number;    // Maximum concurrent tasks
  config?: string;            // Configuration file path
  verbose?: boolean;          // Verbose output flag
  help?: boolean;             // Show help flag
  version?: boolean;          // Show version flag
}
```

## 🛠️ Utility Functions

### runTasks(tasks, options?)

Convenience function to execute tasks without creating a TaskRunner instance.

```typescript
function runTasks(
  tasks: TaskConfig[],
  options?: Partial<TasklyOptions>
): Promise<TaskResult[]>
```

**Parameters:**
- `tasks` - Array of task configurations
- `options` (optional) - Execution options

**Returns:** Promise resolving to task results.

**Example:**
```typescript
import { runTasks } from '@codemastersolutions/taskly';

const results = await runTasks([
  { command: 'npm run build' },
  { command: 'npm run test' }
], {
  killOthersOnFail: true,
  maxConcurrency: 2
});
```

### Validation Functions

#### validateCommand(command)

Validates a command string.

```typescript
function validateCommand(command: string): boolean
```

#### validatePackageManager(pm)

Validates a package manager name.

```typescript
function validatePackageManager(pm: string): boolean
```

#### validateColor(color)

Validates a color name or hex code.

```typescript
function validateColor(color: string): boolean
```

#### validateTaskConfig(config)

Validates a complete task configuration.

```typescript
function validateTaskConfig(config: TaskConfig): boolean
```

### File System Utilities

#### detectPackageManager(cwd?)

Detects package manager from lock files.

```typescript
function detectPackageManager(cwd?: string): Promise<PackageManager>
```

#### loadConfigFile(path)

Loads configuration from a JSON file.

```typescript
function loadConfigFile(path: string): Promise<TasklyOptions>
```

#### fileExists(path)

Checks if a file exists.

```typescript
function fileExists(path: string): Promise<boolean>
```

### Terminal Utilities

#### formatOutputLine(line, identifier, color)

Formats an output line with identifier and color.

```typescript
function formatOutputLine(
  line: string,
  identifier: string,
  color: string
): string
```

#### stripAnsi(text)

Removes ANSI color codes from text.

```typescript
function stripAnsi(text: string): string
```

#### getTerminalWidth()

Gets the current terminal width.

```typescript
function getTerminalWidth(): number
```

## ⚠️ Error Handling

### TasklyError

Custom error class for Taskly-specific errors.

```typescript
class TasklyError extends Error {
  constructor(message: string, code: string, task?: string)
  
  readonly code: string;       // Error code
  readonly task?: string;      // Associated task identifier
}
```

### Error Codes

```typescript
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SPAWN_FAILED: 'SPAWN_FAILED',
  PM_NOT_FOUND: 'PM_NOT_FOUND',
  TASK_FAILED: 'TASK_FAILED',
  CONFIG_ERROR: 'CONFIG_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
} as const;
```

**Error Code Descriptions:**

- **VALIDATION_ERROR**: Invalid configuration or parameters
- **SPAWN_FAILED**: Failed to start a process
- **PM_NOT_FOUND**: Package manager not found or not available
- **TASK_FAILED**: Task execution failed
- **CONFIG_ERROR**: Configuration file error
- **TIMEOUT_ERROR**: Task execution timeout

### Error Handling Example

```typescript
import { TaskRunner, TasklyError, ERROR_CODES } from '@codemastersolutions/taskly';

try {
  const runner = new TaskRunner({ tasks: [] });
  await runner.execute();
} catch (error) {
  if (error instanceof TasklyError) {
    switch (error.code) {
      case ERROR_CODES.VALIDATION_ERROR:
        console.error('Configuration error:', error.message);
        break;
      case ERROR_CODES.SPAWN_FAILED:
        console.error('Failed to start process:', error.message);
        break;
      case ERROR_CODES.PM_NOT_FOUND:
        console.error('Package manager not found:', error.message);
        break;
      default:
        console.error('Taskly error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 📡 Events

TaskRunner emits events during execution that you can listen to.

### Event Types

#### taskStart

Emitted when a task starts execution.

```typescript
runner.on('taskStart', (task: TaskConfig) => {
  console.log(`Started: ${task.identifier}`);
});
```

#### taskOutput

Emitted when a task produces output.

```typescript
runner.on('taskOutput', (task: TaskConfig, line: string) => {
  console.log(`[${task.identifier}] ${line}`);
});
```

#### taskComplete

Emitted when a task completes (success or failure).

```typescript
runner.on('taskComplete', (task: TaskConfig, result: TaskResult) => {
  const status = result.exitCode === 0 ? 'SUCCESS' : 'FAILED';
  console.log(`${task.identifier}: ${status} (${result.duration}ms)`);
});
```

#### taskError

Emitted when a task encounters an error.

```typescript
runner.on('taskError', (task: TaskConfig, error: Error) => {
  console.error(`Error in ${task.identifier}:`, error.message);
});
```

#### allComplete

Emitted when all tasks have completed.

```typescript
runner.on('allComplete', (results: TaskResult[]) => {
  console.log(`All ${results.length} tasks completed`);
});
```

### Event Example

```typescript
const runner = new TaskRunner({
  tasks: [
    { command: 'npm run build', identifier: 'build' },
    { command: 'npm run test', identifier: 'test' }
  ]
});

// Set up event listeners
runner.on('taskStart', (task) => {
  console.log(`🚀 Starting ${task.identifier}...`);
});

runner.on('taskComplete', (task, result) => {
  const emoji = result.exitCode === 0 ? '✅' : '❌';
  console.log(`${emoji} ${task.identifier} completed in ${result.duration}ms`);
});

runner.on('allComplete', (results) => {
  const successful = results.filter(r => r.exitCode === 0).length;
  console.log(`🎉 ${successful}/${results.length} tasks completed successfully`);
});

await runner.execute();
```

## ⚙️ Configuration

### Package Manager Types

```typescript
type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';
```

### Color Types

```typescript
type Color = 
  | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan'
  | 'brightRed' | 'brightGreen' | 'brightYellow' 
  | 'brightBlue' | 'brightMagenta' | 'brightCyan'
  | string; // Hex colors also supported
```

### Default Values

```typescript
const DEFAULTS = {
  maxConcurrency: Infinity,
  killOthersOnFail: false,
  prefix: '[{identifier}] ',
  packageManager: 'npm' as PackageManager,
  colors: [
    'red', 'green', 'yellow', 'blue', 'magenta', 'cyan',
    'brightRed', 'brightGreen', 'brightYellow', 
    'brightBlue', 'brightMagenta', 'brightCyan'
  ]
};
```

## 🔍 Advanced Usage

### Custom Process Manager

```typescript
import { ProcessManager } from '@codemastersolutions/taskly/core';

const processManager = new ProcessManager({
  timeout: 30000,        // 30 second timeout
  killSignal: 'SIGTERM', // Graceful termination
  env: {                 // Custom environment variables
    NODE_ENV: 'development'
  }
});
```

### Custom Color Manager

```typescript
import { ColorManager } from '@codemastersolutions/taskly/core';

const colorManager = new ColorManager();

// Set custom color palette
colorManager.setCustomColors([
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
]);

// Use custom colors
const coloredOutput = colorManager.colorize('Hello', '#FF6B6B');
```

### Integration with Other Tools

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';
import { createWriteStream } from 'fs';

const logStream = createWriteStream('taskly.log');
const runner = new TaskRunner({ tasks: [] });

// Log all output to file
runner.on('taskOutput', (task, line) => {
  logStream.write(`[${new Date().toISOString()}] [${task.identifier}] ${line}\n`);
});
```