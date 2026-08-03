---
'@mission-platform/vite-plugin-forge': minor
'@mission-platform/barcode': minor
'@mission-platform/code-scanner': minor
'@mission-platform/components': minor
'@mission-platform/d3': minor
'@mission-platform/forms': minor
'@mission-platform/icons': minor
'@mission-platform/layouts': minor
'@mission-platform/map': minor
'@mission-platform/matrix-code': minor
'@mission-platform/qr-code': minor
'@mission-platform/rxjs': minor
---

add Solid, Svelte, and Web Components code generators and per-framework build targets

The JSX plugin now emits Solid, Svelte, and Web Components modules alongside the existing Vue and React outputs, and every write-once component package gains matching `build:solid`, `build:svelte`, and `build:web-components` targets plus optional peer dependencies for the new frameworks.
