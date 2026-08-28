import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

const mainIoSource = `
  local command = os.execute()
  assert(command)
  local f = io.open("guest.tmp", "w")
  local wrote = f:write("hello")
  local read = f:read("a")
  local closed = f:close()
  return command, os.tmpname(), os.remove("guest.tmp"), wrote, read, closed
`;

function mainSourceAdapter(input: unknown): Uint8Array | undefined {
  if (input !== "main.lua") return undefined;
  return new TextEncoder().encode(mainIoSource);
}

describe("WebLua main.lua io boundary", () => {
  it("runs loadfile main.lua with deterministic command and guest file adapters", async () => {
    const requests: string[] = [];
    const runtime = await createWebLuaRuntime({
      capabilities: [
        "lua.io.read",
        "lua.io.write",
        "lua.os.command",
        "lua.package.load",
      ],
      hostAdapter: {
        invoke: (request) => {
          requests.push(`${request.capability}:${request.operation}`);
          if (request.capability === "lua.package.load")
            return mainSourceAdapter(request.input);
          return true;
        },
      },
    });
    const state = runtime.openState();

    const frame = state.execute("return loadfile('main.lua')()");

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind !== "result")
      throw new Error("Expected main.lua to execute.");
    expect(frame.values).toHaveLength(6);
    expect(frame.values[0]).toBe(runtime.booleanValue(true));
    expect(runtime.valueKind(frame.values[1])).toBe("string");
    expect(frame.values[2]).toBe(runtime.booleanValue(true));
    expect(runtime.valueKind(frame.values[3])).toBe("table");
    expect(runtime.valueKind(frame.values[4])).toBe("string");
    expect(frame.values[5]).toBe(runtime.booleanValue(true));
    expect(requests).toEqual([
      "lua.package.load:load",
      "lua.os.command:execute",
      "lua.io.write:open-write",
      "lua.os.command:tmpname",
      "lua.os.command:remove",
    ]);
    state.close();
  }, 120_000);

  it("denies every main.lua host effect without an allow-list", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    for (const source of [
      "return os.execute()",
      "return os.tmpname()",
      "return os.remove('guest.tmp')",
      "return io.open('guest.tmp', 'r')",
    ]) {
      expect(state.execute(source)).toMatchObject({
        kind: "error",
        status: 2,
      });
    }

    state.close();
  }, 120_000);
});
