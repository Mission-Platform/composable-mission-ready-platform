# @mission-platform/resource-planner

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
  - @mission-platform/forge@1.0.0
