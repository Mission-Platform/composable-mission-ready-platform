import { describe, expect, it } from 'vitest';

import {
  MpMemoryHistory,
  createWebComponentsRouter,
  resolveMpLink,
  setForgeRouter,
  useMpNavigation,
  useMpRoute,
  useMpRouter,
} from '../runtime';
import { forgeRouterWebComponents } from './forge-router-web-components';

import type { RouterCapabilityModule } from '@mission-platform/forge-router-plugin-api';

describe('forgeRouterWebComponents', () => {
  it('rewrites neutral imports to same-named runtime helpers', () => {
    const module: RouterCapabilityModule = {
      kind: 'router-capability-module',
      source:
        "import { MpLink, MpRouterView, useMpRoute, useMpRouter } from '@mission-platform/router';\nawait useMpRouter().navigate(useMpRoute()?.path ?? '/');\n",
      fileName: 'fixture.ts',
      moduleKind: 'component',
      imports: ['MpLink', 'MpRouterView', 'useMpRoute', 'useMpRouter'].map((name) => ({
        importedName: name,
        localName: name,
        typeOnly: false,
        span: { start: 0, end: 1, line: 1, column: 1 },
      })),
      uses: [],
    };
    const generated = forgeRouterWebComponents.generate(
      forgeRouterWebComponents.lower(module, {
        routerTarget: 'web-components',
        uiFramework: 'none',
        moduleKind: 'component',
        fileName: 'fixture.ts',
      }),
    );

    expect(generated.code).toContain(
      "import { MpLink, MpRouterView, useMpRoute, useMpRouter } from '@mission-platform/forge-router-web-components/runtime';",
    );
    expect(generated.code).toContain('useMpRouter().navigate');
  });

  it('exposes neutral capability shapes through the bound Web Components router', async () => {
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home' },
        { path: '/next', name: 'next' },
      ],
      history: new MpMemoryHistory('/'),
    });
    setForgeRouter(router);

    expect(useMpRoute()?.name).toBe('home');
    await useMpNavigation().navigate({ path: '/next', query: { tab: 'a' }, hash: 'x' });
    expect(useMpRoute()?.fullPath).toBe('/next?tab=a#x');
    expect(resolveMpLink('/next')).toBe('/next');
    expect(useMpRouter().view).toBe('forge-router-outlet');
    router.dispose();
  });
});
