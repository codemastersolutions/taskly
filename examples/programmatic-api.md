# Programmatic API Examples

This guide demonstrates how to use Taskly as a library in your Node.js applications.

## 🚀 Quick Start

### Simple Task Execution

```typescript
import { runTasks } from '@codemastersolutions/taskly';

// Execute tasks with minimal configuration
const results = await runTasks([
  { command: 'npm run build' },
  { command: 'npm run test' }
]);

console.log('All tasks completed:', results);
```

### Using TaskRunner Class

```typescript
import { TaskRunner, TaskConfig } from '@codemastersolutions/taskly';

const tasks: TaskConfig[] = [
  {
    command: 'npm run dev',
    identifier: 'dev-server',
    color: 'blue'
  },
  {
    command: 'npm run test:watch',
    identifier: 'tests',
    color: 'green'
  }
];

const runner = new TaskRunner({
  tasks,
  killOthersOnFail: true,
  maxConcurrency: 2
});

const results = await runner.execute();
```

## 📚 Core Interfaces

### TaskConfig Interface

```typescript
interface TaskConfig {
  command: string;              // Command to execute
  identifier?: string;          // Custom identifier (auto-generated if not provided)
  color?: string;              // Output color (auto-assigned if not provided)
  packageManager?: PackageManager; // Package manager to use
  cwd?: string;                // Working directory
}

// Example usage
const task: TaskConfig = {
  command: 'npm run build',
  identifier: 'build-process',
  color: 'yellow',
  packageManager: 'npm',
  cwd: './packages/frontend'
};
```

### TasklyOptions Interface

```typescript
interface TasklyOptions {
  tasks: TaskConfig[];         // Array of tasks to execute
  killOthersOnFail?: boolean;  // Kill all tasks when one fails
  maxConcurrency?: number;     // Maximum concurrent tasks
  prefix?: string;             // Output prefix format
  timestampFormat?: string;    // Timestamp format for output
}

// Example usage
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

### TaskResult Interface

```typescript
interface TaskResult {
  identifier: string;          // Task identifier
  exitCode: number;           // Process exit code (0 = success)
  output: string[];           // Captured output lines
  error?: string;             // Error message if failed
  duration: number;           // Execution duration in milliseconds
}

// Example result handling
const results = await runner.execute();
results.forEach(result => {
  if (result.exitCode === 0) {
    console.log(`✓ ${result.identifier} completed in ${result.duration}ms`);
  } else {
    console.error(`✗ ${result.identifier} failed:`, result.error);
  }
});
```

## 🔧 Advanced Usage

### Custom Task Runner Configuration

```typescript
import { TaskRunner, ColorManager, PackageManagerDetector } from '@codemastersolutions/taskly';

// Create custom instances
const colorManager = new ColorManager();
const packageDetector = new PackageManagerDetector();

// Configure custom colors
colorManager.setCustomColors(['#FF6B6B', '#4ECDC4', '#45B7D1']);

const runner = new TaskRunner({
  tasks: [
    { command: 'npm run api', identifier: 'api' },
    { command: 'npm run web', identifier: 'web' },
    { command: 'npm run worker', identifier: 'worker' }
  ],
  killOthersOnFail: false,
  maxConcurrency: 3
});

// Execute with custom configuration
const results = await runner.execute();
```

### Error Handling

```typescript
import { TaskRunner, TasklyError, ERROR_CODES } from '@codemastersolutions/taskly';

