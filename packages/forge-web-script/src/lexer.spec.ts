import { describe, expect, it } from 'vitest';

import { lexForgeWebScript } from './lexer.ts';

function expectBoundedSpans(source: string): void {
  const result = lexForgeWebScript(source, 'strings.fws');
  for (const token of result.tokens) {
    expect(token.span.start).toBeGreaterThanOrEqual(0);
    expect(token.span.end).toBeLessThanOrEqual(source.length);
  }
  for (const diagnostic of result.diagnostics) {
    expect(diagnostic.span.start).toBeGreaterThanOrEqual(0);
    expect(diagnostic.span.end).toBeLessThanOrEqual(source.length);
  }
}

describe('Forge Web Script string lexing', () => {
  it('accepts every JSON-compatible escape and preserves the token text', () => {
    const source = String.raw`"\\ \" \/ \b \f \n \r \t \u0041"`;
    const result = lexForgeWebScript(source, 'strings.fws');

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens[0]).toMatchObject({ kind: 'string', text: source });
    expect(result.tokens[0]?.span.end).toBe(source.length);
    expectBoundedSpans(source);
  });

  it.each([
    [String.raw`"\q"`, 'FWS-LEX-004'],
    [String.raw`"\u12z4"`, 'FWS-LEX-004'],
  ])('rejects invalid escape syntax: %s', (source, code) => {
    const result = lexForgeWebScript(source, 'strings.fws');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code }));
    expectBoundedSpans(source);
  });

  it('rejects raw line terminators inside strings', () => {
    const source = '"line\ntext"';
    const result = lexForgeWebScript(source, 'strings.fws');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FWS-LEX-005' }));
    expectBoundedSpans(source);
  });

  it('reports unterminated strings without exceeding the source bounds', () => {
    const source = '"unterminated';
    const result = lexForgeWebScript(source, 'strings.fws');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FWS-LEX-001' }));
    expectBoundedSpans(source);
  });

  it('handles a trailing backslash without exceeding the source bounds', () => {
    const source = '"trailing' + '\\';
    const result = lexForgeWebScript(source, 'strings.fws');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'FWS-LEX-001' }));
    expect(result.tokens[0]?.span.end).toBe(source.length);
    expectBoundedSpans(source);
  });
});