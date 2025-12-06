#!/usr/bin/env node
import { runConcurrently, type Command } from "./index.js";
import {
  parseKillOthersOn,
  parsePrefix,
  parseSuccessCondition,
} from "./utils/args.js";

interface CLIOptions {
  names?: string[];
  maxProcesses?: number;
  killOthersOn?: Array<"success" | "failure">;
  prefix?: string;
  prefixColors?: string[];
  timestampFormat?: string;
  successCondition?: "all" | "first" | "last";
  raw?: boolean;
  shell?: boolean | string;
  cwd?: string;
}

function parseCLI(argv: string[]): { opts: CLIOptions; commands: string[] } {
  const opts: CLIOptions = {};
  const cmds: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--name" || a === "--names") {
      opts.names = (argv[++i] ?? "").split(",").map((s) => s.trim());
    } else if (a === "--max-processes") {
      opts.maxProcesses = Number(argv[++i] ?? "0") || undefined;
    } else if (a === "--kill-others-on") {
      opts.killOthersOn = parseKillOthersOn(argv[++i]);
    } else if (a === "--prefix") {
      opts.prefix = parsePrefix(argv[++i]);
    } else if (a === "--prefix-colors") {
      const v = argv[++i] ?? "";
      opts.prefixColors = v
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (a === "--timestamp-format") {
      opts.timestampFormat = argv[++i];
    } else if (a === "--success-condition") {
      opts.successCondition = parseSuccessCondition(argv[++i]);
    } else if (a === "--raw") {
      opts.raw = true;
    } else if (a === "--shell" || a.startsWith("--shell=")) {
      const allowed = ["cmd", "powershell", "pwsh", "bash", "sh"];
      if (a.startsWith("--shell=")) {
        const v = a.split("=")[1] ?? "";
        opts.shell = allowed.includes(v) ? v : true;
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("-") && allowed.includes(next)) {
          opts.shell = next;
          i++;
        } else {
          opts.shell = true;
        }
      }
    } else if (a === "--cwd") {
      opts.cwd = argv[++i];
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      printHelp();
      process.exit(1);
    } else {
      // positional command
      cmds.push(a);
    }
  }
  return { opts, commands: cmds };
}

function printHelp() {
  console.log(
    `taskly - concurrent command runner (zero-deps)\n\nUsage:\n  taskly [options] "cmd1 arg" "cmd2 arg" ...\n\nOptions:\n  --names name1,name2     Optional names for processes (by index)\n  --max-processes N       Limit parallel processes\n  --kill-others-on x,y    Kill others on success/failure\n  --prefix type|template  index|pid|time|command|name|none or template with {placeholders}\n  --prefix-colors c1,c2   Prefix colors per index (e.g., blue,magenta,auto)\n  --timestamp-format fmt  Timestamp format for {time} (default: yyyy-MM-dd HH:mm:ss.SSS)\n  --success-condition s   all|first|last (default: all)\n  --raw                   Disable prefixing and coloring\n  --shell [name]          Run via shell: cmd|powershell|pwsh|bash|sh (default: system)\n  --cwd PATH              Working directory\n  -h, --help              Show help\n`
  );
}

export async function cliEntry(argv = process.argv): Promise<number> {
  const { opts, commands } = parseCLI(argv);
  if (commands.length === 0) {
    printHelp();
    return 1;
  }
  const cmdConfigs: Command[] = commands.map((c, i) => ({
    command: c,
    name: opts.names?.[i],
    shell: opts.shell ?? false,
  }));
  const result = await runConcurrently(cmdConfigs, {
    maxProcesses: opts.maxProcesses,
    killOthersOn: opts.killOthersOn,
    prefix: opts.prefix,
    timestampFormat: opts.timestampFormat,
    successCondition: opts.successCondition,
    raw: opts.raw,
    cwd: opts.cwd,
    prefixColors:
      opts.prefixColors && opts.prefixColors.length > 0
        ? opts.prefixColors
        : Array.from({ length: commands.length }).map(() => "auto"),
  });
  return result.success ? 0 : 1;
}

/* c8 ignore start */
if (process.env.TASKLY_TEST !== "1") {
  cliEntry()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err?.stack ?? String(err));
      process.exit(1);
    });
}
/* c8 ignore end */
