---
'@mission-platform/vite-plugin-jsx': patch
---

carry external package imports into the generated Vue SFC

The Vue emitter reconstructed a component's imports from only a fixed set of
categories (the neutral `@mission-platform/jsx` package, relative
component/helper modules, stylesheets, and the Vue adapter), silently dropping
every other bare-package import. A component that referenced an external value —
e.g. `@mission-platform/forms-core`'s `DEFAULT_FIELD_TYPES` used as a prop
default — therefore compiled to a Vue SFC that crashed at runtime with
`ReferenceError: <name> is not defined` (e.g. the `BaseFormBuilder` Vue build).
External (non-relative, non-neutral, non-stylesheet) imports are now carried
through verbatim, matching the React emitter.
