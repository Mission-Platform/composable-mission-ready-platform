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

type SolidNavigate = (to: string, options?: { replace?: boolean; state?: unknown }) => void;

/** Minimal Solid Router surface used by the runtime shim. */
export interface SolidRouterSurface {
  A: unknown;
  Outlet: unknown;
  useLocation: () => { pathname: string; search: string; hash: string };
  useNavigate: () => SolidNavigate;
  useParams: () => Record<string, string | undefined>;
}

let boundSurface: SolidRouterSurface | undefined;

/**
 * Bind the app-owned Solid Router module so compiled packages keep the neutral
 * hook/call shapes (`useMpRouter().navigate`, `useMpRoute().query`, …).
 */
export function setForgeSolidRouter(surface: SolidRouterSurface): void {
  boundSurface = surface;
}

function requireSurface(): SolidRouterSurface {
  if (!boundSurface) {
    throw new Error('A Solid Router surface must be bound with setForgeSolidRouter().');
  }
  return boundSurface;
}

/** Serialize a neutral target for Solid Router navigation. */
export function toSolidHref(to: MpRouteLocationRaw): string {
  if (typeof to === 'string') return to;
  if ('path' in to) return stringifyLocation(to);
  throw new Error('Named Solid Router targets require an application route table; use path-based targets.');
}

/** Build a neutral location from Solid Router location/params snapshots. */
export function toMpLocationFromSolid(
  location: { pathname: string; search: string; hash: string },
  params: Record<string, string | undefined> = {},
): MpResolvedLocation {
  const query = parseQuery(location.search) as MpQueryParameters;
  const normalizedParams: MpRouteParameters = Object.fromEntries(
    Object.entries(params)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([key, value]) => [key, value]),
  );
  return {
    path: location.pathname,
    fullPath: `${location.pathname}${location.search}${location.hash}`,
    params: normalizedParams,
    query,
    hash: location.hash,
  };
}

/** Build neutral capabilities from Solid Router primitives (framework-free for tests). */
export function createSolidRouterCapabilities(input: {
  location: { pathname: string; search: string; hash: string };
  params?: Record<string, string | undefined>;
  navigate: SolidNavigate;
  outlet?: unknown;
}): MpRouterCapabilities {
  const current = toMpLocationFromSolid(input.location, input.params);
  return {
    link: (to, options?: MpLinkOptions) => ({ href: toSolidHref(to), replace: options?.replace ?? false }),
    route: () => current,
    navigate: async (to, options?: MpNavigationOptions) => {
      input.navigate(toSolidHref(to), { replace: options?.replace, state: options?.state });
    },
    resolve: (to) => {
      const href = toSolidHref(to);
      const location = parseLocation(href);
      return {
        ...location,
        fullPath: stringifyLocation(location),
        params: {},
      };
    },
    view: input.outlet,
  };
}

/** Solid anchor component proxy bound through {@link setForgeSolidRouter}. */
export function MpLink(properties: {
  href?: string;
  to?: MpRouteLocationRaw;
  children?: unknown;
  replace?: boolean;
}): unknown {
  const surface = requireSurface();
  const Anchor = surface.A as (properties: Record<string, unknown>) => unknown;
  const href = properties.href ?? (properties.to === undefined ? '/' : toSolidHref(properties.to));
  return Anchor({ ...properties, href });
}

/** Solid outlet proxy bound through {@link setForgeSolidRouter}. */
export function MpRouterView(): unknown {
  const Outlet = requireSurface().Outlet as () => unknown;
  return Outlet();
}

/** Read the current app-owned route as {@link MpResolvedLocation}. */
export function useMpRoute(): MpResolvedLocation | null {
  const surface = requireSurface();
  return toMpLocationFromSolid(surface.useLocation(), surface.useParams());
}

/** Read the neutral capability object backed by Solid Router. */
export function useMpRouter(): MpRouterCapabilities {
  const surface = requireSurface();
  return createSolidRouterCapabilities({
    location: surface.useLocation(),
    params: surface.useParams(),
    navigate: surface.useNavigate(),
    outlet: surface.Outlet,
  });
}

/** Read only imperative navigation/resolve capabilities. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  const capabilities = useMpRouter();
  return { navigate: capabilities.navigate, resolve: capabilities.resolve };
}

/** Resolve a neutral target to an href string. */
export function resolveMpLink(to: MpRouteLocationRaw): string {
  return toSolidHref(to);
}
