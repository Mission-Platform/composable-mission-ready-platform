---
'@mission-platform/vite-plugin-jsx': patch
---

fix slot translation for the `h(Slot, …)` call form and kebab slot names

The two-stage compiler's reference rewriters now translate the **call form** of
the named-slot marker — `h(Slot, { name: 'x' }, …fallback)` — exactly like the
`<Slot name="x" />` JSX element, on both the Vue (`createReferenceRewriter`
render-closure) and React paths. Previously only the JSX element form was
handled, so a component that composed slots with `h(Slot, …)` (e.g. inside an
intermediate `const column = … ? h(Drawer, …, h(Slot, { name: 'start' })) : …`
that forces the `<script setup>` render-closure fallback) emitted an undefined
`Slot` reference and threw `ReferenceError: Slot is not defined` at render.

Slot/`hasSlot` reads for **non-identifier (kebab-case) slot names** now use
bracket access (`slots["start-header"]` / `properties["start-header"]`) instead
of dot access, which JavaScript mis-parsed as a subtraction
(`slots.start-header` → `slots.start - header`). The Vue emitter also now wires
up `useSlots()` when a body references slots via bracket access.
