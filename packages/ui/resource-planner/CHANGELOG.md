# @mission-platform/resource-planner

## 1.2.3

### Patch Changes

- 8be0da7: align package manifest exports with dist/components output and disable forge clean
- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- 8be0da7: resolve DeepSource code quality, documentation, complexity, and typing issues
- 8be0da7: split monolithic tsdown configs into discrete target configs and purge vestigial vite configs
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
  - @mission-platform/forge-jsx@2.0.2
  - @mission-platform/forge-adapters@1.2.2
  - @mission-platform/scheduler@0.3.3
  - @mission-platform/vcard@0.2.4

## 1.2.2

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/forge-adapters@1.2.1
  - @mission-platform/forge-jsx@2.0.1
  - @mission-platform/scheduler@0.3.2
  - @mission-platform/vcard@0.2.3

## 1.2.1
### Patch Changes

- ca9c2aa: fix timezone sensitivity in overnight working hours tests
- edc494d: standardize storybook story import ordering and formatting
- Updated dependencies [0e9305d]
- Updated dependencies [355f413]
- Updated dependencies [7e3cc9d]
- Updated dependencies [edc494d]
- Updated dependencies [edc494d]
  - @mission-platform/forge-adapters@1.2.0
  - @mission-platform/forge-jsx@2.0.0
  - @mission-platform/scheduler@0.3.1
  - @mission-platform/vcard@0.2.2

## 1.2.0

### Minor Changes

- 97c3f20: add typed custom-property overrides for visual components

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 9e59f09: split shared UI capabilities into focused workspaces and update their design tokens
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
- Updated dependencies [46fe17a]
- Updated dependencies [9e59f09]
- Updated dependencies [97c3f20]
  - @mission-platform/forge-jsx@1.1.0
  - @mission-platform/scheduler@0.3.0
  - @mission-platform/vcard@0.2.1

## 1.1.0

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

### Patch Changes

- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
  - @mission-platform/scheduler@0.2.0
  - @mission-platform/vcard@0.2.0
  - @mission-platform/forge-jsx@1.0.0
