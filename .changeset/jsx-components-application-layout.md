---
'@mission-platform/jsx': minor
'@mission-platform/components': minor
---

migrate `BaseApplicationLayout` to the write-once jsx-components library

`@mission-platform/components` gains `BaseApplicationLayout` (public
`ApplicationLayout`) — the top-level application shell (status banner, header,
scrollable content, footer) authored once in the neutral JSX dialect and
compiled straight to both React and Vue by `@mission-platform/vite-plugin-jsx`.
It is the first migrated component to use the framework-neutral **named-slot**
primitive (`<Slot name="status" | "navbar" | "content" | "footer" />`), derives
the status banner's colour/ARIA role from `statusLevel`, and ships its own
per-component CSS (`@layer mp.components`). Co-located stories
(`JSX Components/Layout/BaseApplicationLayout`) and cross-framework SSR specs are
included.

`@mission-platform/jsx`'s `Slot` marker is now a (never-invoked) function
component instead of a `unique symbol`, so `<Slot name="…" />` type-checks as a
JSX element under the classic `h` factory. The runtime adapters still intercept
it by identity (`type === Slot`) and the build-time compiler still rewrites it
away, so behaviour is unchanged.
