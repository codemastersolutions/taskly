/**
 * CLI Argument Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArgumentParser, parseArgs, getHelp } from '../../cli/parser.js';
import { TasklyError, ERROR_CODES } from '../../types/index.js';

describe('ArgumentParser', () => {
  let parser: ArgumentParser;

  beforeEach(() => {
    parser = new ArgumentParser();
  });

  describe('basic argument parsing', () => {
    it('should parse simple commands', () => {
      const result = parser.parse(['npm run dev', 'npm run test']);
      
      expect(result.options.commands).toEqual(['npm run dev', 'npm run test']);
      expect(result.options.help).toBe(false);
      expect(result.options.version).toBe(false);
    });

    it('should handle empty arguments', () => {
      expect(() => parser.parse([])).toThrow(TasklyError);
      expect(() => parser.parse([])).toThrow('At least one command is required');
    });

    it('should handle help flag', () => {
      const result = parser.parse(['--help']);
      expect(result.options.help).toBe(true);
    });

    it('should handle version flag', () => {
      const result = parser.parse(['--version']);
      expect(result.options.version).toBe(true);
    });
  });

  describe('long options', () => {
    it('should parse --names option', () => {
      const result = parser.parse(['--names', 'dev,test', 'npm run dev', 'npm run test']);
      
      expect(result.options.names).toEqual(['dev', 'test']);
      expect(result.options.commands).toEqual(['npm run dev', 'npm run test']);
    });

    it('should parse --names with equals syntax', () => {
      const result = parser.parse(['--names=dev,test', 'npm run dev', 'npm run test']);
      
      expect(result.options.names).toEqual(['dev', 'test']);
    });

    it('should parse --colors option', () => {
      const result = parser.parse(['--colors', 'blue,green', 'npm run dev', 'npm run test']);
      
      expect(result.options.colors).toEqual(['blue', 'green']);
    });

    it('should parse --package-manager option', () => {
      const result = parser.parse(['--package-manager', 'yarn', 'yarn dev']);
      
      expect(result.options.packageManager).toBe('yarn');
    });

    it('should parse --pm alias', () => {
      const result = parser.parse(['--pm', 'pnpm', 'pnpm dev']);
      
      expect(result.options.packageManager).toBe('pnpm');
    });

    it('should parse --kill-others-on-fail option', () => {
      const result = parser.parse(['--kill-others-on-fail', 'npm run dev']);
      
      expect(result.options.killOthersOnFail).toBe(true);
    });

    it('should parse --max-concurrency option', () => {
      const result = parser.parse(['--max-concurrency', '4', 'npm run dev']);
      
      expect(result.options.maxConcurrency).toBe(4);
    });

    it('should parse --config option', () => {
      const result = parser.parse(['--config', 'taskly.config.json', 'npm run dev']);
      
      expect(result.options.config).toBe('taskly.config.json');
    });

    it('should parse --verbose option', () => {
      const result = parser.parse(['--verbose', 'npm run dev']);
      
      expect(result.options.verbose).toBe(true);
    });
  });

  describe('short options', () => {
    it('should parse -h for help', () => {
      const result = parser.parse(['-h']);
      expect(result.options.help).toBe(true);
    });

    it('should parse -v for version', () => {
      const result = parser.parse(['-v']);
      expect(result.options.version).toBe(true);
    });

    it('should parse -k for kill-others-on-fail', () => {
      const result = parser.parse(['-k', 'npm run dev']);
      expect(result.options.killOthersOnFail).toBe(true);
    });

    it('should parse -V for verbose', () => {
      const result = parser.parse(['-V', 'npm run dev']);
      expect(result.options.verbose).toBe(true);
    });

    it('should parse -n for names', () => {
      const result = parser.parse(['-n', 'dev,test', 'npm run dev', 'npm run test']);
      expect(result.options.names).toEqual(['dev', 'test']);
    });

    it('should parse -c for colors', () => {
      const result = parser.parse(['-c', 'blue,green', 'npm run dev', 'npm run test']);
      expect(result.options.colors).toEqual(['blue', 'green']);
    });

    it('should parse -p for package-manager', () => {
      const result = parser.parse(['-p', 'yarn', 'yarn dev']);
      expect(result.options.packageManager).toBe('yarn');
    });

    it('should parse -m for max-concurrency', () => {
      const result = parser.parse(['-m', '2', 'npm run dev']);
      expect(result.options.maxConcurrency).toBe(2);
    });

    it('should parse combined short flags', () => {
      const result = parser.parse(['-kV', 'npm run dev']);
      expect(result.options.killOthersOnFail).toBe(true);
      expect(result.options.verbose).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate package manager values', () => {
      expect(() => parser.parse(['--package-manager', 'invalid', 'npm run dev']))
        .toThrow('Invalid package manager: invalid');
    });

    it('should validate max concurrency is positive', () => {
      expect(() => parser.parse(['--max-concurrency', '0', 'npm run dev']))
        .toThrow('Max concurrency must be greater than 0');
    });

    it('should validate max concurrency is a number', () => {
      expect(() => parser.parse(['--max-concurrency', 'invalid', 'npm run dev']))
        .toThrow('Invalid number value: invalid');
    });

    it('should validate names array length matches commands', () => {
      expect(() => parser.parse(['--names', 'dev', 'npm run dev', 'npm run test']))
        .toThrow('Number of names (1) must match number of commands (2)');
    });

    it('should validate colors array length matches commands', () => {
      expect(() => parser.parse(['--colors', 'blue', 'npm run dev', 'npm run test']))
        .toThrow('Number of colors (1) must match number of commands (2)');
    });

    it('should validate commands are not empty', () => {
      expect(() => parser.parse(['', 'npm run test']))
        .toThrow('Command at index 0 is empty');
    });

    it('should throw error for unknown long option', () => {
      expect(() => parser.parse(['--unknown', 'npm run dev']))
        .toThrow('Unknown option: --unknown');
    });

    it('should throw error for unknown short option', () => {
      expect(() => parser.parse(['-x', 'npm run dev']))
        .toThrow('Unknown option: -x');
    });

    it('should require value for options that need it', () => {
      expect(() => parser.parse(['--names']))
        .toThrow('Option --names requires a value');
    });
  });

  describe('complex scenarios', () => {
    it('should parse complex command with all options', () => {
      const result = parser.parse([
        '--names', 'dev,test,lint',
        '--colors', 'blue,green,yellow',
        '--package-manager', 'yarn',
        '--kill-others-on-fail',
        '--max-concurrency', '3',
        '--verbose',
        '--config', 'my-config.json',
        'yarn dev',
        'yarn test',
        'yarn lint'
      ]);

      expect(result.options).toEqual({
        commands: ['yarn dev', 'yarn test', 'yarn lint'],
        names: ['dev', 'test', 'lint'],
        colors: ['blue', 'green', 'yellow'],
        packageManager: 'yarn',
        killOthersOnFail: true,
        maxConcurrency: 3,
        verbose: true,
        config: 'my-config.json',
        help: false,
        version: false
      });
    });

    it('should handle mixed long and short options', () => {
      const result = parser.parse([
        '-kV',
        '--names', 'dev,test',
        '-p', 'yarn',
        'yarn dev',
        'yarn test'
      ]);

      expect(result.options.killOthersOnFail).toBe(true);
      expect(result.options.verbose).toBe(true);
      expect(result.options.names).toEqual(['dev', 'test']);
      expect(result.options.packageManager).toBe('yarn');
    });

    it('should handle commands with spaces and special characters', () => {
      const result = parser.parse([
        'npm run "build:prod"',
        'echo "Hello World"',
        'ls -la'
      ]);

      expect(result.options.commands).toEqual([
        'npm run "build:prod"',
        'echo "Hello World"',
        'ls -la'
      ]);
    });
  });

  describe('help and version handling', () => {
    it('should skip validation when help is requested', () => {
      const result = parser.parse(['--help']);
      expect(result.options.help).toBe(true);
      // Should not throw validation error about missing commands
    });

    it('should skip validation when version is requested', () => {
      const result = parser.parse(['--version']);
      expect(result.options.version).toBe(true);
      // Should not throw validation error about missing commands
    });
  });
});

describe('parseArgs function', () => {
  it('should work as a convenience function', () => {
    const result = parseArgs(['npm run dev', 'npm run test']);
    expect(result.options.commands).toEqual(['npm run dev', 'npm run test']);
  });

  it('should use process.argv when no args provided', () => {
    // This will throw because process.argv.slice(2) will be empty in test environment
    // and we require at least one command
    expect(() => parseArgs()).toThrow('At least one command is required');
  });
});

describe('getHelp function', () => {
  it('should return help text', () => {
    const help = getHelp();
    expect(help).toContain('Taskly - Zero-dependency parallel command execution');
    expect(help).toContain('Usage:');
    expect(help).toContain('Options:');
    expect(help).toContain('Examples:');
    expect(help).toContain('--help');
    expect(help).toContain('--version');
    expect(help).toContain('--names');
    expect(help).toContain('--colors');
  });

  it('should include all supported options in help', () => {
    const help = getHelp();
    expect(help).toContain('--package-manager');
    expect(help).toContain('--kill-others-on-fail');
    expect(help).toContain('--max-concurrency');
    expect(help).toContain('--config');
    expect(help).toContain('--verbose');
  });

  it('should include examples in help', () => {
    const help = getHelp();
    expect(help).toContain('taskly "npm run dev" "npm run test:watch"');
    expect(help).toContain('--names "dev,test"');
    expect(help).toContain('--colors "blue,green"');
  });
});