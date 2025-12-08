import { describe, expect, it, vi } from "vitest";

// Mock fs to provide package.json scripts with non-alphabetical insertion order
vi.mock("node:fs", () => {
  return {
    readFileSync: (p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          name: "fixture",
          scripts: {
            // insertion order: app, customer, admin
            "start-watch:app": "node -e \"console.log('app')\"",
            "start-watch:customer": "node -e \"console.log('customer')\"",
            "start-watch:admin": "node -e \"console.log('admin')\"",
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

// Capture spawn order
const spawnedCommands: string[] = [];
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      // record command string for order verification
      spawnedCommands.push([cmd, ...(Array.isArray(args) ? args : [])].join(" "));
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

describe("Wildcard sorting modes", () => {
  it("sorts alphabetically by default and applies names by that order", async () => {
    spawnedCommands.length = 0;
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["pnpm:start-watch:*"], {
      names: ["N-app", "N-customer", "N-admin"],
    });
    expect(res.success).toBe(true);
    // Alpha order of script keys: admin, app, customer
    const order = spawnedCommands.map((c) => c.includes("run ") ? c.split("run ")[1] : c);
    expect(order).toEqual([
      "start-watch:admin",
      "start-watch:app",
      "start-watch:customer",
    ]);
    expect(res.results.map((r) => r.name)).toEqual([
      "N-app",
      "N-customer",
      "N-admin",
    ]);
  });

  it("preserves package.json insertion order when wildcardSort=package", async () => {
    spawnedCommands.length = 0;
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["pnpm:start-watch:*"], {
      wildcardSort: "package",
      names: ["N-app", "N-customer", "N-admin"],
    });
    expect(res.success).toBe(true);
    // Insertion order: app, customer, admin
    const order = spawnedCommands.map((c) => c.includes("run ") ? c.split("run ")[1] : c);
    expect(order).toEqual([
      "start-watch:app",
      "start-watch:customer",
      "start-watch:admin",
    ]);
    expect(res.results.map((r) => r.name)).toEqual([
      "N-app",
      "N-customer",
      "N-admin",
    ]);
  });
});

