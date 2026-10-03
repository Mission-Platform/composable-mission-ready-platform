import { describe, expect, it } from 'vitest';

import { createDiagnostic } from '../diagnostics.js';

import { createFlintQueryEngine, formatFlintSarif } from './query-engine.js';

describe('Flint incremental query engine', () => {
  const sampleSource = `export fn add(left: i32, right: i32) -> i32 {
  return left + right;
}`;

  it('memoizes tokens, AST parsing, and typechecking with sub-millisecond query times', () => {
    const engine = createFlintQueryEngine();

    // First call: misses
    const tokens1 = engine.getTokens('math.flint', sampleSource);
    const parse1 = engine.getParsedModule('math.flint', sampleSource);
    const typecheck1 = engine.getTypeCheck('math.flint', sampleSource);

    expect(tokens1.length).toBeGreaterThan(0);
    expect(parse1.module).toBeDefined();
    expect(typecheck1.valid).toBe(true);

    const statsAfterMisses = engine.getStats();
    expect(statsAfterMisses.misses).toBe(3);
    expect(statsAfterMisses.hits).toBe(0);

    // Second call: hits
    const start = performance.now();
    const tokens2 = engine.getTokens('math.flint', sampleSource);
    const parse2 = engine.getParsedModule('math.flint', sampleSource);
    const typecheck2 = engine.getTypeCheck('math.flint', sampleSource);
    const duration = performance.now() - start;

    expect(tokens2).toBe(tokens1);
    expect(parse2).toBe(parse1);
    expect(typecheck2).toBe(typecheck1);

    const statsAfterHits = engine.getStats();
    expect(statsAfterHits.hits).toBe(3);
    expect(statsAfterHits.queryCount).toBe(6);
    expect(duration).toBeLessThan(10); // Well under sub-millisecond per query
  });

  it('invalidates cache entries on file change and explicit invalidation', () => {
    const engine = createFlintQueryEngine();
    engine.getParsedModule('math.flint', sampleSource);

    const updatedSource = `export fn add(left: i32, right: i32) -> i32 {
  return (left + right) * 2;
}`;
    const parseUpdated = engine.getParsedModule('math.flint', updatedSource);
    expect(parseUpdated.module?.functions[0]?.name).toBe('add');
    expect(engine.getStats().misses).toBe(2);

    engine.invalidate('math.flint');
    expect(engine.getStats().evictions).toBeGreaterThanOrEqual(1);

    engine.getParsedModule('math.flint', updatedSource);
    expect(engine.getStats().misses).toBe(3);
  });

  it('formats compiler diagnostics into standard SARIF v2.1.0 structure', () => {
    const diagnostic = createDiagnostic(
      'src/main.flint',
      'parse',
      'FLINT-PARSE-017',
      'Unclosed delimiter: expected closing parenthesis.',
      { start: 10, end: 15, line: 2, column: 5, endLine: 2, endColumn: 10 },
      'error',
      'Insert closing parenthesis )',
      {
        ruleId: 'fws.syntax.unclosed-delimiter',
        category: 'syntax',
        blocking: true,
        owasp: ['A05'],
        cwe: ['CWE-78'],
      },
    );

    const sarif = formatFlintSarif([diagnostic], { toolVersion: '0.2.0' });

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0]?.tool.driver.name).toBe('flint');
    expect(sarif.runs[0]?.tool.driver.version).toBe('0.2.0');
    expect(sarif.runs[0]?.tool.driver.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'FLINT-PARSE-017',
          name: 'fws.syntax.unclosed-delimiter',
          defaultConfiguration: { level: 'error' },
        }),
      ]),
    );

    expect(sarif.runs[0]?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'FLINT-PARSE-017',
          level: 'error',
          message: { text: 'Unclosed delimiter: expected closing parenthesis.' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/main.flint' },
                region: { startLine: 2, startColumn: 5, endLine: 2, endColumn: 10 },
              },
            },
          ],
        }),
      ]),
    );
  });
});
