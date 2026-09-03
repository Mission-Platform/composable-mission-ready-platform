import { parseLocation, parseQuery, stringifyLocation } from '@mission-platform/router';

import type {
  MpLinkOptions,
  MpNavigationOptions,
  MpQueryParameters,
  MpResolvedLocation,
  MpRouteLocationRaw,
  MpRouteParameters,
  MpRouterCapabilities,
} from '@mission-platform/router';

/** Minimal Redwood/router surface used by the runtime shim. */
export interface RedwoodRouterSurface {
  Link: unknown;
  navigate: (to: string, options?: { replace?: boolean }) => void | Promise<void>;
  useLocation: () => { pathname: string; search: string; hash?: string };
  routes?: Record<string, (...arguments_: never[]) => string>;
}

let boundSurface: RedwoodRouterSurface | undefined;

/**
 * Bind the app-owned Redwood router module. Compiled package code reads through
 * this seam so hook/call shapes match the neutral contract.
 */
export function setForgeRedwoodRouter(surface: RedwoodRouterSurface): void {
  boundSurface = surface;
}

function requireSurface(): RedwoodRouterSurface {
  if (!boundSurface) {
    throw new Error('A Redwood router surface must be bound with setForgeRedwoodRouter().');
  }
  return boundSurface;
}

/** Serialize a neutral target for Redwood navigation. */
export function toRedwoodHref(
  to: MpRouteLocationRaw,
  routes: RedwoodRouterSurface['routes'] = boundSurface?.routes,
): string {
  if (typeof to === 'string') return to;
  if ('path' in to) return stringifyLocation(to);
  const named = routes?.[to.name];
  if (typeof named === 'function') {
    const path = (named as (parameters?: Record<string, string>) => string)(
      to.params
        ? Object.fromEntries(
            Object.entries(to.params).map(([key, value]) => [
              key,
              Array.isArray(value) ? value.map(String).join('/') : String(value ?? ''),
            ]),
          )
        : undefined,
    );
    return stringifyLocation({ path, query: to.query, hash: to.hash });
  }
  throw new Error(`Unknown Redwood route name "${to.name}".`);
}

/** Build a neutral location from a Redwood location snapshot. */
export function toMpLocationFromRedwood(
  location: { pathname: string; search: string; hash?: string },
  parameters: MpRouteParameters = {},
): MpResolvedLocation {
  const hash = location.hash ?? '';
  const query = parseQuery(location.search) as MpQueryParameters;
  return {
    path: location.pathname,
    fullPath: `${location.pathname}${location.search}${hash}`,
    params: parameters,
    query,
    hash,
  };
}

/** Build neutral capabilities from Redwood primitives (framework-free for tests). */
export function createRedwoodRouterCapabilities(input: {
  location: { pathname: string; search: string; hash?: string };
  params?: MpRouteParameters;
  navigate: RedwoodRouterSurface['navigate'];
  routes?: RedwoodRouterSurface['routes'];
  link?: unknown;
}): MpRouterCapabilities {
  const current = toMpLocationFromRedwood(input.location, input.params);
  return {
    link: (to, options?: MpLinkOptions) => ({
      to: toRedwoodHref(to, input.routes),
      replace: options?.replace ?? false,
    }),
    route: () => current,
    navigate: async (to, options?: MpNavigationOptions) => {
      await input.navigate(toRedwoodHref(to, input.routes), { replace: options?.replace });
    },
    resolve: (to) => {
      const href = toRedwoodHref(to, input.routes);
      const location = parseLocation(href);
      return {
        ...location,
        fullPath: stringifyLocation(location),
        params: {},
      };
    },
    // Redwood has no portable outlet primitive; view remains unsupported.
    view: undefined,
  };
}

/** Redwood has no portable outlet; the compiler reports `view` as unsupported. */
export const MpRouterView = undefined;

/** Link component proxy; apps bind the native Redwood `Link` through {@link setForgeRedwoodRouter}. */
export function MpLink(properties: { to: MpRouteLocationRaw; replace?: boolean; children?: unknown }): unknown {
  const surface = requireSurface();
  const Link = surface.Link as (properties: { to: string; replace?: boolean; children?: unknown }) => unknown;
  return Link({
    to: toRedwoodHref(properties.to, surface.routes),
    replace: properties.replace,
    children: properties.children,
  });
}

/** Read the current app-owned route as {@link MpResolvedLocation}. */
export function useMpRoute(): MpResolvedLocation | null {
  const surface = requireSurface();
  return toMpLocationFromRedwood(surface.useLocation());
}

/** Read the neutral capability object backed by Redwood Router. */
export function useMpRouter(): MpRouterCapabilities {
  const surface = requireSurface();
  return createRedwoodRouterCapabilities({
    location: surface.useLocation(),
    navigate: surface.navigate,
    routes: surface.routes,
    link: surface.Link,
  });
}

/** Read only imperative navigation/resolve capabilities. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  const capabilities = useMpRouter();
  return { navigate: capabilities.navigate, resolve: capabilities.resolve };
}

/** Resolve a neutral target to an href string. */
export function resolveMpLink(to: MpRouteLocationRaw): string {
  return toRedwoodHref(to);
}
