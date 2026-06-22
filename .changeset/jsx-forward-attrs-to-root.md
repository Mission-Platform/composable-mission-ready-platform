---
'@mission-platform/vite-plugin-jsx': patch
'@mission-platform/components': patch
'@mission-platform/icons': patch
---

forward consumer fall-through attributes onto the generated Vue component root

The Vue emitter stamps every generated SFC with `defineOptions({ inheritAttrs:
false })` (so multi-root / render-closure components don't warn), but it never
re-enabled attribute inheritance — so consumer-supplied fall-through attributes
(`class`/`style`/`id`/`data-*`/listeners) were silently dropped, unlike the
hand-authored `.vue` SFCs they replaced. This regressed components relied on the
fall-through, e.g. the Monaco editor lost its consumer `class` (and therefore
its `flex: 1` / border overrides) when wrapped by an app.

The two-stage compiler now opts the root back in explicitly: a single root
element in the `<template>` path is emitted with a trailing `v-bind="$attrs"`
(placed last to mirror Vue's default-inheritance precedence; `class`/`style`
still merge), and the render-closure fallback forwards `$attrs` onto its
`<component :is="render">` host. `@mission-platform/components` and
`@mission-platform/icons` pick this up when their `./vue` subpaths are rebuilt.
