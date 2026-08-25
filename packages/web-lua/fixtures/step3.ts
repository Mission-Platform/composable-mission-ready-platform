export type WebLuaStep3UpstreamFile =
  | "strings.lua"
  | "literals.lua"
  | "tpack.lua"
  | "utf8.lua"
  | "errors.lua"
  | "math.lua"
  | "sort.lua"
  | "api.lua";

export type WebLuaStep3ValueKind =
  | "nil"
  | "boolean"
  | "integer"
  | "float"
  | "string"
  | "table"
  | "function"
  | "thread"
  | "userdata"
  | "unknown";

export type WebLuaStep3Literal = "nil" | "false" | "true" | "integer" | "float";

export type WebLuaStep3Operation =
  | { readonly kind: "string-length"; readonly source: string }
  | {
      readonly kind: "string-byte-at";
      readonly source: string;
      readonly index: number;
    }
  | {
      readonly kind: "string-concat";
      readonly left: string;
      readonly right: string;
    }
  | {
      readonly kind: "string-sub";
      readonly source: string;
      readonly start: number;
      readonly finish: number;
    }
  | { readonly kind: "string-reverse"; readonly source: string }
  | {
      readonly kind: "string-case";
      readonly source: string;
      readonly uppercase: boolean;
    }
  | { readonly kind: "invalid-string-length" }
  | { readonly kind: "invalid-string-concat"; readonly left: string }
  | { readonly kind: "literal-kind"; readonly literal: WebLuaStep3Literal }
  | {
      readonly kind: "literal-payload";
      readonly literal: "false" | "true" | "integer";
    }
  | { readonly kind: "literal-float"; readonly value: number }
  | { readonly kind: "invalid-value"; readonly value: number }
  | {
      readonly kind: "table-insert-remove";
      readonly items: readonly number[];
      readonly position: number;
      readonly inserted: number;
      readonly remove: number;
    }
  | {
      readonly kind: "table-concat";
      readonly items: readonly string[];
      readonly separator: string;
      readonly start: number;
      readonly finish: number;
    }
  | { readonly kind: "invalid-table-insert"; readonly position: number }
  | { readonly kind: "invalid-raw-set" }
  | { readonly kind: "utf8-length"; readonly source: string }
  | {
      readonly kind: "utf8-byte";
      readonly source: string;
      readonly index: number;
    }
  | { readonly kind: "invalid-utf8-length" }
  | { readonly kind: "load-status"; readonly source: string }
  | { readonly kind: "call-status"; readonly source: string }
  | { readonly kind: "pcall-status"; readonly source: string }
  | { readonly kind: "invalid-pcall-status" }
  | { readonly kind: "math-abs"; readonly value: number }
  | {
      readonly kind: "math-min";
      readonly left: number;
      readonly right: number;
    }
  | {
      readonly kind: "math-max";
      readonly left: number;
      readonly right: number;
    }
  | { readonly kind: "table-order"; readonly items: readonly number[] }
  | { readonly kind: "api-call"; readonly source: string }
  | { readonly kind: "api-chunk"; readonly source: string }
  | { readonly kind: "api-closed-call"; readonly source: string };

export type WebLuaStep3Expected =
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "bytes"; readonly value: readonly number[] }
  | { readonly kind: "value-kind"; readonly value: WebLuaStep3ValueKind }
  | { readonly kind: "float"; readonly value: number }
  | { readonly kind: "nil" }
  | { readonly kind: "status"; readonly value: number }
  | {
      readonly kind: "table-sequence";
      readonly status: number;
      readonly removed: number;
      readonly values: readonly number[];
    }
  | {
      readonly kind: "api-call";
      readonly loadStatus: number;
      readonly callStatus: number;
      readonly result: number;
    }
  | {
      readonly kind: "api-chunk";
      readonly loadStatus: number;
      readonly format: number;
      readonly sourceLength: number;
    }
  | { readonly kind: "table-values"; readonly values: readonly number[] };

export interface WebLuaStep3Fixture {
  readonly upstreamFile: WebLuaStep3UpstreamFile;
  readonly name: string;
  readonly operation: WebLuaStep3Operation;
  readonly expected: WebLuaStep3Expected;
  readonly negative?: boolean;
}

