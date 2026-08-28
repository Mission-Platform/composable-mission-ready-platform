import {
  createBrowserHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

import { DEFAULT_SLUG } from '../documentation';
import { SUPPORTED_LOCALES } from '../i18n';

import type { MpHistory, MpRoute, MpRouteViewAdapter } from '@mission-platform/router';
import './document-view';
import './search-view';

export type DocsRouteView = HTMLElement;

export const docsViewAdapter: MpRouteViewAdapter<DocsRouteView, HTMLElement> = {
  mount: ({ view }, outlet) => {
    outlet.replaceChildren(view);
    const routeElement = view as HTMLElement & { setRouter?: (router: ReturnType<typeof createDocsRouter>) => void };
    routeElement.setRouter?.(routerForOutlet(outlet));
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
  options: { history?: MpHistory } = {},
): ReturnType<typeof createWebComponentsRouter<DocsRouteView>> {
  registerRouterElements();
  activeRouter = createWebComponentsRouter({
    routes,
    history: options.history ?? createBrowserHistory(),
    viewAdapter: docsViewAdapter,
  });
  setForgeRouter(activeRouter);
  return activeRouter;
}
