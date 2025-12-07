# @codemastersolutions/taskly

Zero-dependencies concurrent command runner and CLI, compatible with Node >= 16, built in TypeScript. It can run npm, yarn, pnpm, bun and shell scripts.

## Install

```bash
pnpm add @codemastersolutions/taskly -D
```

## CLI Usage

```bash
taskly --max-processes 2 --prefix name --kill-others-on failure \
  "npm run build" \
  "pnpm test"
```

Options:

- `--names name1,name2` Assign names by index.
- `--max-processes N` Limit parallelism.
- `--kill-others-on success,failure` Kill others when a process succeeds/fails.
- `--prefix type|template` `index|pid|time|command|name|none` or custom template with `{index}`, `{pid}`, `{time}`, `{command}`, `{name}`.
- `--success-condition all|first|last` Run success policy.
- `--raw` Disable prefixing/colors.
- `--shell` Use system shell (less secure).
- `--shell [name]` Run via shell executable: `cmd|powershell|pwsh|bash|sh` (default system shell).
- `--cwd PATH` Working directory.

### Atalho de Package Manager (`<pm>:<cmd>`)

Taskly aceita tokens no formato `<package manager>:<comando>` e os expande para `run` automaticamente:

```bash
# Expansões suportadas
taskly npm:start pnpm:build yarn:test bun:dev
# Equivalentes:
# npm:start -> npm run start
# pnpm:build -> pnpm run build
# yarn:test -> yarn run test
# bun:dev   -> bun run dev

# Passando argumentos para o script
taskly "npm:start -- --watch" "pnpm:build -- --filter @app/web"
```

Notas:

- Compatível com os principais package managers: `npm`, `pnpm`, `yarn`, `bun`.
- Para o Yarn usamos `yarn run` por compatibilidade entre versões.
- Use aspas para preservar espaços e `--` para encaminhar argumentos ao script do package manager.

#### Tabela rápida de mapeamentos

| Atalho          | Expansão            |
| --------------- | ------------------- |
| `npm:<script>`  | `npm run <script>`  |
| `pnpm:<script>` | `pnpm run <script>` |
| `yarn:<script>` | `yarn run <script>` |
| `bun:<script>`  | `bun run <script>`  |

## Exemplo em package.json (pnpm)

Defina um script que roda dois processos em paralelo com nomes, limite de paralelismo, e finaliza todos ao primeiro erro:

```json
{
  "scripts": {
    "dev": "taskly --names api,web --prefix name --max-processes 2 --kill-others-on failure --success-condition all --shell \"pnpm dev:api\" \"pnpm dev:web\"",
    "dev:api": "node -e \"console.log('API ready'); setInterval(()=>{}, 10000)\"",
    "dev:web": "node -e \"console.log('WEB ready'); setInterval(()=>{}, 10000)\""
  }
}
```

- Use `--names` para identificar a saída de cada processo (`[api]`, `[web]`).
- `--kill-others-on failure` derruba o outro processo se qualquer um falhar.
- `--shell` permite passar o comando completo como string (útil para scripts do `pnpm`).
- Ajuste `--success-condition` conforme a política desejada (`all|first|last`).

### Exemplo em package.json (atalhos `<pm>:<cmd>`)

Este exemplo usa a sintaxe de atalho para encadear scripts de diferentes package managers:

```json
{
  "scripts": {
    "dev": "taskly npm:start pnpm:build yarn:test bun:dev",
    "start": "node -e \"console.log('Start ready'); setInterval(()=>{}, 10000)\"",
    "build": "node -e \"console.log('Build ok')\"",
    "test": "node -e \"console.log('Tests ok')\""
  }
}
```

- `taskly npm:start` expande para `npm run start`.
- `taskly pnpm:build` expande para `pnpm run build`.
- `taskly yarn:test` expande para `yarn run test`.
- `taskly bun:dev` expande para `bun run dev`.

### Encaminhamento de argumentos (`--`) em package.json

Você pode encaminhar flags para os scripts dos package managers usando `--`. Em `package.json`, envolva o comando em aspas e escape conforme necessário:

