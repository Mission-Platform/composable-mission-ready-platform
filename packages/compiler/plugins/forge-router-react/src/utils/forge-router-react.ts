import { defineForgeRouterTarget } from '@mission-platform/forge-router-plugin-api';

/** Forge router target for an application-owned React Router instance. */
export const forgeRouterReact = defineForgeRouterTarget({
  id: 'react-router',
  routerPackage: 'react-router',
  capabilities: ['link', 'route', 'navigate', 'resolve', 'view'],
  runtimeModule: '@mission-platform/forge-router-react/runtime',
});
