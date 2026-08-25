import { describe, expect, it } from 'vitest';

import grammar from './forge-web-script.ebnf?raw';

describe('Forge Web Script grammar contract', () => {
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
      expect(grammar).toMatch(new RegExp(`^${production}\\s*=`, 'm'));
    }
  });

  it('records the compatibility diagnostics and longest-match rules', () => {
    expect(grammar).toContain('FWS-LEX-001');
    expect(grammar).toContain('FWS-LEX-005');
    expect(grammar).toContain('FWS-PARSE-052');
    expect(grammar).toContain('longest match');
    expect(grammar).toContain('UTF-16 code-unit offsets');
  });
});
