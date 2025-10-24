/**
 * Validation utilities for Taskly library
 * Provides input validation, command sanitization, and parameter validation
 */

import {
  TaskConfig,
  TasklyOptions,
  CLIOptions,
  PackageManager,
  Color,
  ValidationResult,
  TasklyError,
  ERROR_CODES,
} from '../types/index.js';

// Security patterns for command validation
const DANGEROUS_PATTERNS = [
  /[;&|`$(){}[\]]/, // Shell metacharacters
  /\$\(/, // Command substitution
  /`[^`]*`/, // Backtick command substitution
  /\|\s*\w+/, // Pipe to commands
  />\s*\/dev/, // Redirect to devices
  /rm\s+-rf/i, // Dangerous rm commands
  /sudo\s+/i, // Sudo commands
  /chmod\s+/i, // Permission changes
];

const ALLOWED_SHELL_CHARS = /^[a-zA-Z0-9\s\-_./:@=+,]*$/;

/**
 * Validates a command string for security and syntax
 */
export function validateCommand(command: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!command || typeof command !== 'string') {
    errors.push('Command must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const trimmedCommand = command.trim();
  if (trimmedCommand.length === 0) {
    errors.push('Command cannot be empty or whitespace only');
    return { valid: false, errors, warnings };
  }

  if (trimmedCommand.length > 1000) {
    errors.push('Command is too long (maximum 1000 characters)');
    return { valid: false, errors, warnings };
  }

  // Security validation
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedCommand)) {
      errors.push(
        `Command contains potentially dangerous pattern: ${pattern.source}`
      );
    }
  }

  // Check for suspicious characters
  if (!ALLOWED_SHELL_CHARS.test(trimmedCommand)) {
    warnings.push('Command contains special characters that may cause issues');
  }

  // Check for common issues
  if (trimmedCommand.includes('&&') || trimmedCommand.includes('||')) {
    warnings.push(
      'Command contains shell operators - consider splitting into separate tasks'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes a command string by removing or escaping dangerous characters
 */
export function sanitizeCommand(command: string): string {
  if (!command || typeof command !== 'string') {
    return '';
  }

  return command
    .trim()
    .replace(/[;&|`$(){}[\]]/g, '') // Remove dangerous shell metacharacters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 1000); // Limit length
}

/**
 * Validates a task identifier
 */
export function validateIdentifier(identifier: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!identifier || typeof identifier !== 'string') {
    errors.push('Identifier must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const trimmed = identifier.trim();
  if (trimmed.length === 0) {
    errors.push('Identifier cannot be empty or whitespace only');
    return { valid: false, errors, warnings };
  }

  if (trimmed.length > 50) {
    errors.push('Identifier is too long (maximum 50 characters)');
    return { valid: false, errors, warnings };
  }

  // Check for valid identifier characters
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    errors.push(
      'Identifier can only contain letters, numbers, hyphens, and underscores'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a color value
 */
export function validateColor(color: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!color || typeof color !== 'string') {
    errors.push('Color must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const trimmed = color.trim();
  if (trimmed.length === 0) {
    errors.push('Color cannot be empty or whitespace only');
    return { valid: false, errors, warnings };
  }

  const validColors: Color[] = [
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'brightRed',
    'brightGreen',
    'brightYellow',
    'brightBlue',
    'brightMagenta',
    'brightCyan',
    'white',
    'black',
    'gray',
  ];

  // Check if it's a predefined color (case-insensitive)
  if (
    validColors.some(
      validColor => validColor.toLowerCase() === trimmed.toLowerCase()
    )
  ) {
    return { valid: true, errors, warnings };
  }

  // Check if it's a hex color
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return { valid: true, errors, warnings };
  }

  // Check if it's an RGB color
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(trimmed)) {
    return { valid: true, errors, warnings };
  }

  errors.push(
    `Invalid color: ${color}. Use predefined colors, hex (#RRGGBB), or RGB format`
  );
  return { valid: false, errors, warnings };
}

/**
 * Validates a package manager value
 */
export function validatePackageManager(pm: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pm || typeof pm !== 'string') {
    errors.push('Package manager must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const validPMs: PackageManager[] = ['npm', 'yarn', 'pnpm', 'bun'];
  const trimmed = pm.trim().toLowerCase();

  if (!validPMs.includes(trimmed as PackageManager)) {
    errors.push(
      `Invalid package manager: ${pm}. Valid options: ${validPMs.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a working directory path
 */
export function validateWorkingDirectory(cwd: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cwd || typeof cwd !== 'string') {
    errors.push('Working directory must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const trimmed = cwd.trim();
  if (trimmed.length === 0) {
    errors.push('Working directory cannot be empty or whitespace only');
    return { valid: false, errors, warnings };
  }

  // Check for dangerous paths
  if (trimmed.includes('..')) {
    warnings.push(
      'Working directory contains ".." - ensure this is intentional'
    );
  }

  // Check for absolute vs relative paths
  if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) {
    warnings.push('Using absolute path for working directory');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a complete TaskConfig object
 */
export function validateTaskConfig(config: TaskConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Task configuration must be an object');
    return { valid: false, errors, warnings };
  }

  // Validate command (required)
  const commandValidation = validateCommand(config.command);
  errors.push(...commandValidation.errors);
  warnings.push(...commandValidation.warnings);

  // Validate optional identifier
  if (config.identifier !== undefined) {
    const identifierValidation = validateIdentifier(config.identifier);
    errors.push(...identifierValidation.errors);
    warnings.push(...identifierValidation.warnings);
  }

  // Validate optional color
  if (config.color !== undefined) {
    const colorValidation = validateColor(config.color);
    errors.push(...colorValidation.errors);
    warnings.push(...colorValidation.warnings);
  }

  // Validate optional package manager
  if (config.packageManager !== undefined) {
    const pmValidation = validatePackageManager(config.packageManager);
    errors.push(...pmValidation.errors);
    warnings.push(...pmValidation.warnings);
  }

  // Validate optional working directory
  if (config.cwd !== undefined) {
    const cwdValidation = validateWorkingDirectory(config.cwd);
    errors.push(...cwdValidation.errors);
    warnings.push(...cwdValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates TasklyOptions object
 */
export function validateTasklyOptions(
  options: TasklyOptions
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!options || typeof options !== 'object') {
    errors.push('Options must be an object');
    return { valid: false, errors, warnings };
  }

  // Validate tasks array (required)
  if (!Array.isArray(options.tasks)) {
    errors.push('Tasks must be an array');
    return { valid: false, errors, warnings };
  }

  if (options.tasks.length === 0) {
    errors.push('At least one task is required');
    return { valid: false, errors, warnings };
  }

  if (options.tasks.length > 50) {
    warnings.push('Large number of tasks may impact performance');
  }

  // Validate each task
  options.tasks.forEach((task, index) => {
    const taskValidation = validateTaskConfig(task);
    taskValidation.errors.forEach(error => {
      errors.push(`Task ${index + 1}: ${error}`);
    });
    taskValidation.warnings.forEach(warning => {
      warnings.push(`Task ${index + 1}: ${warning}`);
    });
  });

  // Validate optional maxConcurrency
  if (options.maxConcurrency !== undefined) {
    if (
      typeof options.maxConcurrency !== 'number' ||
      options.maxConcurrency < 1
    ) {
      errors.push('Max concurrency must be a positive number');
    } else if (options.maxConcurrency > 20) {
      warnings.push('High concurrency may impact system performance');
    }
  }

  // Validate optional prefix
  if (options.prefix !== undefined) {
    if (typeof options.prefix !== 'string') {
      errors.push('Prefix must be a string');
    } else if (options.prefix.length > 20) {
      warnings.push('Long prefix may clutter output');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates CLI options
 */
export function validateCLIOptions(options: CLIOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!options || typeof options !== 'object') {
    errors.push('CLI options must be an object');
    return { valid: false, errors, warnings };
  }

  // Validate commands array (required)
  if (!Array.isArray(options.commands)) {
    errors.push('Commands must be an array');
    return { valid: false, errors, warnings };
  }

  if (options.commands.length === 0) {
    errors.push('At least one command is required');
    return { valid: false, errors, warnings };
  }

  // Validate each command
  options.commands.forEach((command, index) => {
    const commandValidation = validateCommand(command);
    commandValidation.errors.forEach(error => {
      errors.push(`Command ${index + 1}: ${error}`);
    });
    commandValidation.warnings.forEach(warning => {
      warnings.push(`Command ${index + 1}: ${warning}`);
    });
  });

  // Validate optional names array
  if (options.names !== undefined) {
    if (!Array.isArray(options.names)) {
      errors.push('Names must be an array');
    } else if (options.names.length !== options.commands.length) {
      errors.push('Names array length must match commands array length');
    } else {
      options.names.forEach((name, index) => {
        const nameValidation = validateIdentifier(name);
        nameValidation.errors.forEach(error => {
          errors.push(`Name ${index + 1}: ${error}`);
        });
      });
    }
  }

  // Validate optional colors array
  if (options.colors !== undefined) {
    if (!Array.isArray(options.colors)) {
      errors.push('Colors must be an array');
    } else if (options.colors.length !== options.commands.length) {
      errors.push('Colors array length must match commands array length');
    } else {
      options.colors.forEach((color, index) => {
        const colorValidation = validateColor(color);
        colorValidation.errors.forEach(error => {
          errors.push(`Color ${index + 1}: ${error}`);
        });
      });
    }
  }

  // Validate optional package manager
  if (options.packageManager !== undefined) {
    const pmValidation = validatePackageManager(options.packageManager);
    errors.push(...pmValidation.errors);
    warnings.push(...pmValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates a validation error with proper context
 */
export function createValidationError(
  message: string,
  field?: string,
  _value?: unknown
): TasklyError {
  const fullMessage = field
    ? `Validation error for ${field}: ${message}`
    : `Validation error: ${message}`;

  return new TasklyError(fullMessage, ERROR_CODES.VALIDATION_ERROR);
}

/**
 * Validates and throws if validation fails
 */
export function validateOrThrow<T>(
  value: T,
  validator: (value: T) => ValidationResult,
  context?: string
): T {
  const result = validator(value);

  if (!result.valid) {
    const message = context
      ? `${context}: ${result.errors.join(', ')}`
      : result.errors.join(', ');
    throw createValidationError(message);
  }

  return value;
}
