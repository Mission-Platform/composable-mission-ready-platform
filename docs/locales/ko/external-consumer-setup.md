# External Consumer Setup

This guide explains how to consume Mission Platform packages in projects located outside of the main monorepo. It focuses on using framework-specific builds and managing design tokens.

## Framework Selection via Conditions

Mission Platform components are authored once using `@mission-platform/forge-jsx` and distributed as multiple framework-specific bundles (Vue 3, React, Solid, and Web Components) within a single package.

To select the correct bundle, you must configure your build tool and TypeScript to use **Custom Export Conditions**.

### Supported Framework Conditions

| Framework          | Export Condition   |
| :----------------- | :----------------- |
| **Vue 3**          | `mp:vue`           |
| **React**          | `mp:react`         |
| **Solid**          | `mp:solid`         |
| **Web Components** | `mp:web-component` |

## Project Configuration

### 1. Vite Configuration

If you are using Vite, you can use the helper functions from `@mission-platform/vite-config` to automatically set the correct resolve conditions. A framework-free app should select `mp:web-component`; do not install or configure a Vue plugin for that target.

```ts
import { defineConfig } from "vite";
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default defineConfig({
  resolve: {
    // This places the Web Components build at the top of the condition list.
    conditions: frameworkResolveConditions("web-component"),
  },
});
```

### 2. TypeScript Configuration

To ensure the TypeScript Language Service (LSP) resolves types for the correct framework, you should extend a framework preset from `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-web-component",
  "compilerOptions": {
    "customConditions": ["mp:web-component"]
  }
}
```

## Package Installation

Install the required packages from your registry:

```bash
pnpm add @mission-platform/components @mission-platform/tokens @mission-platform/router @mission-platform/forge-router-web-components
```

### Peer Dependencies

Most Mission Platform packages externalize their runtime dependencies. Ensure you have the corresponding framework and shared libraries installed in your project:

```bash
# Example for a Vue 3 project
pnpm add @mission-platform/i18n
```

The neutral router package has no framework or router-library runtime dependencies. Install the native router selected by
your application and the matching Forge target (`@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, or `-web-components`). The application owns route definitions, providers, guards, loaders, and the native
router instance; reusable packages import only capabilities from `@mission-platform/router`.

## Component Usage

With the conditions correctly configured, you can import components from the root of the package. The build tool will automatically select the bundle matching your `mp:*` condition.

```vue
<script setup lang="ts">
import { ForgeButton } from "@mission-platform/components";
</script>

<template>
  <ForgeButton variant="primary">Click Me</ForgeButton>
</template>
```

### Framework-free routing

Use memory history for tests and prerendering, or omit `history` in a browser to use browser history. Register router
elements once; assign route targets as properties when they contain params, query values, or hashes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/"),
  routes: [
    { path: "/", redirect: "/docs/intro" },
    {
      path: "/docs/*",
      name: "doc",
      component: () => document.createTextNode("Docs"),
    },
  ],
});
setForgeRouter(router);

const outlet = document.querySelector("forge-router-outlet");
outlet?.setRouter(router);
```

### Async navigation with a loading spinner

Async route components can keep the current page visible while the next view
loads. Configure the outlet fallback when creating the Web Components router;
`forge-router-link` then performs SPA navigation with `pushState` (or replace
history when `replace` is enabled):

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/docs/intro"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [
    {
      path: "/docs/*",
      component: async () => (await import("./views/docs-view")).default(),
    },
  ],
});
setForgeRouter(router);
document.querySelector("forge-router-outlet")?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced"
  >Advanced documentation</forge-router-link
>
<forge-router-outlet></forge-router-outlet>
```

The outlet owns the loading overlay and does not remove the currently mounted
view until the destination resolves. It clears the overlay for successful,
redirected, cancelled, and failed navigation. Modified clicks, downloads,
external URLs, and links with another target retain native browser behavior.

When authoring shared Forge source, use the neutral boundary directly and let
each compiler select its native implementation:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

## Design Token Customization

Mission Platform uses CSS Custom Properties (variables) for design tokens. You can override these tokens globally in your application's root stylesheet.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;

  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

All Mission Platform components consume these variables, so changes at the `:root` level will propagate throughout the entire UI.
