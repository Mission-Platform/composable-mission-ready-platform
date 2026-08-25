import { describe, expect, it } from "vitest";

import { parseWebLuaCliArgs, WebLuaCliUsageError } from "./args.js";

describe("WebLua CLI arguments", () => {
  it("parses preludes, cwd, suite, exclusions, and script arguments", () => {
    expect(
      parseWebLuaCliArgs([
        "-e",
        "first()",
        "--execute",
        "second()",
        "--cwd",
        "workspace",
        "--suite",
        "smoke",
        "--exclude",
        "slow",
        "--exclude",
        "network",
        "program.lua",
        "one",
        "two",
      ]),
    ).toEqual({
      execute: ["first()", "second()"],
      source: "program.lua",
      args: ["one", "two"],
      cwd: "workspace",
      suite: "smoke",
      exclude: ["slow", "network"],
      capabilities: [],
    });
  });

  it("treats everything after -- as source and script arguments", () => {
    expect(
      parseWebLuaCliArgs(["--", "program.lua", "--literal", "value"]),
    ).toMatchObject({
      source: "program.lua",
      args: ["--literal", "value"],
    });
  });

  it("parses stdin and deduplicates explicit capabilities", () => {
    expect(
      parseWebLuaCliArgs([
        "-",
        "--capability",
        "lua.io.read",
        "--capability",
        "lua.io.read",
      ]),
    ).toEqual({
      execute: [],
      source: "-",
      args: [],
      cwd: undefined,
      suite: undefined,
      exclude: [],
      capabilities: ["lua.io.read"],
    });
  });

  it("accepts the plural capability alias and comma-separated values", () => {
    expect(
      parseWebLuaCliArgs([
        "program.lua",
        "--capabilities",
        "lua.io.read, lua.io.write",
        "--capability",
        "lua.io.read",
      ]).capabilities,
    ).toEqual(["lua.io.read", "lua.io.write"]);
  });

  it("rejects unknown capabilities and missing sources", () => {
    expect(() => parseWebLuaCliArgs(["--capability", "node.fs"])).toThrow(
      WebLuaCliUsageError,
    );
    expect(() => parseWebLuaCliArgs([])).toThrow(/Exactly one Lua source/u);
  });
});
