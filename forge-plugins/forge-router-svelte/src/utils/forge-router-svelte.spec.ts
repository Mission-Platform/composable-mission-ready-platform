import { unsupportedRouterCapabilities } from '@mission-platform/forge-router-plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  createSvelteKitRouterCapabilities,
  resolveMpLink,
  setForgeSvelteKitRouter,
  useMpNavigation,
  useMpRoute,
} from '../runtime';

import { forgeRouterSvelte } from './forge-router-svelte';

import type { RouterCapabilityModule } from '@mission-platform/forge-router-plugin-api';

describe('forgeRouterSvelte', () => {
  it('rewrites supported imports to the SvelteKit runtime helpers', () => {
    const module: RouterCapabilityModule = {
      kind: 'router-capability-module',
      source:
        "import { useMpNavigation, resolveMpLink, MpLink } from '@mission-platform/router';\nawait useMpNavigation().navigate('/docs');\n",
      fileName: 'fixture.svelte',
      moduleKind: 'component',
      imports: ['useMpNavigation', 'resolveMpLink', 'MpLink'].map((name) => ({
        importedName: name,
        localName: name,
        typeOnly: false,
        span: { start: 0, end: 1, line: 1, column: 1 },
      })),
      uses: [
        {
          capability: 'navigate',
          importedName: 'useMpNavigation',
          localName: 'useMpNavigation',
          kind: 'call',
          span: { start: 0, end: 1, line: 1, column: 1 },
        },
      ],
    };
    const generated = forgeRouterSvelte.generate(
      forgeRouterSvelte.lower(module, {
        routerTarget: 'sveltekit',
        uiFramework: 'svelte',
        moduleKind: 'component',
        fileName: 'fixture.svelte',
      }),
    );

    expect(generated.code).toContain(
      "import { useMpNavigation, resolveMpLink, MpLink } from '@mission-platform/forge-router-svelte/runtime';",
    );
    expect(generated.code).toContain('useMpNavigation().navigate');
    expect(forgeRouterSvelte.capabilities).not.toContain('view');
  });

  it('reports unsupported view usage instead of rewriting it silently', () => {
    const module: RouterCapabilityModule = {
      kind: 'router-capability-module',
      source: "import { MpRouterView } from '@mission-platform/router';",
      fileName: 'fixture.svelte',
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

    expect(unsupportedRouterCapabilities(module, forgeRouterSvelte)[0]?.code).toBe('MP_ROUTER_CAPABILITY_UNSUPPORTED');
  });

  it('preserves navigate/route/resolve shapes through the bound SvelteKit surface', async () => {
    const goto = vi.fn(async () => {});
    setForgeSvelteKitRouter({
      goto,
      getPage: () => ({
        url: new URL('https://example.test/docs?q=kit#api'),
        params: { slug: 'intro' },
      }),
      resolvePath: (path) => path,
    });

    const capabilities = createSvelteKitRouterCapabilities({
      page: {
        url: new URL('https://example.test/docs?q=kit#api'),
        params: { slug: 'intro' },
      },
      goto,
    });

    expect(capabilities.route()?.query.q).toBe('kit');
    expect(useMpRoute()?.params).toEqual({ slug: 'intro' });
    await useMpNavigation().navigate({ path: '/next', query: { page: 2 } }, { replace: true });
    expect(goto).toHaveBeenCalledWith('/next?page=2', { replaceState: true, state: undefined });
    expect(resolveMpLink('/x')).toBe('/x');
    expect(capabilities.view).toBeUndefined();
  });
});
