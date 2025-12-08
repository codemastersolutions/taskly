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
    statSync: vi.fn(() => ({
      isFile: () => true,
      isSymbolicLink: () => false,
    })),
  };
});

// Minimal spawn stub
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      void cmd;
      void args;
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

describe("Wildcard + names mapping", () => {
  it("applies names array after expansion in order", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["pnpm:start-watch:*"], {
      names: ["app", "admin", "customer"],
    });
    expect(res.success).toBe(true);
    expect(res.results.map((r) => r.name)).toEqual([
      "app",
      "admin",
      "customer",
    ]);
  });
});
