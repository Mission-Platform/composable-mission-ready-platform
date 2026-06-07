# @mission-platform/vite-config

## 0.2.0

### Minor Changes

- a2ad954: add shared `@mission-platform/vite-config` workspace

  Introduces a new shared tooling workspace under `configs/` that exposes
  `defineLibraryConfig`, `defineAppConfig`, and `defineVitestConfig`
  (via the `./vitest` subpath) helpers, bundling the standard Vue +
  vue-i18n plugins, shared PostCSS pipeline, and library build defaults
  consumed by every Mission Platform workspace. Built with `tsc` against
  `@mission-platform/typescript-config/library`.

### Patch Changes

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- daf4be2: add `fileName` option to `defineLibraryConfig`

  Consumers can now set the Rollup output bundle name (without extension)
  directly via `defineLibraryConfig({ fileName: 'breakpoints' })` instead
  of re-declaring the full `build.lib.entry` + `fileName` pair under
  `overrides`. The option is ignored when `entry` is an entry map.

- 5eaacf4: reformat README tables and code samples for consistent column widths
- Updated dependencies [021a647]
- Updated dependencies [05d31c9]
- Updated dependencies [91deb58]
  - @mission-platform/postcss-config@0.1.1

## 0.1.0

### Minor Changes

- Initial release. Shared Vite and Vitest helpers (`defineLibraryConfig`,
  `defineAppConfig`, `defineVitestConfig`) for all Mission Platform packages
  and apps.