```json
{
  "scripts": {
    "dev:npm": "taskly \"npm:start -- --watch\"",
    "dev:pnpm": "taskly \"pnpm:build -- --filter @app/web\"",
    "dev:yarn": "taskly \"yarn:test -- --watch\"",
    "dev:bun": "taskly \"bun:dev -- --hot\""
  }
}
```

- `npm:start -- --watch` encaminha `--watch` para o script `start` do npm.
- `pnpm:build -- --filter @app/web` aplica `--filter` ao script `build` do pnpm.
- `yarn:test -- --watch` encaminha `--watch` para o script `test` do yarn.
- `bun:dev -- --hot` passa `--hot` para o script `dev` do bun.

Também funciona com múltiplos processos:

```json
{
  "scripts": {
    "dev": "taskly \"npm:start -- --watch\" \"pnpm:build -- --filter @app/web\""
  }
}
```

### Escaping em JSON (aspas e barras)

Em `package.json`, lembre-se de escapar aspas (`\"`) e barras invertidas (`\\`) dentro dos comandos:

```json
{
  "scripts": {
    "dev": "taskly \"npm:start -- --watch\" \"pnpm:build -- --filter @app/web\"",
    "dev:multi": "taskly \"npm:start -- --watch\" \"yarn:test -- --watch\" \"bun:dev -- --hot\""
  }
}
```

- `\"...\"` mantém o token `<pm>:<cmd>` e seus argumentos íntegros.
- Use `--` para separar argumentos do script (pós `run`) dos argumentos do próprio package manager.
- Se precisar incluir barras ou aspas dentro de argumentos, duplique barras (`\\`) e escape aspas (`\"`).

## API

```ts
import { runConcurrently } from "@codemastersolutions/taskly";

const result = await runConcurrently(
  [
    { command: "npm run build", name: "build", shell: true },
    { command: "pnpm test", name: "test", shell: true },
  ],
  {
    maxProcesses: 2,
    killOthersOn: ["failure"],
    prefix: "name",
    successCondition: "all",
  }
);

console.log(result.success);
```

### Atalho `<pm>:<cmd>` na API

Você pode usar o mesmo atalho via API, sem precisar escrever `run` manualmente:

```ts
import { runConcurrently } from "@codemastersolutions/taskly";

await runConcurrently([
  "npm:start", // expande para "npm run start"
  "pnpm:build", // expande para "pnpm run build"
  "yarn:test", // expande para "yarn run test"
  "bun:dev", // expande para "bun run dev"
]);
```

## Build e artefatos

- Scripts de build:
  - `pnpm build:dev` — compila com `tsc` usando `tsconfig.json` (`sourceMap: true`), sem minificação.
  - `pnpm build` — compila com `tsc` e minifica com `esbuild`, preservando `sourceMap` e `//# sourceMappingURL` nos `.js`.
  - `pnpm build:prod` — compila com `tsc -p tsconfig.prod.json` (`sourceMap: false`) e minifica com `esbuild`; remove todos os `*.map` de `dist`.
- Saída:
  - Artefatos ficam em `dist/` (`.js` e `.d.ts`). Comentários são removidos pelo `tsc` (`removeComments: true`).
  - `dist/cli.js` preserva o shebang (`#!/usr/bin/env node`) para execução do CLI.
  - Minificação usa `esbuild` (`legalComments: 'none'`) visando código compacto.
- Dicas de uso:
  - `build:dev` para depuração (código legível + mapas).
  - `build` para minificação com mapas (dev otimizado).
  - `build:prod` para publicação (minificado, sem mapas).

## Troubleshooting

- Execução do CLI
  - Use `taskly` via `bin` instalado pelo npm/pnpm. Em desenvolvimento local, rode `node dist/cli.js` (o shebang está preservado).
- Shell no Windows
  - Auto-detecção: arquivos `.ps1` usam `powershell.exe` e `.bat`/`.cmd` usam `cmd`. Para forçar, use `--shell cmd|powershell|pwsh|bash|sh`.
