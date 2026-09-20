import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  computeFlintLexStageFingerprint,
  computeFlintParserStageFingerprint,
  createFlintCompilerService,
  decodeFlintSelfHostedModule,
  decodeFlintSelfHostedTokens,
  lexFlint,
} from '@mission-platform/flint';
import { describe, expect, it } from 'vitest';

import { runFlintSelfHostedCompiler, runFlintSelfHostedLexStage } from './self-hosted.ts';

const input = (source: string) => ({
  source,
  fileName: 'self-hosted.flint',
  compilerVersion: '0.1.0',
});

describe('Forge Web Script self-hosted compiler bootstrap', () => {
  it('executes the lex stage in interpret, JIT, and AOT with seed parity', () => {
    const source = readFileSync(path.join(import.meta.dirname, 'fixtures/self-hosted-parity.flint'), 'utf8');
    const expected = computeFlintLexStageFingerprint(source);
    const runs = (['interpret', 'jit', 'aot'] as const).map((mode) => runFlintSelfHostedCompiler(input(source), mode));

    expect(expected).not.toBe(0);
    expect(runs.every(({ parity }) => parity)).toBe(true);
    expect(runs.map(({ lexFingerprint }) => lexFingerprint)).toEqual([expected, expected, expected]);
    expect(runs.map(({ expectedLexFingerprint }) => expectedLexFingerprint)).toEqual([expected, expected, expected]);
    expect(runs.every(({ steps }) => steps > 2)).toBe(true);
    expect(runs[2]?.aot?.reproducibilityHash).toBeDefined();
    expect(new Set(runs.map(({ artifact }) => artifact.contentHash)).size).toBe(1);
  });

  it('returns validated serialized lex and parser artifacts with source spans', () => {
    const source = 'export fn answer(value: i32) -> i32 { return value + 1; }';
    const run = runFlintSelfHostedCompiler(input(source), 'interpret');
    const lex = run.stages?.[0];
    const parser = run.stages?.[1];
    expect(lex?.stage).toBe('lex');
    expect(parser?.stage).toBe('parse');
    expect(lex?.artifact?.sourceHash).toBe(parser?.artifact?.sourceHash);
    const lexPayload = lex?.artifact?.payload ?? new Uint8Array();
    const parserPayload = parser?.artifact?.payload ?? new Uint8Array();
    const tokens = decodeFlintSelfHostedTokens(lexPayload);
    const module = decodeFlintSelfHostedModule(parserPayload);
    expect(tokens.length).toBeGreaterThan(5);
    expect(tokens.every(({ span }) => span.end >= span.start)).toBe(true);
    expect(module.kind).toBe('module');
    expect(module.functions.map(({ name }) => name)).toContain('answer');
    expect(lex?.outputHash).toBe(lex?.expectedOutputHash);
    expect(parser?.outputHash).toBe(parser?.expectedOutputHash);
    // Parser identity is VM-produced and independent of the lex fingerprint.
    expect(parser?.lexFingerprint).toBe(computeFlintParserStageFingerprint(source));
    expect(parser?.lexFingerprint).not.toBe(lex?.lexFingerprint);
    expect(parser?.expectedLexFingerprint).toBe(computeFlintParserStageFingerprint(source));
  });

  it('detects a deliberately divergent parser VM module and suppresses emission', () => {
    const source = 'export fn answer() -> i32 { return 42; }';
    const diverged = runFlintSelfHostedCompiler(input(source), 'interpret', {
      parserStageVmModuleOptions: { saltXor: 0xde_ad_be_ef },
    });
    expect(diverged.parity).toBe(false);
    expect(diverged.stages?.[0]?.stage).toBe('lex');
    expect(diverged.stages?.[0]?.parity).toBe(true);
    expect(diverged.stages?.[1]?.stage).toBe('parse');
    expect(diverged.stages?.[1]?.parity).toBe(false);
    expect(diverged.stages?.[1]?.lexFingerprint).not.toBe(diverged.stages?.[1]?.expectedLexFingerprint);
    expect(diverged.stages?.[1]?.outputHash).not.toBe(diverged.stages?.[1]?.expectedOutputHash);

    const service = createFlintCompilerService({
      selfHostedRunner: (request, mode) =>
        runFlintSelfHostedLexStage(request, mode, {
          parserStageVmModuleOptions: { saltXor: 0xde_ad_be_ef },
        }),
      selfHostedVmMode: 'interpret',
    });
    const artifact = service.compile(input(source));
    expect(artifact.wasm).toBeUndefined();
    expect(artifact.esmSource).toBe('');
    expect(artifact.diagnostics).toMatchObject([{ code: 'FLINT-BOOTSTRAP-001', phase: 'parse' }]);
    expect(service.report().selfHostedStages?.[1]).toMatchObject({ stage: 'parse', parity: false });
  });

  it.each(['interpret', 'jit', 'aot'] as const)('serializes parser diagnostics in %s mode', (mode) => {
    const run = runFlintSelfHostedCompiler(input('export fn broken( -> i32 {'), mode);
    const parser = run.stages?.[1];
    expect(parser?.stage).toBe('parse');
    expect(parser?.artifact?.diagnosticPayload).toBeDefined();
    expect(parser?.parity).toBe(true);
    expect(run.parity).toBe(true);
  });

  it('derives fingerprints from real source so different inputs diverge', () => {
    const left = runFlintSelfHostedCompiler(input('export fn a() -> i32 { return 1; }'), 'interpret');
    const right = runFlintSelfHostedCompiler(input('export fn b() -> i32 { return 2; }'), 'interpret');

    expect(left.parity).toBe(true);
    expect(right.parity).toBe(true);
    expect(left.lexFingerprint).not.toBe(right.lexFingerprint);
    expect(left.lexFingerprint).toBe(computeFlintLexStageFingerprint('export fn a() -> i32 { return 1; }'));
    expect(right.lexFingerprint).toBe(computeFlintLexStageFingerprint('export fn b() -> i32 { return 2; }'));
  });

  it('keeps class rejection diagnostics on the seed artifact while the VM still lexes the source', () => {
    const source = 'class Compiler { constructor() {} }';
    const runs = (['interpret', 'jit', 'aot'] as const).map((mode) => runFlintSelfHostedCompiler(input(source), mode));

    expect(runs.every(({ parity }) => parity)).toBe(true);
    expect(runs.every(({ artifact }) => artifact.wasm === undefined)).toBe(true);
    expect(runs[0]?.artifact.diagnostics.map(({ code }) => code)).toContain('FLINT-PARSE-052');
    expect(runs.map(({ lexFingerprint }) => lexFingerprint)).toEqual([
      runs[0]?.lexFingerprint,
      runs[0]?.lexFingerprint,
      runs[0]?.lexFingerprint,
    ]);
    expect(runs[0]?.lexFingerprint).toBe(computeFlintLexStageFingerprint(source));
  });

  it('covers keywords, comments, strings, and operators in the VM lex stage', () => {
    const source = `
// bootstrap comment
export fn sample(value: i32) -> bool {
  if value != 0 { return true; }
  return value >= 1 && value <= 3;
}
`;
    const run = runFlintSelfHostedCompiler(input(source), 'jit');
    expect(run.parity).toBe(true);
    expect(run.steps).toBeGreaterThan(50);
    expect(run.lexFingerprint).toBe(computeFlintLexStageFingerprint(source));
  });

  it.each(['interpret', 'jit', 'aot'] as const)('keeps extended grammar tokens serialized in %s mode', (mode) => {
    const source = 'default iter inline noinline value::next[0].field != other => result';
    const expected = lexFlint(source, 'extended-grammar.flint');
    const run = runFlintSelfHostedCompiler(input(source), mode);
    const lex = run.stages?.[0];

    expect(run.parity).toBe(true);
    expect(run.lexFingerprint).toBe(computeFlintLexStageFingerprint(source));
    const lexPayload = lex?.artifact?.payload ?? new Uint8Array();
    expect(decodeFlintSelfHostedTokens(lexPayload)).toEqual(expected.tokens);
    expect(lex?.outputHash).toBe(lex?.expectedOutputHash);
  });

  it.each(['interpret', 'jit', 'aot'] as const)(
    'keeps block comments and comment-like strings in parity in %s mode',
    (mode) => {
      const source = `/**
 * Adds a value.
 * @param value The value.
 */
/* ordinary block comment */
export fn sample(value: i32) -> i32 {
  let text: string = "/* not a comment */ // still a string";
  return value;
}
// trailing line comment`;
      const changedComments = `/** Completely different documentation. */
/* another ordinary block comment */
export fn sample(value: i32) -> i32 {
  let text: string = "/* not a comment */ // still a string";
  return value;
}
// another trailing line comment`;

      const run = runFlintSelfHostedCompiler(input(source), mode);
      expect(run.parity).toBe(true);
      expect(run.lexFingerprint).toBe(computeFlintLexStageFingerprint(source));
      expect(computeFlintLexStageFingerprint(source)).toBe(computeFlintLexStageFingerprint(changedComments));
    },
  );

  it.each(['interpret', 'jit', 'aot'] as const)(
    'keeps unterminated block comments in stable parity in %s mode',
    (mode) => {
      const source = '/* unfinished\nexport fn value() -> i32 { return 1; }';
      const run = runFlintSelfHostedCompiler(input(source), mode);

      expect(run.parity).toBe(true);
      expect(run.lexFingerprint).toBe(computeFlintLexStageFingerprint(source));
      expect(run.artifact.diagnostics.map(({ code }) => code)).toContain('FLINT-LEX-003');
    },
  );

  it('keeps ABI, generated artifacts, hashes, and runtime behavior unchanged for documentation-only edits', () => {
    const undocumented = runFlintSelfHostedCompiler(
      input('export fn answer(value: i32) -> i32 { return value + 1; }'),
      'interpret',
    );
    const documented = runFlintSelfHostedCompiler(
      input('/** Adds one to the value. */ export fn answer(value: i32) -> i32 { return value + 1; }'),
      'interpret',
    );

    expect(documented.artifact.diagnostics).toEqual([]);
    expect(undocumented.artifact.diagnostics).toEqual([]);
    expect(documented.artifact.manifest).toEqual(undocumented.artifact.manifest);
    expect(documented.artifact.wat?.replaceAll(/ ;; source \d+:\d+/gu, '')).toBe(
      undocumented.artifact.wat?.replaceAll(/ ;; source \d+:\d+/gu, ''),
    );
    expect(documented.artifact.wasm).toEqual(undocumented.artifact.wasm);
    expect(documented.artifact.esmSource).toBe(undocumented.artifact.esmSource);
    expect(documented.artifact.contentHash).toBe(undocumented.artifact.contentHash);

    const instantiate = (wasm: Uint8Array | undefined): number => {
      expect(wasm).toBeDefined();
      const exports = new WebAssembly.Instance(new WebAssembly.Module(wasm ?? new Uint8Array()), {}).exports;
      return (exports.answer as (value: number) => number)(4);
    };
    expect(instantiate(documented.artifact.wasm)).toBe(instantiate(undocumented.artifact.wasm));
  });
});
