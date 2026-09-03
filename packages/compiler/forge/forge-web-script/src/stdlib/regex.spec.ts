import { describe, expect, it } from 'vitest';

import { compileForgeWebScript } from '../compiler.ts';
import { lowerForgeWebScriptToIr } from '../ir.ts';
import { createForgeWebScriptAbiManifest } from '../manifest.ts';
import { parseForgeWebScript } from '../parser.ts';
import { validateForgeWebScript } from '../validate.ts';

const VALID_SOURCE = `export fn matches(pattern: string, value: string) -> bool {
  return regex_full_match(pattern, value);
}`;

type RegexRuntimeExports = {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
};

function writeRegexString(exports: RegexRuntimeExports, value: string): [number, number] {
  const bytes = new TextEncoder().encode(value);
  const pointer = exports.fws_alloc(bytes.length);
  new Uint8Array(exports.memory.buffer).set(bytes, pointer);
  return [pointer, bytes.length];
}

describe('Forge regex standard-library contract', () => {
  it('type-checks compiler-owned calls without capabilities', () => {
    const result = validateForgeWebScript(VALID_SOURCE, 'regex.fws');
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.imports).toEqual([]);
  });

  it('annotates regex calls in IR without treating them as imports', () => {
    const parsed = parseForgeWebScript(VALID_SOURCE, 'regex.fws');
    expect(parsed.module).toBeDefined();
    const ir = lowerForgeWebScriptToIr(parsed.module!);
    const statement = ir.functions[0].body[0];
    expect(statement.kind).toBe('return');
    if (statement.kind === 'return') {
      expect(statement.value.kind).toBe('call');
      if (statement.value.kind === 'call') expect(statement.value.standardLibrary).toBe('full-match');
    }
  });

  it('supports capture-bound and search signatures', () => {
    const source = `export fn capture(pattern: string, value: string, start: i32, group: i32) -> i32 {
  return regex_search_capture_start(pattern, value, start, group);
}`;
    const result = validateForgeWebScript(source, 'captures.fws');
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports stable arity and type diagnostics', () => {
    const source = `export fn invalid(pattern: string) -> bool {
  return regex_full_match(pattern);
}`;
    const result = validateForgeWebScript(source, 'invalid.fws');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toContain('FWS-TYPE-003');
  });

  it('keeps regex identities in deterministic manifests, not capability imports', () => {
    const parsed = parseForgeWebScript(VALID_SOURCE, 'regex.fws');
    const manifest = createForgeWebScriptAbiManifest(parsed.module!, {
      standardLibrary: {
        regexBytecodeVersion: 'bytecode-test',
        regexCorpusHash: 'corpus-test',
      },
    });
    expect(manifest.requiredCapabilities).toEqual([]);
    expect(manifest.imports).toEqual([]);
    expect(manifest.standardLibrary).toEqual({ regexBytecodeVersion: 'bytecode-test', regexCorpusHash: 'corpus-test' });
  });
});

describe('Forge regex standard-library runtime execution (real compiler pipeline)', () => {
  it('executes literal-pattern full/prefix/search calls against runtime string parameters', () => {
    const source = `export fn fullMatch(value: string) -> bool {
  return regex_full_match("a+b", value);
}

export fn prefixMatch(value: string) -> bool {
  return regex_prefix_match("ab", value);
}

export fn searchMatch(value: string, start: i32) -> bool {
  return regex_search("cd", value, start);
}`;
    const artifact = compileForgeWebScript({ source, fileName: 'regex-runtime.fws', compilerVersion: 'test' });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeDefined();
    expect(WebAssembly.validate(artifact.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {})
      .exports as RegexRuntimeExports & {
      readonly fullMatch: (pointer: number, length: number) => number;
      readonly prefixMatch: (pointer: number, length: number) => number;
      readonly searchMatch: (pointer: number, length: number, start: number) => number;
    };
    expect(exports.fullMatch(...writeRegexString(exports, 'aaab'))).toBe(1);
    expect(exports.fullMatch(...writeRegexString(exports, 'aaabx'))).toBe(0);
    expect(exports.prefixMatch(...writeRegexString(exports, 'abcd'))).toBe(1);
    expect(exports.searchMatch(...writeRegexString(exports, 'xxcdyy'), 0)).toBe(1);
    expect(exports.searchMatch(...writeRegexString(exports, 'xxxxxx'), 0)).toBe(0);
  });

  it('executes capture start/end for literal patterns against runtime string parameters', () => {
    const source = String.raw`export fn captureStart(value: string, group: i32) -> i32 {
  return regex_full_capture_start("a(\\d+)b", value, group);
}

export fn captureEnd(value: string, group: i32) -> i32 {
  return regex_full_capture_end("a(\\d+)b", value, group);
}`;
    const artifact = compileForgeWebScript({ source, fileName: 'regex-capture-runtime.fws', compilerVersion: 'test' });
    expect(artifact.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {})
      .exports as RegexRuntimeExports & {
      readonly captureStart: (pointer: number, length: number, group: number) => number;
      readonly captureEnd: (pointer: number, length: number, group: number) => number;
    };
    const value = writeRegexString(exports, 'a123b');
    expect(exports.captureStart(...value, 1)).toBe(1);
    expect(exports.captureEnd(...value, 1)).toBe(4);
  });

  it('reports a stable diagnostic instead of crashing for dynamic (non-literal) regex patterns', () => {
    const source = `export fn dynamicPattern(pattern: string, value: string) -> bool {
  return regex_full_match(pattern, value);
}`;
    expect(() =>
      compileForgeWebScript({ source, fileName: 'dynamic-pattern.fws', compilerVersion: 'test' }),
    ).not.toThrow();
    const artifact = compileForgeWebScript({ source, fileName: 'dynamic-pattern.fws', compilerVersion: 'test' });
    expect(artifact.wasm).toBeUndefined();
    expect(artifact.diagnostics).toHaveLength(1);
    expect(artifact.diagnostics[0]?.code).toBe('FWS-EMIT-001');
    expect(artifact.diagnostics[0]?.message).toContain('FWS-REGEX-004');
  });
});
