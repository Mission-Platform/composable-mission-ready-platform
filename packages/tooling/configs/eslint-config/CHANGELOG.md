# @mission-platform/eslint-config

## 1.0.2

### Patch Changes

- 8a15dbc: add generated package API references and build-time documentation extraction

## 1.0.1

### Patch Changes

- ffa5129: relicense the project from MIT to BSD-4-Clause

## 1.0.0

### Major Changes

- 9920e47: swap the vue-i18n ESLint plugin for eslint-plugin-i18next

  The shared flat config now registers [`eslint-plugin-i18next`](https://github.com/edvardchen/eslint-plugin-i18next)
  (its `i18next/no-literal-string` rule registered but disabled by default, leaving it available for opt-in per
  workspace) instead of `@intlify/eslint-plugin-vue-i18n`.

  BREAKING CHANGE: the `@intlify/vue-i18n/*` rules (`no-raw-text`, `no-missing-keys`, …) and the `vue-i18n` settings
  block are removed. Workspaces relying on those rules should switch to `eslint-plugin-i18next`'s
  `i18next/no-literal-string`.

### Minor Changes

- 6a01720: add `eslint-plugin-sonarjs` to `@mission-platform/eslint-config`

  Registers `eslint-plugin-sonarjs` in the shared ESLint flat configuration, enabling SonarJS recommended rules across
  all packages and apps in the monorepo.

- 66bd057: enforce dependency direction so apps and packages cannot import from each other

## 0.3.2

### Patch Changes

- e9b2b65: guard turbo config name lookup with optional chaining

  The flat-config mapping over `turboConfig` now reads `cfg?.name` instead of `cfg.name`, so a `null`/`undefined` entry
  no longer throws while ESLint loads the shared config.

## 0.3.1

### Patch Changes

- 955a309: disable `import/default` so Vue SFC default imports are not flagged

  `eslint-plugin-import`'s `import/default` rule (DeepSource shortcode `JS-W1028`)
  cannot resolve the implicit default export a Vue `<script setup>` SFC compiles to, so importing a `.vue` component as
  a default import was wrongly reported as
  "No default export found in imported module". The shared config now switches that rule off — import linting continues
  through `eslint-plugin-import-x`, and DeepSource honours the disabled rule, silencing the false positives repo-wide.

## 0.3.0

### Minor Changes

- 6138e5f: integrate eslint-config-prettier to stop ESLint from enforcing formatting rules that conflict with Prettier
  (notably `eslint-plugin-vue`'s recommended formatting rules); Prettier is now the single source of truth for
  formatting
- be51917: add eslint-config-turbo to flag environment variables that are not declared in `turbo.json` (`globalEnv` /
  per-task `env`) and would otherwise silently break Turborepo's cache hashing

## 0.2.0

### Minor Changes

- e7a0c19: promote `@typescript-eslint/no-explicit-any` from `warn` to `error`

  Explicit `any` usage is now a lint error across all consuming workspaces, encouraging stricter typing in shared code.

### Patch Changes

- a9a149a: Ignore the top-level `storybook-static/` build output (in addition to `.storybook/storybook-static/`) so lint
  runs don't traverse generated Storybook artifacts.
- 021a647: Move shared tooling configs from `packages/` into a dedicated `packages/tooling/configs/` workspace directory. Package names
  and public entry points are unchanged; consumers continue to import via `@mission-platform/<config-name>`.
- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

## 0.1.2

### Patch Changes

- ba565b3: disable vue/singleline-html-element-content-newline rule

  The rule conflicts with Prettier's `htmlWhitespaceSensitivity: 'ignore'` setting, which collapses short single-line
  elements. Prettier is the source of truth for HTML formatting.

## 0.1.1

### Patch Changes

- 5ed2115: add vue/html-self-closing eslint rule and reformat time column headers
  - add `vue/html-self-closing` rule to eslint-config enforcing `always` self-closing on void, normal, and component
    elements
  - reformat time column header elements (HH, MM, SS) in BaseTimeInput, BaseTimeRangeInput, and BaseDateTimeRangeInput
    to comply with the new rule

## 0.1.0

### Minor Changes

- feat: initial ESLint flat config with TypeScript, Vue 3 script-setup and JS rules
