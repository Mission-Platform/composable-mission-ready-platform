import { defineForgeRouterTarget } from '@mission-platform/forge-router-plugin-api';

/** Forge router target for RedwoodSDK's application-owned router context. */
export const forgeRouterRedwood = defineForgeRouterTarget({
  id: 'redwood',
  routerPackage: '@redwoodjs/router',
  // Redwood has no framework-neutral outlet primitive.
  capabilities: ['link', 'route', 'navigate', 'resolve'],
  runtimeModule: '@mission-platform/forge-router-redwood/runtime',
});
