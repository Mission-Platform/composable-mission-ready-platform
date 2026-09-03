// @vitest-environment jsdom

import { createMemoryHistory, registerRouterElements } from '@mission-platform/forge-router-web-components/runtime';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import './app/app-shell';
import { updateRouteMetadata } from './app/metadata';
import { createDocsRouter } from './app/router';

import type { MpRouterAdapter } from '@mission-platform/router';

interface DocsShell extends HTMLElement {
  setRouter(router: MpRouterAdapter): void;
}

const mountedRouters: MpRouterAdapter[] = [];

beforeAll(() => {
  window.scrollTo = (() => {}) as typeof globalThis.scrollTo;
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof globalThis.matchMedia;
});

beforeAll(async () => {
  // Load the same entry that production uses so custom-element registration is
  // covered by the application graph rather than by test-only package imports.
  await import('./main');
}, 120_000);

async function mountDocs(initialUrl: string): Promise<{
  router: ReturnType<typeof createDocsRouter>;
  shell: DocsShell;
}> {
  registerRouterElements();
  const router = createDocsRouter({ history: createMemoryHistory(initialUrl) });
  const shell = document.createElement('docs-app-shell') as DocsShell;
  shell.append(document.createElement('forge-router-outlet'));
  document.body.append(shell);
  shell.setRouter(router);
  shell
    .querySelector<HTMLElement & { setRouter(router: MpRouterAdapter): void }>('forge-router-outlet')
    ?.setRouter(router);
  mountedRouters.push(router);
  await router.ready;
  await Promise.resolve();
  await Promise.resolve();
  return { router, shell };
}

function mountedStyles(element: Element | null, label: string): string[] {
  const links = [
    ...(element instanceof HTMLElement
      ? (element.shadowRoot?.querySelectorAll<HTMLLinkElement>('link[data-mp-forge-style]') ?? [])
      : []),
  ];
  expect(links, `${label} shadow root`).not.toHaveLength(0);
  return links.map((link) => link.dataset.mpForgeStyle ?? link.href);
}

