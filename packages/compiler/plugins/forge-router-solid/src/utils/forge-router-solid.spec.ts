import { describe, expect, it, vi } from 'vitest';

import { createSolidRouterCapabilities, resolveMpLink, toMpLocationFromSolid } from '../runtime';

import { forgeRouterSolid } from './forge-router-solid';

import type { RouterCapabilityModule } from '@mission-platform/forge-router-plugin-api';

describe('forgeRouterSolid', () => {
  it('rewrites neutral imports to the Solid runtime helpers', () => {
    const module: RouterCapabilityModule = {
      kind: 'router-capability-module',
      source:
        "import { MpLink, useMpRouter, useMpRoute } from '@mission-platform/router';\nawait useMpRouter().navigate('/x');\nconst tab = useMpRoute()?.query.tab;\n",
      fileName: 'fixture.tsx',
      moduleKind: 'component',
      imports: ['MpLink', 'useMpRouter', 'useMpRoute'].map((name) => ({
        importedName: name,
        localName: name,
        typeOnly: false,
        span: { start: 0, end: 1, line: 1, column: 1 },
      })),
      uses: [],
    };
    const generated = forgeRouterSolid.generate(
      forgeRouterSolid.lower(module, {
        routerTarget: 'solid-router',
        uiFramework: 'solid',
        moduleKind: 'component',
        fileName: 'fixture.tsx',
      }),
    );

    expect(generated.code).toContain(
      "import { MpLink, useMpRouter, useMpRoute } from '@mission-platform/forge-router-solid/runtime';",
    );
    expect(generated.code).toContain('useMpRouter().navigate');
    expect(generated.code).not.toContain('@solidjs/router');
  });

  it('preserves navigate/route shapes against Solid primitives', async () => {
    const navigate = vi.fn();
    const capabilities = createSolidRouterCapabilities({
      location: { pathname: '/docs', search: '?q=solid', hash: '#api' },
      params: { slug: 'intro' },
      navigate,
      outlet: 'Outlet',
    });

    expect(capabilities.route()).toEqual({
      path: '/docs',
      fullPath: '/docs?q=solid#api',
      params: { slug: 'intro' },
      query: { q: 'solid' },
      hash: '#api',
    });
    await capabilities.navigate({ path: '/next', query: { page: 2 } }, { replace: true, state: { a: 1 } });
    expect(navigate).toHaveBeenCalledWith('/next?page=2', { replace: true, state: { a: 1 } });
    expect(resolveMpLink('/x')).toBe('/x');
    expect(toMpLocationFromSolid({ pathname: '/', search: '', hash: '' }).fullPath).toBe('/');
    expect(capabilities.view).toBe('Outlet');
  });
});
