import { describe, expect, it } from 'vitest';

import grammar from './flint.ebnf?raw';

describe('Flint grammar contract', () => {
  it('keeps the lexical and parser entry points checked in', () => {
    for (const production of [
      'source',
      'trivia',
      'identifier',
      'string',
      'operator',
      'import-declaration',
      'function-declaration',
      'type',
      'statement',
      'expression',
      'match-expression',
    ]) {
      expect(grammar).toMatch(new RegExp(String.raw`^${production}\s*=`, 'm'));
    }
  });

  it('records the compatibility diagnostics and longest-match rules', () => {
    expect(grammar).toContain('FLINT-LEX-001');
    expect(grammar).toContain('FLINT-LEX-005');
    expect(grammar).toContain('FLINT-PARSE-052');
    expect(grammar).toContain('longest match');
    expect(grammar).toContain('UTF-16 code-unit offsets');
  });
});
