import { describe, expect, it } from 'vitest';

import { prepareFlintFrontend } from './frontend.ts';
import { lowerFlintToIr } from './ir.ts';
import { parseFlint } from './parser.ts';
import { deserializeFlintSoN, serializeFlintSoN, validateFlintSoN } from './son-cache.ts';
import { buildFlintSoN, optimizeFlintSoN } from './son-ir.ts';

const source = 'export fn answer() -> i32 { let dead: i32 = 1; return 42; }';

function unoptimizedSonFor(fwsSource: string) {
  const parsed = parseFlint(fwsSource, 'son.flint');
  if (parsed.module === undefined) throw new Error('Expected parsed module to be defined');
  const ir = lowerFlintToIr(parsed.module);
  return {
    ir,
    son: buildFlintSoN(ir, { compilerVersion: '0.1.0', sourceHash: 'test', optimization: 'release' }),
  };
}

describe('Forge Web Script SoN IR', () => {
  it('builds a deterministic, validated graph with source spans', () => {
    const first = prepareFlintFrontend({
      source,
      fileName: 'answer.flint',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });
    const second = prepareFlintFrontend({
      source,
      fileName: 'answer.flint',
      compilerVersion: '0.1.0',
      optimization: 'release',
    });
    expect(first.diagnostics).toEqual([]);
    expect(first.sonIr).toBeDefined();
    expect(second.sonIr).toBeDefined();
    if (first.sonIr === undefined || second.sonIr === undefined) throw new Error('Expected SoN IR');
    expect(serializeFlintSoN(first.sonIr)).toBe(serializeFlintSoN(second.sonIr));
    expect(validateFlintSoN(JSON.parse(serializeFlintSoN(first.sonIr)))).toBe(true);
    expect(first.sonIr.nodes.some(({ span }) => span !== undefined)).toBe(true);
    expect(first.sonIr.functions).toEqual([{ name: 'answer', entry: 1, exported: true }]);
  });

  it('is built from the unoptimized IR, not from an already-optimized tree', () => {
    const frontend = prepareFlintFrontend({
      source,
      fileName: 'answer.flint',
      compilerVersion: '0.1.0',
      optimization: 'debug',
    });
    // The unoptimized baseline still contains the dead `let` binding's node;
    // debug mode performs no optimization, so it equals the built graph.
    expect(frontend.unoptimizedSonIr?.nodes.some((node) => node.kind === 'let')).toBe(true);
  });

  it('runs ordered release passes that genuinely transform the graph', () => {
    const { ir, son } = unoptimizedSonFor(
      'export fn f(cond: i32, x: i32) -> i32 { let base: i32 = 2 + 3; let y: i32 = x; if cond == 1 { return y; } return base; }',
    );
    const result = optimizeFlintSoN(son, ir, 'release');
    expect(result.report.passes.map(({ name }) => name)).toEqual([
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
    // `2 + 3` folds to a literal, and `y = x` (a parameter, not a constant) is
    // a genuine identifier-to-identifier copy-propagation.
    const constantPropagation = result.report.passes.find(({ name }) => name === 'constant-propagation');
    const copyPropagation = result.report.passes.find(({ name }) => name === 'copy-propagation');
    expect(constantPropagation?.applied).toBeGreaterThan(0);
    expect(copyPropagation?.applied).toBeGreaterThan(0);
    expect(result.report.nodesAfter).toBeLessThan(result.report.nodesBefore);
    expect(result.module.graphHash).toBe(result.report.graphHashAfter);
    // The lowered compatibility IR reflects the copy: the `if` branch now
    // returns `x` directly instead of reading through `y`.
    const ifStatement = result.ir.functions[0]?.body.find((statement) => statement.kind === 'if');
    expect(ifStatement).toMatchObject({
      kind: 'if',
      consequent: [{ kind: 'return', value: { kind: 'identifier', name: 'x' } }],
    });
  });

  it('deduplicates identical pure subexpressions via graph-native CSE', () => {
    const { ir, son } = unoptimizedSonFor('export fn f(a: i32) -> i32 { return (a + 1) * (a + 1); }');
    const result = optimizeFlintSoN(son, ir, 'release');
    const gvn = result.report.passes.find(({ name }) => name === 'global-value-numbering');
    expect(gvn?.applied).toBeGreaterThan(0);
  });

  it('prunes unreferenced functions from both the graph and the compatibility IR', () => {
    const { ir, son } = unoptimizedSonFor(
      'export fn used() -> i32 { return helper(); } fn helper() -> i32 { return 7; } fn dead() -> i32 { return 8; }',
    );
    const result = optimizeFlintSoN(son, ir, 'release');
    expect(result.module.functions.map(({ name }) => name).toSorted()).toEqual(['helper', 'used']);
    expect(result.ir.functions.map(({ name }) => name).toSorted()).toEqual(['helper', 'used']);
    const reachabilityPruning = result.report.passes.find(({ name }) => name === 'reachability-pruning');
    expect(reachabilityPruning?.applied).toBe(1);
  });

  it('ignores oversized or malformed serialized graphs', () => {
    expect(deserializeFlintSoN('x'.repeat(20_000_000))).toBeUndefined();
    expect(deserializeFlintSoN('{"nodes":[null]}')).toBeUndefined();
  });
});
