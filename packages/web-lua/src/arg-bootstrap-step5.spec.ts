import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

function guestString(
  runtime: Awaited<ReturnType<typeof createWebLuaRuntime>>,
  value: number,
): string {
  expect(runtime.valueKind(value)).toBe("string");
  const handle = runtime.valuePayload(value);
  return String.fromCharCode(
    ...Array.from({ length: runtime.stringSize(handle) }, (_, index) =>
      runtime.stringByte(handle, index),
    ),
  );
}

describe("WebLua Step 5 arg bootstrap", () => {
  it("initializes arg[1] as the guest program name", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute("return arg[1]");

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("web-lua");
    state.close();
  }, 120_000);

  it("keeps the all.lua argument scan path non-nil", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local i=0; while arg[i] do i=i-1 end; return arg[i+1]",
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("web-lua");
    state.close();
  }, 120_000);
});
