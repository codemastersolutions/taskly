# @codemastersolutions/taskly

Idiomas: [English](README.md) | [Portugués (Brasil)](README.pt-BR.md) | [Español](README.es.md)

Runner concurrente de comandos y CLI sin dependencias para Node >= 16, escrito en TypeScript. Ejecuta comandos de `npm`, `yarn`, `pnpm`, `bun` y scripts de shell.

## Instalación

```bash
pnpm add @codemastersolutions/taskly -D
npm install @codemastersolutions/taskly -D
yarn add @codemastersolutions/taskly -D
bun add @codemastersolutions/taskly -D
```

## Ejemplos rápidos

```bash
# Dos procesos en paralelo usando atajos del gestor de paquetes
taskly npm:start pnpm:build

# Nombrar procesos y prefijar logs por nombre
taskly --names api,web --prefix name "pnpm dev:api" "pnpm dev:web"

# Política: matar otros al primer fallo; éxito solo si todos salen 0
taskly --kill-others-on failure --success-condition all "pnpm build" "pnpm test"

# Salida cruda, sin prefijos/colores
taskly --raw "pnpm build" "pnpm test"

# Ejecutar vía shell (útil para comandos con espacios/expansiones)
taskly --shell "pnpm dev:api" "pnpm dev:web"

# Reenviar argumentos a scripts con '--'
taskly "npm:start -- --watch" "pnpm:build -- --filter @app/web"

# Ignorar comandos inexistentes
taskly --ignore-missing "npm:does-not-exist" "nonexistent-cmd" "pnpm:build"
```

## Uso de CLI

```bash
taskly --max-processes 2 --prefix name --kill-others-on failure \
  "npm run build" \
  "pnpm test"
```

## Opciones

- `--names name1,name2` Asigna nombres por índice (alias: `--name`).
- `--max-processes N` Limita el paralelismo.
- `--kill-others-on success,failure` Mata los demás en éxito/fallo.
- `--prefix type|template` `index|pid|time|command|name|none` o plantilla con `{index}`, `{pid}`, `{time}`, `{command}`, `{name}`.
- `--prefix-colors c1,c2` Colores por índice (p. ej., `blue,magenta,auto`). Alias: `--prefixColor`, `--prefixColors`.
- `--timestamp-format fmt` Formato de tiempo para `{time}` (por defecto: `yyyy-MM-dd HH:mm:ss.SSS`).
- `--success-condition all|first|last` Política de éxito.
- `--raw` Desactiva prefijos y colores.
- `--shell` Usa el shell del sistema (menos seguro).
- `--shell [name]` Ejecuta vía shell: `cmd|powershell|pwsh|bash|sh` (por defecto: shell del sistema).
- `--cwd PATH` Directorio de trabajo.
- `--ignore-missing` Ignora comandos no encontrados o scripts ausentes en `package.json`.
- `--wildcard-sort m` Orden de scripts expandidos: `alpha|package` (por defecto: `alpha`). `package` preserva el orden de `package.json`.
- `--no-wildcard-sort` Atajo para `--wildcard-sort package`.
- `-h, --help` Mostrar ayuda.

### Atajo de gestor de paquetes (`<pm>:<cmd>`)

Taskly acepta tokens `<gestor>:<comando>` y los expande a `run` automáticamente:

```bash
taskly npm:start pnpm:build yarn:test bun:dev
# Equivalencias:
# npm:start -> npm run start
# pnpm:build -> pnpm run build
# yarn:test -> yarn run test
# bun:dev   -> bun run dev

# Reenviar argumentos al script
taskly "npm:start -- --watch" "pnpm:build -- --filter @app/web"
```

Notas:

- Compatible con `npm`, `pnpm`, `yarn`, `bun`.
- `yarn run` para compatibilidad entre versiones.
- Usa comillas para preservar espacios y `--` para reenviar argumentos.

### Comandos wildcard (`*`)

Usa `*` para ejecutar múltiples scripts de `package.json` que coincidan con el patrón:

```bash
# Ejecuta todos los scripts que comienzan con "start"
taskly pnpm:start*
# Ejemplo: si hay start1, start2, start:watch -> todos se ejecutan

# También funciona con otros gestores
taskly npm:test* yarn:build* bun:dev*
```

Reglas:

- El wildcard se evalúa contra las claves `scripts` en `package.json` del `cwd` (o por comando si definiste `cwd` vía API).
- `*` coincide con cualquier secuencia (incluida vacía). Soporta múltiples `*`.
- Cuando no hay coincidencias:
  - Sin `--ignore-missing`: se mantiene el comando original (p. ej., `pnpm run dev*`).
  - Con `--ignore-missing`: se ignora el comando e imprime un mensaje en `stderr`.
