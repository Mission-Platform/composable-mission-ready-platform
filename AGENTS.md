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
| Changesets | Versioning and changelog automation |

---

## Repository Structure

```
composable_mission_ready_platform/
├── apps/                   # Deployable applications
│   └── storybook/          # Storybook app — component catalogue & visual tests
├── packages/               # Shared, reusable packages consumed by apps
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
| `@mission-platform/prettier-config` | `packages/prettier-config` | Base Prettier config — print width, quotes, trailing commas, Vue indent |
| `@mission-platform/eslint-config` | `packages/eslint-config` | Base ESLint flat config — TypeScript, Vue 3 (script setup), JS rules |
| `@mission-platform/stylelint-config` | `packages/stylelint-config` | Base Stylelint config — standard SCSS + Vue SFC style blocks, BEM class naming |

All other packages and apps **must** extend these three configs rather than defining their own from scratch.

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

---

### Adding a new package

1. Create a new directory: `packages/<package-name>/`.
2. Initialise a `package.json` with `"name": "@mission-platform/<package-name>"`.
3. Add `@mission-platform/eslint-config`, `@mission-platform/prettier-config`, and `@mission-platform/stylelint-config` as `devDependencies` and wire up the config files.
4. Build and export the package (e.g. via a `vite` library build or `tsc`).
5. Reference it in any app that needs it: `"@mission-platform/<package-name>": "workspace:*"`.
6. Add stories or tests in `apps/storybook` to document the new components/composables.

---

## Development Workflow

```bash
# Install all workspace dependencies
pnpm install

# Run the Storybook development server (port 6006)
pnpm --filter @mission-platform/storybook storybook

# Build all apps
pnpm --filter "./apps/**" build

# Run tests across all workspaces
pnpm --filter "./apps/**" test

# Release packages with Changesets
pnpm changeset        # describe changes
pnpm changeset version # bump versions
pnpm changeset publish # publish to registry
```

---

## Key Principles for Agents

1. **Dependency direction is one-way.** Code in `packages/` must never import from `apps/`. Apps import from packages, not the reverse.
2. **Isolate concerns in packages.** New reusable UI components, composables, utilities, or design tokens belong in `packages/`, not embedded inside an app.
3. **Each app wires packages together.** Apps are thin orchestration layers that compose packages into a working product.
4. **Storybook is the component workbench.** When adding or modifying components in `packages/`, add or update corresponding stories in `apps/storybook`.
5. **TypeScript everywhere.** All new files must be `.ts` or `.vue` (using `<script setup lang="ts">`). No plain JavaScript files.
6. **Test alongside implementation.** Unit tests (Vitest) and browser tests (Playwright) live next to the code they cover inside each workspace.
