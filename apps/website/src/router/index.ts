import type { RouterOptions, RouteRecordRaw } from 'vue-router';

/**
 * Locales supported by the website. The default locale (`en`) is served at
 * the site root (`/`) without a path prefix, while every other locale gets
 * its own URL prefix (`/es/`, `/fr/`, `/nl/`). Keep this list in sync with
 * `src/locales/`, `load-locale.ts`, and the `hreflang` alternates declared
 * in `main.ts`.
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'nl'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

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
