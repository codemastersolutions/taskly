import { describe, expect, it, vi } from "vitest";

// Isolated mock for this file to avoid impacting other CLI tests
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      // mark params as used to satisfy no-unused-vars
      void cmd;
      void args;
      const ee = new EventEmitter() as any;
      ee.pid = 9999;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("CLI PM shortcut", () => {
  it("accepts <pm>:<cmd> tokens and executes", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "npm:start",
      "pnpm:build",
      "yarn:test",
      "bun:dev",
    ]);
    expect(code).toBe(0);
  });
});
