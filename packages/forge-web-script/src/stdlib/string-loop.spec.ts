import { describe, expect, it } from 'vitest';

import { compileForgeWebScript } from '../compiler.js';
import { lowerForgeWebScriptToIr } from '../ir.js';
import { parseForgeWebScript } from '../parser.js';
import { validateForgeWebScript } from '../validate.js';

describe('Forge iterator-first control flow and string helpers', () => {
  const source = `export fn countDigits(value: string) -> i32 {
  let index: i32 = 0;
  while index < string_length(value) {
    index = index + 1;
  }
  return index;
}`;

  it('accepts imperative while loops with a deterministic AST and IR shape', () => {
    const result = validateForgeWebScript(source, 'loop.fws');
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.imports).toEqual([]);
  });

  it('keeps while loops in AST and IR executable paths', () => {
    const parsed = parseForgeWebScript(source, 'loop.fws');
    expect(parsed.module).toBeDefined();
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module?.functions[0]?.body.map(({ kind }) => kind)).toEqual([
      'let',
      'while',
      'return',
    ]);
    const ir = lowerForgeWebScriptToIr(parsed.module!);
    expect(ir.functions[0]?.body.map(({ kind }) => kind)).toEqual([
      'let',
      'while',
      'return',
    ]);
  });

  it('type-checks loop conditions and bodies', () => {
    const result = validateForgeWebScript(
      `export fn invalid() -> i32 {
  let value: i32 = 0;
  while value {
    value = "wrong";
  }
  return value;
}`,
      'invalid-loop.fws',
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['FWS-TYPE-005', 'FWS-TYPE-005']);
  });

  it('compiles a source module containing a while loop', () => {
    const artifact = compileForgeWebScript({ source, fileName: 'loop.fws', compilerVersion: 'test' });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeDefined();
  });

  it('rejects for statements while retaining do while statements', () => {
    const source = `export fn controlFlow(limit: i32) -> i32 {
  let total: i32 = 0;
  for (let index: i32 = 0; index < limit; index = index + 1) {
    total = total + index;
  }
  do {
    total = total - 1;
  } while total > 0;
  return total;
    }`;
    const validation = validateForgeWebScript(source, 'control-flow.fws');
    expect(validation.valid).toBe(false);
    expect(validation.diagnostics.map(({ code }) => code)).toEqual(['FWS-PARSE-076']);

    const parsed = parseForgeWebScript(source, 'control-flow.fws');
    expect(parsed.diagnostics.map(({ code }) => code)).toEqual(['FWS-PARSE-076']);
    const statements = parsed.module?.functions[0]?.body ?? [];
    expect(statements.map(({ kind }) => kind)).toEqual([
      'let',
      'expression-statement',
      'do-while',
      'return',
    ]);

    const loop = lowerForgeWebScriptToIr(parsed.module!).functions[0]?.body ?? [];
    expect(loop.map(({ kind }) => kind)).toEqual([
      'let',
      'expression-statement',
      'do-while',
      'return',
    ]);

    const artifact = compileForgeWebScript({ source, fileName: 'control-flow.fws', compilerVersion: 'test' });
    expect(artifact.diagnostics.map(({ code }) => code)).toEqual(['FWS-PARSE-076']);
    expect(artifact.wasm).toBeUndefined();
  });
});

describe('Forge string/byte standard-library helpers against runtime parameters (real compiler pipeline)', () => {
  type StringHelperExports = {
    readonly memory: WebAssembly.Memory;
    readonly fws_alloc: (size: number) => number;
    readonly byteAt: (pointer: number, length: number, index: number) => number;
    readonly startsWithPrefix: (
      valuePointer: number,
      valueLength: number,
      prefixPointer: number,
      prefixLength: number,
    ) => number;
    readonly sliceOf: (pointer: number, length: number, start: number, end: number) => readonly [number, number];
    readonly toNumber: (pointer: number, length: number) => number;
  };

  const writeString = (exports: StringHelperExports, value: string): [number, number] => {
    const bytes = new TextEncoder().encode(value);
    const pointer = exports.fws_alloc(bytes.length);
    new Uint8Array(exports.memory.buffer).set(bytes, pointer);
    return [pointer, bytes.length];
  };

  const readString = (exports: StringHelperExports, [pointer, length]: readonly [number, number]): string =>
    new TextDecoder().decode(new Uint8Array(exports.memory.buffer, pointer, length));

  it('executes byte-at, starts-with, slice, and numeric conversion against runtime string parameters', () => {
    const source = `export fn byteAt(value: string, index: i32) -> i32 {
  return string_byte_at(value, index);
}

export fn startsWithPrefix(value: string, prefix: string) -> bool {
  return string_starts_with(value, prefix);
}

export fn sliceOf(value: string, start: i32, end: i32) -> string {
  return string_slice(value, start, end);
}

export fn toNumber(value: string) -> i32 {
  return string_to_i32(value);
}`;
    const artifact = compileForgeWebScript({ source, fileName: 'string-helpers.fws', compilerVersion: 'test' });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeDefined();
    expect(WebAssembly.validate(artifact.wasm!.buffer as ArrayBuffer)).toBe(true);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {})
      .exports as unknown as StringHelperExports;

    expect(exports.byteAt(...writeString(exports, 'abc'), 1)).toBe('b'.codePointAt(0));
    expect(exports.startsWithPrefix(...writeString(exports, 'abcdef'), ...writeString(exports, 'abc'))).toBe(1);
    expect(exports.startsWithPrefix(...writeString(exports, 'abcdef'), ...writeString(exports, 'xyz'))).toBe(0);
    const slice = exports.sliceOf(...writeString(exports, 'abcdef'), 1, 4);
    expect(readString(exports, slice)).toBe('bcd');
    expect(exports.toNumber(...writeString(exports, '-42'))).toBe(-42);
  });

  it('concatenates runtime strings with owned output memory', () => {
    const artifact = compileForgeWebScript({
      source: `export fn join(left: string, right: string) -> string {
  return string_concat(left, right);
}`,
      fileName: 'string-concat.fws',
      compilerVersion: 'test',
    });
    expect(artifact.diagnostics).toEqual([]);
    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {})
      .exports as unknown as StringHelperExports & {
        readonly join: (...parts: number[]) => readonly [number, number];
      };
    const left = writeString(exports, '12');
    const right = writeString(exports, '345');
    expect(left).toEqual([1024, 2]);
    expect(right).toEqual([1026, 3]);
    expect(new TextDecoder().decode(new Uint8Array(exports.memory.buffer, 1024, 5))).toBe('12345');
    const joined = exports.join(...left, ...right);
    expect(joined).toEqual([1029, 5]);
    expect(readString(exports, joined)).toBe('12345');
  });
});
