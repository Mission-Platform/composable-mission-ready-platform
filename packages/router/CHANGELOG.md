# @mission-platform/router

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata

## 0.2.0

### Minor Changes

- afcf930: add a framework-agnostic routing package with a vue-router adapter

  `@mission-platform/router` lets you describe routes and navigation targets once in a framework-neutral model and
  translate them into a real router per framework. The root entry is dependency-free — an `MpRoute` tree plus pure
  helpers for compiling/matching/building paths (`compilePath`, `matchPath`,
  `buildPath`, `normalizePath`), parsing/serialising query strings (`parseQuery`, `stringifyQuery`) and locations
  (`parseLocation`,
  `stringifyLocation`, `normalizeHash`), and flattening/resolving route trees (`defineRoutes`, `flattenRoutes`,
  `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`).

  The `@mission-platform/router/vue` adapter (built on `vue-router` 4, an optional peer dependency) ships
  `createMpRouter` (returns an installable `Router` with
  `web`/`hash`/`memory` history), the `useMpRouter`/`useMpRoute` composables, an
  `MpRouterLink` component whose `to` accepts the neutral location, and the
  `toVueRoutes`/`toVueLocation` translators. The neutral path grammar (`:param`,
  `:param?`, `:param*`/`:param+`, and a standalone `*` catch-all) mirrors vue-router's, so translation is near
  pass-through and the same `MpRoute` tree is designed to extend to react-router, TanStack Router, Next.js, and Nuxt.

### Patch Changes

- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
