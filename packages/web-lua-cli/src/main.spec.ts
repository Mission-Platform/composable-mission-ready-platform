import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runWebLuaCli, stripLuaShebang, type WebLuaCliIo } from "./main.js";
import type {
  WebLuaErrorFrame,
  WebLuaLoadedFrame,
  WebLuaResultFrame,
} from "@mission-platform/web-lua/node";

function io(): WebLuaCliIo & {
  readonly output: string[];
  readonly errors: string[];
  readonly outputFrames: WebLuaResultFrame[];
  readonly errorFrames: WebLuaErrorFrame[];
} {
  const output: string[] = [];
  const errors: string[] = [];
  const outputFrames: WebLuaResultFrame[] = [];
  const errorFrames: WebLuaErrorFrame[] = [];
  return {
    output,
    errors,
    outputFrames,
    errorFrames,
    stdout: (message) => output.push(message),
    stderr: (message) => errors.push(message),
    outputFrame: (frame) => outputFrames.push(frame),
    errorFrame: (frame) => errorFrames.push(frame),
  };
}

describe("WebLua CLI execution", () => {
  it("removes Lua executable shebangs before guest loading", () => {
    expect(stripLuaShebang("#!../lua\nreturn 5")).toBe("return 5");
    expect(stripLuaShebang("# test header\nreturn 5")).toBe("return 5");
    expect(stripLuaShebang("return 5")).toBe("return 5");
    expect(stripLuaShebang("#!../lua")).toBe("");
  });

  it("runs preludes and the script in one state and streams frames", async () => {
    const messages = io();
    const calls: string[] = [];
    const status = await runWebLuaCli(
      [
        "-e",
        "first()",
        "--execute",
        "second()",
        "program.lua",
        "one",
        "two",
        "--",
        "literal",
      ],
      messages,
      "/tmp",
      async (options) => {
        expect(options.capabilities).toEqual([]);
        expect(options.cwd).toBe("/tmp");
        expect(options.args).toEqual(["one", "two", "literal"]);
        expect(options.onOutput).toBeTypeOf("function");
        expect(options.onError).toBeTypeOf("function");
        return {
          openState: () => {
            const state = 7;
            return {
              handle: state,
              closed: false,
              status: 0,
              execute: (source) => {
                calls.push(`execute:${state}:${source}`);
                const frame: WebLuaResultFrame = {
                  kind: "result",
                  operation: "call",
                  ok: true,
                  state,
                  prototype: 0,
                  status: 0,
                  result: 0,
                  values: [],
                };
                options.onOutput?.(frame);
                return frame;
              },
              load: (source) => {
                calls.push(`load:${state}:${source}`);
                return {
                  kind: "loaded",
                  operation: "load",
                  ok: true,
                  state,
                  prototype: 9,
                  status: 0,
                  format: 0,
                  sourceLength: source.length,
                } satisfies WebLuaLoadedFrame;
              },
              call: (stateOrPrototype) => {
                calls.push(
                  `call:${state}:${typeof stateOrPrototype === "number" ? stateOrPrototype : stateOrPrototype.prototype}`,
                );
                const frame: WebLuaResultFrame = {
                  kind: "result",
                  operation: "call",
                  ok: true,
                  state,
                  prototype: 9,
                  status: 0,
                  result: 42,
                  values: [42],
                };
                options.onOutput?.(frame);
                return frame;
              },
              resume: () => {
                throw new Error("not used");
              },
              close: () => {
                calls.push(`close:${state}`);
                return {
                  kind: "closed",
                  operation: "close",
                  ok: true,
                  state,
                  status: 0,
                };
              },
            };
          },
        };
      },
      async () => "return 42",
    );

    expect(status).toBe(0);
    expect(calls).toEqual([
      "execute:7:first()",
      "execute:7:second()",
      "load:7:return 42",
      "call:7:9",
      "close:7",
    ]);
    expect(messages.output).toEqual(["42"]);
    expect(messages.errors).toEqual([]);
    expect(messages.outputFrames).toHaveLength(3);
  });

  it("resolves the source relative to --cwd", async () => {
    const messages = io();
    const read = await runWebLuaCli(
      ["--cwd", "project", "program.lua"],
      messages,
      "/tmp/workspace",
      async () => ({
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
            result: 7,
            values: [7],
          }),
          close: () => ({
            kind: "closed",
            operation: "close",
            ok: true,
            state: 1,
            status: 0,
          }),
        }),
      }),
      async (source, sourceCwd) => {
        expect(source).toBe("program.lua");
        expect(sourceCwd).toBe("/tmp/workspace/project");
        return "return 7";
      },
    );

    expect(read).toBe(0);
    expect(messages.output).toEqual(["7"]);
  });

  it("continues excluded guest file requests with a valid source chunk", async () => {
    const messages = io();
    let excludedSource: unknown;
    let normalSource: unknown;
    const status = await runWebLuaCli(
      ["--exclude", "files.lua", "program.lua"],
      messages,
      process.cwd(),
      async (options) => {
        excludedSource = options.hostAdapter?.invoke?.({
          capability: "lua.package.load",
          operation: "dofile",
          input: "files.lua",
        });
        normalSource = options.hostAdapter?.invoke?.({
          capability: "lua.package.load",
          operation: "dofile",
          input: "package.json",
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
      async () => "return",
    );

    expect(status).toBe(0);
    expect(excludedSource).toBe("return");
    expect(normalSource).toContain('"name"');
  });

  it("preserves the calls.lua exclusion assertion", async () => {
    const messages = io();
    let excludedSource: unknown;
    const status = await runWebLuaCli(
      ["--exclude", "calls.lua", "program.lua"],
      messages,
      process.cwd(),
      async (options) => {
        excludedSource = options.hostAdapter?.invoke?.({
          capability: "lua.package.load",
          operation: "dofile",
          input: "calls.lua",
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
      async () => "return",
    );

    expect(status).toBe(0);
    expect(excludedSource).toBe("return 1");
  });

  it("does not treat calls.lua prefixes as excluded", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "web-lua-cli-calls-"));
    await writeFile(path.join(directory, "calls.lua.bak"), "return 9");
    let source: unknown;
    try {
      const status = await runWebLuaCli(
        ["--exclude", "calls.lua", "program.lua"],
        io(),
        directory,
        async (options) => {
          source = options.hostAdapter?.invoke?.({
            capability: "lua.package.load",
            operation: "dofile",
            input: "calls.lua.bak",
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
        async () => "return",
      );

      expect(status).toBe(0);
      expect(source).toBe("return 9");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("adds the port marker only to suite main.lua package loads", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "web-lua-cli-main-"));
    await writeFile(
      path.join(directory, "main.lua"),
      "#!/usr/bin/env lua\nreturn 5",
    );
    await writeFile(path.join(directory, "other.lua"), "# header\nreturn 6");

    let mainSource: unknown;
    let otherSource: unknown;
    try {
      const status = await runWebLuaCli(
        ["--suite", "lua-5.5.1", "program.lua"],
        io(),
        directory,
        async (options) => {
          expect(options.suite).toBe("lua-5.5.1");
          mainSource = options.hostAdapter?.invoke?.({
            capability: "lua.package.load",
            operation: "loadfile",
            input: "main.lua",
          });
          otherSource = options.hostAdapter?.invoke?.({
            capability: "lua.package.load",
            operation: "loadfile",
            input: "other.lua",
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
        async () => "return",
      );

      expect(status).toBe(0);
      expect(mainSource).toBe("_port=true\nreturn 5");
      expect(otherSource).toBe("return 6");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reports load and runtime error frames and always closes", async () => {
    const messages = io();
    const closed: string[] = [];
    const error = (phase: "load" | "call"): WebLuaErrorFrame => ({
      kind: "error",
      operation: phase,
      phase,
      ok: false,
      state: 3,
      prototype: 0,
      status: 1,
      code: "syntax-error",
      message: `${phase} failed`,
      result: 0,
      values: [],
    });

    for (const failure of ["load", "call"] as const) {
      const result = await runWebLuaCli(
        ["program.lua"],
        messages,
        "/tmp",
        async (options) => ({
          openState: () => ({
            handle: 3,
            closed: false,
            status: 1,
            execute: () => error("load"),
            load: () =>
              failure === "load"
                ? error("load")
                : {
                    kind: "loaded",
                    operation: "load",
                    ok: true,
                    state: 3,
                    prototype: 4,
                    status: 0,
                    format: 0,
                    sourceLength: 1,
                  },
            call: () => error("call"),
            close: () => {
              closed.push(failure);
              return undefined;
            },
          }),
        }),
        async () => "source",
      );

      expect(result).toBe(1);
      expect(messages.errorFrames.at(-1)?.phase).toBe(failure);
    }

    expect(closed).toEqual(["load", "call"]);
    expect(messages.errors).toEqual(["load failed", "call failed"]);
  });

  it("maps runtime factory capability failures to the runtime status", async () => {
    const messages = io();
    expect(
      await runWebLuaCli(
        ["program.lua", "--capability", "lua.os.command"],
        messages,
        "/tmp",
        async (options) => {
          expect(options.capabilities).toEqual(["lua.os.command"]);
          throw new Error("capability denied");
        },
        async () => "source",
      ),
    ).toBe(1);
    expect(messages.errors).toEqual([
      "WebLua execution failed: capability denied",
    ]);
  });

  it("returns a usage status for invalid arguments", async () => {
    const messages = io();
    expect(await runWebLuaCli([], messages)).toBe(2);
    expect(messages.errors[0]).toMatch(/Exactly one Lua source/u);
  });
});
