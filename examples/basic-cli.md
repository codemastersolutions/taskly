# Basic CLI Examples

This guide covers the fundamental CLI usage patterns for Taskly.

## 🚀 Getting Started

### Simple Parallel Execution

Execute multiple commands in parallel:

```bash
# Run development server and tests simultaneously
taskly "npm run dev" "npm run test:watch"

# Build and lint in parallel
taskly "npm run build" "npm run lint"

# Start multiple services
taskly "npm run api" "npm run web" "npm run worker"
```

### Basic Options

#### Custom Names

Give your tasks meaningful names:

```bash
# Single names
taskly --names "server" "npm run dev"

# Multiple names
taskly --names "api,web,worker" "npm run api" "npm run web" "npm run worker"
```

#### Custom Colors

Assign specific colors to tasks:

```bash
# Single color
taskly --colors "blue" "npm run dev"

# Multiple colors
taskly --colors "blue,green,yellow" "npm run api" "npm run web" "npm run worker"

# Available colors: red, green, yellow, blue, magenta, cyan
# Bright variants: brightRed, brightGreen, brightYellow, brightBlue, brightMagenta, brightCyan
```

#### Combining Names and Colors

```bash
taskly --names "🚀 API,🌐 Web,⚡ Worker" --colors "blue,green,yellow" \
  "npm run api" "npm run web" "npm run worker"
```

## 📦 Package Manager Support

### Automatic Detection

Taskly automatically detects your package manager:

```bash
# Will use npm if package-lock.json exists
taskly "npm run dev" "npm run test"

# Will use yarn if yarn.lock exists
taskly "yarn dev" "yarn test"

# Will use pnpm if pnpm-lock.yaml exists
taskly "pnpm dev" "pnpm test"

# Will use bun if bun.lockb exists
taskly "bun dev" "bun test"
```

### Manual Specification

Override automatic detection:

```bash
# Force use of yarn
taskly --package-manager yarn "yarn dev" "yarn test"

# Force use of pnpm
taskly --package-manager pnpm "pnpm dev" "pnpm test"

# Force use of bun
taskly --package-manager bun "bun dev" "bun test"
```

## 🎯 Task Control

### Kill Others on Fail

Stop all tasks when one fails:

```bash
# Useful for development workflows
taskly --kill-others-on-fail "npm run dev" "npm run test:watch"

# Short form
taskly -k "npm run build" "npm run lint" "npm run test"
```

### Concurrency Limiting

Limit the number of concurrent tasks:

```bash
# Run maximum 2 tasks at once
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test" "npm run docs"

# Short form
taskly -m 3 "task1" "task2" "task3" "task4" "task5"
```

## 📋 Help and Information

### Getting Help

```bash
# Show help
taskly --help
taskly -h

# Show version
taskly --version
taskly -v
```

### Verbose Output

Enable detailed logging:

```bash
# Verbose mode
taskly --verbose "npm run dev" "npm run test"
taskly -V "npm run dev" "npm run test"
```

## 🔧 Common Patterns

### Development Workflow

```bash
# Start dev server and watch tests
taskly --names "dev,test" --kill-others-on-fail \
  "npm run dev" "npm run test:watch"
```

### Build Pipeline

```bash
# Run build steps with limited concurrency
taskly --names "build,lint,test" --max-concurrency 2 \
  "npm run build" "npm run lint" "npm run test"
```

### Multi-Service Development

```bash
# Start all services with custom identification
taskly --names "🔧 API,🌐 Frontend,📊 Analytics,🔍 Search" \
       --colors "blue,green,yellow,magenta" \
       --kill-others-on-fail \
  "npm run api" \
  "npm run frontend" \
  "npm run analytics" \
  "npm run search"
```

### Testing Different Environments

```bash
# Test against multiple Node.js versions
taskly --names "node16,node18,node20" \
  "nvm use 16 && npm test" \
  "nvm use 18 && npm test" \
  "nvm use 20 && npm test"
```

## ⚠️ Common Mistakes

### Incorrect Quoting

```bash
# ❌ Wrong - commands will be split incorrectly
taskly npm run dev npm run test

# ✅ Correct - quote each command
taskly "npm run dev" "npm run test"
```

### Mismatched Arrays

```bash
# ❌ Wrong - number of names doesn't match commands
taskly --names "dev,test,lint" "npm run dev" "npm run test"

# ✅ Correct - matching arrays
taskly --names "dev,test" "npm run dev" "npm run test"
```

### Shell-Specific Commands

```bash
# ❌ Might not work on all systems
taskly "npm run dev && echo done"

# ✅ Better - use npm scripts or separate commands
taskly "npm run dev" "npm run post-dev"
```

## 🎨 Output Examples

When you run:

```bash
taskly --names "api,web" --colors "blue,green" "npm run api" "npm run web"
```

You'll see output like:

```
[api] Server starting on port 3000...
[web] Webpack dev server starting...
[api] ✓ Database connected
[web] ✓ Compiled successfully
[api] 🚀 API server ready at http://localhost:3000
[web] 🌐 Web server ready at http://localhost:8080
```

Each line is prefixed with the task name and colored according to your specification.