import { describe, expect, it } from 'vitest';

import { normalizeHash, parseLocation, stringifyLocation } from './location';

describe('normalizeHash', () => {
  it('prefixes a single hash and treats bare/empty hashes as empty', () => {
    expect(normalizeHash('bio')).toBe('#bio');
    expect(normalizeHash('#bio')).toBe('#bio');
    expect(normalizeHash('')).toBe('');
    expect(normalizeHash('#')).toBe('');
  });
});

describe('parseLocation', () => {
  it('splits a URL into path, query, and hash', () => {
    expect(parseLocation('/users/42?tab=info#bio')).toEqual({
      path: '/users/42',
      query: { tab: 'info' },
      hash: '#bio',
    });
  });

  it('handles a bare path', () => {
    expect(parseLocation('/users')).toEqual({ path: '/users', query: {}, hash: '' });
  });

  it('normalises an empty path to the root', () => {
    expect(parseLocation('?a=1')).toEqual({ path: '/', query: { a: '1' }, hash: '' });
  });
});

describe('stringifyLocation', () => {
  it('assembles a URL from parts', () => {
    expect(stringifyLocation({ path: '/users/42', query: { tab: 'info' }, hash: 'bio' })).toBe(
      '/users/42?tab=info#bio',
    );
  });

  it('omits an empty query and hash', () => {
    expect(stringifyLocation({ path: '/users' })).toBe('/users');
  });

  it('round-trips through parseLocation', () => {
    const url = '/a/b?x=1&y=2#z';
    expect(stringifyLocation(parseLocation(url))).toBe(url);
  });
});
