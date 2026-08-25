import { describe, expect, it } from "vitest";

import { validateWebLuaExports, WEB_LUA_ABI_MANIFEST } from "../abi.js";
import { compileWebLua } from "../compiler.js";
import { createWebLuaRuntime } from "../runtime.js";

describe("WebLua runtime foundation", () => {
  it("compiles the complete foundation graph into a valid deterministic artifact", async () => {
    const first = await compileWebLua();
    const second = await compileWebLua();

    expect(first.artifact.diagnostics).toEqual([]);
    expect(first.artifact.wasm).toBeDefined();
    expect(
      WebAssembly.validate(first.artifact.wasm! as unknown as ArrayBuffer),
    ).toBe(true);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.graphHash).toBe(second.graphHash);
    expect(first.artifact.manifest?.linkMode).toBe("static");
    expect(first.abi.format).toBe("web-lua-abi");
    expect(first.abi.requiredExports).toContain("load");
    expect(first.abi.requiredExports).toContain("state_status");
  }, 180_000);

  it("rejects an artifact that does not expose the complete runtime contract", () => {
    expect(() => validateWebLuaExports({})).toThrow(/missing WebLua exports/u);
    expect(WEB_LUA_ABI_MANIFEST.capabilities).toContain("lua.io.read");
  });

  it("preserves typed value construction and decoding through the guest boundary", async () => {
    const runtime = await createWebLuaRuntime();

    const integer = runtime.integerValue(23);
    const boolean = runtime.booleanValue(true);

    expect(runtime.valueKind(integer)).toBe("integer");
    expect(runtime.valuePayload(integer)).toBe(23);
    expect(runtime.valueKind(boolean)).toBe("boolean");
    expect(runtime.valuePayload(boolean)).toBe(1);
    expect(runtime.valueKind(runtime.nilValue())).toBe("nil");
  });

  it("preserves byte-backed string identity and contents in guest memory", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const first = runtime.internStringBytes(state, "lua");
    const second = runtime.internStringBytes(
      state,
      new Uint8Array([108, 117, 97]),
    );

    expect(first).toBe(second);
    expect(runtime.stringSize(first)).toBe(3);
    expect([0, 1, 2].map((index) => runtime.stringByte(first, index))).toEqual([
      108, 117, 97,
    ]);
    expect(runtime.stringsEqual(first, second)).toBe(true);
    expect(runtime.valueKind(runtime.exports.value_string_of(first))).toBe(
      "string",
    );
    expect(runtime.ownsHandle(state, first)).toBe(true);
  });

  it("supports array/hash table mutation, iteration, roots, and frames", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);
    runtime.setTableValue(table, 1, 11);
    runtime.setTableValue(table, 33, 99);

    expect(runtime.tableSize(table)).toBe(1);
    expect(runtime.tableValue(table, 1)).toBe(11);
    expect(runtime.tableValue(table, 33)).toBe(99);
    const arrayCursor = runtime.tableNext(table, 0);
    const hashCursor = runtime.tableNext(table, arrayCursor);
    expect(runtime.tableNextKey(table, arrayCursor)).toBe(33);
    expect(runtime.tableNextValue(table, arrayCursor)).toBe(99);
    expect(hashCursor).not.toBe(0);
    expect(runtime.tableNext(table, hashCursor)).toBe(0);

    expect(runtime.setRoot(state, 0, table)).toBe(0);
    expect(runtime.rootValue(state, 0)).toBe(table);
    expect(runtime.ownsHandle(state, table)).toBe(true);
    expect(runtime.collect(state, 0)).toBe(0);
    expect(runtime.ownsHandle(state, table)).toBe(true);

    const thread = runtime.exports.new_thread(state, 0, 0);
    const frame = runtime.exports.new_frame(state, 0, 0, 7);
    expect(runtime.exports.push_frame(thread, frame)).toBe(0);
    expect(runtime.exports.current_frame(thread)).toBe(frame);
  });

  it("supports array keys beyond the inline capacity without changing hash behavior", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createEmptyTable(state);

    for (let index = 1; index <= 32; index += 1)
      runtime.setTableValue(table, index, index * 10);
    runtime.setTableValue(table, 33, 330);

    expect(runtime.tableSize(table)).toBe(32);
    expect(runtime.tableValue(table, 1)).toBe(10);
    expect(runtime.tableValue(table, 16)).toBe(160);
    expect(runtime.tableValue(table, 32)).toBe(320);
    expect(runtime.tableValue(table, 33)).toBe(330);

    runtime.setTableValue(table, 32, 0);
    expect(runtime.tableSize(table)).toBe(31);
    expect(runtime.tableValue(table, 32)).toBe(0);
    runtime.setTableValue(table, 32, 320);
    expect(runtime.tableSize(table)).toBe(32);

    const keys: number[] = [];
    const values: number[] = [];
    let cursor = 0;
    while (true) {
      const next = runtime.tableNext(table, cursor);
      if (next === 0) break;
      keys.push(runtime.tableNextKey(table, cursor));
      values.push(runtime.tableNextValue(table, cursor));
      cursor = next;
    }

    expect(keys).toEqual([
      ...Array.from({ length: 32 }, (_, index) => index + 1),
      33,
    ]);
    expect(values).toEqual([
      ...Array.from({ length: 32 }, (_, index) => (index + 1) * 10),
      330,
    ]);
  });

  it("executes guest indexing and mutation beyond the inline capacity", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const entries = Array.from({ length: 32 }, (_, index) => index + 1).join(
      ", ",
    );
    const prototype = runtime.load(
      state,
      `items = { ${entries} }; items[16] = items[16] + 100; items[32] = items[32] + 200; return items[16] + items[32]`,
    );

    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(348);

    const reused = runtime.load(state, "return items[16] + items[32]");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, reused)).toBe(348);
  });

  it("executes guest globals and basic table constructors and indexing", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(
      state,
      "items = { 11, 22 }; items[1] = items[2] + 3; items.answer = items[1]; return items.answer",
    );

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(result).toBe(25);

    const reused = runtime.load(state, "return items[1]");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, reused)).toBe(25);
  });

  it("executes string literals and concatenation through compiled Wasm", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const literal = runtime.load(state, 'return "lua"');
    expect(runtime.status(state)).toBe(0);
    const literalHandle = runtime.call(state, literal);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.stringSize(literalHandle)).toBe(3);
    expect(
      [0, 1, 2].map((index) => runtime.stringByte(literalHandle, index)),
    ).toEqual([108, 117, 97]);
    expect(
      runtime.stringsEqual(
        literalHandle,
        runtime.internStringBytes(state, "lua"),
      ),
    ).toBe(true);

    const concatenated = runtime.load(state, 'return "hel" .. "lo"');
    expect(runtime.status(state)).toBe(0);
    const concatHandle = runtime.call(state, concatenated);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.stringSize(concatHandle)).toBe(5);
    expect(
      runtime.stringsEqual(
        concatHandle,
        runtime.internStringBytes(state, "hello"),
      ),
    ).toBe(true);

    const assigned = runtime.load(state, "msg = 'ab' .. \"cd\"; return msg");
    expect(runtime.status(state)).toBe(0);
    const assignedHandle = runtime.call(state, assigned);
    expect(runtime.status(state)).toBe(0);
    expect(
      runtime.stringsEqual(
        assignedHandle,
        runtime.internStringBytes(state, "abcd"),
      ),
    ).toBe(true);

    const reused = runtime.load(state, "return msg .. '!'");
    expect(runtime.status(state)).toBe(0);
    const reusedHandle = runtime.call(state, reused);
    expect(runtime.status(state)).toBe(0);
    expect(
      runtime.stringsEqual(
        reusedHandle,
        runtime.internStringBytes(state, "abcd!"),
      ),
    ).toBe(true);
  });

  it("captures an outer local in a nested function after the outer return", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "function make() local captured = 41; return function() return captured + 1 end end; local getter = make(); return getter()",
    );

    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(42);
    expect(runtime.status(state)).toBe(0);

    const localFunction = runtime.load(
      state,
      "function make_local() local captured = 42; local function inner() return captured + 1 end; return inner end; local getter = make_local(); return getter()",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, localFunction)).toBe(43);
    expect(runtime.status(state)).toBe(0);
  });

  it("accepts global declarations and enforces bounded const-local semantics", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const globalsAndConst = runtime.load(
      state,
      `
        global <const> *
        global declared
        local answer <const>, mutable = 4, 5
        mutable = mutable + 1
        declared = answer + mutable
        return declared
      `,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, globalsAndConst)).toBe(10);
    expect(runtime.status(state)).toBe(0);

    const prefixedConst = runtime.load(
      state,
      "local <const> left, right = 2, 3; return left + right",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prefixedConst)).toBe(5);
    expect(runtime.status(state)).toBe(0);

    const uninitializedLocal = runtime.load(
      state,
      "local missing; if missing == nil then return 1 end; return 0",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, uninitializedLocal)).toBe(1);
    expect(runtime.status(state)).toBe(0);

    const rejectedReassignment = runtime.load(
      state,
      "local value <const> = 4; value = 5; return value",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, rejectedReassignment)).toBe(0);
    expect(runtime.status(state)).toBe(2);
  });

  it("records chunk format metadata and deterministic allocation failures", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const text = runtime.load(state, "return 1");
    expect(runtime.chunkFormat(text)).toBe(1);
    expect(runtime.chunkSourceLength(text)).toBe(8);
    expect(runtime.chunkError(text)).toBe(0);

    const binary = runtime.load(
      state,
      new Uint8Array([0x1b, 0x4c, 0x75, 0x61]),
    );
    expect(runtime.chunkFormat(binary)).toBe(2);
    expect(runtime.chunkError(binary)).toBe(1);
    expect(runtime.status(state)).toBe(4);

    runtime.setAllocationLimit(state, 1);
    expect(runtime.internStringBytes(state, "denied")).toBe(0);
    expect(runtime.allocationError(state)).toBe(2);
  });

  it("denies host capabilities unless explicitly enabled", async () => {
    const runtime = await createWebLuaRuntime();

    expect(runtime.hasCapability("lua.io.read")).toBe(false);
    expect(() => runtime.requireCapability("lua.io.read")).toThrow(/denied/u);
  });

  it("preserves guest value and table semantics through the Wasm boundary", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const table = runtime.createTable(
      state,
      7,
      runtime.exports.boolean_value(1),
    );

    expect(runtime.exports.value_kind_of(runtime.exports.nil_value())).toBe(0);
    expect(runtime.tableValue(table, 7)).toBe(runtime.exports.boolean_value(1));
    runtime.setTableValue(table, 7, 99);
    expect(runtime.tableValue(table, 7)).toBe(99);
    expect(runtime.objectCount(state)).toBe(1);

    const closure = runtime.exports.new_closure(state, 12, 44);
    const thread = runtime.exports.new_thread(state, 1, closure);
    expect(runtime.exports.closure_value(closure)).toBe(44);
    expect(runtime.exports.thread_value(thread)).toBe(1);
    expect(runtime.objectCount(state)).toBe(3);
  });

  it("keeps string interning separate from the collectable object list during free-list reuse", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const first = runtime.internString(state, 11, 5);
    const table = runtime.createTable(state, 1, 2);

    expect(runtime.objectCount(state)).toBe(1);
    expect(runtime.collect(state, 0)).toBe(1);
    expect(runtime.objectCount(state)).toBe(0);

    const second = runtime.internString(state, 22, 6);
    expect(second).not.toBe(first);
    expect(runtime.findString(state, 22, 6)).toBe(second);
    expect(runtime.objectCount(state)).toBe(0);
    expect(runtime.collect(state, 0)).toBe(0);

    const third = runtime.internString(state, 33, 7);
    expect(third).not.toBe(second);
    expect(runtime.findString(state, 11, 5)).toBe(first);
    expect(runtime.findString(state, 22, 6)).toBe(second);
    expect(runtime.findString(state, 33, 7)).toBe(third);
    expect(runtime.collect(state, 0)).toBe(0);
    expect(runtime.objectCount(state)).toBe(0);
    expect(table).not.toBe(0);
  });

  it("loads and executes integer expression chunks inside the guest", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    expect(runtime.lexTokenCount("return 2 + 3 * 4;")).toBe(7);
    const prototype = runtime.load(state, "return 2 + 3 * 4;");
    expect(prototype).not.toBe(0);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(14);
    // resume no longer aliases call: a chunk that already completed (and never
    // yielded) cannot be resumed and reports a structured runtime error.
    expect(runtime.resume(state, prototype)).toBe(0);
    expect(runtime.status(state)).toBe(2);

    const negative = runtime.load(state, "return -4");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, negative)).toBe(-4);
  });

  it("executes numeric comparison expressions with Lua precedence", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const [source, expected] of [
      ["return 2 < 3", 1],
      ["return 3 > 4", 0],
      ["return 3 == 3", 1],
      ["return 3 ~= 4", 1],
      ["return 3 <= 2", 0],
      ["return 4 >= 4", 1],
      ["return 1 + 2 < 4 * 2", 1],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
    }
  });

  it("executes Lua bitwise and remainder operators with precedence", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const [source, expected] of [
      ["return 7 % 4", 3],
      ["return 6 & 3", 2],
      ["return 6 | 1", 7],
      ["return 6 ~ 3", 5],
      ["return ~0", -1],
      ["return 1 << 4", 16],
      ["return 256 >> 4", 16],
      ["return 1 | 2 & 6", 3],
      ["return 1 + 2 << 1", 6],
      ["return 5 & 6 == 4", 1],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
    }
  });

  it("executes local assignments and conditional returns inside the guest", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(
      state,
      "local value = 4; if value > 2 then return value * 3 end",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(12);
  });

  it("executes else branches, local reassignment, and while loops in the guest", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const loop = runtime.load(
      state,
      "local value = 0; while value < 3 do value = value + 1 end; if value == 3 then return value else return 0 end",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, loop)).toBe(3);
  });

  it("executes named guest functions with parameters and return values", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(
      state,
      "function add(left, right) return left + right end; return add(2, 3)",
    );
    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(5);
  });

  it("executes named guest functions without parameters", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(
      state,
      "function answer() return 5 end; return answer()",
    );
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(5);
  });

  it("rejects incomplete control-flow blocks as guest syntax errors", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const missingEnd = runtime.load(state, "if true then return 1");
    expect(runtime.status(state)).toBe(1);
    expect(runtime.call(state, missingEnd)).toBe(0);

    const missingName = runtime.load(state, "local = 1");
    expect(runtime.status(state)).toBe(1);
    expect(runtime.call(state, missingName)).toBe(0);
  });

  it("rejects binary chunks with a structured malformed-chunk status", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const malformed = runtime.load(
      state,
      new Uint8Array([0x1b, 0x4c, 0x75, 0x61]),
    );
    expect(malformed).not.toBe(0);
    expect(runtime.status(state)).toBe(4);
    expect(runtime.call(state, malformed)).toBe(0);
    expect(runtime.status(state)).toBe(4);
  });

  it("reports local-slot exhaustion instead of writing past guest state", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const declarations = Array.from(
      { length: 40 },
      (_, index) => `local value${index} = ${index}`,
    );

    const prototype = runtime.load(
      state,
      `${declarations.join("; ")}; return 0`,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(0);
    expect(runtime.status(state)).toBe(2);
  });

  it("honors Lua line comments and arithmetic grouping in the guest lexer", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(
      state,
      "return (2 + 3) -- ignore this line\n * 4",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(20);
  });

  it("accepts Lua chunk envelopes, keyword boundaries, and extended whitespace", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const parenthesized = runtime.load(state, "return(2)");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, parenthesized)).toBe(2);

    const verticalTab = runtime.load(state, "return\u000b(3)");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, verticalTab)).toBe(3);

    const formFeed = runtime.load(state, "return\u000c(4)");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, formFeed)).toBe(4);

    const commentSeparated = runtime.load(state, "return -- comment\n 5");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, commentSeparated)).toBe(5);

    const longComment = runtime.load(
      state,
      "return --[[ ignored\ncomment ]] 6",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, longComment)).toBe(6);

    const keywordPrefix = runtime.load(state, "returnValue");
    expect(runtime.status(state)).toBe(1);
    expect(runtime.call(state, keywordPrefix)).toBe(0);

    for (const [source, expected] of [
      ["return true", 1],
      ["return false", 0],
      ["return nil", 0],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
    }
  });

  it("accepts empty chunks and no-value returns while enforcing return-last syntax", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const source of ["", ";;;", "return", "return;"]) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(0);
      expect(runtime.status(state), source).toBe(0);
    }

    const leadingSemicolons = runtime.load(state, ";;return 2;");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, leadingSemicolons)).toBe(2);

    for (const source of ["return 1 2", "return 1;;"]) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(1);
      expect(runtime.call(state, prototype), source).toBe(0);
    }
  });

  it("reports syntax and runtime failures without host-side interpretation", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const syntax = runtime.load(state, "return 1 +");
    expect(syntax).not.toBe(0);
    expect(runtime.status(state)).toBe(1);
    expect(runtime.call(state, syntax)).toBe(0);

    const division = runtime.load(state, "return 8 / 0");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, division)).toBe(0);
    expect(runtime.status(state)).toBe(3);

    const emptyReturn = runtime.load(state, "return");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, emptyReturn)).toBe(0);
    expect(runtime.status(state)).toBe(0);
  });

  it("rejects operations after the guest state is closed", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    expect(runtime.close(state)).toBe(0);
    expect(runtime.load(state, "return 1")).toBe(0);
    expect(runtime.status(state)).toBe(0);
  });

  it("restores caller's upvalue after nested closure call", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    // Two-level nesting: outer scope defines x, middle function captures x as upvalue,
    // calls inner closure, then reads x (its own upvalue, not a local).
    // Without the fix, the middle function's upvalue pointer would be clobbered by the
    // inner closure call, causing the return to resolve to 0 instead of 42.
    const script = `
        local x = 42
        local function outer()
          local inner = function() return 0 end
          local dummy = inner()
          return x
        end
        return outer()
    `;
    const prototype = runtime.load(state, script);
    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(result).toBe(42);
  });

  it("expands multiple returns and forwards varargs through guest call frames", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const script = `
      function pair()
        return 7, 9
      end
      function add(left, right)
        return left + right
      end
      local first, second = pair()
      local single = pair()
      function forward(...)
        return ...
      end
      local forwardedFirst, forwardedSecond = forward(first, second)
      local adjusted = 1 + forward(2, 3)
      local afterCall = 1 + add(2, 3)
      return first * 1000 + second * 100 + single * 10 + forwardedFirst + forwardedSecond + adjusted + afterCall
    `;

    const prototype = runtime.load(state, script);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(7995);
    expect(runtime.status(state)).toBe(0);
  });

  it("executes long string literals and long comments with arbitrary bracket levels", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const simpleLongString = runtime.load(state, "return [[abcde]]");
    expect(runtime.status(state)).toBe(0);
    const simpleHandle = runtime.call(state, simpleLongString);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.stringSize(simpleHandle)).toBe(5);
    expect(
      runtime.stringsEqual(
        simpleHandle,
        runtime.internStringBytes(state, "abcde"),
      ),
    ).toBe(true);

    const leadingNewline = runtime.load(state, "return [[\nabc]]");
    expect(runtime.status(state)).toBe(0);
    const leadingNewlineHandle = runtime.call(state, leadingNewline);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.stringSize(leadingNewlineHandle)).toBe(3);
    expect(
      runtime.stringsEqual(
        leadingNewlineHandle,
        runtime.internStringBytes(state, "abc"),
      ),
    ).toBe(true);

    const levelledLongString = runtime.load(state, "return [==[a]]b]==]");
    expect(runtime.status(state)).toBe(0);
    const levelledHandle = runtime.call(state, levelledLongString);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.stringSize(levelledHandle)).toBe(4);
    expect(
      runtime.stringsEqual(
        levelledHandle,
        runtime.internStringBytes(state, "a]]b"),
      ),
    ).toBe(true);

    const levelledLongComment = runtime.load(
      state,
      "--[==[ this ]] is not the end ]==]\nreturn 9",
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, levelledLongComment)).toBe(9);

    const concatenated = runtime.load(state, 'return "x" .. [[yz]]');
    expect(runtime.status(state)).toBe(0);
    const concatenatedHandle = runtime.call(state, concatenated);
    expect(runtime.status(state)).toBe(0);
    expect(
      runtime.stringsEqual(
        concatenatedHandle,
        runtime.internStringBytes(state, "xyz"),
      ),
    ).toBe(true);
  });

  it("decodes quoted string escapes in the guest parser", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(state, String.raw`return "a\n\t\\\"b"`);

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(
      runtime.stringsEqual(
        result,
        runtime.internStringBytes(state, 'a\n\t\\"b'),
      ),
    ).toBe(true);
  });

  it("evaluates chained table indexing through the guest VM", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local values = {{7}}; return values[1][1]",
    );

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(7);
  });

  it("captures outer locals in guest closures", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local value = 4; local read = function() return value end; return read()",
    );

    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(4);
    expect(runtime.status(state)).toBe(0);
  });

  it("writes captured outer locals from guest closures", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local value = 4; local update = function() value = value + 3 end; update(); return value",
    );

    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(7);
    expect(runtime.status(state)).toBe(0);
  });

  it("reuses guest frames for tail-recursive returns", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "function count(value) if value == 0 then return 0 else return count(value - 1) end end; return count(1000)",
    );

    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, prototype)).toBe(0);
    expect(runtime.status(state)).toBe(0);
  });

  it("dispatches table __index and preserves metatable identity", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local mt = { __index = { missing = 9 } }; local value = setmetatable({}, mt); return value.missing",
    );

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(9);
  });

  it("dispatches table __newindex and arithmetic metamethods", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local left = setmetatable({}, { __newindex = { value = 0 }, __add = function() return 7 end }); local right = setmetatable({}, { __add = function() return 7 end }); left.value = 6; local mt = getmetatable(left); local target = mt.__newindex; return left + right + target.value",
    );

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(13);
  });

  it("dispatches closure-backed index and comparison metamethods", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local value = setmetatable({}, { __index = function() return 9 end }); local left = setmetatable({}, { __eq = function() return 1 end, __lt = function() return 1 end }); local right = setmetatable({}, { __eq = function() return 1 end, __lt = function() return 1 end }); return value.missing + (left == right) + (left < right)",
    );

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(11);
  });

  it("executes method calls with an implicit receiver", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(
      state,
      "local object = { value = 4, method = function(self, extra) return self.value + extra end }; return object:method(3)",
    );

    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(7);
  });

  it("parses integer and decimal float literals through guest-owned values", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const [source, expected] of [
      ["return 0xFF", 255],
      ["return 0X1a", 26],
      ["return 0x10 + 1", 17],
      ["return 0", 0],
      ["return 12345", 12345],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
    }

    for (const [source, expected] of [
      ["return 1.5", 1.5],
      ["return 1e10", 1e10],
      ["return 2.", 2],
      ["return .5", 0.5],
      ["return 0.125e2", 12.5],
      ["return 1e-2", 0.01],
      ["return 1E+2", 100],
      ["return 0x1.8p1", 3],
      ["return 0X1p-1", 0.5],
    ] as const) {
      const isolated = await createWebLuaRuntime(runtime.artifact);
      const isolatedState = isolated.createState();
      const prototype = isolated.load(isolatedState, source);
      expect(isolated.status(isolatedState), source).toBe(0);
      const result = isolated.call(isolatedState, prototype);
      expect(isolated.status(isolatedState), source).toBe(0);
      expect(isolated.valueKind(result), source).toBe("float");
      expect(isolated.floatNumber(result), source).toBe(expected);
    }

    const assigned = runtime.load(state, "local value = 3.25; return value");
    expect(runtime.status(state)).toBe(0);
    const assignedResult = runtime.call(state, assigned);
    expect(runtime.valueKind(assignedResult)).toBe("float");
    expect(runtime.floatNumber(assignedResult)).toBe(3.25);

    const objectCount = runtime.objectCount(state);
    const direct = runtime.floatValue(state, -7.5);
    expect(runtime.valueKind(direct)).toBe("float");
    expect(runtime.floatNumber(direct)).toBe(-7.5);
    expect(runtime.objectCount(state)).toBe(objectCount + 1);
    expect(() => runtime.floatValue(state, Number.POSITIVE_INFINITY)).toThrow(
      /finite numbers/u,
    );
  });

  it("executes mixed float arithmetic and comparisons through guest-owned values", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const [source, expected] of [
      ["return 1.5 + 2.25", 3.75],
      ["return 5.5 - 1.25", 4.25],
      ["return 2.5 * 4", 10],
      ["return 7.5 / 2", 3.75],
      ["return 2 + 0.5", 2.5],
      ["return -2 + 0.5", -1.5],
      ["local value = 1.5; return value * 2", 3],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      const result = runtime.call(state, prototype);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.valueKind(result), source).toBe("float");
      expect(runtime.floatNumber(result), source).toBe(expected);
    }

    for (const [source, expected] of [
      ["return 1.5 < 2", 1],
      ["return 2.5 > 2", 1],
      ["return 2.5 <= 2.5", 1],
      ["return 2.5 >= 3", 0],
      ["return 2.0 == 2", 1],
      ["return 2.0 ~= 2", 0],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
      expect(runtime.status(state), source).toBe(0);
    }

    const division = runtime.load(state, "return 1.5 / 0");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, division)).toBe(0);
    expect(runtime.status(state)).toBe(3);

    const allocationFailure = runtime.load(state, "return 1.5 + 1");
    expect(runtime.status(state)).toBe(0);
    runtime.setAllocationLimit(state, 1);
    expect(runtime.call(state, allocationFailure)).toBe(0);
    expect(runtime.status(state)).toBe(2);
  });

  it("executes forward and backward goto labels through compiled Wasm", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const forward = runtime.load(
      state,
      `
        goto skip
        return 0
        ::skip::
        return 42
      `,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, forward)).toBe(42);
    expect(runtime.status(state)).toBe(0);

    const backward = runtime.load(
      state,
      `
        local i = 0
        ::loop::
        i = i + 1
        if i < 3 then
          goto loop
        end
        return i
      `,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, backward)).toBe(3);
    expect(runtime.status(state)).toBe(0);
  });

  it("executes numeric for loops and repeat-until blocks through compiled Wasm", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const numericFor = runtime.load(
      state,
      `
        local total = 0
        for i = 1, 4 do
          total = total + i
        end
        for step = 2, 6, 2 do
          total = total + step
        end
        return total
      `,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, numericFor)).toBe(22);
    expect(runtime.status(state)).toBe(0);

    const repeatUntil = runtime.load(
      state,
      `
        local i = 0
        local total = 0
        repeat
          i = i + 1
          total = total + i
        until i >= 3
        return total
      `,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, repeatUntil)).toBe(6);
    expect(runtime.status(state)).toBe(0);

    for (const source of ["repeat return 1", "for i = 1, 3 return i"]) {
      runtime.load(state, source);
      expect(runtime.status(state), source).toBe(1);
    }
  });

  it("executes generic for-in loops with guest-defined iterators through compiled Wasm", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    // Guest-defined iterator/state/control — no pairs/ipairs library dependency.
    const multiResult = runtime.load(
      state,
      `
        local function iter(state, control)
          if control >= 3 then
            return nil
          end
          local next = control + 1
          return next, next * 10
        end
        local total = 0
        for i, v in iter, nil, 0 do
          total = total + i + v
        end
        return total
      `,
    );
    expect(runtime.status(state)).toBe(0);
    // (1+10) + (2+20) + (3+30) = 66
    expect(runtime.call(state, multiResult)).toBe(66);
    expect(runtime.status(state)).toBe(0);

    const singleVar = runtime.load(
      state,
      `
        local function countdown(state, control)
          if control <= 1 then
            return nil
          end
          return control - 1
        end
        local total = 0
        for n in countdown, nil, 4 do
          total = total + n
        end
        return total
      `,
    );
    expect(runtime.status(state)).toBe(0);
    // control starts at 4 → yields 3, 2, 1 then nil; total = 6
    expect(runtime.call(state, singleVar)).toBe(6);
    expect(runtime.status(state)).toBe(0);

    const emptyIterator = runtime.load(
      state,
      `
        local function empty(state, control)
          return nil
        end
        local total = 0
        for x in empty, nil, 1 do
          total = total + 1
        end
        return total
      `,
    );
    expect(runtime.status(state)).toBe(0);
    expect(runtime.call(state, emptyIterator)).toBe(0);
    expect(runtime.status(state)).toBe(0);

    for (const source of [
      "for i in do end",
      "for in x do end",
      "for i, j = 1, 2 do end",
    ]) {
      runtime.load(state, source);
      expect(runtime.status(state), source).toBe(1);
    }
  });

  it("executes elseif branches and standalone do blocks through compiled Wasm", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const [source, expected] of [
      [
        "local value = 2; if value == 1 then return 1 elseif value == 2 then return 2 else return 3 end",
        2,
      ],
      [
        "local value = 3; if value == 1 then return 1 elseif value == 2 then return 2 elseif value == 3 then return 3 else return 4 end",
        3,
      ],
      [
        "local value = 0; do local inner = 2; value = value + inner; do value = value + 3 end end; return value",
        5,
      ],
    ] as const) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
      expect(runtime.status(state), source).toBe(0);
    }
  });

  it("breaks from while, repeat, numeric-for, and generic-for loops through compiled Wasm", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const sources = [
      [
        "local value = 0; while true do value = value + 1; break; value = value + 10 end; return value",
        1,
      ],
      [
        "local value = 0; repeat value = value + 1; break; value = value + 10 until value > 4; return value",
        1,
      ],
      [
        "local value = 0; for i = 1, 4 do value = value + i; break; value = value + 10 end; return value",
        1,
      ],
      [
        "local function iter(state, control) return control + 1 end; local value = 0; for i in iter, nil, 0 do value = value + i; break; value = value + 10 end; return value",
        1,
      ],
    ] as const;

    for (const [source, expected] of sources) {
      const prototype = runtime.load(state, source);
      expect(runtime.status(state), source).toBe(0);
      expect(runtime.call(state, prototype), source).toBe(expected);
      expect(runtime.status(state), source).toBe(0);
    }
  });

  it("rejects break outside a loop and malformed break usage", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    for (const source of [
      "break",
      "if true then break end",
      "while true do break",
    ]) {
      runtime.load(state, source);
      expect(runtime.status(state), source).toBe(1);
    }
  });

  it("pauses and resumes a top-level yield without restarting execution", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    // `__yield` is a temporary Step 2 testing hook that drives the guest VM's
    // yield/resume transition before the Step 3 coroutine library exists.
    const prototype = runtime.load(
      state,
      `
        __yield 7
        return 42
      `,
    );
    expect(runtime.status(state)).toBe(0);

    const yielded = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(5);
    expect(yielded).toBe(7);

    const finished = runtime.resume(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(finished).toBe(42);
  });

  it("resumes a yield raised inside a nested function call and finishes the caller", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(
      state,
      `
        function stepper()
          __yield 10
          return 20
        end
        local produced = stepper()
        return produced + 5
      `,
    );
    expect(runtime.status(state)).toBe(0);

    const yielded = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(5);
    expect(yielded).toBe(10);

    const finished = runtime.resume(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(finished).toBe(25);
  });

  it("rejects resuming a chunk that has not yielded", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();

    const prototype = runtime.load(state, "return 1");
    expect(runtime.status(state)).toBe(0);
    expect(runtime.resume(state, prototype)).toBe(0);
    expect(runtime.status(state)).toBe(2);
  });
});
