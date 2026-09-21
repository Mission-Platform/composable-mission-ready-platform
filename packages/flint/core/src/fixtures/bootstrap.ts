/**
 * Test fixture specification for Flint language conformance test suites.
 */
export interface FlintConformanceFixture {
  /** Descriptive label for the conformance test case. */
  readonly name: string;
  /** Flint source code text under test. */
  readonly source: string;
  /** Expected overall validation outcome (true if expected to pass without errors). */
  readonly valid: boolean;
  /** Optional capability tokens expected to be granted to the compiler instance. */
  readonly requestedCapabilities?: readonly string[];
  /** Optional list of expected diagnostic error/warning codes emitted. */
  readonly diagnosticCodes?: readonly string[];
}

/**
 * Valid bootstrap test fixtures that exercise valid Flint language constructs.
 */
export const acceptedBootstrapFixtures: readonly FlintConformanceFixture[] = [
  {
    name: 'pure arithmetic export',
    valid: true,
    source: `export fn add(left: i32, right: i32) -> i32 {
    return left + right;
}`,
  },
  {
    name: 'explicit capability import',
    valid: true,
    requestedCapabilities: ['clock.now'],
    source: `import capability "clock.now" as now() -> i64;

export fn current() -> i64 {
    return now();
}`,
  },
  {
    name: 'control flow and local value',
    valid: true,
    source: `export fn absolute(value: i32) -> i32 {
    if value < 0 {
      return -value;
    } else {
      return value;
    }
    }`,
  },
  {
    name: 'self-host compiler seed module',
    valid: true,
    source: `export fn stage() -> i32 {
    return 8;
}`,
  },
];

/**
 * Invalid bootstrap test fixtures that trigger syntactic, semantic, or capability violations.
 */
export const rejectedBootstrapFixtures: readonly FlintConformanceFixture[] = [
  {
    name: 'implicit export',
    valid: false,
    diagnosticCodes: ['FLINT-ABI-003'],
    source: `fn notExported() -> i32 {
    return 1;
}`,
  },
  {
    name: 'type mismatch',
    valid: false,
    diagnosticCodes: ['FLINT-TYPE-005'],
    source: `export fn wrong() -> i32 {
    return true;
}`,
  },
  {
    name: 'undeclared capability',
    valid: false,
    requestedCapabilities: [],
    diagnosticCodes: ['FLINT-ABI-002'],
    source: `import capability "network.fetch" as fetch(string) -> string;

export fn load() -> string {
    return fetch("https://example.invalid");
}`,
  },
  {
    name: 'missing semicolon',
    valid: false,
    diagnosticCodes: ['FLINT-PARSE-023'],
    source: `export fn value() -> i32 {
    let result: i32 = 1
    return result;
}`,
  },
  {
    name: 'duplicate local let',
    valid: false,
    diagnosticCodes: ['FLINT-TYPE-006'],
    source: `export fn f() -> i32 {
    let x: i32 = 1;
    let x: i32 = 2;
    return x;
}`,
  },
  {
    name: 'shadowing local parameter',
    valid: false,
    diagnosticCodes: ['FLINT-TYPE-006'],
    source: `export fn f(x: i32) -> i32 {
    let x: i32 = 2;
    return x;
}`,
  },
  {
    name: 'shadowing function name',
    valid: false,
    diagnosticCodes: ['FLINT-TYPE-006'],
    source: `fn g() -> i32 {
    return 1;
}
export fn f() -> i32 {
    let g: i32 = 2;
    return g;
    }`,
  },
  {
    name: 'class declaration',
    valid: false,
    diagnosticCodes: ['FLINT-PARSE-052'],
    source: `class Compiler {
    constructor() {}
}`,
  },
];
