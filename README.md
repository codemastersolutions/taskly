# @codemastersolutions/taskly

Languages: [English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

Concurrent command runner and zero-deps CLI for Node >= 16, written in TypeScript. Runs commands for `npm`, `yarn`, `pnpm`, `bun` and plain shell scripts.

## Installation

```bash
pnpm add @codemastersolutions/taskly -D
```

## Quick Examples

```bash
# Two processes in parallel using package manager shortcuts
taskly npm:start pnpm:build

# Name processes and prefix logs by name
taskly --names api,web --prefix name "pnpm dev:api" "pnpm dev:web"

# Policy: kill others on first failure; success only if all exit 0
taskly --kill-others-on failure --success-condition all "pnpm build" "pnpm test"

# Raw output, no prefixes/colors
taskly --raw "pnpm build" "pnpm test"

# Run via shell (handy for commands with spaces/shell expansions)
taskly --shell "pnpm dev:api" "pnpm dev:web"

# Forward arguments to scripts with '--'
taskly "npm:start -- --watch" "pnpm:build -- --filter @app/web"

# Ignore missing commands
taskly --ignore-missing "npm:does-not-exist" "nonexistent-cmd" "pnpm:build"
```

## CLI Usage

```bash
taskly --max-processes 2 --prefix name --kill-others-on failure \
  "npm run build" \
  "pnpm test"
```

## Options

- `--names name1,name2` Assign names by index (alias: `--name`).
- `--max-processes N` Limit parallelism.
- `--kill-others-on success,failure` Kill the remaining on success/failure.
- `--prefix type|template` `index|pid|time|command|name|none` or a template with `{index}`, `{pid}`, `{time}`, `{command}`, `{name}`.
- `--prefix-colors c1,c2` Prefix colors per index (e.g., `blue,magenta,auto`). Aliases: `--prefixColor`, `--prefixColors`.
- `--timestamp-format fmt` Timestamp format for `{time}` (default: `yyyy-MM-dd HH:mm:ss.SSS`).
- `--success-condition all|first|last` Success policy.
- `--raw` Disable prefixing and coloring.
- `--shell` Use system shell (less safe).
- `--shell [name]` Run via shell: `cmd|powershell|pwsh|bash|sh` (default: system shell).
- `--cwd PATH` Working directory.
- `--ignore-missing` Skip commands not found or missing scripts in `package.json`.
- `--wildcard-sort m` Control order of expanded scripts: `alpha|package` (default: `alpha`). `package` preserves `package.json` order.
- `--no-wildcard-sort` Shortcut for `--wildcard-sort package`.
- `-h, --help` Show help.

### Package Manager Shortcut (`<pm>:<cmd>`)

Taskly accepts tokens `<package manager>:<command>` and expands them to `run` automatically:

```bash
# Supported expansions
taskly npm:start pnpm:build yarn:test bun:dev
# Equivalent to:
# npm:start -> npm run start
# pnpm:build -> pnpm run build
# yarn:test -> yarn run test
# bun:dev   -> bun run dev

# Forwarding args to the script
taskly "npm:start -- --watch" "pnpm:build -- --filter @app/web"
```

Notes:

- Compatible with `npm`, `pnpm`, `yarn`, `bun`.
- We use `yarn run` for cross-version compatibility.
- Use quotes to preserve spaces and `--` to forward args to the script of the package manager.

### Wildcard Commands (`*`)

Use `*` to execute multiple `package.json` scripts matching a pattern:

```bash
# Run all scripts starting with "start"
taskly pnpm:start*
# Example: if there are scripts start1, start2, start:watch -> all run

# Works with other PMs too
taskly npm:test* yarn:build* bun:dev*
```

Rules:

- The wildcard matches against `scripts` keys in `package.json` for the `cwd` (or per command if `cwd` is set in the API).
- `*` matches any sequence (including empty). Multiple `*` are supported.
- When no matches:
  - Without `--ignore-missing`: the original command is kept (e.g., `pnpm run dev*`).
  - With `--ignore-missing`: the command is skipped and a message is printed to `stderr`.
- Process names: each expansion gets the script name as `name` (e.g., `start1`, `start2`, `start:watch`). If you provide a base `name` via API, it is prefixed (e.g., `svc:start1`).
- Prefix: using `prefix=name` (default), logs show `[start1]`, `[start2]` etc. With base `name`, `[svc:start1]`...
- Parallelism: by default, the number of parallel processes equals the number of commands after wildcard expansion. Adjust with `--max-processes` (CLI) or `maxProcesses` (API).

Ordering of commands and names:

- Default: expanded scripts are sorted alphabetically; names (`--names`) are applied in that order.
- Disable sorting: use `--wildcard-sort package` or `--no-wildcard-sort` to preserve `package.json` order. When disabled, command order and `--names` mapping follow the original index.

Examples:

```bash
# Alphabetical order (default): admin, app, customer
taskly --names app,admin,customer "npm:start-watch:*"

# Preserve package.json order
taskly --no-wildcard-sort --names app,admin,customer "npm:start-watch:*"
```

Integration with `--names`:

- When you provide `--names a,b,c` with a wildcard, names are applied after expansion, following the order of matched scripts.
- Example: `taskly --names app,admin,customer "npm:start-watch:*"` yields names `app`, `admin`, `customer` in order.
- In the API, use `names: ["app","admin","customer"]` in `RunOptions` for the same effect.

API examples for names:

```ts
import { runConcurrently } from "@codemastersolutions/taskly";

await runConcurrently(
  [
    "pnpm:start*", // names: start1, start2, start:watch
    { command: "pnpm:test*", name: "qa" }, // names: qa:test1, qa:test:watch...
  ],
  {
    wildcardSort: "alpha", // or "package" to preserve package.json order
    names: ["app", "admin", "customer"],
  }
);
```

### Validation and ignore missing

- With `--ignore-missing`, Taskly validates before execution:
  - Whether the command executable is available on `PATH` (e.g., `pnpm`, `node`, `echo`).
  - Whether the script exists in `package.json` when using shortcuts or `run` (`npm run <script>`, `pnpm run <script>`, `yarn run <script>`, `bun run <script>`).
- Invalid commands are skipped without error; a message is printed to `stderr` explaining the reason.

Examples:

```bash
# Skip nonexistent script and nonexistent binary; run only the valid one
taskly --ignore-missing "npm:does-not-exist" "nonexistent-cmd" "pnpm:build"
```

#### Quick mapping table

| Shortcut        | Expansion           |
| --------------- | ------------------- |
| `npm:<script>`  | `npm run <script>`  |
| `pnpm:<script>` | `pnpm run <script>` |
| `yarn:<script>` | `yarn run <script>` |
| `bun:<script>`  | `bun run <script>`  |

#### Auto color sequence (index → color)

When using `--prefix-colors auto,auto`, Taskly cycles colors by index:

| Index | Color   |
| ----- | ------- |
| 0     | cyan    |
| 1     | yellow  |
| 2     | green   |
| 3     | magenta |
| 4     | blue    |
| 5     | white   |
| 6     | gray    |
| 7     | red     |

## Example in package.json (pnpm)

Run two processes in parallel with names, limited parallelism, and kill others on first failure:

```json
{
  "scripts": {
    "dev": "taskly --names api,web --prefix name --max-processes 2 --kill-others-on failure --success-condition all --shell \"pnpm dev:api\" \"pnpm dev:web\"",
    "dev:api": "node -e \"console.log('API ready'); setInterval(()=>{}, 10000)\"",
    "dev:web": "node -e \"console.log('WEB ready'); setInterval(()=>{}, 10000)\""
  }
}
```

- Use `--names` to identify logs for each process (`[api]`, `[web]`).
- `--kill-others-on failure` kills the other process if any fails.
- `--shell` allows passing full commands as strings (useful for `pnpm` scripts).
- Adjust `--success-condition` according to desired policy (`all|first|last`).

### Example in package.json (shortcuts `<pm>:<cmd>`)

This example chains scripts from different package managers using shortcut syntax:

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

- `taskly npm:start` expands to `npm run start`.
- `taskly pnpm:build` expands to `pnpm run build`.
- `taskly yarn:test` expands to `yarn run test`.
- `taskly bun:dev` expands to `bun run dev`.

### Argument forwarding (`--`) in package.json

You can forward flags to package manager scripts using `--`. In `package.json`, wrap the command in quotes and escape as needed:

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

- `npm:start -- --watch` forwards `--watch` to the `npm` script `start`.
- `pnpm:build -- --filter @app/web` applies `--filter` to the `pnpm` `build` script.
- `yarn:test -- --watch` forwards `--watch` to the `yarn` `test` script.
- `bun:dev -- --hot` passes `--hot` to the `bun` `dev` script.

### Escaping in JSON (quotes and backslashes)

In `package.json`, remember to escape quotes (`\"`) and backslashes (`\\`) within commands.

## Library API (Programmatic Use)

Taskly can be used programmatically via its library API. Import `runConcurrently` and pass a list of commands plus options.

```ts
import {
  runConcurrently,
  type Command,
  type RunOptions,
} from "@codemastersolutions/taskly";

const commands: Command[] = [
  // Shortcut expansion also works in API
  "pnpm:build",
  // Per-command configuration with API-only capabilities
  {
    command: "node scripts/serve.js",
    name: "server",
    env: { NODE_ENV: "production" }, // API-only: per-command env
    cwd: "./apps/api", // API-only: per-command cwd
    shell: "bash", // API-only: per-command shell override
    prefixColor: "green", // API-only: per-command prefix color
    raw: false,
    restartTries: 2, // API-only: restart on failure
    restartDelay: 500, // API-only: delay between retries (ms)
  },
];

const options: RunOptions = {
  maxProcesses: 2,
  killOthersOn: ["failure"],
  prefix: "name",
  prefixColors: ["blue", "auto"],
  timestampFormat: "yyyy-MM-dd HH:mm:ss.SSS",
  successCondition: "all",
  raw: false,
  cwd: process.cwd(),
  ignoreMissing: true,
  names: ["build", "server"],
  wildcardSort: "alpha",
};

const result = await runConcurrently(commands, options);
console.log(result.success); // boolean
console.log(result.results); // [{ name?: string; exitCode: number; index: number }, ...]
```

### API-only features

- Per-command environment via `env`.
- Per-command working directory via `cwd`.
- Per-command shell override via `shell` with friendly names: `cmd|powershell|pwsh|bash|sh` or a custom executable/path.
- Per-command `prefixColor` to override global `prefixColors`.
- Per-command `raw` to disable prefix/color for a single command.
- Restart on failure with `restartTries` and `restartDelay`.
- Structured result via `RunResult` (`success` and per-command `exitCode`/`name`/`index`).

## Imports

- Library usage:
  ```ts
  import { runConcurrently } from "@codemastersolutions/taskly";
  import type {
    Command,
    RunOptions,
    RunResult,
  } from "@codemastersolutions/taskly";
  ```
- Programmatic CLI entry (if you need to invoke the CLI from code):
  ```ts
  import { cliEntry } from "@codemastersolutions/taskly/cli";
  // await cliEntry(); // runs the CLI with current process argv
  ```
- Notes:
  - The recommended way to use the CLI is via the `taskly` binary.
  - The library is ESM-only and ships TypeScript types.

## CLI Usage

- Basic usage:
  - `taskly [options] "cmd1 arg" "cmd2 arg" ...`
- Common options:

  - `--names name1,name2` assigns names by index.
  - `--prefix type|template` supports `index|pid|time|command|name|none` or `{placeholders}`.
  - `--prefix-colors c1,c2` sets per-index colors (e.g., `blue,magenta,auto`).

    - Aliases: `--prefixColor`, `--prefixColors`.
    - Color notes:
      - Named ANSI: `gray`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`.
      - Truecolor: `#RRGGBB` or `rgb(r,g,b)`.
      - `auto` cycles per index: `[cyan, yellow, green, magenta, blue, white, gray, red]`.
      - If a color is unknown, text is not colorized.

  - Example: `--prefix-colors auto,auto` with two commands

    The `auto` palette is applied per index, so two commands both configured with `auto` will still render with different colors (index 0 → `cyan`, index 1 → `yellow`).

    Command:

    ```sh
    pnpm taskly --names a,b \
      --prefix-colors auto,auto \
      -- node -e "console.log('hello A')" \
      -- node -e "console.log('hello B')"
    ```

    Outcome:

    - `[a]` prefix rendered in `cyan` (index 0)
    - `[b]` prefix rendered in `yellow` (index 1)

  - `--timestamp-format fmt` controls `{time}` format (default `yyyy-MM-dd HH:mm:ss.SSS`).
  - `--success-condition s` supports `all|first|last` (default `all`).
  - `--raw` disables prefixing and coloring.
  - `--shell [name]` detects or forces a shell: `cmd|powershell|pwsh|bash|sh`.
  - `--cwd PATH` sets working directory.
  - `--ignore-missing` skips missing commands or scripts.
  - `--wildcard-sort m` supports `alpha|package`; `--no-wildcard-sort` equals `package`.

- Examples:
  - Prefix by name with explicit colors:
    ```sh
    taskly --names api,web --prefix name --prefix-colors red,blue \
      "node -e \"process.exit(0)\"" \
      "node -e \"process.exit(0)\""
    ```
  - Using aliases:
    ```sh
    taskly --names a,b --prefix name --prefixColor green,auto \
      "node -e \"process.exit(0)\"" \
      "node -e \"process.exit(0)\""
    ```
  - Forcing shell via next token or equals form:
    ```sh
    taskly --shell bash "node -e \"process.exit(0)\"" "node -e \"process.exit(0)\""
    taskly --shell=sh "node -e \"process.exit(0)\"" "node -e \"process.exit(0)\""
    ```
