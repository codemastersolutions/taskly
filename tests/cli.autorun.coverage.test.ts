import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Ensure spawn is mocked to avoid real execution if cliEntry runs
vi.mock("node:child_process", () => {
  const { EventEmitter } = require("node:events");
  return {
    spawn: (_cmd: string, _args?: string[] | any) => {
      void _cmd;
      void _args;
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

describe("CLI autorun coverage (lines 139-143): then and catch branches", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // autorun block only triggers when TASKLY_TEST !== "1"
    process.env.TASKLY_TEST = "0";
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      _code?: number
    ) => {
      void _code;
    }) as any);
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errSpy.mockRestore();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("autorun then branch calls process.exit with success code 0", async () => {
    // Prepare argv with one trivial command
    process.argv = ["node", "taskly", 'node -e "process.exit(0)"'];
    // Mock the internal dependency used by cli.ts
    vi.doMock("../src/index.js", () => ({
      runConcurrently: async () => ({ success: true, results: [] }),
    }));
    await vi.importActual("../src/cli");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("autorun catch branch logs error and exits with code 1", async () => {
    process.argv = ["node", "taskly", 'node -e "process.exit(0)"'];
    vi.doMock("../src/index.js", () => ({
      runConcurrently: async () => {
        throw new Error("boom");
      },
    }));
    await vi.importActual("../src/cli");
    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
