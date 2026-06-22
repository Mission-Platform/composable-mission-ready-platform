---
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

ship the `Base*` export aliases, public-type re-exports, a `./styles` entry, and a `BaseVirtualTable` `cell` slot so apps can adopt the JSX components in place of the Vue component library

`@mission-platform/vite-plugin-jsx`'s entry generator now re-exports each
compiled component under **both** its public name (`Button`) **and** its neutral
`Base`-prefixed name (`BaseButton`) as aliases of the same component, and
re-exports **every public type** each component ships alongside it (variants,
option shapes, props interfaces, scoped-slot scopes, …) from the neutral
declarations — both in the runtime entry and its synthesised `.d.ts`.

`@mission-platform/components` therefore exposes every component under the
`Base*` name on its `./react` / `./vue` subpaths (alongside the bare names), and
adds:

- a `./styles` side-effect entry (`@mission-platform/components/styles`) — a
  global `prefers-reduced-motion` reset mirroring the Vue component library's
  global accessibility safety net.
- a scoped `cell` slot on `BaseVirtualTable` (`{ column, row, value }`, exported
  as `VirtualTableCellScope`) for fully custom (interactive) cell content,
  falling back to each column's `render` formatter.
