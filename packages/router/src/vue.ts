// ─── @mission-platform/router/vue ────────────────────────────────────────────
// Vue 3 adapter for the framework-agnostic router, built on `vue-router` 4.
//
// It translates the neutral `MpRoute` tree into vue-router records, builds a
// ready-to-install `Router`, and exposes neutral composables (`useMpRouter`,
// `useMpRoute`) plus an `MpRouterLink` component whose `to` accepts the neutral
// `MpRouteLocationRaw`.

import { computed, defineComponent, h } from 'vue';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  RouterLink,
  useRoute,
  useRouter,
} from 'vue-router';

import { normalizeHash } from './location';
import { normalizePath } from './path';

import type {
  MpHistoryMode,
  MpResolvedLocation,
  MpRoute,
  MpRouteLocationRaw,
  MpRouteMeta,
  MpRouteParameters,
} from './types';
import type { ComputedRef, PropType, VNode } from 'vue';
import type {
  LocationQuery,
  RouteLocationRaw,
  RouteMeta,
  RouteParams,
  RouteRecordName,
  RouteRecordRaw,
  Router,
  RouterHistory,
  RouterOptions,
} from 'vue-router';

export * from '.';

/** Replace the neutral standalone `*` catch-all with vue-router's syntax. */
function toVuePath(pattern: string): string {
  return pattern
    .split('/')
    .map((segment) => (segment === '*' ? ':pathMatch(.*)*' : segment))
    .join('/');
}

/** Convert a single neutral route into a vue-router record. */
function toVueRoute(route: MpRoute): RouteRecordRaw {
  const record: Record<string, unknown> = { path: toVuePath(route.path) };
  if (route.name !== undefined) {
    record.name = route.name;
  }
  if (route.meta !== undefined) {
    record.meta = route.meta;
  }
  if (route.redirect !== undefined) {
    record.redirect = toVueLocation(route.redirect);
  }
  if (route.component !== undefined) {
    record.component = route.component;
  } else if (route.lazy !== undefined) {
    record.component = route.lazy;
  }
  if (route.children && route.children.length > 0) {
    record.children = toVueRoutes(route.children);
  }
  return record as unknown as RouteRecordRaw;
}

/**
 * Translate a neutral {@link MpRoute} tree into vue-router
 * {@link RouteRecordRaw} records, preserving names, metadata, redirects, lazy
 * components, and nesting.
 */
export function toVueRoutes(routes: readonly MpRoute[]): RouteRecordRaw[] {
  return routes.map((route) => toVueRoute(route));
}

/**
 * Convert a neutral {@link MpRouteLocationRaw} into a vue-router
 * {@link RouteLocationRaw} suitable for `router.push`/`replace`/`resolve`.
 */
export function toVueLocation(to: MpRouteLocationRaw): RouteLocationRaw {
  if (typeof to === 'string') {
    return to;
  }

  const hash = normalizeHash(to.hash ?? '');
  if ('name' in to) {
    return { name: to.name, params: to.params, query: to.query, hash } as RouteLocationRaw;
  }
  return { path: normalizePath(to.path), query: to.query, hash } as RouteLocationRaw;
}

/** The subset of a vue-router route this adapter reads. */
interface VueRouteLike {
  path: string;
  fullPath: string;
  params: RouteParams;
  query: LocationQuery;
  hash: string;
  name: RouteRecordName | null | undefined;
  meta: RouteMeta;
}

/** Copy vue-router params into a plain neutral params map. */
function toMpParameters(parameters: RouteParams): MpRouteParameters {
  const result: MpRouteParameters = {};
  for (const key of Object.keys(parameters)) {
    result[key] = parameters[key];
  }
  return result;
}

