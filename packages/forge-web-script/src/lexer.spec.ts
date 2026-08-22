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

describe('Forge Web Script grammar-directed lexing', () => {
  it('uses longest-match operators and preserves punctuation boundaries', () => {
    const source = '= == ! != - -> | || : :: =>';
    const result = lexForgeWebScript(source, 'operators.fws');

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: 'operator', text: '=' },
      { kind: 'operator', text: '==' },
      { kind: 'operator', text: '!' },
      { kind: 'operator', text: '!=' },
      { kind: 'operator', text: '-' },
      { kind: 'operator', text: '->' },
      { kind: 'punctuation', text: '|' },
      { kind: 'operator', text: '||' },
      { kind: 'punctuation', text: ':' },
      { kind: 'operator', text: '::' },
      { kind: 'operator', text: '=>' },
      { kind: 'eof', text: '' },
    ]);
  });

  it('retains comments while skipping all grammar whitespace', () => {
    const source = '\uFEFFfn\u2003value/* block\r\ncomment */ // line\r\nreturn';
    const result = lexForgeWebScript(source, 'comments.fws');

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: 'keyword', text: 'fn' },
      { kind: 'identifier', text: 'value' },
      { kind: 'comment', text: '/* block\r\ncomment */' },
      { kind: 'comment', text: '// line\r' },
      { kind: 'keyword', text: 'return' },
      { kind: 'eof', text: '' },
    ]);
  });

  it('classifies reserved words without consuming identifier prefixes', () => {
    const source = 'fn fnValue _private value2 true false';
    const result = lexForgeWebScript(source, 'identifiers.fws');

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.slice(0, -1).map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: 'keyword', text: 'fn' },
      { kind: 'identifier', text: 'fnValue' },
      { kind: 'identifier', text: '_private' },
      { kind: 'identifier', text: 'value2' },
      { kind: 'identifier', text: 'true' },
      { kind: 'identifier', text: 'false' },
    ]);
  });

  it('keeps CRLF and UTF-16 source spans stable', () => {
    const source = 'fn value() -> i32 {\r\n  return "🙂";\n}';
    const result = lexForgeWebScript(source, 'spans.fws');
    const returnToken = result.tokens.find((token) => token.text === 'return');
    const stringToken = result.tokens.find((token) => token.kind === 'string');

    expect(result.diagnostics).toEqual([]);
    expect(returnToken?.span).toMatchObject({ start: 23, end: 29, line: 2, column: 3, endLine: 2, endColumn: 9 });
    expect(stringToken?.span).toMatchObject({ start: 30, end: 34, line: 2, column: 10, endLine: 2, endColumn: 14 });
    expectBoundedSpans(source);
  });

  it.each([
    ['/* unterminated', 'FWS-LEX-003'],
    ['@', 'FWS-LEX-002'],
  ])('reports bounded recovery for malformed source: %s', (source, code) => {
    const result = lexForgeWebScript(source, 'recovery.fws');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code }));
    expect(result.tokens.at(-1)).toMatchObject({ kind: 'eof', span: { start: source.length, end: source.length } });
    expectBoundedSpans(source);
  });
});