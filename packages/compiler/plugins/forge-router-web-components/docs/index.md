# @mission-platform/forge-router-web-components

Forge router target for framework-free Web Components.

## Async route loading

Use `loadingFallback` to show a spinner while an async route view resolves.
`forge-router-outlet` renders the fallback as an overlay and keeps the current
view mounted until the destination is ready:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

The outlet removes the overlay after success, redirect, cancellation, or
failure. Route view promises are shared between navigation and outlet mounting,
so a lazy factory is not invoked twice. A late result from an obsolete
navigation cannot replace a newer view.

`forge-router-link` is the scoped SPA entry point. It updates history through
`push` by default or `replace` when the `replace` property/attribute is set,
updates its `active` and `exact-active` state, and leaves modified clicks,
non-primary clicks, downloads, external URLs, and targeted links to the native
browser.

## Framework-neutral `Suspense`

Shared Forge source can use the neutral boundary and let each compiler lower it
to the target-native implementation:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

For Web Components, use the router outlet's `loadingFallback` contract for
route transitions; no framework runtime or global anchor interception is
required.
