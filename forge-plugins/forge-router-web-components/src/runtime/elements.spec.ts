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
    router.dispose();
  });
});
