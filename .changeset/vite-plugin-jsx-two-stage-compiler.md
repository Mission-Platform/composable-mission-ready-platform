---
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': patch
---

rework the plugin into a two-stage source-to-source compiler

`@mission-platform/vite-plugin-jsx` no longer ships a per-framework runtime that
neutral imports are rewritten to. Instead it is a **two-stage compiler**:

- **Stage 1 (source-to-source)** — `generateFrameworkSources` parses each neutral
  `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
  a React `.tsx` module (`class` → `className`, `h` → `React.createElement`,
  hooks kept as React's own) or a real Vue `.vue` SFC (`<script lang="tsx">`
  `defineComponent`/`setup`, with the React-style hooks translated to Vue
  reactivity/lifecycle — `useState` → `ref`, `useRef` → `ref`, `useMemo` →
  `computed`, `useEffect` → `onMounted` + `watch(deps)` + cleanup — derived work
  and the returned JSX moved into the render closure, `children` → default slot,
  and prop defaults lifted into the runtime `props` declaration).
- **Stage 2 (native compile)** — the generated tree is compiled by the framework's
  own toolchain: the classic-`h` React JSX transform (`reactJsxPlugin`) or
  `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`).

This keeps each framework's runtime performance native (no neutral-tree walk, no
React-hooks-on-Vue shim) and makes new target frameworks a matter of adding
another emitter. `@mission-platform/components` now builds through this
pipeline (its Vue build compiles generated `.vue` SFCs via `@vitejs/plugin-vue-jsx`).

BREAKING CHANGE: the `./react` and `./vue` runtime subpath exports, the
`jsxPlugin` / `vueJsxPlugin` factories, the runtime `defineVueBoundary`, and
`writeJsxComponentsEntry` are removed. Use `generateFrameworkSources` (Stage 1),
`reactJsxPlugin` (React Stage 2), `@vitejs/plugin-vue(-jsx)` (Vue Stage 2), and
`jsxComponentsEntryDtsPlugin` instead.
