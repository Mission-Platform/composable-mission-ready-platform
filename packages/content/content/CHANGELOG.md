# @mission-platform/content

## 1.1.0

### Minor Changes

- 97c3f20: add typed custom-property overrides for visual components

### Patch Changes

- 7e40fba: use the cataloged DOMPurify dependency
- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- 0c74365: Harden content rendering and scanner runtime behavior
- 46fe17a: scope Forge build environment variables to package build tasks
- e56f10c: preserve Unicode letters and numbers when generating Markdown slugs
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [9774a09]
- Updated dependencies [8a15dbc]
- Updated dependencies [46fe17a]
- Updated dependencies [b88a08e]
- Updated dependencies [9e59f09]
- Updated dependencies [e0c66e1]
- Updated dependencies [97c3f20]
- Updated dependencies [31ed685]
  - @mission-platform/components@3.1.0
  - @mission-platform/float@1.1.0
  - @mission-platform/forge-web-script-language-service@0.2.0
  - @mission-platform/forge-jsx@1.1.0
  - @mission-platform/harper@0.2.2
  - @mission-platform/hunspell@0.4.2
  - @mission-platform/icons@2.0.1
  - @mission-platform/tokens@2.0.0
  - @mission-platform/typography@1.1.0
  - @mission-platform/forge-plugin-vue@0.2.0
  - @mission-platform/forge-plugin-react@0.1.2
  - @mission-platform/forge-plugin-solid@0.1.2
  - @mission-platform/forge-plugin-svelte@0.1.2
  - @mission-platform/forge-plugin-web-components@0.1.2

## 1.0.0

### Major Changes

- 4714506: move the Storyblok projection under the `./cms/storyblok/*` export namespace

  Storyblok output is now produced by `@mission-platform/forge-cms-storyblok`
  through the shared CMS driver, which namespaces every content-platform build
  under `dist/cms/<cms>/<framework>/`.

  BREAKING CHANGE: the `./storyblok/react`, `./storyblok/vue`, and
  `./storyblok/components.json` subpath exports are now `./cms/storyblok/react`,
  `./cms/storyblok/vue`, and `./cms/storyblok/components.json`, resolving to
  `dist/cms/storyblok/**` instead of `dist/storyblok/**`. Update imports
  accordingly; the module contents are unchanged.

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
- Updated dependencies [66130ee]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
- Updated dependencies [be97ac0]
  - @mission-platform/components@3.0.0
  - @mission-platform/icons@2.0.0
  - @mission-platform/forge-plugin-solid@0.1.1
  - @mission-platform/forge-plugin-svelte@0.1.1
  - @mission-platform/forge-plugin-vue@0.1.1
  - @mission-platform/tokens@1.1.0
  - @mission-platform/forge-plugin-react@0.1.1
  - @mission-platform/forge-plugin-web-components@0.1.1
  - @mission-platform/forge-jsx@1.0.0
  - @mission-platform/harper@0.2.1
  - @mission-platform/hunspell@0.4.1
