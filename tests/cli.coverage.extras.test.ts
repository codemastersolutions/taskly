import { describe, expect, it, vi } from "vitest";

// Mock spawn to avoid running real processes when commands are provided
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (_cmd: string, _args?: string[] | any) => {
      void _cmd;
      void _args;
      const ee = new EventEmitter() as any;
      ee.pid = 5555;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("CLI coverage extras: wildcard-sort, shell handling, help/no-commands", () => {
  it("invalid --wildcard-sort value prints error, shows help and exits 1", async () => {
    process.env.TASKLY_TEST = "1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      _code?: number
    ) => {
      void _code;
    }) as any);
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--wildcard-sort",
      "banana",
    ]);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid value for --wildcard-sort")
    );
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("--shell with unsupported next token falls back to boolean true", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--shell",
      "evil",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    // If shell fallback occurred, commands still execute under mocked spawn
    expect(code).toBe(0);
  });

  it("--shell=unknown falls back to boolean true", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--shell=unknown",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("--shell with allowed next token (e.g., bash) is accepted and consumes the token", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--shell",
      "bash",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("--shell with allowed next token 'sh' followed by another option is handled correctly", async () => {
    process.env.TASKLY_TEST = "1";
    const child = await import("node:child_process");
    const spawnSpy = vi.spyOn(child, "spawn");
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--shell",
      "sh",
      "--raw",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
    expect(spawnSpy).toHaveBeenCalledTimes(2);
    spawnSpy.mockRestore();
  });

  it("-h shows help (process.exit(0)) and cliEntry returns 0", async () => {
    process.env.TASKLY_TEST = "1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      _code?: number
    ) => {
      void _code;
    }) as any);
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry(["node", "taskly", "-h"]);
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(code).toBe(0);
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("no positional commands prints help and exits 1", async () => {
    process.env.TASKLY_TEST = "1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry(["node", "taskly"]);
    expect(code).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    logSpy.mockRestore();
  });
});
