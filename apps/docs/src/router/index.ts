import { DEFAULT_SLUG } from '../documentation';

import type { RouterOptions, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: `/${DEFAULT_SLUG}`,
  },
  {
    // Full-text search over the indexed documentation. The query lives in the
    // `?q=` search parameter so results are shareable and reload-safe.
    path: '/search',
    name: 'search',
    component: async () => import('../views/search-view.vue'),
  },
  {
    // Catch-all so nested slugs like `configs/eslint-config` resolve to a
    // single view. Unknown slugs render a "not found" state inside the view.
    path: '/:slug(.*)',
    name: 'doc',
    component: async () => import('../views/doc-view.vue'),
  },
];

/**
 * Shared router options consumed by both the SPA client entry and the
 * `vite-ssg` static-site generator. `vite-ssg` swaps `history` for a memory
 * history per prerendered route, so we deliberately do not construct the
 * router here — the entry point (`main.ts`, via `ViteSSG`) owns that.
 */
export const routerOptions: Omit<RouterOptions, 'history'> = {
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 80 };
    return { top: 0 };
  },
};