export const WEB_LUA_STEP_3_FIXTURES = [
  {
    upstreamFile: "strings.lua",
    name: "string length",
    operation: { kind: "string-length", source: "mission" },
    expected: { kind: "number", value: 7 },
  },
  {
    upstreamFile: "strings.lua",
    name: "one-based string byte",
    operation: { kind: "string-byte-at", source: "WebLua", index: 2 },
    expected: { kind: "number", value: 101 },
  },
  {
    upstreamFile: "strings.lua",
    name: "string concatenation",
    operation: { kind: "string-concat", left: "web", right: "lua" },
    expected: { kind: "bytes", value: [119, 101, 98, 108, 117, 97] },
  },
  {
    upstreamFile: "strings.lua",
    name: "string substring",
    operation: { kind: "string-sub", source: "mission", start: 2, finish: 5 },
    expected: { kind: "bytes", value: [105, 115, 115, 105] },
  },
  {
    upstreamFile: "strings.lua",
    name: "string reversal",
    operation: { kind: "string-reverse", source: "mission" },
    expected: { kind: "bytes", value: [110, 111, 105, 115, 115, 105, 109] },
  },
  {
    upstreamFile: "strings.lua",
    name: "ASCII string case conversion",
    operation: {
      kind: "string-case",
      source: "WebLua 5.5!",
      uppercase: false,
    },
    expected: {
      kind: "bytes",
      value: [119, 101, 98, 108, 117, 97, 32, 53, 46, 53, 33],
    },
  },
  {
    upstreamFile: "strings.lua",
    name: "invalid string operand",
    operation: { kind: "invalid-string-length" },
    expected: { kind: "number", value: 0 },
    negative: true,
  },
  {
    upstreamFile: "strings.lua",
    name: "invalid string concatenation",
    operation: { kind: "invalid-string-concat", left: "web" },
    expected: { kind: "nil" },
    negative: true,
  },
  {
    upstreamFile: "literals.lua",
    name: "nil literal kind",
    operation: { kind: "literal-kind", literal: "nil" },
    expected: { kind: "value-kind", value: "nil" },
  },
  {
    upstreamFile: "literals.lua",
    name: "boolean literal payload",
    operation: { kind: "literal-payload", literal: "true" },
    expected: { kind: "number", value: 1 },
  },
  {
    upstreamFile: "literals.lua",
    name: "integer literal payload",
    operation: { kind: "literal-payload", literal: "integer" },
    expected: { kind: "number", value: 42 },
  },
  {
    upstreamFile: "literals.lua",
    name: "float literal value",
    operation: { kind: "literal-float", value: -7.5 },
    expected: { kind: "float", value: -7.5 },
  },
  {
    upstreamFile: "literals.lua",
    name: "invalid value tag",
    operation: { kind: "invalid-value", value: 0x90000000 },
    expected: { kind: "boolean", value: false },
    negative: true,
  },
  {
    upstreamFile: "tpack.lua",
    name: "table insertion and removal",
    operation: {
      kind: "table-insert-remove",
      items: [1, 3],
      position: 2,
      inserted: 2,
      remove: 2,
    },
    expected: {
      kind: "table-sequence",
      status: 0,
      removed: 2,
      values: [1, 3],
    },
  },
  {
    upstreamFile: "tpack.lua",
    name: "table string packing projection",
    operation: {
      kind: "table-concat",
      items: ["one", "two", "three"],
      separator: ",",
      start: 2,
      finish: 3,
    },
    expected: {
      kind: "bytes",
      value: [116, 119, 111, 44, 116, 104, 114, 101, 101],
    },
  },
  {
    upstreamFile: "tpack.lua",
    name: "invalid table position",
    operation: { kind: "invalid-table-insert", position: 0 },
    expected: { kind: "status", value: 2 },
    negative: true,
  },
  {
    upstreamFile: "tpack.lua",
    name: "invalid raw table target",
    operation: { kind: "invalid-raw-set" },
    expected: { kind: "status", value: 2 },
    negative: true,
  },
  {
    upstreamFile: "utf8.lua",
    name: "UTF-8 byte length projection",
    operation: { kind: "utf8-length", source: "Aé" },
    expected: { kind: "number", value: 2 },
  },
  {
    upstreamFile: "utf8.lua",
    name: "UTF-8 byte access projection",
    operation: { kind: "utf8-byte", source: "Aé", index: 2 },
    expected: { kind: "number", value: 169 },
  },
  {
    upstreamFile: "utf8.lua",
    name: "invalid UTF-8 operand",
    operation: { kind: "invalid-utf8-length" },
    expected: { kind: "number", value: 0 },
    negative: true,
  },
  {
    upstreamFile: "errors.lua",
    name: "malformed source status",
    operation: { kind: "load-status", source: "return 1 +" },
    expected: { kind: "status", value: 1 },
    negative: true,
  },
  {
    upstreamFile: "errors.lua",
    name: "division error status",
    operation: { kind: "call-status", source: "return 1 / 0" },
    expected: { kind: "status", value: 3 },
    negative: true,
  },
  {
    upstreamFile: "errors.lua",
    name: "protected successful call status",
    operation: { kind: "pcall-status", source: "return 7" },
    expected: { kind: "status", value: 0 },
  },
  {
    upstreamFile: "errors.lua",
    name: "protected invalid call status",
    operation: { kind: "invalid-pcall-status" },
    expected: { kind: "status", value: 2 },
    negative: true,
  },
  {
    upstreamFile: "math.lua",
    name: "absolute value",
    operation: { kind: "math-abs", value: -4.5 },
    expected: { kind: "float", value: 4.5 },
  },
  {
    upstreamFile: "math.lua",
    name: "minimum value",
    operation: { kind: "math-min", left: 3, right: 2 },
    expected: { kind: "float", value: 2 },
  },
  {
    upstreamFile: "math.lua",
    name: "maximum value",
    operation: { kind: "math-max", left: -1, right: -2 },
    expected: { kind: "float", value: -1 },
  },
  {
    upstreamFile: "sort.lua",
    name: "table order remains explicit without table.sort",
    operation: { kind: "table-order", items: [3, 1, 2] },
    expected: { kind: "table-values", values: [3, 1, 2] },
    negative: true,
  },
  {
    upstreamFile: "api.lua",
    name: "load and call result",
    operation: { kind: "api-call", source: "return 7" },
    expected: {
      kind: "api-call",
      loadStatus: 0,
      callStatus: 0,
      result: 7,
    },
  },
  {
    upstreamFile: "api.lua",
    name: "loaded text chunk metadata",
    operation: { kind: "api-chunk", source: "return 7" },
    expected: {
      kind: "api-chunk",
      loadStatus: 0,
      format: 1,
      sourceLength: 8,
    },
  },
  {
    upstreamFile: "api.lua",
    name: "closed state rejects calls",
    operation: { kind: "api-closed-call", source: "return 7" },
    expected: {
      kind: "api-call",
      loadStatus: 0,
      callStatus: 0,
      result: 0,
    },
    negative: true,
  },
] as const satisfies readonly WebLuaStep3Fixture[];
