import { describe, expect, it } from 'vitest';

import { compileForgeWebScript } from './compiler.ts';
import { lowerForgeWebScriptToIr } from './ir.ts';
import { optimizeForgeWebScriptIr } from './optimizer.ts';
import { parseForgeWebScript } from './parser.ts';
import { checkForgeWebScript } from './type-checker.ts';

const source = `export fn calculate() -> i32 {
  let base: i32 = 2 + 3;
  if false { return 99; }
  return base * 1;
}`;

function compile(optimization: 'debug' | 'release') {
  return compileForgeWebScript({ source, fileName: 'optimizer.fws', compilerVersion: '0.1.0', optimization });
}

describe('Forge Web Script typed IR optimizer', () => {
  it('keeps debug and release execution equivalent', () => {
    const debug = compile('debug');
    const release = compile('release');
    expect(debug.diagnostics).toEqual([]);
    expect(release.diagnostics).toEqual([]);
    const debugExports = new WebAssembly.Instance(new WebAssembly.Module(debug.wasm!), {}).exports;
    const releaseExports = new WebAssembly.Instance(new WebAssembly.Module(release.wasm!), {}).exports;
    expect((debugExports.calculate as () => number)()).toBe(5);
    expect((releaseExports.calculate as () => number)()).toBe(5);
    expect(debug.wat).toContain('(module');
    expect(debug.wat).toContain('func $calculate');
    expect(debug.wat).toContain('source: optimizer.fws');
    expect(release.optimizationReport).toMatchObject({ mode: 'release', constantsFolded: 2, statementsRemoved: 2 });
    expect(debug.optimizationReport).toMatchObject({ mode: 'debug', passes: [] });
  });

  it('produces deterministic optimized IR and prunes unreachable functions', () => {
    const parsed = parseForgeWebScript(
      'export fn used() -> i32 { return helper(); } fn helper() -> i32 { return 7; } fn dead() -> i32 { return 8; }',
      'ir.fws',
    );
    expect(parsed.module).toBeDefined();
    const result = optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(parsed.module!), 'release');
    const repeated = optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(parsed.module!), 'release');
    expect(result.ir).toEqual(repeated.ir);
    expect(result.report.functionsRemoved).toBe(1);
    expect(result.report.reachableFunctions).toEqual(['helper', 'used']);
  });

  it('correctly propagates folded constants into nested conditional branches', () => {
    const source = `export fn f(cond: bool) -> i32 {
      let x: i32 = 5;
      if cond { return x; }
      return 0;
    }`;
    const debug = compileForgeWebScript({
      source,
      fileName: 'nested.fws',
      compilerVersion: '0.1.0',
      optimization: 'debug',
    });
    const release = compileForgeWebScript({
      source,
      fileName: 'nested.fws',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });

    expect(debug.diagnostics).toEqual([]);
    expect(release.diagnostics).toEqual([]);

    const debugExports = new WebAssembly.Instance(new WebAssembly.Module(debug.wasm!), {}).exports as unknown as {
      f: (cond: boolean) => number;
    };
    const releaseExports = new WebAssembly.Instance(new WebAssembly.Module(release.wasm!), {}).exports as unknown as {
      f: (cond: boolean) => number;
    };

    expect(debugExports.f(true)).toBe(5);
    expect(releaseExports.f(true)).toBe(5);
  });

  it('correctly propagates folded constants into inlined branches', () => {
    const source = `export fn f() -> i32 {
      let x: i32 = 5;
      if true { return x; }
      return 0;
    }`;
    const debug = compileForgeWebScript({
      source,
      fileName: 'inlined.fws',
      compilerVersion: '0.1.0',
      optimization: 'debug',
    });
    const release = compileForgeWebScript({
      source,
      fileName: 'inlined.fws',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });

    expect(debug.diagnostics).toEqual([]);
    expect(release.diagnostics).toEqual([]);

    const debugExports = new WebAssembly.Instance(new WebAssembly.Module(debug.wasm!), {}).exports as unknown as {
      f: () => number;
    };
    const releaseExports = new WebAssembly.Instance(new WebAssembly.Module(release.wasm!), {}).exports as unknown as {
      f: () => number;
    };

    expect(debugExports.f()).toBe(5);
    expect(releaseExports.f()).toBe(5);
  });

  it('represents iterator suspension points without imperative IR nodes', () => {
    const parsed = parseForgeWebScript(
      `export iter fn values(source: Iterator<i32>) -> Iterator<i32> {
        loop next = source.next() { yield next; }
      }`,
      'iterator-ir.fws',
    );
    expect(parsed.diagnostics).toEqual([]);
    const result = optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(parsed.module!), 'release');
    const loop = result.ir.functions[0]?.body[0];
    expect(loop?.kind).toBe('iterator-loop');
    if (loop?.kind !== 'iterator-loop') return;
    expect(loop.state).toBe(0);
    expect(loop.suspensionSpan).toEqual(loop.span);
    expect(result.report.skippedTransformations).toContainEqual(
      expect.objectContaining({ transformation: 'iterator-unroll', status: 'skipped' }),
    );
  });

  it('unrolls a proven empty iterator while preserving its zero-yield behavior', () => {
    const parsed = parseForgeWebScript(
      `export iter fn empty() -> Iterator<i32> {}
       export iter fn consume() -> Iterator<i32> {
         loop value = empty() { yield value; }
       }`,
      'bounded-empty-iterator.fws',
    );
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    expect(checkForgeWebScript(parsed.module!, 'bounded-empty-iterator.fws').diagnostics).toEqual([]);

    const input = lowerForgeWebScriptToIr(parsed.module!);
    const inputLoop = input.functions.find(({ name }) => name === 'consume')?.body[0];
    expect(inputLoop).toMatchObject({ kind: 'iterator-loop', boundedLength: 0 });

    const debug = optimizeForgeWebScriptIr(input, 'debug');
    const release = optimizeForgeWebScriptIr(input, 'release');
    expect(debug.ir.functions.find(({ name }) => name === 'consume')?.body).toHaveLength(1);
    expect(release.ir.functions.find(({ name }) => name === 'consume')?.body).toHaveLength(0);
    expect(release.report.iteratorUnrolled).toBe(1);
    expect(release.report.appliedTransformations).toContainEqual(
      expect.objectContaining({ transformation: 'iterator-unroll', status: 'applied', reason: expect.stringContaining('zero-length') }),
    );
  });

  it('carries a positive finite iterator bound but skips unsafe resumable unrolling', () => {
    const parsed = parseForgeWebScript(
      `export iter fn one() -> Iterator<i32> { yield 1; }
       export iter fn consume() -> Iterator<i32> {
         loop value = one() { yield value; }
       }`,
      'bounded-one-iterator.fws',
    );
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    expect(checkForgeWebScript(parsed.module!, 'bounded-one-iterator.fws').diagnostics).toEqual([]);

    const result = optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(parsed.module!), 'release');
    const loop = result.ir.functions.find(({ name }) => name === 'consume')?.body[0];
    expect(loop).toMatchObject({ kind: 'iterator-loop', boundedLength: 1 });
    expect(result.report.iteratorUnrolled).toBe(0);
    expect(result.report.skippedTransformations).toContainEqual(
      expect.objectContaining({
        transformation: 'iterator-unroll',
        status: 'skipped',
        reason: expect.stringContaining('proven bound'),
      }),
    );
  });

  it('honors noinline while retaining tail-position metadata', () => {
    const parsed = parseForgeWebScript(
      'export fn used() -> i32 { return helper(); } noinline fn helper() -> i32 { return 7; }',
      'noinline.fws',
    );
    const result = optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(parsed.module!), 'release');
    const returnStatement = result.ir.functions.find(({ name }) => name === 'used')?.body[0];
    expect(returnStatement?.kind).toBe('return');
    if (returnStatement?.kind !== 'return' || returnStatement.value?.kind !== 'call') return;
    expect(returnStatement.value.tailPosition).toBe(true);
    expect(result.report.functionsInlined).toBe(0);
    expect(result.report.tailCallsDetected).toBe(1);
    expect(result.report.skippedTransformations).toContainEqual(
      expect.objectContaining({ transformation: 'inline', reason: expect.stringContaining('noinline') }),
    );
  });

  it('does not inline host-bound calls or change their observable ordering', () => {
    const parsed = parseForgeWebScript(
      `import capability "clock.now" as now() -> i64;
       export fn read() -> i64 { return now(); }`,
      'host-order.fws',
    );
    const result = optimizeForgeWebScriptIr(lowerForgeWebScriptToIr(parsed.module!), 'release');
    expect(result.report.functionsInlined).toBe(0);
    expect(result.ir.functions[0]?.body[0]).toMatchObject({
      kind: 'return',
      value: { kind: 'call', callee: 'now' },
    });
    expect(result.report.pureFunctions).not.toContain('read');
  });
});
