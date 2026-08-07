# API Reference

Technical reference for the Mission Platform core packages and framework adapters.

> **Imports are always bare.** Framework-shipping `@mission-platform/*` packages expose a single `.`
> entry guarded by the `mp:vue`, `mp:react`, `mp:solid`, and `mp:web-component` export
> conditions. Select the framework **once** — via `resolve.conditions` (see `defineFrameworkAppConfig` /
> `frameworkResolveConditions` from `@mission-platform/vite-config`) and `customConditions` (via the
> `@mission-platform/typescript-config/framework-<name>` presets) — then import everything with the bare
> package specifier. See [External Consumer Setup](./external-consumer-setup.md).

## Core Framework

### @mission-platform/forge

The foundation of the "write-once" architecture, providing a framework-neutral JSX runtime and hooks.

| Export             | Type     | Description                                                                             |
|:-------------------|:---------|:----------------------------------------------------------------------------------------|
| `h`, `Fragment`    | Function | JSX factory and fragment for authoring components.                                      |
| `useState`         | Hook     | Framework-neutral state hook.                                                           |
| `useEffect`        | Hook     | Framework-neutral effect hook.                                                          |
| `useMemo`          | Hook     | Framework-neutral memoization hook.                                                     |
| `useRef`           | Hook     | Framework-neutral reference hook.                                                       |
| `useContext`       | Hook     | Framework-neutral context hook.                                                         |
| `toVueComponent`   | Adapter  | Converts a forge component to a Vue 3 component (from `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adapter  | Converts a forge component to a React component (from `@mission-platform/forge/react`). |

### @mission-platform/router

Framework-agnostic routing primitives and adapters.

| Export           | Type     | Description                                                                                                      |
|:-----------------|:---------|:-----------------------------------------------------------------------------------------------------------------|
| `MpRoute`        | Type     | Interface for defining route trees.                                                                              |
| `defineRoutes`   | Function | Helper to define and validate route trees.                                                                       |
| `createMpRouter` | Adapter  | Creates a Vue-compatible router (exposed from `@mission-platform/router` when the `mp:vue` condition is active). |
| `useMpRoute`     | Hook     | Access current route state (adapter-specific).                                                                   |

## UI & Design

### @mission-platform/tokens

Centralized design tokens for colors, typography, and spacing.

| Export        | Description                                                               |
|:--------------|:--------------------------------------------------------------------------|
| `tokens`      | JS/TS object containing all design tokens (e.g., `tokens.color.primary`). |
| `tokens.scss` | SCSS variables for use in stylesheets.                                    |

### @mission-platform/breakpoints

Responsive utilities and visibility components.

| Export           | Type      | Description                                                |
|:-----------------|:----------|:-----------------------------------------------------------|
| `useBreakpoints` | Hook      | Returns reactive breakpoint status.                        |
| `ShowIf`         | Component | Renders children only when a breakpoint condition matches. |
| `HideIf`         | Component | Hides children when a breakpoint condition matches.        |

### @mission-platform/components

Shared UI components authored once and available for multiple frameworks.

- **Import**: always `@mission-platform/components`; the active `mp:<framework>` condition decides whether you get the
  Vue 3, React, Solid, or web-component build.
- **Per-component subpaths**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) is condition-aware too, and loads only that component's
  chunk.
- **Components**: `ForgeButton`, `ForgeInput`, `ForgeModal`, and more.

## Feature Packages

### @mission-platform/i18n

Internationalization system based on i18next.

| Export            | Description                                               |
|:------------------|:----------------------------------------------------------|
| `createForgeI18N` | Initializes the i18n instance with platform defaults.     |
| `useI18n`         | Hook for translations and locale switching in components. |

### @mission-platform/seo

Meta tag and SEO management.

| Export   | Description                                                           |
|:---------|:----------------------------------------------------------------------|
| `useSeo` | Hook to declaratively set page title, meta tags, and Open Graph data. |

### @mission-platform/map

Reactive wrapper for MapLibre GL.

| Component       | Description                               |
|:----------------|:------------------------------------------|
| `<MpMap>`       | Main map container component.             |
| `<MpMapMarker>` | Component for placing markers on the map. |

### @mission-platform/code-scanner

Camera-based barcode and QR code scanning.

| Component         | Description                                                      |
|:------------------|:-----------------------------------------------------------------|
| `<MpCodeScanner>` | Component that initializes camera stream and emits scan results. |

## Integrations

### @mission-platform/rxjs

Bridges RxJS Observables to component state.

| Hook            | Description                                                                 |
|:----------------|:----------------------------------------------------------------------------|
| `useObservable` | Subscribes to an observable and returns its latest value as reactive state. |

### @mission-platform/d3

Framework-neutral D3.js integration.

| Hook    | Description                                                        |
|:--------|:-------------------------------------------------------------------|
| `useD3` | Binds a D3 selection to a component ref with lifecycle management. |

### @mission-platform/hunspell

WebAssembly-powered spell checking.

| Export         | Description                                             |
|:---------------|:--------------------------------------------------------|
| `initHunspell` | Loads and instantiates the Hunspell WebAssembly module. |
| `spell`        | Checks if a word is spelled correctly.                  |
| `suggest`      | Provides spelling suggestions for a word.               |

## Further Reading

- [Vue 2 to Vue 3 Migration Guide](./migration-guides/vue2-to-vue3.md)
- [Project Configuration Overview](./configs/index.md)
- [Workspace Structure](./workspace-structure.md)

## Complete Workspace Package Index

The following index is generated from the package manifests and is kept here so the public API reference covers every
package in `packages/`, including the typed WebAssembly façades.

### Core and UI

| Package                        | Purpose                                                       |
|:-------------------------------|:--------------------------------------------------------------|
| `@mission-platform/forge`      | Framework-neutral JSX runtime and adapters.                   |
| `@mission-platform/components` | Write-once UI components.                                     |
| `@mission-platform/icons`      | Write-once SVG icon components.                               |
| `@mission-platform/layouts`    | Application, container, and responsive layout components.     |
| `@mission-platform/forms`      | Schema forms and visual form-builder components.              |
| `@mission-platform/forms-core` | Schema derivation, validation, and form-builder domain logic. |
| `@mission-platform/tokens`     | CSS custom properties and SCSS design tokens.                 |

### Composables and integrations

| Package                            | Purpose                                                       |
|:-----------------------------------|:--------------------------------------------------------------|
| `@mission-platform/breakpoints`    | Responsive breakpoint state and visibility helpers.           |
| `@mission-platform/d3`             | D3 selection lifecycle composable and margin utilities.       |
| `@mission-platform/i18n`           | i18next state and framework integration helpers.              |
| `@mission-platform/map`            | MapLibre map components and composables.                      |
| `@mission-platform/observers`      | Intersection, mutation, and performance observer composables. |
| `@mission-platform/phone-number`   | Typed WebAssembly phone-number parsing and formatting.        |
| `@mission-platform/router`         | Framework-neutral routing primitives and adapters.            |
| `@mission-platform/rxjs`           | RxJS observable and subscription composables.                 |
| `@mission-platform/scheduler-core` | RFC 5545 recurrence and calendar layout domain logic.         |
| `@mission-platform/seo`            | Metadata, Open Graph, and structured-data composables.        |
| `@mission-platform/speech-audio`   | Speech, audio, and Web MIDI composables.                      |
| `@mission-platform/three`          | Three.js canvas and lifecycle composables.                    |
| `@mission-platform/wysiwyg`        | Framework-neutral rich-text editor component.                 |

### Code and WebAssembly packages

| Package                                     | Purpose                                           |
|:--------------------------------------------|:--------------------------------------------------|
| `@mission-platform/barcode`                 | 1D barcode encode/decode façade and component.    |
| `@mission-platform/barcode-decode-wasm`     | Generated barcode decoder WebAssembly module.     |
| `@mission-platform/barcode-encode-wasm`     | Generated barcode encoder WebAssembly module.     |
| `@mission-platform/code-scan-wasm`          | Generated image scanner WebAssembly module.       |
| `@mission-platform/code-scanner`            | Camera and image code-scanning component.         |
| `@mission-platform/matrix-code`             | Data Matrix and Aztec encode/decode façade.       |
| `@mission-platform/matrix-code-decode-wasm` | Generated Matrix Code decoder WebAssembly module. |
| `@mission-platform/matrix-code-encode-wasm` | Generated Matrix Code encoder WebAssembly module. |
| `@mission-platform/qr-code`                 | QR encode/decode façade and component.            |
| `@mission-platform/qr-code-decode-wasm`     | Generated QR decoder WebAssembly module.          |
| `@mission-platform/qr-code-encode-wasm`     | Generated QR encoder WebAssembly module.          |
| `@mission-platform/harper`                  | Harper grammar and style integration for Monaco.  |
| `@mission-platform/hunspell`                | Emscripten Hunspell spell-checking wrapper.       |
