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
    expect(result.unoptimizedSonIr?.schemaVersion).toBe('1.0');
    expect(result.sonIr?.nodes.length).toBeGreaterThan(0);
    expect(result.sonIr?.graphHash).toMatch(/^[0-9a-f]{8}$/);
    expect(result.sonOptimizationReport?.passes.map(({ name }) => name)).toEqual([
      'constant-propagation',
      'copy-propagation',
      'global-value-numbering',
      'cfg-simplification',
      'dead-node-elimination',
      'reachability-pruning',
      'purity-analysis',
      'inlining',
      'escape-analysis',
      'switch-density',
      'bounds-proof',
    ]);

    // The SoN graph is built from the unoptimized IR (which still has the
    // `40 + 2` binary node), so it starts out larger than the optimized graph.
    expect(result.unoptimizedSonIr!.nodes.length).toBeGreaterThan(result.sonIr!.nodes.length);
    // Constant-propagation genuinely runs (not a no-op) and folds `40 + 2` to `42`.
    const constantPropagation = result.sonOptimizationReport!.passes.find(
      ({ name }) => name === 'constant-propagation',
    );
    expect(constantPropagation?.applied).toBeGreaterThan(0);
    // The backend-facing tree is derived from the optimized SoN, not from the
    // legacy tree-IR optimizer: the folded literal appears directly in the
    // compatibility-lowered `optimizedIr`, proving SoN drives the compiler path.
    expect(result.optimizedIr?.functions[0]?.body[0]).toMatchObject({
      kind: 'return',
      value: { kind: 'literal', value: 42 },
    });

    expect(result.optimizationReport?.mode).toBe('release');
    expect(result.abi?.exports).toEqual([{ name: 'answer', parameters: [], result: 'i32' }]);
    expect(result.sourceFiles).toEqual(['/workspace/answer.fws']);
    expect(result.links.linkedModules).toEqual([]);
  });

  it('prunes an unreferenced private function via SoN reachability and reflects it in optimizedIr', () => {
    const result = prepareForgeWebScriptFrontend({
      source:
        'export fn used() -> i32 { return helper(); } fn helper() -> i32 { return 7; } fn dead() -> i32 { return 8; }',
      fileName: '/workspace/reachability.fws',
      compilerVersion: '0.1.0',
      optimization: 'release',
      requireExports: false,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.optimizedIr?.functions.map(({ name }) => name).toSorted()).toEqual(['helper', 'used']);
    expect(result.sonIr?.functions.map(({ name }) => name).toSorted()).toEqual(['helper', 'used']);
    const reachabilityPruning = result.sonOptimizationReport!.passes.find(
      ({ name }) => name === 'reachability-pruning',
    );
    expect(reachabilityPruning?.applied).toBe(1);
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
    expect(first.sonIr).toEqual(second.sonIr);
  });
});
