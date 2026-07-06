---
'@mission-platform/icons': minor
---

add a framework-neutral entry point

The package now exposes a framework-neutral `.` export (the neutral icon source,
typed against the built `dist/components` declarations) alongside the existing
compiled `./react` / `./vue` subpaths. This lets a write-once
`@mission-platform/jsx` component import an icon from `@mission-platform/icons`
so it type-checks and renders through the runtime adapters in unit tests, while
`@mission-platform/vite-plugin-jsx` remaps that specifier to the matching
per-framework build for the emitted React/Vue output. The package `src` is now
published so the neutral entry resolves.
