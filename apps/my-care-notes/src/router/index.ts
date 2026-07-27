import type { RouterOptions, RouteRecordRaw } from 'vue-router';

/**
 * Overlay query params (client-driven UI state, not separate prerendered routes):
 *   ?panel=snippets              — opens the snippets sidebar
 *   ?overlay=snippet-new         — opens the new-snippet modal
 *   ?overlay=snippet-edit&id=…   — opens the edit-snippet modal for a given snippet id
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/:lang?/',
    component: () => import('../app.vue'),
  },
];

/**
 * Shared router options consumed by both the SPA client entry and the
 * `vite-ssg` static-site generator. `vite-ssg` constructs the router itself —
 * a web history on the client and a memory history per prerendered route —
 * so we deliberately do not create the router or set `history` here.
 */
export const routerOptions: Omit<RouterOptions, 'history'> = {
  routes,
};
