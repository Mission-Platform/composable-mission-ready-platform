---
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/jsx': minor
'@mission-platform/components': patch
'@mission-platform/icons': patch
---

add the platform-owned `className={…}` JSX attribute for class management

Neutral components now drive dynamic classes with a `className={…}` attribute
(reserving the plain `class="…"` for static strings) instead of calling the
`classNames` helper inline — the author never imports the helper. The canonical
value is an array holding the same arguments the helper accepts.

`@mission-platform/vite-plugin-jsx`'s two-stage compiler owns the transform: on
React an array value collapses to a `className={classNames(…)}` string call
(re-injecting the neutral `classNames` import), while any other value passes
through as `className`; on Vue it maps onto the native `class` binding, which
understands the array/object forms (no helper needed). `@mission-platform/jsx`'s
`./react` and `./vue` runtime adapters apply the same mapping at render time so
the ad-hoc/SSR output matches the compiled output. The `classNames(...values)`
helper is still exported for the rare precompute and `h(tag, { class: … })`
object form.

`@mission-platform/components` and `@mission-platform/icons` migrate
their components' `class={…}` attributes to `className={…}` accordingly.
