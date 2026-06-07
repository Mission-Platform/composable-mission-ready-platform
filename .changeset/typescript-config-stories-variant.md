---
'@mission-platform/typescript-config': minor
---

add a `stories` variant for Storybook story files

A new `tsconfig.stories.json` preset is exposed via the
`@mission-platform/typescript-config/stories` subpath. It extends the
shared base + `@vue/tsconfig/tsconfig.dom.json` and sets the Storybook
story compiler options (DOM lib + `vite/client` types), so consuming
workspaces can type-check their `src/**/*.stories.{ts,tsx}` files with
a single `extends` (consumers declare their own `include` per the
existing presets policy).
