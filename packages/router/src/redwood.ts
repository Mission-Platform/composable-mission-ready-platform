// ─── @mission-platform/router/redwood ────────────────────────────────────────
// RedwoodSDK adapter for the framework-agnostic router, built on `rwsdk/router`.
//
// RedwoodSDK (React-on-Cloudflare) uses a flat, request/response route table
// declared with `route()` and grouped with `render()`/`prefix()`/`layout()`.
// This adapter translates the neutral `MpRoute` tree — including nested children
// and metadata — into `rwsdk` route definitions, converts neutral path patterns
// into Redwood's `:param` / `*` grammar, and exposes neutral helpers for
// wrapping routes in a Document (`renderRoutes`) and for building hrefs
// (`redwoodHref`, `createRedwoodLinks`).

import { createElement } from 'react';
import { render, route } from 'rwsdk/router';

import { flattenRoutes, resolveLocation } from './define-routes';
import { normalizePath } from './path';

import type { MpRoute, MpRouteLocationRaw } from './types';
import type { FC } from 'react';
import type { DocumentProps, RouteDefinition } from 'rwsdk/router';

export * from '.';

/** Matches a `:name`, `:name?`, `:name*`, or `:name+` segment. */
const SEGMENT_PARAMETER = /^:([A-Za-z0-9_]+)([?*+]?)$/;

/**
 * The handler accepted by `rwsdk`'s `route()` — a request handler, a React
 * route component, a middleware chain, or a per-method handler map. Derived
 * from `route` itself so it stays in sync with the installed `rwsdk` version.
 */
export type RedwoodRouteHandler = Parameters<typeof route>[1];

/**
 * Translate a neutral path pattern into RedwoodSDK's grammar. Redwood supports
 * only `:param` segments and a `*` wildcard (captured as `$0`), so the neutral
 * modifiers are downgraded:
 *
 * - `:name`  → `:name`
 * - `:name?` → `:name` (Redwood has no optional segment; the modifier is dropped)
 * - `:name*` / `:name+` → `*` (repeatable segments become a wildcard)
 * - `*`      → `*`
 *
 * @example
 * toRedwoodPath('/users/:id')   // → '/users/:id'
 * toRedwoodPath('/files/:rest*') // → '/files/*'
 */
export function toRedwoodPath(pattern: string): string {
  return normalizePath(pattern)
    .split('/')
    .map((segment) => {
      if (segment === '*') {
        return '*';
      }
      const match = SEGMENT_PARAMETER.exec(segment);
      if (!match) {
        return segment;
      }
      const [, name, modifier] = match;
      if (modifier === '*' || modifier === '+') {
        return '*';
      }
      return `:${name}`;
    })
    .join('/');
}

/**
 * Resolve the RedwoodSDK handler for a single neutral route:
 *
 * - `redirect` routes become a handler that returns a `302` response whose
 *   `Location` is the resolved target.
 * - `component` routes pass the component straight through as the handler.
 * - `lazy` routes become an async handler that imports the module and renders
 *   its default (or namespace) export as a React element.
 *
 * Grouping/layout-only nodes with none of the above yield `undefined` and are
 * skipped when flattening.
 */
function redwoodHandlerFor(route_: MpRoute, routes: readonly MpRoute[]): RedwoodRouteHandler | undefined {
  if (route_.redirect !== undefined) {
    const location = resolveLocation(route_.redirect, routes).fullPath;
    return (() =>
      new Response(null, { status: 302, headers: { Location: location } })) as unknown as RedwoodRouteHandler;
  }
  if (route_.component !== undefined) {
    return route_.component as RedwoodRouteHandler;
  }
  if (route_.lazy !== undefined) {
    const load = route_.lazy;
    return (async (requestInfo: unknown) => {
      const module = (await load()) as { default?: unknown };
      const component = (module.default ?? module) as FC<Record<string, unknown>>;
      return createElement(component, requestInfo as Record<string, unknown>);
    }) as unknown as RedwoodRouteHandler;
  }
  return undefined;
}

/**
 * Translate a neutral {@link MpRoute} tree into a flat list of RedwoodSDK
 * {@link RouteDefinition}s. The tree is flattened to absolute paths (Redwood's
 * route table is flat), each path is converted with {@link toRedwoodPath}, and
 * only routes that resolve to a handler (component, lazy, or redirect) are
 * emitted — pure grouping nodes are dropped.
 *
 * @example
 * import { defineApp } from 'rwsdk/worker'
 * import { toRedwoodRoutes } from '@mission-platform/router/redwood'
 *
 * defineApp(toRedwoodRoutes([
 *   { path: '/', component: HomePage },
 *   { path: '/users/:id', component: UserPage },
 * ]))
 */
export function toRedwoodRoutes(routes: readonly MpRoute[]): RouteDefinition[] {
  const definitions: RouteDefinition[] = [];
  for (const entry of flattenRoutes(routes)) {
    const handler = redwoodHandlerFor(entry.route, routes);
    if (handler === undefined) {
      continue;
    }
    definitions.push(route(toRedwoodPath(entry.path), handler));
  }
  return definitions;
}

/** Options forwarded to `rwsdk`'s `render()`. */
export interface RenderRoutesOptions {
  /** Toggle the RSC payload appended to the Document (disables interactivity). */
  rscPayload?: boolean;
  /** Disable server-side rendering for these routes (client-side only). */
  ssr?: boolean;
}

/**
 * Wrap a neutral route tree in a RedwoodSDK Document, mirroring `rwsdk`'s
 * `render(Document, routes, options)`. Returns the value produced by `render`,
 * ready to be spread into `defineApp([...])`.
 *
 * @example
 * import { defineApp } from 'rwsdk/worker'
 * import { renderRoutes } from '@mission-platform/router/redwood'
 *
 * defineApp([
 *   renderRoutes(Document, [{ path: '/', component: HomePage }]),
 * ])
 */
export function renderRoutes(
  Document: FC<DocumentProps>,
  routes: readonly MpRoute[],
  options?: RenderRoutesOptions,
): ReturnType<typeof render> {
  return render(Document, toRedwoodRoutes(routes), options);
}

/**
 * Resolve any neutral {@link MpRouteLocationRaw} into an app-relative href
 * (path + query + hash). Named locations are built from the route tree; string
 * and path locations are normalised. Useful for `href`s in RedwoodSDK, which
 * navigates with plain anchors rather than a client router.
 *
 * @example
 * redwoodHref({ name: 'user', params: { id: 42 } }, routes) // → '/users/42'
 */
export function redwoodHref(to: MpRouteLocationRaw, routes: readonly MpRoute[] = []): string {
  return resolveLocation(to, routes).fullPath;
}

/**
 * Create an href builder bound to a route tree, so components can turn neutral
 * locations into strings without threading the routes through every call.
 *
 * @example
 * const href = createRedwoodLinks(routes)
 * <a href={href({ name: 'user', params: { id: 42 } })}>Profile</a>
 */
export function createRedwoodLinks(routes: readonly MpRoute[]): (to: MpRouteLocationRaw) => string {
  return (to: MpRouteLocationRaw): string => redwoodHref(to, routes);
}
