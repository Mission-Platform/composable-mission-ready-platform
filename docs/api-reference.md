# API Reference

Technical reference for the Mission Platform core packages and framework adapters.

## Core Framework

### @mission-platform/forge

The foundation of the "write-once" architecture, providing a framework-neutral JSX runtime and hooks.

| Export | Type | Description |
| :--- | :--- | :--- |
| `h`, `Fragment` | Function | JSX factory and fragment for authoring components. |
| `useState` | Hook | Framework-neutral state hook. |
| `useEffect` | Hook | Framework-neutral effect hook. |
| `useMemo` | Hook | Framework-neutral memoization hook. |
| `useRef` | Hook | Framework-neutral reference hook. |
| `useContext` | Hook | Framework-neutral context hook. |
| `toVueComponent` | Adapter | Converts a forge component to a Vue 3 component (from `@mission-platform/forge/vue`). |
| `toReactComponent` | Adapter | Converts a forge component to a React component (from `@mission-platform/forge/react`). |

### @mission-platform/router

Framework-agnostic routing primitives and adapters.

| Export | Type | Description |
| :--- | :--- | :--- |
| `MpRoute` | Type | Interface for defining route trees. |
| `defineRoutes` | Function | Helper to define and validate route trees. |
| `createMpRouter` | Adapter | Creates a Vue-compatible router (from `@mission-platform/router/vue`). |
| `useMpRoute` | Hook | Access current route state (adapter-specific). |

## UI & Design

### @mission-platform/tokens

Centralized design tokens for colors, typography, and spacing.

| Export | Description |
| :--- | :--- |
| `tokens` | JS/TS object containing all design tokens (e.g., `tokens.color.primary`). |
| `tokens.scss` | SCSS variables for use in stylesheets. |

### @mission-platform/breakpoints

Responsive utilities and visibility components.

| Export | Type | Description |
| :--- | :--- | :--- |
| `useBreakpoints` | Hook | Returns reactive breakpoint status. |
| `ShowIf` | Component | Renders children only when a breakpoint condition matches. |
| `HideIf` | Component | Hides children when a breakpoint condition matches. |

### @mission-platform/components

Shared UI components authored once and available for multiple frameworks.

- **Subpaths**: `@mission-platform/components/vue`, `@mission-platform/components/react`.
- **Components**: `ForgeButton`, `ForgeInput`, `ForgeModal`, and more.

## Feature Packages

### @mission-platform/i18n

Internationalization system based on i18next.

| Export | Description |
| :--- | :--- |
| `createForgeI18N` | Initializes the i18n instance with platform defaults. |
| `useI18n` | Hook for translations and locale switching in components. |

### @mission-platform/seo

Meta tag and SEO management.

| Export | Description |
| :--- | :--- |
| `useSeo` | Hook to declaratively set page title, meta tags, and Open Graph data. |

### @mission-platform/map

Reactive wrapper for MapLibre GL.

| Component | Description |
| :--- | :--- |
| `<MpMap>` | Main map container component. |
| `<MpMapMarker>` | Component for placing markers on the map. |

### @mission-platform/code-scanner

Camera-based barcode and QR code scanning.

| Component | Description |
| :--- | :--- |
| `<MpCodeScanner>` | Component that initializes camera stream and emits scan results. |

## Integrations

### @mission-platform/rxjs

Bridges RxJS Observables to component state.

| Hook | Description |
| :--- | :--- |
| `useObservable` | Subscribes to an observable and returns its latest value as reactive state. |

### @mission-platform/d3

Framework-neutral D3.js integration.

| Hook | Description |
| :--- | :--- |
| `useD3` | Binds a D3 selection to a component ref with lifecycle management. |

### @mission-platform/hunspell

WebAssembly-powered spell checking.

| Export | Description |
| :--- | :--- |
| `initHunspell` | Loads and instantiates the Hunspell WebAssembly module. |
| `spell` | Checks if a word is spelled correctly. |
| `suggest` | Provides spelling suggestions for a word. |

## Further Reading

- [Vue 2 to Vue 3 Migration Guide](./migration-guides/vue2-to-vue3.md)
- [Project Configuration Overview](./configs/index.md)
- [Workspace Structure](./workspace-structure.md)