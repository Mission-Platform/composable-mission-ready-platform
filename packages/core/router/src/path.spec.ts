import { describe, expect, it } from 'vitest';

import { buildPath, compilePath, matchPath, normalizePath, WILDCARD_PARAM_KEY } from './path';

describe('normalizePath', () => {
  it('adds a leading slash and strips trailing slashes', () => {
    expect(normalizePath('users')).toBe('/users');
    expect(normalizePath('/users/')).toBe('/users');
    expect(normalizePath('/users///')).toBe('/users');
  });

  it('keeps the root path as a single slash', () => {
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/')).toBe('/');
  });
});

describe('compilePath', () => {
  it('captures required, optional, and repeatable parameter keys', () => {
    const compiled = compilePath('/users/:id/posts/:slug?');
    expect(compiled.keys).toEqual([
      { name: 'id', optional: false, repeatable: false },
      { name: 'slug', optional: true, repeatable: false },
    ]);
  });

  it('captures a standalone wildcard under the pathMatch key', () => {
    const compiled = compilePath('/files/*');
    expect(compiled.keys).toEqual([{ name: WILDCARD_PARAM_KEY, optional: true, repeatable: true }]);
  });
});

describe('matchPath', () => {
  it('extracts required parameters', () => {
    expect(matchPath('/users/:id', '/users/42')).toEqual({ id: '42' });
  });

  it('returns undefined when the pathname does not match', () => {
    expect(matchPath('/users/:id', '/posts/42')).toBeUndefined();
  });

  it('matches optional segments whether present or absent', () => {
    expect(matchPath('/users/:id?', '/users')).toEqual({});
    expect(matchPath('/users/:id?', '/users/7')).toEqual({ id: '7' });
  });

  it('captures repeatable catch-all segments as an array', () => {
    expect(matchPath('/files/:rest+', '/files/a/b/c')).toEqual({ rest: ['a', 'b', 'c'] });
    expect(matchPath('/files/*', '/files/a/b')).toEqual({ [WILDCARD_PARAM_KEY]: ['a', 'b'] });
  });

  it('decodes percent-encoded values and ignores query/hash', () => {
    expect(matchPath('/search/:term', '/search/a%20b?x=1#y')).toEqual({ term: 'a b' });
  });

  it('matches the root path', () => {
    expect(matchPath('/', '/')).toEqual({});
  });
});

describe('buildPath', () => {
  it('interpolates and encodes required parameters', () => {
    expect(buildPath('/users/:id', { id: 42 })).toBe('/users/42');
    expect(buildPath('/search/:term', { term: 'a b' })).toBe('/search/a%20b');
  });

  it('drops absent optional segments and keeps present ones', () => {
    expect(buildPath('/users/:id?', {})).toBe('/users');
    expect(buildPath('/users/:id?', { id: 7 })).toBe('/users/7');
  });

  it('joins repeatable values with slashes', () => {
    expect(buildPath('/files/:rest*', { rest: ['a', 'b'] })).toBe('/files/a/b');
    expect(buildPath('/files/*', { [WILDCARD_PARAM_KEY]: 'a/b' })).toBe('/files/a/b');
  });

  it('throws when a required parameter is missing', () => {
    expect(() => buildPath('/users/:id', {})).toThrow(/Missing required route parameter "id"/);
  });
});
