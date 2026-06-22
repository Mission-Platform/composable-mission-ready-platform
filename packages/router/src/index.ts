// ─── @mission-platform/router ────────────────────────────────────────────────
// Framework-agnostic routing primitives for Mission Platform.
//
// The root entry is framework-neutral: it defines the route/location model and
// pure helpers for compiling, matching, building, and resolving routes. Pair it
// with a framework adapter to wire those routes into a real router:
//   • Vue 3 (vue-router) → `@mission-platform/router/vue`
//
// The same neutral `MpRoute` tree is designed to translate to react-router,
// TanStack Router, Next.js, and Nuxt as further adapters are added.

export { buildPath, compilePath, matchPath, normalizePath, WILDCARD_PARAM_KEY } from './path';
export type { MpCompiledPath, MpPathParameterKey } from './path';

export { parseQuery, stringifyQuery } from './query';

export { normalizeHash, parseLocation, stringifyLocation } from './location';
export type { MpLocationInput, MpLocationParts } from './location';

export {
  createRouteResolver,
  defineRoutes,
  findRouteByName,
  flattenRoutes,
  matchRoutes,
  resolveLocation,
} from './define-routes';
export type { MpFlatRoute, MpRouteMatch, MpRouteResolver } from './define-routes';

export type {
  MpHistoryMode,
  MpNamedLocation,
  MpParameterValue,
  MpPathLocation,
  MpQueryInput,
  MpQueryParameters,
  MpResolvedLocation,
  MpRoute,
  MpRouteLocationRaw,
  MpRouteMeta,
  MpRouteParameters,
  MpRouter,
} from './types';
