import { defaultLocale, type SupportedLocale, supportedLocales } from 'virtual:i18n-locales';

import type { RouteRecordRaw, RouterOptions } from 'vue-router';

/**
 * Locales supported by the website. The list is the single source of truth
 * auto-derived by `@mission-platform/vite-plugin-i18n` from the locale files in
 * `src/locales/` (plus the `defaultLocale`) and exposed via the generated
 * `virtual:i18n-locales` module — so there is no hand-maintained list to keep in
 * sync. The default locale (`en`) is served at the site root (`/`) without a
 * path prefix, while every other locale gets its own URL prefix (`/es/`, `/fr/`,
 * …).
 *
 * `ar` and `he` are right-to-left locales — `LOCALE_DIR` in `main.ts` maps
 * those to `dir="rtl"` on the `<html>` element.
 */
export const SUPPORTED_LOCALES = supportedLocales;

export const DEFAULT_LOCALE: SupportedLocale = defaultLocale;

/** Locales that get a URL prefix (everything except the default locale). */
export const PREFIXED_LOCALES = SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE);

/**
 * Vue Router route table.
 *
 * The home view is mounted both at `/` (default locale) and under each
 * prefixed locale (`/es`, `/fr`, `/nl`) via the optional `:locale` segment.
 * The `locale` route param drives both `vue-i18n` and the per-route
 * metadata composables (canonical URL, og:locale, …) — see `main.ts`.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: `/:locale(${PREFIXED_LOCALES.join('|')})?`,
    name: 'home',
    component: async () => import('../views/home-view.vue'),
  },
];

/**
 * Shared router options consumed by both the SPA client entry and the
 * `vite-ssg` static-site generator. `vite-ssg` swaps `history` for a memory
 * history per prerendered route, so we deliberately do not construct the
 * router here.
 */
export const routerOptions: Omit<RouterOptions, 'history'> = {
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
};

export { type SupportedLocale } from 'virtual:i18n-locales';
