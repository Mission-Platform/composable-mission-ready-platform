---
'@mission-platform/components': minor
'@mission-platform/vite-plugin-token-overrides': minor
---

add per-component subpath exports, clearer styles export, typed `ForgeNavbar` slots, and a token-override JSON Schema

`@mission-platform/components` now exposes **per-component subpath exports** for the `react`, `vue`, `solid`, and `svelte` builds (e.g. `@mission-platform/components/react/atoms/forge-badge/forge-badge`). Importing a single component this way pulls in only that component's compiled chunk instead of the whole framework barrel, so heavy optional components such as `ForgeMonacoEditor` (which brings in `monaco-editor` and its web workers) no longer leak into a client bundle that never renders them. Types still flow from the framework barrel, so named imports stay fully typed.

The accessibility stylesheet is now exported under the self-describing `@mission-platform/components/styles/a11y`; the existing `./styles` and `./styles/scss` remain as backwards-compatible aliases.

`ForgeNavbar` now declares typed named slots — `brand` (accepts a `string` or arbitrary `MpChild` content), the default slot (`children`, the centre navigation items), and `end` (trailing content) — so consumers get autocomplete and type-checking for each region.

`@mission-platform/vite-plugin-token-overrides` ships a JSON Schema (Draft 2020-12) for the override document at its `./schema` export (`schema/token-overrides.schema.json`), giving editors validation/autocomplete for `*.tokens.json`. Reference it from a document via a `$schema` key (a `$`-prefixed key the transform ignores); `apps/service-monitor`'s override document now points at it.
