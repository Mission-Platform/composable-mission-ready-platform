# `@mission-platform/router`

Framework-agnostic routing for Mission Platform apps. Define your routes and
navigation targets **once** in a small, framework-neutral model, then let a
per-framework adapter wire them into a real router.

- **Framework-neutral core** (`@mission-platform/router`) — the route/location
  model (`MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation`) plus pure,
  dependency-free helpers:
  - path patterns: `compilePath`, `matchPath`, `buildPath`, `normalizePath`
  - query strings: `parseQuery`, `stringifyQuery`
  - locations: `parseLocation`, `stringifyLocation`, `normalizeHash`
  - route trees: `defineRoutes`, `flattenRoutes`, `findRouteByName`,
    `matchRoutes`, `resolveLocation`, `createRouteResolver`
- **Vue 3 adapter** (`@mission-platform/router/vue`, built on `vue-router` 4) —
  `createMpRouter`, `useMpRouter`, `useMpRoute`, `MpRouterLink`, plus the
  `toVueRoutes` / `toVueLocation` translators.

The neutral path grammar (`:param`, `:param?`, `:param*` / `:param+`, and a
standalone `*` catch-all) mirrors vue-router's, so translation is near
pass-through and the same `MpRoute` tree is designed to extend to react-router,
TanStack Router, Next.js, and Nuxt as further adapters are added.

## Install

```bash
pnpm add @mission-platform/router
# the Vue adapter also needs vue-router (an optional peer dependency)
pnpm add vue-router
```

## Define routes once

```ts
import { defineRoutes } from '@mission-platform/router';

export const routes = defineRoutes([
  { path: '/', name: 'home' },
  {
    path: '/users',
    name: 'users',
    meta: { auth: true },
    children: [{ path: ':id', name: 'user' }],
  },
  { path: '/files/*', name: 'files' },
]);
```

## Vue 3

```ts
// main.ts
import { createApp } from 'vue';
import { createMpRouter } from '@mission-platform/router/vue';
import App from './App.vue';
import { routes } from './routes';

const router = createMpRouter({ routes, history: 'web' });
createApp(App).use(router).mount('#app');
```

```vue
<script setup lang="ts">
  import { MpRouterLink, useMpRoute, useMpRouter } from '@mission-platform/router/vue';

  const route = useMpRoute();
  const { push } = useMpRouter();
</script>

<template>
  <nav>
    <MpRouterLink :to="{ name: 'user', params: { id: 42 } }">Profile</MpRouterLink>
    <button @click="push('/')">Home</button>
  </nav>
  <p>Current: {{ route.fullPath }}</p>
</template>
```

## Framework-neutral resolution (no framework required)

```ts
import { matchRoutes, resolveLocation } from '@mission-platform/router';
import { routes } from './routes';

matchRoutes(routes, '/users/42'); // → { flat, params: { id: '42' } }
resolveLocation({ name: 'user', params: { id: 42 } }, routes).fullPath; // → '/users/42'
resolveLocation('/files/a/b', routes).params; // → { pathMatch: ['a', 'b'] }
```

## API

- **Core** — `defineRoutes`, `flattenRoutes`, `findRouteByName`, `matchRoutes`,
  `resolveLocation`, `createRouteResolver`, `compilePath`, `matchPath`,
  `buildPath`, `normalizePath`, `parseQuery`, `stringifyQuery`, `parseLocation`,
  `stringifyLocation`, `normalizeHash`.
- **Vue** — `createMpRouter`, `useMpRouter`, `useMpRoute`, `MpRouterLink`,
  `toVueRoutes`, `toVueLocation` (and a re-export of the entire core).
