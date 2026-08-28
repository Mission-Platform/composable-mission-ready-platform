import { describe, expect, it } from "vitest";

import {
  WEB_LUA_STEP_3_FIXTURES,
  type WebLuaStep3Expected,
  type WebLuaStep3Fixture,
} from "../fixtures/step3.js";

import { createWebLuaRuntime, type WebLuaRuntime } from "./runtime.js";

function stringValue(
  runtime: WebLuaRuntime,
  state: number,
  source: string,
): number {
  return runtime.exports.value_string_of(
    runtime.internStringBytes(state, source),
  );
}

function stringBytes(runtime: WebLuaRuntime, value: number): number[] {
  if (runtime.valueKind(value) !== "string")
    throw new Error("Expected a guest string value.");
  const handle = runtime.valuePayload(value);
  return Array.from({ length: runtime.stringSize(handle) }, (_, index) =>
    runtime.stringByte(handle, index),
  );
}

function literalValue(
  runtime: WebLuaRuntime,
  state: number,
  literal: "nil" | "false" | "true" | "integer" | "float",
): number {
  if (literal === "nil") return runtime.nilValue();
  if (literal === "false") return runtime.booleanValue(false);
  if (literal === "true") return runtime.booleanValue(true);
  if (literal === "integer") return runtime.integerValue(42);
  return runtime.floatValue(state, 1.25);
}

function makeTable(
  runtime: WebLuaRuntime,
  state: number,
  values: readonly number[],
): number {
  const table = runtime.createEmptyTable(state);
  for (const [index, value] of values.entries())
    runtime.setTableValue(table, index + 1, runtime.integerValue(value));
  return table;
}

function makeStringTable(
  runtime: WebLuaRuntime,
  state: number,
  values: readonly string[],
): number {
  const table = runtime.createEmptyTable(state);
  for (const [index, value] of values.entries())
    runtime.setTableValue(table, index + 1, stringValue(runtime, state, value));
  return table;
}

function loadPrototype(
  runtime: WebLuaRuntime,
  state: number,
  source: string,
): number {
  const prototype = runtime.load(state, source);
  if (prototype === 0)
    throw new Error(`Could not load fixture source: ${source}`);
  return prototype;
}