try {
  const runner = new TaskRunner({
    tasks: [
      { command: 'npm run build' },
      { command: 'npm run test' }
    ]
  });

  const results = await runner.execute();
  
  // Check for failures
  const failures = results.filter(r => r.exitCode !== 0);
  if (failures.length > 0) {
    console.error(`${failures.length} tasks failed`);
    failures.forEach(failure => {
      console.error(`- ${failure.identifier}: ${failure.error}`);
    });
  }

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

### Dynamic Task Generation

```typescript
import { TaskConfig, runTasks } from '@codemastersolutions/taskly';

// Generate tasks dynamically
const services = ['api', 'web', 'worker', 'scheduler'];
const environments = ['development', 'staging'];

const tasks: TaskConfig[] = [];

for (const service of services) {
  for (const env of environments) {
    tasks.push({
      command: `npm run start:${service}`,
      identifier: `${service}-${env}`,
      color: getColorForService(service),
      cwd: `./services/${service}`,
      packageManager: 'npm'
    });
  }
}

function getColorForService(service: string): string {
  const colors = {
    api: 'blue',
    web: 'green',
    worker: 'yellow',
    scheduler: 'magenta'
  };
  return colors[service] || 'cyan';
}

const results = await runTasks(tasks, {
  maxConcurrency: 4,
  killOthersOnFail: false
});
```

### Integration with Build Tools

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';
import { readFileSync } from 'fs';

// Load configuration from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const scripts = packageJson.scripts || {};

// Create tasks from npm scripts
const buildTasks = Object.entries(scripts)
  .filter(([name]) => name.startsWith('build:'))
  .map(([name, command]) => ({
    command: `npm run ${name}`,
    identifier: name.replace('build:', ''),
    color: 'blue'
  }));

const testTasks = Object.entries(scripts)
  .filter(([name]) => name.startsWith('test:'))
  .map(([name, command]) => ({
    command: `npm run ${name}`,
    identifier: name.replace('test:', ''),
    color: 'green'
  }));

// Execute build tasks first, then tests
const buildRunner = new TaskRunner({ tasks: buildTasks });
const buildResults = await buildRunner.execute();

// Only run tests if all builds succeeded
const allBuildsSucceeded = buildResults.every(r => r.exitCode === 0);
if (allBuildsSucceeded) {
  const testRunner = new TaskRunner({ tasks: testTasks });
  const testResults = await testRunner.execute();
}
```

## 🎯 Real-World Examples

### Development Server with Hot Reload

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';

async function startDevelopment() {
  const runner = new TaskRunner({
    tasks: [
      {
        command: 'npm run api:dev',
        identifier: 'api',
        color: 'blue',
        cwd: './backend'
      },
      {
        command: 'npm run web:dev',
        identifier: 'frontend',
        color: 'green',
        cwd: './frontend'
      },
      {
        command: 'npm run docs:dev',
        identifier: 'docs',
        color: 'yellow',
        cwd: './docs'
      }
    ],
    killOthersOnFail: true, // Stop all if one fails
    maxConcurrency: 3
  });

  console.log('🚀 Starting development environment...');
  
  try {
    await runner.execute();
  } catch (error) {
    console.error('❌ Development environment failed to start:', error);
    process.exit(1);
  }
}

startDevelopment();
```

### CI/CD Pipeline

```typescript
import { runTasks, TaskConfig } from '@codemastersolutions/taskly';

async function runCIPipeline() {
  // Phase 1: Linting and type checking (fast feedback)
  const lintTasks: TaskConfig[] = [
    { command: 'npm run lint', identifier: 'eslint' },
    { command: 'npm run type-check', identifier: 'typescript' },
    { command: 'npm run format:check', identifier: 'prettier' }
  ];

  console.log('📋 Running code quality checks...');
  const lintResults = await runTasks(lintTasks, { maxConcurrency: 3 });
  
  if (lintResults.some(r => r.exitCode !== 0)) {
    console.error('❌ Code quality checks failed');
    return false;
  }

  // Phase 2: Build (required for tests)
  console.log('🔨 Building project...');
  const buildResults = await runTasks([
    { command: 'npm run build', identifier: 'build' }
  ]);

  if (buildResults[0].exitCode !== 0) {
    console.error('❌ Build failed');
    return false;
  }

  // Phase 3: Testing (parallel test suites)
  const testTasks: TaskConfig[] = [
    { command: 'npm run test:unit', identifier: 'unit-tests' },
    { command: 'npm run test:integration', identifier: 'integration-tests' },
    { command: 'npm run test:e2e', identifier: 'e2e-tests' }
  ];

  console.log('🧪 Running tests...');
  const testResults = await runTasks(testTasks, { 
    maxConcurrency: 2,
    killOthersOnFail: false // Let all tests complete
  });

  const testsPassed = testResults.every(r => r.exitCode === 0);
  if (testsPassed) {
    console.log('✅ All CI checks passed!');
    return true;
  } else {
    console.error('❌ Some tests failed');
    return false;
  }
}

// Usage in CI environment
runCIPipeline().then(success => {
  process.exit(success ? 0 : 1);
});
```

### Microservices Development

```typescript
import { TaskRunner, TaskConfig } from '@codemastersolutions/taskly';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function startMicroservices() {
  const servicesDir = './services';
  const services = await readdir(servicesDir);
  
  const tasks: TaskConfig[] = services.map((service, index) => ({
    command: 'npm run dev',
    identifier: service,
    color: getColorByIndex(index),
    cwd: join(servicesDir, service),
    packageManager: 'npm'
  }));

  // Add shared services
  tasks.push(
    {
      command: 'docker-compose up redis postgres',
      identifier: 'infrastructure',
      color: 'magenta'
    },
    {
      command: 'npm run gateway:dev',
      identifier: 'api-gateway',
      color: 'cyan',
      cwd: './gateway'
    }
  );

  const runner = new TaskRunner({
    tasks,
    killOthersOnFail: true,
    maxConcurrency: 8 // Limit resource usage
  });

  console.log(`🚀 Starting ${tasks.length} services...`);
  await runner.execute();
}

function getColorByIndex(index: number): string {
  const colors = ['blue', 'green', 'yellow', 'red', 'magenta', 'cyan'];
  return colors[index % colors.length];
}

startMicroservices().catch(console.error);
```

## 🔍 Debugging and Monitoring

### Task Monitoring

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';

const runner = new TaskRunner({
  tasks: [
    { command: 'npm run api', identifier: 'api' },
    { command: 'npm run web', identifier: 'web' }
  ]
});

// Monitor task progress
runner.on('taskStart', (task) => {
  console.log(`▶️ Started: ${task.identifier}`);
});

runner.on('taskOutput', (task, line) => {
  // Custom output processing
  if (line.includes('ERROR')) {
    console.error(`🚨 Error in ${task.identifier}: ${line}`);
  }
});

runner.on('taskComplete', (task, result) => {
  const status = result.exitCode === 0 ? '✅' : '❌';
  console.log(`${status} ${task.identifier} completed in ${result.duration}ms`);
});

await runner.execute();
```

### Performance Monitoring

```typescript
import { TaskRunner, TaskResult } from '@codemastersolutions/taskly';

function analyzePerformance(results: TaskResult[]) {
  const totalDuration = Math.max(...results.map(r => r.duration));
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('\n📊 Performance Analysis:');
  console.log(`Total execution time: ${totalDuration}ms`);
  console.log(`Average task duration: ${avgDuration.toFixed(2)}ms`);
  
  // Find bottlenecks
  const slowTasks = results
    .filter(r => r.duration > avgDuration * 1.5)
    .sort((a, b) => b.duration - a.duration);
    
  if (slowTasks.length > 0) {
    console.log('\n🐌 Slow tasks:');
    slowTasks.forEach(task => {
      console.log(`  - ${task.identifier}: ${task.duration}ms`);
    });
  }
}

const results = await runner.execute();
analyzePerformance(results);
```