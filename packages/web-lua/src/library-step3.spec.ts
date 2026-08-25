import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua deterministic library foundation", () => {
  it("reports guest-owned Lua types with their actual names", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.internStringBytes(state, "hello");
    const table = runtime.createEmptyTable(state);

    const nilName = runtime.libraryType(state, runtime.nilValue());
    const textName = runtime.libraryType(
      state,
      runtime.exports.value_string_of(text),
    );
    const tableName = runtime.libraryType(
      state,
      runtime.exports.value_table_of(table),
    );

    expect(runtime.stringSize(nilName)).toBe(3);
    expect(runtime.stringSize(textName)).toBe(6);
    expect(runtime.stringSize(tableName)).toBe(5);
  });

  it("provides raw string and table operations without metamethod dispatch", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.internStringBytes(state, "lua");
    const textValue = runtime.exports.value_string_of(text);
    const table = runtime.createEmptyTable(state);
    const tableValue = runtime.exports.value_table_of(table);

    runtime.setTableValue(table, 1, 10);
    expect(runtime.libraryStringLength(textValue)).toBe(3);
    expect(runtime.libraryStringByte(textValue, 1)).toBe(117);
    expect(runtime.libraryRawLength(textValue)).toBe(3);
    expect(runtime.libraryTableLength(tableValue)).toBe(1);
    expect(runtime.libraryRawGet(tableValue, 1)).toBe(10);
    expect(runtime.libraryRawSet(tableValue, 2, 20)).toBe(0);
    expect(runtime.libraryRawGet(tableValue, 2)).toBe(20);
  });

  it("returns stable failure values for invalid library operands", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const integer = runtime.integerValue(7);

    expect(runtime.libraryStringLength(integer)).toBe(0);
    expect(runtime.libraryStringByte(integer, 0)).toBe(0);
    expect(runtime.libraryTableLength(integer)).toBe(0);
    expect(runtime.libraryRawGet(integer, 1)).toBe(0);
    expect(runtime.libraryRawSet(integer, 1, 2)).toBe(2);
  });

  it("supports Lua-style string bytes and guest-owned concatenation", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const left = runtime.internStringBytes(state, "web");
    const right = runtime.internStringBytes(state, "lua");
    const leftValue = runtime.exports.value_string_of(left);
    const rightValue = runtime.exports.value_string_of(right);

    expect(runtime.libraryStringByteAt(leftValue, 1)).toBe(119);
    expect(runtime.libraryStringByteAt(leftValue, 3)).toBe(98);
    expect(runtime.libraryStringByteAt(leftValue, 0)).toBe(0);
    expect(runtime.libraryStringByteAt(leftValue, 4)).toBe(0);
    expect(runtime.libraryStringEqual(leftValue, rightValue)).toBe(false);
    expect(runtime.libraryStringEqual(leftValue, leftValue)).toBe(true);

    const concatenated = runtime.libraryStringConcat(
      state,
      leftValue,
      rightValue,
    );
    expect(runtime.valueKind(concatenated)).toBe("string");
    expect(runtime.stringSize(runtime.valuePayload(concatenated))).toBe(6);
    expect(runtime.stringByte(runtime.valuePayload(concatenated), 0)).toBe(119);
    expect(runtime.stringByte(runtime.valuePayload(concatenated), 5)).toBe(97);
  });

  it("supports guest-owned string substring extraction", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.internStringBytes(state, "mission");
    const textValue = runtime.exports.value_string_of(text);

    const result = runtime.libraryStringSub(state, textValue, 2, 5);
    expect(runtime.valueKind(result)).toBe("string");
    expect(runtime.stringSize(runtime.valuePayload(result))).toBe(4);
    expect(runtime.stringByte(runtime.valuePayload(result), 0)).toBe(105);
    expect(runtime.stringByte(runtime.valuePayload(result), 3)).toBe(105);

    const full = runtime.libraryStringSub(state, textValue, 0, 0);
    expect(runtime.stringSize(runtime.valuePayload(full))).toBe(7);
    const clamped = runtime.libraryStringSub(state, textValue, 5, 99);
    expect(runtime.stringSize(runtime.valuePayload(clamped))).toBe(3);
    expect(runtime.stringByte(runtime.valuePayload(clamped), 0)).toBe(105);
    const empty = runtime.libraryStringSub(state, textValue, 8, 9);
    expect(runtime.stringSize(runtime.valuePayload(empty))).toBe(0);
    expect(
      runtime.valueKind(
        runtime.libraryStringSub(state, runtime.integerValue(1), 1, 1),
      ),
    ).toBe("nil");
  });

  it("returns nil for invalid string concatenation operands", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.internStringBytes(state, "web");
    const textValue = runtime.exports.value_string_of(text);

    const result = runtime.libraryStringConcat(
      state,
      textValue,
      runtime.integerValue(1),
    );
    expect(runtime.valueKind(result)).toBe("nil");
  });

  it("supports guest-owned string reversal", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.exports.value_string_of(
      runtime.internStringBytes(state, "mission"),
    );

    const reversed = runtime.libraryStringReverse(state, text);
    expect(runtime.valueKind(reversed)).toBe("string");
    expect(runtime.stringSize(runtime.valuePayload(reversed))).toBe(7);
    expect(runtime.stringByte(runtime.valuePayload(reversed), 0)).toBe(110);
    expect(runtime.stringByte(runtime.valuePayload(reversed), 6)).toBe(109);

    const empty = runtime.exports.value_string_of(
      runtime.internStringBytes(state, ""),
    );
    expect(
      runtime.stringSize(
        runtime.valuePayload(runtime.libraryStringReverse(state, empty)),
      ),
    ).toBe(0);
    expect(
      runtime.valueKind(
        runtime.libraryStringReverse(state, runtime.integerValue(1)),
      ),
    ).toBe("nil");
  });

  it("supports deterministic ASCII string case conversion", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.exports.value_string_of(
      runtime.internStringBytes(state, "WebLua 5.5! Ä"),
    );

    const lower = runtime.libraryStringLower(state, text);
    const upper = runtime.libraryStringUpper(state, text);
    expect(runtime.stringSize(runtime.valuePayload(lower))).toBe(14);
    expect(runtime.stringSize(runtime.valuePayload(upper))).toBe(14);
    expect(runtime.stringByte(runtime.valuePayload(lower), 0)).toBe(119);
    expect(runtime.stringByte(runtime.valuePayload(lower), 1)).toBe(101);
    expect(runtime.stringByte(runtime.valuePayload(lower), 2)).toBe(98);
    expect(runtime.stringByte(runtime.valuePayload(lower), 11)).toBe(32);
    expect(runtime.stringByte(runtime.valuePayload(lower), 12)).toBe(195);
    expect(runtime.stringByte(runtime.valuePayload(upper), 0)).toBe(87);
    expect(runtime.stringByte(runtime.valuePayload(upper), 1)).toBe(69);
    expect(runtime.stringByte(runtime.valuePayload(upper), 2)).toBe(66);
    expect(runtime.stringByte(runtime.valuePayload(upper), 12)).toBe(195);

    const empty = runtime.exports.value_string_of(
      runtime.internStringBytes(state, ""),
    );
    expect(
      runtime.stringSize(
        runtime.valuePayload(runtime.libraryStringLower(state, empty)),
      ),
    ).toBe(0);
    expect(
      runtime.valueKind(
        runtime.libraryStringUpper(state, runtime.integerValue(1)),
      ),
    ).toBe("nil");
    runtime.setAllocationLimit(state, 1);
    expect(runtime.valueKind(runtime.libraryStringLower(state, text))).toBe(
      "nil",
    );
  });

  it("supports guest-owned table insertion and removal", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);
    const tableValue = runtime.exports.value_table_of(table);
    const first = runtime.internStringBytes(state, "first");
    const third = runtime.internStringBytes(state, "third");
    const middle = runtime.internStringBytes(state, "middle");

    runtime.setTableValue(table, 1, runtime.exports.value_string_of(first));
    runtime.setTableValue(table, 2, runtime.exports.value_string_of(third));
    expect(
      runtime.libraryTableInsert(
        tableValue,
        2,
        runtime.exports.value_string_of(middle),
      ),
    ).toBe(0);
    expect(runtime.tableSize(table)).toBe(3);
    expect(
      runtime.stringsEqual(
        runtime.valuePayload(runtime.tableValue(table, 2)),
        middle,
      ),
    ).toBe(true);
    expect(
      runtime.stringsEqual(
        runtime.valuePayload(runtime.libraryTableRemove(tableValue, 2)),
        middle,
      ),
    ).toBe(true);
    expect(runtime.tableSize(table)).toBe(2);
    expect(
      runtime.stringsEqual(
        runtime.valuePayload(runtime.tableValue(table, 2)),
        third,
      ),
    ).toBe(true);
  });

  it("concatenates guest-owned table strings with bounds", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);
    const tableValue = runtime.exports.value_table_of(table);
    const separator = runtime.exports.value_string_of(
      runtime.internStringBytes(state, ","),
    );
    const one = runtime.internStringBytes(state, "one");
    const two = runtime.internStringBytes(state, "two");
    const three = runtime.internStringBytes(state, "three");
    runtime.setTableValue(table, 1, runtime.exports.value_string_of(one));
    runtime.setTableValue(table, 2, runtime.exports.value_string_of(two));
    runtime.setTableValue(table, 3, runtime.exports.value_string_of(three));

    const all = runtime.libraryTableConcat(state, tableValue, separator, 0, 0);
    expect(runtime.valueKind(all)).toBe("string");
    expect(runtime.stringSize(runtime.valuePayload(all))).toBe(13);
    const range = runtime.libraryTableConcat(
      state,
      tableValue,
      separator,
      2,
      3,
    );
    expect(runtime.valueKind(range)).toBe("string");
    expect(runtime.stringSize(runtime.valuePayload(range))).toBe(9);
    const invalid = runtime.libraryTableConcat(
      state,
      tableValue,
      runtime.integerValue(1),
      0,
      0,
    );
    expect(runtime.valueKind(invalid)).toBe("nil");
  });

  it("rejects invalid table utility positions without mutation", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);
    const tableValue = runtime.exports.value_table_of(table);
    const item = runtime.exports.value_string_of(
      runtime.internStringBytes(state, "item"),
    );
    runtime.setTableValue(table, 1, item);

    expect(runtime.libraryTableInsert(tableValue, 0, item)).toBe(2);
    expect(runtime.libraryTableInsert(tableValue, 3, item)).toBe(2);
    expect(runtime.libraryTableInsert(runtime.integerValue(1), 1, item)).toBe(
      2,
    );
    expect(runtime.valueKind(runtime.libraryTableRemove(tableValue, 0))).toBe(
      "nil",
    );
    expect(runtime.valueKind(runtime.libraryTableRemove(tableValue, 2))).toBe(
      "nil",
    );
    expect(runtime.tableSize(table)).toBe(1);
  });

  it("implements guest-owned base truthiness and metatable helpers", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);
    const metatable = runtime.createEmptyTable(state);
    const tableValue = runtime.exports.value_table_of(table);
    const metatableValue = runtime.exports.value_table_of(metatable);

    expect(runtime.libraryBaseTruthy(runtime.nilValue())).toBe(0);
    expect(runtime.libraryBaseTruthy(runtime.booleanValue(false))).toBe(0);
    expect(runtime.libraryBaseTruthy(runtime.booleanValue(true))).toBe(1);
    expect(runtime.libraryBaseTruthy(runtime.integerValue(0))).toBe(1);
    expect(runtime.valueKind(runtime.libraryBaseGetmetatable(tableValue))).toBe(
      "nil",
    );
    expect(runtime.libraryBaseSetmetatable(tableValue, metatableValue)).toBe(
      tableValue,
    );
    expect(
      runtime.valuePayload(runtime.libraryBaseGetmetatable(tableValue)),
    ).toBe(metatable);
    expect(
      runtime.valueKind(
        runtime.libraryBaseSetmetatable(tableValue, runtime.integerValue(1)),
      ),
    ).toBe("nil");
    expect(
      runtime.libraryBaseSetmetatable(tableValue, runtime.nilValue()),
    ).toBe(tableValue);
    expect(runtime.valueKind(runtime.libraryBaseGetmetatable(tableValue))).toBe(
      "nil",
    );
  });

  it("reports protected guest-call status without throwing", async () => {
    const runtime = await createWebLuaRuntime();
    const successState = runtime.createState();
    const success = runtime.load(successState, "return 7");
    expect(runtime.libraryBasePcallStatus(successState, success)).toBe(0);
    expect(runtime.status(successState)).toBe(0);
    expect(runtime.resultValue(success, 0)).toBe(7);

    const failureState = runtime.createState();
    const failure = runtime.load(failureState, "return 1 / 0");
    expect(runtime.libraryBasePcallStatus(failureState, failure)).toBe(3);
    expect(runtime.status(failureState)).toBe(3);
    expect(runtime.libraryBasePcallStatus(failureState, 0)).toBe(2);
  });

  it("provides deterministic guest table iteration primitives", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);
    const tableValue = runtime.exports.value_table_of(table);
    runtime.setTableValue(table, 1, 10);
    runtime.setTableValue(table, 2, 20);

    const firstKey = runtime.libraryBaseNextKey(tableValue, 0);
    expect(runtime.valueKind(firstKey)).toBe("integer");
    expect(runtime.valuePayload(firstKey)).toBe(1);
    expect(runtime.libraryBaseNextValue(tableValue, 0)).toBe(10);

    const firstCursor = runtime.tableNext(table, 0);
    const secondKey = runtime.libraryBaseNextKey(tableValue, firstCursor);
    expect(runtime.valuePayload(secondKey)).toBe(2);
    expect(runtime.libraryBaseNextValue(tableValue, firstCursor)).toBe(20);

    expect(runtime.valueKind(runtime.libraryBaseNextKey(tableValue, 2))).toBe(
      "nil",
    );
    expect(
      runtime.valuePayload(runtime.libraryBaseIpairsNext(tableValue, 0)),
    ).toBe(1);
    expect(
      runtime.valuePayload(runtime.libraryBaseIpairsNext(tableValue, 1)),
    ).toBe(2);
    expect(
      runtime.valueKind(runtime.libraryBaseIpairsNext(tableValue, 2)),
    ).toBe("nil");
    expect(
      runtime.valueKind(runtime.libraryBaseNextKey(runtime.integerValue(1), 0)),
    ).toBe("nil");
  });

  it("keeps math, UTF-8, coroutine, package, and debug helpers deterministic", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.internStringBytes(state, "abc");
    const textValue = runtime.exports.value_string_of(text);

    expect(runtime.libraryMathAbs(-4.5)).toBe(4.5);
    expect(runtime.libraryMathMin(3, 2)).toBe(2);
    expect(runtime.libraryMathMax(3, 2)).toBe(3);
    expect(runtime.libraryUtf8Length(textValue)).toBe(3);
    expect(runtime.libraryUtf8Byte(textValue, 2)).toBe(99);
    expect(runtime.libraryCoroutineStatus(4)).toBe(4);
    expect(runtime.libraryCoroutineCanResume(0)).toBe(1);
    expect(runtime.libraryCoroutineCanResume(1)).toBe(0);
    expect(runtime.libraryPackageDefaultPath()).toBe(0);
    expect(runtime.libraryPackageLoadStatus(2)).toBe(2);
    expect(runtime.libraryDebugTraceMask(7)).toBe(7);
    expect(runtime.libraryDebugTraceAllowed(1)).toBe(1);
    expect(runtime.libraryDebugTraceAllowed(0)).toBe(0);
  });
});
