# Design Document

## Overview

This design document outlines the solution for fixing failing integration tests in the TasklyCLI component. The fixes address critical issues in flag handling, identifier generation, package manager detection, and task execution with proper timeout and signal handling.

## Architecture

The solution involves modifications to several key components:

1. **CLI Argument Processing Flow**: Restructure the CLI run method to handle help/version flags before any validation
2. **Identifier Generation Logic**: Fix the generateIdentifier method to handle edge cases properly
3. **Package Manager Detection**: Ensure all required methods exist and work correctly
4. **Task Execution Engine**: Fix timeout and signal handling to return proper exit codes
5. **Error Handling System**: Improve error message formatting and test expectations

## Components and Interfaces

### CLI Flag Processing

```typescript
interface CLIFlagHandler {
  shouldExitEarly(options: CLIOptions): boolean;
  handleEarlyExit(options: CLIOptions): void;
}
```

**Design Decision**: Move flag checking to the very beginning of the run method, before any other processing. This ensures help/version flags work regardless of other argument validity.

### Identifier Generation

```typescript
interface IdentifierGenerator {
  generateIdentifier(command: string, index: number): string;
  sanitizeCommandName(command: string): string;
  extractBaseName(commandName: string): string;
}
```

**Design Decision**: Fix the logic to properly handle empty commands by checking if the base name is empty after sanitization and defaulting to "task" in that case.

### Package Manager Detection

```typescript
interface PackageManagerDetector {
  isAvailable(pm: PackageManager): boolean;
  detectFromLockFiles(directory: string): PackageManager | null;
  validate(pm: PackageManager): void;
  getAvailablePackageManagers(): PackageManager[];
}
```

**Design Decision**: Ensure all methods referenced in tests actually exist and are properly implemented. Add missing methods if necessary.

### Task Execution with Timeouts

```typescript
interface TaskExecutionEngine {
  executeWithTimeout(task: TaskConfig, timeout: number): Promise<TaskResult>;
  handleTaskTermination(task: TaskConfig, signal: string): TaskResult;
  killOthersOnFail(runningTasks: Map<string, ChildProcess>): void;
}
```

**Design Decision**: Fix timeout handling to actually terminate processes and return non-zero exit codes. Ensure kill-others-on-fail properly terminates other tasks when one fails.

## Data Models

### Task Result Enhancement

```typescript
interface TaskResult {
  identifier: string;
  exitCode: number;
  error?: string;
  terminated?: boolean;
  timedOut?: boolean;
  killedBySignal?: boolean;
}
```

### Error Information Structure

```typescript
interface ErrorInfo {
  identifier: string;
  error: Error;
  context?: Record<string, unknown>;
  timestamp: number;
}
```

## Error Handling

### CLI Flag Processing Errors
- **Early Exit Strategy**: Process help/version flags before any validation
- **No Error State**: Help/version should never trigger validation errors

### Identifier Generation Errors
- **Empty Command Handling**: Default to "task" when command produces empty base name
- **Sanitization Logic**: Ensure proper character removal and fallback handling

### Package Manager Errors
- **Method Availability**: Ensure all required methods exist on detector instances
- **Validation Errors**: Provide clear error messages for unavailable package managers

### Task Execution Errors
- **Timeout Handling**: Properly terminate processes and return non-zero exit codes
- **Signal Handling**: Ensure terminated processes return appropriate exit codes
- **Process Cleanup**: Clean up resources when tasks are terminated

## Testing Strategy

### Unit Test Fixes
1. **Mock Process Exit**: Ensure tests properly mock process.exit calls
2. **Console Output Capture**: Fix console mocking to capture actual output
3. **Async Handling**: Ensure proper async/await handling in test scenarios
4. **Error Expectation**: Update error message expectations to match actual output

### Integration Test Improvements
1. **Timeout Testing**: Use shorter timeouts for faster test execution
2. **Signal Testing**: Properly test signal handling with real process termination
3. **Package Manager Mocking**: Mock package manager detection for consistent test results
4. **Error Scenario Testing**: Test actual error conditions rather than forced failures

### Test Environment Setup
1. **Temporary Directory Management**: Ensure proper cleanup of test directories
2. **Process Isolation**: Prevent test processes from interfering with each other
3. **Mock Restoration**: Properly restore mocks between test runs
4. **Resource Cleanup**: Clean up any spawned processes or file handles

## Implementation Plan

### Phase 1: CLI Flag Processing Fix
1. Restructure the `run` method to check flags first
2. Move help/version handling before any validation
3. Update tests to properly mock process.exit

### Phase 2: Identifier Generation Fix
1. Fix the `generateIdentifier` method logic
2. Add proper handling for empty commands
3. Ensure consistent identifier format

### Phase 3: Package Manager Detection Fix
1. Verify all required methods exist
2. Add missing methods if necessary
3. Fix method implementations to work correctly

### Phase 4: Task Execution Fixes
1. Fix timeout handling to actually terminate processes
2. Implement proper kill-others-on-fail functionality
3. Ensure correct exit codes are returned

### Phase 5: Error Handling Improvements
1. Update error message formatting
2. Fix test expectations to match actual output
3. Improve error information capture and reporting

## Performance Considerations

- **Early Exit Optimization**: Processing flags first reduces unnecessary work
- **Process Management**: Proper cleanup prevents resource leaks
- **Test Execution Speed**: Shorter timeouts improve test suite performance
- **Memory Usage**: Proper mock cleanup prevents memory leaks in tests

## Security Considerations

- **Command Sanitization**: Ensure identifier generation doesn't expose sensitive information
- **Process Isolation**: Prevent test processes from affecting system state
- **Resource Limits**: Ensure timeouts prevent runaway processes
- **Error Information**: Avoid exposing sensitive data in error messages