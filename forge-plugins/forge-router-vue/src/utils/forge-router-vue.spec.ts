import { describe, expect, it, vi } from 'vitest';


import { createVueRouterCapabilities, toMpLocation, toVueLocation } from '../runtime';

import { forgeRouterVue } from './forge-router-vue';

import type { RouterCapabilityModule } from '@mission-platform/forge-router-plugin-api';

function moduleWith(source: string, names: readonly string[]): RouterCapabilityModule {
  return {
    kind: 'router-capability-module',
    source,
    fileName: 'fixture.ts',
    moduleKind: 'component',
    imports: names.map((name) => ({
      importedName: name,
      localName: name,
      typeOnly: false,
      span: { start: 0, end: 1, line: 1, column: 1 },
    })),
    uses: [],
  };
}

describe('forgeRouterVue', () => {
  it('rewrites neutral imports to the Vue runtime helpers', () => {
    const source =
      "import { MpLink, useMpRoute, useMpRouter, MpRouterView } from '@mission-platform/router';\nexport { MpLink, useMpRoute, useMpRouter, MpRouterView };";
    const module = moduleWith(source, ['MpLink', 'useMpRoute', 'useMpRouter', 'MpRouterView']);
    const generated = forgeRouterVue.generate(
      forgeRouterVue.lower(module, {
        routerTarget: 'vue-router',
        uiFramework: 'vue',
        moduleKind: 'component',
        fileName: 'fixture.ts',
      }),
    );

    expect(generated.code).toContain(
      "import { MpLink, useMpRoute, useMpRouter, MpRouterView } from '@mission-platform/forge-router-vue/runtime';",
    );
    expect(generated.code).toContain('export { MpLink, useMpRoute, useMpRouter, MpRouterView };');
    expect(generated.code).not.toContain('vue-router');
  });

  it('maps Vue locations and navigation onto the neutral capability contract', async () => {
    const push = vi.fn(async () => {});
    const replace = vi.fn(async () => {});
    const resolve = vi.fn(() => ({
      path: '/users/42',
      fullPath: '/users/42?tab=profile',
      params: { id: '42' },
      query: { tab: 'profile' },
      hash: '',
      name: 'user',
      meta: { auth: true },
    }));

    const router = {
      currentRoute: {
        value: {
          path: '/users/42',
          fullPath: '/users/42?tab=profile',
          params: { id: '42' },
          query: { tab: 'profile' },
          hash: '',
          name: 'user',
          meta: { auth: true },
        },
      },
      push,
      replace,
      resolve,
    };

    const capabilities = createVueRouterCapabilities(router as never);
    expect(capabilities.route()?.query.tab).toBe('profile');
    expect(capabilities.route()?.params).toEqual({ id: '42' });
    expect(capabilities.resolve({ name: 'user', params: { id: 42 } }).fullPath).toBe('/users/42?tab=profile');

    await capabilities.navigate({ path: '/next', query: { q: '1' } });
    expect(push).toHaveBeenCalledWith(toVueLocation({ path: '/next', query: { q: '1' } }));

    await capabilities.navigate('/back', { replace: true });
    expect(replace).toHaveBeenCalledWith('/back');

    expect(toMpLocation(router.currentRoute.value).name).toBe('user');
    expect(toVueLocation({ name: 'user', params: { id: 7 }, hash: 'x' })).toMatchObject({
      name: 'user',
      params: { id: '7' },
      hash: '#x',
    });
  });
});
