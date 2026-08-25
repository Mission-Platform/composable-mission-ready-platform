import { describe, expect, it } from "vitest";

import { runWebLuaCli } from "./main.js";
import {
  DEFAULT_WEB_LUA_SUITE_DIRECTORY,
  LUA_5_5_1_SUITE_MANIFEST,
  runWebLuaSuite,
  type WebLuaSuiteCliRunner,
} from "./suite.js";

const portableFiles = LUA_5_5_1_SUITE_MANIFEST.filter(
  (entry) => entry.kind === "portable",
).map((entry) => entry.file);

function runner(
  output: readonly string[] = [
    ...portableFiles.map((file) => `***** FILE '${file}'*****`),
    "final OK !!!",
  ],
  exitCode = 0,
  invocations: string[][] = [],
): WebLuaSuiteCliRunner {
  return async (argv, io) => {
    invocations.push([...argv]);
    for (const message of output) io.stdout(message);
    return exitCode;
  };
}

describe("WebLua upstream suite", () => {
  it("invokes the WebLua CLI with the portable suite contract", async () => {
    const invocations: string[][] = [];

    await runWebLuaSuite({
      suiteDirectory: "/tmp/lua-5.5.1-tests",
      cliRunner: runner(["final OK !!!"], 0, invocations),
    });

    expect(invocations).toEqual([
      [
        "-e",
        "_U=true; _port=true; deep=1",
        "--cwd",
        "/tmp/lua-5.5.1-tests",
        "--suite",
        "lua-5.5.1",
        "--capability",
        "lua.io.write",
        "--capability",
        "lua.io.read",
        "--capability",
        "lua.os.command",
        "--capability",
        "lua.package.load",
        "--exclude",
        "gc.lua",
        "--exclude",
        "tracegc.lua",
        "--exclude",
        "db.lua",
        "--exclude",
        "calls.lua",
        "--exclude",
        "big.lua",
        "--exclude",
        "cstack.lua",
        "--exclude",
        "api.lua",
        "--exclude",
        "memerr.lua",
        "--exclude",
        "files.lua",
        "all.lua",
      ],
    ]);
  });

  it("uses the documented default directory and excludes unsupported cases", async () => {
    const result = await runWebLuaSuite({ cliRunner: runner() });

    expect(DEFAULT_WEB_LUA_SUITE_DIRECTORY).toBe(
      "/Users/rogan/Developer/sources/lua-5.5.1-tests",
    );
    expect(result.summary.capabilityGated).toEqual(["files.lua"]);
    expect(result.summary.excluded).toEqual([
      "gc.lua",
      "tracegc.lua",
      "db.lua",
      "calls.lua",
      "big.lua",
      "cstack.lua",
      "api.lua",
      "memerr.lua",
      "files.lua",
    ]);
    expect(result.summary.executedFiles).toEqual(portableFiles);
    expect(result.summary.unexecutedFiles).toEqual([]);
    expect(result.summary.errors).toEqual([]);
    expect(result.summary.unsupported).toEqual([
      "gc.lua",
      "tracegc.lua",
      "db.lua",
      "calls.lua",
      "big.lua",
      "cstack.lua",
      "api.lua",
      "memerr.lua",
    ]);
    expect(
      LUA_5_5_1_SUITE_MANIFEST.find((entry) => entry.file === "tracegc.lua"),
    ).toEqual({
      file: "tracegc.lua",
      kind: "unsupported",
      reason: "The current debug/GC stress behavior is not supported.",
    });
    expect(
      LUA_5_5_1_SUITE_MANIFEST.find((entry) => entry.file === "db.lua"),
    ).toEqual({
      file: "db.lua",
      kind: "unsupported",
      reason:
        "The case requires native/debug database internals that are not supported.",
    });
    expect(
      LUA_5_5_1_SUITE_MANIFEST.find((entry) => entry.file === "calls.lua"),
    ).toEqual({
      file: "calls.lua",
      kind: "unsupported",
      reason: "The current bounded call-stack/function stress is unsupported.",
    });
  });

  it("records explicit exclusions without silently dropping manifest cases", async () => {
    const invocations: string[][] = [];
    const result = await runWebLuaSuite({
      exclude: ["math.lua", "files.lua", "math.lua"],
      cliRunner: runner(["final OK !!!"], 0, invocations),
    });

    expect(invocations[0]).toContain("--exclude");
    expect(invocations[0]).toEqual(
      expect.arrayContaining([
        "--exclude",
        "files.lua",
        "--exclude",
        "math.lua",
      ]),
    );
    expect(result.summary.executedFiles).not.toContain("math.lua");
    expect(result.summary.excluded).toEqual([
      "gc.lua",
      "tracegc.lua",
      "db.lua",
      "calls.lua",
      "big.lua",
      "cstack.lua",
      "api.lua",
      "memerr.lua",
      "math.lua",
      "files.lua",
    ]);
  });

  it("continues excluded capability-gated files and reports their classification", async () => {
    let excludedSource: unknown;
    const result = await runWebLuaSuite({
      sourceReader: async () => "return",
      cliRunner: async (argv, io, cwd, sourceReader) => {
        const exitCode = await runWebLuaCli(
          argv,
          io,
          cwd,
          async (options) => {
            excludedSource = options.hostAdapter?.invoke?.({
              capability: "lua.package.load",
              operation: "dofile",
              input: "files.lua",
            });
            return {
              openState: () => ({
                handle: 1,
                closed: false,
                status: 0,
                execute: () => ({
                  kind: "result",
                  operation: "call",
                  ok: true,
                  state: 1,
                  prototype: 1,
                  status: 0,
                  result: 0,
                  values: [],
                }),
                load: () => ({
                  kind: "loaded",
                  operation: "load",
                  ok: true,
                  state: 1,
                  prototype: 1,
                  status: 0,
                  format: 0,
                  sourceLength: 1,
                }),
                call: () => ({
                  kind: "result",
                  operation: "call",
                  ok: true,
                  state: 1,
                  prototype: 1,
                  status: 0,
                  result: 0,
                  values: [],
                }),
                close: () => undefined,
              }),
            };
          },
          sourceReader,
        );
        for (const file of portableFiles)
          io.stdout(`***** FILE '${file}'*****`);
        io.stdout("final OK !!!");
        return exitCode;
      },
    });

    expect(excludedSource).toBe("return");
    expect(result.summary.capabilityGated).toContain("files.lua");
    expect(result.summary.excluded).toContain("files.lua");
    expect(result.summary.errors).toEqual([]);
    expect(result.summary.passed).toBe(true);
  });

  it("returns a machine-readable passing summary", async () => {
    const result = await runWebLuaSuite({
      cliRunner: runner(
        [
          "lots of output",
          ...portableFiles.map((file) => `***** FILE '${file}'*****`),
          "final OK !!!",
        ],
        0,
      ),
    });

    expect(result.summary.passed).toBe(true);
    expect(result.summary.finalMarker).toBe(true);
    expect(result.summary.exitCode).toBe(0);
    expect(JSON.parse(result.serializedJson)).toEqual({
      ...result.summary,
      serializedJson: undefined,
    });
  });

  it("classifies a failed run without a final marker as not passed", async () => {
    const result = await runWebLuaSuite({
      cliRunner: runner(["assertion failed"], 1),
    });

    expect(result.summary).toMatchObject({
      passed: false,
      finalMarker: false,
      exitCode: 1,
      executedFiles: [],
      unexecutedFiles: portableFiles,
      errors: [],
    });
    expect(JSON.parse(result.serializedJson).passed).toBe(false);
  });
});
