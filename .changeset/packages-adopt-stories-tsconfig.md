---
'@mission-platform/breakpoints': patch
'@mission-platform/components': patch
'@mission-platform/icons': patch
'@mission-platform/map': patch
---

adopt shared `stories` tsconfig preset for Storybook story files

Each package that ships Storybook stories now has a dedicated
`tsconfig.stories.json` extending
`@mission-platform/typescript-config/stories` and is registered as a
project reference from the workspace's root `tsconfig.json`. This gives
`src/**/*.stories.{ts,tsx}` files a dedicated TypeScript project so
ESLint's `projectService` can type-check them out of the box, and
removes the legacy `tsconfig.storybook.json` from
`@mission-platform/map` in favour of the shared name.
