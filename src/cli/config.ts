/**
 * Configuration File Loading
 * Handles loading and parsing of Taskly configuration files
 */

import { existsSync, readFileSync } from 'fs';
import { extname, resolve } from 'path';
import {
  CLIOptions,
  ERROR_CODES,
  TaskConfig,
  TasklyConfig,
  TasklyError,
} from '../types/index.js';

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private readonly supportedExtensions = [
    '.json',
    '.yaml',
    '.yml',
    '.js',
    '.mjs',
  ];
  private readonly defaultConfigNames = [
    'taskly.config.json',
    'taskly.config.yaml',
    'taskly.config.yml',
    'taskly.config.js',
    'taskly.config.mjs',
    '.tasklyrc.json',
    '.tasklyrc.yaml',
    '.tasklyrc.yml',
    '.tasklyrc.js',
    '.tasklyrc.mjs',
  ];

  /**
   * Load configuration from file or auto-discover
   */
  async loadConfig(
    configPath?: string,
    cwd: string = process.cwd()
  ): Promise<TasklyConfig | null> {
    try {
      const resolvedPath = configPath
        ? this.resolveConfigPath(configPath, cwd)
        : this.findConfigFile(cwd);

      if (!resolvedPath) {
        return null;
      }

      return await this.parseConfigFile(resolvedPath);
    } catch (error) {
      if (error instanceof TasklyError) {
        throw error;
      }

      throw new TasklyError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
        ERROR_CODES.CONFIG_ERROR,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Merge CLI options with configuration and environment variables
   */
  mergeWithCLIOptions(
    config: TasklyConfig | null,
    cliOptions: CLIOptions
  ): CLIOptions {
    // Start with environment variables as base
    const envOptions = this.loadEnvironmentVariables();

    // Merge in order: env -> config -> CLI (CLI has highest priority)
    const merged: CLIOptions = { ...cliOptions };

    // Apply config values if not set in CLI
    if (config) {
      if (merged.packageManager === undefined && config.packageManager) {
        merged.packageManager = config.packageManager;
      }

      if (
        merged.killOthersOnFail === undefined &&
        config.killOthersOnFail !== undefined
      ) {
        merged.killOthersOnFail = config.killOthersOnFail;
      }

      if (
        merged.maxConcurrency === undefined &&
        config.maxConcurrency !== undefined
      ) {
        merged.maxConcurrency = config.maxConcurrency;
      }

      if (
        merged.verbose === undefined &&
        config.options?.verbose !== undefined
      ) {
        merged.verbose = config.options.verbose;
      }

      // Apply default colors if not specified in CLI
      if (!merged.colors && config.colors && config.colors.length > 0) {
        merged.colors = config.colors;
      }
    }

    // Apply environment variables if not set in config or CLI
    if (merged.packageManager === undefined && envOptions.packageManager) {
      merged.packageManager = envOptions.packageManager;
    }

    if (
      merged.killOthersOnFail === undefined &&
      envOptions.killOthersOnFail !== undefined
    ) {
      merged.killOthersOnFail = envOptions.killOthersOnFail;
    }

    if (
      merged.maxConcurrency === undefined &&
      envOptions.maxConcurrency !== undefined
    ) {
      merged.maxConcurrency = envOptions.maxConcurrency;
    }

    if (merged.verbose === undefined && envOptions.verbose !== undefined) {
      merged.verbose = envOptions.verbose;
    }

    if (merged.config === undefined && envOptions.config) {
      merged.config = envOptions.config;
    }

    if (!merged.colors && envOptions.colors && envOptions.colors.length > 0) {
      merged.colors = envOptions.colors;
    }

    if (!merged.names && envOptions.names && envOptions.names.length > 0) {
      merged.names = envOptions.names;
    }

    return merged;
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentVariables(): Partial<CLIOptions> {
    const env = process.env;
    const options: Partial<CLIOptions> = {};

    // TASKLY_PACKAGE_MANAGER
    if (env.TASKLY_PACKAGE_MANAGER) {
      const pm = env.TASKLY_PACKAGE_MANAGER.toLowerCase();
      if (['npm', 'yarn', 'pnpm', 'bun'].includes(pm)) {
        options.packageManager = pm as PackageManager;
      }
    }

    // TASKLY_KILL_OTHERS_ON_FAIL
    if (env.TASKLY_KILL_OTHERS_ON_FAIL) {
      options.killOthersOnFail = this.parseBoolean(
        env.TASKLY_KILL_OTHERS_ON_FAIL
      );
    }

    // TASKLY_MAX_CONCURRENCY
    if (env.TASKLY_MAX_CONCURRENCY) {
      const concurrency = parseInt(env.TASKLY_MAX_CONCURRENCY, 10);
      if (!isNaN(concurrency) && concurrency > 0) {
        options.maxConcurrency = concurrency;
      }
    }

    // TASKLY_VERBOSE
    if (env.TASKLY_VERBOSE) {
      options.verbose = this.parseBoolean(env.TASKLY_VERBOSE);
    }

    // TASKLY_CONFIG
    if (env.TASKLY_CONFIG) {
      options.config = env.TASKLY_CONFIG;
    }

    // TASKLY_COLORS
    if (env.TASKLY_COLORS) {
      options.colors = env.TASKLY_COLORS.split(',')
        .map(c => c.trim())
        .filter(Boolean);
    }

    // TASKLY_NAMES
    if (env.TASKLY_NAMES) {
      options.names = env.TASKLY_NAMES.split(',')
        .map(n => n.trim())
        .filter(Boolean);
    }

    return options;
  }

  /**
   * Parse boolean from string (supports various formats)
   */
  private parseBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'on', 'enabled'].includes(normalized);
  }

  /**
   * Convert config tasks to CLI format
   */
  convertConfigTasks(config: TasklyConfig, taskNames?: string[]): TaskConfig[] {
    if (!config.tasks) {
      return [];
    }

    const tasks: TaskConfig[] = [];
    const taskEntries = Object.entries(config.tasks);

    // If specific task names are provided, filter to those
    const filteredEntries =
      taskNames && taskNames.length > 0
        ? taskEntries.filter(([name]) => taskNames.includes(name))
        : taskEntries;

    for (const [name, taskConfig] of filteredEntries) {
      tasks.push({
        ...taskConfig,
        identifier: taskConfig.identifier ?? name,
      });
    }

    return tasks;
  }

  /**
   * Resolve configuration file path
   */
  private resolveConfigPath(configPath: string, cwd: string): string {
    const resolved = resolve(cwd, configPath);

    if (!existsSync(resolved)) {
      throw new TasklyError(
        `Configuration file not found: ${resolved}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    const ext = extname(resolved);
    if (!this.supportedExtensions.includes(ext)) {
      throw new TasklyError(
        `Unsupported configuration file extension: ${ext}. Supported: ${this.supportedExtensions.join(', ')}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    return resolved;
  }

  /**
   * Find configuration file in directory
   */
  private findConfigFile(cwd: string): string | null {
    for (const configName of this.defaultConfigNames) {
      const configPath = resolve(cwd, configName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }
    return null;
  }

  /**
   * Parse configuration file based on extension
   */
  private async parseConfigFile(configPath: string): Promise<TasklyConfig> {
    const ext = extname(configPath);

    switch (ext) {
      case '.json':
        return this.parseJSONConfig(configPath);

      case '.yaml':
      case '.yml':
        return this.parseYAMLConfig(configPath);

      case '.js':
      case '.mjs':
        return await this.parseJSConfig(configPath);

      default:
        throw new TasklyError(
          `Unsupported configuration file extension: ${ext}`,
          ERROR_CODES.CONFIG_ERROR
        );
    }
  }

  /**
   * Parse JSON configuration file
   */
  private parseJSONConfig(configPath: string): TasklyConfig {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      return this.validateConfig(config, configPath);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new TasklyError(
          `Invalid JSON in configuration file: ${configPath}`,
          ERROR_CODES.CONFIG_ERROR,
          undefined,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Parse YAML configuration file (simple implementation without dependencies)
   */
  private parseYAMLConfig(configPath: string): TasklyConfig {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = this.parseSimpleYAML(content);
      return this.validateConfig(config, configPath);
    } catch (error) {
      if (error instanceof TasklyError) {
        throw error;
      }
      throw new TasklyError(
        `Invalid YAML in configuration file: ${configPath}`,
        ERROR_CODES.CONFIG_ERROR,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Simple YAML parser for basic configuration (no dependencies)
   * Supports basic key-value pairs, arrays, and nested objects
   */
  private parseSimpleYAML(content: string): Record<string, unknown> {
    const lines = content.split('\n').map(line => line.replace(/\r$/, ''));
    const result: Record<string, unknown> = {};
    const stack: Array<{
      obj: Record<string, unknown> | unknown[];
      indent: number;
      isArray?: boolean;
    }> = [{ obj: result, indent: -1 }];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const indent = line.length - line.trimStart().length;

      // Handle indentation changes
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      // Parse key-value pairs
      if (trimmed.includes(':') && !trimmed.startsWith('- ')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const valueStr = trimmed.substring(colonIndex + 1).trim();

        if (!valueStr) {
          // Object key - check if next line is an array
          const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
          const nextTrimmed = nextLine.trim();

          if (nextTrimmed.startsWith('- ')) {
            // This is an array
            const newArray: unknown[] = [];
            (parent.obj as Record<string, unknown>)[key] = newArray;
            stack.push({ obj: newArray, indent, isArray: true });
          } else {
            // This is an object
            const newObj: Record<string, unknown> = {};
            (parent.obj as Record<string, unknown>)[key] = newObj;
            stack.push({ obj: newObj, indent });
          }
        } else {
          // Value key
          (parent.obj as Record<string, unknown>)[key] =
            this.parseYAMLValue(valueStr);
        }
      } else if (trimmed.startsWith('- ')) {
        // Array item
        const value = trimmed.substring(2).trim();

        if (!parent.isArray && !Array.isArray(parent.obj)) {
          throw new Error(
            `Invalid YAML: array item without array context at line ${i + 1}`
          );
        }

        if (value.includes(':')) {
          // Object in array
          const obj: Record<string, unknown> = {};
          const colonIndex = value.indexOf(':');
          const key = value.substring(0, colonIndex).trim();
          const valueStr = value.substring(colonIndex + 1).trim();
          obj[key] = this.parseYAMLValue(valueStr);
          (parent.obj as unknown[]).push(obj);
        } else {
          // Simple value in array
          (parent.obj as unknown[]).push(this.parseYAMLValue(value));
        }
      }
    }

    return result;
  }

  /**
   * Parse YAML value (string, number, boolean, array)
   */
  private parseYAMLValue(value: string): unknown {
    // Handle quoted strings
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for quote checking
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // Handle arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .slice(1, -1)
        .split(',')
        .map(item => item.trim());
      return items.map(item => this.parseYAMLValue(item));
    }

    // Handle booleans
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    // Handle numbers
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    // Default to string
    return value;
  }

  /**
   * Parse JavaScript configuration file
   */
  private async parseJSConfig(configPath: string): Promise<TasklyConfig> {
    try {
      // Use dynamic import to load the config file
      const configModule = await import(`file://${configPath}`);
      const config = configModule.default ?? configModule;
      return this.validateConfig(config, configPath);
    } catch (error) {
      throw new TasklyError(
        `Failed to load JavaScript configuration: ${configPath}`,
        ERROR_CODES.CONFIG_ERROR,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate configuration object
   */
  private validateConfig(config: unknown, configPath: string): TasklyConfig {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
    if (!config || typeof config !== 'object') {
      throw new TasklyError(
        `Configuration must be an object: ${configPath}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    // Validate package manager if specified
    if ((config as Record<string, unknown>).packageManager) {
      const validPMs = ['npm', 'yarn', 'pnpm', 'bun'];
      const packageManager = (config as Record<string, unknown>)
        .packageManager as string;
      if (!validPMs.includes(packageManager)) {
        throw new TasklyError(
          `Invalid package manager in config: ${packageManager}. Valid options: ${validPMs.join(', ')}`,
          ERROR_CODES.CONFIG_ERROR
        );
      }
    }

    // Validate maxConcurrency if specified
    const maxConcurrency = (config as Record<string, unknown>).maxConcurrency;
    if (maxConcurrency !== undefined) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for validation
      if (typeof maxConcurrency !== 'number' || maxConcurrency <= 0) {
        throw new TasklyError(
          `maxConcurrency must be a positive number: ${maxConcurrency}`,
          ERROR_CODES.CONFIG_ERROR
        );
      }
    }

    // Validate killOthersOnFail if specified
    const killOthersOnFail = (config as Record<string, unknown>)
      .killOthersOnFail;
    if (
      killOthersOnFail !== undefined &&
      typeof killOthersOnFail !== 'boolean'
    ) {
      throw new TasklyError(
        `killOthersOnFail must be a boolean: ${killOthersOnFail}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    // Validate colors if specified
    const colors = (config as Record<string, unknown>).colors;
    if (colors && !Array.isArray(colors)) {
      throw new TasklyError(
        `colors must be an array: ${colors}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    // Validate tasks if specified
    const tasks = (config as Record<string, unknown>).tasks;
    if (tasks) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for validation
      if (typeof tasks !== 'object' || Array.isArray(tasks)) {
        throw new TasklyError(
          `tasks must be an object with task definitions`,
          ERROR_CODES.CONFIG_ERROR
        );
      }

      // Validate each task
      for (const [taskName, taskConfig] of Object.entries(tasks)) {
        this.validateTaskConfig(
          taskName,
          taskConfig as Record<string, unknown>,
          configPath
        );
      }
    }

    return config as TasklyConfig;
  }

  /**
   * Validate individual task configuration
   */
  private validateTaskConfig(
    taskName: string,
    taskConfig: Record<string, unknown>,
    configPath: string
  ): void {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
    if (!taskConfig || typeof taskConfig !== 'object') {
      throw new TasklyError(
        `Task "${taskName}" must be an object: ${configPath}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Checking for falsy values
    if (!taskConfig.command || typeof taskConfig.command !== 'string') {
      throw new TasklyError(
        `Task "${taskName}" must have a command string: ${configPath}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }

    if (taskConfig.packageManager) {
      const validPMs = ['npm', 'yarn', 'pnpm', 'bun'];
      if (!validPMs.includes(taskConfig.packageManager as string)) {
        throw new TasklyError(
          `Invalid package manager for task "${taskName}": ${taskConfig.packageManager}`,
          ERROR_CODES.CONFIG_ERROR
        );
      }
    }

    if (taskConfig.cwd && typeof taskConfig.cwd !== 'string') {
      throw new TasklyError(
        `Task "${taskName}" cwd must be a string: ${configPath}`,
        ERROR_CODES.CONFIG_ERROR
      );
    }
  }

  /**
   * Load configuration from package.json
   */
  loadPackageJsonConfig(cwd: string = process.cwd()): TasklyConfig | null {
    const packageJsonPath = resolve(cwd, 'package.json');

    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      if (packageJson.taskly) {
        return this.validateConfig(packageJson.taskly, packageJsonPath);
      }

      return null;
    } catch (error) {
      // Silently ignore package.json parsing errors for taskly config
      return null;
    }
  }

  /**
   * Generate example configuration files
   */
  generateExampleConfigs(): {
    json: string;
    yaml: string;
    javascript: string;
  } {
    const exampleConfig = {
      packageManager: 'npm',
      killOthersOnFail: false,
      maxConcurrency: 4,
      colors: ['blue', 'green', 'yellow', 'magenta'],
      tasks: {
        dev: {
          command: 'npm run dev',
          identifier: 'development',
          color: 'blue',
        },
        test: {
          command: 'npm run test:watch',
          identifier: 'testing',
          color: 'green',
        },
        lint: {
          command: 'npm run lint:watch',
          identifier: 'linting',
          color: 'yellow',
        },
        build: {
          command: 'npm run build',
          identifier: 'building',
          color: 'magenta',
          packageManager: 'yarn',
        },
      },
      options: {
        verbose: false,
      },
    };

    return {
      json: JSON.stringify(exampleConfig, null, 2),
      yaml: this.objectToYAML(exampleConfig),
      javascript: `// taskly.config.js
export default ${JSON.stringify(exampleConfig, null, 2)};

// Or using CommonJS:
// module.exports = ${JSON.stringify(exampleConfig, null, 2)};`,
    };
  }

  /**
   * Convert object to simple YAML format
   */
  private objectToYAML(
    obj: Record<string, unknown>,
    indent: number = 0
  ): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Explicit null/undefined check
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === 'boolean') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else if (typeof value === 'number') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'string') {
            yaml += `${spaces}  - "${item}"\n`;
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.objectToYAML(value as Record<string, unknown>, indent + 1);
      }
    }

    return yaml;
  }
}

/**
 * Load configuration with default loader
 */
export async function loadConfig(
  configPath?: string,
  cwd?: string
): Promise<TasklyConfig | null> {
  const loader = new ConfigLoader();
  return loader.loadConfig(configPath, cwd);
}

/**
 * Merge configuration with CLI options
 */
export function mergeConfig(
  config: TasklyConfig | null,
  cliOptions: CLIOptions
): CLIOptions {
  const loader = new ConfigLoader();
  return loader.mergeWithCLIOptions(config, cliOptions);
}
