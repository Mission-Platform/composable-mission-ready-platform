import { describe, expect, it } from 'vitest';

import { compileFlint } from '../compiler.ts';
import { createFlintAbiManifest } from '../manifest.ts';
import { validateFlint } from '../validate.ts';

import { acceptedBootstrapFixtures, rejectedBootstrapFixtures } from './bootstrap.ts';

describe('Forge Web Script bootstrap conformance fixtures', () => {
  it.each(acceptedBootstrapFixtures)('accepts $name', (fixture) => {
    const result = validateFlint(fixture.source, `${fixture.name}.flint`, {
      requestedCapabilities: fixture.requestedCapabilities,
    });
    expect(result.valid, result.diagnostics.map((diagnostic) => diagnostic.message).join('\n')).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it.each(acceptedBootstrapFixtures)('compiles and executes $name', (fixture) => {
    const artifact = compileFlint({
      source: fixture.source,
      fileName: `${fixture.name}.flint`,
      compilerVersion: '0.1.0',
      requestedCapabilities: fixture.requestedCapabilities,
    });
    expect(artifact.diagnostics).toEqual([]);
    expect(artifact.wasm).toBeDefined();
    expect(WebAssembly.validate(artifact.wasm!)).toBe(true);
    const imports = fixture.requestedCapabilities?.includes('clock.now') ? { 'clock.now': { now: () => 42n } } : {};
    const exports = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), imports).exports;
    if (fixture.name === 'pure arithmetic export')
      expect((exports.add as (a: number, b: number) => number)(2, 3)).toBe(5);
    if (fixture.name === 'explicit capability import') expect((exports.current as () => bigint)()).toBe(42n);
    if (fixture.name === 'control flow and local value') {
      const absolute = exports.absolute as (value: number) => number;
      expect(absolute(-7)).toBe(7);
      expect(absolute(4)).toBe(4);
    }
  });

  it.each(rejectedBootstrapFixtures)('rejects $name with stable diagnostics', (fixture) => {
    const result = validateFlint(fixture.source, `${fixture.name}.flint`, {
      requestedCapabilities: fixture.requestedCapabilities,
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(fixture.diagnosticCodes ?? []),
    );
    expect(result.diagnostics.every((diagnostic) => diagnostic.fileName.endsWith('.flint'))).toBe(true);
    expect(result.diagnostics.every((diagnostic) => diagnostic.span.start <= diagnostic.span.end)).toBe(true);
  });

  it('creates a deterministic ABI manifest from a valid module', () => {
    const result = validateFlint(acceptedBootstrapFixtures[1].source, 'clocked.flint', {
      requestedCapabilities: ['clock.now'],
    });
    expect(result.module).toBeDefined();
    expect(createFlintAbiManifest(result.module!)).toMatchObject({
      languageVersion: '1.0',
      abiVersion: '1.2',
      moduleName: 'clocked',
      requiredCapabilities: ['clock.now'],
      exports: [{ name: 'current', result: 'i64' }],
      imports: [{ capability: 'clock.now', alias: 'now' }],
    });
  });

  it('rejects object-oriented declarations through the stable class-free diagnostic', () => {
    const fixture = rejectedBootstrapFixtures.find(({ name }) => name === 'class declaration');
    expect(fixture).toBeDefined();
    const result = validateFlint(fixture!.source, 'class.flint');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('FLINT-PARSE-052');
  });
});
