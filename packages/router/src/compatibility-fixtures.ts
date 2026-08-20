import { defineRoutes } from './define-routes';

import type { MpRoute, MpRouteLocationRaw } from './types';

const DOCS_LOCALES = 'en|ar|de|es|fr|he|it|ja|ko|nl|zh';
const WEBSITE_PREFIXED_LOCALES = 'es|fr|nl';

export interface ForgeCompatibilityCase {
  id: string;
  path?: string;
  expectedRoute?: string;
  expectedParams?: Record<string, string | string[]>;
  expectedNavigation?: 'success' | 'redirect' | 'cancelled';
  historyMode?: 'browser' | 'memory';
  history?: {
    initialUrl: string;
    pushUrl: string;
    replaceUrl: string;
    backDelta: number;
  };
}

export interface ForgeCompatibilityFixture {
  id: string;
  routes: readonly MpRoute[];
  cases: readonly ForgeCompatibilityCase[];
}

/** Route records mirroring the documentation app's locale/search/catch-all table. */
export const documentationCompatibilityFixture: ForgeCompatibilityFixture = {
  id: 'docs',
  routes: defineRoutes([
    {
      path: `/:locale(${DOCS_LOCALES})`,
      name: 'localized-home',
      redirect: (to) => `/${String(to.params.locale)}/overview`,
      meta: { surface: 'docs' },
    },
    { path: '/', redirect: '/overview' },
    { path: `/:locale(${DOCS_LOCALES})/search`, name: 'localized-search', meta: { noIndex: true } },
    { path: `/:locale(${DOCS_LOCALES})/:slug(.*)`, name: 'localized-doc' },
    { path: '/search', name: 'search', meta: { noIndex: true } },
    { path: '/:slug(.*)', name: 'doc' },
  ]),
  cases: [
    { id: 'docs-english-document', path: '/overview', expectedRoute: 'doc' },
    { id: 'docs-nested-document', path: '/configs/index', expectedRoute: 'doc' },
    { id: 'docs-localized-document', path: '/fr/configs/index', expectedRoute: 'localized-doc' },
    { id: 'docs-localized-search', path: '/fr/search', expectedRoute: 'localized-search' },
  ],
};

/** Backwards-friendly short alias for consumers that call the product "docs". */
export { documentationCompatibilityFixture as docsCompatibilityFixture };

/** Route records mirroring the website's optional prefixed-locale home route. */
export const websiteCompatibilityFixture: ForgeCompatibilityFixture = {
  id: 'website',
  routes: defineRoutes([
    { path: `/:locale(${WEBSITE_PREFIXED_LOCALES})?`, name: 'home', meta: { surface: 'website' } },
  ]),
  cases: [
    { id: 'website-default-locale', path: '/', expectedRoute: 'home' },
    { id: 'website-prefixed-locale', path: '/fr', expectedRoute: 'home', expectedParams: { locale: 'fr' } },
  ],
};

/** Route records mirroring My Care Notes' language segment and URL-driven overlays. */
export const myCareNotesCompatibilityFixture: ForgeCompatibilityFixture = {
  id: 'my-care-notes',
  routes: defineRoutes([
    {
      path: '/:lang?',
      name: 'care-notes',
      meta: { overlays: ['panel', 'overlay', 'id'] },
    },
  ]),
  cases: [
    { id: 'care-notes-default-language', path: '/', expectedRoute: 'care-notes' },
    { id: 'care-notes-language', path: '/en', expectedRoute: 'care-notes', expectedParams: { lang: 'en' } },
    { id: 'care-notes-overlay', path: '/?panel=snippets&overlay=snippet-edit&id=42', expectedRoute: 'care-notes' },
  ],
};

const compatibilityRoutes = defineRoutes([
  { path: '/private', name: 'private', beforeEnter: () => false },
  { path: '/login', name: 'login' },
  { path: '/guarded', name: 'guarded', beforeEnter: () => '/login' as MpRouteLocationRaw },
  { path: '/lazy', name: 'lazy', lazy: async () => ({ default: 'lazy-view' }) },
]);

/** Shared behavior rows consumed by every runtime's contract test suite. */
export const routerCompatibilityFixtures: readonly ForgeCompatibilityCase[] = [
  { id: 'guard-cancelled', path: '/private', expectedRoute: 'private', expectedNavigation: 'cancelled' },
  { id: 'guard-redirected', path: '/guarded', expectedRoute: 'login', expectedNavigation: 'redirect' },
  { id: 'lazy-route', path: '/lazy', expectedRoute: 'lazy', expectedNavigation: 'success' },
  {
    id: 'browser-history',
    historyMode: 'browser',
    path: '/login',
    expectedRoute: 'login',
    history: { initialUrl: '/', pushUrl: '/login', replaceUrl: '/lazy', backDelta: -1 },
  },
  {
    id: 'memory-history',
    historyMode: 'memory',
    path: '/lazy',
    expectedRoute: 'lazy',
    history: { initialUrl: '/', pushUrl: '/lazy', replaceUrl: '/login', backDelta: -1 },
  },
];

export const applicationCompatibilityFixtures = {
  website: websiteCompatibilityFixture,
  myCareNotes: myCareNotesCompatibilityFixture,
  guardsAndLazy: { id: 'guards-and-lazy', routes: compatibilityRoutes, cases: routerCompatibilityFixtures },
} as const;
