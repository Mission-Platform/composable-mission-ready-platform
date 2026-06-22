---
'@mission-platform/vite-plugin-jsx': minor
---

remap the neutral `TransitionGroup` import like `Transition`/`Teleport` — Vue resolves the built-in `<TransitionGroup>` from `vue` and React imports the `@mission-platform/jsx/react` group driver, while the `<TransitionGroup>` JSX usage is left intact on both targets