function executeOperation(
  runtime: WebLuaRuntime,
  fixture: WebLuaStep3Fixture,
): WebLuaStep3Expected {
  const state = runtime.createState();
  try {
    const operation = fixture.operation;
    if (operation.kind === "string-length")
      return {
        kind: "number",
        value: runtime.libraryStringLength(
          stringValue(runtime, state, operation.source),
        ),
      };
    if (operation.kind === "string-byte-at")
      return {
        kind: "number",
        value: runtime.libraryStringByteAt(
          stringValue(runtime, state, operation.source),
          operation.index,
        ),
      };
    if (operation.kind === "string-concat")
      return {
        kind: "bytes",
        value: stringBytes(
          runtime,
          runtime.libraryStringConcat(
            state,
            stringValue(runtime, state, operation.left),
            stringValue(runtime, state, operation.right),
          ),
        ),
      };
    if (operation.kind === "string-sub")
      return {
        kind: "bytes",
        value: stringBytes(
          runtime,
          runtime.libraryStringSub(
            state,
            stringValue(runtime, state, operation.source),
            operation.start,
            operation.finish,
          ),
        ),
      };
    if (operation.kind === "string-reverse")
      return {
        kind: "bytes",
        value: stringBytes(
          runtime,
          runtime.libraryStringReverse(
            state,
            stringValue(runtime, state, operation.source),
          ),
        ),
      };
    if (operation.kind === "string-case")
      return {
        kind: "bytes",
        value: stringBytes(
          runtime,
          operation.uppercase
            ? runtime.libraryStringUpper(
                state,
                stringValue(runtime, state, operation.source),
              )
            : runtime.libraryStringLower(
                state,
                stringValue(runtime, state, operation.source),
              ),
        ),
      };
    if (operation.kind === "invalid-string-length")
      return {
        kind: "number",
        value: runtime.libraryStringLength(runtime.integerValue(7)),
      };
    if (operation.kind === "invalid-string-concat") {
      const result = runtime.libraryStringConcat(
        state,
        stringValue(runtime, state, operation.left),
        runtime.integerValue(1),
      );
      return runtime.valueKind(result) === "nil"
        ? { kind: "nil" }
        : { kind: "value-kind", value: runtime.valueKind(result) };
    }
    if (operation.kind === "literal-kind")
      return {
        kind: "value-kind",
        value: runtime.valueKind(
          literalValue(runtime, state, operation.literal),
        ),
      };
    if (operation.kind === "literal-payload")
      return {
        kind: "number",
        value: runtime.valuePayload(
          literalValue(runtime, state, operation.literal),
        ),
      };
    if (operation.kind === "literal-float") {
      const value = runtime.floatValue(state, operation.value);
      return { kind: "float", value: runtime.floatNumber(value) };
    }
    if (operation.kind === "invalid-value")
      return { kind: "boolean", value: runtime.valueIsValid(operation.value) };
    if (operation.kind === "table-insert-remove") {
      const table = makeTable(runtime, state, operation.items);
      const tableValue = runtime.exports.value_table_of(table);
      const status = runtime.libraryTableInsert(
        tableValue,
        operation.position,
        runtime.integerValue(operation.inserted),
      );
      const removed = runtime.valuePayload(
        runtime.libraryTableRemove(tableValue, operation.remove),
      );
      const values = Array.from(
        { length: runtime.tableSize(table) },
        (_, index) =>
          runtime.valuePayload(runtime.tableValue(table, index + 1)),
      );
      return { kind: "table-sequence", status, removed, values };
    }
    if (operation.kind === "table-concat") {
      const tableValue = runtime.exports.value_table_of(
        makeStringTable(runtime, state, operation.items),
      );
      return {
        kind: "bytes",
        value: stringBytes(
          runtime,
          runtime.libraryTableConcat(
            state,
            tableValue,
            stringValue(runtime, state, operation.separator),
            operation.start,
            operation.finish,
          ),
        ),
      };
    }
    if (operation.kind === "invalid-table-insert") {
      const tableValue = runtime.exports.value_table_of(
        runtime.createEmptyTable(state),
      );
      return {
        kind: "status",
        value: runtime.libraryTableInsert(
          tableValue,
          operation.position,
          runtime.integerValue(1),
        ),
      };
    }
    if (operation.kind === "invalid-raw-set")
      return {
        kind: "status",
        value: runtime.libraryRawSet(
          runtime.integerValue(1),
          runtime.integerValue(1),
          runtime.integerValue(2),
        ),
      };
    if (operation.kind === "utf8-length")
      return {
        kind: "number",
        value: runtime.libraryUtf8Length(
          stringValue(runtime, state, operation.source),
        ),
      };
    if (operation.kind === "utf8-byte")
      return {
        kind: "number",
        value: runtime.libraryUtf8Byte(
          stringValue(runtime, state, operation.source),
          operation.index,
        ),
      };
    if (operation.kind === "invalid-utf8-length")
      return {
        kind: "number",
        value: runtime.libraryUtf8Length(runtime.integerValue(1)),
      };
    if (operation.kind === "load-status") {
      runtime.load(state, operation.source);
      return { kind: "status", value: runtime.status(state) };
    }
    if (operation.kind === "call-status") {
      const prototype = loadPrototype(runtime, state, operation.source);
      runtime.call(state, prototype);
      return { kind: "status", value: runtime.status(state) };
    }
    if (operation.kind === "pcall-status") {
      const prototype = loadPrototype(runtime, state, operation.source);
      return {
        kind: "status",
        value: runtime.libraryBasePcallStatus(state, prototype),
      };
    }
    if (operation.kind === "invalid-pcall-status")
      return {
        kind: "status",
        value: runtime.libraryBasePcallStatus(state, 0),
      };
    if (operation.kind === "math-abs")
      return { kind: "float", value: runtime.libraryMathAbs(operation.value) };
    if (operation.kind === "math-min")
      return {
        kind: "float",
        value: runtime.libraryMathMin(operation.left, operation.right),
      };
    if (operation.kind === "math-max")
      return {
        kind: "float",
        value: runtime.libraryMathMax(operation.left, operation.right),
      };
    if (operation.kind === "table-order") {
      const table = makeTable(runtime, state, operation.items);
      const tableValue = runtime.exports.value_table_of(table);
      return {
        kind: "table-values",
        values: Array.from({ length: runtime.tableSize(table) }, (_, index) =>
          runtime.valuePayload(runtime.libraryRawGet(tableValue, index + 1)),
        ),
      };
    }
    if (operation.kind === "api-call") {
      const prototype = loadPrototype(runtime, state, operation.source);
      const loadStatus = runtime.status(state);
      const result = runtime.call(state, prototype);
      return {
        kind: "api-call",
        loadStatus,
        callStatus: runtime.status(state),
        result,
      };
    }
    if (operation.kind === "api-chunk") {
      const prototype = loadPrototype(runtime, state, operation.source);
      return {
        kind: "api-chunk",
        loadStatus: runtime.status(state),
        format: runtime.chunkFormat(prototype),
        sourceLength: runtime.chunkSourceLength(prototype),
      };
    }
    const prototype = loadPrototype(runtime, state, operation.source);
    const loadStatus = runtime.status(state);
    runtime.close(state);
    const result = runtime.call(state, prototype);
    return {
      kind: "api-call",
      loadStatus,
      callStatus: runtime.status(state),
      result,
    };
  } finally {
    runtime.close(state);
  }
}

describe("WebLua Step 3 deterministic-library fixture corpus", () => {
  it("covers every planned slice with exact guest values and statuses", async () => {
    const runtime = await createWebLuaRuntime();
    const upstreamFiles = [
      ...new Set(
        WEB_LUA_STEP_3_FIXTURES.map((fixture) => fixture.upstreamFile),
      ),
    ];

    expect(upstreamFiles).toEqual([
      "strings.lua",
      "literals.lua",
      "tpack.lua",
      "utf8.lua",
      "errors.lua",
      "math.lua",
      "sort.lua",
      "api.lua",
    ]);
    expect(
      WEB_LUA_STEP_3_FIXTURES.filter((fixture) => fixture.negative).length,
    ).toBeGreaterThan(0);

    for (const fixture of WEB_LUA_STEP_3_FIXTURES) {
      expect(executeOperation(runtime, fixture), fixture.name).toEqual(
        fixture.expected,
      );
    }
  });
});
