---
'@mission-platform/vite-plugin-jsx': minor
---

compile the new neutral structural primitives to native code: remap the `Transition` import (Vue built-in / React CSS-class driver), rewrite `<Dynamic is={X}>` to `h(X, …)` (React `createElement` / Vue `<component :is>`), map `createContext`/`useContext` to each framework's provide/inject (React-native / Vue `@mission-platform/jsx/vue`, keeping `useContext` a synchronous setup const), and resolve recursive self-referencing components via `defineOptions({ name })` + `resolveComponent`
