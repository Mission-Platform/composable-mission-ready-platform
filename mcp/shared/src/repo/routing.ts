/**
 * Routing guidance and code generation for external consumers using `@mission-platform/router`
 * and the framework-specific native adapters.
 */

export type SupportedRouterFramework =
  "vue" | "react" | "solid" | "svelte" | "web-components";

export type RouterHistoryType = "browser" | "memory";

export interface RouterSetupGuide {
  readonly framework: SupportedRouterFramework;
  readonly historyType: RouterHistoryType;
  readonly packages: readonly string[];
  readonly installCommand: string;
  readonly setupSnippet: string;
  readonly outletUsageSnippet: string;
  readonly linkUsageSnippet: string;
  readonly asyncLoadingSnippet: string;
  readonly keyNotes: readonly string[];
}

/**
 * Build router setup guide for Vue 3 applications.
 */
function getVueRouterSetup(
  historyType: RouterHistoryType,
  historyImport: string,
  historyInit: string,
): RouterSetupGuide {
  return {
    framework: "vue",
    historyType,
    packages: [
      "@mission-platform/router",
      "@mission-platform/forge-router-vue",
    ],
    installCommand:
      "pnpm add @mission-platform/router @mission-platform/forge-router-vue",
    setupSnippet: `import { createApp } from 'vue';
import { ${historyImport} } from '@mission-platform/router';
import { createVueRouter, ForgeRouterProvider } from '@mission-platform/forge-router-vue';
import App from './App.vue';

export const router = createVueRouter({
  history: ${historyInit},
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: () => import('./views/HomeView.vue') },
    { path: '/users/:id', component: () => import('./views/UserDetailView.vue') },
    { path: '/*', component: () => import('./views/NotFoundView.vue') },
  ],
  loadingFallback: () => import('./components/LoadingSpinner.vue'),
});

const app = createApp(App);
app.use(router);
app.mount('#app');`,
    outletUsageSnippet: `<template>
  <nav>
    <ForgeRouterLink to="/home">Home</ForgeRouterLink>
  </nav>
  <main>
    <ForgeRouterOutlet />
  </main>
</template>`,
    linkUsageSnippet: `<ForgeRouterLink to="/users/123" activeClass="nav-link--active">
  User Profile
</ForgeRouterLink>`,
    asyncLoadingSnippet:
      "// The outlet automatically renders loadingFallback during async component downloads\n// without tearing down the existing route until the new route is fully resolved.",
    keyNotes: [
      "Route components can be synchronous or asynchronous via dynamic import().",
      "loadingFallback is shown as an overlay while async views resolve.",
      "Modifier clicks (Cmd/Ctrl + Click) naturally open new tabs.",
    ],
  };
}

/**
 * Build router setup guide for React applications.
 */
function getReactRouterSetup(
  historyType: RouterHistoryType,
  historyImport: string,
  historyInit: string,
): RouterSetupGuide {
  return {
    framework: "react",
    historyType,
    packages: [
      "@mission-platform/router",
      "@mission-platform/forge-router-react",
    ],
    installCommand:
      "pnpm add @mission-platform/router @mission-platform/forge-router-react",
    setupSnippet: `import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { ${historyImport} } from '@mission-platform/router';
import { createReactRouter, ForgeRouterProvider, ForgeRouterOutlet, ForgeRouterLink } from '@mission-platform/forge-router-react';

const HomeView = lazy(() => import('./views/HomeView'));
const UserDetailView = lazy(() => import('./views/UserDetailView'));

export const router = createReactRouter({
  history: ${historyInit},
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomeView },
    { path: '/users/:id', component: UserDetailView },
  ],
});

export function App() {
  return (
    <ForgeRouterProvider router={router}>
      <header>
        <ForgeRouterLink to="/home">Home</ForgeRouterLink>
      </header>
      <main>
        <Suspense fallback={<div>Loading view...</div>}>
          <ForgeRouterOutlet />
        </Suspense>
      </main>
    </ForgeRouterProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);`,
    outletUsageSnippet: "<ForgeRouterOutlet />",
    linkUsageSnippet:
      '<ForgeRouterLink to="/users/42" className="link">View User</ForgeRouterLink>',
    asyncLoadingSnippet:
      "// Wrap <ForgeRouterOutlet /> in React.Suspense with a fallback component.",
    keyNotes: [
      "Use React.lazy() for code-split route views.",
      "ForgeRouterProvider provides router context to hooks like useLocation() and useParams().",
    ],
  };
}

/**
 * Build router setup guide for Solid applications.
 */
