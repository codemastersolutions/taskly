/**
 * CLI Argument Parser
 * Zero-dependency command-line argument parsing for Taskly
 */

import {
  CLIOptions,
  ERROR_CODES,
  PackageManager,
  TasklyError,
} from '../types/index.js';

export interface ParsedArgs {
  options: CLIOptions;
  commands: string[];
}

export interface HelpInfo {
  usage: string;
  description: string;
  options: Array<{
    flag: string;
    alias?: string;
    description: string;
    type: string;
    default?: string;
  }>;
  examples: string[];
}

/**
 * CLI Argument Parser class
 */
export class ArgumentParser {
  private readonly helpInfo: HelpInfo;

  constructor() {
    this.helpInfo = this.createHelpInfo();
  }

  /**
   * Parse command line arguments
   */
  parse(args: string[] = process.argv.slice(2)): ParsedArgs {
    const options: CLIOptions = {
      commands: [],
      help: false,
      version: false,
    };

    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        i = this.parseLongOption(args, i, options);
      } else if (arg.startsWith('-') && arg.length > 1) {
        i = this.parseShortOption(args, i, options);
      } else {
        // Treat as command
        options.commands.push(arg);
        i++;
      }
    }

    this.validateOptions(options);
    return { options, commands: options.commands };
  }

  /**
   * Parse long options (--option)
   */
  private parseLongOption(
    args: string[],
    index: number,
    options: CLIOptions
  ): number {
    const arg = args[index];
    const [flag, value] = arg.split('=', 2);

    switch (flag) {
      case '--help':
        options.help = true;
        return index + 1;

      case '--version':
        options.version = true;
        return index + 1;

      case '--names':
        return this.parseArrayOption(args, index, value, val => {
          options.names = val.split(',').map(s => s.trim());
        });

      case '--colors':
        return this.parseArrayOption(args, index, value, val => {
          options.colors = val.split(',').map(s => s.trim());
        });

      case '--package-manager':
      case '--pm':
        return this.parseStringOption(args, index, value, val => {
          this.validatePackageManager(val);
          options.packageManager = val as PackageManager;
        });

      case '--kill-others-on-fail':
      case '--kill-others':
        options.killOthersOnFail = true;
        return index + 1;

      case '--max-concurrency':
      case '--concurrency':
        return this.parseNumberOption(args, index, value, val => {
          if (val <= 0) {
            throw new TasklyError(
              'Max concurrency must be greater than 0',
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          options.maxConcurrency = val;
        });

      case '--config':
        return this.parseStringOption(args, index, value, val => {
          options.config = val;
        });

      case '--verbose':
        options.verbose = true;
        return index + 1;

      default:
        throw new TasklyError(
          `Unknown option: ${flag}`,
          ERROR_CODES.VALIDATION_ERROR
        );
    }
  }

  /**
   * Parse short options (-o)
   */
  private parseShortOption(
    args: string[],
    index: number,
    options: CLIOptions
  ): number {
    const arg = args[index];
    const flags = arg.slice(1); // Remove the '-'

    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];

      switch (flag) {
        case 'h':
          options.help = true;
          break;

        case 'v':
          options.version = true;
          break;

        case 'k':
          options.killOthersOnFail = true;
          break;

        case 'V':
          options.verbose = true;
          break;

        case 'n':
          // -n requires a value, so it must be the last flag in a group
          if (i < flags.length - 1) {
            throw new TasklyError(
              '-n option requires a value and must be used alone',
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          return this.parseStringOption(args, index, undefined, val => {
            options.names = val.split(',').map(s => s.trim());
          });

        case 'c':
          // -c requires a value, so it must be the last flag in a group
          if (i < flags.length - 1) {
            throw new TasklyError(
              '-c option requires a value and must be used alone',
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          return this.parseStringOption(args, index, undefined, val => {
            options.colors = val.split(',').map(s => s.trim());
          });

        case 'p':
          // -p requires a value, so it must be the last flag in a group
          if (i < flags.length - 1) {
            throw new TasklyError(
              '-p option requires a value and must be used alone',
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          return this.parseStringOption(args, index, undefined, val => {
            this.validatePackageManager(val);
            options.packageManager = val as PackageManager;
          });

        case 'm':
          // -m requires a value, so it must be the last flag in a group
          if (i < flags.length - 1) {
            throw new TasklyError(
              '-m option requires a value and must be used alone',
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          return this.parseNumberOption(args, index, undefined, val => {
            if (val <= 0) {
              throw new TasklyError(
                'Max concurrency must be greater than 0',
                ERROR_CODES.VALIDATION_ERROR
              );
            }
            options.maxConcurrency = val;
          });

        default:
          throw new TasklyError(
            `Unknown option: -${flag}`,
            ERROR_CODES.VALIDATION_ERROR
          );
      }
    }

    return index + 1;
  }

  /**
   * Parse string option with value
   */
  private parseStringOption(
    args: string[],
    index: number,
    value: string | undefined,
    setter: (value: string) => void
  ): number {
    if (value !== undefined) {
      setter(value);
      return index + 1;
    }

    if (index + 1 >= args.length) {
      throw new TasklyError(
        `Option ${args[index]} requires a value`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    setter(args[index + 1]);
    return index + 2;
  }

  /**
   * Parse number option with value
   */
  private parseNumberOption(
    args: string[],
    index: number,
    value: string | undefined,
    setter: (value: number) => void
  ): number {
    return this.parseStringOption(args, index, value, val => {
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        throw new TasklyError(
          `Invalid number value: ${val}`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      setter(num);
    });
  }

  /**
   * Parse array option with value
   */
  private parseArrayOption(
    args: string[],
    index: number,
    value: string | undefined,
    setter: (value: string) => void
  ): number {
    return this.parseStringOption(args, index, value, setter);
  }

  /**
   * Validate package manager value
   */
  private validatePackageManager(pm: string): void {
    const validPMs: PackageManager[] = ['npm', 'yarn', 'pnpm', 'bun'];
    if (!validPMs.includes(pm as PackageManager)) {
      throw new TasklyError(
        `Invalid package manager: ${pm}. Valid options: ${validPMs.join(', ')}`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  /**
   * Validate parsed options
   */
  private validateOptions(options: CLIOptions): void {
    // If help or version is requested, no other validation needed
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean logic for flag checking
    if (options.help || options.version) {
      return;
    }

    // Must have at least one command
    if (options.commands.length === 0) {
      throw new TasklyError(
        'At least one command is required',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate names array length matches commands
    if (options.names && options.names.length !== options.commands.length) {
      throw new TasklyError(
        `Number of names (${options.names.length}) must match number of commands (${options.commands.length})`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate colors array length matches commands
    if (options.colors && options.colors.length !== options.commands.length) {
      throw new TasklyError(
        `Number of colors (${options.colors.length}) must match number of commands (${options.commands.length})`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Validate commands are not empty
    for (let i = 0; i < options.commands.length; i++) {
      const command = options.commands[i].trim();
      if (!command) {
        throw new TasklyError(
          `Command at index ${i} is empty`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      options.commands[i] = command;
    }
  }

  /**
   * Get help information
   */
  getHelp(): string {
    const { usage, description, options, examples } = this.helpInfo;

    let help = `${description}\n\n`;
    help += `Usage: ${usage}\n\n`;
    help += 'Options:\n';

    // Calculate max width for alignment
    const maxWidth = Math.max(
      ...options.map(
        opt => `${opt.flag}${opt.alias ? `, ${opt.alias}` : ''}`.length
      )
    );

    for (const option of options) {
      const flags = `${option.flag}${option.alias ? `, ${option.alias}` : ''}`;
      const padding = ' '.repeat(maxWidth - flags.length + 2);
      const defaultText = option.default ? ` (default: ${option.default})` : '';
      help += `  ${flags}${padding}${option.description}${defaultText}\n`;
    }

    help += '\nExamples:\n';
    for (const example of examples) {
      help += `  ${example}\n`;
    }

    return help;
  }

  /**
   * Create help information structure
   */
  private createHelpInfo(): HelpInfo {
    return {
      usage: 'taskly [options] <command1> [command2] [...]',
      description: 'Taskly - Zero-dependency parallel command execution',
      options: [
        {
          flag: '--help',
          alias: '-h',
          description: 'Show help information',
          type: 'boolean',
        },
        {
          flag: '--version',
          alias: '-v',
          description: 'Show version number',
          type: 'boolean',
        },
        {
          flag: '--names',
          alias: '-n',
          description: 'Comma-separated list of custom names for commands',
          type: 'string',
        },
        {
          flag: '--colors',
          alias: '-c',
          description: 'Comma-separated list of colors for command output',
          type: 'string',
        },
        {
          flag: '--package-manager',
          alias: '-p',
          description: 'Package manager to use (npm, yarn, pnpm, bun)',
          type: 'string',
          default: 'auto-detect',
        },
        {
          flag: '--kill-others-on-fail',
          alias: '-k',
          description: 'Kill all other tasks when one fails',
          type: 'boolean',
        },
        {
          flag: '--max-concurrency',
          alias: '-m',
          description: 'Maximum number of concurrent tasks',
          type: 'number',
          default: 'unlimited',
        },
        {
          flag: '--config',
          description: 'Path to configuration file',
          type: 'string',
        },
        {
          flag: '--verbose',
          alias: '-V',
          description: 'Enable verbose output',
          type: 'boolean',
        },
      ],
      examples: [
        'taskly "npm run dev" "npm run test:watch"',
        'taskly --names "dev,test" "npm run dev" "npm run test"',
        'taskly --colors "blue,green" --kill-others-on-fail "npm start" "npm test"',
        'taskly --package-manager yarn "yarn dev" "yarn test"',
        'taskly --config taskly.config.json',
        'taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"',
      ],
    };
  }
}

/**
 * Parse command line arguments
 */
export function parseArgs(args?: string[]): ParsedArgs {
  const parser = new ArgumentParser();
  return parser.parse(args);
}

/**
 * Get help text
 */
export function getHelp(): string {
  const parser = new ArgumentParser();
  return parser.getHelp();
}
