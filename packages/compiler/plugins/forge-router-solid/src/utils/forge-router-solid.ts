import { defineForgeRouterTarget } from '@mission-platform/forge-router-plugin-api';

/** Forge router target for an application-owned SolidJS Router instance. */
export const forgeRouterSolid = defineForgeRouterTarget({
  id: 'solid-router',
  routerPackage: '@solidjs/router',
  capabilities: ['link', 'route', 'navigate', 'resolve', 'view'],
  runtimeModule: '@mission-platform/forge-router-solid/runtime',
});
