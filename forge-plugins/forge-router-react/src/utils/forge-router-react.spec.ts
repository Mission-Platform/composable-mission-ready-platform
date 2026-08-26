import { describe, expect, it, vi } from 'vitest';

import { createReactRouterCapabilities, resolveMpLink, toMpLocationFromReact, toReactHref } from '../runtime';

import { forgeRouterReact } from './forge-router-react';

import type { RouterCapabilityModule } from '@mission-platform/forge-router-plugin-api';

function moduleWith(source: string, names: readonly string[]): RouterCapabilityModule {
  return {
    kind: 'router-capability-module',
    source,
    fileName: 'fixture.tsx',
    moduleKind: 'component',
    imports: names.map((name) => ({
      importedName: name,
      localName: name,
      typeOnly: false,
      span: { start: 0, end: 1, line: 1, column: 1 },
    })),
    uses: names.map((name) => ({
      capability:
        name === 'MpLink'
          ? 'link'
          : name === 'MpRouterView'
            ? 'view'
            : name === 'useMpRoute'
              ? 'route'
              : name === 'resolveMpLink'
                ? 'resolve'
                : 'navigate',
      importedName: name,
      localName: name,
      kind: 'call',
      span: { start: 0, end: 1, line: 1, column: 1 },
    })),
  };
}

describe('forgeRouterReact', () => {
  it('rewrites neutral imports to the shape-preserving runtime module', () => {
    const module = moduleWith(
      "import { MpLink, useMpRoute, useMpRouter, useMpNavigation, MpRouterView, resolveMpLink } from '@mission-platform/router';\nconst route = useMpRoute();\nawait useMpRouter().navigate(route?.fullPath ?? '/');\n",
      ['MpLink', 'useMpRoute', 'useMpRouter', 'useMpNavigation', 'MpRouterView', 'resolveMpLink'],
    );
    const generated = forgeRouterReact.generate(
      forgeRouterReact.lower(module, {
        routerTarget: 'react-router',
        uiFramework: 'react',
        moduleKind: 'component',
        fileName: 'fixture.tsx',
      }),
    );

    expect(generated.code).toContain(
      "import { MpLink, useMpRoute, useMpRouter, useMpNavigation, MpRouterView, resolveMpLink } from '@mission-platform/forge-router-react/runtime';",
    );
    expect(generated.code).toContain('useMpRouter().navigate');
    expect(generated.code).not.toContain('react-router');
    expect(generated.code).not.toContain('@mission-platform/router');
  });

  it('preserves MpResolvedLocation and navigate() shapes at runtime', async () => {
    const navigate = vi.fn();
    const capabilities = createReactRouterCapabilities({
      location: { pathname: '/users/42', search: '?tab=profile&tag=a&tag=b', hash: '#bio' },
      params: { id: '42' },
      navigate,
      outlet: 'Outlet',
    });

    expect(capabilities.route()).toEqual({
      path: '/users/42',
      fullPath: '/users/42?tab=profile&tag=a&tag=b#bio',
      params: { id: '42' },
      query: { tab: 'profile', tag: ['a', 'b'] },
      hash: '#bio',
    });
    expect(capabilities.route()?.query.tab).toBe('profile');

    await capabilities.navigate({ path: '/users/7', query: { tab: 'edit' }, hash: 'form' }, { replace: true });
    expect(navigate).toHaveBeenCalledWith(
      { pathname: '/users/7', search: '?tab=edit', hash: '#form' },
      {
        replace: true,
        state: undefined,
      },
    );

    expect(capabilities.resolve('/docs?q=router#api')).toMatchObject({
      path: '/docs',
      fullPath: '/docs?q=router#api',
      query: { q: 'router' },
      hash: '#api',
    });
    expect(resolveMpLink({ path: '/x', query: { a: 1 } })).toBe('/x?a=1');
    expect(toReactHref('/plain')).toBe('/plain');
    expect(toMpLocationFromReact({ pathname: '/', search: '', hash: '' }).params).toEqual({});
    expect(capabilities.view).toBe('Outlet');
  });
});
