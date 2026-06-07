---
'@mission-platform/storybook': patch
---

use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

Migrates `vite.config.ts` to use `defineAppConfig` (bundling the Vue
plugin, vue-i18n plugin, and shared PostCSS pipeline) and the
`tsconfig.app.json` / `tsconfig.node.json` files to extend the shared
TypeScript presets. The `vueJsx` + `svgLoader` plugins and the Vitest
storybook/unit project configuration are layered in via `overrides`.
No runtime or public-API change.
