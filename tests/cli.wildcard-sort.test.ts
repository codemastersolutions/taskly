import { describe, expect, it, vi } from "vitest";

// Mock fs scripts
vi.mock("node:fs", () => {
  return {
    readFileSync: (p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          name: "fixture",
          scripts: {
            // insertion order that is not alphabetical
            "start-watch:app": "echo app",
            "start-watch:customer": "echo customer",
            "start-watch:admin": "echo admin",
          },
        });
      }
      throw new Error("unexpected readFileSync path");
    },
    statSync: vi.fn(() => ({
      isFile: () => true,
      isSymbolicLink: () => false,
    })),
  };
});

const spawned: string[] = [];
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      spawned.push([cmd, ...(Array.isArray(args) ? args : [])].join(" "));
      const ee = new EventEmitter() as any;
      ee.pid = 8888;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("CLI --wildcard-sort", () => {
  it("parses --wildcard-sort package and preserves order", async () => {
    process.env.TASKLY_TEST = "1";
    spawned.length = 0;
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--wildcard-sort",
      "package",
      "pnpm:start-watch:*",
    ]);
    expect(code).toBe(0);
    const order = spawned.map((c) => c.includes("run ") ? c.split("run ")[1] : c);
    expect(order).toEqual([
      "start-watch:app",
      "start-watch:customer",
      "start-watch:admin",
    ]);
  });

  it("treats --no-wildcard-sort as package order", async () => {
    process.env.TASKLY_TEST = "1";
    spawned.length = 0;
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--no-wildcard-sort",
      "pnpm:start-watch:*",
    ]);
    expect(code).toBe(0);
    const order = spawned.map((c) => c.includes("run ") ? c.split("run ")[1] : c);
    expect(order).toEqual([
      "start-watch:app",
      "start-watch:customer",
      "start-watch:admin",
    ]);
  });

  it("errors on invalid --wildcard-sort value", async () => {
    process.env.TASKLY_TEST = "1";
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { cliEntry } = await import("../src/cli");
    void cliEntry(["node", "taskly", "--wildcard-sort", "banana"]);
    await new Promise((r) => setTimeout(r, 20));
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});

