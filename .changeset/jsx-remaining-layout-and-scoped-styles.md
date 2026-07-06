---
'@mission-platform/jsx': minor
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

migrate the remaining layout components and emit scoped SCSS for the Vue build

`@mission-platform/components` completes the `Components/Layout` migration:
`BaseTypography`, `BaseHero`, `BaseDrawer`, `BaseNavbar`, `BaseVerticalLayout`,
and `BaseWindowPopout` are now authored once in the neutral JSX dialect and
compiled straight to both React and Vue. Cross-framework events use the
**callback-prop** convention (`onOpenChange` / `onClose` / `onStartOpenChange` /
…). Behaviours the neutral dialect does not model are substituted with documented
equivalents: `BaseDrawer` renders an in-place `position: fixed` overlay (or a
reactive `matchMedia`-driven `inline` panel) instead of a `<Teleport>` +
`<Transition>`; `BaseWindowPopout` opens a real second window via `window.open`
and shows a cloned-HTML snapshot instead of a portal; would-be slots become
`MpChild` props; `BaseTypography` drops the `@floating-ui` truncate-popup. Each
ships its own per-component `@layer mp.components` CSS, with co-located stories
(`JSX Components/<Category>/…`) and cross-framework SSR specs.

`@mission-platform/vite-plugin-jsx`'s two-stage compiler now scopes styling per
framework: the **React** build keeps the hashed **CSS Module**, while the **Vue**
build inlines each component's `*.module.scss` as a scoped
`<style scoped lang="scss">` block in the generated SFC (preserving the
`@layer mp.components` wrapper) and rewrites every `styles['x']` /
`styles[`x`]` read — including computed object keys — to its literal class name,
so `classNames(...)` produces plain, `data-v-`-scoped classes.

`@mission-platform/jsx`'s `Slot` marker is a (never-invoked) function component
so `<Slot name="…" />` type-checks under the classic `h` factory.
