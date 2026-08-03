---
"@mission-platform/vite-plugin-forge": major
"@mission-platform/forge": major
---

rename the neutral class attribute from `classNames` to `className`

The framework-neutral JSX **class attribute** is now spelled `className={…}` everywhere (matching React's own spelling and the plain `class` static attribute it complements). The runtime **helper** `classNames(...)` is unchanged — it is still exported from `@mission-platform/forge` and still re-injected into the compiled React output.

- **Authoring:** drive dynamic classes with `className={[…]}` (array / string / `{ class: boolean }` forms); the author still never imports the helper.
- **`@mission-platform/forge`:** the `./react` and `./vue` runtime adapters now recognise the `className` prop (React collapses it to a `className={classNames(…)}` string, Vue maps it onto the native `class` binding).
- **`@mission-platform/vite-plugin-forge`:** the two-stage compiler recognises only `className` as the neutral class attribute; the legacy `classNames` attribute alias has been removed from every generator (React/Vue/Solid/Svelte).
- **Breaking:** neutral components authored with the old `classNames={…}` attribute must be updated to `className={…}`.
