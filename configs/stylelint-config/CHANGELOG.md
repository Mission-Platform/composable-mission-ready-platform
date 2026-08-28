# @mission-platform/stylelint-config

## 0.1.4

### Patch Changes

- 8a15dbc: add generated package API references and build-time documentation extraction

## 0.1.3

### Patch Changes

- ffa5129: relicense the project from MIT to BSD-4-Clause

## 0.1.2

### Patch Changes

- 7e74f71: import default config export in prettier and stylelint configurations

## 0.1.1

### Patch Changes

- 021a647: Move shared tooling configs from `packages/` into a dedicated `configs/` workspace directory. Package names
  and public entry points are unchanged; consumers continue to import via `@mission-platform/<config-name>`.
- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

## 0.1.0

### Minor Changes

- feat: initial Stylelint config with standard SCSS, Vue SFC style blocks and BEM class naming
