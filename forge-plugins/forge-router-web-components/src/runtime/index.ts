import type { MpWebComponentsRouter } from './router';
import type { MpRouteLocationRaw, MpRouterCapabilities } from '@mission-platform/router';

export {
  MpBrowserHistory,
  MpMemoryHistory,
  createBrowserHistory,
  createMemoryHistory,
  createWebHistory,
} from './history';
export { MpRouterLinkElement, MpRouterOutletElement, registerRouterElements } from './elements';
export { createWebComponentsRouter, routeHref } from './router';
export type { MpWebComponentsRouter, MpWebComponentsRouterOptions } from './router';

let activeRouter: MpWebComponentsRouter<unknown> | undefined;

/** Bind the app-owned router for compiled framework-free package capabilities. */
export function setForgeRouter<View>(router: MpWebComponentsRouter<View>): void {
  activeRouter = router as unknown as MpWebComponentsRouter<unknown>;
}

/** Custom-element tag used for compiled neutral links. */
export const MpLink = 'forge-router-link';
/** Custom-element tag used for compiled neutral outlets. */
export const MpRouterView = 'forge-router-outlet';

/** @deprecated Prefer {@link MpLink}; retained for existing runtime consumers. */
export const ForgeRouterLink = MpLink;
/** @deprecated Prefer {@link MpRouterView}; retained for existing runtime consumers. */
export const ForgeRouterOutlet = MpRouterView;

/** Read the current app-owned route as a neutral location. */
export function useMpRoute(): MpWebComponentsRouter<unknown>['current']['value'] {
  // eslint-disable-next-line unicorn/no-null
  return activeRouter?.current.value ?? null;
}

/** Read the neutral capability object backed by the Web Components runtime. */
export function useMpRouter(): MpRouterCapabilities {
  if (!activeRouter) {
    throw new Error('A Web Components router must be bound with setForgeRouter().');
  }
  const router = activeRouter;
  return {
    link: (to) => router.resolve(to).fullPath,
    route: () => router.current.value,
    navigate: async (to, options) => {
      await (options?.replace ? router.replace(to) : router.push(to));
    },
    resolve: (to) => router.resolve(to),
    view: MpRouterView,
  };
}

/** Read only imperative navigation/resolve capabilities. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  const router = useMpRouter();
  return { navigate: router.navigate, resolve: router.resolve };
}

/** Resolve a neutral target through the bound Web Components router. */
export function resolveMpLink(to: MpRouteLocationRaw): string {
  return useMpRouter().resolve(to).fullPath;
}

/** @deprecated Prefer {@link useMpRoute}. */
export const useForgeRoute = useMpRoute;
/** @deprecated Prefer {@link useMpRouter}. */
export const useForgeRouter = useMpRouter;
/** @deprecated Prefer {@link useMpNavigation}. */
export const useForgeNavigation = useMpNavigation;
/** @deprecated Prefer {@link resolveMpLink}. */
export const resolveForgeLink = resolveMpLink;
