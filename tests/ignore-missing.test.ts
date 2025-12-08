import { describe, expect, it, vi } from "vitest";

// Mock spawn to count invocations without actually executing processes
const calls: Array<{ cmd: string; args: string[] }> = [];
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any) => {
      calls.push({ cmd, args: Array.isArray(args) ? args : [] });
      const ee = new EventEmitter() as any;
      ee.pid = 1111;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      ee.kill = vi.fn();
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("ignore missing commands", () => {
  it("skips missing binary and missing pm script when --ignore-missing", async () => {
    const { runConcurrently } = await import("../src");
    calls.length = 0;
    const res = await runConcurrently([
      "nonexistent_cmd_abc",
      "npm:does-not-exist",
    ], { ignoreMissing: true });
    expect(res.success).toBe(true);
    expect(calls.length).toBe(0); // nothing spawned
    expect(res.results.length).toBe(0);
  });

  it("runs valid command and skips missing when --ignore-missing", async () => {
    const { runConcurrently } = await import("../src");
    calls.length = 0;
    const res = await runConcurrently([
      "node",
      "nonexistent_cmd_abc",
    ], { ignoreMissing: true });
    expect(res.success).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].cmd).toBe("node");
    expect(res.results.length).toBe(1);
    expect(res.results[0].exitCode).toBe(0);
  });
});

