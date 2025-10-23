/**
 * Configuration Loading Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { ConfigLoader, loadConfig, mergeConfig } from '../../cli/config.js';
import { TasklyError, ERROR_CODES, CLIOptions } from '../../types/index.js';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    loader = new ConfigLoader();
    tempDir = resolve(process.cwd(), 'test-temp');
    
    // Create temp directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Clean up temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore environment
    process.env = originalEnv;
  });

  describe('JSON configuration loading', () => {
    it('should load valid JSON configuration', async () => {
      const configPath = resolve(tempDir, 'taskly.config.json');
      const config = {
        packageManager: 'yarn',
        killOthersOnFail: true,
        maxConcurrency: 4,
        colors: ['blue', 'green'],
        tasks: {
          dev: {
            command: 'yarn dev',
            identifier: 'development'
          }
        }
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = await loader.loadConfig(configPath);
      expect(result).toEqual(config);
    });

    it('should throw error for invalid JSON', async () => {
      const configPath = resolve(tempDir, 'invalid.json');
      writeFileSync(configPath, '{ invalid json }');

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('Invalid JSON in configuration file');
    });

    it('should auto-discover configuration files', async () => {
      const config = { packageManager: 'npm' };
      writeFileSync(resolve(tempDir, 'taskly.config.json'), JSON.stringify(config));

      const result = await loader.loadConfig(undefined, tempDir);
      expect(result).toEqual(config);
    });

    it('should return null when no config file found', async () => {
      const result = await loader.loadConfig(undefined, tempDir);
      expect(result).toBeNull();
    });
  });

  describe('YAML configuration loading', () => {
    it('should load valid YAML configuration', async () => {
      const configPath = resolve(tempDir, 'taskly.config.yaml');
      const yamlContent = `packageManager: yarn
killOthersOnFail: true
maxConcurrency: 4
colors: [blue, green]
tasks:
  dev:
    command: yarn dev
    identifier: development
  test:
    command: yarn test
    color: green`;

      writeFileSync(configPath, yamlContent);

      const result = await loader.loadConfig(configPath);
      expect(result).toEqual({
        packageManager: 'yarn',
        killOthersOnFail: true,
        maxConcurrency: 4,
        colors: ['blue', 'green'],
        tasks: {
          dev: {
            command: 'yarn dev',
            identifier: 'development'
          },
          test: {
            command: 'yarn test',
            color: 'green'
          }
        }
      });
    });

    it('should handle YAML with different data types', async () => {
      const configPath = resolve(tempDir, 'test.yaml');
      const yamlContent = `
stringValue: "hello world"
numberValue: 42
booleanTrue: true
booleanFalse: false
nullValue: null
arrayValue: [1, 2, 3]
`;

      writeFileSync(configPath, yamlContent);

      const result = await loader.loadConfig(configPath);
      expect(result).toEqual({
        stringValue: 'hello world',
        numberValue: 42,
        booleanTrue: true,
        booleanFalse: false,
        nullValue: null,
        arrayValue: [1, 2, 3]
      });
    });

    it('should throw error for invalid YAML', async () => {
      const configPath = resolve(tempDir, 'invalid.yaml');
      writeFileSync(configPath, `invalid:
- item1
  - nested without parent array`);

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('Invalid YAML in configuration file');
    });
  });

  describe('JavaScript configuration loading', () => {
    it('should load ES module configuration', async () => {
      const configPath = resolve(tempDir, 'taskly.config.mjs');
      const jsContent = `
export default {
  packageManager: 'pnpm',
  killOthersOnFail: false,
  tasks: {
    build: {
      command: 'pnpm build'
    }
  }
};
`;

      writeFileSync(configPath, jsContent);

      const result = await loader.loadConfig(configPath);
      expect(result).toEqual({
        packageManager: 'pnpm',
        killOthersOnFail: false,
        tasks: {
          build: {
            command: 'pnpm build'
          }
        }
      });
    });
  });

  describe('configuration validation', () => {
    it('should validate package manager', async () => {
      const configPath = resolve(tempDir, 'invalid-pm.json');
      const config = { packageManager: 'invalid-pm' };
      writeFileSync(configPath, JSON.stringify(config));

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('Invalid package manager in config: invalid-pm');
    });

    it('should validate maxConcurrency', async () => {
      const configPath = resolve(tempDir, 'invalid-concurrency.json');
      const config = { maxConcurrency: -1 };
      writeFileSync(configPath, JSON.stringify(config));

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('maxConcurrency must be a positive number');
    });

    it('should validate killOthersOnFail type', async () => {
      const configPath = resolve(tempDir, 'invalid-kill.json');
      const config = { killOthersOnFail: 'yes' };
      writeFileSync(configPath, JSON.stringify(config));

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('killOthersOnFail must be a boolean');
    });

    it('should validate colors is array', async () => {
      const configPath = resolve(tempDir, 'invalid-colors.json');
      const config = { colors: 'blue,green' };
      writeFileSync(configPath, JSON.stringify(config));

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('colors must be an array');
    });

    it('should validate task structure', async () => {
      const configPath = resolve(tempDir, 'invalid-task.json');
      const config = {
        tasks: {
          dev: {
            // Missing command
            identifier: 'dev'
          }
        }
      };
      writeFileSync(configPath, JSON.stringify(config));

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('Task "dev" must have a command string');
    });

    it('should validate task package manager', async () => {
      const configPath = resolve(tempDir, 'invalid-task-pm.json');
      const config = {
        tasks: {
          dev: {
            command: 'dev',
            packageManager: 'invalid'
          }
        }
      };
      writeFileSync(configPath, JSON.stringify(config));

      await expect(loader.loadConfig(configPath))
        .rejects.toThrow('Invalid package manager for task "dev": invalid');
    });
  });

  describe('environment variable loading', () => {
    it('should load package manager from environment', () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'yarn';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.packageManager).toBe('yarn');
    });

    it('should load kill others on fail from environment', () => {
      process.env.TASKLY_KILL_OTHERS_ON_FAIL = 'true';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.killOthersOnFail).toBe(true);
    });

    it('should load max concurrency from environment', () => {
      process.env.TASKLY_MAX_CONCURRENCY = '8';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.maxConcurrency).toBe(8);
    });

    it('should load verbose from environment', () => {
      process.env.TASKLY_VERBOSE = '1';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.verbose).toBe(true);
    });

    it('should load config path from environment', () => {
      process.env.TASKLY_CONFIG = 'my-config.json';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.config).toBe('my-config.json');
    });

    it('should load colors from environment', () => {
      process.env.TASKLY_COLORS = 'blue,green,red';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.colors).toEqual(['blue', 'green', 'red']);
    });

    it('should load names from environment', () => {
      process.env.TASKLY_NAMES = 'dev,test,build';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.names).toEqual(['dev', 'test', 'build']);
    });

    it('should parse boolean values correctly', () => {
      const testCases = [
        { value: 'true', expected: true },
        { value: '1', expected: true },
        { value: 'yes', expected: true },
        { value: 'on', expected: true },
        { value: 'enabled', expected: true },
        { value: 'false', expected: false },
        { value: '0', expected: false },
        { value: 'no', expected: false },
        { value: 'off', expected: false },
        { value: 'disabled', expected: false }
      ];

      for (const testCase of testCases) {
        process.env.TASKLY_VERBOSE = testCase.value;
        
        const cliOptions: CLIOptions = { commands: ['test'] };
        const result = loader.mergeWithCLIOptions(null, cliOptions);
        
        expect(result.verbose).toBe(testCase.expected);
      }
    });

    it('should ignore invalid package manager from environment', () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'invalid';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.packageManager).toBeUndefined();
    });

    it('should ignore invalid max concurrency from environment', () => {
      process.env.TASKLY_MAX_CONCURRENCY = 'invalid';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      
      expect(result.maxConcurrency).toBeUndefined();
    });
  });

  describe('configuration merging priority', () => {
    it('should prioritize CLI options over config and environment', () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'npm';
      
      const config = { packageManager: 'yarn' as const };
      const cliOptions: CLIOptions = { 
        commands: ['test'],
        packageManager: 'pnpm'
      };
      
      const result = loader.mergeWithCLIOptions(config, cliOptions);
      expect(result.packageManager).toBe('pnpm'); // CLI wins
    });

    it('should prioritize config over environment when CLI not set', () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'npm';
      
      const config = { packageManager: 'yarn' as const };
      const cliOptions: CLIOptions = { commands: ['test'] };
      
      const result = loader.mergeWithCLIOptions(config, cliOptions);
      expect(result.packageManager).toBe('yarn'); // Config wins over env
    });

    it('should use environment when config and CLI not set', () => {
      process.env.TASKLY_PACKAGE_MANAGER = 'npm';
      
      const cliOptions: CLIOptions = { commands: ['test'] };
      
      const result = loader.mergeWithCLIOptions(null, cliOptions);
      expect(result.packageManager).toBe('npm'); // Env is used
    });
  });

  describe('task conversion', () => {
    it('should convert config tasks to task configs', () => {
      const config = {
        tasks: {
          dev: {
            command: 'npm run dev',
            color: 'blue'
          },
          test: {
            command: 'npm run test',
            identifier: 'testing',
            packageManager: 'yarn' as const
          }
        }
      };

      const tasks = loader.convertConfigTasks(config);
      
      expect(tasks).toEqual([
        {
          command: 'npm run dev',
          color: 'blue',
          identifier: 'dev'
        },
        {
          command: 'npm run test',
          identifier: 'testing',
          packageManager: 'yarn'
        }
      ]);
    });

    it('should filter tasks by names when provided', () => {
      const config = {
        tasks: {
          dev: { command: 'npm run dev' },
          test: { command: 'npm run test' },
          build: { command: 'npm run build' }
        }
      };

      const tasks = loader.convertConfigTasks(config, ['dev', 'build']);
      
      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.identifier)).toEqual(['dev', 'build']);
    });

    it('should return empty array when no tasks in config', () => {
      const config = {};
      const tasks = loader.convertConfigTasks(config);
      expect(tasks).toEqual([]);
    });
  });

  describe('package.json configuration', () => {
    it('should load taskly config from package.json', () => {
      const packageJsonPath = resolve(tempDir, 'package.json');
      const packageJson = {
        name: 'test-project',
        taskly: {
          packageManager: 'yarn',
          killOthersOnFail: true
        }
      };

      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      const result = loader.loadPackageJsonConfig(tempDir);
      expect(result).toEqual({
        packageManager: 'yarn',
        killOthersOnFail: true
      });
    });

    it('should return null when no taskly config in package.json', () => {
      const packageJsonPath = resolve(tempDir, 'package.json');
      const packageJson = { name: 'test-project' };

      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      const result = loader.loadPackageJsonConfig(tempDir);
      expect(result).toBeNull();
    });

    it('should return null when package.json does not exist', () => {
      const result = loader.loadPackageJsonConfig(tempDir);
      expect(result).toBeNull();
    });

    it('should return null when package.json is invalid', () => {
      const packageJsonPath = resolve(tempDir, 'package.json');
      writeFileSync(packageJsonPath, '{ invalid json }');

      const result = loader.loadPackageJsonConfig(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('example config generation', () => {
    it('should generate example configurations', () => {
      const examples = loader.generateExampleConfigs();
      
      expect(examples.json).toContain('packageManager');
      expect(examples.yaml).toContain('packageManager:');
      expect(examples.javascript).toContain('export default');
      
      // Validate JSON is parseable
      expect(() => JSON.parse(examples.json)).not.toThrow();
      
      // Validate YAML contains expected structure
      expect(examples.yaml).toContain('tasks:');
      expect(examples.yaml).toContain('dev:');
      expect(examples.yaml).toContain('command:');
    });
  });
});

describe('convenience functions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = resolve(process.cwd(), 'test-temp-convenience');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should work as convenience function', async () => {
      const configPath = resolve(tempDir, 'taskly.config.json');
      const config = { packageManager: 'yarn' };
      writeFileSync(configPath, JSON.stringify(config));

      const result = await loadConfig(configPath);
      expect(result).toEqual(config);
    });
  });

  describe('mergeConfig', () => {
    it('should work as convenience function', () => {
      const config = { packageManager: 'yarn' as const };
      const cliOptions: CLIOptions = { commands: ['test'] };

      const result = mergeConfig(config, cliOptions);
      expect(result.packageManager).toBe('yarn');
    });
  });
});