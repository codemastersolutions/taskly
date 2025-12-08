# @codemastersolutions/taskly

Executor concorrente de comandos e CLI sem dependências, compatível com Node >= 16, escrito em TypeScript. Roda comandos de `npm`, `yarn`, `pnpm`, `bun` e scripts de shell.

## Instalação

```bash
pnpm add @codemastersolutions/taskly -D
```

## Exemplos rápidos

Comandos essenciais para começar:

```bash
# Dois processos em paralelo usando atalhos de package manager
taskly npm:start pnpm:build

# Nomear processos e prefixar pela propriedade 'name'
taskly --names api,web --prefix name "pnpm dev:api" "pnpm dev:web"

# Política: derruba ao primeiro erro e só considera sucesso se todos forem 0
taskly --kill-others-on failure --success-condition all "pnpm build" "pnpm test"

# Saída crua, sem prefixos/cores
taskly --raw "pnpm build" "pnpm test"

# Executar via shell (útil para comandos com espaços/expansões do shell)
taskly --shell "pnpm dev:api" "pnpm dev:web"

# Encaminhar argumentos para scripts com '--'
taskly "npm:start -- --watch" "pnpm:build -- --filter @app/web"

# Ignorar comandos inexistentes
taskly --ignore-missing "npm:does-not-exist" "nonexistent-cmd" "pnpm:build"
```

## Uso via CLI

```bash
taskly --max-processes 2 --prefix name --kill-others-on failure \
  "npm run build" \
  "pnpm test"
```

Opções:

- `--names name1,name2` Atribui nomes por índice.
- `--max-processes N` Limita o paralelismo.
- `--kill-others-on success,failure` Encerra os demais quando um processo tiver sucesso/falha.
- `--prefix type|template` `index|pid|time|command|name|none` ou template customizado com `{index}`, `{pid}`, `{time}`, `{command}`, `{name}`.
- `--success-condition all|first|last` Define a política de sucesso.
- `--raw` Desativa prefixos/cores.
- `--shell` Usa o shell do sistema (menos seguro).
- `--shell [name]` Executa via shell: `cmd|powershell|pwsh|bash|sh` (padrão: shell do sistema).
- `--cwd PATH` Diretório de trabalho.
- `--ignore-missing` Ignora comandos não encontrados ou scripts ausentes no `package.json`.
- `--wildcard-sort m` Controla a ordem dos scripts expandidos: `alpha|package` (padrão: `alpha`). `package` preserva a ordem do `package.json`.
- `--no-wildcard-sort` Atalho para `--wildcard-sort package`.

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

### Comandos wildcard (`*`)

Você pode usar `*` para executar múltiplos scripts do `package.json` que combinem com o padrão:

```bash
# Executa todos os scripts que começam com "start"
taskly pnpm:start*
# Ex.: se houverem scripts: start1, start2, start:watch -> todos serão executados

# Também funciona com outros PMs
taskly npm:test* yarn:build* bun:dev*
```

Regras:

- O wildcard é avaliado contra as chaves de `scripts` do `package.json` no `cwd` (ou por comando, se você definiu `cwd` por comando via API).
- `*` corresponde a qualquer sequência (incluindo vazia). Padrões com múltiplos `*` são suportados.
- Quando não há correspondências:
  - Sem `--ignore-missing`: o comando original é mantido (ex.: `pnpm run dev*`).
  - Com `--ignore-missing`: o comando é ignorado e uma mensagem é emitida em `stderr`.
- Nome dos processos: cada expansão recebe como `name` o nome do script (ex.: `start1`, `start2`, `start:watch`). Se você fornecer um `name` base via API, ele será prefixado (ex.: `svc:start1`).
- Prefixos: ao usar `prefix=name` (padrão), os logs mostrarão `[start1]`, `[start2]` etc. Se houver `name` base, será `[svc:start1]`...
- Paralelismo: por padrão, o número de processos paralelos é igual à quantidade de comandos após expansão do wildcard. Ajuste com `--max-processes` (CLI) ou `maxProcesses` (API) se quiser limitar.

Ordenação dos comandos e nomes (wildcard):

