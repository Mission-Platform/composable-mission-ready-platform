---
'@mission-platform/vite-plugin-forge': minor
---

flatten far more neutral components to native Vue `<template>` markup instead of the `<render v-bind="$attrs" />` render-closure fallback

The Vue template builder gained several AST-driven flattening passes, taking the component library from 17 render-closure fallbacks down to 9:

- **Object-literal keys are no longer misread as node-typed slot props.** `producesNodes` ignores identifiers in object-literal key / shorthand position, and a `.map()`/`.flatMap()` is only treated as node-producing when its callback body actually builds nodes — so a `{ start, end }` handler object or a data `.map()` inside a `void` handler no longer forces the fallback (`base-date-range-input`, `base-scheduler`).
- **Array-literal children template natively.** `emitExpressionChild` now delegates a `{[a, ...b]}` child (node consts, spreads, `.map()` projections) to the node-array child emitter (`base-list`, `base-calendar`).
- **Imperative array/object builds fold declaratively.** A `const arr = <init>; if (…) arr.push(…); for (…) arr.push(…)` build folds into a single array literal (`...(c ? [x] : [])`, `...xs.map(…)`), preserving its declared element type via an `as <T>[]` assertion so discriminated-union control lists still type-check (`base-pagination`, `base-multiselect`, `base-select`).
- **Block-body and `if`-guard-chain render helpers inline.** A helper whose body is leading `const`s + a single `return`, or an `if (c) return X; … return Y;` dispatch, folds to one expression and inlines at its call site.
- **The memo `.value` rewriter is scope-aware**, so a handler-local binding that shadows a render-scope `computed` compiles without corruption (`base-time-input`).

Several correctness guards were added so a genuinely non-flattenable shape falls back cleanly instead of emitting invalid or type-unsafe markup: a prop bound to a value that embeds VNodes, a helper that would inline a literal-vs-literal comparison, a looped multi-element `flatMap` (key hoisted onto the `<template v-for>`), and an inline handler reading a React-style `.current` on a `useRef`. A new repo-wide `vue-no-fallback` audit spec compiles every component to Vue and pins the remaining fallbacks to an allowlist, so no component can silently regress.
