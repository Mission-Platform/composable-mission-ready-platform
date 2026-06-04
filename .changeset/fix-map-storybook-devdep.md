---
"@mission-platform/map": patch
---

Remove `@storybook/vue3-vite` from devDependencies. Storybook is an app-level concern and must not be a dependency of a library package; it lives exclusively in `apps/storybook`. Also remove unnecessary `as Story` type assertion in `map-layer.stories.ts` — the variable's declared type annotation already provides full type checking.
