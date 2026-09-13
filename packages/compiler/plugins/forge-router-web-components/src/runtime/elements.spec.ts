// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { MpRouterLinkElement, MpRouterOutletElement, MpRouterViewElement, registerRouterElements } from './elements';
import { MpMemoryHistory } from './history';
import { createWebComponentsRouter } from './router';

describe('router custom elements', () => {
  it('registers elements idempotently and mounts route views', async () => {
    registerRouterElements();
    registerRouterElements();
    expect(customElements.get('forge-router-link')).toBe(MpRouterLinkElement);
    expect(customElements.get('forge-router-outlet')).toBe(MpRouterOutletElement);
    expect(customElements.get('mp-router-view')).toBe(MpRouterViewElement);

    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home', component: () => 'home view' },
        { path: '/next', name: 'next', component: () => document.createElement('strong') },
      ],
      history: new MpMemoryHistory('/'),
    });
    const outlet = document.createElement('forge-router-outlet') as MpRouterOutletElement;
    outlet.setRouter(router);
    document.body.append(outlet);
    await Promise.resolve();
    expect(outlet.textContent).toContain('home view');

    const link = document.createElement('forge-router-link') as MpRouterLinkElement;
    link.to = '/next';
    link.setRouter(router);
    document.body.append(link);
    expect(link.querySelector('a')?.getAttribute('href')).toBe('/next');
    link.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await Promise.resolve();
    expect(router.current.value?.path).toBe('/next');
    expect(link.hasAttribute('active')).toBe(true);
    expect(link.hasAttribute('exact-active')).toBe(true);
    router.dispose();
  });

  it('keeps the current view mounted under a configurable loading overlay', async () => {
    let resolveNext!: (view: string) => void;
    const nextView = new Promise<string>((resolve) => {
      resolveNext = resolve;
    });
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home', component: () => 'home view' },
        { path: '/next', name: 'next', component: () => nextView },
      ],
      history: new MpMemoryHistory('/'),
      loadingFallback: 'Loading next view',
    });
    const outlet = document.createElement('forge-router-outlet') as MpRouterOutletElement;
    outlet.setRouter(router);
    document.body.append(outlet);
    await Promise.resolve();
    expect(outlet.textContent).toContain('home view');

    const navigation = router.push('/next');
    expect(outlet.textContent).toContain('home view');
    expect(outlet.textContent).toContain('Loading next view');
    expect(outlet.getAttribute('aria-busy')).toBe('true');

    resolveNext('next view');
    await navigation;
    await Promise.resolve();
    expect(outlet.textContent).toBe('next view');
    expect(outlet.querySelector('.forge-router-loading-overlay')).toBeNull();
    expect(outlet.hasAttribute('aria-busy')).toBe(false);
    router.dispose();
  });

  it('shares a lazy view promise between navigation and outlet rendering', async () => {
    let calls = 0;
    let resolveNext!: (view: string) => void;
    const nextView = new Promise<string>((resolve) => {
      resolveNext = resolve;
    });
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home', component: () => 'home view' },
        {
          path: '/next',
          name: 'next',
          component: () => {
            calls += 1;
            return nextView;
          },
        },
      ],
      history: new MpMemoryHistory('/'),
    });
    const outlet = document.createElement('forge-router-outlet') as MpRouterOutletElement;
    outlet.setRouter(router);
    document.body.append(outlet);
    await Promise.resolve();

    const navigation = router.push('/next');
    resolveNext('next view');
    await navigation;
    await Promise.resolve();
    expect(calls).toBe(1);
    expect(outlet.textContent).toBe('next view');
    router.dispose();
  });

  it('cleans up the overlay on failed loading and ignores stale navigation results', async () => {
    let resolveSlow!: (view: string) => void;
    const slowView = new Promise<string>((resolve) => {
      resolveSlow = resolve;
    });
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home', component: () => 'home view' },
        { path: '/slow', name: 'slow', component: () => slowView },
        { path: '/fast', name: 'fast', component: () => 'fast view' },
        {
          path: '/broken',
          name: 'broken',
          component: async () => {
            throw new Error('view failed');
          },
        },
      ],
      history: new MpMemoryHistory('/'),
    });
    const outlet = document.createElement('forge-router-outlet') as MpRouterOutletElement;
    outlet.setRouter(router);
    document.body.append(outlet);
    await Promise.resolve();

    const slowNavigation = router.push('/slow');
    expect(outlet.querySelector('.forge-router-loading-overlay')).not.toBeNull();
    const fastNavigation = router.push('/fast');
    await fastNavigation;
    resolveSlow('slow view');
    const staleResult = await slowNavigation;
    await Promise.resolve();
    expect(staleResult).toMatchObject({ type: 'failure', failureType: 'cancelled' });
    expect(router.current.value?.path).toBe('/fast');
    expect(outlet.textContent).toBe('fast view');
    expect(outlet.querySelector('.forge-router-loading-overlay')).toBeNull();

    const failed = await router.push('/broken');
    expect(failed).toMatchObject({ type: 'failure', failureType: 'error' });
    expect(router.current.value?.path).toBe('/fast');
    expect(outlet.querySelector('.forge-router-loading-overlay')).toBeNull();
    router.dispose();
  });

  it('leaves modified, external, and targeted links to the browser', () => {
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home' },
        { path: '/next', name: 'next' },
      ],
      history: new MpMemoryHistory('/'),
    });
    const link = document.createElement('forge-router-link') as MpRouterLinkElement;
    link.to = '/next';
    link.setRouter(router);
    document.body.append(link);
    const modified = new MouseEvent('click', { bubbles: true, button: 0, ctrlKey: true, cancelable: true });
    link.querySelector('a')?.dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
    expect(router.current.value?.path).toBe('/');

    const external = document.createElement('forge-router-link') as MpRouterLinkElement;
    external.to = 'https://example.com/docs';
    external.setRouter(router);
    document.body.append(external);
    const externalClick = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });
    external.querySelector('a')?.dispatchEvent(externalClick);
    expect(externalClick.defaultPrevented).toBe(false);
    expect(external.querySelector('a')?.getAttribute('href')).toBe('https://example.com/docs');

    const targeted = document.createElement('forge-router-link') as MpRouterLinkElement;
    targeted.to = '/next';
    targeted.setAttribute('target', '_blank');
    targeted.setRouter(router);
    document.body.append(targeted);
    const targetedClick = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });
    targeted.querySelector('a')?.dispatchEvent(targetedClick);
    expect(targetedClick.defaultPrevented).toBe(false);
    expect(router.current.value?.path).toBe('/');
    router.dispose();
  });

  it('resolves multi-level nested layouts through context-driven depth tracking without remounting parent layout', async () => {
    let parentMountCount = 0;
    const router = createWebComponentsRouter({
      routes: [
        {
          path: '/dashboard',
          component: () => {
            parentMountCount += 1;
            const container = document.createElement('section');
            container.className = 'dashboard-layout';
            const title = document.createElement('h1');
            title.textContent = 'Dashboard Shell';
            const childOutlet = document.createElement('mp-router-view');
            container.append(title, childOutlet);
            return container;
          },
          children: [
            {
              path: 'settings',
              component: () => {
                const element = document.createElement('div');
                element.className = 'settings-page';
                element.textContent = 'Settings View';
                return element;
              },
            },
            {
              path: 'analytics',
              component: () => {
                const element = document.createElement('div');
                element.className = 'analytics-page';
                element.textContent = 'Analytics View';
                return element;
              },
            },
          ],
        },
      ],
      history: new MpMemoryHistory('/dashboard/settings'),
    });

    const rootOutlet = document.createElement('mp-router-view') as MpRouterOutletElement;
    rootOutlet.setRouter(router);
    document.body.append(rootOutlet);
    await Promise.resolve();
    await Promise.resolve();

    expect(rootOutlet.depth).toBe(0);
    expect(rootOutlet.textContent).toContain('Dashboard Shell');
    expect(rootOutlet.textContent).toContain('Settings View');
    expect(parentMountCount).toBe(1);

    const childOutlet = rootOutlet.querySelector('mp-router-view') as MpRouterOutletElement;
    expect(childOutlet).not.toBeNull();
    expect(childOutlet.depth).toBe(1);

    // Navigate to sister child route
    await router.push('/dashboard/analytics');
    await Promise.resolve();

    expect(rootOutlet.textContent).toContain('Dashboard Shell');
    expect(rootOutlet.textContent).toContain('Analytics View');
    expect(rootOutlet.textContent).not.toContain('Settings View');
    expect(parentMountCount).toBe(1);

    router.dispose();
  });

  it('resolves arbitrary 3-level route hierarchy across nested outlets', async () => {
    const router = createWebComponentsRouter({
      routes: [
        {
          path: '/admin',
          component: () => {
            const admin = document.createElement('div');
            admin.className = 'admin-layout';
            const child = document.createElement('forge-router-outlet');
            admin.append(child);
            return admin;
          },
          children: [
            {
              path: 'users',
              component: () => {
                const users = document.createElement('div');
                users.className = 'users-layout';
                const subChild = document.createElement('forge-router-outlet');
                users.append(subChild);
                return users;
              },
              children: [
                {
                  path: 'detail',
                  component: () => 'user detail leaf',
                },
              ],
            },
          ],
        },
      ],
      history: new MpMemoryHistory('/admin/users/detail'),
    });

    const rootOutlet = document.createElement('forge-router-outlet') as MpRouterOutletElement;
    rootOutlet.setRouter(router);
    document.body.append(rootOutlet);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(rootOutlet.depth).toBe(0);
    const middleOutlet = rootOutlet.querySelector('forge-router-outlet') as MpRouterOutletElement;
    expect(middleOutlet).not.toBeNull();
    expect(middleOutlet.depth).toBe(1);

    const leafOutlet = middleOutlet.querySelector('forge-router-outlet') as MpRouterOutletElement;
    expect(leafOutlet).not.toBeNull();
    expect(leafOutlet.depth).toBe(2);
    expect(leafOutlet.textContent).toBe('user detail leaf');

    router.dispose();
  });

  it('tracks active state, prefix matches, and aria-current with robust normalization', async () => {
    const router = createWebComponentsRouter({
      routes: [
        { path: '/', name: 'home' },
        {
          path: '/dashboard',
          name: 'dashboard',
          children: [{ path: 'settings', name: 'dashboard-settings' }],
        },
        { path: '/search', name: 'search' },
        { path: '/docs', name: 'docs' },
      ],
      history: new MpMemoryHistory('/dashboard/settings'),
    });

    const homeLink = document.createElement('forge-router-link') as MpRouterLinkElement;
    homeLink.to = '/';
    homeLink.setRouter(router);

    const parentLink = document.createElement('forge-router-link') as MpRouterLinkElement;
    parentLink.to = '/dashboard';
    parentLink.setRouter(router);

    const exactLink = document.createElement('forge-router-link') as MpRouterLinkElement;
    exactLink.to = '/dashboard/settings';
    exactLink.setRouter(router);

    const trailingSlashLink = document.createElement('forge-router-link') as MpRouterLinkElement;
    trailingSlashLink.to = '/dashboard/settings/';
    trailingSlashLink.setRouter(router);

    document.body.append(homeLink, parentLink, exactLink, trailingSlashLink);

    // Root link must NOT be active when on /dashboard/settings
    expect(homeLink.hasAttribute('active')).toBe(false);
    expect(homeLink.hasAttribute('exact-active')).toBe(false);
    expect(homeLink.classList.contains('forge-router-link-active')).toBe(false);
    expect(homeLink.querySelector('a')?.getAttribute('aria-current')).toBeNull();

    // Parent link must be active, but NOT exact-active, and aria-current must NOT be set
    expect(parentLink.hasAttribute('active')).toBe(true);
    expect(parentLink.hasAttribute('exact-active')).toBe(false);
    expect(parentLink.classList.contains('forge-router-link-active')).toBe(true);
    expect(parentLink.classList.contains('forge-router-link-exact-active')).toBe(false);
    expect(parentLink.querySelector('a')?.getAttribute('aria-current')).toBeNull();

    // Exact link must be active, exact-active, with classes and aria-current="page"
    expect(exactLink.hasAttribute('active')).toBe(true);
    expect(exactLink.hasAttribute('exact-active')).toBe(true);
    expect(exactLink.classList.contains('forge-router-link-active')).toBe(true);
    expect(exactLink.classList.contains('forge-router-link-exact-active')).toBe(true);
    expect(exactLink.querySelector('a')?.classList.contains('forge-router-link-active')).toBe(true);
    expect(exactLink.querySelector('a')?.classList.contains('forge-router-link-exact-active')).toBe(true);
    expect(exactLink.getAttribute('aria-current')).toBe('page');
    expect(exactLink.querySelector('a')?.getAttribute('aria-current')).toBe('page');

    // Trailing slash link should normalize and match exact
    expect(trailingSlashLink.hasAttribute('active')).toBe(true);
    expect(trailingSlashLink.hasAttribute('exact-active')).toBe(true);
    expect(trailingSlashLink.getAttribute('aria-current')).toBe('page');

    // Query parameters normalization (order-insensitive)
    await router.push({ path: '/search', query: { a: '1', b: '2' } });
    const queryLink = document.createElement('forge-router-link') as MpRouterLinkElement;
    queryLink.to = '/search?b=2&a=1';
    queryLink.setRouter(router);
    document.body.append(queryLink);

    expect(queryLink.hasAttribute('active')).toBe(true);
    expect(queryLink.hasAttribute('exact-active')).toBe(true);
    expect(queryLink.getAttribute('aria-current')).toBe('page');

    // Hash normalization
    await router.push({ path: '/docs', hash: '#intro' });
    const hashLink = document.createElement('forge-router-link') as MpRouterLinkElement;
    hashLink.to = '/docs#intro';
    hashLink.setRouter(router);
    document.body.append(hashLink);

    expect(hashLink.hasAttribute('active')).toBe(true);
    expect(hashLink.hasAttribute('exact-active')).toBe(true);
    expect(hashLink.getAttribute('aria-current')).toBe('page');

    // Reactive attribute update
    hashLink.setAttribute('to', '/');
    expect(hashLink.hasAttribute('active')).toBe(false);
    expect(hashLink.hasAttribute('exact-active')).toBe(false);
    expect(hashLink.getAttribute('aria-current')).toBeNull();

    router.dispose();
  });
});