- Comandos com espaços e aspas
  - `splitCommand` respeita aspas simples/duplas e barras invertidas. Ex.: `"echo \"Hello world\""`.
- Prefixos e template
  - Tipos: `index|pid|time|command|name|none`. Template com placeholders `{index}`, `{pid}`, `{time}`, `{command}`, `{name}`. `none` desativa prefixo.
- `cwd` inválido
  - Se o diretório não existe, o spawn falha. Use `--cwd PATH` ou configure `cwd` por processo.
- `raw` e cores
  - `--raw` desativa prefixo e coloração. Para cores automáticas com prefixo, não use `--raw`.
- Finalização de processos
  - `--kill-others-on success,failure` controla quando finalizar os demais. Combine com `--success-condition all|first|last` conforme necessário.
- Source maps e minificação
  - Dev: `pnpm build:dev` (sem minificação, com `sourceMap`), `pnpm build` (minificado com mapas).
  - Prod: `pnpm build:prod` (minificado sem mapas). Se precisar mapas no dev minificado, já estão preservados.
- Testes e auto-run do CLI
  - Durante testes, o auto-run do CLI é ignorado quando `TASKLY_TEST=1`. Ao rodar localmente, use `taskly` ou `node dist/cli.js`.

### Exemplos práticos

- Windows: execução de `.ps1` e `.bat/.cmd`

  ```bash
  # Auto-detecção de shell para arquivos .ps1 e .bat/.cmd
  taskly "./scripts/build.ps1" "./scripts/test.bat"

  # Forçar shell específico
  taskly --shell powershell "./scripts/build.ps1"
  taskly --shell cmd "./scripts/test.cmd"
  ```

- Prefixo com template e placeholders

  ```bash
  taskly --prefix "[{time}] [{pid}] {name}: " --names api,web \
    "pnpm dev:api" \
    "pnpm dev:web"
  ```

- Diretório de trabalho (`cwd`)

  ```bash
  taskly --cwd ./apps/web "pnpm dev"
  ```

- Saída crua (`--raw`) sem prefixos/cores

  ```bash
  taskly --raw "pnpm build" "pnpm test"
  ```

- Políticas de sucesso e finalização
  ```bash
  # Derruba os demais ao primeiro erro e só considera sucesso se todos terminarem com exit code 0
  taskly --kill-others-on failure --success-condition all \
    "pnpm build" \
    "pnpm test"
  ```

## FAQ

- "Command not found" no macOS/Linux
  - Garanta que o binário está no `PATH` do shell que está executando. Teste o comando diretamente no terminal. Em caso de dúvidas, use caminho absoluto ou scripts do package manager (ex.: `pnpm build`).
- PowerShell bloqueando `.ps1` (Windows)
  - Ajuste a ExecutionPolicy para permitir scripts locais: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
  - Desbloqueie o arquivo baixado: `Unblock-File .\\scripts\\build.ps1`.
- Permissão em Unix para scripts
  - Dê permissão de execução: `chmod +x ./scripts/build.sh`. Inclua shebang (`#!/usr/bin/env bash`) no topo.
- Aspas e escaping em comandos
  - `splitCommand` respeita aspas simples/duplas e `\\`. Exemplo: `taskly "echo \"Hello world\"" "node -e \"console.log('ok')\""`.
- Prefixo por processo e cores (API)

  - No CLI, cores de prefixo são automáticas por processo. Na API, você pode definir cores por processo ou por índice:

  ```ts
  import { runConcurrently } from "@codemastersolutions/taskly";

  await runConcurrently(
    [
      {
        command: "pnpm dev:api",
        name: "api",
        shell: true,
        prefixColor: "blue",
      },
      {
        command: "pnpm dev:web",
        name: "web",
        shell: true,
        prefixColor: "magenta",
      },
    ],
    {
      prefix: "name",
      // ou defina por índice
      // prefixColors: ["blue", "magenta"],
    }
  );
  ```

- Finalização de processos
  - `--kill-others-on success,failure` controla quando encerrar os demais. Em erro/sucesso, enviamos `SIGTERM` e, após ~3s, `SIGKILL` (Unix). No Windows, o encerramento respeita a semântica do Node.
  - Combine com `--success-condition first|last|all` conforme a política desejada.
