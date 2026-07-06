---
'@mission-platform/vite-plugin-jsx': minor
---

remap the write-once icon import to each framework build

A neutral component that imports an icon from `@mission-platform/icons` now
has that bare specifier rewritten to the per-framework subpath when compiled:
`@mission-platform/icons/vue` in the Vue output and
`@mission-platform/icons/react` in the React output. The Vue path handles it
in `readExternalImports` (which now takes the target framework) and the React
emitter rewrites it in its own import pass, mirroring the existing
`Teleport`/`Transition` neutral-to-framework remap. The `<IconX />` usages are
left intact as native component tags.
