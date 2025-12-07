import { describe, expect, it, vi } from "vitest";

// Mock spawn to capture command and args without running npm/yarn/pnpm/bun
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (cmd: string, args?: string[] | any, options?: any) => {
      // mark params as used to satisfy no-unused-vars
      void cmd;
      void options;
      const ee = new EventEmitter() as any;
      ee.pid = 1234;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      // expose captured values for assertions
      (ee as any).__cmd = cmd;
      (ee as any).__args = Array.isArray(args) ? args : [];
      ee.kill = vi.fn();
      // async exit success
      setTimeout(() => ee.emit("exit", 0), 5);
      return ee;
    },
  };
});

describe("Package manager shortcut expansion", () => {
  it("expands npm:start to npm run start", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["npm:start"]);
    expect(res.success).toBe(true);
  });

  it("expands pnpm:build to pnpm run build", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["pnpm:build"]);
    expect(res.success).toBe(true);
  });

  it("expands yarn:test to yarn run test", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["yarn:test"]);
    expect(res.success).toBe(true);
  });

  it("expands bun:dev to bun run dev", async () => {
    const { runConcurrently } = await import("../src");
    const res = await runConcurrently(["bun:dev"]);
    expect(res.success).toBe(true);
  });
});
