import { spawn } from "node:child_process";
import { PrefixType, splitCommand } from "./utils/args.js";
import { colorize, timestamp } from "./utils/format.js";

export type Command =
  | string
  | {
      command: string;
      name?: string;
      env?: Record<string, string>;
      cwd?: string;
      shell?: boolean | string; // supports specific shell executable (e.g., 'cmd', 'powershell', 'pwsh', 'bash', 'sh')
      prefixColor?: string; // 'red' | 'green' | ... | 'auto'
      raw?: boolean;
      restartTries?: number;
      restartDelay?: number; // ms
    };

export interface RunOptions {
  cwd?: string;
  killOthersOn?: Array<"success" | "failure">;
  maxProcesses?: number; // parallelism
  prefix?: PrefixType | string; // template string is allowed, e.g. "[{time} {pid}]"
  prefixColors?: string[]; // applied by index when not provided per-command
  successCondition?: "all" | "first" | "last";
  timestampFormat?: string;
  raw?: boolean; // force raw mode for all commands
}

export interface RunResult {
  success: boolean;
  results: Array<{ name?: string; exitCode: number; index: number }>;
}

interface InternalCmd {
  index: number;
  config: Exclude<Command, string> & {
    parsed: { cmd: string; args: string[] };
  };
}

function expandPackageManagerShortcut(input: string): string {
  const m = /^(npm|pnpm|yarn|bun):(.+)$/.exec(input);
  if (!m) return input;
  const pm = m[1];
  const script = m[2];
  // Normalize whitespace in script
  const s = script.trim();
  switch (pm) {
    case "npm":
      return `npm run ${s}`;
    case "pnpm":
      return `pnpm run ${s}`;
    case "yarn":
      // Use 'yarn run' for cross-version compatibility
      return `yarn run ${s}`;
    case "bun":
      return `bun run ${s}`;
    default:
      return input;
  }
}

function toInternal(index: number, cmd: Command): InternalCmd {
  if (typeof cmd === "string") {
    const expanded = expandPackageManagerShortcut(cmd);
    const parsed = splitCommand(expanded);
    return {
      index,
      config: {
        command: expanded,
        parsed,
        shell: false,
        restartTries: 0,
        restartDelay: 0,
      },
    } as InternalCmd;
  }
  const expanded = expandPackageManagerShortcut(cmd.command);
  const parsed = splitCommand(expanded);
  return {
    index,
    config: {
      ...cmd,
      command: expanded,
      parsed,
      restartTries: cmd.restartTries ?? 0,
      restartDelay: cmd.restartDelay ?? 0,
    },
  };
}

function makePrefix(
  t: PrefixType | string,
  idx: number,
  name: string | undefined,
  pid: number | undefined,
  cmd: string,
  timeFmt: string
): string {
  if (!t || t === "none") return "";
  if (
    t !== "index" &&
    t !== "pid" &&
    t !== "time" &&
    t !== "command" &&
    t !== "name"
  ) {
    // template mode
    return (
      t
        .replace("{index}", String(idx))
        .replace("{pid}", String(pid ?? ""))
        .replace("{time}", timestamp(timeFmt))
        .replace("{command}", cmd)
        .replace("{name}", name ?? "") + " "
    );
  }
  switch (t) {
    case "index":
      return `[${idx}] `;
    case "pid":
      return pid ? `[${pid}] ` : "";
    case "time":
      return `[${timestamp(timeFmt)}] `;
    case "command":
      return `[${cmd.slice(0, 16)}] `;
    case "name":
      return name ? `[${name}] ` : `[${idx}] `;
    default:
      return "";
  }
}

