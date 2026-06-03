import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * Overlay query params:
 *   ?panel=snippets              — opens the snippets sidebar
 *   ?overlay=snippet-new         — opens the new-snippet modal
 *   ?overlay=snippet-edit&id=… — opens the edit-snippet modal for a given snippet id
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: async () => import('../App.vue'),
    },
  ],
})

export default router
