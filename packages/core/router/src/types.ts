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
export interface MpRoute<View = unknown> {
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
  component?: View | (() => Promise<View>);
  /** Optional lazy component loader (`() => import('./View')`). */
  lazy?: () => Promise<View>;
  /** Redirect target (a path string or a neutral location) for this route. */
  redirect?: MpRedirect;
  /** Guards are evaluated by a runtime before entering the record. */
  beforeEnter?: MpRouteGuard | readonly MpRouteGuard[];
  /** Nested child routes, with `path`s resolved relative to this route. */
  children?: readonly MpRoute<View>[];
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

/** A redirect target, optionally computed from the destination route. */
export type MpRedirect =
  MpRouteLocationRaw | ((to: MpResolvedLocation) => MpRouteLocationRaw | Promise<MpRouteLocationRaw>);

/** The result returned by a route guard before a transition is committed. */
export type MpGuardOutcome = void | boolean | MpRouteLocationRaw;

/** A route guard evaluated by a runtime-owned navigation state machine. */
export type MpRouteGuard = (
  to: MpResolvedLocation,
  from: MpResolvedLocation | null,
) => MpGuardOutcome | Promise<MpGuardOutcome>;

/** A transition operation initiated by a router or history implementation. */
export type MpNavigationType = 'push' | 'replace' | 'pop' | 'go';

export interface MpNavigationContext {
  to: MpResolvedLocation;
  from: MpResolvedLocation | null;
  type: MpNavigationType;
}

export type MpNavigationFailureType = 'aborted' | 'cancelled' | 'duplicated' | 'error' | 'not-found';

export interface MpNavigationSuccess {
  type: 'success';
  ok: true;
  to: MpResolvedLocation;
  from: MpResolvedLocation | null;
}

export interface MpNavigationRedirect {
  type: 'redirect';
  ok: false;
  to: MpResolvedLocation;
  from: MpResolvedLocation | null;
  redirectTo: MpRouteLocationRaw;
}

export interface MpNavigationFailure {
  type: 'failure';
  ok: false;
  to: MpResolvedLocation;
  from: MpResolvedLocation | null;
  failureType: MpNavigationFailureType;
  error?: unknown;
}

export type MpNavigationResult = MpNavigationSuccess | MpNavigationRedirect | MpNavigationFailure;

export interface MpHistoryEntry {
  url: string;
  state?: unknown;
  key?: string;
}

export interface MpHistoryEvent {
  type: MpNavigationType;
  from: MpHistoryEntry;
  to: MpHistoryEntry;
  delta?: number;
}

export type MpHistoryListener = (event: MpHistoryEvent) => void;

/** A browser, hash, or memory history implementation supplied by a runtime. */
export interface MpHistory {
  readonly location: string;
  readonly state?: unknown;
  push: (url: string, state?: unknown) => void | Promise<void>;
  replace: (url: string, state?: unknown) => void | Promise<void>;
  back: () => void | Promise<void>;
  forward: () => void | Promise<void>;
  go: (delta: number) => void | Promise<void>;
  listen: (listener: MpHistoryListener) => () => void;
}

export interface MpScrollPosition {
  left?: number;
  top?: number;
  /** A selector or runtime-specific element reference, never a DOM type. */
  target?: string;
  behavior?: 'auto' | 'smooth';
}

export type MpScrollBehavior = (
  to: MpResolvedLocation,
  from: MpResolvedLocation | null,
  savedPosition?: MpScrollPosition,
) => MpScrollPosition | false | void | Promise<MpScrollPosition | false | void>;

export interface MpMetadataContext {
  to: MpResolvedLocation;
  from: MpResolvedLocation | null;
}

export interface MpRouteMetadata extends MpRouteMeta {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
}

export type MpMetadataHook = (context: MpMetadataContext) => MpRouteMetadata | void | Promise<MpRouteMetadata | void>;

export interface MpRouteChangeEvent {
  type: 'start' | 'success' | 'redirect' | 'failure';
  to: MpResolvedLocation;
  from: MpResolvedLocation | null;
  result?: MpNavigationResult;
}

export type MpRouteChangeListener = (event: MpRouteChangeEvent) => void;

/** Structural reactive state used by adapters without prescribing a framework primitive. */
export interface MpReadonlySignal<Value> {
  readonly value: Value;
  subscribe: (listener: (value: Value) => void) => () => void;
}

export interface MpRouteLink {
  readonly to: MpRouteLocationRaw;
  readonly href: string;
  readonly active: boolean;
  readonly exactActive: boolean;
  readonly replace: boolean;
  navigate: () => Promise<MpNavigationResult>;
}

export interface MpRouteViewContext<View = unknown> {
  route: MpResolvedLocation;
  view: View;
}

export interface MpRouteViewAdapter<View = unknown, Outlet = unknown> {
  mount: (context: MpRouteViewContext<View>, outlet: Outlet) => void | Promise<void>;
  unmount?: (outlet: Outlet) => void | Promise<void>;
}

/** Runtime-owned router state and navigation contract. */
export interface MpRouterAdapter {
  readonly current: MpReadonlySignal<MpResolvedLocation | null>;
  resolve: (to: MpRouteLocationRaw) => MpResolvedLocation;
  push: (to: MpRouteLocationRaw) => Promise<MpNavigationResult>;
  replace: (to: MpRouteLocationRaw) => Promise<MpNavigationResult>;
  back: () => Promise<MpNavigationResult>;
  forward?: () => Promise<MpNavigationResult>;
  go?: (delta: number) => Promise<MpNavigationResult>;
  subscribe: (listener: MpRouteChangeListener) => () => void;
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