export async function runConcurrently(
  commands: Command[],
  options: RunOptions = {}
): Promise<RunResult> {
  const queue = commands.map((c, i) => toInternal(i, c));
  const parallelism = Math.max(1, options.maxProcesses ?? commands.length);
  const killOn = new Set(options.killOthersOn ?? []);
  const results: Array<{ name?: string; exitCode: number; index: number }> = [];
  let running = new Map<number, ReturnType<typeof spawn>>();
  let killed = false;
  let firstExitCode: number | undefined = undefined;

  const startNext = async (): Promise<void> => {
    if (killed) return;
    if (queue.length === 0) return;
    if (running.size >= parallelism) return;
    const item = queue.shift()!;
    const env = { ...process.env, ...(item.config.env ?? {}) };
    const cwd = item.config.cwd ?? options.cwd ?? process.cwd();
    const resolveShell = (
      shellOpt: boolean | string | undefined,
      rawCommand: string
    ): boolean | string => {
      if (typeof shellOpt === "string" && shellOpt.length > 0) {
        // Map friendly names to executables per platform
        const isWin = process.platform === "win32";
        const map: Record<string, string> = isWin
          ? {
              cmd: "cmd.exe",
              powershell: "powershell.exe",
              pwsh: "pwsh.exe",
              bash: "bash",
              sh: "sh",
            }
          : {
              cmd: "cmd",
              powershell: "powershell",
              pwsh: "pwsh",
              bash: "/bin/bash",
              sh: "/bin/sh",
            };
        return map[shellOpt] ?? shellOpt; // allow custom executable
      }
      if (shellOpt === true) return true;
      // Auto-detect on Windows for .ps1/.bat/.cmd
      if (process.platform === "win32") {
        const lower = rawCommand.toLowerCase();
        if (lower.endsWith(".ps1")) return "powershell.exe";
        if (lower.endsWith(".bat") || lower.endsWith(".cmd")) return true; // defaults to cmd.exe
      }
      return false;
    };

    const shellValue = resolveShell(item.config.shell, item.config.command);
    const child = shellValue
      ? spawn(item.config.command, {
          env,
          cwd,
          shell: shellValue,
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn(item.config.parsed.cmd, item.config.parsed.args, {
          env,
          cwd,
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        });
    running.set(item.index, child);
    const prefixColor =
      item.config.prefixColor ?? options.prefixColors?.[item.index];
    const raw = Boolean(item.config.raw ?? options.raw);
    const prefix = raw
      ? ""
      : makePrefix(
          options.prefix ?? "name",
          item.index,
          item.config.name,
          child.pid,
          item.config.parsed.cmd,
          options.timestampFormat ?? "yyyy-MM-dd HH:mm:ss.SSS"
        );

    const write = (data: Buffer, stream: NodeJS.WriteStream) => {
      const text = data.toString();
      if (raw) {
        stream.write(text);
      } else {
        const colored = colorize(prefix, prefixColor ?? "auto", item.index);
        const merged = text.replace(/\n$/, "");
        for (const line of merged.split(/\r?\n/)) {
          stream.write(`${colored}${line}\n`);
        }
      }
    };

    child.stdout?.on("data", (d: Buffer) => write(d, process.stdout));
    child.stderr?.on("data", (d: Buffer) => write(d, process.stderr));

    child.on("exit", (code: number | null) => {
      const exitCode = code ?? 0;
      results.push({ name: item.config.name, exitCode, index: item.index });
      if (firstExitCode === undefined) firstExitCode = exitCode;
      running.delete(item.index);

      const didFail = exitCode !== 0;
      const didSucceed = exitCode === 0;
      if (
        !killed &&
        ((didFail && killOn.has("failure")) ||
          (didSucceed && killOn.has("success")))
      ) {
        killed = true;
        for (const ch of running.values()) {
          ch.kill("SIGTERM");
          // finalizer after delay
          setTimeout(() => ch.kill("SIGKILL"), 3000).unref();
        }
        running.clear();
      }

      // restart logic
      if (
        !killed &&
        item.config.restartTries &&
        exitCode !== 0 &&
        item.config.restartTries > 0
      ) {
        item.config.restartTries!--;
        queue.unshift(item); // retry immediately after delay
        setTimeout(() => startNext(), item.config.restartDelay ?? 0);
        return;
      }

      // spin up next in queue
      void startNext();
    });

    // Start more if capacity remains
    void startNext();
  };

  // Prime workers
  for (let i = 0; i < parallelism; i++) {
    await startNext();
  }

  // Wait for completion
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (running.size === 0 && queue.length === 0) resolve();
      else setTimeout(tick, 25);
    };
    tick();
  });

  // success determination
  let success = false;
  const cond = options.successCondition ?? "all";
  if (cond === "all") success = results.every((r) => r.exitCode === 0);
  else if (cond === "first") {
    success = Number(firstExitCode ?? -1) === 0;
  } else if (cond === "last")
    success = (results[results.length - 1]?.exitCode ?? 1) === 0;

  return { success, results };
}
