import { unsupportedRouterCapabilities } from '@mission-platform/forge-router-plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  createRedwoodRouterCapabilities,
  resolveMpLink,
  setForgeRedwoodRouter,
  useMpRoute,
  useMpRouter,
} from '../runtime';

import { forgeRouterRedwood } from './forge-router-redwood';

import type { RouterCapabilityModule } from '@mission-platform/forge-router-plugin-api';

describe('forgeRouterRedwood', () => {
  it('rewrites neutral imports to the Redwood runtime helpers', () => {
    const module: RouterCapabilityModule = {
      kind: 'router-capability-module',
      source:
        "import { MpLink, useMpRoute, useMpRouter } from '@mission-platform/router';\nawait useMpRouter().navigate(useMpRoute()?.fullPath ?? '/');\n",
      fileName: 'fixture.tsx',
      moduleKind: 'component',
      imports: ['MpLink', 'useMpRoute', 'useMpRouter'].map((name) => ({
        importedName: name,
        localName: name,
        typeOnly: false,
        span: { start: 0, end: 1, line: 1, column: 1 },
      })),
      uses: [],
    };
    const generated = forgeRouterRedwood.generate(
      forgeRouterRedwood.lower(module, {
        routerTarget: 'redwood',
        uiFramework: 'redwood',
        moduleKind: 'component',
        fileName: 'fixture.tsx',
      }),
    );

    expect(generated.code).toContain(
      "import { MpLink, useMpRoute, useMpRouter } from '@mission-platform/forge-router-redwood/runtime';",
    );
    expect(generated.code).toContain('useMpRouter().navigate');
    expect(generated.code).not.toContain('@redwoodjs/router');
    expect(forgeRouterRedwood.capabilities).not.toContain('view');
  });

  it('reports unsupported view usage', () => {
    const module: RouterCapabilityModule = {
      kind: 'router-capability-module',
      source: "import { MpRouterView } from '@mission-platform/router';",
      fileName: 'fixture.tsx',
      moduleKind: 'component',
      imports: [
        {
          importedName: 'MpRouterView',
          localName: 'MpRouterView',
          typeOnly: false,
          span: { start: 0, end: 1, line: 1, column: 1 },
        },
      ],
      uses: [
        {
          capability: 'view',
          importedName: 'MpRouterView',
          localName: 'MpRouterView',
          kind: 'jsx',
          span: { start: 0, end: 1, line: 1, column: 1 },
        },
      ],
    };
    expect(unsupportedRouterCapabilities(module, forgeRouterRedwood)[0]?.code).toBe('MP_ROUTER_CAPABILITY_UNSUPPORTED');
  });

  it('preserves route/navigation shapes through the bound Redwood surface', async () => {
    const navigate = vi.fn(async () => {});
    setForgeRedwoodRouter({
      Link: (properties: { to: string }) => properties.to,
      navigate,
      useLocation: () => ({ pathname: '/posts/1', search: '?tab=edit', hash: '#body' }),
      routes: {
        post: ((parameters?: { id?: string }) => `/posts/${parameters?.id ?? ''}`) as (
          ...arguments_: never[]
        ) => string,
      },
    });

    expect(useMpRoute()?.query.tab).toBe('edit');
    const capabilities = useMpRouter();
    await capabilities.navigate({ name: 'post', params: { id: 9 }, query: { tab: 'view' } });
    expect(navigate).toHaveBeenCalledWith('/posts/9?tab=view', { replace: undefined });
    expect(resolveMpLink({ path: '/x', query: { a: '1' } })).toBe('/x?a=1');
    expect(
      createRedwoodRouterCapabilities({
        location: { pathname: '/', search: '', hash: '' },
        navigate,
      }).view,
    ).toBeUndefined();
  });
});
