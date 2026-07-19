import { describe, expect, it } from 'vitest';

import { compileRegex, RegexSyntaxError } from './compiler.js';
import { fullMatch, prefixMatch, search, test as vmTest } from './reference-vm.js';

// Patterns exercising the syntax subset used by libphonenumber metadata, plus
// a spread of inputs (matching and non-matching). Each pattern is validated by
// comparing the VM against the native JavaScript engine as an oracle.
const PATTERNS: string[] = [
  'abc',
  'a.c',
  'a*b',
  'a+b',
  'a?b',
  'a{2,4}',
  'a{3}',
  'a{2,}',
  '(ab)+',
  '(?:ab)+',
  'a|b|c',
  '(a|b)c',
  '\\d+',
  '\\d{3}',
  '[0-9]{2,3}',
  '[13-689]\\d{9}',
  '[2-9]\\d{2}[2-9]\\d{6}',
  '[0-46-9]',
  '[^0-9]+',
  '\\D',
  '\\w+',
  '\\s',
  '(\\d{3})(\\d{4})',
  '(\\d{3})(\\d{3})(\\d{4})',
  '1(?:800|888)\\d{7}',
  '0[1-9]\\d{8}',
  'a*',
  '',
  '(\\d+)?',
  '[-a-z]+',
  '[a-z-]+',
  '[]a]+',
  '4\\d{8,9}',
];

const INPUTS: string[] = [
  '',
  'a',
  'b',
  'c',
  'ab',
  'abc',
  'aabb',
  'aaaa',
  'abababab',
  '0',
  '00',
  '123',
  '1234',
  '4155552671',
  '14155552671',
  '18005551234',
  '2015550123',
  '06123456',
  '061234567',
  '0612345678',
  '-',
  'a-z',
  'xyz',
  '999999999',
  '9999999999',
];

/** Oracle: JavaScript's engine using the same full-match wrapping we rely on.
 *  Deliberately not using the `u` flag so its class semantics (e.g. a leading
 *  `]` being a literal) match the compiler's. */
function oracleTest(pattern: string, input: string): boolean {
  return new RegExp(`^(?:${pattern})$`).test(input);
}

describe('regex compiler + reference VM', () => {
  it('matches the native engine across the pattern/input matrix (full match)', () => {
    for (const pattern of PATTERNS) {
      const re = compileRegex(pattern);
      for (const input of INPUTS) {
        const got = vmTest(re, input);
        const want = oracleTest(pattern, input);
        expect(got, `pattern=${JSON.stringify(pattern)} input=${JSON.stringify(input)}`).toBe(want);
      }
    }
  });

  it('extracts whole-match capture groups for formatting', () => {
    const re = compileRegex('(\\d{3})(\\d{3})(\\d{4})');
    const caps = fullMatch(re, '4155552671');
    expect(caps).not.toBeNull();
    // slots: [g0.start,g0.end, g1.start,g1.end, g2..., g3...]
    expect(caps).toEqual([0, 10, 0, 3, 3, 6, 6, 10]);
  });

  it('supports alternation with groups', () => {
    const re = compileRegex('(ab|cd)(ef)');
    const caps = fullMatch(re, 'cdef');
    expect(caps).not.toBeNull();
    expect(caps?.slice(2)).toEqual([0, 2, 2, 4]);
  });

  it('prefixMatch does not require consuming the whole input', () => {
    const re = compileRegex('\\d{3}');
    expect(prefixMatch(re, '12345')).not.toBeNull();
    expect(fullMatch(re, '12345')).toBeNull();
    expect(fullMatch(re, '123')).not.toBeNull();
  });

  it('search finds a leftmost match at an offset', () => {
    const re = compileRegex('\\d{2}');
    const caps = search(re, 'ab12cd', 0);
    expect(caps).not.toBeNull();
    // group 0 spans indices 2..4
    expect(caps?.slice(0, 2)).toEqual([2, 4]);
  });

  it('honours lazy quantifiers', () => {
    const re = compileRegex('(a+?)(a+)');
    const caps = fullMatch(re, 'aaaa');
    expect(caps).not.toBeNull();
    // lazy first group takes the minimum (one 'a'); greedy second takes the rest
    expect(caps?.slice(2)).toEqual([0, 1, 1, 4]);
  });

  it('rejects unsupported syntax', () => {
    expect(() => compileRegex('(?=a)')).toThrow(RegexSyntaxError);
    expect(() => compileRegex('a)')).toThrow(RegexSyntaxError);
    expect(() => compileRegex('(a')).toThrow(RegexSyntaxError);
  });
});