- Diretório de trabalho
  - Use `--cwd PATH`. Se o path não existir, o spawn falha.
- Segurança ao usar `--shell`
  - Evite interpolar input não confiável. Prefira passar comandos pré-definidos; desative shell quando possível.
- Versões do Node
  - Compatível com Node `>=16`. Desenvolvido e testado com Node 20; o alvo de minificação é `node20`, mas o runtime permanece funcional em versões suportadas.

## Exemplos avançados (CLI)

- `--names` com template de prefixo e cores automáticas por índice

  ```bash
  # Cores de prefixo são atribuídas automaticamente por processo (índice)
  taskly --names api,web,workers \
    --prefix "[{time}] [{pid}] {name}: " \
    "pnpm dev:api" \
    "pnpm dev:web" \
    "node scripts/workers.js"
  ```

- `--prefix-colors` manual e `--timestamp-format` customizado

  ```bash
  # Define cores por índice e formata o timestamp
  taskly --names api,web \
    --prefix "[{time}] {name}: " \
    --prefix-colors blue,magenta \
    --timestamp-format "HH:mm:ss" \
    "pnpm dev:api" \
    "pnpm dev:web"
  ```

- Desabilitar cores e prefixos para depuração bruta

  ```bash
  taskly --raw "pnpm build" "pnpm test"
  ```

- Combinar `--success-condition` e `--kill-others-on`

  ```bash
  # Fecha os demais quando um falhar, e considera sucesso somente se todos foram bem-sucedidos
  taskly --kill-others-on failure --success-condition all \
    "pnpm typecheck" \
    "pnpm test"

  # Fecha os demais ao primeiro sucesso (útil para corrida de comandos alternativos)
  taskly --kill-others-on success --success-condition first \
    "node server.js --port=3000" \
    "node server.js --port=3001"
  ```

- Temas customizados (CLI)
  - É possível definir cores personalizadas por índice usando hex (`#RRGGBB`) ou `rgb(r,g,b)`:
  ```bash
  # Tema customizado com cores 24-bit
  taskly --names api,web,worker \
    --prefix "[{time}] {name}: " \
    --prefix-colors #1E90FF,#FF69B4,rgb(255,200,0) \
    "pnpm dev:api" \
    "pnpm dev:web" \
    "node scripts/worker.js"
  ```
  - Formatos suportados: nomes ANSI (`blue`, `magenta`, `yellow`, etc.), hex (`#RRGGBB`), `rgb(r,g,b)` e `auto`.
  - Não há temas nomeados (ex.: `ocean`, `flamingo`); mantenha hex/rgb ou nomes ANSI para máxima flexibilidade.
  - `auto` escolhe a cor baseada no índice do processo.

## Tabela de flags de controle

| Flag                  | Valores           | Comportamento                                                              |
| --------------------- | ----------------- | -------------------------------------------------------------------------- |
| `--success-condition` | `all` (default)   | Sucesso somente se todos os processos finalizam com `exitCode=0`           |
|                       | `first`           | Sucesso quando o primeiro processo a finalizar retorna `exitCode=0`        |
|                       | `last`            | Sucesso baseado no último processo a finalizar (depende do seu `exitCode`) |
| `--kill-others-on`    | `failure`         | Encerra os demais quando qualquer processo falhar                          |
|                       | `success`         | Encerra os demais quando qualquer processo tiver sucesso                   |
|                       | `success,failure` | Encerra os demais em ambas as condições                                    |

Notas:

- As flags podem ser combinadas. Ex.: `--kill-others-on failure --success-condition all` derruba os demais no primeiro erro e só reporta sucesso se todos concluírem com `0`.
- Quando encerra os demais, envia `SIGTERM` e (se necessário) `SIGKILL` após um pequeno atraso em Unix. No Windows, o encerramento respeita a semântica do Node.

## Programmatic Usage (API)

Tipos principais e opções (TypeScript):

