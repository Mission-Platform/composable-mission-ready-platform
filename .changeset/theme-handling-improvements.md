---
"@mission-platform/components": minor
---

improve light/dark theme handling (subtree scoping, pre-paint init, `<meta>` sync, store-backed toggle)

- `useTheme` / `createThemeStore` gain a `scoped` mode: pass `scoped: true` with
  a `target` element (or assign it later via the new `setTarget(element)`) to
  apply `data-theme`/`color-scheme` to a single subtree element instead of
  `document.documentElement`. Because the tokens' `light-dark()` colours resolve
  against the _used_ `color-scheme`, this re-themes the element and its
  descendants without redefining any custom property — enabling nested providers
  / per-subtree themes. Reassigning or disposing the store cleans up the previous
  element.
- The store now keeps a `<meta name="color-scheme">` in sync with the resolved
  preference (root mode only; opt out with `syncMeta: false`) so the user-agent
  chrome (scrollbars, form controls, address bar) tracks the active theme, and it
  re-applies on system (`prefers-color-scheme`) changes while in `'auto'`.
- New `themeInitScript(options?)` export returns a tiny, self-contained snippet
  to inline as a blocking `<script>` in the document `<head>`; it pins
  `data-theme`/`color-scheme` from the persisted preference **before first
  paint**, eliminating the flash of the wrong colour scheme.
- `BaseThemeProvider` gains a `global` prop (default `true`); set `:global="false"`
  to scope the theme to a rendered (`display: contents`) wrapper element (`as`,
  default `div`) for subtree / nested theming.
- `BaseThemeToggle` is now backed by the shared `useTheme` store instead of
  hand-rolling its own `data-theme` manipulation, so toggling persists the
  preference, pins `color-scheme` + the `<meta>`, stays in sync with the system
  theme, and drives a `BaseThemeProvider`'s store (global or subtree-scoped) when
  rendered inside one.
