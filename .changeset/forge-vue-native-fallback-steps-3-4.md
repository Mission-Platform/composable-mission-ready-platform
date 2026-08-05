---
'@mission-platform/vite-plugin-forge': minor
'@mission-platform/components': patch
---

flatten the remaining Category-C/D neutral components to native Vue `<template>` markup, cutting the render-closure (`<render v-bind="$attrs" />`) fallback count from 9 to 2

The Vue template builder gained four more AST-driven flattening passes so `base-select`, `base-radio-group`, `base-range-input`, `base-slider`, `base-toast`, `base-alert-banner`, `base-tabs`, and `base-virtual-tabs` now compile to native `<template>` (only `base-time-range-input` / `base-date-time-range-input` — a separate "function-valued node helper" shape — still fall back):

- **Render-scope ref-sync lifts to `watchEffect`.** A top-level `<ref>.current = <expr>;` side effect (kept in step with a derived value in React's re-render model) is emitted as a reactive `watchEffect(() => { <ref>.value = <expr>; })` rather than rejected as a "non-const derived statement" (`base-slider`, `base-range-input`).
- **Inline-handler `useRef` reads are rewritten.** A `.current` read inside an inline template handler (`onClick={() => searchReference.current?.focus()}`) now drops to the bare, auto-unwrapped template-ref identifier, so a `useRef` used only inside markup no longer forces the fallback (`base-select`).
- **A props-children spread in a folded node array maps to the default slot.** `...(properties.children as MpChild[])` appended to a built node array emits as `<slot />` (`base-radio-group`).
- **An element-returning `switch` module helper inlines as a `v-if` chain.** A single-argument `variantIcon(variant)`-style helper is inlined as the equivalent `v-if`/`v-else-if`/`v-else` conditional chain (`base-toast`, `base-alert-banner`).
- **A render-prop call in child position renders via `<component :is>`.** `{properties.panel?.({ tab })}` binds the returned VNode directly to `<component :is>` (per Vue's "Using Vnodes in `<template>`" guide), keeping `panel` a real prop — never a Vue named slot — so a compiled neutral parent can still pass it plainly (`base-tabs`, `base-virtual-tabs`).

The `vue-no-fallback` audit allowlist shrinks to the two remaining range composites, and per-category compiler assertions cover each new shape.
