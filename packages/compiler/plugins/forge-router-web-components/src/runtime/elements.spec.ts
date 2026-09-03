// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { MpRouterLinkElement, MpRouterOutletElement, registerRouterElements } from './elements';
import { MpMemoryHistory } from './history';
import { createWebComponentsRouter } from './router';

describe('router custom elements', () => {
  it('registers elements idempotently and mounts route views', async () => {
    registerRouterElements();
    registerRouterElements();
    expect(customElements.get('forge-router-link')).toBe(MpRouterLinkElement);
    expect(customElements.get('forge-router-outlet')).toBe(MpRouterOutletElement);

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
});
