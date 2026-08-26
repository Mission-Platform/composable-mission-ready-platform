import { parseLocation, stringifyLocation } from '@mission-platform/router';
import {
  RouterView,
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
  type RouteLocationRaw,
  type Router,
} from 'vue-router';

import type {
  MpLinkOptions,
  MpNavigationOptions,
  MpResolvedLocation,
  MpRouteLocationRaw,
  MpRouteParameters,
  MpRouterCapabilities,
  MpQueryParameters,
} from '@mission-platform/router';

/** Translate a neutral target into a Vue Router location. */
export function toVueLocation(to: MpRouteLocationRaw): RouteLocationRaw {
  if (typeof to === 'string') return to;

  const query = to.query
    ? (Object.fromEntries(
        Object.entries(to.query).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? value.map((item) => (item == undefined ? item : String(item)))
            : value == undefined
              ? value
              : String(value),
        ]),
      ) as LocationQueryRaw)
    : undefined;

  if ('name' in to) {
    const parameters = to.params
      ? Object.fromEntries(
          Object.entries(to.params).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map(String) : value == undefined ? value : String(value),
          ]),
        )
      : undefined;
    return {
      name: to.name,
      params: parameters,
      query,
      hash: to.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : undefined,
    };
  }

  return {
    path: to.path,
    query,
    hash: to.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : undefined,
  };
}

function toParameters(parameters: Record<string, unknown>): MpRouteParameters {
  return Object.fromEntries(
    Object.entries(parameters).map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : String(value)]),
  );
}

function toQuery(query: LocationQuery): MpQueryParameters {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map((item) => item ?? '') : (value ?? ''),
    ]),
  );
}

/** Convert native Vue route state into the neutral resolved location. */
export function toMpLocation(route: {
  path: string;
  fullPath: string;
  params: Record<string, unknown>;
  query: LocationQuery;
  hash: string;
  name?: string | symbol | null;
  meta?: Record<string, unknown>;
}): MpResolvedLocation {
  return {
    path: route.path,
    fullPath: route.fullPath,
    params: toParameters(route.params),
    query: toQuery(route.query),
    hash: route.hash,
    name: typeof route.name === 'string' ? route.name : undefined,
    meta: route.meta,
  };
}

/** Build neutral capabilities from an app-owned Vue Router instance. */
export function createVueRouterCapabilities(router: Router, current = router.currentRoute.value): MpRouterCapabilities {
  return {
    link: (to, options?: MpLinkOptions) => ({
      to: toVueLocation(to),
      replace: options?.replace ?? false,
    }),
    route: () => toMpLocation(current),
    navigate: async (to, options?: MpNavigationOptions) => {
      const target = toVueLocation(to);
      await (options?.replace ? router.replace(target) : router.push(target));
    },
    resolve: (to) => toMpLocation(router.resolve(toVueLocation(to))),
    view: RouterView,
  };
}

/** Read the current app-owned route as {@link MpResolvedLocation}. */
export function useMpRoute(): MpResolvedLocation | null {
  return toMpLocation(useRoute());
}

/** Read the neutral capability object backed by Vue Router. */
export function useMpRouter(): MpRouterCapabilities {
  return createVueRouterCapabilities(useRouter(), useRoute());
}

/** Read only imperative navigation/resolve capabilities. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  const capabilities = useMpRouter();
  return { navigate: capabilities.navigate, resolve: capabilities.resolve };
}

/** Resolve a neutral target through the app-owned Vue Router. */
export function resolveMpLink(to: MpRouteLocationRaw): string {
  return useRouter().resolve(toVueLocation(to)).fullPath;
}

/** Path-only fallback used when a Vue Router instance is unavailable (SSR/tests). */
export function resolvePathTarget(to: MpRouteLocationRaw): string {
  if (typeof to === 'string') return parseLocation(to).path === to ? to : stringifyLocation(parseLocation(to));
  if ('path' in to) return stringifyLocation(to);
  throw new Error('Named Vue route targets require an installed Vue Router instance.');
}

export { RouterLink as MpLink, RouterView as MpRouterView } from 'vue-router';
