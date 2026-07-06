// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-neutral routing types shared by the core and every adapter.
//
// The same `MpRoute` tree and `MpRouteLocationRaw` navigation targets describe a
// route map for any target router — vue-router, react-router, TanStack Router —
// or any file-based convention (Next.js, Nuxt). Each adapter translates these
// neutral shapes into its framework's native equivalents.

/** A single, framework-neutral path/query parameter input value. */
export type MpParameterValue = string | number | boolean | null | undefined;

/**
 * Resolved path parameters extracted from a matched route. A value is an array
 * only for repeatable (catch-all) segments such as `:rest*`.
 */
export type MpRouteParameters = Record<string, string | string[]>;

/**
 * Raw, framework-neutral query input. Values may be scalars or arrays (repeated
 * keys); `null`/`undefined` values are dropped when serialised.
 */
export type MpQueryInput = Record<string, MpParameterValue | readonly MpParameterValue[]>;

/** Parsed query parameters: a scalar string or an array of strings per key. */
export type MpQueryParameters = Record<string, string | string[]>;

/** Arbitrary, framework-neutral metadata attached to a route. */
export type MpRouteMeta = Record<string, unknown>;

/**
 * A framework-neutral route definition. The same tree can be translated into
 * any target router (vue-router, react-router, TanStack Router) or file-based
 * convention (Next.js, Nuxt) by an adapter.
 */
export interface MpRoute {
  /**
   * The route's path pattern. Supports `:param` segments (`/users/:id`),
   * optional `:param?` segments, repeatable `:param*` / `:param+` segments, and
   * a standalone `*` catch-all. Child `path`s are resolved relative to their
   * parent unless they begin with `/`.
   */
  path: string;
  /** A unique, framework-neutral route name used for name-based navigation. */
  name?: string;
  /**
   * The view rendered for this route. Left as `unknown` so the neutral layer
   * carries no framework dependency; adapters cast it to their own component
   * type (or use it to resolve a lazy import / file path).
   */
  component?: unknown;
  /** Optional lazy component loader (`() => import('./View')`). */
  lazy?: () => Promise<unknown>;
  /** Redirect target (a path string or a neutral location) for this route. */
  redirect?: MpRouteLocationRaw;
  /** Nested child routes, with `path`s resolved relative to this route. */
  children?: MpRoute[];
  /** Arbitrary metadata (auth flags, layout hints, titles, …). */
  meta?: MpRouteMeta;
}

/** A navigation target expressed by path. */
export interface MpPathLocation {
  /** An absolute or relative path (`/users` or `users`). */
  path: string;
  /** Query parameters to append. */
  query?: MpQueryInput;
  /** Hash fragment, with or without a leading `#`. */
  hash?: string;
}

/** A navigation target expressed by route name. */
export interface MpNamedLocation {
  /** The target route's {@link MpRoute.name}. */
  name: string;
  /** Path parameters used to fill the route's `:param` segments. */
  params?: Record<string, MpParameterValue | readonly MpParameterValue[]>;
  /** Query parameters to append. */
  query?: MpQueryInput;
  /** Hash fragment, with or without a leading `#`. */
  hash?: string;
}

/** A framework-neutral navigation target: a URL string or a structured object. */
export type MpRouteLocationRaw = string | MpPathLocation | MpNamedLocation;

/** A fully resolved location, framework-neutral. */
export interface MpResolvedLocation {
  /** The pathname only (no query or hash). */
  path: string;
  /** The full app-relative URL (path + query + hash). */
  fullPath: string;
  /** Path parameters extracted from the matched route. */
  params: MpRouteParameters;
  /** Parsed query parameters. */
  query: MpQueryParameters;
  /** The hash fragment including the leading `#`, or an empty string. */
  hash: string;
  /** The matched route's name, if any. */
  name?: string;
  /** The matched route's metadata, if any. */
  meta?: MpRouteMeta;
}

/**
 * The history strategy an adapter's router should use.
 *
 * - `web` — HTML5 history (clean URLs), the default for browser apps.
 * - `hash` — hash-based history (`/#/path`), for static hosting without
 *   server rewrites.
 * - `memory` — in-memory history with no URL, for SSR and tests.
 */
export type MpHistoryMode = 'web' | 'hash' | 'memory';

/**
 * The framework-neutral navigation contract every adapter fulfils. Adapters may
 * expose reactive equivalents (e.g. the Vue adapter's `useMpRoute` returns a
 * reactive ref), but the imperative surface is the same everywhere.
 */
export interface MpRouter {
  /** The currently active, resolved location. */
  readonly currentRoute: MpResolvedLocation;
  /** Navigate to a new location, pushing a history entry. */
  push: (to: MpRouteLocationRaw) => Promise<void>;
  /** Navigate to a new location, replacing the current history entry. */
  replace: (to: MpRouteLocationRaw) => Promise<void>;
  /** Go back one history entry. */
  back: () => void;
  /** Go forward one history entry. */
  forward: () => void;
  /** Move `delta` entries through the history stack. */
  go: (delta: number) => void;
  /** Resolve a location without navigating to it. */
  resolve: (to: MpRouteLocationRaw) => MpResolvedLocation;
}
