import { describe, expect, it, vi } from "vitest";

describe("Windows shell auto-detection", () => {
  it("detects powershell for .ps1 and cmd for .bat/.cmd", async () => {
    vi.resetModules();
    // Simulate Windows platform
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    (globalThis as any)["__captured_shells__"] = [] as Array<
      boolean | string | undefined
    >;

    vi.mock("node:child_process", async () => {
      const { EventEmitter } = await import("node:events");
      return {
        spawn: (command: string, argsOrOpts: any, optsMaybe?: any) => {
          // Detect opts regardless of overload used
          const opts = Array.isArray(argsOrOpts) ? optsMaybe : argsOrOpts;
          (globalThis as any)["__captured_shells__"].push(opts?.shell);
          const proc: any = new EventEmitter();
          proc.stdout = { on: () => {} } as any;
          proc.stderr = { on: () => {} } as any;
          proc.pid = 1234;
          proc.kill = () => {};
          setTimeout(() => proc.emit("exit", 0), 0);
          return proc;
        },
      } as any;
    });

    const { runConcurrently } = await import("../src");
    const res = await runConcurrently([
      { command: "script.ps1" },
      { command: "script.bat" },
      { command: "script.cmd" },
    ]);

    expect(res.success).toBe(true);
    const shells = (globalThis as any)["__captured_shells__"] as Array<
      boolean | string | undefined
    >;
    expect(shells[0]).toBe("powershell.exe");
    expect(shells[1]).toBe(true);
    expect(shells[2]).toBe(true);
  });
});
