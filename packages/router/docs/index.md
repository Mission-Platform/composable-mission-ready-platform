# @mission-platform/router

A framework-agnostic routing library that provides a unified route model and per-framework adapters for Vue, React, and other frameworks.

## Overview

The `@mission-platform/router` package implements a **framework-neutral routing system** that separates the route definition and matching logic from framework-specific implementation details. This allows you to define your routes once and use them across different frameworks while maintaining consistency.

## Key Features

- **Framework-Agnostic Core**: Define routes in a neutral format that works across frameworks
- **Type-Safe API**: Complete TypeScript support for route definitions and navigation
- **Composable Architecture**: Use composables to access routing state and navigation
- **Path Grammar**: Flexible path matching with parameters (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **Query String Support**: Built-in parsing and serialization of query parameters
- **Nested Routes**: Support for hierarchical route structures

## Main Modules and Exports

### Core Route Model

The framework-neutral route definition system:

**`MpRoute`**: Represents a single route with path, name, and metadata.

**`defineRoutes`**: Creates a route tree from an array of route definitions.

**Example:**

```typescript
import { defineRoutes } from '@mission-platform/router';

const routes = defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: UserProfile,
  },
]);
```

### Path Utilities

**`matchRoutes`**: Matches a location against a route tree and returns matched routes.

**Example:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### Location Utilities

**`resolveLocation`**: Resolves a route location to a URL path.

**Example:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## Framework Adapters

### Vue Adapter (`./vue`)

The Vue-specific adapter provides integration with `vue-router`.

**Main Exports:**

- **`createMpRouter`**: Creates a Vue Router instance from neutral routes
- **`useMpRouter`**: Composable to access the router instance
- **`useMpRoute`**: Composable to access current route information
- **`MpRouterLink`**: Framework-neutral router link component

**Example:**

```vue
<template>
  <div>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { MpRouterLink, createMpRouter } from '@mission-platform/router/vue';
  import { createApp } from 'vue';
  import routes from './routes';

  const router = createMpRouter({
    routes,
    history: 'web', // or 'hash' or 'memory'
  });

  createApp(App).use(router).mount('#app');
</script>
```

### React Adapter (`./react`)

The React adapter provides integration with React Router.

**Main Exports:**

- **`withMpRouter`**: HOC to provide router context
- **`useMpRoute`**: Hook to access current route information
- **`MpLink`**: Framework-neutral link component for React

### RedwoodSDK Adapter (`./redwood`)

The RedwoodSDK adapter provides integration with `rwsdk/router` — the flat,
request/response route table used by RedwoodSDK (React on Cloudflare Workers).

**Main Exports:**

- **`toRedwoodRoutes`**: Translates the neutral `MpRoute` tree into a flat list
  of `rwsdk` route definitions (nested routes are flattened to absolute paths).
- **`renderRoutes`**: Wraps the translated routes in a Document, mirroring
  `rwsdk`'s `render(Document, routes, options)`.
- **`toRedwoodPath`**: Converts a neutral path pattern into Redwood's grammar
  (`:param` and `*` wildcards only; `:param?` → `:param`, `:param*` / `:param+`
  → `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: Build app-relative hrefs from
  neutral locations, since RedwoodSDK navigates with plain anchors.

**Example:**

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([renderRoutes(Document, routes)]);
```

## Technical Details

### Dependencies

**Core Package:**

- **TypeScript**: Type definitions and type safety
- **No framework dependencies**: Pure JavaScript/TypeScript

**Vue Adapter:**

- **vue-router**: Official Vue Router library
- **vue**: Vue 3 core

**React Adapter:**

- **react-router-dom**: React Router for web applications
- **react**: React core

### Architecture

The package follows a layered architecture:

1. **Core Layer**: Framework-neutral route model and utilities
2. **Adapter Layer**: Framework-specific implementations (Vue, React)
3. **Public API**: Unified interface for all frameworks

### Path Grammar

The router supports the following path parameter patterns:

- `:param`: Required parameter (e.g., `/users/:id`)
- `:param?`: Optional parameter (e.g., `/users/:id?`)
- `:param*`: Zero or more parameters (e.g., `/files/:path*`)
- `:param+`: One or more parameters (e.g., `/files/:path+`)
- `*`: Catch-all wildcard (e.g., `/*`)

## Integration Guide

### Basic Setup with Vue

1. Install the package:

```bash
pnpm add @mission-platform/router vue-router
```

2. Define your routes:

```typescript
// src/routes.ts
import { defineRoutes } from '@mission-platform/router';
import HomePage from './pages/Home.vue';
import AboutPage from './pages/About.vue';

export default defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
]);
```

3. Create the router:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router/vue';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. Use in your app:

```vue
// src/App.vue
<script setup lang="ts">
  import { MpRouterLink } from '@mission-platform/router/vue';
</script>

<template>
  <nav>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>
  </nav>
  <router-view />
</template>
```

### Dynamic Route Matching

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router/vue';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### Programmatic Navigation

```vue
<script setup lang="ts">
  import { useMpRouter } from '@mission-platform/router/vue';

  const router = useMpRouter();

  const goToAbout = () => {
    router.push('/about');
  };

  const navigateWithParams = () => {
    router.push({
      name: 'user-profile',
      params: { id: '123' },
      query: { tab: 'details' },
    });
  };
</script>
```

## Advanced Features

### Route Meta Fields

Add metadata to routes for custom logic:

```typescript
const routes = defineRoutes([
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      adminOnly: true,
    },
  },
]);
```

### Route Guards (Vue)

```typescript
import { createMpRouter } from '@mission-platform/router/vue';

const router = createMpRouter({
  routes,
  history: 'web',
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

### Nested Routes

```typescript
const routes = defineRoutes([
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
      },
    ],
  },
]);
```

## Best Practices

1. **Route Organization**: Group related routes together and use nested routes for layout components
2. **Named Routes**: Always use named routes for programmatic navigation
3. **Parameter Validation**: Validate dynamic parameters in route components
4. **Error Handling**: Handle 404 cases with a catch-all route (`/*`)
5. **Lazy Loading**: Use dynamic imports for code splitting (framework-specific)
6. **Type Safety**: Define interfaces for route params and query objects
7. **Query Management**: Keep query parameters simple and URL-safe

## Migration Guide

### From Vue Router Directly

When migrating from vue-router to @mission-platform/router:

1. Replace `createRouter` with `createMpRouter`
2. Convert route definitions to use `defineRoutes`
3. Replace `<router-link>` with `<MpRouterLink>`
4. Update composables: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### From React Router Directly

When migrating from react-router-dom:

1. Define routes using the neutral format with `defineRoutes`
2. Replace `<Link>` with `<MpLink>`
3. Use `useMpRoute()` instead of `useRoute()`
4. Wrap components with `withMpRouter` for router access

### From Next.js

For Next.js applications, consider:

- Using the neutral route definitions for consistency
- Creating a custom adapter layer if needed
- Leveraging Next.js file-based routing alongside the neutral model
