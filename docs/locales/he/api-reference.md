# הפניה ל-API

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

| Export             | Type     | Description                                                                                                                |
| :----------------- | :------- | :------------------------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | Function | JSX factory and fragment for authoring components.                                                         |
| `useState`         | Hook     | Framework-neutral state hook.                                                                              |
| `useEffect`        | Hook     | Framework-neutral effect hook.                                                                             |
| `useMemo`          | Hook     | Framework-neutral memoization hook.                                                                        |
| `useRef`           | Hook     | Framework-neutral reference hook.                                                                          |
| `useContext`       | Hook     | Framework-neutral context hook.                                                                            |
| `toVueComponent`   | Adapter  | Converts a forge component to a Vue 3 component (from `@mission-platform/forge/vue`).   |
| `toReactComponent` | Adapter  | Converts a forge component to a React component (from `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | Description                                                                                                                                                                         |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| Export / package                                                         | Type             | Description                                                                                                                                           |
| :----------------------------------------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`, `MpRouteLocationRaw`, `MpResolvedLocation`                    | Types            | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`, `matchRoutes`, `resolveLocation`                         | Functions        | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter`     | Types            | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `MpLink`, `useMpRoute`, `useMpRouter`, `useMpNavigation`, `MpRouterView` | Compiler markers | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                       | Forge targets    | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/overview'),
  routes: [{ path: '/overview', component: () => 'Documentation' }],
});
setForgeRouter(router);
const link = document.createElement('forge-router-link');
link.to = { path: '/overview', query: { q: 'router' }, hash: 'results' };
link.router = router;
```

## UI & Design

### @mission-platform/tokens

Centralized design tokens for colors, typography, and spacing.

| Export        | Description                                                                                                                                  |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | JS/TS object containing all design tokens (e.g., `tokens.color.primary`). |
| `tokens.scss` | SCSS variables for use in stylesheets.                                                                                       |

### @mission-platform/breakpoints

Responsive utilities and visibility components.

| Export           | Type      | Description                                                                |
| :--------------- | :-------- | :------------------------------------------------------------------------- |
| `useBreakpoints` | Hook      | Returns reactive breakpoint status.                        |
| `ShowIf`         | Component | Renders children only when a breakpoint condition matches. |
| `HideIf`         | Component | Hides children when a breakpoint condition matches.        |

### @mission-platform/components

מערכת בינלאומית המבוססת על i18next.

- **Import**: always `@mission-platform/components`; the active `mp:<framework>` condition decides whether you get the
  Vue 3, React, Solid, or web-component build.
- **Per-component subpaths**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) is condition-aware too, and loads only that component's
  chunk.
- **Components**: `ForgeButton`, `ForgeInput`, `ForgeModal`, and more.

## Feature Packages

### @mission-platform/i18n

Internationalization system based on i18next.

| Export            | Description                                                               |
| :---------------- | :------------------------------------------------------------------------ |
| `createForgeI18N` | Initializes the i18n instance with platform defaults.     |
| `useI18n`         | Hook for translations and locale switching in components. |

### @mission-platform/seo

Meta tag and SEO management.

| Export   | Description                                                                           |
| :------- | :------------------------------------------------------------------------------------ |
| `useSeo` | Hook to declaratively set page title, meta tags, and Open Graph data. |

### @mission-platform/map

Reactive wrapper for MapLibre GL.

| Component       | Description                                               |
| :-------------- | :-------------------------------------------------------- |
| `<MpMap>`       | Main map container component.             |
| `<MpMapMarker>` | Component for placing markers on the map. |

### @mission-platform/code-scanner

מגשרים RxJS צפיות למצב רכיב.

| הוק               | תיאור                                                              |
| :---------------- | :----------------------------------------------------------------- |
| `<MpCodeScanner>` | נרשם לצפייה ומחזיר את הערך האחרון שלו כמצב תגובתי. |

## Integrations

### @mission-platform/rxjs

Bridges RxJS Observables to component state.

| Hook            | Description                                                                                 |
| :-------------- | :------------------------------------------------------------------------------------------ |
| `useObservable` | Subscribes to an observable and returns its latest value as reactive state. |

### @mission-platform/d3

Framework-neutral D3.js integration.

| Hook    | Description                                                                        |
| :------ | :--------------------------------------------------------------------------------- |
| `useD3` | Binds a D3 selection to a component ref with lifecycle management. |

### @mission-platform/hunspell

WebAssembly-powered spell checking.

| Export         | Description                                                             |
| :------------- | :---------------------------------------------------------------------- |
| `initHunspell` | Loads and instantiates the Hunspell WebAssembly module. |
| `spell`        | Checks if a word is spelled correctly.                  |
| `suggest`      | Provides spelling suggestions for a word.               |

## ליבה וממשק משתמש

- [Vue 2 to Vue 3 Migration Guide](./migration-guides/vue2-to-vue3.md)
- [Project Configuration Overview](./configs/index.md)
- [Workspace Structure](./workspace-structure.md)

## חומרים חיבורים ואינטגרציות

The following index is generated from the package manifests and is kept here so the public API reference covers every
package in `packages/`, including the typed WebAssembly façades.

### חבילות קוד ו-WebAssembly

| חבילה                          | מטרה                                                       |
| :----------------------------- | :--------------------------------------------------------- |
| `@mission-platform/forge`      | קידוד/פענוח ברקוד 1D חזית ורכיב.           |
| `@mission-platform/components` | מודול WebAssembly של סורק תמונות שנוצר.    |
| `@mission-platform/icons`      | רכיב סריקת קוד מצלמה ותמונה.               |
| `@mission-platform/layouts`    | מטריצת נתונים ואצטקים מקודדים/פענחים חזית. |
| `@mission-platform/forms`      | מודול WebAssembly של מפענח קוד מטריקס.     |
| `@mission-platform/forms-core` | מודול WebAssembly של מקודד קוד מטריקס.     |
| `@mission-platform/tokens`     | QR קידוד/פענח חזית ורכיב.                  |

### לזייף יעדי מהדר

| Package                                         | Purpose                                                                          |
| :---------------------------------------------- | :------------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | Responsive breakpoint state and visibility helpers.              |
| `@mission-platform/d3`                          | D3 selection lifecycle composable and margin utilities.          |
| `@mission-platform/i18n`                        | i18next state and framework integration helpers.                 |
| `@mission-platform/map`                         | MapLibre map components and composables.                         |
| `@mission-platform/observers`                   | Intersection, mutation, and performance observer composables.    |
| `@mission-platform/phone-number`                | Typed WebAssembly phone-number parsing and formatting.           |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.     |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.         |
| `@mission-platform/rxjs`                        | RxJS observable and subscription composables.                    |
| `@mission-platform/scheduler`                   | Scheduler UI, recurrence, and calendar layout domain logic.      |
| `@mission-platform/vcard`                       | RFC 6350 vCard and RFC 5545 iCalendar data and components.       |
| `@mission-platform/content`                     | Content AST, builders, Monaco, Markdown, and WYSIWYG components. |
| `@mission-platform/seo`                         | Metadata, Open Graph, and structured-data composables.           |
| `@mission-platform/speech-audio`                | Speech, audio, and Web MIDI composables.                         |
| `@mission-platform/three`                       | Three.js canvas and lifecycle composables.       |

### Code and WebAssembly packages

| Package                                     | Purpose                                                           |
| :------------------------------------------ | :---------------------------------------------------------------- |
| `@mission-platform/barcode`                 | 1D barcode encode/decode façade and component.    |
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

### Forge compiler targets

These live in `forge-plugins/` rather than `packages/`. A **framework** plugin decides which runtime a neutral component
is lowered to; a **CMS** target decides which content platform it is projected onto. The two axes compose, so any CMS
target may be bound to any framework plugin. See [Forge Compiler Pipeline](./forge-compiler.md).

| Package                                         | Purpose                                                                                           |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` contract, semantic IR types, and build adapter types.     |
| `@mission-platform/forge-plugin-react`          | React output target.                                                              |
| `@mission-platform/forge-plugin-vue`            | Vue 3 output target.                                                              |
| `@mission-platform/forge-plugin-solid`          | Solid output target.                                                              |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 output target.                                                           |
| `@mission-platform/forge-plugin-web-components` | Web Components output target.                                                     |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` contract, neutral content model, CMS driver, and build helpers. |
| `@mission-platform/forge-cms-storyblok`         | Storyblok component objects, blok wrappers, and `components.json`.                |
| `@mission-platform/forge-cms-astro`             | Static `.astro` templates and `client:load` framework islands.                    |
| `@mission-platform/forge-cms-ghost`             | Ghost Handlebars partials and a `config.custom` theme fragment.                   |
| `@mission-platform/forge-cms-jekyll`            | Jekyll Liquid includes, `_data` schema, and a `_config.yml` fragment.             |
| `@mission-platform/forge-cms-webflow`           | Webflow `declareComponent` code components and a `webflow.json` library fragment. |

#### @mission-platform/forge-cms-plugin-api

| Export                    | Type     | Description                                                                                           |
| :------------------------ | :------- | :---------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | Function | Projects a neutral component's props onto the platform-neutral content model.         |
| `ContentComponent`        | Type     | Ordered `ContentField`s, slots, and the `interactive` flag.                           |
| `ContentFieldKind`        | Type     | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.       |
| `CmsOutputPlugin`         | Type     | The target contract: a bound framework plugin plus the four emitters. |
| `defineForgeCmsPlugin`    | Function | Validates a CMS target at configuration time.                                         |
| `generateCmsArtifacts`    | Function | The generic discover → IR → content model → emit → write driver.                      |
| `defineTsdownForgeCms`    | Function | tsdown config for one CMS target, emitting `dist/cms/<cms>/<framework>/**`.           |
| `defineTsdownForgeCmsAll` | Function | tsdown configs for a list of CMS targets.                                             |
