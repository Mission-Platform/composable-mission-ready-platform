export interface ForgeWebScriptConformanceFixture {
  readonly name: string;
  readonly source: string;
  readonly valid: boolean;
  readonly requestedCapabilities?: readonly string[];
  readonly diagnosticCodes?: readonly string[];
}

export const acceptedBootstrapFixtures: readonly ForgeWebScriptConformanceFixture[] = [
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

export const rejectedBootstrapFixtures: readonly ForgeWebScriptConformanceFixture[] = [
  {
    name: 'implicit export',
    valid: false,
    diagnosticCodes: ['FWS-ABI-003'],
    source: `fn notExported() -> i32 {
    return 1;
}`,
  },
  {
    name: 'type mismatch',
    valid: false,
    diagnosticCodes: ['FWS-TYPE-005'],
    source: `export fn wrong() -> i32 {
    return true;
}`,
  },
  {
    name: 'undeclared capability',
    valid: false,
    requestedCapabilities: [],
    diagnosticCodes: ['FWS-ABI-002'],
    source: `import capability "network.fetch" as fetch(string) -> string;

export fn load() -> string {
    return fetch("https://example.invalid");
}`,
  },
  {
    name: 'missing semicolon',
    valid: false,
    diagnosticCodes: ['FWS-PARSE-023'],
    source: `export fn value() -> i32 {
    let result: i32 = 1
    return result;
}`,
  },
  {
    name: 'duplicate local let',
    valid: false,
    diagnosticCodes: ['FWS-TYPE-006'],
    source: `export fn f() -> i32 {
    let x: i32 = 1;
    let x: i32 = 2;
    return x;
}`,
  },
  {
    name: 'shadowing local parameter',
    valid: false,
    diagnosticCodes: ['FWS-TYPE-006'],
    source: `export fn f(x: i32) -> i32 {
    let x: i32 = 2;
    return x;
}`,
  },
  {
    name: 'shadowing function name',
    valid: false,
    diagnosticCodes: ['FWS-TYPE-006'],
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
    diagnosticCodes: ['FWS-PARSE-052'],
    source: `class Compiler {
    constructor() {}
}`,
  },
];
