---
'@mission-platform/components': minor
---

migrate the default-slot `Components/Layout` primitives to write-once JSX

Adds `BaseStack`, `BaseGrid`, `BaseSeparator`, and `BaseMasonry` — authored once
in the neutral JSX dialect and shipped to both the `./react` and `./vue`
subpaths via the two-stage compiler. The Storybook stories (in this package) are
re-categorised to mirror the `@mission-platform/components` package:
`JSX Components/Layout/<Name>` for the layout primitives and `BaseInView`, and
`JSX Components/Display/<Name>` for `BaseBadge` / `BaseButton`. The complex
layout components that depend on Vue features the neutral dialect does not model
(named/scoped slots, Teleport, `v-model`, emits — `BaseApplicationLayout`,
`BaseNavbar`, `BaseHero`, `BaseDrawer`, `BaseWindowPopout`, and
`BaseVerticalLayout`) are intentionally not migrated.