- Nombres de proceso: cada expansión recibe como `name` el nombre del script (p. ej., `start1`, `start2`, `start:watch`). Si provees un `name` base vía API, se prefija (p. ej., `svc:start1`).
- Prefijos: con `prefix=name` (predeterminado), los logs muestran `[start1]`, `[start2]` etc. Con `name` base, `[svc:start1]`...
- Paralelismo: por defecto, el número de procesos paralelos iguala los comandos tras la expansión. Ajusta con `--max-processes` (CLI) o `maxProcesses` (API).

Orden de comandos y nombres:

- Predeterminado: los scripts expandidos se ordenan alfabéticamente; los nombres (`--names`) se aplican en esa orden.
- Desactivar ordenación: usa `--wildcard-sort package` o `--no-wildcard-sort` para preservar el orden de `package.json`. Al desactivar, el orden y el mapeo de `--names` siguen el índice original.

Ejemplos:

```bash
# Orden alfabética (predeterminado): admin, app, customer
taskly --names app,admin,customer "npm:start-watch:*"

# Preservar el orden de package.json
taskly --no-wildcard-sort --names app,admin,customer "npm:start-watch:*"
```

Integración con `--names`:

- Con `--names a,b,c` y wildcard, los nombres se aplican tras la expansión según el orden de scripts.
- Ejemplo: `taskly --names app,admin,customer "npm:start-watch:*"` produce `app`, `admin`, `customer`.
- En la API, usa `names: ["app","admin","customer"]` en `RunOptions`.

Ejemplo de API para nombres:

```ts
import { runConcurrently } from "@codemastersolutions/taskly";

await runConcurrently(["pnpm:start*", { command: "pnpm:test*", name: "qa" }], {
  wildcardSort: "alpha",
  names: ["app", "admin", "customer"],
});
```

### Validación e ignorar faltantes

- Con `--ignore-missing`, Taskly valida antes de ejecutar:
  - Si el ejecutable está en `PATH` (p. ej., `pnpm`, `node`, `echo`).
  - Si el script existe en `package.json` al usar atajos o `run`.
- Comandos inválidos se ignoran sin error; se imprime un mensaje en `stderr`.

#### Tabla de mapeos rápida

| Atajo           | Expansión           |
| --------------- | ------------------- |
| `npm:<script>`  | `npm run <script>`  |
| `pnpm:<script>` | `pnpm run <script>` |
| `yarn:<script>` | `yarn run <script>` |
| `bun:<script>`  | `bun run <script>`  |

#### Secuencia de colores automática (índice → color)

Con `--prefix-colors auto,auto`, Taskly rota colores por índice:

| Índice | Color   |
| ------ | ------- |
| 0      | cyan    |
| 1      | yellow  |
| 2      | green   |
| 3      | magenta |
| 4      | blue    |
| 5      | white   |
| 6      | gray    |
| 7      | red     |

## Ejemplo en package.json (pnpm)

```json
{
  "scripts": {
    "dev": "taskly --names api,web --prefix name --max-processes 2 --kill-others-on failure --success-condition all --shell \"pnpm dev:api\" \"pnpm dev:web\"",
    "dev:api": "node -e \"console.log('API ready'); setInterval(()=>{}, 10000)\"",
    "dev:web": "node -e \"console.log('WEB ready'); setInterval(()=>{}, 10000)\""
  }
}
```

- `--names` identifica la salida de cada proceso.
- `--kill-others-on failure` mata el otro proceso si alguno falla.
- `--shell` permite pasar comandos completos como strings.
- Ajusta `--success-condition` según la política deseada.

### Ejemplo `<pm>:<cmd>` en package.json

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

- `taskly npm:start` -> `npm run start`.
- `taskly pnpm:build` -> `pnpm run build`.
- `taskly yarn:test` -> `yarn run test`.
- `taskly bun:dev` -> `bun run dev`.

### Reenvío de argumentos (`--`) en package.json

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

- Escapa comillas (`\"`) y barras (`\\`) dentro de comandos.

## Importaciones recomendadas

- Uso de la librería:
  ```ts
  import { runConcurrently } from "@codemastersolutions/taskly";
  import type {
    Command,
    RunOptions,
    RunResult,
  } from "@codemastersolutions/taskly";
  ```
