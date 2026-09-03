import { describe, expect, it } from 'vitest';

import { parseQuery, stringifyQuery } from './query';

describe('parseQuery', () => {
  it('parses key/value pairs with or without a leading question mark', () => {
    expect(parseQuery('?a=1&b=2')).toEqual({ a: '1', b: '2' });
    expect(parseQuery('a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('returns an empty object for an empty query', () => {
    expect(parseQuery('')).toEqual({});
    expect(parseQuery('?')).toEqual({});
  });

  it('collapses repeated keys into an array', () => {
    expect(parseQuery('tag=a&tag=b&tag=c')).toEqual({ tag: ['a', 'b', 'c'] });
  });

  it('decodes percent-encoded values and treats + as a space', () => {
    expect(parseQuery('q=a%20b&name=John+Doe')).toEqual({ q: 'a b', name: 'John Doe' });
  });

  it('treats a key without a value as an empty string', () => {
    expect(parseQuery('flag')).toEqual({ flag: '' });
  });
});

describe('stringifyQuery', () => {
  it('serialises a map with a leading question mark', () => {
    expect(stringifyQuery({ a: '1', b: 2 })).toBe('?a=1&b=2');
  });

  it('returns an empty string when there is nothing to serialise', () => {
    expect(stringifyQuery({})).toBe('');
    expect(stringifyQuery({ a: undefined, b: undefined })).toBe('');
  });

  it('emits one pair per array item and drops nullish items', () => {
    expect(stringifyQuery({ tag: ['a', 'b'], skip: [undefined, undefined] })).toBe('?tag=a&tag=b');
  });

  it('encodes keys and values', () => {
    expect(stringifyQuery({ 'a b': 'c d' })).toBe('?a%20b=c%20d');
  });

  it('round-trips through parseQuery', () => {
    expect(parseQuery(stringifyQuery({ tag: ['a', 'b'], page: 2 }))).toEqual({ tag: ['a', 'b'], page: '2' });
  });
});
