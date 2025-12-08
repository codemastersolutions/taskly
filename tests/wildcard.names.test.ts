import { describe, expect, it, vi } from "vitest";

// Mock fs to provide package.json scripts
vi.mock("node:fs", () => {
  return {
    readFileSync: (p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          name: "fixture",
          scripts: {
            start1: "node -e \"console.log('s1')\"",
            start2: "node -e \"console.log('s2')\"",
            "start:watch": "node -e \"console.log('sw')\"",
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

// Fast spawn stub
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      void cmd;
      void args;
      const ee = new EventEmitter() as any;
      ee.pid = 3333;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("Wildcard expansion assigns names", () => {
  it("assigns script names when expanding", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["pnpm:start*"]);
    expect(res.success).toBe(true);
    const names = res.results.map((r) => r.name).sort();
    expect(names).toEqual(["start1", "start2", "start:watch"]);
  });

  it("prefixes base name when provided", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently([
      { command: "pnpm:start*", name: "svc" },
    ]);
    expect(res.success).toBe(true);
    const names = res.results.map((r) => r.name).sort();
    expect(names).toEqual(["svc:start1", "svc:start2", "svc:start:watch"]);
  });
});
