import { describe, expect, it, vi } from "vitest";

// Mock spawn to avoid running real processes
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (_cmd: string, _args?: string[] | any) => {
      void _cmd;
      void _args;
      const ee = new EventEmitter() as any;
      ee.pid = 7777;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("CLI prefix-colors aliases", () => {
  it("accepts --prefixColor alias for --prefix-colors", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--names",
      "a,b",
      "--prefix",
      "name",
      "--prefixColor",
      "red,blue",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("accepts --prefixColors alias for --prefix-colors", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--names",
      "x,y",
      "--prefix",
      "name",
      "--prefixColors",
      "green,auto",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("rejects legacy/invalid alias --PrefixColors, shows help and exits with code 1", async () => {
    process.env.TASKLY_TEST = "1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      _code?: number
    ) => {
      void _code;
    }) as any);
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry(["node", "taskly", "--PrefixColors"]);
    // parseCLI triggers process.exit(1). We intercept and assert.
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unknown flag: --PrefixColors")
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("taskly - concurrent command runner")
    );
    logSpy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
