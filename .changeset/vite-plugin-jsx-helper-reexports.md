---
"@mission-platform/vite-plugin-jsx": minor
---

forward non-component helper re-exports through the generated entry

The two-stage compiler now also forwards a barrel's **helper-module**
re-exports (e.g. `export { useToast, … } from './toast-store'`) through the
generated `./react` / `./vue` entry (and its synthesised `.d.ts`), re-pointing
them at the helper file copied into the flat per-framework tree. This lets a
write-once package expose shared framework-agnostic APIs (such as the
`@mission-platform/components` toast store) alongside its components, so each
framework's consumers drive the same per-framework singleton the components use.
A new `discoverHelperExports` helper distinguishes these from component exports
(component re-exports are unaffected).
