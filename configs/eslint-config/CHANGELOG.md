# @mission-platform/eslint-config

## 0.3.1

### Patch Changes

- 955a309: disable `import/default` so Vue SFC default imports are not flagged

  `eslint-plugin-import`'s `import/default` rule (DeepSource shortcode `JS-W1028`)
  cannot resolve the implicit default export a Vue `<script setup>` SFC compiles
  to, so importing a `.vue` component as a default import was wrongly reported as
  "No default export found in imported module". The shared config now switches
  that rule off — import linting continues through `eslint-plugin-import-x`, and
  DeepSource honours the disabled rule, silencing the false positives repo-wide.

## 0.3.0

### Minor Changes

- 6138e5f: integrate eslint-config-prettier to stop ESLint from enforcing formatting rules that conflict with Prettier (notably `eslint-plugin-vue`'s recommended formatting rules); Prettier is now the single source of truth for formatting
- be51917: add eslint-config-turbo to flag environment variables that are not declared in `turbo.json` (`globalEnv` / per-task `env`) and would otherwise silently break Turborepo's cache hashing

## 0.2.0

### Minor Changes

- e7a0c19: promote `@typescript-eslint/no-explicit-any` from `warn` to `error`

  Explicit `any` usage is now a lint error across all consuming
  workspaces, encouraging stricter typing in shared code.

### Patch Changes

- a9a149a: Ignore the top-level `storybook-static/` build output (in addition to `.storybook/storybook-static/`) so lint runs don't traverse generated Storybook artifacts.
- 021a647: Move shared tooling configs from `packages/` into a dedicated `configs/` workspace directory. Package names and public entry points are unchanged; consumers continue to import via `@mission-platform/<config-name>`.
- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

## 0.1.2

### Patch Changes

- ba565b3: disable vue/singleline-html-element-content-newline rule

  The rule conflicts with Prettier's `htmlWhitespaceSensitivity: 'ignore'` setting,
  which collapses short single-line elements. Prettier is the source of truth for
  HTML formatting.

## 0.1.1

### Patch Changes

- 5ed2115: add vue/html-self-closing eslint rule and reformat time column headers
  - add `vue/html-self-closing` rule to eslint-config enforcing `always` self-closing on void, normal, and component elements
  - reformat time column header elements (HH, MM, SS) in BaseTimeInput, BaseTimeRangeInput, and BaseDateTimeRangeInput to comply with the new rule

## 0.1.0

### Minor Changes

- feat: initial ESLint flat config with TypeScript, Vue 3 script-setup and JS rules
