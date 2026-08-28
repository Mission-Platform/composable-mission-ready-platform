# @mission-platform/typescript-config

## 0.4.1

### Patch Changes

- 8a15dbc: add generated package API references and build-time documentation extraction

## 0.4.0

### Minor Changes

- 6290b4c: add framework auto-resolution via custom export conditions

  Every framework-shipping `@mission-platform/*` package now declares `mp:vue`,
  `mp:react`, `mp:solid`, and `mp:web-component` custom export
  conditions on its bare `.` entry (each resolving to the matching built `dist`
  artifact), so consumers can `import { X } from '@mission-platform/<pkg>'` with
  no framework subpath and have Vite and the TypeScript LSP resolve the correct
  framework build from a single app-level setting.

  `@mission-platform/vite-config` adds `defineFrameworkAppConfig`,
  `frameworkResolveConditions`, and `frameworkCondition` (plus the
  `MissionPlatformFramework` type) to set `resolve.conditions` from one
  `framework` option, and `@mission-platform/typescript-config` adds matching
  `framework-vue`, `framework-react`, `framework-solid`, and `framework-web-component`
  presets wiring the equivalent `customConditions`.

### Patch Changes

- ffa5129: relicense the project from MIT to BSD-4-Clause
- b23115e: add a workspace-local .prettierignore so build output is excluded from format checks

## 0.3.0

### Minor Changes

- 950320d: add React TypeScript presets

  `@mission-platform/typescript-config` now ships two React-oriented presets alongside the existing Vue ones:

  - `./react` — a DOM app/library preset (`jsx: react-jsx`, `DOM`/`DOM.Iterable`
    libs, bundler module resolution) for React workspaces.
  - `./stories-react` — the Storybook stories variant, extending `./react`.

  These mirror the existing `./app` / `./stories` Vue presets and are consumed by the new
  `@mission-platform/storybook-react` app.

## 0.2.0

### Minor Changes

- 184e7f0: add shared `@mission-platform/typescript-config` workspace

  Introduces a new shared tooling workspace under `configs/` that exposes
  `base`, `app`, `library`, `node`, and `test` tsconfig presets (extending
  `@vue/tsconfig`) so every package and app extends a single source of truth for the project's TypeScript standards.

- 37da963: add a `stories` variant for Storybook story files

  A new `tsconfig.stories.json` preset is exposed via the
  `@mission-platform/typescript-config/stories` subpath. It extends the shared base + `@vue/tsconfig/tsconfig.dom.json`
  and sets the Storybook story compiler options (DOM lib + `vite/client` types), so consuming workspaces can type-check
  their `src/**/*.stories.{ts,tsx}` files with a single `extends` (consumers declare their own `include` per the
  existing presets policy).

### Patch Changes

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run
  `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cce9928: remove `include`/`exclude` from shared tsconfig presets

  TypeScript resolves `include` and `exclude` globs relative to the tsconfig file that declares them, not relative to
  the consumer that extends them — so the globs shipped in the `app`, `library`, `node`, and `test` presets pointed at
  files inside `configs/typescript-config/`
  and never matched anything in consuming workspaces.

  Consumers must now declare their own `include`/`exclude` (which is what existing `packages/*` and `apps/*` workspaces
  already do). The
  `compilerOptions` portion of each preset is unchanged.

## 0.1.0

### Minor Changes

- Initial release. Shared TypeScript base configurations (`base`, `app`,
  `library`, `node`, `test`) for all Mission Platform packages and apps.