- Entrada programática de la CLI (si necesitas invocar la CLI desde código):
  ```ts
  import { cliEntry } from "@codemastersolutions/taskly/cli";
  // await cliEntry(); // ejecuta la CLI con el argv del proceso actual
  ```
- Notas:
  - La forma recomendada de usar la CLI es mediante el binario `taskly`.
  - La librería es sólo ESM y publica tipos TypeScript.

## Uso de la CLI

- Uso básico:
  - `taskly [options] "cmd1 arg" "cmd2 arg" ...`
- Opciones comunes:

  - `--names name1,name2` asigna nombres por índice.
  - `--prefix type|template` admite `index|pid|time|command|name|none` o `{placeholders}`.
  - `--prefix-colors c1,c2` define colores por índice (p. ej., `blue,magenta,auto`).

    - Aliases: `--prefixColor`, `--prefixColors`.
    - Notas de color:
      - ANSI con nombre: `gray`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`.
      - Truecolor: `#RRGGBB` o `rgb(r,g,b)`.
      - `auto` cicla por índice: `[cyan, yellow, green, magenta, blue, white, gray, red]`.
      - Si el color es desconocido, el texto no se colorea.

  - Ejemplo: `--prefix-colors auto,auto` con dos comandos

    La paleta `auto` se aplica por índice; por lo tanto, dos comandos configurados con `auto` se renderizan con colores diferentes (índice 0 → `cyan`, índice 1 → `yellow`).

    Comando:

    ```sh
    pnpm taskly --names a,b \
      --prefix-colors auto,auto \
      -- node -e "console.log('hello A')" \
      -- node -e "console.log('hello B')"
    ```

    Resultado:

    - Prefijo `[a]` renderizado en `cyan` (índice 0)
    - Prefijo `[b]` renderizado en `yellow` (índice 1)

  - `--timestamp-format fmt` controla el formato de `{time}` (por defecto `yyyy-MM-dd HH:mm:ss.SSS`).
  - `--success-condition s` admite `all|first|last` (por defecto `all`).
  - `--raw` deshabilita prefijos y colores.
  - `--shell [name]` detecta o fuerza el shell: `cmd|powershell|pwsh|bash|sh`.
  - `--cwd PATH` define el directorio de trabajo.
  - `--ignore-missing` ignora comandos o scripts ausentes.
  - `--wildcard-sort m` admite `alpha|package`; `--no-wildcard-sort` equivale a `package`.

- Ejemplos:
  - Prefijo por nombre con colores explícitos:
    ```sh
    taskly --names api,web --prefix name --prefix-colors red,blue \
      "node -e \"process.exit(0)\"" \
      "node -e \"process.exit(0)\""
    ```
  - Usando aliases:
    ```sh
    taskly --names a,b --prefix name --prefixColor green,auto \
      "node -e \"process.exit(0)\"" \
      "node -e \"process.exit(0)\""
    ```
  - Forzando shell con token siguiente o forma con `=`:
    ```sh
    taskly --shell bash "node -e \"process.exit(0)\"" "node -e \"process.exit(0)\""
    taskly --shell=sh "node -e \"process.exit(0)\"" "node -e \"process.exit(0)\""
    ```

## API de la Biblioteca (uso programático)

Además de la CLI, Taskly puede usarse como librería. Importa `runConcurrently` y pasa la lista de comandos y opciones.

```ts
import {
  runConcurrently,
  type Command,
  type RunOptions,
} from "@codemastersolutions/taskly";

const commands: Command[] = [
  // Los atajos de gestor también funcionan en la API
  "pnpm:build",
  // Configuración por comando con capacidades exclusivas de la API
  {
    command: "node scripts/serve.js",
    name: "server",
    env: { NODE_ENV: "production" }, // API-only: entorno por comando
    cwd: "./apps/api", // API-only: directorio por comando
    shell: "bash", // API-only: shell por comando
    prefixColor: "green", // API-only: color de prefijo por comando
    raw: false,
    restartTries: 2, // API-only: reintento en fallo
    restartDelay: 500, // API-only: demora entre intentos (ms)
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

### Funciones exclusivas de la API

- Entorno por comando vía `env`.
- Directorio de trabajo por comando vía `cwd`.
- Shell por comando vía `shell` con nombres amigables: `cmd|powershell|pwsh|bash|sh` o ejecutable/ruta personalizada.
- `prefixColor` por comando para sobrescribir `prefixColors` global.
- `raw` por comando para desactivar prefijo/colores en un único comando.
- Reintentos en fallo con `restartTries` y `restartDelay`.
- Resultado estructurado vía `RunResult` (`success` y por comando `exitCode`/`name`/`index`).
