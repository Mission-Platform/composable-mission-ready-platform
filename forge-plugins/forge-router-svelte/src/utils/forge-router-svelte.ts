import { defineForgeRouterTarget } from '@mission-platform/forge-router-plugin-api';

/** Forge router target for SvelteKit's application-owned page/navigation APIs. */
export const forgeRouterSvelte = defineForgeRouterTarget({
  id: 'sveltekit',
  routerPackage: '$app/navigation',
  // SvelteKit owns the page outlet through routing conventions; `view` stays unsupported.
  capabilities: ['link', 'route', 'navigate', 'resolve'],
  runtimeModule: '@mission-platform/forge-router-svelte/runtime',
});
