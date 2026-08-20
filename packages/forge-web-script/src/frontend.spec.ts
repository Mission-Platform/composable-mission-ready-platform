import { describe, expect, it } from 'vitest';

import { prepareForgeWebScriptFrontend } from './frontend.ts';

describe('Forge Web Script frontend/backend boundary', () => {
  it('returns checked IR, optimized IR, and ABI metadata without emitting runtime bytes', () => {
    const result = prepareForgeWebScriptFrontend({
      source: 'export fn answer() -> i32 { return 40 + 2; }',
      fileName: '/workspace/answer.fws',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.module?.kind).toBe('module');
    expect(result.ir?.kind).toBe('module');
    expect(result.optimizedIr?.kind).toBe('module');
    expect(result.optimizationReport?.mode).toBe('release');
    expect(result.abi?.exports).toEqual([{ name: 'answer', parameters: [], result: 'i32' }]);
    expect(result.sourceFiles).toEqual(['/workspace/answer.fws']);
    expect(result.links.linkedModules).toEqual([]);
  });

  it('keeps invalid programs in the diagnostic-only frontend path', () => {
    const result = prepareForgeWebScriptFrontend({
      source: 'export fn broken() -> i32 { return true; }',
      fileName: '/workspace/broken.fws',
      compilerVersion: '0.1.0',
    });

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.optimizedIr).toBeUndefined();
    expect(result.abi).toBeUndefined();
  });

  it('keeps frontend results deterministic for the same input', () => {
    const input = {
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: '/workspace/answer.fws',
      compilerVersion: '0.1.0',
    } as const;

    const first = prepareForgeWebScriptFrontend(input);
    const second = prepareForgeWebScriptFrontend(input);

    expect(first).toEqual(second);
  });
});
