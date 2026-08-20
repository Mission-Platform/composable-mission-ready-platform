import { defineForgeRouterTarget } from '@mission-platform/forge-router-plugin-api';

/** Forge router target backed by the framework-free history/outlet runtime. */
export const forgeRouterWebComponents = defineForgeRouterTarget({
  id: 'web-components',
  routerPackage: '@mission-platform/forge-router-web-components/runtime',
  capabilities: ['link', 'route', 'navigate', 'resolve', 'view'],
  runtimeModule: '@mission-platform/forge-router-web-components/runtime',
});
