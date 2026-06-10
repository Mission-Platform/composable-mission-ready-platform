# Mission Platform — Agent Guidelines

## Project Overview

**Mission Platform** (`mission-platform`) is a **VueJS 3 monorepo** managed with [pnpm workspaces](https://pnpm.io/workspaces). It follows a composable, package-driven architecture where reusable building blocks live in `packages/` and deployable applications are assembled from those building blocks in `apps/`.

The project uses the following core technologies:

| Technology | Purpose |
|---|---|
| Vue 3 (Composition API / `<script setup>`) | UI framework for all apps and components |
| TypeScript | Type-safe JavaScript across every workspace |
| Vite | Dev server and production bundler |
| Vitest + Playwright | Unit and browser-level testing |
| Storybook | Component development, documentation, and visual testing |
| pnpm workspaces | Monorepo dependency management |
| Turborepo | Task orchestration, caching, and incremental builds across workspaces |
| Changesets | Versioning and changelog automation |

---

## Repository Structure

```
composable_mission_ready_platform/
├── apps/                   # Deployable applications
│   ├── my-care-notes/      # My Care Notes Vue 3 app — note-taking with spell/grammar checking
│   └── storybook/          # Storybook app — component catalogue & visual tests
├── configs/                # Shared tooling/configuration workspace packages
│   ├── eslint-config/      # Base ESLint flat config
│   ├── postcss-config/     # Shared PostCSS configuration
│   ├── prettier-config/    # Base Prettier config
│   ├── stylelint-config/   # Base Stylelint config
│   ├── typescript-config/  # Shared TypeScript base tsconfig presets
│   └── vite-config/        # Shared Vite/Vitest configuration helpers
├── packages/               # Shared, reusable packages consumed by apps
│   ├── breakpoints/        # Responsive breakpoint utilities, composables, and Vue components
│   ├── components/         # Vue 3 component library
│   ├── harper/             # Harper grammar checker integration for Monaco editor
│   ├── hunspell/           # Hunspell spell checker compiled to WebAssembly
│   ├── i18n/               # vue-i18n integration utilities and base locales
│   ├── icons/              # SVG icon components
│   ├── map/                # MapLibre GL Vue 3 wrapper
│   ├── open-graph/         # Open Graph metadata generation and dynamic injection
│   ├── page-meta/          # Standard page metadata (title, description, canonical, hreflang, …) and dynamic injection
│   └── tokens/             # CSS design tokens and SCSS theme definitions
├── workers/                # Cloudflare Workers consumed by the apps
│   └── base-spa/           # Base SPA worker (static asset + SPA fallback handler)
├── scripts/                # Repo-wide tooling scripts (i18n extraction, etc.)
├── package.json            # Root workspace manifest (private, tooling only)
├── pnpm-workspace.yaml     # pnpm workspace configuration
└── AGENTS.md               # This file
```

---

## `apps/` — Applications

The `apps/` folder contains every deployable application in the platform. Each app is a self-contained pnpm workspace package that **composes functionality** by importing packages from the `packages/` folder.

### Conventions for apps

- Each app lives in its own subdirectory: `apps/<app-name>/`.
- App package names follow the scoped convention `@mission-platform/<app-name>`.
- Apps are **always `"private": true`** — they are never published to a registry.
- An app's `package.json` lists the shared `packages/` it depends on as workspace dependencies (e.g. `"@mission-platform/components": "workspace:*"`).
- Each app has its own `vite.config.ts`, `tsconfig.json`, and test setup.

### Current apps

| App | Path | Description |
|---|---|---|
| `@mission-platform/my-care-notes` | `apps/my-care-notes` | Vue 3 note-taking app with spell checking (Hunspell/WebAssembly), grammar checking (Harper), Monaco editor, vue-i18n, and Cloudflare Pages deployment |
| `@mission-platform/storybook` | `apps/storybook` | Storybook instance for developing, documenting, and visually testing Vue components sourced from `packages/` |

---

## `packages/` — Shared Packages

The `packages/` folder contains all reusable libraries that apps consume. These packages are the **composable building blocks** of the platform — they are independent, versioned, and publishable.

### Conventions for packages

- Each package lives in its own subdirectory: `packages/<package-name>/`.
- Package names follow the scoped convention `@mission-platform/<package-name>`.
- Packages should be **framework-agnostic where possible**, or clearly Vue-focused when they export SFCs or composables.
- Each package must have its own `package.json`, `tsconfig.json`, and `vite.config.ts` (or equivalent build config).
- Packages are versioned and released independently using [Changesets](https://github.com/changesets/changesets).
- Packages must **never import from `apps/`** — the dependency flow is strictly one-directional: `apps` → `packages`.

### Current packages

| Package | Path | Description |
|---|---|---|
| `@mission-platform/breakpoints` | `packages/breakpoints` | Responsive breakpoint utilities, composables, and Vue components |
| `@mission-platform/components` | `packages/components` | Vue 3 component library |
| `@mission-platform/harper` | `packages/harper` | Harper grammar and style checker integration for Monaco editor |
| `@mission-platform/hunspell` | `packages/hunspell` | Hunspell spell checker compiled to WebAssembly via Emscripten |
| `@mission-platform/i18n` | `packages/i18n` | vue-i18n integration utilities and compiled base locales |
| `@mission-platform/icons` | `packages/icons` | SVG icon components for Mission Platform |
| `@mission-platform/map` | `packages/map` | MapLibre GL Vue 3 wrapper with full reactivity support |
| `@mission-platform/seo` | `packages/seo` | Unified SEO surface — standard page metadata (`<title>`, description, canonical, hreflang, `<html lang>`, …), Open Graph + Twitter Card `<meta>` tags, and JSON-LD structured data (Schema.org `WebSite`, `WebPage`, `Organization`, `BreadcrumbList`, `Article`, `Product`, `FAQPage`, `Event`, … ) with a Vue 3 `useSeo` composable and `<Seo>` component for dynamic injection into `document.head` (SSR/SSG-safe via `@unhead/vue`) |
| `@mission-platform/tokens` | `packages/tokens` | CSS design tokens and SCSS theme definitions |

---

## `configs/` — Shared Tooling Configurations

The `configs/` folder contains the shared linting, formatting, and build-tooling configuration packages. They are pnpm workspace packages (same conventions as `packages/`), but kept in a dedicated top-level directory to make their tooling-only role explicit and to keep `packages/` focused on product-facing libraries.

### Conventions for configs

- Each config lives in its own subdirectory: `configs/<config-name>/`.
- Package names follow the scoped convention `@mission-platform/<config-name>`.
- Configs are consumed both by `packages/` and by `apps/` as `devDependencies` (`"workspace:*"`).
- Configs must **never import from `apps/` or `packages/`** — the dependency flow is one-way: `apps`/`packages` → `configs`.
- Configs are versioned and released independently using [Changesets](https://github.com/changesets/changesets), the same as `packages/`.

### Current configs

| Package | Path | Description |
|---|---|---|
| `@mission-platform/eslint-config` | `configs/eslint-config` | Base ESLint flat config — TypeScript, Vue 3 (script setup), JS rules |
| `@mission-platform/postcss-config` | `configs/postcss-config` | Shared PostCSS configuration for all packages and apps |
| `@mission-platform/prettier-config` | `configs/prettier-config` | Base Prettier config — print width, quotes, trailing commas, Vue indent |
| `@mission-platform/stylelint-config` | `configs/stylelint-config` | Base Stylelint config — standard SCSS + Vue SFC style blocks, BEM class naming |
| `@mission-platform/typescript-config` | `configs/typescript-config` | Shared TypeScript base configs — `base`, `app`, `library`, `node`, `test` presets |
| `@mission-platform/vite-config` | `configs/vite-config` | Shared Vite/Vitest helpers — `defineLibraryConfig`, `defineAppConfig`, `defineVitestConfig` |

All other packages and apps **must** extend the three linting/formatting configs rather than defining their own from scratch.

```js
// eslint.config.js in any package or app
import baseConfig from '@mission-platform/eslint-config'
export default [...baseConfig]

// prettier.config.js in any package or app
import baseConfig from '@mission-platform/prettier-config'
export default { ...baseConfig }

// stylelint.config.js in any package or app
import baseConfig from '@mission-platform/stylelint-config'
export default { ...baseConfig }
```

Where applicable, also extend `@mission-platform/postcss-config`:

```js
// postcss.config.js in any package or app that uses PostCSS
import baseConfig from '@mission-platform/postcss-config'
export default { ...baseConfig }
```

---

## `workers/` — Cloudflare Workers

The `workers/` folder contains Cloudflare Worker packages consumed by the deployable apps (for example, to serve static assets with an SPA-style fallback). They are pnpm workspace packages but are kept in a dedicated top-level directory to make their runtime/infrastructure role explicit and separate from product-facing libraries in `packages/`.

### Conventions for workers

- Each worker lives in its own subdirectory: `workers/<worker-name>/`.
- Package names follow the scoped convention `@mission-platform/<worker-name>`.
- Workers are **always `"private": true`** — they are never published to a registry, and are exempt from the Changesets release flow (same as `apps/`).
- Workers consume `configs/` packages as `devDependencies` (`"workspace:*"`) and may consume `packages/` as runtime dependencies when needed.
- Workers must **never import from `apps/`** — the dependency flow is strictly one-directional: `apps` → `packages`/`workers` → `configs`.

### Current workers

| Package | Path | Description |
|---|---|---|
| `@mission-platform/base-spa` | `workers/base-spa` | Cloudflare Worker that serves static assets with an SPA-style fallback, consumed by the deployable apps |

---

### Adding a new package

1. Create a new directory: `packages/<package-name>/` (or `configs/<config-name>/` for new shared tooling configurations).
2. Initialise a `package.json` with `"name": "@mission-platform/<package-name>"`.
3. Add `@mission-platform/eslint-config`, `@mission-platform/prettier-config`, `@mission-platform/stylelint-config`, and (where applicable) `@mission-platform/postcss-config` as `devDependencies` and wire up the config files.
4. Build and export the package (e.g. via a `vite` library build or `tsc`).
5. Reference it in any app that needs it: `"@mission-platform/<package-name>": "workspace:*"`.
6. Add stories or tests in `apps/storybook` to document the new components/composables.
7. Add a [Changeset](https://github.com/changesets/changesets) entry (`pnpm changeset`) describing the new package so it is included in the next versioned release.

---

## Development Workflow

> **Node version:** This repository pins its Node.js version via `.nvmrc`. You **must** run `nvm use` in every new shell before running any `pnpm` command — otherwise installs, builds, and tests may silently use the wrong Node version and fail in confusing ways.

> **Task runner:** All cross-workspace tasks (`build`, `lint`, `test`, …) are orchestrated by [Turborepo](https://turborepo.com). The root `turbo.json` defines only generic, cross-cutting tasks (`build`, `dev`, `test`, `lint`, `format`, `preview`, `storybook`, `deploy`, …). Workspace-specific tasks — `seo:generate` / `prebuild` (apps), `build:spa` (`apps/website`), `build:storybook` (`apps/storybook`), `build:ts` / `build:wasm` / `build:wasm:clean` (`packages/hunspell`), and `i18n:extract` (`scripts/`) — live in per-workspace `turbo.json` files that extend the root via `"extends": ["//"]`. Turbo handles topological ordering (`^build`), parallelism, and local caching under `.turbo/` and each workspace's `.turbo/` directory.

```bash
# Always select the correct Node version first (uses .nvmrc)
nvm use

# Install all workspace dependencies (pnpm manages the workspace; turbo runs the tasks)
pnpm install

# Run the Storybook development server (port 6006)
turbo run storybook --filter=@mission-platform/storybook

# Run the My Care Notes dev server
turbo run dev --filter=@mission-platform/my-care-notes

# Build all apps
turbo run build --filter="./apps/*"

# Build all shared tooling configs
turbo run build --filter="./configs/*"

# Build all packages
turbo run build --filter="./packages/*"

# Build everything, in topological order, with caching
turbo run build

# Run tests across all workspaces (turbo handles ordering and caching)
turbo run test

# Run only the tasks affected by your changes (compared against the default branch)
turbo run build test lint --affected

# Deploy My Care Notes (wrangler scripts on the root workspace)
pnpm deploy:my-care-notes

# Release packages with Changesets
pnpm changeset          # add a changeset describing the change (required for any
                        # user-visible change to a package in configs/ or packages/)
pnpm changeset status   # show pending changesets and the versions they will bump
pnpm changeset version  # consume changesets, bump versions, and update CHANGELOGs
pnpm changeset publish  # publish the bumped packages to the registry
```

### Changesets policy

- Every PR that changes a published workspace (anything under `configs/` or `packages/`) **must** include a changeset describing the change. The `Conventional Commits` GitHub workflow runs `pnpm changeset status` against the PR's base branch to enforce this.
- App-only changes (anything under `apps/`) do **not** require a changeset, since apps are private and never published.
- Pick the smallest meaningful bump: `patch` for bug fixes and internal refactors, `minor` for backwards-compatible features, `major` for breaking changes (mirror the `BREAKING CHANGE` / `!` marker used in the commit message).
- The changeset summary should mirror the Conventional Commit subject (without the `type(scope):` prefix), so the generated CHANGELOG reads naturally.

---

## Git Commit Convention

All commits in this repository **must** follow the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Commit message structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Rules

- The **type** is required and must be one of:
  - `feat` — a new feature (correlates with SemVer **MINOR**)
  - `fix` — a bug fix (correlates with SemVer **PATCH**)
  - `refactor` — a code change that is neither a bug fix nor a new feature
  - `style` — changes that do not affect meaning (formatting, whitespace, etc.)
  - `chore` — other changes that don't modify source or test files (e.g. config, tooling)
  - `docs` — documentation-only changes
  - `test` — adding or updating tests
  - `build` — changes that affect the build system or external dependencies
  - `ci` — CI configuration changes
  - `perf` — performance improvements
- The **scope** is optional but recommended; it must be the name of the workspace being changed — that is, the directory name under `apps/`, `packages/`, or `configs/` (e.g. `fix(map):`, `feat(components):`, `chore(eslint-config):`). Use `repo` for cross-cutting changes that don't belong to a single workspace.
- The **description** must immediately follow the `type(scope): ` prefix, be written in lowercase imperative mood, and must not end with a period.
- A **body** may be provided one blank line after the description for additional context.
- **Footers** go one blank line after the body (or description if no body). Use `BREAKING CHANGE: <description>` for breaking API changes (correlates with SemVer **MAJOR**). Use `Co-authored-by: Name <email>` for co-authorship.
- Append `!` after the type/scope to draw attention to a breaking change: `feat(api)!: remove deprecated endpoint`.

### Examples

```
feat(components): add BaseTooltip component

fix(map): make selectFeature parameter optional

refactor(components): remove redundant Window interface in use-hunspell-monaco

style(components): reformat Vue SFCs with htmlWhitespaceSensitivity ignore

chore(eslint-config): move shared eslint config into the configs/ workspace

chore: add dist/ to .gitignore

feat(api)!: drop support for Vue 2

BREAKING CHANGE: Vue 2 is no longer supported; upgrade to Vue 3.5+.
```

### Local enforcement (pre-commit hook)

Commit messages are validated **locally** as well as in CI, so non-conforming commits are rejected before they are created:

- A [Husky](https://typicode.github.io/husky/) `commit-msg` hook (`.husky/commit-msg`) runs [commitlint](https://commitlint.js.org) on every `git commit`.
- The hook is installed automatically by the root `prepare` script (`husky`) whenever you run `pnpm install`, so no manual setup is required.
- The rules live in the root `commitlint.config.mjs`. It extends `@commitlint/config-conventional` and is tuned to match this repo's convention: the allowed `type`s above, a lowercase-leading description with no trailing period, lowercase scopes, and a 72-character subject limit. The `Conventional Commits` GitHub workflow lints PR commits with the same `commitlint.config.mjs` (via `wagoid/commitlint-github-action`), so a single rule source is enforced both locally and in CI.
- To lint a message manually (e.g. while drafting), use `pnpm commitlint`, for example: `echo "feat(map): add layer toggle" | pnpm commitlint`.
- Bypassing the hook with `git commit --no-verify` is strongly discouraged — the same checks run in CI and will fail the PR.

---

## Key Principles for Agents

1. **Dependency direction is one-way.** Code in `packages/`, `configs/`, and `workers/` must never import from `apps/`. The flow is strictly `apps` → `packages`/`workers` → `configs` (and `apps` → `configs` directly for tooling).
2. **Isolate concerns in packages.** New reusable UI components, composables, utilities, or design tokens belong in `packages/`, not embedded inside an app. New shared lint/format/build tooling belongs in `configs/`.
3. **Each app wires packages together.** Apps are thin orchestration layers that compose packages into a working product.
4. **Storybook is the component workbench.** When adding or modifying components in `packages/`, add or update corresponding stories in `apps/storybook`.
5. **TypeScript everywhere.** All new files must be `.ts` or `.vue` (using `<script setup lang="ts">`). No plain JavaScript files.
6. **Test alongside implementation.** Unit tests (Vitest) and browser tests (Playwright) live next to the code they cover inside each workspace.
7. **Follow Conventional Commits.** Every commit must use the `type(scope): description` format defined in the Git Commit Convention section above.
8. **Ship a Changeset with every package change.** Any PR that modifies a workspace under `configs/` or `packages/` must include a changeset (`pnpm changeset`) — this is enforced by the `Conventional Commits` GitHub workflow.
