import { describe, expect, it } from "vitest";
import {
  parseKillOthersOn,
  parsePrefix,
  parseSuccessCondition,
  splitCommand,
} from "../src/utils/args";

describe("splitCommand", () => {
  it("splits simple command", () => {
    const res = splitCommand("npm run test");
    expect(res.cmd).toBe("npm");
    expect(res.args).toEqual(["run", "test"]);
  });

  it("handles quotes and spaces", () => {
    const res = splitCommand('echo "hello world"');
    expect(res.cmd).toBe("echo");
    expect(res.args).toEqual(["hello world"]);
  });

  it("handles single quotes and escapes", () => {
    const res = splitCommand("echo 'a \\" + "'' b'");
    expect(res.args[0]).toContain("a '");
  });

  it("throws on empty command string", () => {
    expect(() => splitCommand("")).toThrow();
  });
});

describe("parsers", () => {
  it("parseKillOthersOn", () => {
    expect(parseKillOthersOn("success,failure")).toEqual([
      "success",
      "failure",
    ]);
    expect(parseKillOthersOn("invalid")).toEqual([]);
    expect(parseKillOthersOn("")).toEqual([]);
    expect(parseKillOthersOn(undefined)).toEqual([]);
  });
  it("parseSuccessCondition", () => {
    expect(parseSuccessCondition("first")).toBe("first");
    expect(parseSuccessCondition("last")).toBe("last");
    expect(parseSuccessCondition("anything")).toBe("all");
    expect(parseSuccessCondition(undefined)).toBe("all");
  });
  it("parsePrefix", () => {
    expect(parsePrefix("index")).toBe("index");
    expect(parsePrefix("none")).toBe("none");
    expect(parsePrefix("pid")).toBe("pid");
    expect(parsePrefix("command")).toBe("command");
    expect(parsePrefix("time")).toBe("time");
    expect(parsePrefix("name")).toBe("name");
    expect(parsePrefix("invalid")).toBe("name");
    expect(parsePrefix(undefined)).toBe("name");
  });
});
