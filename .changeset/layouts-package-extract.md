---
'@mission-platform/layouts': minor
'@mission-platform/components': major
'@mission-platform/vite-plugin-jsx': minor
---

extract the common layouts into a new `@mission-platform/layouts` package

Adds the write-once `@mission-platform/layouts` package containing the common
layout primitives — `BaseApplicationLayout` (public `ApplicationLayout`) and
`BaseVerticalLayout` (public `VerticalLayout`) — authored once in the neutral
`@mission-platform/jsx` dialect and compiled straight to both Vue 3 (`./vue`)
and React (`./react`) by the two-stage `@mission-platform/vite-plugin-jsx`
compiler, with co-located `JSX Components/Layout/<Name>` stories and
cross-framework SSR specs.

**BREAKING (`@mission-platform/components`):** `BaseApplicationLayout` /
`ApplicationLayout` and `BaseVerticalLayout` / `VerticalLayout` are no longer
exported from `@mission-platform/components` — import them from
`@mission-platform/layouts/vue` (or `/react`) instead. `@mission-platform/components`
gains a neutral `.` root export and a neutral `./base-drawer` subpath so the
write-once layouts can reuse `BaseDrawer` across packages.

`@mission-platform/vite-plugin-jsx`'s two-stage compiler now remaps neutral
imports of the framework-split component libraries (`@mission-platform/components`
and `@mission-platform/layouts`, in addition to `@mission-platform/icons`) — from
their root or a neutral subpath — to the matching built `./react` / `./vue`
entry, so write-once components can compose components published by another
package.
