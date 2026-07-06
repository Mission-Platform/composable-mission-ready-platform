import { describe, expect, it } from 'vitest';

import {
  createRouteResolver,
  defineRoutes,
  findRouteByName,
  flattenRoutes,
  matchRoutes,
  resolveLocation,
} from './define-routes';

import type { MpRoute } from './types';

const routes: MpRoute[] = defineRoutes([
  { path: '/', name: 'home', meta: { layout: 'default' } },
  {
    path: '/users',
    name: 'users',
    meta: { auth: true },
    children: [
      { path: '', name: 'users-index' },
      { path: ':id', name: 'user', meta: { layout: 'profile' } },
    ],
  },
  { path: '/files/*', name: 'files' },
]);

describe('flattenRoutes', () => {
  it('resolves child paths against their parents and inherits meta', () => {
    const flat = flattenRoutes(routes);
    const user = flat.find((entry) => entry.name === 'user');
    expect(user?.path).toBe('/users/:id');
    // `auth` inherited from the parent, `layout` overridden on the child.
    expect(user?.meta).toEqual({ auth: true, layout: 'profile' });
  });

  it('resolves an empty child path to the parent path', () => {
    const flat = flattenRoutes(routes);
    expect(flat.find((entry) => entry.name === 'users-index')?.path).toBe('/users');
  });
});

describe('findRouteByName', () => {
  it('finds a route anywhere in the tree', () => {
    expect(findRouteByName(routes, 'user')?.path).toBe('/users/:id');
  });

  it('returns undefined for an unknown name', () => {
    expect(findRouteByName(routes, 'missing')).toBeUndefined();
  });
});

describe('matchRoutes', () => {
  it('matches a nested dynamic route and extracts params', () => {
    const match = matchRoutes(routes, '/users/42');
    expect(match?.flat.name).toBe('user');
    expect(match?.params).toEqual({ id: '42' });
  });

  it('matches a catch-all route', () => {
    const match = matchRoutes(routes, '/files/a/b');
    expect(match?.flat.name).toBe('files');
    expect(match?.params).toEqual({ pathMatch: ['a', 'b'] });
  });

  it('returns undefined when nothing matches', () => {
    expect(matchRoutes(routes, '/nope/here')).toBeUndefined();
  });
});

describe('resolveLocation', () => {
  it('resolves a named location into a full path', () => {
    const resolved = resolveLocation({ name: 'user', params: { id: 42 }, query: { tab: 'info' } }, routes);
    expect(resolved.path).toBe('/users/42');
    expect(resolved.fullPath).toBe('/users/42?tab=info');
    expect(resolved.params).toEqual({ id: '42' });
    expect(resolved.name).toBe('user');
    expect(resolved.meta).toEqual({ auth: true, layout: 'profile' });
  });

  it('resolves a URL string and matches it against the tree', () => {
    const resolved = resolveLocation('/users/7?x=1#y', routes);
    expect(resolved.path).toBe('/users/7');
    expect(resolved.params).toEqual({ id: '7' });
    expect(resolved.query).toEqual({ x: '1' });
    expect(resolved.hash).toBe('#y');
    expect(resolved.name).toBe('user');
  });

  it('resolves a path location object', () => {
    const resolved = resolveLocation({ path: '/users', query: { sort: 'name' } }, routes);
    expect(resolved.fullPath).toBe('/users?sort=name');
    expect(resolved.name).toBe('users');
  });

  it('throws for an unknown route name', () => {
    expect(() => resolveLocation({ name: 'ghost' }, routes)).toThrow(/No route found with name "ghost"/);
  });
});

describe('createRouteResolver', () => {
  it('binds match and resolve to a route tree', () => {
    const resolver = createRouteResolver(routes);
    expect(resolver.match('/users/9')?.params).toEqual({ id: '9' });
    expect(resolver.resolve({ name: 'home' }).path).toBe('/');
    expect(resolver.routes.length).toBeGreaterThan(0);
  });
});
