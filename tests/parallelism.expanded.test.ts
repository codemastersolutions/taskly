import { describe, expect, it, vi } from "vitest";

// Mock fs to provide package.json scripts
vi.mock("node:fs", () => {
  return {
    readFileSync: (p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          name: "fixture",
          scripts: {
            "start-watch:app": "node -e \"console.log('app')\"",
            "start-watch:admin": "node -e \"console.log('admin')\"",
            "start-watch:customer": "node -e \"console.log('customer')\"",
          },
        });
      }
      throw new Error("unexpected readFileSync path");
    },
    statSync: vi.fn(() => ({ isFile: () => true, isSymbolicLink: () => false })),
  };
});

const calls: Array<{ cmd: string; args: string[] }> = [];
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      calls.push({ cmd, args: Array.isArray(args) ? args : [] });
      const ee = new EventEmitter() as any;
      ee.pid = 4444;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      // Exit after a short delay to allow concurrency checks before completion
      setTimeout(() => ee.emit("exit", 0), 25);
      return ee;
    },
  };
});

describe("Parallelism uses expanded length by default", () => {
  it("spawns all expanded scripts concurrently (default)", async () => {
    const { runConcurrently } = await import("../src");
    calls.length = 0;
    const p = runConcurrently(["pnpm:start-watch:*"]); // expands to 3 scripts
    // Wait a microtick to allow immediate spawns
    await new Promise((r) => setTimeout(r, 1));
    expect(calls.length).toBe(3);
    const res = await p;
    expect(res.success).toBe(true);
  });

  it("respects maxProcesses when provided", async () => {
    const { runConcurrently } = await import("../src");
    calls.length = 0;
    const p = runConcurrently(["pnpm:start-watch:*"] , { maxProcesses: 2 });
    await new Promise((r) => setTimeout(r, 1));
    expect(calls.length).toBe(2);
    const res = await p;
    expect(res.success).toBe(true);
  });
});

