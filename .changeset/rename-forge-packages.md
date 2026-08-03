---
'@mission-platform/forge': major
'@mission-platform/vite-plugin-forge': major
---

rename the write-once runtime and compiler packages from `jsx` to `forge`

The neutral runtime `@mission-platform/jsx` is now `@mission-platform/forge`
and its two-stage compiler `@mission-platform/vite-plugin-jsx` is now
`@mission-platform/vite-plugin-forge`, reflecting that these packages now cover
components, composables, and more — not just JSX.

BREAKING CHANGE: update every import specifier from `@mission-platform/jsx` to
`@mission-platform/forge` (including subpaths such as `@mission-platform/jsx/react`
→ `@mission-platform/forge/react` and `@mission-platform/jsx/jsx-globals` →
`@mission-platform/forge/jsx-globals`), swap the dev dependency and Vite plugin
import from `@mission-platform/vite-plugin-jsx` to
`@mission-platform/vite-plugin-forge`, and update the plugin identifier
references accordingly.
