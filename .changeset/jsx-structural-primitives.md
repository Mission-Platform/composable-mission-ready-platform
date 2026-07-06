---
'@mission-platform/jsx': minor
---

add the `Transition` (enter/leave), `Dynamic` (dynamic component), and context (`createContext`/`useContext`) neutral primitives, and verify recursive self-referencing components — the React/Vue adapters intercept the new markers for SSR, ship a CSS-class React `Transition`, and provide a `provide`/`inject`-backed Vue `createContext`/`useContext`
