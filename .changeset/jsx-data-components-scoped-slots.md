---
'@mission-platform/jsx': minor
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

add scoped-slot (render-prop) support and migrate the self-contained Data components to write-once JSX

`@mission-platform/jsx` gains a `MpRenderProperty<Scope>` type and the neutral
`<Slot>` element now accepts **scope props** (`<Slot name="row" item={item}
index={i} />`) so a write-once component can drive a **scoped slot**.

`@mission-platform/vite-plugin-jsx`'s two-stage compiler translates a scoped
`<Slot>` to a Vue scoped slot (`slots.x?.(scope)`) and a React render-prop call
(`properties.x?.(scope)`), reusing the existing named-slot path. Both emitters
have a regression test.

`@mission-platform/components` gains three cross-framework `Components/Data`
components, authored once in the neutral dialect and compiled straight to both
React and Vue:

- `BaseVirtualList` — windowed list with a scoped `row` slot.
- `BaseVirtualLogViewer` — virtual-scrolling log with per-level colouring, a
  substring filter + matching-count toolbar, follow-tail, and an `onSelect`
  callback (composes `BaseTypography`).
- `BaseVirtualTreeView` — flattened virtual tree with a built-in expand/collapse
  label (overridable via the scoped `row` slot) and `onSelect`/`onToggle`
  callbacks.

Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
`.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
cross-framework SSR specs. Vue-only features the neutral dialect cannot model
(icons, scoped **default** slots, generics) are substituted with documented
equivalents (a `●`/`▸`/`▾` glyph, named `row` scoped slots, `unknown` items).
