import {
  createBrowserHistory,
  createWebComponentsRouter,
  type MpRouterLoadingFallback,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

import { DEFAULT_SLUG } from '../documentation';
import { SUPPORTED_LOCALES } from '../i18n';

import type { MpHistory, MpRoute, MpRouteViewAdapter } from '@mission-platform/router';
import './document-view';
import './search-view';

export type DocsRouteView = HTMLElement;

/** Loading indicator shown while a documentation route view is resolved. */
export function createDocsLoadingFallback(): HTMLElement {
  const spinner = document.createElement('span');
  spinner.className = 'docs-loading-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  spinner.style.cssText =
    'display:inline-block;width:1.5rem;height:1.5rem;border:3px solid currentColor;border-right-color:transparent;border-radius:50%;animation:docs-spinner-spin .8s linear infinite;';
  return spinner;
}

function styleLinksIn(root: Node): HTMLLinkElement[] {
  const links: HTMLLinkElement[] = [];
  const visit = (node: Node): void => {
    if (node instanceof HTMLLinkElement && node.matches('link[data-mp-forge-style]')) {
      links.push(node);
    }
    if (node instanceof Element && node.shadowRoot) {
      visit(node.shadowRoot);
    }
    for (const child of node.childNodes) visit(child);
  };
  visit(root);
  return links;
}

function waitForViewStyles(view: HTMLElement): Promise<void[]> | undefined {
  // jsdom does not load shadow-root stylesheets; waiting there would make
  // integration tests hang indefinitely.
  if (globalThis.navigator?.userAgent.includes('jsdom')) return;
  const pending = styleLinksIn(view).filter((link) => link.sheet === null);
  if (pending.length === 0) return;
  return Promise.all(
    pending.map(
      (link) =>
        new Promise<void>((resolve) => {
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );
}

export const docsViewAdapter: MpRouteViewAdapter<DocsRouteView, HTMLElement> = {
  mount: ({ view }, outlet) => {
    const previous = outlet.firstElementChild;
    if (previous === view) return;

    if (previous === null) {
      outlet.replaceChildren(view);
    } else {
      view.hidden = true;
      outlet.append(view);
    }
    const routeElement = view as HTMLElement & { setRouter?: (router: ReturnType<typeof createDocsRouter>) => void };
    routeElement.setRouter?.(routerForOutlet(outlet));
    if (previous === null) return;
    const stylesReady = waitForViewStyles(view);
    if (stylesReady === undefined) {
      if (previous.parentNode === outlet) previous.remove();
      view.hidden = false;
    } else {
      return stylesReady.then(() => {
        if (previous.parentNode === outlet) previous.remove();
        view.hidden = false;
      });
    }
  },
};

let activeRouter: ReturnType<typeof createWebComponentsRouter<DocsRouteView>> | undefined;

function routerForOutlet(_outlet: HTMLElement): ReturnType<typeof createDocsRouter> {
  if (!activeRouter) throw new Error('Docs router is not active');
  return activeRouter;
}

function viewForRoute(name: string | undefined): DocsRouteView {
  return document.createElement(
    name === 'search' || name === 'localized-search' ? 'docs-search-view' : 'docs-document-view',
  );
}

export function createDocsRoutes(): readonly MpRoute<DocsRouteView>[] {
  const localizedLocalePattern = SUPPORTED_LOCALES.filter((locale) => locale !== 'en').join('|');
  const localizedDocumentRoute: MpRoute<DocsRouteView> = {
    path: `/:locale(${localizedLocalePattern})/:slug(.*)`,
    name: 'localized-doc',
    component: async () => viewForRoute('localized-doc'),
  };
  const documentRoute: MpRoute<DocsRouteView> = {
    path: '/:slug(.*)',
    name: 'doc',
    component: async () => viewForRoute('doc'),
  };

  return [
    { path: '/', name: 'home', redirect: `/${DEFAULT_SLUG}` },
    ...SUPPORTED_LOCALES.filter((locale) => locale !== 'en').map((locale) => ({
      path: `/${locale}`,
      name: `${locale}-home`,
      redirect: `/${locale}/${DEFAULT_SLUG}`,
    })),
    {
      path: `/:locale(${localizedLocalePattern})/search`,
      name: 'localized-search',
      component: async () => viewForRoute('localized-search'),
    },
    { path: '/search', name: 'search', component: async () => viewForRoute('search') },
    localizedDocumentRoute,
    documentRoute,
  ];
}

export const routes = createDocsRoutes();

export function createDocsRouter(
  options: { history?: MpHistory; loadingFallback?: MpRouterLoadingFallback } = {},
): ReturnType<typeof createWebComponentsRouter<DocsRouteView>> {
  registerRouterElements();
  activeRouter = createWebComponentsRouter({
    routes,
    history: options.history ?? createBrowserHistory(),
    viewAdapter: docsViewAdapter,
    loadingFallback: options.loadingFallback ?? createDocsLoadingFallback,
  });
  setForgeRouter(activeRouter);
  return activeRouter;
}
