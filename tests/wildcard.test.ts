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
            build: "node -e \"console.log('b')\"",
          },
        });
      }
      throw new Error("unexpected readFileSync path");
    },
    statSync: vi.fn(() => ({ isFile: () => true, isSymbolicLink: () => false })),
  };
});

// Capture spawns
const calls: Array<{ cmd: string; args: string[] }> = [];
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      calls.push({ cmd, args: Array.isArray(args) ? args : [] });
      const ee = new EventEmitter() as any;
      ee.pid = 2222;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("Wildcard <pm>:<pattern*> expansion", () => {
  it("expands pnpm:start* to pnpm run start1/start2/start:watch", async () => {
    const { runConcurrently } = await import("../src");
    calls.length = 0;
    const res = await runConcurrently(["pnpm:start*"]);
    expect(res.success).toBe(true);
    expect(calls.length).toBe(3);
    const argsList = calls.map((c) => c.args.join(" ")).sort();
    expect(argsList).toEqual([
      "run start1",
      "run start2",
      "run start:watch",
    ]);
  });

  it("ignores non-matching pattern by leaving original command (later handled)", async () => {
    const { runConcurrently } = await import("../src");
    calls.length = 0;
    const res = await runConcurrently(["pnpm:dev*"]);
    // No matching scripts, original command remains -> parsed as 'pnpm run dev*'
    // We still "spawn" once in this mocked environment
    expect(calls.length).toBe(1);
    expect(calls[0].cmd).toBe("pnpm");
    expect(calls[0].args[0]).toBe("run");
    expect(calls[0].args[1]).toBe("dev*");
    expect(res.results.length).toBe(1);
  });
});

