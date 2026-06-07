# @mission-platform/breakpoints

## 2.0.0

### Patch Changes

- 9e8198e: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates the package's `vite.config.ts`, `vitest.config.ts`, and the
  four `tsconfig.*.json` files to extend the shared workspaces under
  `configs/`. No runtime or public-API change — `dist/` output is
  identical.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- 6679759: adopt shared `stories` tsconfig preset for Storybook story files

  Each package that ships Storybook stories now has a dedicated
  `tsconfig.stories.json` extending
  `@mission-platform/typescript-config/stories` and is registered as a
  project reference from the workspace's root `tsconfig.json`. This gives
  `src/**/*.stories.{ts,tsx}` files a dedicated TypeScript project so
  ESLint's `projectService` can type-check them out of the box, and
  removes the legacy `tsconfig.storybook.json` from
  `@mission-platform/map` in favour of the shared name.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers
  (Vite/Rollup) can safely drop unused exports. Pure-TypeScript packages
  (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs
  (`breakpoints`, `components`, `icons`, `map`, `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component
  styles and SCSS entrypoints are preserved.

- Updated dependencies [d2bf0e1]
- Updated dependencies [c8f7e0a]
- Updated dependencies [2e27467]
- Updated dependencies [05d31c9]
- Updated dependencies [cf89515]
  - @mission-platform/i18n@0.3.0

## 1.0.0

### Patch Changes

- Updated dependencies [ba565b3]
  - @mission-platform/i18n@0.2.0

## 0.1.0

### Minor Changes

- feat: initial breakpoints package with responsive SCSS utilities and useBreakpoints composable