function getSolidRouterSetup(
  historyType: RouterHistoryType,
  historyImport: string,
  historyInit: string,
): RouterSetupGuide {
  return {
    framework: "solid",
    historyType,
    packages: [
      "@mission-platform/router",
      "@mission-platform/forge-router-solid",
    ],
    installCommand:
      "pnpm add @mission-platform/router @mission-platform/forge-router-solid",
    setupSnippet: `import { render } from 'solid-js/web';
import { lazy, Suspense } from 'solid-js';
import { ${historyImport} } from '@mission-platform/router';
import { createSolidRouter, ForgeRouterProvider, ForgeRouterOutlet, ForgeRouterLink } from '@mission-platform/forge-router-solid';

const Home = lazy(() => import('./views/Home'));

export const router = createSolidRouter({
  history: ${historyInit},
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
  ],
});

function App() {
  return (
    <ForgeRouterProvider router={router}>
      <nav>
        <ForgeRouterLink to="/home">Home</ForgeRouterLink>
      </nav>
      <Suspense fallback={<span>Loading...</span>}>
        <ForgeRouterOutlet />
      </Suspense>
    </ForgeRouterProvider>
  );
}

render(() => <App />, document.getElementById('root')!);`,
    outletUsageSnippet: "<ForgeRouterOutlet />",
    linkUsageSnippet: '<ForgeRouterLink to="/home">Home</ForgeRouterLink>',
    asyncLoadingSnippet:
      "// Solid Suspense handles async route component resolution natively.",
    keyNotes: [
      "Fine-grained signal updates occur without top-level re-rendering.",
      "Router parameters are reactive Solid accessors.",
    ],
  };
}

/**
 * Build router setup guide for Svelte applications.
 */
function getSvelteRouterSetup(
  historyType: RouterHistoryType,
  historyImport: string,
  historyInit: string,
): RouterSetupGuide {
  return {
    framework: "svelte",
    historyType,
    packages: [
      "@mission-platform/router",
      "@mission-platform/forge-router-svelte",
    ],
    installCommand:
      "pnpm add @mission-platform/router @mission-platform/forge-router-svelte",
    setupSnippet: `import { ${historyImport} } from '@mission-platform/router';
import { createSvelteRouter } from '@mission-platform/forge-router-svelte';
import HomeView from './views/HomeView.svelte';

export const router = createSvelteRouter({
  history: ${historyInit},
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomeView },
    { path: '/about', component: () => import('./views/AboutView.svelte') },
  ],
});`,
    outletUsageSnippet: `<script lang="ts">
  import { ForgeRouterOutlet, ForgeRouterLink } from '@mission-platform/forge-router-svelte';
  import { router } from './router';
</script>

<nav>
  <ForgeRouterLink to="/home">Home</ForgeRouterLink>
  <ForgeRouterLink to="/about">About</ForgeRouterLink>
</nav>

<main>
  <ForgeRouterOutlet {router} />
</main>`,
    linkUsageSnippet: '<ForgeRouterLink to="/home">Home</ForgeRouterLink>',
    asyncLoadingSnippet:
      "// Svelte router resolves dynamic component imports asynchronously.",
    keyNotes: [
      "Pass the initialized router instance to <ForgeRouterOutlet {router} />.",
      "Supports Svelte 5 runes ($state, $derived) for reactive location tracking.",
    ],
  };
}

/**
 * Build router setup guide for Web Components applications.
 */
function getWebComponentsRouterSetup(
  historyType: RouterHistoryType,
  historyImport: string,
  historyInit: string,
): RouterSetupGuide {
  return {
    framework: "web-components",
    historyType,
    packages: [
      "@mission-platform/router",
      "@mission-platform/forge-router-web-components",
    ],
    installCommand:
      "pnpm add @mission-platform/router @mission-platform/forge-router-web-components",
    setupSnippet: `import { ${historyImport} } from '@mission-platform/router';
import {
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

// 1. Register <forge-router-outlet> and <forge-router-link> custom elements
registerRouterElements();

// 2. Initialize router
export const router = createWebComponentsRouter({
  history: ${historyInit},
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.textContent = 'Loading...';
    return spinner;
  },
  routes: [
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      component: () => document.createTextNode('Welcome Home!'),
    },
    {
      path: '/docs/*',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

// 3. Connect to global router and attach to outlet in DOM
setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);`,
    outletUsageSnippet: `<forge-router-link to="/home">Home</forge-router-link>
<forge-router-link to="/docs/intro">Docs</forge-router-link>

<forge-router-outlet></forge-router-outlet>`,
    linkUsageSnippet: '<forge-router-link to="/home">Home</forge-router-link>',
    asyncLoadingSnippet:
      "// loadingFallback creates a DOM node overlay while the async component is fetching.",
    keyNotes: [
      "registerRouterElements() registers standard W3C Custom Elements.",
      "Zero runtime framework dependency — pure Web Components and native DOM.",
      "Outlet preserves current view until dynamic import resolves.",
    ],
  };
}

/**
 * Generate router setup guidance and code snippets for a supported framework.
 */
export function getRouterSetup(
  framework: SupportedRouterFramework,
  historyType: RouterHistoryType = "browser",
): RouterSetupGuide {
  const isMemory = historyType === "memory";
  const historyImport = isMemory ? "MpMemoryHistory" : "MpBrowserHistory";
  const historyInit = isMemory
    ? 'new MpMemoryHistory("/")'
    : "new MpBrowserHistory()";

  switch (framework) {
    case "vue":
      return getVueRouterSetup(historyType, historyImport, historyInit);
    case "react":
      return getReactRouterSetup(historyType, historyImport, historyInit);
    case "solid":
      return getSolidRouterSetup(historyType, historyImport, historyInit);
    case "svelte":
      return getSvelteRouterSetup(historyType, historyImport, historyInit);
    case "web-components":
      return getWebComponentsRouterSetup(
        historyType,
        historyImport,
        historyInit,
      );
    default:
      throw new Error(
        `Unsupported router framework: "${String(framework)}".`,
      );
  }
}
