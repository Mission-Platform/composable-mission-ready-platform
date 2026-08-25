export type WebLuaStep2Status = "ok" | "yielded";

export type WebLuaStep2Expected =
  | {
      readonly kind: "value";
      readonly status: "ok";
      readonly value: number;
    }
  | {
      readonly kind: "yield";
      readonly status: "yielded";
      readonly value: number;
      readonly resume: {
        readonly status: "ok";
        readonly value: number;
      };
    };

export interface WebLuaStep2Fixture {
  readonly upstreamFile: string;
  readonly source: string;
  readonly expected: WebLuaStep2Expected;
}

export const WEB_LUA_STEP_2_FIXTURES = [
  {
    upstreamFile: "main.lua",
    source: "return 42",
    expected: { kind: "value", status: "ok", value: 42 },
  },
  {
    upstreamFile: "constructs.lua",
    source: `
      local total = 0
      for index = 1, 4 do
        total = total + index
      end
      if total == 10 then return total else return 0 end
    `,
    expected: { kind: "value", status: "ok", value: 10 },
  },
  {
    upstreamFile: "locals.lua",
    source: `
      local value = 3
      do
        local inner = 4
        value = value + inner
      end
      return value
    `,
    expected: { kind: "value", status: "ok", value: 7 },
  },
  {
    upstreamFile: "vararg.lua",
    source: `
      function first(...)
        return ...
      end
      return first(8, 13)
    `,
    expected: { kind: "value", status: "ok", value: 13 },
  },
  {
    upstreamFile: "closure.lua",
    source: `
      function make()
        local captured = 41
        return function() return captured + 1 end
      end
      local getter = make()
      return getter()
    `,
    expected: { kind: "value", status: "ok", value: 42 },
  },
  {
    upstreamFile: "coroutine.lua",
    source: `
      __yield 7
      return 42
    `,
    expected: {
      kind: "yield",
      status: "yielded",
      value: 7,
      resume: { status: "ok", value: 42 },
    },
  },
  {
    upstreamFile: "goto.lua",
    source: `
      local value = 0
      ::loop::
      value = value + 1
      if value < 3 then goto loop end
      return value
    `,
    expected: { kind: "value", status: "ok", value: 3 },
  },
  {
    upstreamFile: "bitwise.lua",
    source: "return (6 & 3) | (1 << 2)",
    expected: { kind: "value", status: "ok", value: 6 },
  },
  {
    upstreamFile: "verybig.lua",
    source: "return 16777215",
    expected: { kind: "value", status: "ok", value: 16777215 },
  },
] as const satisfies readonly WebLuaStep2Fixture[];
