import fs from "fs";
import path from "path";
import { Readable } from "stream";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { runConcurrently } from "../src/index";

// Mock spawn to avoid running real processes
vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<any>("node:child_process");
  return {
    ...actual,
    spawn: vi.fn((cmd: string) => {
      // Support both spawn(command, opts) when shell is true and spawn(cmd, args, opts)
      const stdout = new Readable({ read() {} });
      const stderr = new Readable({ read() {} });
      const events: Record<string, Function[]> = {};
      const api = {
        pid: Math.floor(Math.random() * 10000) + 1000,
        stdout,
        stderr,
        on: (ev: string, fn: Function) => {
          (events[ev] ||= []).push(fn);
          // Simulate immediate exit success unless command clearly invalid
          if (ev === "exit") {
            setTimeout(() => {
              const bad = typeof cmd === "string" && cmd.includes("nosuchcmd");
              const code = bad ? 1 : 0;
              for (const f of events["exit"] || []) f(code);
            }, 5);
          }
          return api;
        },
        kill: vi.fn(),
      } as any;
      // Emit a tiny output line
      setTimeout(() => {
        stdout.emit("data", Buffer.from("hello\n"));
        stderr.emit("data", Buffer.from("world\n"));
      }, 1);
      return api;
    }),
  };
});

const { spawn } = await import("node:child_process");

describe("index.ts extra coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("composes name for wildcard expansions when base name is provided", async () => {
    const res = await runConcurrently(
      [{ command: "pnpm:build*", name: "svc" }],
      {
        // ensure deterministic order
        wildcardSort: "alpha",
        maxProcesses: 1,
      }
    );

    expect(res.results.length).toBeGreaterThan(0);
    const names = res.results.map((r) => r.name);
    // Our repo has build scripts; ensure composed names include script names
    expect(names.some((n) => n === "svc:build")).toBe(true);
    expect(names.some((n) => n === "svc:build:dev")).toBe(true);
  });

  it("skips missing script with ignoreMissing and logs reason", async () => {
    const res = await runConcurrently(["pnpm:nosuch*"], {
      ignoreMissing: true,
      maxProcesses: 1,
    });
    // nothing should run; queue filtered out
    expect(res.results.length).toBe(0);
    expect(spawn).not.toHaveBeenCalled();
    // check skip message
    const write = process.stderr.write as unknown as Mock;
    const calls = write.mock.calls.map((args: unknown[]) => String(args[0]));
    expect(calls.some((c: string) => c.includes("[skip]"))).toBe(true);
    expect(calls.some((c: string) => c.includes("script não encontrado"))).toBe(
      true
    );
  });

  it("treats relative existing file as available executable (path case)", async () => {
    const tmp = path.join(process.cwd(), "tmp.exec.test.txt");
    fs.writeFileSync(tmp, "echo file\n");
    try {
      const res = await runConcurrently(
        [{ command: `./${path.basename(tmp)}` }],
        {
          maxProcesses: 1,
        }
      );
      // With mocked spawn, this succeeds and exercises path-availability branch
      expect(res.success).toBe(true);
      expect(res.results[0].exitCode).toBe(0);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

  it("does not treat 'pnpm foo' as pm run (detectPmRun null)", async () => {
    const res = await runConcurrently(["pnpm foo"], {
      maxProcesses: 1,
    });
    expect(res.results.length).toBe(1);
    expect(res.results[0].exitCode).toBe(0);
  });

  it("handles invalid package.json scripts shape (getPackageJsonScripts returns null)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-pkg-"));
    try {
      const pkgPath = path.join(tmpDir, "package.json");
      fs.writeFileSync(
        pkgPath,
        JSON.stringify({ name: "x", version: "1.0.0", scripts: "oops" })
      );
      const res = await runConcurrently(["pnpm:build*"], {
        cwd: tmpDir,
        maxProcesses: 1,
      });
      // With invalid scripts, wildcard expansion should result in original command only
      expect(res.results.length).toBe(1);
      expect(res.results[0].exitCode).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("skips parent-relative path when file missing (../) and logs reason", async () => {
    const res = await runConcurrently(["../no-such-file-xyz.txt"], {
      ignoreMissing: true,
      maxProcesses: 1,
    });
    expect(res.results.length).toBe(0);
    const write = process.stderr.write as unknown as Mock;
    const calls = write.mock.calls.map((args: unknown[]) => String(args[0]));
    expect(
      calls.some((c: string) => c.includes("executável não encontrado"))
    ).toBe(true);
  });

  it("wildcard expansion tolerates missing package.json (returns original cmd)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-noscripts-"));
    try {
      const res = await runConcurrently(["pnpm:build*"], {
        cwd: tmpDir,
        maxProcesses: 1,
      });
      expect(res.results.length).toBe(1);
      expect(res.results[0].exitCode).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
