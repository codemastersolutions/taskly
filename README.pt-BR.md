# Taskly

[![npm version](https://badge.fury.io/js/%40codemastersolutions%2Ftaskly.svg)](https://badge.fury.io/js/%40codemastersolutions%2Ftaskly)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Biblioteca TypeScript zero-dependency para execução de comandos em paralelo com identificação visual e suporte a múltiplos gerenciadores de pacotes.

## ✨ Funcionalidades

- 🚀 **Zero Dependencies** - Nenhuma dependência externa em tempo de execução
- ⚡ **Execução Paralela** - Execute múltiplos comandos simultaneamente
- 🎨 **Identificação Visual** - Saída colorida com identificadores personalizados
- 📦 **Multi-Gerenciador** - Suporte para npm, yarn, pnpm e bun
- 🔧 **TypeScript First** - Suporte completo ao TypeScript com definições de tipos
- 🌐 **Formato Duplo** - Suporte para CommonJS e ESM
- 🛡️ **Seguro** - Validação de entrada e sanitização de comandos
- 📱 **CLI & API** - Use como ferramenta CLI ou biblioteca programática

## 📦 Instalação

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

## 🚀 Início Rápido

### Uso via CLI

```bash
# Execute múltiplos comandos em paralelo
taskly "npm run dev" "npm run test:watch"

# Com nomes e cores personalizados
taskly --names "dev,test" --colors "blue,green" "npm run dev" "npm run test"

# Mata todas as tarefas quando uma falha
taskly --kill-others-on-fail "npm start" "npm run test"

# Especifica o gerenciador de pacotes
taskly --package-manager yarn "yarn dev" "yarn test"

# Limita a concorrência
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"
```

### Uso Programático

```typescript
import { TaskRunner, runTasks } from '@codemastersolutions/taskly';

// Uso simples com função de conveniência
const results = await runTasks([
  { command: 'npm run build' },
  { command: 'npm run test' }
]);

// Uso avançado com TaskRunner
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

## 📖 Referência CLI

### Sintaxe Básica

```bash
taskly [opções] <comando1> [comando2] [...]
```

### Opções

| Opção | Alias | Descrição | Tipo | Padrão |
|-------|-------|-----------|------|--------|
| `--help` | `-h` | Mostra informações de ajuda | boolean | - |
| `--version` | `-v` | Mostra número da versão | boolean | - |
| `--names` | `-n` | Lista de nomes personalizados separados por vírgula | string | auto-gerado |
| `--colors` | `-c` | Lista de cores separadas por vírgula | string | auto-atribuído |
| `--package-manager` | `-p` | Gerenciador de pacotes a usar | string | auto-detectar |
| `--kill-others-on-fail` | `-k` | Mata todas as tarefas quando uma falha | boolean | false |
| `--max-concurrency` | `-m` | Máximo de tarefas concorrentes | number | ilimitado |
| `--config` | - | Caminho para arquivo de configuração | string | - |
| `--verbose` | `-V` | Habilita saída verbosa | boolean | false |

### Gerenciadores de Pacotes

Taskly suporta detecção automática e especificação manual de gerenciadores de pacotes:

- **npm** - Fallback padrão
- **yarn** - Detectado via `yarn.lock`
- **pnpm** - Detectado via `pnpm-lock.yaml`
- **bun** - Detectado via `bun.lockb`

### Cores

Cores disponíveis para identificação da saída:

- `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`
- `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`

## 🔧 Arquivo de Configuração

Crie um arquivo `taskly.config.json` para configurações reutilizáveis:

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

Use com:

```bash
taskly --config taskly.config.json
```

## 📚 Referência da API

### TaskConfig

```typescript
interface TaskConfig {
  command: string;              // Comando a executar
  identifier?: string;          // Identificador personalizado (auto-gerado se não fornecido)
  color?: string;              // Cor da saída (auto-atribuída se não fornecida)
  packageManager?: PackageManager; // Gerenciador de pacotes a usar
  cwd?: string;                // Diretório de trabalho
}
```

### TasklyOptions

```typescript
interface TasklyOptions {
  tasks: TaskConfig[];         // Array de tarefas a executar
  killOthersOnFail?: boolean;  // Mata todas as tarefas quando uma falha
  maxConcurrency?: number;     // Máximo de tarefas concorrentes
  prefix?: string;             // Formato do prefixo da saída
  timestampFormat?: string;    // Formato do timestamp para saída
}
```

### TaskResult

```typescript
interface TaskResult {
  identifier: string;          // Identificador da tarefa
  exitCode: number;           // Código de saída do processo
  output: string[];           // Linhas de saída capturadas
  error?: string;             // Mensagem de erro se falhou
  duration: number;           // Duração da execução em milissegundos
}
```

### Classes Principais

#### TaskRunner

Classe principal para executar tarefas:

```typescript
import { TaskRunner } from '@codemastersolutions/taskly';

const runner = new TaskRunner(options);
const results = await runner.execute(tasks);
```

#### ColorManager

Gerencia cores para saída de tarefas:

```typescript
import { ColorManager } from '@codemastersolutions/taskly/core';

const colorManager = new ColorManager();
const coloredOutput = colorManager.colorize('Olá', 'blue');
```

#### PackageManagerDetector

Detecta e valida gerenciadores de pacotes:

```typescript
import { PackageManagerDetector } from '@codemastersolutions/taskly/core';

const detector = new PackageManagerDetector();
const pm = await detector.detect('/caminho/para/projeto');
```

## 🌍 Exemplos

### Fluxo de Desenvolvimento

```bash
# Inicia servidor dev e observa testes
taskly --names "dev,test" --kill-others-on-fail "npm run dev" "npm run test:watch"
```

### Pipeline de Build

```bash
# Executa etapas de build em paralelo com concorrência limitada
taskly --max-concurrency 2 "npm run build" "npm run lint" "npm run test"
```

### Desenvolvimento Multi-Projeto

```bash
# Diferentes gerenciadores de pacotes para diferentes projetos
taskly --names "frontend,backend" \
  --package-manager yarn "yarn dev" \
  --package-manager npm "npm run dev"
```

### Cores e Identificadores Personalizados

```bash
# Identificação visual personalizada
taskly --names "🚀 Servidor,🧪 Testes" --colors "blue,green" \
  "npm run dev" "npm run test:watch"
```

## 🛠️ Desenvolvimento

### Pré-requisitos

- Node.js >= 16.0.0
- npm, yarn, pnpm ou bun

### Configuração

```bash
# Clone o repositório
git clone https://github.com/codemastersolutions/taskly.git
cd taskly

# Instale as dependências
npm install

# Construa o projeto
npm run build

# Execute os testes
npm test

# Execute os testes com cobertura
npm run test:coverage

# Execute o linting
npm run lint

# Formate o código
npm run format
```

### Scripts

| Script | Descrição |
|--------|-----------|
| `npm run build` | Constrói para produção |
| `npm run dev` | Constrói e observa mudanças |
| `npm test` | Executa testes |
| `npm run test:watch` | Executa testes em modo observação |
| `npm run test:coverage` | Executa testes com cobertura |
| `npm run lint` | Executa ESLint |
| `npm run lint:fix` | Corrige problemas do ESLint |
| `npm run format` | Formata código com Prettier |
| `npm run type-check` | Verifica tipos TypeScript |

## 🤝 Contribuindo

Aceitamos contribuições! Por favor, veja nosso [Guia de Contribuição](CONTRIBUTING.md) para detalhes.

### Passos Rápidos para Contribuir

1. Faça um fork do repositório
2. Crie uma branch de funcionalidade: `git checkout -b feature/funcionalidade-incrivel`
3. Faça suas alterações
4. Adicione testes para suas alterações
5. Certifique-se de que os testes passam: `npm test`
6. Commit suas alterações: `git commit -m 'Adiciona funcionalidade incrível'`
7. Push para a branch: `git push origin feature/funcionalidade-incrivel`
8. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🐛 Issues

Encontrou um bug ou tem uma solicitação de funcionalidade? Por favor, abra uma issue no [GitHub](https://github.com/codemastersolutions/taskly/issues).

## 📈 Changelog

Veja [CHANGELOG.md](CHANGELOG.md) para uma lista de mudanças e histórico de versões.

## 🙏 Agradecimentos

- Inspirado por [concurrently](https://github.com/open-cli-tools/concurrently)
- Construído com TypeScript e práticas modernas do Node.js
- Zero dependencies para máxima compatibilidade e segurança