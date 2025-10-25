import { describe, expect, it } from 'vitest';
import {
  CLIOptions,
  ERROR_CODES,
  TaskConfig,
  TasklyOptions,
} from '../../types/index.js';
import {
  createValidationError,
  sanitizeCommand,
  validateCLIOptions,
  validateColor,
  validateCommand,
  validateIdentifier,
  validateOrThrow,
  validatePackageManager,
  validateTaskConfig,
  validateTasklyOptions,
  validateWorkingDirectory,
} from '../../utils/validation.js';

describe('Validation Utils', () => {
  describe('validateCommand', () => {
    it('should validate valid commands', () => {
      const result = validateCommand('npm run dev');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty commands', () => {
      const result = validateCommand('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Command must be a non-empty string');
    });

    it('should reject whitespace-only commands', () => {
      const result = validateCommand('   ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Command cannot be empty or whitespace only'
      );
    });

    it('should reject non-string commands', () => {
      const result = validateCommand(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Command must be a non-empty string');
    });

    it('should reject commands that are too long', () => {
      const longCommand = 'a'.repeat(1001);
      const result = validateCommand(longCommand);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Command is too long (maximum 1000 characters)'
      );
    });

    it('should detect dangerous patterns', () => {
      const dangerousCommands = [
        'rm -rf /',
        'sudo rm -rf',
        'command; rm file',
        'command && rm file',
        'command | rm',
        'command `rm file`',
        'command $(rm file)',
      ];

      dangerousCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should warn about shell operators', () => {
      const result = validateCommand('npm run build && npm run test');
      expect(result.warnings).toContain(
        'Command contains shell operators - consider splitting into separate tasks'
      );
    });
  });

  describe('sanitizeCommand', () => {
    it('should remove dangerous characters', () => {
      const result = sanitizeCommand('npm run dev; rm -rf /');
      expect(result).toBe('npm run dev rm -rf /');
    });

    it('should normalize whitespace', () => {
      const result = sanitizeCommand('npm    run     dev');
      expect(result).toBe('npm run dev');
    });

    it('should handle empty input', () => {
      const result = sanitizeCommand('');
      expect(result).toBe('');
    });

    it('should limit length', () => {
      const longCommand = 'a'.repeat(1001);
      const result = sanitizeCommand(longCommand);
      expect(result.length).toBe(1000);
    });
  });

  describe('validateIdentifier', () => {
    it('should validate valid identifiers', () => {
      const validIds = ['dev', 'test-server', 'build_prod', 'api-1'];
      validIds.forEach(id => {
        const result = validateIdentifier(id);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid identifiers', () => {
      const invalidIds = ['', '  ', 'dev server', 'test@prod', 'build.js'];
      invalidIds.forEach(id => {
        const result = validateIdentifier(id);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject identifiers that are too long', () => {
      const longId = 'a'.repeat(51);
      const result = validateIdentifier(longId);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Identifier is too long (maximum 50 characters)'
      );
    });
  });

  describe('validateColor', () => {
    it('should validate predefined colors', () => {
      const validColors = ['red', 'green', 'blue', 'brightRed'];
      validColors.forEach(color => {
        const result = validateColor(color);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate hex colors', () => {
      const hexColors = ['#FF0000', '#00ff00', '#0000FF'];
      hexColors.forEach(color => {
        const result = validateColor(color);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate RGB colors', () => {
      const rgbColors = ['rgb(255, 0, 0)', 'rgb(0,255,0)', 'rgb(0, 0, 255)'];
      rgbColors.forEach(color => {
        const result = validateColor(color);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid colors', () => {
      const invalidColors = ['', 'invalid', '#GG0000', 'rgb(256, 0, 0)'];
      invalidColors.forEach(color => {
        const result = validateColor(color);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validatePackageManager', () => {
    it('should validate valid package managers', () => {
      const validPMs = ['npm', 'yarn', 'pnpm', 'bun'];
      validPMs.forEach(pm => {
        const result = validatePackageManager(pm);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid package managers', () => {
      const invalidPMs = ['', 'invalid', 'pip', 'composer'];
      invalidPMs.forEach(pm => {
        const result = validatePackageManager(pm);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateWorkingDirectory', () => {
    it('should validate valid directory paths', () => {
      const validPaths = ['.', './src', '/tmp', 'C:\\Users'];
      validPaths.forEach(path => {
        const result = validateWorkingDirectory(path);
        expect(result.valid).toBe(true);
      });
    });

    it('should warn about parent directory references', () => {
      const result = validateWorkingDirectory('../parent');
      expect(result.warnings).toContain(
        'Working directory contains ".." - ensure this is intentional'
      );
    });

    it('should warn about absolute paths', () => {
      const result = validateWorkingDirectory('/absolute/path');
      expect(result.warnings).toContain(
        'Using absolute path for working directory'
      );
    });
  });

  describe('validateTaskConfig', () => {
    it('should validate valid task config', () => {
      const config: TaskConfig = {
        command: 'npm run dev',
        identifier: 'dev',
        color: 'blue',
        packageManager: 'npm',
        cwd: './src',
      };
      const result = validateTaskConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid task config', () => {
      const config = {
        command: '',
        identifier: 'invalid identifier!',
        color: 'invalid-color',
        packageManager: 'invalid-pm',
      } as TaskConfig;
      const result = validateTaskConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTasklyOptions', () => {
    it('should validate valid options', () => {
      const options: TasklyOptions = {
        tasks: [{ command: 'npm run dev' }, { command: 'npm run test' }],
        killOthersOnFail: true,
        maxConcurrency: 4,
      };
      const result = validateTasklyOptions(options);
      expect(result.valid).toBe(true);
    });

    it('should reject empty tasks array', () => {
      const options: TasklyOptions = {
        tasks: [],
      };
      const result = validateTasklyOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one task is required');
    });

    it('should warn about high concurrency', () => {
      const options: TasklyOptions = {
        tasks: [{ command: 'npm run dev' }],
        maxConcurrency: 25,
      };
      const result = validateTasklyOptions(options);
      expect(result.warnings).toContain(
        'High concurrency may impact system performance'
      );
    });
  });

  describe('validateCLIOptions', () => {
    it('should validate valid CLI options', () => {
      const options: CLIOptions = {
        commands: ['npm run dev', 'npm run test'],
        names: ['dev', 'test'],
        colors: ['blue', 'green'],
        packageManager: 'npm',
      };
      const result = validateCLIOptions(options);
      expect(result.valid).toBe(true);
    });

    it('should reject mismatched array lengths', () => {
      const options: CLIOptions = {
        commands: ['npm run dev', 'npm run test'],
        names: ['dev'], // Length mismatch
      };
      const result = validateCLIOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Names array length must match commands array length'
      );
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with proper format', () => {
      const error = createValidationError(
        'Test error',
        'testField',
        'testValue'
      );
      expect(error.message).toBe('Validation error for testField: Test error');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe('validateOrThrow', () => {
    it('should return value if validation passes', () => {
      const value = 'npm run dev';
      const result = validateOrThrow(value, validateCommand);
      expect(result).toBe(value);
    });

    it('should throw if validation fails', () => {
      expect(() => {
        validateOrThrow('', validateCommand);
      }).toThrow();
    });
  });
});
