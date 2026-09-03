// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-neutral route-tree helpers: definition, flattening, lookup,
// matching, and location resolution.

import { normalizeHash, parseLocation, stringifyLocation } from './location';
import { buildPath, matchPath, normalizePath } from './path';

import type {
  MpNamedLocation,
  MpQueryInput,
  MpQueryParameters,
  MpResolvedLocation,
  MpRoute,
  MpRouteLocationRaw,
  MpRouteMeta,
  MpRouteParameters,
} from './types';

/**
 * Identity helper that defines a framework-neutral route tree with full type
 * inference. Use it so editors type-check route `name`s, `meta`, and children.
 *
 * @example
 * const routes = defineRoutes([
 *   { path: '/', name: 'home', component: Home },
 *   { path: '/users/:id', name: 'user', component: User },
 * ])
 */
export function defineRoutes<const T extends readonly MpRoute[]>(routes: T): T {
  return routes;
}

/** Join a parent base path with a child segment, resolving absolute children. */
function joinPaths(base: string, segment: string): string {
  if (segment.startsWith('/')) {
    return normalizePath(segment);
  }
  if (segment === '') {
    return normalizePath(base);
  }
  return normalizePath(base === '/' ? `/${segment}` : `${base}/${segment}`);
}

/** A route flattened to an absolute path, with inherited metadata and ancestors. */
export interface MpFlatRoute {
  /** The fully-resolved, absolute path pattern. */
  path: string;
  /** The route name, if any. */
  name?: string;
  /** Metadata for this route, merged over its ancestors' metadata. */
  meta: MpRouteMeta;
  /** The originating route definition. */
  route: MpRoute;
  /** The ancestor routes, outermost first. */
  parents: MpRoute[];
}

/**
 * Flatten a nested route tree into a depth-first list of absolute routes, with
 * each route's `path` resolved against its parents and `meta` inherited from
 * its ancestors.
 */
export function flattenRoutes(routes: readonly MpRoute[]): MpFlatRoute[] {
  const flat: MpFlatRoute[] = [];

  const walk = (entries: readonly MpRoute[], base: string, parents: MpRoute[], parentMeta: MpRouteMeta): void => {
    for (const route of entries) {
      const path = joinPaths(base, route.path);
      const meta: MpRouteMeta = { ...parentMeta, ...route.meta };
      flat.push({ path, name: route.name, meta, route, parents });
      if (route.children && route.children.length > 0) {
        walk(route.children, path, [...parents, route], meta);
      }
    }
  };

  walk(routes, '/', [], {});
  return flat;
}

/** Find the first flattened route with the given name. */
export function findRouteByName(routes: readonly MpRoute[], name: string): MpFlatRoute | undefined {
  return flattenRoutes(routes).find((entry) => entry.name === name);
}

/** A successful match of a pathname against a route tree. */
export interface MpRouteMatch {
  /** The flattened route that matched. */
  flat: MpFlatRoute;
  /** The path parameters extracted from the pathname. */
  params: MpRouteParameters;
}

/**
 * Match a pathname against a route tree, returning the first route (in
 * depth-first definition order) whose pattern matches, or `undefined`.
 */
export function matchRoutes(routes: readonly MpRoute[], pathname: string): MpRouteMatch | undefined {
  const cleaned = normalizePath(pathname.split('#')[0].split('?')[0]);
  for (const flat of flattenRoutes(routes)) {
    const parameters = matchPath(flat.path, cleaned);
    if (parameters) {
      return { flat, params: parameters };
    }
  }
  return undefined;
}

/** Coerce a raw query input into a resolved {@link MpQueryParameters} map. */
function coerceQuery(query: MpQueryInput): MpQueryParameters {
  const resolved: MpQueryParameters = {};
  for (const key of Object.keys(query)) {
    const value = query[key];
    if ((value ?? undefined) === undefined) {
      continue;
    }
    resolved[key] = Array.isArray(value)
      ? value.filter((item) => (item ?? undefined) !== undefined).map(String)
      : String(value);
  }
  return resolved;
}

/** Coerce named-location params into resolved string/string[] path params. */
function coerceParameters(parameters: MpNamedLocation['params']): MpRouteParameters {
  const resolved: MpRouteParameters = {};
  if (!parameters) {
    return resolved;
  }
  for (const key of Object.keys(parameters)) {
    const value = parameters[key];
    if ((value ?? undefined) === undefined) {
      continue;
    }
    resolved[key] = Array.isArray(value) ? value.map(String) : String(value);
  }
  return resolved;
}

/** Resolve a URL string (optionally matching it against a route tree). */
function resolveByUrl(url: string, routes: readonly MpRoute[]): MpResolvedLocation {
  const parts = parseLocation(url);
  const match = routes.length > 0 ? matchRoutes(routes, parts.path) : undefined;
  return {
    path: parts.path,
    fullPath: stringifyLocation(parts),
    params: match?.params ?? {},
    query: parts.query,
    hash: parts.hash,
    name: match?.flat.name,
    meta: match?.flat.meta,
  };
}

/** Resolve a named location by building its path from the route tree. */
function resolveByName(location: MpNamedLocation, routes: readonly MpRoute[]): MpResolvedLocation {
  const flat = findRouteByName(routes, location.name);
  if (!flat) {
    throw new Error(`No route found with name "${location.name}"`);
  }

  const path = buildPath(flat.path, location.params ?? {});
  const query = location.query ?? {};
  const hash = normalizeHash(location.hash ?? '');

  return {
    path,
    fullPath: stringifyLocation({ path, query, hash }),
    params: coerceParameters(location.params),
    query: coerceQuery(query),
    hash,
    name: location.name,
    meta: flat.meta,
  };
}

/**
 * Resolve any framework-neutral {@link MpRouteLocationRaw} into a fully-formed
 * {@link MpResolvedLocation}. String and path locations are matched against the
 * route tree (when provided) to populate `params`/`name`/`meta`; named
 * locations build their path from the matching route.
 *
 * @example
 * resolveLocation({ name: 'user', params: { id: 42 } }, routes)
 * // → { path: '/users/42', fullPath: '/users/42', params: { id: '42' }, … }
 */
export function resolveLocation(to: MpRouteLocationRaw, routes: readonly MpRoute[] = []): MpResolvedLocation {
  if (typeof to === 'string') {
    return resolveByUrl(to, routes);
  }
  if ('name' in to) {
    return resolveByName(to, routes);
  }
  return resolveByUrl(stringifyLocation(to), routes);
}

/** A resolver bound to a single route tree. */
export interface MpRouteResolver {
  /** Match a pathname against the bound routes. */
  match: (pathname: string) => MpRouteMatch | undefined;
  /** Resolve a neutral location against the bound routes. */
  resolve: (to: MpRouteLocationRaw) => MpResolvedLocation;
  /** The flattened, absolute routes backing this resolver. */
  routes: MpFlatRoute[];
}

/**
 * Create a {@link MpRouteResolver} bound to a route tree, flattening it once so
 * repeated `match`/`resolve` calls reuse the same absolute route list.
 */
export function createRouteResolver(routes: readonly MpRoute[]): MpRouteResolver {
  return {
    match: (pathname) => matchRoutes(routes, pathname),
    resolve: (to) => resolveLocation(to, routes),
    routes: flattenRoutes(routes),
  };
}
