# Configuration Files Examples

This guide demonstrates how to use configuration files with Taskly for reusable and maintainable task definitions.

## 📋 Basic Configuration

### Simple taskly.config.json

```json
{
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "dev-server",
      "color": "blue"
    },
    {
      "command": "npm run test:watch",
      "identifier": "tests",
      "color": "green"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 2
}
```

Usage:
```bash
taskly --config taskly.config.json
```

### Environment-Specific Configurations

#### Development Configuration (`taskly.dev.json`)

```json
{
  "tasks": [
    {
      "command": "npm run api:dev",
      "identifier": "🚀 API",
      "color": "blue",
      "cwd": "./backend"
    },
    {
      "command": "npm run web:dev",
      "identifier": "🌐 Frontend",
      "color": "green",
      "cwd": "./frontend"
    },
    {
      "command": "npm run docs:dev",
      "identifier": "📚 Docs",
      "color": "yellow",
      "cwd": "./docs"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 3,
  "verbose": true
}
```

#### Production Build Configuration (`taskly.build.json`)

```json
{
  "tasks": [
    {
      "command": "npm run build",
      "identifier": "build-app",
      "color": "blue"
    },
    {
      "command": "npm run lint",
      "identifier": "lint-code",
      "color": "yellow"
    },
    {
      "command": "npm run test",
      "identifier": "run-tests",
      "color": "green"
    }
  ],
  "killOthersOnFail": false,
  "maxConcurrency": 2,
  "verbose": false
}
```

#### Testing Configuration (`taskly.test.json`)

```json
{
  "tasks": [
    {
      "command": "npm run test:unit",
      "identifier": "unit-tests",
      "color": "green"
    },
    {
      "command": "npm run test:integration",
      "identifier": "integration-tests",
      "color": "blue"
    },
    {
      "command": "npm run test:e2e",
      "identifier": "e2e-tests",
      "color": "yellow"
    }
  ],
  "killOthersOnFail": false,
  "maxConcurrency": 1,
  "verbose": true
}
```

## 🏗️ Advanced Configurations

### Monorepo Configuration

```json
{
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "shared-lib",
      "color": "magenta",
      "cwd": "./packages/shared",
      "packageManager": "npm"
    },
    {
      "command": "yarn dev",
      "identifier": "api-service",
      "color": "blue",
      "cwd": "./packages/api",
      "packageManager": "yarn"
    },
    {
      "command": "pnpm dev",
      "identifier": "web-app",
      "color": "green",
      "cwd": "./packages/web",
      "packageManager": "pnpm"
    },
    {
      "command": "bun dev",
      "identifier": "mobile-app",
      "color": "yellow",
      "cwd": "./packages/mobile",
      "packageManager": "bun"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 4,
  "prefix": "[{identifier}] ",
  "timestampFormat": "HH:mm:ss"
}
```

### Microservices Configuration

```json
{
  "tasks": [
    {
      "command": "docker-compose up -d postgres redis",
      "identifier": "infrastructure",
      "color": "magenta"
    },
    {
      "command": "npm run dev",
      "identifier": "user-service",
      "color": "blue",
      "cwd": "./services/user"
    },
    {
      "command": "npm run dev",
      "identifier": "order-service",
      "color": "green",
      "cwd": "./services/order"
    },
    {
      "command": "npm run dev",
      "identifier": "payment-service",
      "color": "yellow",
      "cwd": "./services/payment"
    },
    {
      "command": "npm run dev",
      "identifier": "notification-service",
      "color": "cyan",
      "cwd": "./services/notification"
    },
    {
      "command": "npm run dev",
      "identifier": "api-gateway",
      "color": "red",
      "cwd": "./gateway"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 6,
  "verbose": false
}
```

### Full-Stack Development Configuration

```json
{
  "tasks": [
    {
      "command": "npm run db:dev",
      "identifier": "🗄️ Database",
      "color": "magenta"
    },
    {
      "command": "npm run api:dev",
      "identifier": "🔧 API Server",
      "color": "blue",
      "cwd": "./backend"
    },
    {
      "command": "npm run web:dev",
      "identifier": "🌐 Web App",
      "color": "green",
      "cwd": "./frontend"
    },
    {
      "command": "npm run mobile:dev",
      "identifier": "📱 Mobile App",
      "color": "yellow",
      "cwd": "./mobile"
    },
    {
      "command": "npm run admin:dev",
      "identifier": "⚙️ Admin Panel",
      "color": "cyan",
      "cwd": "./admin"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 5,
  "prefix": "{identifier} ",
  "timestampFormat": "HH:mm:ss"
}
```

## 🎯 Specialized Configurations

### CI/CD Pipeline Configuration

```json
{
  "tasks": [
    {
      "command": "npm run lint",
      "identifier": "lint",
      "color": "yellow"
    },
    {
      "command": "npm run type-check",
      "identifier": "types",
      "color": "blue"
    },
    {
      "command": "npm run format:check",
      "identifier": "format",
      "color": "magenta"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 3,
  "verbose": true
}
```

### Performance Testing Configuration

