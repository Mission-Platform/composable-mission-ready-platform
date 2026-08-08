# @mission-platform/vite-plugin-token-overrides

## 0.2.0

### Minor Changes

- dcf11e4: add `@mission-platform/vite-plugin-token-overrides`, a reusable Vite plugin for design-token overrides

  Lifts the former per-app `generate-token-overrides.ts` script into a shared, installable Vite plugin so any app can re-skin `@mission-platform/tokens` without a manual build step. The plugin reads a DTCG-style `*.tokens.json` override document, transforms it into a `:root { --mp-*: … }` SCSS partial, and writes it to disk on `buildStart` / dev-server start (regenerating on change), which a stylesheet then `@import`s after the base tokens so the overrides win the cascade. It also re-exports the token-override transform (`buildTokenOverrideScss`, `flattenOverrides`, and the related types), which `@mission-platform/mcp-shared` now consumes for the consumer MCP `generate_token_override` tool. `apps/service-monitor` is migrated to the plugin (its `tokens:generate` script and committed `overrides.generated.scss` are removed, and its `design-tokens/` sources moved to the app root).

- c6e83c0: add per-component subpath exports, clearer styles export, typed `ForgeNavbar` slots, and a token-override JSON Schema

  `@mission-platform/components` now exposes **per-component subpath exports** for the `react`, `vue`, `solid`, and `svelte` builds (e.g. `@mission-platform/components/react/atoms/forge-badge/forge-badge`). Importing a single component this way pulls in only that component's compiled chunk instead of the whole framework barrel, so heavy optional components such as `ForgeMonacoEditor` (which brings in `monaco-editor` and its web workers) no longer leak into a client bundle that never renders them. Types still flow from the framework barrel, so named imports stay fully typed.

  The accessibility stylesheet is now exported under the self-describing `@mission-platform/components/styles/a11y`; the existing `./styles` and `./styles/scss` remain as backwards-compatible aliases.

  `ForgeNavbar` now declares typed named slots — `brand` (accepts a `string` or arbitrary `MpChild` content), the default slot (`children`, the centre navigation items), and `end` (trailing content) — so consumers get autocomplete and type-checking for each region.

  `@mission-platform/vite-plugin-token-overrides` ships a JSON Schema (Draft 2020-12) for the override document at its `./schema` export (`schema/token-overrides.schema.json`), giving editors validation/autocomplete for `*.tokens.json`. Reference it from a document via a `$schema` key (a `$`-prefixed key the transform ignores); `apps/service-monitor`'s override document now points at it.

- dcf11e4: enumerate every overridable token key in the override JSON Schema

  The `./schema` export (`schema/token-overrides.schema.json`) now enumerates **all** overridable design-token keys from `@mission-platform/tokens` — `palette`/`theme-light`/`theme-dark` merged under `color`, plus `font`, `line-height`, `letter-spacing`, `spacing`, `radius`, `shadow`, `size`, `breakpoint`, `border-width`, `opacity`, `duration`, `easing`, `z-index`, and composite `typography` — each carrying its DTCG `$description` for editor hover. Every known key is validated against its expected value shape (scalar, `{ light, dark }` pair, or composite typography object) while unknown/app-specific keys are still accepted via the generic node fallback, so editors gain full autocomplete and validation for `*.tokens.json` override documents without breaking forward-compatibility.
