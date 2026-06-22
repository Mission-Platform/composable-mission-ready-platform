---
"@mission-platform/components": minor
---

close the long-tail feedback/editor parity gaps (toast store, typography truncate popup, Monaco spell-check)

- Add a framework-agnostic observable `toast-store` (the write-once counterpart
  of the Vue `useToast` composable) and a new `BaseToastContainer` component that
  teleports a positioned, store-driven stack of `BaseToast`s; the store's
  `useToast`/`showToast`/`dismissToast`/`clearToasts`/… API is re-exported from
  the generated `./react` and `./vue` entries so consumers drive the same
  per-framework singleton the container uses.
- Restore the `BaseTypography` truncate popup via a new `truncatePopup` prop,
  positioned with CSS Anchor Positioning (replacing the original `@floating-ui`
  popup) and driven by the neutral `useRef`/`useState` hooks.
- Wire `BaseMonacoEditor` spell/grammar checking to parity: when `spellCheck` is
  set it lazily imports the shared `attachHunspellMonaco`/`attachHarperMonaco`
  cores (browser-only WASM kept out of the synchronous module graph).
- Fix `BaseToast` to treat an empty children array as "no default slot" so the
  `message` prop renders when nested (e.g. from `BaseToastContainer`).
