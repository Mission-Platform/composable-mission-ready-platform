import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { compileForgeWebScript, createForgeWebScriptCompilerService } from './compiler.ts';
import {
  createForgeWebScriptSelfHostedCompilerSourceManifest,
  prepareForgeWebScriptSelfHostedCompilation,
} from './self-hosted.ts';
import { validateForgeWebScript } from './validate.ts';

const input = (source: string, requestedCapabilities?: readonly string[]) => ({
  source,
  fileName: 'test.fws',
  compilerVersion: '0.1.0',
  requestedCapabilities,
});

function instantiate(
  source: string,
  requestedCapabilities?: readonly string[],
  imports: WebAssembly.Imports = {},
): WebAssembly.Exports {
  const artifact = compileForgeWebScript(input(source, requestedCapabilities));
  expect(artifact.diagnostics).toEqual([]);
  expect(artifact.wasm).toBeInstanceOf(Uint8Array);
  expect(WebAssembly.validate(artifact.wasm!)).toBe(true);
  return new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), imports).exports;
}

describe('Forge Web Script bootstrap compiler', () => {
  it('compiles and executes the stateful memory fixture through Wasm', () => {
    const fileName = path.join(import.meta.dirname, 'fixtures/stateful-memory.fws');
    const artifact = compileForgeWebScript({ ...input(readFileSync(fileName, 'utf8')), fileName });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.exports.map(({ name }) => name)).toEqual([
      'convert_u32_to_f64',
      'invalid_load',
      'invalid_load_f64',
      'recursive_sum',
      'write_and_read',
      'write_and_read_f64',
    ]);
    const instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {});
    const exports = instance.exports as unknown as {
      readonly write_and_read: (value: number) => number;
      readonly write_and_read_f64: (value: number) => number;
      readonly convert_u32_to_f64: (value: number) => number;
      readonly recursive_sum: (value: number) => number;
      readonly invalid_load: (address: number) => number;
      readonly invalid_load_f64: (address: number) => number;
      readonly fws_reset: () => void;
    };

    expect(exports.write_and_read(0xfeed_beef)).toBe(0xfeed_beef | 0);
    expect(exports.write_and_read_f64(Math.PI)).toBe(Math.PI);
    expect(exports.convert_u32_to_f64(4_000_000_000)).toBe(4_000_000_000);
    expect(exports.recursive_sum(5)).toBe(15);
    exports.fws_reset();
    expect(exports.write_and_read(0x1234_5678)).toBe(0x1234_5678 | 0);
    expect(exports.write_and_read_f64(-123.625)).toBe(-123.625);
    expect(() => exports.invalid_load(0xfffffff0)).toThrow();
    expect(() => exports.invalid_load_f64(0xfffffff0)).toThrow();
  });

  it('compiles the package-local file fixture through the artifact contract', () => {
    const fileName = path.join(import.meta.dirname, 'fixtures/file-compile.fws');
    const artifact = compileForgeWebScript({ ...input(readFileSync(fileName, 'utf8')), fileName });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.exports.map(({ name }) => name)).toEqual(['answer']);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
    expect(WebAssembly.validate(artifact.wasm!)).toBe(true);
  });

  it('emits valid deterministic wasm for a pure numeric function', () => {
    const source = `export fn add(left: i32, right: i32) -> i32 {
  return left + right;
}`;
    const first = compileForgeWebScript(input(source));
    const second = compileForgeWebScript(input(source));

    expect(first.diagnostics).toEqual([]);
    expect(first.wasm).toBeInstanceOf(Uint8Array);
    expect(first.wasm).toEqual(second.wasm);
    expect(first.contentHash).toBe(second.contentHash);
    const instance = new WebAssembly.Instance(new WebAssembly.Module(first.wasm!), {});
    expect((instance.exports.add as (left: number, right: number) => number)(2, 3)).toBe(5);
    expect(instance.exports.memory).toBeInstanceOf(WebAssembly.Memory);
  });

  it('executes while and do while loops, including a do while false condition', () => {
    const source = `
export fn whileLoop() -> i32 {
  let value: i32 = 0;
  while value < 2 { value = value + 1; }
  return value;
}
export fn doWhileLoop() -> i32 {
  let value: i32 = 0;
  do { value = value + 1; } while false;
  return value;
}`;
    const exports = instantiate(source);

    expect((exports.whileLoop as () => number)()).toBe(2);
    expect((exports.doWhileLoop as () => number)()).toBe(1);
  });

  it.each(['debug', 'release'] as const)(
    'executes Array.iter().next() and iterator loops in %s mode',
    async (optimization) => {
      const source = `
export fn first(items: Array<i32>) -> Option<i32> {
  let iterator: Iterator<i32> = items.iter();
  return iterator.next();
}
export fn exhausted(items: Array<i32>) -> Option<i32> {
  let iterator: Iterator<i32> = items.iter();
  let ignored: Option<i32> = iterator.next();
  let ignoredAgain: Option<i32> = iterator.next();
  return iterator.next();
}
export fn sumParam(items: Array<i32>) -> i32 {
  let total: i32 = 0;
  loop value = items.iter() {
    total = total + value;
  }
  return total;
}
export fn sumLiteral() -> i32 {
  let items: [i32; 3] = [10, 20, 30];
  let total: i32 = 0;
  loop value = items.iter() {
    total = total + value;
  }
  return total;
}
export fn emptySum(items: Array<i32>) -> i32 {
  let total: i32 = 0;
  loop value = items.iter() {
    total = total + value;
  }
  return total;
}`;
      const artifact = compileForgeWebScript({ ...input(source), optimization });
      expect(artifact.diagnostics).toEqual([]);
      expect(artifact.wasm).toBeInstanceOf(Uint8Array);
      expect(WebAssembly.validate(artifact.wasm!)).toBe(true);
      const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);

      for (const exports of [generated.loadSync(), await generated.load()]) {
        expect(exports.first([10, 20, 30])).toBe(10n);
        expect(exports.first([])).toBe(4_294_967_296n);
        // exhausted() advances three times: third value on a 3-element array, else done.
        expect(exports.exhausted([10, 20, 30])).toBe(30n);
        expect(exports.exhausted([10])).toBe(4_294_967_296n);
        expect(exports.exhausted([])).toBe(4_294_967_296n);
        expect(exports.exhausted([1, 2])).toBe(4_294_967_296n);
        expect(exports.sumParam([10, 20, 30])).toBe(60);
        expect(exports.sumParam([7])).toBe(7);
        expect(exports.sumLiteral()).toBe(60);
        expect(exports.emptySum([])).toBe(0);
        expect(exports.first([42])).toBe(42n);
      }
    },
  );

  it('emits explicit capability imports and invokes them through wasm', () => {
    const source = `import capability "clock.now" as now() -> i64;
  export fn current() -> i64 {
  return now();
}`;
    const artifact = compileForgeWebScript(input(source, ['clock.now']));
    expect(artifact.diagnostics).toEqual([]);
    expect(WebAssembly.Module.imports(new WebAssembly.Module(artifact.wasm!))).toEqual([
      { module: 'clock.now', name: 'now', kind: 'function' },
    ]);
    const instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {
      'clock.now': { now: () => 42n },
    });
    expect((instance.exports.current as () => bigint)()).toBe(42n);
  });

  it('generates exact export and nested import contracts for every ABI value shape', () => {
    const artifact = compileForgeWebScript(
      input(`
import capability "clock.now" as now() -> i64;
export fn currentTime() -> i64 { return now(); }
export fn roundTrip(value: bytes) -> bytes { return value; }
export fn echo(value: string) -> string { return value; }
`),
    );
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.declarations).toContain('export interface ForgeWebScriptExports');
    expect(artifact.declarations).toContain('readonly currentTime: () => bigint;');
    expect(artifact.declarations).toContain('readonly roundTrip: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;');
    expect(artifact.declarations).toContain('readonly echo: (value: string) => string;');
    expect(artifact.declarations).toContain('readonly memory: WebAssembly.Memory;');
    expect(artifact.declarations).toContain('readonly fws_alloc: (size: number) => number;');
    expect(artifact.declarations).toContain('readonly fws_dealloc: (pointer: number, size: number) => void;');
    expect(artifact.declarations).toContain(
      'readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;',
    );
    expect(artifact.declarations).toContain('readonly fws_reset: () => void;');
    expect(artifact.declarations).toContain('export interface ForgeWebScriptImports');
    expect(artifact.declarations).toContain('readonly "clock.now": {');
    expect(artifact.declarations).toContain('readonly now: () => bigint;');
    expect(artifact.declarations).toContain('load(imports?: ForgeWebScriptImports): Promise<ForgeWebScriptExports>');
    expect(artifact.declarations).toContain('loadSync(imports?: ForgeWebScriptImports): ForgeWebScriptExports');
  });

  it('marshals exported enum and Array<i32> parameters through the owned contiguous carrier', async () => {
    const artifact = compileForgeWebScript(
      input(`
export enum State { Idle = -1, Ready = 4 }
export fn dispatch(state: State, values: [i32; 2]) -> i32 { return values[0]; }
`),
    );
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.abiVersion).toBe('1.2');
    expect(artifact.manifest?.enumDeclarations).toEqual([
      {
        name: 'State',
        exported: true,
        representation: 'i32',
        variants: [
          { name: 'Idle', value: -1 },
          { name: 'Ready', value: 4 },
        ],
      },
    ]);
    expect(artifact.manifest?.exports[0]).toMatchObject({
      name: 'dispatch',
      parameters: [
        { name: 'state', type: 'i32', reference: 'State' },
        { name: 'values', type: 'i32', reference: 'Array', arguments: [{ name: 'i32' }], length: 2 },
      ],
    });
    expect(WebAssembly.Module.exports(new WebAssembly.Module(artifact.wasm!))).toEqual([
      { name: 'dispatch', kind: 'function' },
      { name: 'memory', kind: 'memory' },
      { name: 'fws_alloc', kind: 'function' },
      { name: 'fws_dealloc', kind: 'function' },
      { name: 'fws_realloc', kind: 'function' },
      { name: 'fws_reset', kind: 'function' },
    ]);
    expect(artifact.declarations).toContain('export type State = typeof State[keyof typeof State];');
    expect(artifact.declarations).toContain('values: ArrayLike<number>');

    const deallocations: Array<[number, number]> = [];
    const generated = await import(
      `data:text/javascript,${encodeURIComponent(
        artifact.esmSource.replaceAll(
          /wasmExports\.fws_dealloc\(([^,]+),\s*([^\)]+)\)/gu,
          (_match, pointer: string, size: string) =>
            `(globalThis.__fwsArrayDeallocations ??= []).push([${pointer.trim()}, ${size.trim()}]), wasmExports.fws_dealloc(${pointer.trim()}, ${size.trim()})`,
        ),
      )}`
    );
    (globalThis as unknown as { __fwsArrayDeallocations?: Array<[number, number]> }).__fwsArrayDeallocations =
      deallocations;
    let lengthReads = 0;
    let elementReads = 0;
    const values = {
      get length() {
        lengthReads += 1;
        return 2;
      },
      get 0() {
        elementReads += 1;
        return 10;
      },
      get 1() {
        elementReads += 1;
        return 20;
      },
    };
    for (const exports of [generated.loadSync(), await generated.load()]) {
      expect(exports.dispatch(generated.State.Ready, values)).toBe(10);
      expect(lengthReads).toBe(lengthReads === 1 ? 1 : 2);
      expect(elementReads).toBe(lengthReads === 1 ? 2 : 4);
    }
    const syncExports = generated.loadSync();
    expect(() => syncExports.dispatch(generated.State.Ready, { length: 1, 0: 1.5 })).toThrow(
      'Array<i32> element at index 0 must be a signed 32-bit integer.',
    );
    expect(deallocations).toHaveLength(2);
    expect(deallocations.every(([, size]) => size === 12)).toBe(true);
  });

  it('marshals generated string exports through both loaders', async () => {
    const artifact = compileForgeWebScript(
      input(`
export fn echo(value: string) -> string { return value; }
export fn join(left: string, right: string) -> string { return string_concat(left, right); }
export fn literal() -> string { return "generated"; }
`),
    );
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.esmSource.match(/wasmExports\.fws_alloc\(total\)/gu)).toHaveLength(1);
    const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);

    for (const exports of [generated.loadSync(), await generated.load()]) {
      expect(exports.echo('')).toBe('');
      expect(exports.echo('héllo 🌍')).toBe('héllo 🌍');
      expect(exports.join('left', '右')).toBe('left右');
      expect(exports.literal()).toBe('generated');
    }
  });

  it('adapts string capability imports through both loaders', async () => {
    const artifact = compileForgeWebScript(
      input(
        `import capability "text.transform" as transform(value: string) -> string;
export fn invoke(value: string) -> string { return transform(value); }`,
        ['text.transform'],
      ),
    );
    expect(artifact.diagnostics).toEqual([]);
    const token = '__fwsCapabilitySuccessDeallocs';
    (globalThis as unknown as Record<string, unknown>)[token] = [];
    const capabilitySource = artifact.esmSource.replaceAll(
      /wasmExports\.fws_dealloc\(([^,]+),\s*([^\)]+)\)/gu,
      (_match, pointerExpr: string, sizeExpr: string) => {
        const pointer = pointerExpr.trim();
        const size = sizeExpr.trim();
        return `(globalThis[${JSON.stringify(token)}] ??= []).push([${pointer}, ${size}]), wasmExports.fws_dealloc(${pointer}, ${size})`;
      },
    );
    const generated = await import(`data:text/javascript,${encodeURIComponent(capabilitySource)}`);
    const observed: string[] = [];
    const imports = {
      'text.transform': {
        transform(value: string): string {
          observed.push(value);
          return `${value}!`;
        },
      },
    };

    for (const exports of [generated.loadSync(imports), await generated.load(imports)]) {
      ((globalThis as unknown as Record<string, unknown>)[token] as unknown[]).length = 0;
      expect(exports.invoke('héllo 🌍')).toBe('héllo 🌍!');
      expect((globalThis as unknown as Record<string, unknown>)[token]).toHaveLength(2);
    }
    expect(observed).toEqual(['héllo 🌍', 'héllo 🌍']);
  });

  it('releases packed and host-returned strings when a capability throws', async () => {
    const artifact = compileForgeWebScript(
      input(
        `import capability "text.fail" as fail(value: string) -> string;
export fn invoke(value: string) -> string { return fail(value); }`,
        ['text.fail'],
      ),
    );
    expect(artifact.diagnostics).toEqual([]);
    const token = '__fwsCapabilityDeallocs';
    (globalThis as unknown as Record<string, unknown>)[token] = [];
    const instrumentedEsmSource = artifact.esmSource.replaceAll(
      /wasmExports\.fws_dealloc\(([^,]+),\s*([^\)]+)\)/gu,
      (_match, pointerExpr: string, sizeExpr: string) => {
        const pointer = pointerExpr.trim();
        const size = sizeExpr.trim();
        return `(globalThis[${JSON.stringify(token)}] ??= []).push([${pointer}, ${size}]), wasmExports.fws_dealloc(${pointer}, ${size})`;
      },
    );
    const generated = await import(`data:text/javascript,${encodeURIComponent(instrumentedEsmSource)}`);
    const imports = {
      'text.fail': {
        fail: () => {
          throw new Error('host failure');
        },
      },
    };
    for (const exports of [generated.loadSync(imports), await generated.load(imports)]) {
      const calls = (globalThis as unknown as Record<string, unknown>)[token] as unknown[];
      calls.length = 0;
      expect(() => exports.invoke('temporary')).toThrow('host failure');
      expect(calls).toHaveLength(1);
    }
  });

  it('cleans up temporary string allocations exactly once (dealloc counts)', async () => {
    const artifact = compileForgeWebScript(
      input(`
export fn echo(value: string) -> string { return value; }
export fn join(left: string, right: string) -> string { return string_concat(left, right); }
export fn literal() -> string { return "generated"; }
`),
    );
    expect(artifact.diagnostics).toEqual([]);
    const token = '__fwsDeallocCalls';
    (globalThis as unknown as Record<string, unknown>)[token] = [];

    const instrumentedEsmSource = artifact.esmSource.replaceAll(
      /wasmExports\.fws_dealloc\(([^,]+),\s*([^\)]+)\)/gu,
      (_match, pointerExpr: string, sizeExpr: string) => {
        const pointer = pointerExpr.trim();
        const size = sizeExpr.trim();
        return `(globalThis[${JSON.stringify(token)}] ??= []).push([${pointer}, ${size}]), wasmExports.fws_dealloc(${pointer}, ${size})`;
      },
    );
    expect(instrumentedEsmSource).not.toBe(artifact.esmSource);

    const generated = await import(`data:text/javascript,${encodeURIComponent(instrumentedEsmSource)}`);

    for (const exports of [generated.loadSync(), await generated.load()]) {
      const deallocCalls = (globalThis as unknown as Record<string, unknown>)[token] as Array<[number, number]>;
      deallocCalls.length = 0;
      expect(exports.echo('héllo 🌍')).toBe('héllo 🌍');
      expect(deallocCalls).toHaveLength(1);

      deallocCalls.length = 0;
      expect(exports.echo('')).toBe('');
      // Empty string is a zero-length output that aliases the packed input.
      expect(deallocCalls).toHaveLength(1);

      deallocCalls.length = 0;
      expect(exports.join('left', '右')).toBe('left右');
      // join() returns a concat allocation adjacent to the packed input block.
      // It must be deallocated (output) and the packed input must be deallocated (input): 2 calls.
      expect(deallocCalls).toHaveLength(2);

      deallocCalls.length = 0;
      expect(exports.literal()).toBe('generated');
      // Current runtime tolerates freeing the static output pointer.
      expect(deallocCalls).toHaveLength(1);
    }
  });

  it('releases the guest output before propagating a fatal UTF-8 decode error', async () => {
    const artifact = compileForgeWebScript(input('export fn corrupt(value: string) -> string { return value; }'));
    expect(artifact.diagnostics).toEqual([]);
    const token = '__fwsInvalidUtf8Deallocs';
    (globalThis as unknown as Record<string, unknown>)[token] = [];
    const instrumentedEsmSource = artifact.esmSource
      .replaceAll(
        'const wasmExports = validateExports(result.instance.exports);',
        `const wasmExports = validateExports({
    ...result.instance.exports,
    corrupt: () => {
    const pointer = wasmExports.fws_alloc(1);
    new Uint8Array(wasmExports.memory.buffer, pointer, 1)[0] = 255;
    return [pointer, 1];
    },
  });`,
      )
      .replaceAll(
        'const wasmExports = validateExports(instance.exports);',
        `const wasmExports = validateExports({
    ...instance.exports,
    corrupt: () => {
    const pointer = wasmExports.fws_alloc(1);
    new Uint8Array(wasmExports.memory.buffer, pointer, 1)[0] = 255;
    return [pointer, 1];
    },
  });`,
      )
      .replaceAll(
        /wasmExports\.fws_dealloc\(([^,]+),\s*([^\)]+)\)/gu,
        (_match, pointerExpr: string, sizeExpr: string) => {
          const pointer = pointerExpr.trim();
          const size = sizeExpr.trim();
          return `(globalThis[${JSON.stringify(token)}] ??= []).push([${pointer}, ${size}]), wasmExports.fws_dealloc(${pointer}, ${size})`;
        },
      );
    const generated = await import(`data:text/javascript,${encodeURIComponent(instrumentedEsmSource)}`);

    for (const exports of [generated.loadSync(), await generated.load()]) {
      const deallocCalls = (globalThis as unknown as Record<string, unknown>)[token] as unknown[];
      deallocCalls.length = 0;
      expect(() => exports.corrupt('input')).toThrow();
      expect(deallocCalls).toHaveLength(2);
    }
  });

  it('releases packed string inputs when the guest traps', async () => {
    const artifact = compileForgeWebScript(
      input('export fn trap(value: string) -> i32 { return string_byte_at(value, 1); }'),
    );
    expect(artifact.diagnostics).toEqual([]);
    const token = '__fwsGuestTrapDeallocs';
    (globalThis as unknown as Record<string, unknown>)[token] = [];
    const instrumentedEsmSource = artifact.esmSource.replaceAll(
      /wasmExports\.fws_dealloc\(([^,]+),\s*([^\)]+)\)/gu,
      (_match, pointerExpr: string, sizeExpr: string) => {
        const pointer = pointerExpr.trim();
        const size = sizeExpr.trim();
        return `(globalThis[${JSON.stringify(token)}] ??= []).push([${pointer}, ${size}]), wasmExports.fws_dealloc(${pointer}, ${size})`;
      },
    );
    const generated = await import(`data:text/javascript,${encodeURIComponent(instrumentedEsmSource)}`);

    for (const exports of [generated.loadSync(), await generated.load()]) {
      const deallocCalls = (globalThis as unknown as Record<string, unknown>)[token] as unknown[];
      deallocCalls.length = 0;
      expect(() => exports.trap('a')).toThrow();
      expect(deallocCalls).toHaveLength(1);
    }
  });

  it('adapts bytes-only capability imports as pointer-length tuples', async () => {
    const artifact = compileForgeWebScript(
      input(
        `import capability "codec.bytes" as reverse(value: bytes) -> bytes;
export fn invoke(value: bytes) -> bytes { return reverse(value); }`,
        ['codec.bytes'],
      ),
    );
    expect(artifact.diagnostics).toEqual([]);
    const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);
    const observed: Array<readonly [number, number]> = [];
    const imports = {
      'codec.bytes': {
        reverse(value: readonly [number, number]): readonly [number, number] {
          observed.push(value);
          return value;
        },
      },
    };
    for (const exports of [generated.loadSync(imports), await generated.load(imports)]) {
      expect(exports.invoke([1024, 3])).toEqual([1024, 3]);
    }
    expect(observed).toEqual([
      [1024, 3],
      [1024, 3],
    ]);
  });

  it('keeps generated bytes exports raw and exposes linear memory', async () => {
    const artifact = compileForgeWebScript(input('export fn roundTrip(value: bytes) -> bytes { return value; }'));
    const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);
    const exports = generated.loadSync();
    const bytes = new Uint8Array([1, 2, 3]);
    const pointer = exports.fws_alloc(bytes.byteLength);
    new Uint8Array(exports.memory.buffer).set(bytes, pointer);
    try {
      const result = exports.roundTrip([pointer, bytes.byteLength]);
      expect(result).toEqual([pointer, bytes.byteLength]);
      expect(new Uint8Array(exports.memory.buffer, result[0], result[1])).toEqual(bytes);
    } finally {
      exports.fws_dealloc(pointer, bytes.byteLength);
    }
  });

  it('does not emit string marshalling helpers for scalar-only exports', () => {
    const artifact = compileForgeWebScript(input('export fn answer() -> i32 { return 42; }'));
    expect(artifact.esmSource).not.toContain('new TextEncoder()');
    expect(artifact.esmSource).not.toContain('adaptStringExports(wasmExports)');
  });

  it('returns callable guest exports from both generated loaders', async () => {
    const artifact = compileForgeWebScript(input('export fn answer() -> i32 { return 42; }'));
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.esmSource).toContain('Forge Web Script export');
    expect(artifact.esmSource).toContain('const wasm = Uint8Array.from(');
    expect(artifact.esmSource).toContain('const wasmBase64 =');
    expect(artifact.esmSource).toContain('export function loadSync');
    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {}).exports;
    expect(Object.keys(exports)).toEqual(['answer', 'memory', 'fws_alloc', 'fws_dealloc', 'fws_realloc', 'fws_reset']);
    expect((exports.answer as () => number)()).toBe(42);

    const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);
    const expectedRuntimeExports = ['memory', 'fws_alloc', 'fws_dealloc', 'fws_realloc', 'fws_reset'];
    expect(
      Object.keys(generated.loadSync())
        .filter((name) => expectedRuntimeExports.includes(name))
        .toSorted(),
    ).toEqual(expectedRuntimeExports.toSorted());
    expect(
      Object.keys(await generated.load())
        .filter((name) => expectedRuntimeExports.includes(name))
        .toSorted(),
    ).toEqual(expectedRuntimeExports.toSorted());
    expect((generated.loadSync().answer as () => number)()).toBe(42);
    const originalAtob = globalThis.atob;
    globalThis.atob = () => {
      throw new Error('load should not decode base64');
    };
    try {
      const loaded = await generated.load();
      expect((loaded.answer as () => number)()).toBe(42);
    } finally {
      globalThis.atob = originalAtob;
    }
  });

  it('resets temporary guest allocations before consecutive string exports', async () => {
    const artifact = compileForgeWebScript(
      input('export fn suffix(value: string) -> string { return string_concat(value, "!"); }'),
    );
    expect(artifact.diagnostics).toEqual([]);
    const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);
    const exports = generated.loadSync();
    for (let index = 0; index < 400; index += 1) expect(exports.suffix('x'.repeat(128))).toHaveLength(129);
  });

  it('passes imports through both generated loaders and rejects missing imports', async () => {
    const artifact = compileForgeWebScript(
      input('import capability "clock.now" as now() -> i32; export fn answer() -> i32 { return now(); }', [
        'clock.now',
      ]),
    );
    expect(artifact.diagnostics).toEqual([]);
    const generated = await import(`data:text/javascript,${encodeURIComponent(artifact.esmSource)}`);
    const imports = { 'clock.now': { now: () => 42 } };

    expect((generated.loadSync(imports).answer as () => number)()).toBe(42);
    const loaded = await generated.load(imports);
    expect((loaded.answer as () => number)()).toBe(42);
    expect(
      (generated.loadSync({ ...imports, 'extra.capability': { ignored: () => 0 } }).answer as () => number)(),
    ).toBe(42);
    expect(() => generated.loadSync()).toThrow();
    await expect(generated.load()).rejects.toThrow();
  });

  it('rejects undeclared capabilities before generating a loader', () => {
    const artifact = compileForgeWebScript(
      input('import capability "clock.now" as now() -> i32; export fn answer() -> i32 { return now(); }', []),
    );
    expect(artifact.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'FWS-ABI-002' })]));
    expect(artifact.esmSource).toBe('');
  });

  it('executes all numeric comparison operators for scalar numeric types', () => {
    const operators = [
      ['lt', '<'],
      ['lte', '<='],
      ['eq', '=='],
      ['neq', '!='],
      ['gt', '>'],
      ['gte', '>='],
    ] as const;
    const source = `
${(['i32', 'i64', 'f32', 'f64'] as const)
  .flatMap((type) =>
    operators.map(
      ([name, operator]) =>
        `  export fn ${type}_${name}(left: ${type}, right: ${type}) -> bool { return left ${operator} right; }`,
    ),
  )
  .join('\n')}`;
    const exports = instantiate(source);
    const cases = [
      ['i32', 2, 3],
      ['i64', 2n, 3n],
      ['f32', 2, 3],
      ['f64', 2, 3],
    ] as const;
    for (const [type, left, right] of cases) {
      expect((exports[`${type}_lt`] as (a: number | bigint, b: number | bigint) => number)(left, right)).toBe(1);
      expect((exports[`${type}_lte`] as (a: number | bigint, b: number | bigint) => number)(left, right)).toBe(1);
      expect((exports[`${type}_eq`] as (a: number | bigint, b: number | bigint) => number)(left, right)).toBe(0);
      expect((exports[`${type}_neq`] as (a: number | bigint, b: number | bigint) => number)(left, right)).toBe(1);
      expect((exports[`${type}_gt`] as (a: number | bigint, b: number | bigint) => number)(left, right)).toBe(0);
      expect((exports[`${type}_gte`] as (a: number | bigint, b: number | bigint) => number)(left, right)).toBe(0);
    }
  });

  it('executes integer negation and signed remainder', () => {
    const exports = instantiate(`
  export fn negate32(value: i32) -> i32 { return -value; }
  export fn negate64(value: i64) -> i64 { return -value; }
  export fn remainder32(value: i32, divisor: i32) -> i32 { return value % divisor; }
  export fn remainder64(value: i64, divisor: i64) -> i64 { return value % divisor; }
`);
    expect((exports.negate32 as (value: number) => number)(7)).toBe(-7);
    expect((exports.negate64 as (value: bigint) => bigint)(7n)).toBe(-7n);
    expect((exports.remainder32 as (value: number, divisor: number) => number)(-7, 3)).toBe(-1);
    expect((exports.remainder64 as (value: bigint, divisor: bigint) => bigint)(-7n, 3n)).toBe(-1n);
  });

  it('does not emit an artifact when diagnostics are present', () => {
    const artifact = compileForgeWebScript(input('export fn f() -> i32 { return true; }'));
    expect(artifact.wasm).toBeUndefined();
    expect(artifact.esmSource).toBe('');
    expect(artifact.diagnostics.map((diagnostic) => diagnostic.code)).toContain('FWS-TYPE-005');
  });

  it('compiles iterator functions with export metadata and JS adapter wiring', () => {
    const source = `export iter fn values(source: Iterator<i32>) -> Iterator<i32> {
  loop next = source.next() { yield next; }
}
export iter fn one() -> Iterator<i32> { yield 1; }`;
    const artifact = compileForgeWebScript(input(source));
    expect(artifact.diagnostics.map(({ code, message }) => `${code}: ${message}`)).toEqual([]);
    expect(artifact.diagnostics.some(({ code }) => code === 'FWS-EMIT-001')).toBe(false);
    expect(artifact.wasm).toBeInstanceOf(Uint8Array);
    expect(WebAssembly.validate(artifact.wasm!)).toBe(true);
    expect(artifact.iteratorExports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'values', nextFunction: 'values.next', elementType: 'i32' }),
        expect.objectContaining({ name: 'one', nextFunction: 'one.next', elementType: 'i32' }),
      ]),
    );
    expect(artifact.esmSource).toContain('adaptIterator');
    expect(artifact.esmSource).toContain('"name":"values"');
    expect(artifact.esmSource).toContain('"nextFunction":"values.next"');
    expect(artifact.wat).toContain(';; iterator-export: values next=values.next');

    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), {}).exports as Record<
      string,
      CallableFunction
    >;
    expect(typeof exports.values).toBe('function');
    expect(typeof exports['values.next']).toBe('function');
    expect(exports.one()).toBe(0);
    expect(exports['one.next'](0)).toBe(1n);
    expect(exports['one.next'](1)).toBe(4_294_967_296n);
  });

  it('records the selected target profile in the ABI manifest', () => {
    const artifact = compileForgeWebScript({
      ...input('export fn answer() -> i32 { return 42; }'),
      targetFeatures: { memory64: true },
    });

    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest?.targetFeatures).toEqual({ memory64: true });
  });

  it('preserves declared source imports and omits linkedExports for single-file compilation', () => {
    const artifact = compileForgeWebScript(
      input('import "./math.fws" as math; export fn answer() -> i32 { return 42; }'),
    );
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.manifest).toBeDefined();
    expect(artifact.manifest!.sourceImports).toEqual([{ source: './math.fws', alias: 'math' }]);
    expect(Object.prototype.hasOwnProperty.call(artifact.manifest!, 'linkedExports')).toBe(false);
  });

  it('tracks service cache hits and invalidation, then rejects use after disposal', () => {
    const service = createForgeWebScriptCompilerService();
    const request = input('export fn f() -> i32 { return 1; }');
    service.compile(request);
    service.compile(request);
    expect(service.report()).toMatchObject({ cacheHits: 1, cacheMisses: 1 });
    service.invalidate(['test.fws']);
    expect(service.report().invalidatedFiles).toEqual(['test.fws']);
    service.compile(request);
    expect(service.report()).toMatchObject({ cacheHits: 1, cacheMisses: 2 });
    service.dispose();
    expect(() => service.compile(request)).toThrow('disposed');
  });

  it('fails the tooling artifact when the bounded self-hosted stage loses parity', () => {
    const service = createForgeWebScriptCompilerService({
      selfHostedRunner: (_input, mode) => ({
        mode,
        lexFingerprint: 1,
        expectedLexFingerprint: 2,
        parity: false,
        steps: 7,
      }),
      selfHostedVmMode: 'jit',
    });
    const artifact = service.compile(input('export fn f() -> i32 { return 1; }'));

    expect(artifact.wasm).toBeUndefined();
    expect(artifact.diagnostics).toMatchObject([{ code: 'FWS-BOOTSTRAP-001', phase: 'lex' }]);
    expect(service.report()).toMatchObject({
      selfHosted: { mode: 'jit', lexFingerprint: 1, expectedLexFingerprint: 2, parity: false },
    });
  });

  it('suppresses output when a later serialized parser stage diverges', () => {
    const service = createForgeWebScriptCompilerService({
      selfHostedRunner: (_input, mode) => ({
        stage: 'lex',
        mode,
        lexFingerprint: 7,
        expectedLexFingerprint: 7,
        parity: true,
        steps: 3,
        stageReports: [
          {
            stage: 'parse',
            mode,
            lexFingerprint: 8,
            expectedLexFingerprint: 8,
            parity: false,
            steps: 2,
            outputHash: 'bad-parse',
            expectedOutputHash: 'good-parse',
          },
        ],
      }),
      selfHostedVmMode: 'interpret',
    });
    const artifact = service.compile(input('export fn f() -> i32 { return 1; }'));

    expect(artifact.wasm).toBeUndefined();
    expect(artifact.diagnostics).toMatchObject([{ code: 'FWS-BOOTSTRAP-001', phase: 'parse' }]);
    expect(service.report().selfHostedStages).toHaveLength(2);
    expect(service.report().selfHostedStages?.[1]).toMatchObject({ stage: 'parse', parity: false });
  });

  it('exposes a checked-in FWS compiler pipeline and a fixed-point seed fingerprint', () => {
    const stages = createForgeWebScriptSelfHostedCompilerSourceManifest();
    expect(stages.map(({ stage }) => stage)).toEqual([
      'lex',
      'parse',
      'check',
      'lower',
      'optimize',
      'link',
      'manifest',
      'emit',
    ]);
    expect(stages.every(({ source }) => source.includes('export fn'))).toBe(true);
    expect(stages.flatMap(({ name, source }) => validateForgeWebScript(source, `${name}.fws`).diagnostics)).toEqual([]);
    const request = {
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'fixed-point.fws',
      compilerVersion: '0.1.0',
    };
    const first = prepareForgeWebScriptSelfHostedCompilation(request);
    const second = prepareForgeWebScriptSelfHostedCompilation(request);
    expect(first.seedFingerprint).toBe(second.seedFingerprint);
    expect(first.expectedLexFingerprint).toBe(second.expectedLexFingerprint);
    expect(first.expectedLexFingerprint).not.toBe(0);
    expect(first.vmModule.functions.some((function_) => function_.name === 'lex_fingerprint')).toBe(true);
    expect(first.vmModule.capabilityImports).toEqual([]);
    expect(first.artifact.wasm).toEqual(second.artifact.wasm);
    expect(first.vmModule.sourceHash).toBe(second.vmModule.sourceHash);
  });
});
