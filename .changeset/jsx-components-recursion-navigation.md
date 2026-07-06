---
"@mission-platform/components": minor
---

bring the recursive and navigation components to behavioral parity with `@mission-platform/components`

`BaseTreeView` now renders **true nested markup** — each open branch recurses
into a child `role="group"` sub-list (driven by a single root `openMap`) rather
than flattening the visible tree, and exposes `aria-selected` while preserving
the scoped `label` slot and keyboard nav. `BaseMenu` and `BaseMenubar` gain
**arbitrarily deep** submenus via a single recursive `renderItems` walk keyed by
a dotted `openPath` (one open per level, ancestor chain stays open), and
`BaseMenubar` renders its default slot when `items` is omitted (matching the Vue
`<slot v-else>`). `BaseNavbarItem` renders its childless item through the neutral
`<Dynamic is={tag}>` primitive (`'a'`/`'button'`). `BaseTabs` now renders a
`tabpanel` for every tab and keeps inactive panels mounted but `hidden`, so panel
state survives tab switches (each panel invokes one scoped `panel` slot).
