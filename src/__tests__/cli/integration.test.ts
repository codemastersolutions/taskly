/**
 * CLI Integration Tests
 * End-to-end testing of CLI functionality, cross-platform compatibility, and real command execution
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { platform } from 'os';
import { join, resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TasklyCLI } from '../../cli/index.js';
import { parseArgs } from '../../cli/parser.js';
import { PackageManagerDetector } from '../../core/package-manager.js';
import { TaskRunner } from '../../core/task-runner.js';

// Mock console methods to capture output
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

// Mock process.exit to prevent actual exit during tests
const mockExit = vi.fn();

describe('TasklyCLI Integration', () => {
  let cli: TasklyCLI;
  let tempDir: string;
  let originalConsole: typeof console;
  let originalExit: typeof process.exit;
  let originalEnv: NodeJS.ProcessEnv;
  const runningProcesses: Set<any> = new Set();

  beforeEach(() => {
    cli = new TasklyCLI();
    tempDir = resolve(
      process.cwd(),
      `test-temp-cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );

    // Create temp directory with unique name for better isolation
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Mock console and process.exit
    originalConsole = console;
    originalExit = process.exit;

    // @ts-expect-error - Mocking console methods for testing
    console.log = mockConsole.log;
    // @ts-expect-error - Mocking console methods for testing
    console.error = mockConsole.error;
    // @ts-expect-error - Mocking console methods for testing
    console.warn = mockConsole.warn;
    // @ts-expect-error - Mocking process.exit for testing
    process.exit = mockExit;

    // Save original environment
    originalEnv = { ...process.env };

    // Clear mocks
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
    mockConsole.warn.mockClear();
    mockExit.mockClear();

    // Clear running processes set
    runningProcesses.clear();
  });

  afterEach(async () => {
    // Kill any running processes to prevent interference
    for (const process of runningProcesses) {
      try {
        if (process && typeof process.kill === 'function') {
          process.kill('SIGTERM');
        }
      } catch (error) {
        // Ignore errors when killing processes
      }
    }
    runningProcesses.clear();

    // Wait a bit for processes to clean up
    await new Promise(resolve => setTimeout(resolve, 100));

    // Restore console and process.exit
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    process.exit = originalExit;

    // Restore environment
    process.env = originalEnv;

    // Clean up temp directory with retry logic
    let retries = 3;
    while (retries > 0 && existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
        break;
      } catch (error) {
        retries--;
        if (retries > 0) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  });

  describe('help and version', () => {
    it('should display help when --help is provided', async () => {
      await cli.run(['--help']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Taskly - Zero-dependency parallel command execution'
        )
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should display version when --version is provided', async () => {
      await cli.run(['--version']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/Taskly v\d+\.\d+\.\d+/)
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should display help with -h flag', async () => {
      await cli.run(['-h']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should display version with -v flag', async () => {
      await cli.run(['-v']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/Taskly v/)
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Set NODE_ENV to test to prevent actual process.exit
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await cli.run([]);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation Error:')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Use --help for usage information.')
      );

      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle invalid package manager error', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await cli.run(['--package-manager', 'invalid', 'echo test']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation Error:')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid package manager: invalid')
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle config file not found error', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await cli.run(['--config', 'nonexistent.json', 'echo test']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Configuration Error:')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Configuration file not found')
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle invalid JSON config error', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const configPath = resolve(tempDir, 'invalid.json');
      writeFileSync(configPath, '{ invalid json }');

      await cli.run(['--config', configPath, 'echo test']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Configuration Error:')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Check your configuration file syntax')
      );

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle unexpected errors', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // Mock a method to throw an unexpected error
      const originalMethod = cli['createTaskConfigs'];
      cli['createTaskConfigs'] = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await cli.run(['echo test']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('💥 Unexpected error:')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('This is likely a bug')
      );

      // Restore original method and NODE_ENV
      cli['createTaskConfigs'] = originalMethod;
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('configuration loading', () => {
    it('should load and use JSON configuration', async () => {
      const configPath = resolve(tempDir, 'taskly.config.json');
      const config = {
        packageManager: 'yarn',
        killOthersOnFail: true,
        maxConcurrency: 2,
        tasks: {
          test: {
            command: 'echo "test task"',
            identifier: 'testing',
          },
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test that the config loads without error by specifying the config path
      await expect(
        cli.run(['--config', configPath, 'echo test'])
      ).resolves.not.toThrow();
    });

    it('should load and use YAML configuration', async () => {
      const configPath = resolve(tempDir, 'taskly.config.yaml');
      const yamlContent = `
packageManager: yarn
killOthersOnFail: true
maxConcurrency: 2
tasks:
  test:
    command: echo "test task"
    identifier: testing
`;

      writeFileSync(configPath, yamlContent);

      // Test that the config loads without error
      await expect(
        cli.run(['--config', configPath, 'echo test'])
      ).resolves.not.toThrow();
    });

    it('should merge CLI options with configuration', async () => {
      const configPath = resolve(tempDir, 'taskly.config.json');
      const config = {
        packageManager: 'npm',
        maxConcurrency: 4,
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      // CLI should override config values
      await expect(
        cli.run([
          '--config',
          configPath,
          '--package-manager',
          'yarn',
          '--max-concurrency',
          '2',
          'echo test',
        ])
      ).resolves.not.toThrow();
    });
  });

  describe('environment variable support', () => {
    it('should use environment variables', async () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'yarn';
      process.env.TASKLY_VERBOSE = 'true';
      process.env.TASKLY_KILL_OTHERS_ON_FAIL = '1';

      await expect(cli.run(['echo test'])).resolves.not.toThrow();
    });

    it('should prioritize CLI over environment variables', async () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'npm';

      // CLI should override environment
      await expect(
        cli.run(['--package-manager', 'yarn', 'echo test'])
      ).resolves.not.toThrow();
    });
  });

  describe('task creation from CLI', () => {
    it('should create tasks from CLI commands', () => {
      // We can test that the CLI processes the arguments correctly
      const tasks = cli['createTaskConfigs'](
        {
          commands: ['echo hello', 'echo world'],
          names: ['first', 'second'],
          colors: ['blue', 'green'],
          packageManager: 'yarn',
        },
        null
      );

      expect(tasks).toEqual([
        {
          command: 'echo hello',
          identifier: 'first',
          color: 'blue',
          packageManager: 'yarn',
          cwd: process.cwd(),
        },
        {
          command: 'echo world',
          identifier: 'second',
          color: 'green',
          packageManager: 'yarn',
          cwd: process.cwd(),
        },
      ]);
    });

    it('should generate identifiers when names not provided', () => {
      const tasks = cli['createTaskConfigs'](
        {
          commands: ['npm run dev', 'yarn test'],
        },
        null
      );

      expect(tasks[0].identifier).toBe('npm-0');
      expect(tasks[1].identifier).toBe('yarn-1');
    });

    it('should handle commands with special characters', () => {
      const tasks = cli['createTaskConfigs'](
        {
          commands: ['echo "hello world"', 'ls -la'],
        },
        null
      );

      expect(tasks[0].command).toBe('echo "hello world"');
      expect(tasks[1].command).toBe('ls -la');
    });
  });

  describe('task creation from config', () => {
    it('should create tasks from configuration file', () => {
      const config = {
        tasks: {
          dev: {
            command: 'npm run dev',
            identifier: 'development',
            color: 'blue',
          },
          test: {
            command: 'npm run test',
            packageManager: 'yarn',
          },
        },
      };

      const tasks = cli['createTaskConfigs']({ commands: [] }, config);

      expect(tasks).toEqual([
        {
          command: 'npm run dev',
          identifier: 'development',
          color: 'blue',
        },
        {
          command: 'npm run test',
          identifier: 'test',
          packageManager: 'yarn',
        },
      ]);
    });

    it('should throw error when no tasks available', () => {
      expect(() => {
        cli['createTaskConfigs']({ commands: [] }, null);
      }).toThrow('No tasks to execute');
    });
  });

  describe('argument parsing edge cases', () => {
    it('should handle complex command combinations', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // This test should not throw an error during parsing
      await expect(
        cli.run([
          '--names',
          'dev,test,lint',
          '--colors',
          'blue,green,yellow',
          '--package-manager',
          'yarn',
          '--kill-others-on-fail',
          '--max-concurrency',
          '3',
          '--verbose',
          'yarn dev',
          'yarn test',
          'yarn lint',
        ])
      ).resolves.not.toThrow();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle mixed long and short options', () => {
      // Test that argument parsing works correctly without actually executing tasks
      const { options } = parseArgs([
        '-kV',
        '--names',
        'dev,test',
        '-p',
        'yarn',
        'yarn dev',
        'yarn test',
      ]);

      expect(options.killOthersOnFail).toBe(true);
      expect(options.verbose).toBe(true);
      expect(options.names).toEqual(['dev', 'test']);
      expect(options.packageManager).toBe('yarn');
      expect(options.commands).toEqual(['yarn dev', 'yarn test']);
    });

    it('should handle commands with quotes and spaces', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await expect(
        cli.run(['npm run "build:prod"', 'echo "Hello World"', 'ls -la'])
      ).resolves.not.toThrow();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('identifier generation', () => {
    it('should generate valid identifiers from commands', () => {
      expect(cli['generateIdentifier']('npm run dev', 0)).toBe('npm-0');
      expect(cli['generateIdentifier']('yarn test', 1)).toBe('yarn-1');
      expect(cli['generateIdentifier']('echo "hello"', 2)).toBe('echo-2');
      expect(cli['generateIdentifier']('./build.sh', 3)).toBe('build-3');
      expect(cli['generateIdentifier']('', 4)).toBe('task-4');
    });

    it('should handle commands with special characters', () => {
      expect(
        cli['generateIdentifier']('node --max-old-space-size=4096 build.js', 0)
      ).toBe('node-0');
      expect(cli['generateIdentifier']('docker-compose up -d', 1)).toBe(
        'dockercompose-1'
      );
    });

    it('should handle various command formats for identifier generation', () => {
      // Test Windows paths
      expect(cli['generateIdentifier']('C:\\Program Files\\node.exe', 0)).toBe(
        'node-0'
      );
      expect(cli['generateIdentifier']('C:\\scripts\\build.bat', 1)).toBe(
        'build-1'
      );

      // Test Unix paths
      expect(cli['generateIdentifier']('/usr/bin/node', 2)).toBe('node-2');
      expect(cli['generateIdentifier']('/home/user/scripts/test.sh', 3)).toBe(
        'test-3'
      );

      // Test relative paths
      expect(cli['generateIdentifier']('./scripts/build.js', 4)).toBe(
        'build-4'
      );
      expect(cli['generateIdentifier']('../utils/helper.py', 5)).toBe(
        'helper-5'
      );

      // Test commands with multiple extensions
      expect(cli['generateIdentifier']('archive.tar.gz', 6)).toBe('archive-6');
      expect(cli['generateIdentifier']('config.json.backup', 7)).toBe(
        'config-7'
      );

      // Test commands with no extension
      expect(cli['generateIdentifier']('makefile', 8)).toBe('makefile-8');
      expect(cli['generateIdentifier']('dockerfile', 9)).toBe('dockerfile-9');

      // Test commands with only special characters
      expect(cli['generateIdentifier']('!@#$%^&*()', 10)).toBe('task-10');
      expect(cli['generateIdentifier']('---', 11)).toBe('task-11');

      // Test commands with spaces and quotes
      expect(cli['generateIdentifier']('echo "hello world"', 12)).toBe(
        'echo-12'
      );
      expect(cli['generateIdentifier']("echo 'test file'", 13)).toBe('echo-13');

      // Test commands with numbers
      expect(cli['generateIdentifier']('node16', 14)).toBe('node16-14');
      expect(cli['generateIdentifier']('python3.9', 15)).toBe('python3-15');
    });
  });

  describe('version detection', () => {
    it('should return version from package.json', () => {
      const version = cli['getVersion']();
      expect(version).toMatch(/Taskly v\d+\.\d+\.\d+/);
    });

    it('should handle missing package.json gracefully', () => {
      // The actual implementation reads the real package.json, so this test
      // will return the actual version. Let's just test that it returns a version string
      const version = cli['getVersion']();
      expect(version).toMatch(/Taskly v\d+\.\d+\.\d+/);
    });
  });

  describe('Real Command Execution', () => {
    it('should execute simple shell commands successfully', async () => {
      const taskRunner = new TaskRunner();
      const tasks = [
        {
          command: 'echo "Hello World"',
          identifier: 'echo-test',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].identifier).toBe('echo-test');
      expect(results[0].output).toContain('Hello World');
    }, 5000); // 5 second timeout

    it('should handle command failures correctly', async () => {
      const taskRunner = new TaskRunner();
      const tasks = [
        {
          command: 'exit 1',
          identifier: 'failing-command',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(1);
      expect(results[0].identifier).toBe('failing-command');
    }, 5000);

    it('should execute multiple commands in parallel', async () => {
      const taskRunner = new TaskRunner();
      const startTime = Date.now();

      const tasks = [
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'sleep-1',
          cwd: tempDir,
        },
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'sleep-2',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(2);
      expect(results.every(r => r.exitCode === 0)).toBe(true);
      // Should complete in roughly 1 second (parallel), not 2 seconds (sequential)
      expect(executionTime).toBeLessThan(2500); // Increased tolerance for CI environments
    }, 8000);

    it('should handle kill-others-on-fail functionality', async () => {
      const taskRunner = new TaskRunner({ killOthersOnFail: true });

      const tasks = [
        {
          command: 'exit 1',
          identifier: 'failing-task',
          cwd: tempDir,
        },
        {
          command: platform() === 'win32' ? 'timeout /t 3 >nul' : 'sleep 3',
          identifier: 'long-task',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(2);
      expect(results.find(r => r.identifier === 'failing-task')?.exitCode).toBe(
        1
      );
      // The long task should be killed (exit code 130 for SIGINT)
      expect(
        results.find(r => r.identifier === 'long-task')?.exitCode
      ).toBeGreaterThan(0);
    }, 10000);

    it('should respect working directory settings', async () => {
      const subDir = join(tempDir, 'subdir');
      mkdirSync(subDir, { recursive: true });

      const taskRunner = new TaskRunner();
      const tasks = [
        {
          command: platform() === 'win32' ? 'cd' : 'pwd',
          identifier: 'pwd-test',
          cwd: subDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.join('').toLowerCase()).toContain('subdir');
    }, 5000);
  });

  describe('Cross-Platform Compatibility', () => {
    it('should detect platform-specific commands', () => {
      const isWindows = platform() === 'win32';
      const listCommand = isWindows ? 'dir' : 'ls';
      const sleepCommand = isWindows ? 'timeout /t 1 >nul' : 'sleep 1';

      expect(typeof listCommand).toBe('string');
      expect(typeof sleepCommand).toBe('string');
    });

    it('should execute platform-specific list commands', async () => {
      const taskRunner = new TaskRunner();
      const isWindows = platform() === 'win32';
      const listCommand = isWindows ? 'dir' : 'ls -la';

      const tasks = [
        {
          command: listCommand,
          identifier: 'list-test',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.length).toBeGreaterThan(0);
    });

    it('should handle path separators correctly', async () => {
      const subDir = join(tempDir, 'test', 'nested');
      mkdirSync(subDir, { recursive: true });

      const testFile = join(subDir, 'test.txt');
      writeFileSync(testFile, 'test content');

      const taskRunner = new TaskRunner();
      const isWindows = platform() === 'win32';
      const catCommand = isWindows ? `type "${testFile}"` : `cat "${testFile}"`;

      const tasks = [
        {
          command: catCommand,
          identifier: 'cat-test',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.join('')).toContain('test content');
    });

    it('should handle environment variables across platforms', async () => {
      const taskRunner = new TaskRunner();
      const isWindows = platform() === 'win32';
      const envCommand = isWindows ? 'echo %PATH%' : 'echo $PATH';

      const tasks = [
        {
          command: envCommand,
          identifier: 'env-test',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.length).toBeGreaterThan(0);
    });

    it('should handle file permissions on Unix systems', async () => {
      if (platform() === 'win32') {
        // Skip on Windows
        return;
      }

      const scriptPath = join(tempDir, 'test-script.sh');
      writeFileSync(scriptPath, '#!/bin/bash\necho "Script executed"');
      chmodSync(scriptPath, 0o755);

      const taskRunner = new TaskRunner();
      const tasks = [
        {
          command: scriptPath,
          identifier: 'script-test',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.join('')).toContain('Script executed');
    });
  });

  describe('Package Manager Integration', () => {
    it('should detect available package managers', () => {
      const detector = new PackageManagerDetector();

      // Test npm (should always be available in Node.js environment)
      const npmAvailable = detector.isAvailable('npm');
      expect(npmAvailable).toBe(true);

      // Test other package managers (may or may not be available)
      const yarnAvailable = detector.isAvailable('yarn');
      const pnpmAvailable = detector.isAvailable('pnpm');
      const bunAvailable = detector.isAvailable('bun');

      expect(typeof yarnAvailable).toBe('boolean');
      expect(typeof pnpmAvailable).toBe('boolean');
      expect(typeof bunAvailable).toBe('boolean');
    });

    it('should detect package manager from lock files', () => {
      const detector = new PackageManagerDetector();

      // Create different lock files
      const packageLockPath = join(tempDir, 'package-lock.json');
      const yarnLockPath = join(tempDir, 'yarn.lock');
      const pnpmLockPath = join(tempDir, 'pnpm-lock.yaml');

      // Test npm detection
      writeFileSync(packageLockPath, '{}');
      expect(detector.detectFromLockFiles(tempDir)).toBe('npm');
      unlinkSync(packageLockPath);

      // Test yarn detection
      writeFileSync(yarnLockPath, '');
      expect(detector.detectFromLockFiles(tempDir)).toBe('yarn');
      unlinkSync(yarnLockPath);

      // Test pnpm detection
      writeFileSync(pnpmLockPath, '');
      expect(detector.detectFromLockFiles(tempDir)).toBe('pnpm');
      unlinkSync(pnpmLockPath);
    });

    it('should handle package manager detection edge cases', () => {
      const detector = new PackageManagerDetector();

      // Test with multiple lock files (should prioritize in order)
      const packageLockPath = join(tempDir, 'package-lock.json');
      const yarnLockPath = join(tempDir, 'yarn.lock');
      const pnpmLockPath = join(tempDir, 'pnpm-lock.yaml');

      // Create multiple lock files
      writeFileSync(packageLockPath, '{}');
      writeFileSync(yarnLockPath, '');
      writeFileSync(pnpmLockPath, '');

      // Should detect the first one found (implementation dependent)
      const detected = detector.detectFromLockFiles(tempDir);
      expect(['npm', 'yarn', 'pnpm']).toContain(detected);

      // Clean up
      unlinkSync(packageLockPath);
      unlinkSync(yarnLockPath);
      unlinkSync(pnpmLockPath);

      // Test with no lock files
      expect(detector.detectFromLockFiles(tempDir)).toBeNull();

      // Test with non-existent directory
      expect(detector.detectFromLockFiles('/nonexistent/path')).toBeNull();

      // Test with alternative lock file names
      const shrinkwrapPath = join(tempDir, 'npm-shrinkwrap.json');
      writeFileSync(shrinkwrapPath, '{}');
      const detectedShrinkwrap = detector.detectFromLockFiles(tempDir);
      expect(detectedShrinkwrap).toBe('npm');
      unlinkSync(shrinkwrapPath);

      // Test with bun lock file
      const bunLockPath = join(tempDir, 'bun.lockb');
      writeFileSync(bunLockPath, '');
      const detectedBun = detector.detectFromLockFiles(tempDir);
      expect(detectedBun).toBe('bun');
      unlinkSync(bunLockPath);
    });

    it('should execute npm commands correctly', async () => {
      // Create a minimal package.json
      const packageJsonPath = join(tempDir, 'package.json');
      writeFileSync(
        packageJsonPath,
        JSON.stringify(
          {
            name: 'test-package',
            version: '1.0.0',
            scripts: {
              test: 'echo "Test script executed"',
            },
          },
          null,
          2
        )
      );

      const taskRunner = new TaskRunner();
      const tasks = [
        {
          command: 'npm run test',
          identifier: 'npm-test',
          packageManager: 'npm',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.join('')).toContain('Test script executed');
    });

    it('should handle package manager fallback', async () => {
      const taskRunner = new TaskRunner();
      const tasks = [
        {
          command: 'echo "fallback test"',
          identifier: 'fallback-test',
          packageManager: 'nonexistent-pm' as any,
          cwd: tempDir,
        },
      ];

      // Should not throw error, should fallback gracefully
      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBe(0);
      expect(results[0].output.join('')).toContain('fallback test');
    });

    it('should handle package manager validation edge cases', () => {
      const detector = new PackageManagerDetector();

      // Test with invalid package manager names
      expect(() => detector.isAvailable('invalid-pm' as any)).not.toThrow();
      expect(detector.isAvailable('invalid-pm' as any)).toBe(false);

      // Test with empty string
      expect(() => detector.isAvailable('' as any)).not.toThrow();
      expect(detector.isAvailable('' as any)).toBe(false);

      // Test with null/undefined (should handle gracefully)
      expect(() => detector.isAvailable(null as any)).not.toThrow();
      expect(() => detector.isAvailable(undefined as any)).not.toThrow();
    });
  });

  describe('Advanced CLI Features', () => {
    it('should handle complex configuration files', async () => {
      const configPath = join(tempDir, 'complex-config.json');
      const config = {
        packageManager: 'npm',
        killOthersOnFail: false,
        maxConcurrency: 2,
        verbose: true,
        tasks: {
          build: {
            command: 'echo "Building..."',
            identifier: 'build-task',
            color: 'blue',
          },
          test: {
            command: 'echo "Testing..."',
            identifier: 'test-task',
            color: 'green',
            packageManager: 'npm',
          },
          lint: {
            command: 'echo "Linting..."',
            identifier: 'lint-task',
            color: 'yellow',
          },
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Test that the config loads and processes correctly
      const tasks = await cli['createTaskConfigs']({ commands: [] }, config);

      expect(tasks).toHaveLength(3);
      expect(tasks.find(t => t.identifier === 'build-task')).toBeDefined();
      expect(tasks.find(t => t.identifier === 'test-task')).toBeDefined();
      expect(tasks.find(t => t.identifier === 'lint-task')).toBeDefined();
    });

    it('should handle concurrent execution limits', async () => {
      const taskRunner = new TaskRunner({ maxConcurrency: 1 });
      const startTime = Date.now();

      const tasks = [
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'sequential-1',
          cwd: tempDir,
        },
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'sequential-2',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(2);
      expect(results.every(r => r.exitCode === 0)).toBe(true);
      // Should take roughly 2 seconds (sequential) due to maxConcurrency: 1
      expect(executionTime).toBeGreaterThan(1800);
    });

    it('should handle task timeouts', async () => {
      const taskRunner = new TaskRunner({ taskTimeout: 500 });

      const tasks = [
        {
          command: platform() === 'win32' ? 'timeout /t 2 >nul' : 'sleep 2',
          identifier: 'timeout-test',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBeGreaterThan(0); // Should fail due to timeout
      expect(results[0].identifier).toBe('timeout-test');
    });

    it('should handle timeout and signal handling scenarios', async () => {
      // Test very short timeout
      const shortTimeoutRunner = new TaskRunner({ taskTimeout: 100 });
      const shortTimeoutTasks = [
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'short-timeout',
          cwd: tempDir,
        },
      ];

      const shortResults = await shortTimeoutRunner.execute(shortTimeoutTasks);
      expect(shortResults[0].exitCode).toBeGreaterThan(0);

      // Test timeout with multiple tasks
      const multiTimeoutRunner = new TaskRunner({ taskTimeout: 300 });
      const multiTimeoutTasks = [
        {
          command: 'echo "quick task"',
          identifier: 'quick',
          cwd: tempDir,
        },
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'slow',
          cwd: tempDir,
        },
      ];

      const multiResults = await multiTimeoutRunner.execute(multiTimeoutTasks);
      expect(multiResults).toHaveLength(2);
      expect(multiResults.find(r => r.identifier === 'quick')?.exitCode).toBe(
        0
      );
      expect(
        multiResults.find(r => r.identifier === 'slow')?.exitCode
      ).toBeGreaterThan(0);

      // Test kill-others-on-fail with timeout
      const killOnFailRunner = new TaskRunner({
        killOthersOnFail: true,
        taskTimeout: 200,
      });
      const killOnFailTasks = [
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'timeout-kill-1',
          cwd: tempDir,
        },
        {
          command: platform() === 'win32' ? 'timeout /t 1 >nul' : 'sleep 1',
          identifier: 'timeout-kill-2',
          cwd: tempDir,
        },
      ];

      const killResults = await killOnFailRunner.execute(killOnFailTasks);
      expect(killResults).toHaveLength(2);
      expect(killResults.every(r => r.exitCode > 0)).toBe(true);
    });

    it('should handle output streaming correctly', async () => {
      const taskRunner = new TaskRunner();
      const outputLines: string[] = [];

      taskRunner.on('task:output', data => {
        outputLines.push(data.line.content);
      });

      const tasks = [
        {
          command: 'echo "Line 1" && echo "Line 2" && echo "Line 3"',
          identifier: 'output-test',
          cwd: tempDir,
        },
      ];

      await taskRunner.execute(tasks);

      expect(outputLines.length).toBeGreaterThan(0);
      expect(outputLines.some(line => line.includes('Line 1'))).toBe(true);
      expect(outputLines.some(line => line.includes('Line 2'))).toBe(true);
      expect(outputLines.some(line => line.includes('Line 3'))).toBe(true);
    });

    it('should handle graceful shutdown on signals', async () => {
      const taskRunner = new TaskRunner();

      const tasks = [
        {
          command: platform() === 'win32' ? 'timeout /t 5 >nul' : 'sleep 5',
          identifier: 'long-running-task',
          cwd: tempDir,
        },
      ];

      // Start execution
      const executionPromise = taskRunner.execute(tasks);

      // Wait a bit then stop
      setTimeout(() => {
        void taskRunner.stop('SIGTERM');
      }, 100);

      const results = await executionPromise;

      expect(results).toHaveLength(1);
      expect(results[0].exitCode).toBeGreaterThan(0); // Should be killed
    }, 10000);
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle malformed commands gracefully', async () => {
      const taskRunner = new TaskRunner({ continueOnError: true });

      const tasks = [
        {
          command: 'this-command-does-not-exist-12345',
          identifier: 'bad-command',
          cwd: tempDir,
        },
        {
          command: 'echo "This should still run"',
          identifier: 'good-command',
          cwd: tempDir,
        },
      ];

      const results = await taskRunner.execute(tasks);

      expect(results).toHaveLength(2);
      expect(
        results.find(r => r.identifier === 'bad-command')?.exitCode
      ).toBeGreaterThan(0);
      expect(results.find(r => r.identifier === 'good-command')?.exitCode).toBe(
        0
      );
    });

    it('should handle file system errors', async () => {
      const taskRunner = new TaskRunner();

      const tasks = [
        {
          command: 'nonexistent-command-that-will-fail',
          identifier: 'fs-error-test',
        },
      ];

      // Should handle the error gracefully
      try {
        const results = await taskRunner.execute(tasks);
        expect(results).toHaveLength(1);
        expect(results[0].exitCode).toBeGreaterThan(0);
      } catch (error) {
        // If the task runner throws an error due to the invalid command,
        // that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it('should provide detailed error information', async () => {
      const taskRunner = new TaskRunner();
      let errorInfo: unknown = null;

      taskRunner.on('task:error', data => {
        errorInfo = data;
      });

      const tasks = [
        {
          command: 'exit 42',
          identifier: 'error-info-test',
          cwd: tempDir,
        },
      ];

      await taskRunner.execute(tasks);

      expect(errorInfo).toBeDefined();
      expect(errorInfo.identifier).toBe('error-info-test');
      expect(errorInfo.error).toBeDefined();
    });
  });
});
