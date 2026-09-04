# @mission-platform/forge-cms-storyblok

## 0.2.2

### Patch Changes

- Updated dependencies [7788642]
- Updated dependencies [7788642]
  - @mission-platform/forge-cms-plugin-api@0.2.2
  - @mission-platform/forge-plugin-api@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [89aab02]
  - @mission-platform/forge-plugin-api@0.3.0
  - @mission-platform/forge-cms-plugin-api@0.2.1

## 0.2.0

### Minor Changes

- be97ac0: add framework-specific Storyblok output builds for Forge packages

  The CMS driver and Storyblok target now support shared assets plus React, Vue,
  Svelte, Solid, and Web Components output. Forge packages expose the associated
  build targets and components adds the generated Storyblok entry points.

  BREAKING CHANGE: the generated `@mission-platform/icons` components barrel no
  longer re-exports the catalog and sprite APIs; import those APIs from their
  dedicated modules instead.

- 4714506: add the forge CMS plugin API and five content-platform targets

  `@mission-platform/forge-cms-plugin-api` owns the platform-neutral content model
  (`analyzeContentComponent`, `ContentComponent`, `ContentField`), the
  `CmsOutputPlugin` contract, the generic discover → IR → content model → emit →
  write driver, island co-generation, and the `defineTsdownForgeCms(All)` build
  helpers.

  A CMS target composes an existing `FrameworkOutputPlugin` rather than replacing
  one, so `storyblok × vue`, `astro × solid`, and `ghost × web-components` are
  configuration rather than new code. The five targets are `forge-cms-storyblok`
  (component objects, blok wrappers, `components.json`), `forge-cms-astro` (static
  `.astro` plus `client:load` framework islands), `forge-cms-ghost` (Handlebars
  partials plus a `config.custom` fragment), `forge-cms-jekyll` (Liquid includes
  plus `_data` schema and a `_config.yml` fragment), and `forge-cms-webflow`
  (`declareComponent` code components plus a `webflow.json` library fragment).

### Patch Changes

- Updated dependencies [be97ac0]
- Updated dependencies [4714506]
- Updated dependencies [be97ac0]
  - @mission-platform/forge-plugin-api@0.2.0
  - @mission-platform/forge-cms-plugin-api@0.2.0
