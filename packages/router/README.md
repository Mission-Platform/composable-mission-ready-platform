# `@mission-platform/router`

Framework-agnostic routing for Mission Platform apps. Define your routes and navigation targets **once** in a small,
framework-neutral model, then let a per-framework adapter wire them into a real router.

- **Framework-neutral core** (`@mission-platform/router`) — the route/location model (`MpRoute`, `MpRouteLocationRaw`,
  `MpResolvedLocation`) plus pure, dependency-free helpers:
  - path patterns: `compilePath`, `matchPath`, `buildPath`, `normalizePath`
  - query strings: `parseQuery`, `stringifyQuery`
  - locations: `parseLocation`, `stringifyLocation`, `normalizeHash`
  - route trees: `defineRoutes`, `flattenRoutes`, `findRouteByName`,
    `matchRoutes`, `resolveLocation`, `createRouteResolver`
- **Vue 3 adapter** (the same bare `@mission-platform/router` specifier with the `mp:vue` condition active,
  built on `vue-router` 4) — `createMpRouter`, `useMpRouter`, `useMpRoute`, `MpRouterLink`, plus the
  `toVueRoutes` / `toVueLocation` translators.
- **RedwoodSDK adapter** (`@mission-platform/router/redwood`, built on
  `rwsdk/router`) — `toRedwoodRoutes`, `renderRoutes`, `toRedwoodPath`, and the
  `redwoodHref` / `createRedwoodLinks` link helpers.

The neutral path grammar (`:param`, `:param?`, `:param*` / `:param+`, and a standalone `*` catch-all) mirrors
vue-router's, so translation is near pass-through. RedwoodSDK's flat route table supports only `:param` and a `*`
wildcard, so `toRedwoodPath` downgrades the neutral modifiers (`:param?` →
`:param`, `:param*` / `:param+` → `*`). The same `MpRoute` tree is designed to extend to react-router, TanStack Router,
Next.js, and Nuxt as further adapters are added.

Framework adapters are **not** separate subpaths: `@mission-platform/router` carries the `mp:<framework>`
export conditions, and you pick one **once** for the project — `resolve.conditions` via
`defineFrameworkAppConfig` / `frameworkResolveConditions` from `@mission-platform/vite-config`, and
`customConditions` via the `@mission-platform/typescript-config/framework-<name>` presets. Every adapter
build also re-exports the entire neutral core, so a single bare import is always enough.

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
// main.ts — with the mp:vue condition active.
import { createApp } from 'vue';
import { createMpRouter } from '@mission-platform/router';
import App from './App.vue';
import { routes } from './routes';

const router = createMpRouter({ routes, history: 'web' });
createApp(App).use(router).mount('#app');
```

```vue
<script setup lang="ts">
  import { MpRouterLink, useMpRoute, useMpRouter } from '@mission-platform/router';

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

## RedwoodSDK

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes, redwoodHref } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([
  // `renderRoutes` translates the neutral tree into rwsdk routes and wraps them
  // with the Document, mirroring rwsdk's own `render(Document, routes)`.
  renderRoutes(Document, routes),
]);

// Redwood navigates with plain anchors — build hrefs from neutral locations:
redwoodHref({ name: 'user', params: { id: 42 } }, routes); // → '/users/42'
```

Use `toRedwoodRoutes(routes)` directly when you want to spread the generated route definitions into `defineApp` yourself
(e.g. alongside JSON API routes).

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
- **Vue** (`mp:vue` condition) — `createMpRouter`, `useMpRouter`, `useMpRoute`, `MpRouterLink`,
  `toVueRoutes`, `toVueLocation` (and a re-export of the entire core).
- **RedwoodSDK** — `toRedwoodRoutes`, `renderRoutes`, `toRedwoodPath`,
  `redwoodHref`, `createRedwoodLinks` (and a re-export of the entire core).
