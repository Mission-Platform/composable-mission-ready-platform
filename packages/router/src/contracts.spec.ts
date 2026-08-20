/* eslint-disable unicorn/consistent-function-scoping, unicorn/no-null, unicorn/no-useless-undefined */

import { describe, expect, it } from 'vitest';

import { defineRoutes } from './define-routes';

import type { MpHistory, MpNavigationResult, MpResolvedLocation, MpRouteGuard, MpRouterAdapter } from './types';

describe('neutral router contracts', () => {
  it('accepts nested, lazy, redirect, metadata, and guard route records', () => {
    const guard: MpRouteGuard = async (to) => (to.query.preview === 'true' ? true : '/login');
    const routes = defineRoutes([
      {
        path: '/app',
        name: 'app',
        meta: { requiresAuth: true },
        children: [
          {
            path: 'dashboard',
            name: 'dashboard',
            lazy: async () => ({ default: 'dashboard-view' }),
            beforeEnter: guard,
          },
        ],
      },
      { path: '/login', name: 'login' },
      { path: '/old', redirect: '/app/dashboard' },
    ]);

    expect(routes[0].children?.[0].name).toBe('dashboard');
    expect(routes[0].children?.[0].redirect).toBeUndefined();
  });

  it('models resolved route, adapter, history, and navigation result shapes structurally', () => {
    const route: MpResolvedLocation = {
      path: '/docs',
      fullPath: '/docs?q=router#api',
      params: {},
      query: { q: 'router' },
      hash: '#api',
      name: 'docs',
    };
    const result: MpNavigationResult = { type: 'success', ok: true, from: null, to: route };
    const history: MpHistory = {
      location: route.fullPath,
      push: () => undefined,
      replace: () => undefined,
      back: () => undefined,
      forward: () => undefined,
      go: () => undefined,
      listen: () => () => undefined,
    };
    const adapter: MpRouterAdapter = {
      current: {
        value: route,
        subscribe: () => () => undefined,
      },
      resolve: () => route,
      push: async () => result,
      replace: async () => result,
      back: async () => result,
      subscribe: () => () => undefined,
    };

    expect(history.location).toBe('/docs?q=router#api');
    expect(adapter.current.value?.name).toBe('docs');
    expect(result.ok).toBe(true);
  });
});
