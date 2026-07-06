---
'@mission-platform/components': patch
---

scope the drawer and toast enter/leave transition styling (no more `:global`)

`BaseDrawer` (slide/fade) and `BaseToastContainer` (stack) now drive their
enter/leave transitions through the neutral `<Transition>`/`<TransitionGroup>`
explicit class props, passing their styled phase classes from the co-located CSS
Module (`styles[...]`). The transition rules are no longer declared with
`:global(.<name>-…)`, so they are hashed on the React build and plain BEM on the
Vue build exactly like every other class in the package — matching the `scoped`
`<style>` of the original `@mission-platform/components` SFCs. The animations are
unchanged on both frameworks.
