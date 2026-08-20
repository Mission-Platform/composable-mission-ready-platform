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

/** Minimal SvelteKit surface used by the runtime shim. */
export interface SvelteKitRouterSurface {
  goto: (url: string, options?: { replaceState?: boolean; state?: unknown }) => Promise<void>;
  getPage: () => { url: URL; params: Record<string, string> };
  resolvePath?: (path: string) => string;
}

let boundSurface: SvelteKitRouterSurface | undefined;

/**
 * Bind SvelteKit page/navigation APIs for compiled package capabilities.
 * Apps typically call this once from a root layout with `$app` modules.
 */
export function setForgeSvelteKitRouter(surface: SvelteKitRouterSurface): void {
  boundSurface = surface;
}

function requireSurface(): SvelteKitRouterSurface {
  if (!boundSurface) {
    throw new Error('A SvelteKit router surface must be bound with setForgeSvelteKitRouter().');
  }
  return boundSurface;
}

/** Serialize a neutral target for SvelteKit navigation. */
export function toSvelteHref(to: MpRouteLocationRaw, resolvePath?: (path: string) => string): string {
  if (typeof to === 'string') return resolvePath?.(to) ?? to;
  if ('path' in to) {
    const href = stringifyLocation(to);
    if (!resolvePath) return href;
    const location = parseLocation(href);
    return `${resolvePath(location.path)}${href.slice(location.path.length)}`;
  }
  throw new Error('Named SvelteKit targets require application route helpers; use path-based targets.');
}

/** Build a neutral location from a SvelteKit page snapshot. */
export function toMpLocationFromSvelte(page: {
  url: Pick<URL, 'pathname' | 'search' | 'hash'>;
  params: Record<string, string>;
}): MpResolvedLocation {
  const query = parseQuery(page.url.search) as MpQueryParameters;
  return {
    path: page.url.pathname,
    fullPath: `${page.url.pathname}${page.url.search}${page.url.hash}`,
    params: page.params as MpRouteParameters,
    query,
    hash: page.url.hash,
  };
}

/** Build neutral capabilities from SvelteKit primitives (framework-free for tests). */
export function createSvelteKitRouterCapabilities(input: {
  page: { url: Pick<URL, 'pathname' | 'search' | 'hash'>; params: Record<string, string> };
  goto: SvelteKitRouterSurface['goto'];
  resolvePath?: (path: string) => string;
}): MpRouterCapabilities {
  const current = toMpLocationFromSvelte(input.page);
  return {
    link: (to, options?: MpLinkOptions) => ({
      href: toSvelteHref(to, input.resolvePath),
      replace: options?.replace ?? false,
    }),
    route: () => current,
    navigate: async (to, options?: MpNavigationOptions) => {
      await input.goto(toSvelteHref(to, input.resolvePath), {
        replaceState: options?.replace,
        state: options?.state,
      });
    },
    resolve: (to) => {
      const href = toSvelteHref(to, input.resolvePath);
      const location = parseLocation(href);
      return {
        ...location,
        fullPath: stringifyLocation(location),
        params: {},
      };
    },
    // SvelteKit owns the page outlet via routing conventions; view is unsupported here.
    view: undefined,
  };
}

/**
 * SvelteKit uses normal anchors for links. The compiler keeps this marker so
 * Svelte output can type-check package authors' neutral `MpLink` usage.
 */
export const MpLink = 'a';

/** Outlet is application-owned in SvelteKit; capability diagnostics reject `view`. */
export const MpRouterView = undefined;

/** Route reads are supported through the bound page surface for navigate/resolve packages. */
export function useMpRoute(): MpResolvedLocation | null {
  return toMpLocationFromSvelte(requireSurface().getPage());
}

/** Read the neutral capability object backed by SvelteKit navigation. */
export function useMpRouter(): MpRouterCapabilities {
  const surface = requireSurface();
  return createSvelteKitRouterCapabilities({
    page: surface.getPage(),
    goto: surface.goto,
    resolvePath: surface.resolvePath,
  });
}

/** Read only imperative navigation/resolve capabilities. */
export function useMpNavigation(): Pick<MpRouterCapabilities, 'navigate' | 'resolve'> {
  const capabilities = useMpRouter();
  return { navigate: capabilities.navigate, resolve: capabilities.resolve };
}

/** Resolve a neutral target to an href string. */
export function resolveMpLink(to: MpRouteLocationRaw): string {
  return toSvelteHref(to, boundSurface?.resolvePath);
}
