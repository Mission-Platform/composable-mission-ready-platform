export type LuaDifferentialExpected =
  | { readonly kind: "value"; readonly value: number }
  | { readonly kind: "syntax-error" }
  | { readonly kind: "runtime-error" };

export interface LuaDifferentialFixture {
  readonly name: string;
  readonly source: string;
  readonly expected: LuaDifferentialExpected;
}

export const LUA_DIFFERENTIAL_FIXTURES = [
  {
    name: "arithmetic precedence",
    source: "return 2 + 3 * 4",
    expected: { kind: "value", value: 14 },
  },
  {
    name: "parenthesized arithmetic",
    source: "return (2 + 3) * 4",
    expected: { kind: "value", value: 20 },
  },
  {
    name: "unary integer",
    source: "return -4",
    expected: { kind: "value", value: -4 },
  },
  {
    name: "numeric comparison",
    source: "return 3 ~= 4",
    expected: { kind: "value", value: 1 },
  },
  {
    name: "local and control flow",
    source:
      "local value = 0; while value < 3 do value = value + 1 end; return value",
    expected: { kind: "value", value: 3 },
  },
  {
    name: "named function call",
    source:
      "function add(left, right) return left + right end; return add(2, 3)",
    expected: { kind: "value", value: 5 },
  },
  {
    name: "boolean true projection",
    source: "return true",
    expected: { kind: "value", value: 1 },
  },
  {
    name: "nil projection",
    source: "return nil",
    expected: { kind: "value", value: 0 },
  },
  {
    name: "syntax error",
    source: "return 1 +",
    expected: { kind: "syntax-error" },
  },
  {
    name: "calling an undefined function",
    source: "return missing()",
    expected: { kind: "runtime-error" },
  },
] as const satisfies readonly LuaDifferentialFixture[];
