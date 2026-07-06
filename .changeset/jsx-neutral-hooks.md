---
'@mission-platform/jsx': minor
---

add framework-neutral React-style hooks and an opt-in JSX globals typings export

`@mission-platform/jsx` now exposes neutral, render-once hooks (`useState`,
`useRef`, `useEffect`, `useMemo`, `useCallback`) so neutral components can hold
state and run effects; `@mission-platform/vite-plugin-jsx` compiles them to
React's own hooks or a Vue hook shim at build time. The package also ships the
ambient JSX typings (previously duplicated in consumers) as an **opt-in**
`@mission-platform/jsx/jsx-globals` export — add it to a consumer's
`compilerOptions.types` to wire the classic `h` JSX factory's global `JSX`
namespace to `MpElement`.