async function flushElementUpdates(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function renderedTextContent(node: Node): string {
  let text = node.nodeType === Node.TEXT_NODE ? (node.textContent ?? '') : '';
  for (const child of node.childNodes) text += renderedTextContent(child);
  if (node instanceof HTMLElement && node.shadowRoot !== null) text += renderedTextContent(node.shadowRoot);
  if (node instanceof HTMLSlotElement) {
    for (const assigned of node.assignedNodes({ flatten: true })) text += renderedTextContent(assigned);
  }
  return text;
}

afterEach(() => {
  for (const router of mountedRouters.splice(0)) router.dispose();
  document.body.replaceChildren();
  document.head.replaceChildren();
  localStorage.clear();
});

describe('docs Web Components application', { timeout: 30_000 }, () => {
  it('mounts the compiled language switcher with typed select options', async () => {
    const switcher = document.createElement('forge-language-switcher') as HTMLElement & {
      locale: string;
      locales: readonly { code: string; label: string }[];
    };
    switcher.locale = 'en';
    switcher.locales = [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' },
    ];
    document.body.append(switcher);

    await Promise.resolve();
    await Promise.resolve();

    const select = switcher.shadowRoot?.querySelector('[is="forge-select"]') as
      | (HTMLElement & {
          options: readonly { value: string; label: string }[];
          modelValue: string;
        })
      | null;
    expect(select).not.toBeNull();
    expect(select?.options).toEqual([
      expect.objectContaining({ value: 'en', label: 'English' }),
      expect.objectContaining({ value: 'fr', label: 'Français' }),
    ]);
    expect(select?.getAttribute('options')).toBeNull();
    expect(select?.shadowRoot?.textContent).toContain('English');

    switcher.locale = 'fr';
    await new Promise((resolve) => setTimeout(resolve, 0));
    const updatedSelect = switcher.shadowRoot?.querySelector('[is="forge-select"]') as
      (HTMLElement & { modelValue: string }) | null;
    expect(updatedSelect?.modelValue).toBe('fr');
    expect(updatedSelect?.shadowRoot?.textContent).toContain('Français');
  });

  it('renders language icons and navigates when a locale is selected', async () => {
    const { router, shell } = await mountDocs('/overview');
    const switcher = shell.querySelector('forge-language-switcher');
    const select = switcher?.shadowRoot?.querySelector('[is="forge-select"]') as
      (HTMLElement & { shadowRoot: ShadowRoot | null }) | null;

    expect(switcher?.shadowRoot?.querySelector('forge-icon-language')).not.toBeNull();
    expect(select?.shadowRoot?.querySelector('forge-icon-flag')).not.toBeNull();

    const trigger = select?.shadowRoot?.querySelector('button[role="combobox"]') as HTMLButtonElement | null;
    trigger?.click();
    await flushElementUpdates();

    const frenchOption = [...(select?.shadowRoot?.querySelectorAll('li[role="option"]') ?? [])].find((option) =>
      option.textContent?.includes('Français'),
    );
    expect(frenchOption).not.toBeUndefined();
    frenchOption?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await flushElementUpdates();

    expect(router.current.value?.params.locale).toBe('fr');
    expect(router.current.value?.path).toBe('/fr/overview');
  });

  it('renders a localized document and synchronizes locale metadata', async () => {
    const { router, shell } = await mountDocs('/fr/packages/tooling/configs/eslint-config/index');
    updateRouteMetadata(router.current.value!);

    expect(router.current.value?.name).toBe('localized-doc');
    expect(router.current.value?.params).toEqual({
      locale: 'fr',
      slug: 'packages/tooling/configs/eslint-config/index',
    });
    expect(shell.querySelector('docs-document-view')?.dataset.locale).toBe('fr');
    expect(shell.querySelector('docs-document-view')?.textContent).toContain('Installer et utiliser');
    expect(document.documentElement.lang).toBe('fr-FR');
    expect(document.title).toContain('@mission-platform/eslint-config');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
      '/fr/packages/tooling/configs/eslint-config/index',
    );
  });

  it('mounts component styles in representative shadow roots and preserves them across rerenders', async () => {
    const { router, shell } = await mountDocs('/fr/overview');
    const layout = shell.querySelector('[is="forge-application-layout"]');
    const navbar = shell.querySelector('[is="forge-navbar"]');
    const switcher = shell.querySelector('forge-language-switcher');
    const select = switcher?.shadowRoot?.querySelector('[is="forge-select"]') ?? null;
    const layoutStyles = mountedStyles(layout, 'forge-application-layout');
    const navbarStyles = mountedStyles(navbar, 'forge-navbar');
    const selectStyles = mountedStyles(select, 'forge-select');
    expect(layoutStyles.some((url) => url.endsWith('/forge-application-layout.css'))).toBe(true);
    expect(navbarStyles.some((url) => url.endsWith('/forge-navbar.css'))).toBe(true);
    expect(selectStyles.some((url) => url.endsWith('/forge-select.css'))).toBe(true);
    expect(new Set(navbarStyles).size).toBe(navbarStyles.length);

    (layout as HTMLElement & { stickyHeader: boolean }).stickyHeader = false;
    (navbar as HTMLElement & { sticky: boolean }).sticky = false;
    (select as HTMLElement & { modelValue: string }).modelValue = 'fr';
    await flushElementUpdates();

    expect(mountedStyles(layout, 'forge-application-layout after rerender')).toEqual(layoutStyles);
    expect(mountedStyles(navbar, 'forge-navbar after rerender')).toEqual(navbarStyles);
    expect(mountedStyles(select, 'forge-select after rerender')).toEqual(selectStyles);

    await router.push('/fr/packages/tooling/configs/eslint-config/index');
    await flushElementUpdates();
    expect(
      mountedStyles(
        shell.querySelector('[is="forge-application-layout"]'),
        'forge-application-layout after navigation',
      ),
    ).toEqual(layoutStyles);
    expect(mountedStyles(shell.querySelector('[is="forge-navbar"]'), 'forge-navbar after navigation')).toEqual(
      navbarStyles,
    );
    const navigatedSwitcher = shell.querySelector('forge-language-switcher');
    expect(
      mountedStyles(
        navigatedSwitcher?.shadowRoot?.querySelector('[is="forge-select"]') ?? null,
        'forge-select after navigation',
      ),
    ).toEqual(selectStyles);
  });

  it('keeps the full documentation sidebar out of the desktop navbar', async () => {
    const { shell } = await mountDocs('/overview');
    const navbarNavigation = shell.querySelector('.docs-navbar__nav');
    const layoutSidebar = shell.querySelector('[is="forge-application-layout"] > .docs-sidebar');

    expect(navbarNavigation?.dataset.mobileOnly).toBe('true');
    expect(layoutSidebar).not.toBeNull();
    expect(navbarNavigation).not.toBe(layoutSidebar);
  });

  it('projects the real navbar navigation and end controls into the opened mobile drawer', async () => {
    const { shell } = await mountDocs('/overview');
    const navbar = shell.querySelector('[is="forge-navbar"]') as (HTMLElement & { isMobile: boolean }) | null;
    expect(navbar).not.toBeNull();

    const navbarRoot = navbar?.shadowRoot;
    const header = navbarRoot?.querySelector('header');
    expect(header?.className).toContain('forge-navbar');

    // jsdom's matchMedia stub is intentionally static; seed the same reactive
    // state the browser sets below the configured breakpoint.
    navbar!.isMobile = true;
    await flushElementUpdates();
    const mobileHeader = navbarRoot?.querySelector('header');
    expect(mobileHeader?.className).toContain('forge-navbar');
    expect(mobileHeader?.className.split(/\s+/u).some((name) => name.endsWith('forge-navbar--mobile'))).toBe(true);

    const openButton = navbarRoot?.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement | null;
    expect(openButton).not.toBeNull();
    openButton!.click();
    await flushElementUpdates();

    const drawer = navbarRoot?.querySelector('[is="forge-drawer"]') as (HTMLElement & { open: boolean }) | null;
    expect(drawer?.open).toBe(true);
    const drawerRoot = drawer?.shadowRoot;
    const defaultSlot = drawerRoot?.querySelector('slot:not([name])');
    const mobileNav = defaultSlot
      ?.assignedNodes({ flatten: true })
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches('nav'));
    expect(mobileNav?.className).toContain('forge-navbar__mobile-nav');
    expect(mobileNav?.querySelector('[class*="forge-navbar__mobile-nav-items"]')).not.toBeNull();
    expect(renderedTextContent(mobileNav ?? document.createTextNode(''))).toContain('Mission Platform Overview');
    expect(renderedTextContent(mobileNav ?? document.createTextNode(''))).toContain('Development Setup');

    const projectedEnd = mobileNav?.querySelector('[slot="end"]');
    expect(projectedEnd).not.toBeNull();
    expect(projectedEnd?.className).toBe('docs-navbar__end');
    expect(projectedEnd?.querySelector('forge-language-switcher')).not.toBeNull();
    expect(projectedEnd?.querySelector('forge-theme-toggle')).not.toBeNull();
    expect(renderedTextContent(projectedEnd!)).toContain('mission-platform.dev');
    expect(mobileNav?.querySelector('[class*="forge-navbar__mobile-nav-end"]')).not.toBeNull();

    const closeButton = navbarRoot?.querySelector('button[aria-label="Close menu"]') as HTMLButtonElement | null;
    closeButton?.click();
    await flushElementUpdates();
    expect((navbarRoot?.querySelector('[is="forge-drawer"]') as (HTMLElement & { open: boolean }) | null)?.open).toBe(
      false,
    );
    expect(navbar?.querySelector('[slot="brand"]')).not.toBeNull();
    expect(navbar?.querySelector('[slot="end"]')).not.toBeNull();
  });

  it('renders localized search state and preserves query navigation', async () => {
    const { router, shell } = await mountDocs('/fr/search?q=composable');
    updateRouteMetadata(router.current.value!);

    const search = shell.querySelector('docs-search-view');
    expect(search?.dataset.locale).toBe('fr');
    expect(search?.dataset.query).toBe('composable');
    expect(search === null ? '' : renderedTextContent(search)).toContain('composable');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');

    await router.push('/fr/overview');
    await flushElementUpdates();
    updateRouteMetadata(router.current.value!);
    expect(router.current.value?.path).toBe('/fr/overview');
    expect(shell.querySelector('docs-document-view')?.dataset.locale).toBe('fr');
  });

  it('keeps the current document visible beneath the loading spinner during SPA navigation', async () => {
    const { router, shell } = await mountDocs('/overview');
    const outlet = shell.querySelector('forge-router-outlet');
    const currentView = shell.querySelector('docs-document-view');

    expect(currentView?.dataset.slug).toBe('overview');
    const navigation = router.push('/development-setup');

    expect(outlet?.getAttribute('aria-busy')).toBe('true');
    expect(outlet?.querySelector('.forge-router-loading-overlay')).not.toBeNull();
    expect(outlet?.querySelector('.docs-loading-spinner')).not.toBeNull();
    expect(shell.querySelector('docs-document-view')).toBe(currentView);
    expect(router.current.value?.path).toBe('/overview');

    await navigation;
    expect(shell.querySelector('docs-document-view')).toBe(currentView);
    expect(currentView?.dataset.slug).toBe('overview');
    await flushElementUpdates();

    expect(router.current.value?.path).toBe('/development-setup');
    expect(shell.querySelector('docs-document-view')?.dataset.slug).toBe('development-setup');
    expect(outlet?.getAttribute('aria-busy')).toBeNull();
    expect(outlet?.querySelector('.forge-router-loading-overlay')).toBeNull();
  });

  it('uses router-link events for in-app navigation and updates RTL routes', async () => {
    const { router, shell } = await mountDocs('/he/overview');
    updateRouteMetadata(router.current.value!);

    expect(document.documentElement.lang).toBe('he-IL');
    expect(document.documentElement.dir).toBe('rtl');

    const brandLink = shell.querySelector('forge-router-link')?.querySelector('a');
    expect(brandLink?.getAttribute('href')).toBe('/he/overview');

    await router.push('/he/packages/tooling/configs/eslint-config/index');
    updateRouteMetadata(router.current.value!);
    await flushElementUpdates();
    expect(shell.querySelector('docs-document-view')?.dataset.slug).toBe(
      'packages/tooling/configs/eslint-config/index',
    );
    expect(document.documentElement.dir).toBe('rtl');
  });
});
