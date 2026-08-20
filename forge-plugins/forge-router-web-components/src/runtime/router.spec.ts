import { docsCompatibilityFixture, routerCompatibilityFixtures } from '@mission-platform/router';
import { describe, expect, it, vi } from 'vitest';

import { MpMemoryHistory } from './history';
import { createWebComponentsRouter } from './router';

const settleWithin = async <T>(promise: Promise<T>): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('history navigation did not settle')), 100);
    }),
  ]);

describe('Web Components router', () => {
  it('matches the shared documentation fixture, including nested and localized slugs', () => {
    const router = createWebComponentsRouter({
      routes: docsCompatibilityFixture.routes,
      history: new MpMemoryHistory('/fr/configs/index'),
    });

    expect(router.current.value?.name).toBe('localized-doc');
    expect(router.current.value?.params).toEqual({ locale: 'fr', slug: 'configs/index' });
    router.dispose();
  });

  it('executes redirects and guards against the shared runtime fixture', async () => {
    const routes = [
      { path: '/', name: 'home' },
      { path: '/login', name: 'login' },
      { path: '/guarded', name: 'guarded', beforeEnter: () => '/login' },
      { path: '/private', name: 'private', beforeEnter: () => false },
    ] as const;
    const router = createWebComponentsRouter({ routes, history: new MpMemoryHistory('/') });

    const redirected = await router.push('/guarded');
    expect(redirected.type).toBe('redirect');
    expect(router.current.value?.name).toBe('login');

    const cancelled = await router.push('/private');
    expect(cancelled).toMatchObject({ type: 'failure', failureType: 'cancelled' });
    expect(router.current.value?.name).toBe('login');
    router.dispose();
  });

  it('preserves query/hash values and executes memory back/forward navigation', async () => {
    const router = createWebComponentsRouter({
      routes: [
        { path: '/search', name: 'search' },
        { path: '/docs/*', name: 'doc' },
      ],
      history: new MpMemoryHistory('/search'),
    });
    await router.push({ path: '/docs/intro', query: { q: ['router', 'web'] }, hash: 'toc' });
    expect(router.current.value?.fullPath).toBe('/docs/intro?q=router&q=web#toc');

    const back = await router.back();
    expect(back.type).toBe('success');
    expect(router.current.value?.path).toBe('/search');
    router.dispose();
  });

  it('settles no-op memory history controls', async () => {
    const router = createWebComponentsRouter({
      routes: [{ path: '/', name: 'home' }],
      history: new MpMemoryHistory('/'),
    });

    await expect(settleWithin(router.go?.(0) ?? Promise.reject(new Error('go is unavailable')))).resolves.toMatchObject(
      {
        type: 'success',
        to: expect.objectContaining({ path: '/' }),
      },
    );
    await expect(settleWithin(router.back())).resolves.toMatchObject({ type: 'success' });
    router.dispose();
  });

  it('settles cancelled, not-found, lazy, and redirect-loop pop navigations', async () => {
    const cases = [
      {
        name: 'cancelled',
        route: { path: '/blocked', name: 'blocked', beforeEnter: () => false },
        expected: { failureType: 'cancelled' },
      },
      {
        name: 'lazy',
        route: {
          path: '/broken-lazy',
          name: 'broken-lazy',
          lazy: async () => {
            throw new Error('lazy failed');
          },
        },
        expected: { failureType: 'error' },
      },
      {
        name: 'redirect-loop',
        route: { path: '/loop', name: 'loop', redirect: '/loop' },
        expected: { failureType: 'error' },
      },
    ] as const;

    for (const testCase of cases) {
      const history = new MpMemoryHistory('/');
      const router = createWebComponentsRouter({
        routes: [{ path: '/', name: 'home' }, { path: '/next', name: 'next' }, testCase.route],
        history,
      });

      await router.push('/next');
      history.push(testCase.name === 'cancelled' ? '/blocked' : testCase.name === 'lazy' ? '/broken-lazy' : '/loop');
      await router.back();
      const result = await settleWithin(router.forward());

      expect(result).toMatchObject({ type: 'failure', ...testCase.expected });
      router.dispose();
    }
  });

  it('settles a pop navigation when the history target is not found', async () => {
    const history = new MpMemoryHistory('/');
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home' },
        { path: '/next', name: 'next' },
      ],
      history,
    });

    await router.push('/next');
    history.push('/missing');
    await router.back();
    const result = await settleWithin(router.forward());

    expect(result).toMatchObject({ type: 'failure', failureType: 'not-found' });
    router.dispose();
  });

  it('runs scroll behavior for route transitions', async () => {
    const scrollBehavior = vi.fn(() => ({ left: 0, top: 24 }));
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home' },
        { path: '/next', name: 'next' },
      ],
      history: new MpMemoryHistory('/'),
      scrollBehavior,
    });

    await router.push('/next');
    expect(scrollBehavior).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/next' }),
      expect.anything(),
      undefined,
    );
    router.dispose();
  });

  it.each(routerCompatibilityFixtures.filter((fixture) => fixture.expectedNavigation === undefined))(
    'resolves compatibility case $id',
    ({ path, expectedRoute }) => {
      const router = createWebComponentsRouter({
        routes: [
          { path: '/', name: 'home' },
          { path: '/login', name: 'login' },
          { path: '/lazy', name: 'lazy', lazy: async () => 'view' },
        ],
        history: new MpMemoryHistory(path ?? '/'),
      });
      expect(router.current.value?.name).toBe(expectedRoute);
      router.dispose();
    },
  );
});
