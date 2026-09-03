import { parseLocation, parseQuery, stringifyLocation, stringifyQuery } from '@mission-platform/router';
import { Outlet, useLocation, useNavigate, useParams, type NavigateFunction, type To } from 'react-router';

import type {
  MpLinkOptions,
  MpNavigationOptions,
  MpQueryParameters,
  MpResolvedLocation,
  MpRouteLocationRaw,
  MpRouteParameters,
  MpRouterCapabilities,
} from '@mission-platform/router';

/** Convert a neutral target into a React Router `To` value. */
export function toReactTo(to: MpRouteLocationRaw): To {
  if (typeof to === 'string') return to;
  if ('path' in to) {
    return {
      pathname: to.path,
      search: to.query ? stringifyQuery(to.query) : '',
      hash: to.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : '',
    };
  }
  throw new Error('Named React Router targets require an application route table; use path-based targets.');
}

/** Serialize a neutral target to an href string. */
export function toReactHref(to: MpRouteLocationRaw): string {
  if (typeof to === 'string') return to;
  if ('path' in to) return stringifyLocation(to);
  throw new Error('Named React Router targets require an application route table; use path-based targets.');
}

/** Build a neutral location from React Router location/params snapshots. */
export function toMpLocationFromReact(
  location: { pathname: string; search: string; hash: string },
  parameters: Record<string, string | undefined> = {},
): MpResolvedLocation {
  const query = parseQuery(location.search) as MpQueryParameters;
  const normalizedParameters: MpRouteParameters = Object.fromEntries(
    Object.entries(parameters)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([key, value]) => [key, value]),
  );
  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  return {
    path: location.pathname,
    fullPath,
    params: normalizedParameters,
    query,
    hash: location.hash,
  };
}

/** Build neutral capabilities from React Router primitives (hook-free for tests). */
export function createReactRouterCapabilities(input: {
  location: { pathname: string; search: string; hash: string };
  params?: Record<string, string | undefined>;
  navigate: NavigateFunction;
  outlet?: unknown;
}): MpRouterCapabilities {
  const current = toMpLocationFromReact(input.location, input.params);
  return {
    link: (to, options?: MpLinkOptions) => ({ to: toReactTo(to), replace: options?.replace ?? false }),
    route: () => current,
    navigate: async (to, options?: MpNavigationOptions) => {
      input.navigate(toReactTo(to), { replace: options?.replace, state: options?.state });
    },
    resolve: (to) => {
      const href = toReactHref(to);
      const location = parseLocation(href);
      return {
        ...location,
        fullPath: stringifyLocation(location),
        params: {},
      };
    },
    view: input.outlet ?? Outlet,
  };
}

/** Read the current app-owned route as {@link MpResolvedLocation}. */
export function useMpRoute(): MpResolvedLocation | null {
  return toMpLocationFromReact(useLocation(), useParams());
}

/** Read the neutral capability object backed by React Router. */
export function useMpRouter(): MpRouterCapabilities {
  return createReactRouterCapabilities({
    location: useLocation(),
    params: useParams(),
    navigate: useNavigate(),
    outlet: Outlet,
  });
}

/** Read only imperative navigation/resolve capabilities. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  const capabilities = useMpRouter();
  return { navigate: capabilities.navigate, resolve: capabilities.resolve };
}

/** Resolve a neutral target to an href string. */
export function resolveMpLink(to: MpRouteLocationRaw): string {
  return toReactHref(to);
}

export { Link as MpLink, Outlet as MpRouterView } from 'react-router';
