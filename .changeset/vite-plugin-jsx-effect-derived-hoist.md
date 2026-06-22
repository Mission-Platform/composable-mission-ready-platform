---
'@mission-platform/vite-plugin-jsx': patch
'@mission-platform/components': patch
---

fix the Vue render-closure fallback so an effect can reference a derived declaration

A `useEffect` is emitted into Vue `setup` (`onMounted`/`watch`), but the derived
`const`s and functions it closes over defaulted to the per-render closure — so
an effect that referenced one (e.g. `BaseCarousel`'s `slideCount`/`commit`)
threw `slideCount is not defined` at runtime. The Vue emitter now finds the
transitive set of derived declarations every effect depends on and hoists them
into `setup` ahead of the effects: a derived **function** stays a plain `const`,
while a derived **value** becomes a reactive `computed` (registered in the scope
so every read — in the effect, its deps array, and the render closure — is
rewritten to `<name>.value`).