- Padrão: os scripts expandidos por wildcard são ordenados alfabeticamente; os nomes (`--names`) são aplicados nessa ordem.
- Desativar ordenação: use `--wildcard-sort package` ou `--no-wildcard-sort` para preservar a ordem definida no `package.json`. Ao desativar, a ordem dos comandos e o mapeamento de nomes seguem o índice original.

Exemplos de ordenação:

```bash
# Ordem alfabética (padrão): admin, app, customer
taskly --names app,admin,customer "npm:start-watch:*"

# Preservar ordem do package.json
taskly --no-wildcard-sort --names app,admin,customer "npm:start-watch:*"
```

Integração com `--names`:

- Quando você fornece `--names a,b,c` e usa um wildcard, os nomes são aplicados após a expansão, seguindo a ordem dos scripts correspondentes.
- Exemplo: `taskly --names app,admin,customer "npm:start-watch:*"` gera nomes `app`, `admin`, `customer` para cada script expandido, nessa ordem.
- Na API, use `names: ["app","admin","customer"]` em `RunOptions` para o mesmo efeito.

Exemplos de nomes em API:

```ts
import { runConcurrently } from "taskly";

await runConcurrently(
  [
    "pnpm:start*", // nomes: start1, start2, start:watch
    { command: "pnpm:test*", name: "qa" }, // nomes: qa:test1, qa:test:watch...
  ],
  {
    wildcardSort: "alpha", // ou "package" para preservar ordem do package.json
    names: ["app", "admin", "customer"],
  }
);
```

### Validação e ignorar comandos inexistentes

- Com `--ignore-missing`, o Taskly valida antes de executar:
  - Se o executável do comando está disponível no `PATH` (ex.: `pnpm`, `node`, `echo`).
  - Se o script existe no `package.json` quando usar atalhos ou `run` (`npm run <script>`, `pnpm run <script>`, `yarn run <script>`, `bun run <script>`).
- Comandos inválidos são ignorados e não geram erro; uma mensagem é impressa em `stderr` indicando o motivo.

Exemplos:

```bash
# Ignora script inexistente e binário inexistente, executa somente o válido
taskly --ignore-missing "npm:does-not-exist" "nonexistent-cmd" "pnpm:build"
```

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
    ignoreMissing: true,
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

## Glossário de termos

- `prefix` (prefixo): texto exibido antes de cada linha de saída do processo. Pode ser um tipo (`index`, `pid`, `time`, `command`, `name`, `none`) ou um template.
- Template de prefixo: string com placeholders para montar o prefixo, ex.: `"[{time}] [{pid}] {name}: "`.
- Placeholders: variáveis suportadas em templates de prefixo: `{index}`, `{pid}`, `{time}`, `{command}`, `{name}`.
- `raw` (modo cru): desativa prefixos e cores; útil para depuração de saída sem formatação.
- `success-condition` (política de sucesso): define quando o conjunto é considerado bem-sucedido: `all`, `first` ou `last`.
- `kill-others-on`: encerra os processos restantes quando ocorre `success` e/ou `failure` em qualquer processo.
- `cwd` (diretório de trabalho): caminho de execução do processo. Pode ser global ou por comando.
- `shell`: executa o comando via shell (`cmd`, `powershell`, `pwsh`, `bash`, `sh`) ou o shell padrão quando `true`.
- `prefixColor` / `prefixColors`: cor do prefixo por comando ou lista de cores por índice. Suporta nomes ANSI (`blue`, `magenta`), hex (`#RRGGBB`) e `rgb(r,g,b)`.
- `timestampFormat`: formatação do `{time}` no prefixo, ex.: `"yyyy-MM-dd HH:mm:ss.SSS"`.

## Uso Programático (API)

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
  ignoreMissing?: boolean; // ignora comandos não resolvidos e scripts ausentes
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

## Segurança

- O modo shell é desativado por padrão para reduzir risco de injeção. Use `--shell` ou `shell: true` apenas quando necessário.
- O GitHub Actions inclui análise CodeQL e checagens com `pnpm audit`.

## Publicação

A publicação é automatizada via GitHub Actions e ocorre apenas quando um pull request para `main` é mesclado com sucesso e os checks de CI passam. O workflow atualiza a versão, cria a tag e o release no GitHub, e publica somente `dist` e arquivos essenciais no npm.

## Licença

MIT
