# Taskly

[![npm version](https://badge.fury.io/js/%40codemastersolutions%2Ftaskly.svg)](https://badge.fury.io/js/%40codemastersolutions%2Ftaskly)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Biblioteca TypeScript sin dependencias para ejecución de comandos en paralelo con identificación visual y soporte para múltiples gestores de paquetes.

## ✨ Características

- 🚀 **Sin Dependencias** - Sin dependencias externas en tiempo de ejecución
- ⚡ **Ejecución Paralela** - Ejecuta múltiples comandos simultáneamente
- 🎨 **Identificación Visual** - Salida colorizada con identificadores personalizados
- 📦 **Multi-Gestor** - Soporte para npm, yarn, pnpm y bun
- 🔧 **TypeScript First** - Soporte completo de TypeScript con definiciones de tipos
- 🌐 **Formato Dual** - Soporte para CommonJS y ESM
- 🛡️ **Seguro** - Validación de entrada y sanitización de comandos
- 📱 **CLI & API** - Úsalo como herramienta CLI o biblioteca programática

## 📦 Instalación

```bash
# npm
npm install @codemastersolutions/taskly

# yarn
yarn add @codemastersolutions/taskly

# pnpm
pnpm add @codemastersolutions/taskly

# bun
bun add @codemastersolutions/taskly
```

## 🚀 Inicio Rápido

### Uso por CLI

```bash
# Ejecuta múltiples comandos en paralelo
taskly "npm run dev" "npm run test:watch"

# Con nombres y colores personalizados
taskly --names "dev,test" --colors "blue,green" "npm run dev" "npm run test"

# Mata todas las tareas cuando una falla
taskly --kill-others-on-fail "npm start" "npm run test"

# Especifica el gestor de paquetes
taskly --package-manager yarn "yarn dev" "yarn test"

# Limita la concurrencia
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"
```

### Uso Programático

```typescript
import { TaskRunner, runTasks } from '@codemastersolutions/taskly';

// Uso simple con función de conveniencia
const results = await runTasks([
  { command: 'npm run build' },
  { command: 'npm run test' }
]);

// Uso avanzado con TaskRunner
const runner = new TaskRunner({
  tasks: [
    { 
      command: 'npm run dev', 
      identifier: 'dev', 
      color: 'blue',
      packageManager: 'npm'
    },
    { 
      command: 'npm run test:watch', 
      identifier: 'test', 
      color: 'green',
      packageManager: 'npm'
    }
  ],
  killOthersOnFail: true,
  maxConcurrency: 2
});

const results = await runner.execute();
```

## 📖 Referencia CLI

### Sintaxis Básica

```bash
taskly [opciones] <comando1> [comando2] [...]
```

### Opciones

| Opción | Alias | Descripción | Tipo | Por Defecto |
|--------|-------|-------------|------|-------------|
| `--help` | `-h` | Muestra información de ayuda | boolean | - |
| `--version` | `-v` | Muestra número de versión | boolean | - |
| `--names` | `-n` | Lista de nombres personalizados separados por coma | string | auto-generado |
| `--colors` | `-c` | Lista de colores separados por coma | string | auto-asignado |
| `--package-manager` | `-p` | Gestor de paquetes a usar | string | auto-detectar |
| `--kill-others-on-fail` | `-k` | Mata todas las tareas cuando una falla | boolean | false |
| `--max-concurrency` | `-m` | Máximo de tareas concurrentes | number | ilimitado |
| `--config` | - | Ruta al archivo de configuración | string | - |
| `--verbose` | `-V` | Habilita salida verbosa | boolean | false |

### Gestores de Paquetes

Taskly soporta detección automática y especificación manual de gestores de paquetes:

- **npm** - Fallback por defecto
- **yarn** - Detectado vía `yarn.lock`
- **pnpm** - Detectado vía `pnpm-lock.yaml`
- **bun** - Detectado vía `bun.lockb`

### Colores

Colores disponibles para identificación de salida:

- `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`
- `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`

## 🔧 Archivo de Configuración

Crea un archivo `taskly.config.json` para configuraciones reutilizables:

```json
{
  "tasks": [
    {
      "command": "npm run dev",
      "identifier": "dev",
      "color": "blue",
      "packageManager": "npm"
    },
    {
      "command": "npm run test:watch",
      "identifier": "test",
      "color": "green",
      "packageManager": "npm"
    }
  ],
  "killOthersOnFail": true,
  "maxConcurrency": 2,
  "verbose": false
}
```

Úsalo con:

```bash
taskly --config taskly.config.json
```

## 📚 Referencia de API

### TaskConfig

```typescript
interface TaskConfig {
  command: string;              // Comando a ejecutar
  identifier?: string;          // Identificador personalizado (auto-generado si no se proporciona)
  color?: string;              // Color de salida (auto-asignado si no se proporciona)
  packageManager?: PackageManager; // Gestor de paquetes a usar
  cwd?: string;                // Directorio de trabajo
}
```

### TasklyOptions

```typescript
interface TasklyOptions {
  tasks: TaskConfig[];         // Array de tareas a ejecutar
  killOthersOnFail?: boolean;  // Mata todas las tareas cuando una falla
  maxConcurrency?: number;     // Máximo de tareas concurrentes
  prefix?: string;             // Formato del prefijo de salida
  timestampFormat?: string;    // Formato de timestamp para salida
}
```

### TaskResult

```typescript
interface TaskResult {
  identifier: string;          // Identificador de la tarea
  exitCode: number;           // Código de salida del proceso
  output: string[];           // Líneas de salida capturadas
  error?: string;             // Mensaje de error si falló
  duration: number;           // Duración de ejecución en milisegundos
}
```

### Clases Principales

#### TaskRunner

Clase principal para ejecutar tareas:

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';

const runner = new TaskRunner(options);
const results = await runner.execute(tasks);
```

#### ColorManager

Gestiona colores para salida de tareas:

```typescript
import { ColorManager } from '@codemastersolutions/taskly/core';

const colorManager = new ColorManager();
const coloredOutput = colorManager.colorize('Hola', 'blue');
```

#### PackageManagerDetector

Detecta y valida gestores de paquetes:

```typescript
import { PackageManagerDetector } from '@codemastersolutions/taskly/core';

const detector = new PackageManagerDetector();
const pm = await detector.detect('/ruta/al/proyecto');
```

## 🌍 Ejemplos

### Flujo de Desarrollo

```bash
# Inicia servidor dev y observa tests
taskly --names "dev,test" --kill-others-on-fail "npm run dev" "npm run test:watch"
```

### Pipeline de Build

```bash
# Ejecuta pasos de build en paralelo con concurrencia limitada
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"
```

### Desarrollo Multi-Proyecto

```bash
# Diferentes gestores de paquetes para diferentes proyectos
taskly --names "frontend,backend" \
  --package-manager yarn "yarn dev" \
  --package-manager npm "npm run dev"
```

### Colores e Identificadores Personalizados

```bash
# Identificación visual personalizada
taskly --names "🚀 Servidor,🧪 Tests" --colors "blue,green" \
  "npm run dev" "npm run test:watch"
```

## 🛠️ Desarrollo

### Prerrequisitos

- Node.js >= 16.0.0
- npm, yarn, pnpm o bun

### Configuración

```bash
# Clona el repositorio
git clone https://github.com/codemastersolutions/taskly.git
cd taskly

# Instala las dependencias
npm install

# Construye el proyecto
npm run build

# Ejecuta los tests
npm test

# Ejecuta los tests con cobertura
npm run test:coverage

# Ejecuta el linting
npm run lint

# Formatea el código
npm run format
```

### Scripts

| Script | Descripción |
|--------|-------------|
| `npm run build` | Construye para producción |
| `npm run dev` | Construye y observa cambios |
| `npm test` | Ejecuta tests |
| `npm run test:watch` | Ejecuta tests en modo observación |
| `npm run test:coverage` | Ejecuta tests con cobertura |
| `npm run lint` | Ejecuta ESLint |
| `npm run lint:fix` | Arregla problemas de ESLint |
| `npm run format` | Formatea código con Prettier |
| `npm run type-check` | Verifica tipos TypeScript |

## 🤝 Contribuyendo

¡Aceptamos contribuciones! Por favor, ve nuestra [Guía de Contribución](CONTRIBUTING.md) para detalles.

### Pasos Rápidos para Contribuir

1. Haz fork del repositorio
2. Crea una rama de característica: `git checkout -b feature/caracteristica-increible`
3. Haz tus cambios
4. Añade tests para tus cambios
5. Asegúrate de que los tests pasen: `npm test`
6. Commit tus cambios: `git commit -m 'Añade característica increíble'`
7. Push a la rama: `git push origin feature/caracteristica-increible`
8. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ve el archivo [LICENSE](LICENSE) para detalles.

## 🐛 Issues

¿Encontraste un bug o tienes una solicitud de característica? Por favor, abre un issue en [GitHub](https://github.com/codemastersolutions/taskly/issues).

## 📈 Changelog

Ve [CHANGELOG.md](CHANGELOG.md) para una lista de cambios e historial de versiones.

## 🙏 Agradecimientos

- Inspirado por [concurrently](https://github.com/open-cli-tools/concurrently)
- Construido con TypeScript y prácticas modernas de Node.js
- Sin dependencias para máxima compatibilidad y seguridad