```json
{
  "tasks": [
    {
      "command": "npm run test:load",
      "identifier": "load-test",
      "color": "red"
    },
    {
      "command": "npm run test:stress",
      "identifier": "stress-test",
      "color": "yellow"
    },
    {
      "command": "npm run test:spike",
      "identifier": "spike-test",
      "color": "magenta"
    }
  ],
  "killOthersOnFail": false,
  "maxConcurrency": 1,
  "verbose": true
}
```

### Documentation Generation Configuration

```json
{
  "tasks": [
    {
      "command": "npm run docs:api",
      "identifier": "api-docs",
      "color": "blue"
    },
    {
      "command": "npm run docs:components",
      "identifier": "component-docs",
      "color": "green"
    },
    {
      "command": "npm run docs:guides",
      "identifier": "user-guides",
      "color": "yellow"
    },
    {
      "command": "npm run docs:changelog",
      "identifier": "changelog",
      "color": "magenta"
    }
  ],
  "killOthersOnFail": false,
  "maxConcurrency": 2,
  "verbose": false
}
```

## 📁 Configuration Organization

### Directory Structure

```
project/
├── taskly/
│   ├── dev.json          # Development tasks
│   ├── build.json        # Build tasks
│   ├── test.json         # Testing tasks
│   ├── deploy.json       # Deployment tasks
│   └── ci.json           # CI/CD tasks
├── package.json
└── taskly.config.json    # Default configuration
```

### Package.json Scripts Integration

```json
{
  "scripts": {
    "dev": "taskly --config taskly/dev.json",
    "build": "taskly --config taskly/build.json",
    "test:all": "taskly --config taskly/test.json",
    "deploy": "taskly --config taskly/deploy.json",
    "ci": "taskly --config taskly/ci.json"
  }
}
```

## 🔧 Dynamic Configuration Loading

### Environment-Based Configuration

Create a script to load configuration based on environment:

```javascript
// scripts/taskly-config.js
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const configFile = path.join(__dirname, '..', 'taskly', `${env}.json`);

if (fs.existsSync(configFile)) {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  console.log(JSON.stringify(config, null, 2));
} else {
  console.error(`Configuration file not found: ${configFile}`);
  process.exit(1);
}
```

Usage:
```bash
# Load development configuration
NODE_ENV=development taskly --config <(node scripts/taskly-config.js)

# Load production configuration
NODE_ENV=production taskly --config <(node scripts/taskly-config.js)
```

### Template-Based Configuration

Create configuration templates with placeholders:

```json
{
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "{{SERVICE_NAME}}",
      "color": "{{SERVICE_COLOR}}",
      "cwd": "./services/{{SERVICE_NAME}}"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": "{{MAX_CONCURRENCY}}"
}
```

Process with environment variables:

```javascript
// scripts/process-config.js
const fs = require('fs');
const template = fs.readFileSync('taskly.template.json', 'utf8');

const config = template
  .replace(/\{\{SERVICE_NAME\}\}/g, process.env.SERVICE_NAME || 'default')
  .replace(/\{\{SERVICE_COLOR\}\}/g, process.env.SERVICE_COLOR || 'blue')
  .replace(/\{\{MAX_CONCURRENCY\}\}/g, process.env.MAX_CONCURRENCY || '2');

console.log(config);
```

## 🎨 Configuration Best Practices

### 1. Use Meaningful Identifiers

```json
{
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "🚀 API Server",  // ✅ Clear and descriptive
      "color": "blue"
    }
  ]
}
```

### 2. Organize by Environment

```
taskly/
├── environments/
│   ├── development.json
│   ├── staging.json
│   └── production.json
└── tasks/
    ├── build.json
    ├── test.json
    └── deploy.json
```

### 3. Use Consistent Color Schemes

```json
{
  "colorScheme": {
    "backend": "blue",
    "frontend": "green",
    "database": "magenta",
    "tests": "yellow",
    "build": "cyan"
  },
  "tasks": [
    {
      "command": "npm run api",
      "identifier": "backend",
      "color": "blue"
    }
  ]
}
```

### 4. Document Configuration Options

```json
{
  "_description": "Development environment configuration",
  "_usage": "taskly --config taskly/dev.json",
  "_lastUpdated": "2024-01-15",
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "api",
      "color": "blue",
      "_description": "Starts the API development server"
    }
  ]
}
```

### 5. Validate Configuration

Create a validation script:

```javascript
// scripts/validate-config.js
const fs = require('fs');
const path = require('path');

function validateConfig(configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Validate required fields
    if (!config.tasks || !Array.isArray(config.tasks)) {
      throw new Error('tasks must be an array');
    }
    
    // Validate each task
    config.tasks.forEach((task, index) => {
      if (!task.command) {
        throw new Error(`Task ${index} missing command`);
      }
    });
    
    console.log(`✅ Configuration valid: ${configPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Configuration invalid: ${configPath}`);
    console.error(error.message);
    return false;
  }
}

// Validate all configurations
const configDir = path.join(__dirname, '..', 'taskly');
const configs = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));

let allValid = true;
configs.forEach(config => {
  const isValid = validateConfig(path.join(configDir, config));
  allValid = allValid && isValid;
});

process.exit(allValid ? 0 : 1);
```