/** Normalise vue-router's nullable query into the neutral query shape. */
function toMpQuery(query: LocationQuery): MpResolvedLocation['query'] {
  const result: MpResolvedLocation['query'] = {};
  for (const key of Object.keys(query)) {
    const value = query[key];
    if (value === null) {
      result[key] = '';
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => item ?? '');
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Map a vue-router route into a neutral {@link MpResolvedLocation}. */
function toMpResolved(route: VueRouteLike): MpResolvedLocation {
  return {
    path: route.path,
    fullPath: route.fullPath,
    params: toMpParameters(route.params),
    query: toMpQuery(route.query),
    hash: route.hash,
    name: typeof route.name === 'string' ? route.name : undefined,
    meta: route.meta as MpRouteMeta,
  };
}

/** Build the vue-router history matching the neutral {@link MpHistoryMode}. */
function createHistory(mode: MpHistoryMode, base?: string): RouterHistory {
  switch (mode) {
    case 'hash': {
      return createWebHashHistory(base);
    }
    case 'memory': {
      return createMemoryHistory(base);
    }
    default: {
      return createWebHistory(base);
    }
  }
}

/** Options accepted by {@link createMpRouter}. */
export interface CreateMpRouterOptions {
  /** The framework-neutral route tree. */
  routes: readonly MpRoute[];
  /** History strategy. Defaults to `'web'` (use `'memory'` for SSR/tests). */
  history?: MpHistoryMode;
  /** Base path passed to the history factory. */
  base?: string;
  /** Escape hatch merged onto the generated vue-router options. */
  vueRouterOptions?: Partial<RouterOptions>;
}

/**
 * Create a ready-to-install vue-router {@link Router} from a neutral route tree.
 * The returned router is itself a Vue plugin: `app.use(createMpRouter({ … }))`.
 *
 * @example
 * import { createMpRouter } from '@mission-platform/router/vue'
 *
 * const router = createMpRouter({
 *   routes: [{ path: '/', name: 'home', component: Home }],
 * })
 * app.use(router)
 */
export function createMpRouter(options: CreateMpRouterOptions): Router {
  const { routes, history = 'web', base, vueRouterOptions } = options;
  return createRouter({
    history: createHistory(history, base),
    routes: toVueRoutes(routes),
    ...vueRouterOptions,
  });
}

/**
 * Reactive, neutral view of the current route. A thin wrapper over vue-router's
 * `useRoute` that maps the active route into an {@link MpResolvedLocation}.
 */
export function useMpRoute(): ComputedRef<MpResolvedLocation> {
  const route = useRoute();
  return computed(() => toMpResolved(route));
}

/** Return shape of {@link useMpRouter}. */
export interface UseMpRouterReturn {
  /** Reactive, neutral view of the current route. */
  currentRoute: ComputedRef<MpResolvedLocation>;
  /** Navigate to a location, pushing a history entry. */
  push: (to: MpRouteLocationRaw) => Promise<void>;
  /** Navigate to a location, replacing the current history entry. */
  replace: (to: MpRouteLocationRaw) => Promise<void>;
  /** Go back one history entry. */
  back: () => void;
  /** Go forward one history entry. */
  forward: () => void;
  /** Move `delta` entries through the history stack. */
  go: (delta: number) => void;
  /** Resolve a neutral location without navigating to it. */
  resolve: (to: MpRouteLocationRaw) => MpResolvedLocation;
}

/**
 * Composition helper exposing a neutral navigation API backed by vue-router:
 * `push`/`replace` (accepting the neutral {@link MpRouteLocationRaw}), history
 * controls, a neutral `resolve`, and the reactive current route.
 */
export function useMpRouter(): UseMpRouterReturn {
  const router = useRouter();
  const route = useRoute();

  return {
    currentRoute: computed(() => toMpResolved(route)),
    push: async (to: MpRouteLocationRaw): Promise<void> => {
      await router.push(toVueLocation(to));
    },
    replace: async (to: MpRouteLocationRaw): Promise<void> => {
      await router.replace(toVueLocation(to));
    },
    back: (): void => router.back(),
    forward: (): void => router.forward(),
    go: (delta: number): void => router.go(delta),
    resolve: (to: MpRouteLocationRaw): MpResolvedLocation => toMpResolved(router.resolve(toVueLocation(to))),
  };
}

/**
 * A drop-in `RouterLink` whose `to` accepts the framework-neutral
 * {@link MpRouteLocationRaw}. Delegates rendering to vue-router's `RouterLink`.
 *
 * @example
 * <MpRouterLink :to="{ name: 'user', params: { id: 42 } }">Profile</MpRouterLink>
 */
export const MpRouterLink = defineComponent({
  name: 'MpRouterLink',
  props: {
    to: { type: [String, Object] as PropType<MpRouteLocationRaw>, required: true },
    replace: { type: Boolean, default: false },
  },
  setup(properties, { slots }) {
    return (): VNode => h(RouterLink, { to: toVueLocation(properties.to), replace: properties.replace }, slots);
  },
});
