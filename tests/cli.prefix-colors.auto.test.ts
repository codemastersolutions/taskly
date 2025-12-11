import { describe, expect, it, vi } from "vitest";

// Mock spawn to emit stdout data and exit
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  let call = 0;
  return {
    spawn: (_cmd: string, _args?: string[] | any) => {
      void _cmd;
      void _args;
      const ee = new EventEmitter() as any;
      ee.pid = 8000 + call;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      const idx = call++;
      setTimeout(() => {
        ee.stdout.emit("data", Buffer.from(`line${idx}\n`));
        ee.emit("exit", 0);
      }, 5);
      return ee;
    },
  };
});

describe("CLI --prefix-colors auto maps ANSI by index", () => {
  it("uses cyan for index 0 and yellow for index 1", async () => {
    process.env.TASKLY_TEST = "1";
    const outSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--names",
      "a,b",
      "--prefix",
      "name",
      "--prefix-colors",
      "auto,auto",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
    const output = outSpy.mock.calls.map((c) => String(c[0])).join("");
    // ANSI cyan \u001b[36m should appear with [a] prefix for index 0
    expect(output.includes("\u001b[36m[a] ")).toBe(true);
    // ANSI yellow \u001b[33m should appear with [b] prefix for index 1
    expect(output.includes("\u001b[33m[b] ")).toBe(true);
    outSpy.mockRestore();
  });
});
