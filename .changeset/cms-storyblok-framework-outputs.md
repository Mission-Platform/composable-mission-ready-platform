---
'@mission-platform/forge-plugin-api': minor
'@mission-platform/forge-cms-plugin-api': minor
'@mission-platform/forge-cms-storyblok': minor
'@mission-platform/vite-plugin-forge': minor
'@mission-platform/barcode': minor
'@mission-platform/breakpoints': minor
'@mission-platform/code-scanner': minor
'@mission-platform/components': minor
'@mission-platform/content': minor
'@mission-platform/email-components': minor
'@mission-platform/forms': minor
'@mission-platform/icons': major
'@mission-platform/layouts': minor
'@mission-platform/map': minor
'@mission-platform/matrix-code': minor
'@mission-platform/qr-code': minor
'@mission-platform/resource-planner': minor
'@mission-platform/scheduler': minor
'@mission-platform/three': minor
'@mission-platform/vcard': minor
---

add framework-specific Storyblok output builds for Forge packages

The CMS driver and Storyblok target now support shared assets plus React, Vue,
Svelte, Solid, and Web Components output. Forge packages expose the associated
build targets and components adds the generated Storyblok entry points.

BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
longer re-exports the catalog and sprite APIs; import those APIs from their
dedicated modules instead.