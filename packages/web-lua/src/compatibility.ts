export const WEB_LUA_COMPATIBILITY_STATUSES = [
  "matched",
  "capability-gated",
  "unresolved",
] as const;

export type WebLuaCompatibilityStatus =
  (typeof WEB_LUA_COMPATIBILITY_STATUSES)[number];

export interface WebLuaCompatibilityEntry {
  readonly area: string;
  readonly behavior: string;
  readonly status: WebLuaCompatibilityStatus;
  readonly evidence: string;
  readonly notes: string;
}

export const WEB_LUA_COMPATIBILITY_MATRIX = [
  {
    area: "lexical syntax",
    behavior: "Whitespace, comments, keywords, integer literals, and operators",
    status: "unresolved",
    evidence: "src/utils/web-lua.spec.ts; src/differential.spec.ts",
    notes:
      "The covered subset includes long syntax, decimal and hexadecimal integer/float forms, elseif/do/break, chained table suffixes, and common quoted-string escapes; complete Lua name syntax and remaining lexical forms remain open.",
  },
  {
    area: "scalar expressions",
    behavior:
      "Integer and float arithmetic, unary minus, grouping, precedence, and comparisons",
    status: "matched",
    evidence: "src/differential.spec.ts; src/utils/web-lua.spec.ts",
    notes:
      "Mixed integer/float arithmetic and comparisons, including hexadecimal floating-point literals with binary exponents, are covered; bitwise operations remain integer-only and numeric coercion is bounded.",
  },
  {
    area: "locals and control flow",
    behavior:
      "Local assignment, reassignment, conditionals, loops, generic iteration, and returns",
    status: "matched",
    evidence: "src/differential.spec.ts; src/utils/web-lua.spec.ts",
    notes:
      "Bounded guest local and stack capacities remain explicit runtime limits.",
  },
  {
    area: "named functions",
    behavior:
      "Named function definitions, parameters, calls, and scalar returns",
    status: "matched",
    evidence: "src/differential.spec.ts; src/utils/web-lua.spec.ts",
    notes:
      "Method calls with an implicit receiver, basic nested closure reads, captured-local mutation, and tail-recursive returns are covered; varargs and arbitrary multiple returns are not included in this row.",
  },
  {
    area: "errors and loading",
    behavior:
      "Syntax errors, runtime errors, division errors, and malformed binary prefixes",
    status: "matched",
    evidence: "src/utils/web-lua.spec.ts; src/differential.spec.ts",
    notes:
      "Guest status codes are compared without parsing Lua errors in TypeScript.",
  },
  {
    area: "host-facing libraries",
    behavior: "I/O, clock, randomness, OS, package loading, and debug effects",
    status: "capability-gated",
    evidence: "src/utils/web-lua.spec.ts",
    notes:
      "Capabilities are deny-by-default metadata and policy hooks; standard-library implementations are not yet complete.",
  },
  {
    area: "values and tables",
    behavior:
      "Strings, floats, tables, userdata, identity, iteration, and metamethods",
    status: "unresolved",
    evidence:
      "src/utils/web-lua.spec.ts; src/library-step3.spec.ts; src/step3.spec.ts",
    notes:
      "Float values, tables with array keys through 32 plus hash fallback, guest-owned table insertion/removal/concatenation, table __index/__newindex/__add/__eq/__lt dispatch, and guest-owned string byte/equality/concatenation operations are covered; the Step 3 fixture adds exact literal, table-order, and invalid-operand observations; userdata, __call/__len, and full value/result handles remain unresolved.",
  },
  {
    area: "closures and coroutines",
    behavior:
      "Upvalues, yield/resume, protected calls, and nested coroutine errors",
    status: "unresolved",
    evidence:
      "src/utils/web-lua.spec.ts; src/library-step3.spec.ts; src/step3.spec.ts",
    notes:
      "Top-level and nested yield continuation plus a guest protected-call status path are covered; the Step 3 fixture records successful and invalid protected-call status values, but coroutine library behavior, resume arguments/results, close, pcall result objects, xpcall, and full upvalue semantics remain unresolved.",
  },
  {
    area: "standard libraries",
    behavior:
      "Base, coroutine, table, string, UTF-8, math, I/O, OS, debug, and package/load modules",
    status: "unresolved",
    evidence: "src/library-step3.spec.ts; src/step3.spec.ts",
    notes:
      "The Step 3 fixture provides deterministic direct-API evidence for the planned strings.lua, literals.lua, tpack.lua, utf8.lua, errors.lua, math.lua, sort.lua, and api.lua slices, including exact values and failure statuses. It does not claim Lua-level module compatibility: table.pack/unpack and table.sort, complete UTF-8 character semantics, loading helpers, protected-call result objects, and I/O/OS adapters remain unresolved; coroutine, package, and debug helpers are only status/metadata projections.",
  },
  {
    area: "portable suite gate",
    behavior: "Lua 5.5.1 all.lua with _U=true and explicit capability policy",
    status: "unresolved",
    evidence:
      "packages/web-lua-cli/src/suite.ts; packages/web-lua-cli/src/suite.spec.ts",
    notes:
      "The deterministic runner records the manifest, exact upstream file markers, executed and unexecuted portable files, stderr diagnostics, final marker, exit code, capability-gated files.lua, and unsupported big.lua, cstack.lua, api.lua, and memerr.lua. The current WebLua run reaches the guest dofile/load boundary before final OK !!!; no suite case is silently omitted.",
  },
] as const satisfies readonly WebLuaCompatibilityEntry[];

export interface WebLuaCompatibilitySummary {
  readonly total: number;
  readonly matched: number;
  readonly capabilityGated: number;
  readonly unresolved: number;
}

export function compatibilitySummary(
  matrix: readonly WebLuaCompatibilityEntry[],
): WebLuaCompatibilitySummary {
  return {
    total: matrix.length,
    matched: matrix.filter((entry) => entry.status === "matched").length,
    capabilityGated: matrix.filter(
      (entry) => entry.status === "capability-gated",
    ).length,
    unresolved: matrix.filter((entry) => entry.status === "unresolved").length,
  };
}

export function renderCompatibilityMatrixMarkdown(
  matrix: readonly WebLuaCompatibilityEntry[],
): string {
  const summary = compatibilitySummary(matrix);
  const rows = matrix.map(
    (entry) =>
      `| ${entry.area} | ${entry.behavior} | ${entry.status} | ${entry.evidence} | ${entry.notes} |`,
  );
  return [
    "# WebLua Lua 5.5.1 Compatibility Matrix",
    "",
    `Summary: ${summary.matched} matched, ${summary.capabilityGated} capability-gated, ${summary.unresolved} unresolved of ${summary.total} tracked areas.`,
    "",
    "| Area | Behavior | Status | Evidence | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}
