---
'@mission-platform/jsx': minor
'@mission-platform/components': minor
---

add a write-once JSX layer that renders on both Vue 3 and React

Introduces `@mission-platform/jsx`, a tiny dependency-free runtime whose classic
JSX factory (`h`) builds a framework-neutral element tree, plus `./react` and
`./vue` adapters (`toReactComponent` / `toVueComponent`) that map that tree onto
`React.createElement` or Vue's `h` at render time — a hand-rolled alternative to
build-time compilers like Mitosis.

Also adds `@mission-platform/components`, a reference consumer that authors
`BaseBadge` and `BaseButton` once and ships them as both Vue 3 and React
components via the `./react` and `./vue` subpath exports.
