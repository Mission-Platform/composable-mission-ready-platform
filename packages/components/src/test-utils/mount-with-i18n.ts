import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

/** A minimal vue-i18n instance used in component unit tests. */
const testI18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } });

/** Creates a fresh in-memory router for each test to avoid cross-test interference. */
export function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
}

/**
 * Mounts a component with the vue-i18n and vue-router plugins pre-installed.
 * Use this helper for every component that calls `useI18n` or router composables internally.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mountWithI18n(component: any, options: Parameters<typeof mount>[1] = {}, router?: Router) {
  const options_ = options as Record<string, unknown>;
  const globalOptions = options_.global as Record<string, unknown> | undefined;
  const routerPlugin = router ?? createTestRouter();
  return mount(component, {
    ...options_,
    global: {
      plugins: [testI18n, routerPlugin],
      ...globalOptions,
    },
  });
}
