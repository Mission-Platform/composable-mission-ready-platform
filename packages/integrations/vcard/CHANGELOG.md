# @mission-platform/vcard

## 0.2.2

### Patch Changes

- Updated dependencies [355f413]
- Updated dependencies [7788642]
- Updated dependencies [7788642]
  - @mission-platform/forge-adapters@1.2.0
  - @mission-platform/forge-jsx@2.0.0
  - @mission-platform/components@3.1.1
  - @mission-platform/typography@1.1.1

## 0.2.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 46fe17a: scope Forge build environment variables to package build tasks
- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
- Updated dependencies [46fe17a]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
- Updated dependencies [31ed685]
  - @mission-platform/components@3.1.0
  - @mission-platform/forge-jsx@1.1.0
  - @mission-platform/typography@1.1.0

## 0.2.0

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
  - @mission-platform/components@3.0.0
  - @mission-platform/forge-jsx@1.0.0
