import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua core Step 3 library contract", () => {
  it("converts tagged values and frames protected-call results", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(state, "return 2, 3, 5");

    expect(runtime.libraryBaseToBoolean(runtime.nilValue())).toBe(0);
    expect(runtime.libraryBaseToBoolean(runtime.integerValue(0))).toBe(1);
    expect(runtime.libraryBaseToInteger(runtime.integerValue(17))).toBe(17);
    expect(runtime.libraryBaseToInteger(runtime.booleanValue(true))).toBe(0);
    expect(runtime.libraryBaseToFloat(state, runtime.integerValue(17))).toBe(
      17,
    );
    expect(runtime.libraryBaseToFloat(state, runtime.booleanValue(true))).toBe(
      0,
    );

    expect(runtime.libraryBasePcallStatus(state, prototype)).toBe(0);
    expect(runtime.libraryBasePcallResultCount(prototype)).toBe(3);
    expect(runtime.libraryBasePcallResultValue(prototype, 0)).toBe(2);
    expect(runtime.libraryBasePcallResultValue(prototype, 2)).toBe(5);
    expect(runtime.libraryBasePcallResultValue(prototype, 3)).toBe(0);
  });

  it("counts UTF-8 code points and rejects malformed boundaries", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = (source: Uint8Array): number =>
      runtime.exports.value_string_of(runtime.internStringBytes(state, source));

    const valid = text(
      new Uint8Array([0x41, 0xc2, 0xa2, 0xf0, 0x9f, 0x98, 0x80]),
    );
    expect(runtime.libraryUtf8IsValid(valid)).toBe(1);
    expect(runtime.libraryUtf8Length(valid)).toBe(3);
    expect(runtime.libraryUtf8Codepoint(valid, 1)).toBe(0x41);
    expect(runtime.libraryUtf8Codepoint(valid, 2)).toBe(0xa2);
    expect(runtime.libraryUtf8Codepoint(valid, 3)).toBe(0x1_f6_00);
    expect(runtime.libraryUtf8Codepoint(valid, 4)).toBe(0);

    for (const malformed of [
      new Uint8Array([0xc0, 0x80]),
      new Uint8Array([0xe2, 0x82]),
      new Uint8Array([0xed, 0xa0, 0x80]),
      new Uint8Array([0xf4, 0x90, 0x80, 0x80]),
      new Uint8Array([0x80]),
    ]) {
      const value = text(malformed);
      expect(runtime.libraryUtf8IsValid(value)).toBe(0);
      expect(runtime.libraryUtf8Length(value)).toBe(0);
      expect(runtime.libraryUtf8Codepoint(value, 1)).toBe(0);
    }
    expect(runtime.libraryUtf8Length(runtime.integerValue(1))).toBe(0);
  });

  it("keeps numeric helpers tagged, deterministic, and allocation-aware", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const left = runtime.integerValue(7);
    const right = runtime.integerValue(3);

    expect(runtime.valuePayload(runtime.libraryMathAbsValue(state, left))).toBe(
      7,
    );
    expect(
      runtime.valuePayload(runtime.libraryMathMinValue(state, left, right)),
    ).toBe(3);
    expect(
      runtime.valuePayload(runtime.libraryMathMaxValue(state, left, right)),
    ).toBe(7);
    expect(
      runtime.valueKind(runtime.libraryMathAbsValue(state, runtime.nilValue())),
    ).toBe("nil");

    const float = runtime.floatValue(state, -4.5);
    const absolute = runtime.libraryMathAbsValue(state, float);
    expect(runtime.valueKind(absolute)).toBe("float");
    expect(runtime.floatNumber(absolute)).toBe(4.5);
    runtime.setAllocationLimit(state, 1);
    expect(runtime.valueKind(runtime.libraryMathAbsValue(state, float))).toBe(
      "nil",
    );
  });

  it("exposes coroutine transitions and package/debug policies as results", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(state, "return 9");

    expect(runtime.libraryCoroutineCanResume(0)).toBe(1);
    expect(runtime.libraryCoroutineCanResume(5)).toBe(1);
    expect(runtime.libraryCoroutineCanResume(2)).toBe(0);
    expect(runtime.libraryCoroutineResumeStatus(5)).toBe(0);
    expect(runtime.libraryCoroutineResumeStatus(2)).toBe(2);
    expect(runtime.libraryCoroutineResumeResult(state, prototype)).toBe(9);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.libraryCoroutineCloseStatus(5)).toBe(0);
    expect(runtime.libraryCoroutineCloseStatus(2)).toBe(2);
    expect(runtime.libraryCoroutineCloseResult(state)).toBe(0);

    expect(runtime.libraryPackageDefaultPathValue()).toBe(0);
    expect(runtime.libraryPackageCanLoad(0)).toBe(1);
    expect(runtime.libraryPackageCanLoad(2)).toBe(0);
    expect(runtime.libraryDebugTraceMask(0xff)).toBe(0xff);
    expect(runtime.libraryDebugTraceEnabled(5, 1)).toBe(1);
    expect(runtime.libraryDebugTraceEnabled(5, 2)).toBe(0);
    expect(runtime.libraryDebugTraceAllowed(2)).toBe(1);
  });
});
