import fs from 'node:fs';
import path from 'node:path';

import { checkFlint, parseFlint } from '@mission-platform/flint';
import { afterEach, describe, expect, it } from 'vitest';

import { assertFlintDiagnostic, assertFlintNoDiagnostics } from './diagnostics.js';
import {
  createFlintTestHarness,
  FlintTestHarnessError,
  FlintTestHarnessDisposedError,
  flintFixtureName,
} from './harness.js';

const harnesses: ReturnType<typeof createFlintTestHarness>[] = [];

afterEach(() => {
  for (const harness of harnesses.splice(0)) harness.dispose();
});

describe('Forge Web Script test harness boundary', () => {
  it('resolves shared fixtures relative to the configured fixture root', () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const fixture = harness.resolveFixture('valid/scalar.flint');
    expect(fs.existsSync(fixture)).toBe(true);
    expect(harness.fixtureName('valid/scalar.flint')).toBe('valid-scalar');
  });

  it('keeps fixture names deterministic for equivalent paths', () => {
    const fixtureRoot = path.join('/workspace', 'fixtures');

    expect(flintFixtureName('graphs/entry.flint', fixtureRoot)).toBe('graphs-entry');
    expect(flintFixtureName(path.join(fixtureRoot, 'graphs/entry.flint'), fixtureRoot)).toBe('graphs-entry');
  });

  it('rejects operations after disposal with a typed lifecycle error', () => {
    const harness = createFlintTestHarness();
    harness.dispose();

    expect(harness.isDisposed).toBe(true);
    expect(() => harness.resolveFixture('valid/scalar.flint')).toThrow(FlintTestHarnessDisposedError);
    expect(() => harness.fixtureName('valid/scalar.flint')).toThrow('has been disposed');
    expect(() => harness.dispose()).not.toThrow();
  });

  it('compiles and executes scalar exports through both Wasm loading paths', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const result = await harness.compile('valid/scalar.flint');
    assertFlintNoDiagnostics(result.diagnostics);
    expect(result.artifact.wasm).toBeInstanceOf(Uint8Array);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual(['answer']);
    expect(result.artifact.contentHash).toMatch(/^[0-9a-f]{8}$/u);

    const loaded = await harness.load<{ answer: () => number }>('valid/scalar.flint');
    expect(loaded.answer()).toBe(42);
    expect(harness.loadSync<{ answer: () => number }>('valid/scalar.flint').answer()).toBe(42);
  });

  it('compiles collection and enum fixtures through the shared Wasm boundary', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const result = await harness.compile('valid/collections.flint');
    assertFlintNoDiagnostics(result.diagnostics);
    expect(result.artifact.wat).toContain('br_table');
    expect(result.artifact.manifest?.enumDeclarations).toEqual([
      {
        name: 'State',
        exported: true,
        representation: 'i32',
        variants: [
          { name: 'Idle', value: -1 },
          { name: 'Ready', value: 0 },
          { name: 'Done', value: 7 },
        ],
      },
    ]);
    expect(result.artifact.manifest?.collectionLayouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Array<i32>[3]', kind: 'array', representation: 'contiguous', length: 3 }),
        expect.objectContaining({ type: 'Vector<i32>', kind: 'vector', representation: 'owned-handle' }),
      ]),
    );

    const loaded = await harness.load<{
      dispatch: (state: number) => number;
      arrayValue: () => number;
      vectorValue: () => number;
    }>('valid/collections.flint');
    expect(loaded.dispatch(-1)).toBe(10);
    expect(loaded.dispatch(0)).toBe(20);
    expect(loaded.dispatch(99)).toBe(-1);
    expect(loaded.arrayValue()).toBe(2);
    expect(loaded.vectorValue()).toBe(5);
    expect(harness.loadSync<{ dispatch: (state: number) => number }>('valid/collections.flint').dispatch(7)).toBe(-1);
  });

  it('type-checks the shared aggregate fixture through the frontend contract', () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const fileName = harness.resolveFixture('valid/aggregates.flint');
    const source = fs.readFileSync(fileName, 'utf8');
    const parsed = parseFlint(source, fileName);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    if (parsed.module === undefined) throw new Error('Expected parsed module to be defined');
    expect(checkFlint(parsed.module, fileName).diagnostics).toEqual([]);
  });

  it('keeps collection diagnostics stable for shared rejected fixtures', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const result = await harness.inspect('diagnostics/collections.flint');
    expect(result.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'FLINT-TYPE-003',
        'FLINT-TYPE-005',
        'FLINT-TYPE-014',
        'FLINT-TYPE-002',
        'FLINT-TYPE-021',
        'FLINT-TYPE-024',
        'FLINT-ABI-004',
      ]),
    );
    await expect(harness.load('diagnostics/collections.flint')).rejects.toMatchObject({ code: 'FLINT-HARNESS-003' });
  });

  it('compiles inline source synchronously with the same artifact contract', () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const result = harness.compileSource('export fn inlineValue() -> i32 { return 7; }', 'inline-value.flint');
    assertFlintNoDiagnostics(result.diagnostics);
    expect(result.fileName).toBe('inline-value.flint');
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual(['inlineValue']);
    expect(result.sourceMap).toContain('inline-value.flint');
  });

  it('injects only explicitly declared capability imports and reports missing imports', async () => {
    const harness = createFlintTestHarness({ requestedCapabilities: ['clock.now'] });
    harnesses.push(harness);

    const loaded = await harness.load<{ current: () => bigint }>('capabilities/clock-now.flint', {
      'clock.now': { now: () => 123n },
    });
    expect(loaded.current()).toBe(123n);
    await expect(harness.load('capabilities/clock-now.flint')).rejects.toMatchObject({ code: 'FLINT-HARNESS-007' });

    const noCapabilityHarness = createFlintTestHarness();
    harnesses.push(noCapabilityHarness);
    await expect(
      noCapabilityHarness.load('valid/scalar.flint', { 'clock.now': { now: () => 1n } }),
    ).rejects.toMatchObject({ code: 'FLINT-HARNESS-006' });
  });

  it('preserves stable diagnostic records for rejected fixtures', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const result = await harness.inspect('diagnostics/invalid-type.flint');
    const diagnostic = assertFlintDiagnostic(result.diagnostics, {
      code: 'FLINT-TYPE-005',
      phase: 'type-check',
      line: 2,
      column: 5,
    });
    expect(diagnostic.fileName).toBe(harness.resolveFixture('diagnostics/invalid-type.flint'));
    expect(diagnostic.span.endLine).toBe(2);
    expect(diagnostic.span.endColumn).toBe(17);
    await expect(harness.load('diagnostics/invalid-type.flint')).rejects.toMatchObject({ code: 'FLINT-HARNESS-003' });
  });

  it('compiles linked graphs with deterministic metadata and hashes', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const first = await harness.compileGraph('graphs/entry.flint');
    const second = await harness.compileGraph('graphs/entry.flint');
    assertFlintNoDiagnostics(first.diagnostics);
    expect(first.graph?.modules).toHaveLength(2);
    expect(first.graph?.edges).toHaveLength(1);
    expect(first.artifact.graphHash).toBeDefined();
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.artifact.graphHash).toBe(second.artifact.graphHash);
    expect(first.artifact.declarations).toContain('answer');
  });

  it.each(['interpret', 'jit', 'aot'] as const)('reports self-hosted parity and mode metadata in %s', async (mode) => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const report = await harness.checkVmParity('self-hosted/parity.flint', mode);
    expect(report.mode).toBe(mode);
    expect(report.parity).toBe(true);
    expect(report.lexFingerprint).toBe(report.expectedLexFingerprint);
    expect(report.steps).toBeGreaterThan(2);
    if (mode === 'aot') expect(report.aot?.reproducibilityHash).toBeDefined();
    else expect(report.aot).toBeUndefined();
  });

  it('reports self-hosted parity for the shared enum and collection fixture', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    const report = await harness.checkVmParity('valid/collections.flint', 'aot');
    expect(report.parity).toBe(true);
    expect(report.aot?.reproducibilityHash).toBeDefined();
  });

  it('includes execution mode and artifact metadata in Wasm failures', async () => {
    const harness = createFlintTestHarness();
    harnesses.push(harness);

    try {
      await harness.load('valid/scalar.flint', { unexpected: {} });
      expect.fail('Expected undeclared capability failure');
    } catch (error) {
      expect(error).toBeInstanceOf(FlintTestHarnessError);
      expect(error).toMatchObject({ code: 'FLINT-HARNESS-006' });
      expect((error as Error).message).toContain('mode=async');
      expect((error as Error).message).toContain('artifact=');
    }
  });
});
