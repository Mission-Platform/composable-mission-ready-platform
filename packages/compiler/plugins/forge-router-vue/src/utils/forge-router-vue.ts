import { defineForgeRouterTarget } from '@mission-platform/forge-router-plugin-api';

/** Forge router target for an application-owned Vue Router instance. */
export const forgeRouterVue = defineForgeRouterTarget({
  id: 'vue-router',
  routerPackage: 'vue-router',
  capabilities: ['link', 'route', 'navigate', 'resolve', 'view'],
  runtimeModule: '@mission-platform/forge-router-vue/runtime',
});
