import { describe, expect, it, vi } from "vitest";

describe("CLI", () => {
  it("prints help and exits when no commands provided", async () => {
    process.env.TASKLY_TEST = "1";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry(["node", "taskly"]);
    expect(code).toBe(1);
    spy.mockRestore();
  });

  it("runs two commands with name prefix", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--prefix",
      "name",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("parses flags (--names, --max-processes, --kill-others-on, --success-condition, --raw, --cwd)", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--names",
      "a,b",
      "--max-processes",
      "2",
      "--kill-others-on",
      "success",
      "--success-condition",
      "first",
      "--raw",
      "--cwd",
      ".",
      'node -e "process.exit(0)"',
      'node -e "setInterval(()=>{}, 10000)"',
    ]);
    expect(code).toBe(0);
  });

  it("parses --prefix-colors and applies without error", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--names",
      "a,b",
      "--prefix",
      "name",
      "--prefix-colors",
      "blue,magenta",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("parses --timestamp-format and runs", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--prefix",
      "[{time}] {name}: ",
      "--timestamp-format",
      "HH:mm:ss",
      "--names",
      "a,b",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("supports --name alias for --names", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--name",
      "x,y",
      "--prefix",
      "name",
      "--shell",
      'node -e "process.exit(0)"',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("treats unknown shell name as boolean true", async () => {
    process.env.TASKLY_TEST = "1";
    const { cliEntry } = await import("../src/cli");
    const code = await cliEntry([
      "node",
      "taskly",
      "--shell=foo",
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it("exits 0 on --help flag", async () => {
    process.env.TASKLY_TEST = "1";
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { cliEntry } = await import("../src/cli");
    // parseCLI will call process.exit synchronously
    void cliEntry(["node", "taskly", "--help"]);
    await new Promise((r) => setTimeout(r, 20));
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("exits 1 on unknown flag", async () => {
    process.env.TASKLY_TEST = "1";
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { cliEntry } = await import("../src/cli");
    void cliEntry(["node", "taskly", "--unknown"]);
    await new Promise((r) => setTimeout(r, 20));
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});
