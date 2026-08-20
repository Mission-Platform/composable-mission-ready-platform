import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkForgeWebScript, parseForgeWebScript } from '@mission-platform/forge-web-script';

import { assertForgeWebScriptDiagnostic, assertForgeWebScriptNoDiagnostics } from './diagnostics.js';
import {
  createForgeWebScriptTestHarness,
  ForgeWebScriptTestHarnessError,
  ForgeWebScriptTestHarnessDisposedError,
  forgeWebScriptFixtureName,
} from './harness.js';

const harnesses: ReturnType<typeof createForgeWebScriptTestHarness>[] = [];

afterEach(() => {
  for (const harness of harnesses.splice(0)) harness.dispose();
});

describe('Forge Web Script test harness boundary', () => {
  it('resolves shared fixtures relative to the configured fixture root', () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const fixture = harness.resolveFixture('valid/scalar.fws');
    expect(fs.existsSync(fixture)).toBe(true);
    expect(harness.fixtureName('valid/scalar.fws')).toBe('valid-scalar');
  });

  it('keeps fixture names deterministic for equivalent paths', () => {
    const fixtureRoot = path.join('/workspace', 'fixtures');

    expect(forgeWebScriptFixtureName('graphs/entry.fws', fixtureRoot)).toBe('graphs-entry');
    expect(forgeWebScriptFixtureName(path.join(fixtureRoot, 'graphs/entry.fws'), fixtureRoot)).toBe('graphs-entry');
  });

  it('rejects operations after disposal with a typed lifecycle error', () => {
    const harness = createForgeWebScriptTestHarness();
    harness.dispose();

    expect(harness.isDisposed).toBe(true);
    expect(() => harness.resolveFixture('valid/scalar.fws')).toThrow(ForgeWebScriptTestHarnessDisposedError);
    expect(() => harness.fixtureName('valid/scalar.fws')).toThrow('has been disposed');
    expect(() => harness.dispose()).not.toThrow();
  });

  it('compiles and executes scalar exports through both Wasm loading paths', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const result = await harness.compile('valid/scalar.fws');
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.artifact.wasm).toBeInstanceOf(Uint8Array);
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual(['answer']);
    expect(result.artifact.contentHash).toMatch(/^[0-9a-f]{8}$/u);

    const loaded = await harness.load<{ answer: () => number }>('valid/scalar.fws');
    expect(loaded.answer()).toBe(42);
    expect(harness.loadSync<{ answer: () => number }>('valid/scalar.fws').answer()).toBe(42);
  });

  it('compiles collection and enum fixtures through the shared Wasm boundary', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const result = await harness.compile('valid/collections.fws');
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
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
    }>('valid/collections.fws');
    expect(loaded.dispatch(-1)).toBe(10);
    expect(loaded.dispatch(0)).toBe(20);
    expect(loaded.dispatch(99)).toBe(-1);
    expect(loaded.arrayValue()).toBe(2);
    expect(loaded.vectorValue()).toBe(5);
    expect(harness.loadSync<{ dispatch: (state: number) => number }>('valid/collections.fws').dispatch(7)).toBe(-1);
  });

  it('type-checks the shared aggregate fixture through the frontend contract', () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const fileName = harness.resolveFixture('valid/aggregates.fws');
    const source = fs.readFileSync(fileName, 'utf8');
    const parsed = parseForgeWebScript(source, fileName);
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    expect(checkForgeWebScript(parsed.module!, fileName).diagnostics).toEqual([]);
  });

  it('keeps collection diagnostics stable for shared rejected fixtures', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const result = await harness.inspect('diagnostics/collections.fws');
    expect(result.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'FWS-TYPE-003',
        'FWS-TYPE-005',
        'FWS-TYPE-014',
        'FWS-TYPE-002',
        'FWS-TYPE-021',
        'FWS-TYPE-024',
        'FWS-ABI-004',
      ]),
    );
    await expect(harness.load('diagnostics/collections.fws')).rejects.toMatchObject({ code: 'FWS-HARNESS-003' });
  });

  it('compiles inline source synchronously with the same artifact contract', () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const result = harness.compileSource('export fn inlineValue() -> i32 { return 7; }', 'inline-value.fws');
    assertForgeWebScriptNoDiagnostics(result.diagnostics);
    expect(result.fileName).toBe('inline-value.fws');
    expect(result.artifact.manifest?.exports.map(({ name }) => name)).toEqual(['inlineValue']);
    expect(result.sourceMap).toContain('inline-value.fws');
  });

  it('injects only explicitly declared capability imports and reports missing imports', async () => {
    const harness = createForgeWebScriptTestHarness({ requestedCapabilities: ['clock.now'] });
    harnesses.push(harness);

    const loaded = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
      'clock.now': { now: () => 123n },
    });
    expect(loaded.current()).toBe(123n);
    await expect(harness.load('capabilities/clock-now.fws')).rejects.toMatchObject({ code: 'FWS-HARNESS-007' });

    const noCapabilityHarness = createForgeWebScriptTestHarness();
    harnesses.push(noCapabilityHarness);
    await expect(
      noCapabilityHarness.load('valid/scalar.fws', { 'clock.now': { now: () => 1n } }),
    ).rejects.toMatchObject({ code: 'FWS-HARNESS-006' });
  });

  it('preserves stable diagnostic records for rejected fixtures', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const result = await harness.inspect('diagnostics/invalid-type.fws');
    const diagnostic = assertForgeWebScriptDiagnostic(result.diagnostics, {
      code: 'FWS-TYPE-005',
      phase: 'type-check',
      line: 2,
      column: 5,
    });
    expect(diagnostic.fileName).toBe(harness.resolveFixture('diagnostics/invalid-type.fws'));
    expect(diagnostic.span.endLine).toBe(2);
    expect(diagnostic.span.endColumn).toBe(17);
    await expect(harness.load('diagnostics/invalid-type.fws')).rejects.toMatchObject({ code: 'FWS-HARNESS-003' });
  });

  it('compiles linked graphs with deterministic metadata and hashes', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const first = await harness.compileGraph('graphs/entry.fws');
    const second = await harness.compileGraph('graphs/entry.fws');
    assertForgeWebScriptNoDiagnostics(first.diagnostics);
    expect(first.graph?.modules).toHaveLength(2);
    expect(first.graph?.edges).toHaveLength(1);
    expect(first.artifact.graphHash).toBeDefined();
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.artifact.graphHash).toBe(second.artifact.graphHash);
    expect(first.artifact.declarations).toContain('answer');
  });

  it.each(['interpret', 'jit', 'aot'] as const)('reports self-hosted parity and mode metadata in %s', async (mode) => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const report = await harness.checkVmParity('self-hosted/parity.fws', mode);
    expect(report.mode).toBe(mode);
    expect(report.parity).toBe(true);
    expect(report.lexFingerprint).toBe(report.expectedLexFingerprint);
    expect(report.steps).toBeGreaterThan(2);
    if (mode === 'aot') expect(report.aot?.reproducibilityHash).toBeDefined();
    else expect(report.aot).toBeUndefined();
  });

  it('reports self-hosted parity for the shared enum and collection fixture', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    const report = await harness.checkVmParity('valid/collections.fws', 'aot');
    expect(report.parity).toBe(true);
    expect(report.aot?.reproducibilityHash).toBeDefined();
  });

  it('includes execution mode and artifact metadata in Wasm failures', async () => {
    const harness = createForgeWebScriptTestHarness();
    harnesses.push(harness);

    try {
      await harness.load('valid/scalar.fws', { unexpected: {} });
      expect.fail('Expected undeclared capability failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ForgeWebScriptTestHarnessError);
      expect(error).toMatchObject({ code: 'FWS-HARNESS-006' });
      expect((error as Error).message).toContain('mode=async');
      expect((error as Error).message).toContain('artifact=');
    }
  });
});