```ts
import { runConcurrently } from "@codemastersolutions/taskly";

export type Command =
  | string
  | {
      command: string;
      name?: string;
      env?: Record<string, string>;
      cwd?: string;
      shell?: boolean | string; // 'cmd' | 'powershell' | 'pwsh' | 'bash' | 'sh' | true
      prefixColor?: string; // 'red' | 'green' | 'blue' | ... | 'auto'
      raw?: boolean;
      restartTries?: number;
      restartDelay?: number; // ms
    };

export interface RunOptions {
  cwd?: string;
  killOthersOn?: Array<"success" | "failure">;
  maxProcesses?: number; // paralelismo
  prefix?: "index" | "pid" | "time" | "command" | "name" | "none" | string; // ou template, ex: "[{time}] [{pid}] {name}: "
  prefixColors?: string[]; // aplicado por índice quando não definido por comando
  successCondition?: "all" | "first" | "last";
  timestampFormat?: string; // default: "yyyy-MM-dd HH:mm:ss.SSS"
  raw?: boolean; // força modo cru para todos
}

export interface RunResult {
  success: boolean;
  results: Array<{ name?: string; exitCode: number; index: number }>;
}
```

Exemplo completo:

```ts
import { runConcurrently } from "@codemastersolutions/taskly";

async function main() {
  const result = await runConcurrently(
    [
      {
        command: "pnpm dev:api",
        name: "api",
        prefixColor: "blue",
        env: { NODE_ENV: "development" },
      },
      {
        command: "pnpm dev:web",
        name: "web",
        cwd: "./apps/web",
        prefixColor: "magenta",
      },
      "echo Done",
    ],
    {
      prefix: "[{time}] [{pid}] {name}: ",
      prefixColors: ["blue", "magenta", "auto"],
      killOthersOn: ["failure"],
      successCondition: "all",
      maxProcesses: 2,
      raw: false,
    }
  );

  console.log(result.success);
  for (const r of result.results) {
    console.log(`#${r.index} (${r.name ?? ""}) -> exit ${r.exitCode}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Observações:

- `prefix` aceita tipos (`index`, `pid`, `time`, `command`, `name`, `none`) ou um template com placeholders (`{index}`, `{pid}`, `{time}`, `{command}`, `{name}`).
- `prefixColor` por comando tem prioridade sobre `prefixColors` global por índice.
- `shell` pode ser `true` (usar o shell padrão), um nome amigável (`cmd`, `powershell`, `pwsh`, `bash`, `sh`) ou um executável customizado.
- As cores aceitam nomes ANSI comuns (ex.: `blue`, `magenta`) e `auto` para seleção automática por índice.

### Temas customizados (API)

- Você pode fornecer cores 24-bit por comando ou por índice (via `prefixColors`) usando hex `#RRGGBB` ou `rgb(r,g,b)`:

```ts
await runConcurrently(
  [
    { command: "pnpm dev:api", name: "api", prefixColor: "#1E90FF" },
    { command: "pnpm dev:web", name: "web", prefixColor: "rgb(255,105,180)" },
    { command: "node scripts/worker.js", name: "worker" },
  ],
  {
    prefix: "[{time}] {name}: ",
    prefixColors: ["#1E90FF", "rgb(255,105,180)", "#00C8FF"],
  }
);
```

Notas:

- Quando especificadas, cores hex (`#RRGGBB`) e `rgb(r,g,b)` usam truecolor (24-bit) em terminais compatíveis.
- Em terminais sem suporte a truecolor, o comportamento é degradado e a saída pode aparecer sem cores.
- Formatos suportados: nomes ANSI, hex, `rgb(r,g,b)` e `auto`. Não há temas nomeados além dos nomes ANSI.

## Security

- Shell mode is disabled by default to reduce injection risk. Use `--shell` or `shell: true` only when needed.
- GitHub Actions include CodeQL analysis and `pnpm audit` checks.

## Publishing

Publishing is automated via GitHub Actions and only occurs when a pull request into `main` is merged successfully and CI checks pass. The workflow bumps the version, creates a tag and GitHub release, and publishes only `dist` and essential files to npm.

## License

MIT
