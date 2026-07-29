---
'@mission-platform/vite-plugin-jsx': patch
---

fix dangling declaration references in the Solid and Web Components builds

The Web Components emitter now resolves the neutral `MpChild`/`MpElement` types against the co-located per-framework types module and carries a sibling component's type-only exports (e.g. `TabItem`, `TabsVariant`, `MenuNode`) across its side-effect import, so they no longer dangle in the generated declarations. The Solid emitter imports Solid's hyperscript `h` as a default binding (`import h from 'solid-js/h'`) to match its `export default`. The declaration-emit diagnostic filter also ignores references inside a typed class-field initializer (e.g. `openIds: any = defaultOpen`), which are elided from the emitted `.d.ts`.
