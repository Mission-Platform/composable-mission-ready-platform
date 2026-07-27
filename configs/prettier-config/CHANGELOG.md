# @mission-platform/prettier-config

## 0.1.5

### Patch Changes

- 7e74f71: import default config export in prettier and stylelint configurations

## 0.1.4

### Patch Changes

- 2bd1243: stop adding trailing commas in JSONC files

  The `**/*.jsonc` override used `trailingComma: 'es5'`, which made Prettier
  append a trailing comma before every closing `}`/`]`. JSONC consumers such as
  Wrangler's config reject those commas, so the override now uses
  `trailingComma: 'none'` while keeping the `jsonc` parser (so comments are still
  supported).

## 0.1.3

### Patch Changes

- 2b34b1c: drop the unused `@mission-platform/eslint-config` devDependency

## 0.1.2

### Patch Changes

- 021a647: Move shared tooling configs from `packages/` into a dedicated `configs/` workspace directory. Package names and public entry points are unchanged; consumers continue to import via `@mission-platform/<config-name>`.
- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

## 0.1.1

### Patch Changes

- 480191b: Add `htmlWhitespaceSensitivity: 'ignore'` to the Prettier config. This ensures multi-line Vue/HTML elements with inline content (e.g. `{{ label }}`) are formatted with the content on its own line rather than immediately following the closing `>` of the opening tag.
