<p align="center">
  <img src="./icon.svg" alt="Mission Platform icon" width="96" height="96"/>
</p>

<h1 align="center">Mission Platform</h1>

<p align="center">
  A composable, package-driven Vue 3 component platform — modular building blocks assembled into production-ready applications.
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white"/>
  <img alt="pnpm workspaces" src="https://img.shields.io/badge/pnpm-workspaces-f69220?logo=pnpm&logoColor=white"/>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white"/>
  <img alt="Storybook" src="https://img.shields.io/badge/Storybook-10-ff4785?logo=storybook&logoColor=white"/>
</p>

---

## Overview

Mission Platform is a **Vue 3 monorepo** managed with [pnpm workspaces](https://pnpm.io/workspaces). It follows a composable, package-driven architecture where reusable building blocks live in `packages/` and deployable applications are assembled from those building blocks in `apps/`.

```
composable_mission_ready_platform/
├── apps/
│   ├── my-care-notes/      # Note-taking app with spell/grammar checking & Cloudflare Pages deployment
│   └── storybook/          # Component catalogue & visual tests
└── packages/
    ├── breakpoints/        # Responsive breakpoint utilities & composables
    ├── components/         # Vue 3 component library
    ├── icons/              # SVG icon components
    ├── tokens/             # CSS design tokens & SCSS theme definitions
    ├── i18n/               # Internationalisation (vue-i18n)
    ├── map/                # MapLibre GL Vue 3 wrapper
    ├── hunspell/           # WebAssembly spell checker
    ├── postcss-config/     # Shared PostCSS configuration
    ├── eslint-config/      # Shared ESLint flat config
    ├── prettier-config/    # Shared Prettier config
    └── stylelint-config/   # Shared Stylelint config
```

---

## Apps

| App | Description |
|---|---|
| `@mission-platform/my-care-notes` | Vue 3 note-taking app with Hunspell spell checking, Harper grammar checking, Monaco editor, vue-i18n, and Cloudflare Pages deployment |
| `@mission-platform/storybook` | Storybook instance for developing, documenting, and visually testing Vue components |

---

## Packages

| Package | Description |
|---|---|
| `@mission-platform/components` | Vue 3 component library |
| `@mission-platform/tokens` | CSS design tokens & SCSS theme definitions |
| `@mission-platform/icons` | SVG icon components |
| `@mission-platform/breakpoints` | Responsive breakpoint utilities, composables, and Vue components |
| `@mission-platform/i18n` | Internationalisation via vue-i18n |
| `@mission-platform/map` | MapLibre GL Vue 3 wrapper with full reactivity support |
| `@mission-platform/hunspell` | Hunspell spell checker compiled to WebAssembly via Emscripten |
| `@mission-platform/postcss-config` | Shared PostCSS configuration |
| `@mission-platform/eslint-config` | Shared ESLint flat config (TypeScript + Vue 3) |
| `@mission-platform/prettier-config` | Shared Prettier config |
| `@mission-platform/stylelint-config` | Shared Stylelint config (SCSS + BEM) |

---

## Tech Stack

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

## Getting Started

### Prerequisites

- **Node.js** ≥ 24
- **pnpm** ≥ 11 — install with `corepack enable pnpm`

### Install

```bash
pnpm install
```

### Development

```bash
# Run the Storybook dev server (http://localhost:6006)
pnpm storybook

# Run the My Care Notes dev server (http://localhost:5173)
pnpm --filter @mission-platform/my-care-notes dev
```

### Build

```bash
# Build all packages and apps
pnpm build

# Build a specific package
pnpm --filter @mission-platform/components build
```

### Lint & Format

```bash
# Lint all workspaces in parallel
pnpm lint

# Check styles across all workspaces
pnpm lint:style

# Format all workspaces
pnpm format
```

### Test

```bash
# Run tests across all packages
pnpm --filter "./packages/**" test

# Run tests across all apps
pnpm --filter "./apps/**" test
```

---

## Architecture

### Dependency direction

The dependency graph is strictly **one-directional**:

```
apps/  →  packages/
```

Code in `packages/` must **never** import from `apps/`. Apps are thin orchestration layers that compose packages into a working product.

### Shared tooling configs

Every package and app extends the three base configs rather than defining their own:

```js
// eslint.config.js
import baseConfig from '@mission-platform/eslint-config'
export default [...baseConfig]
```

```js
// prettier.config.js
import baseConfig from '@mission-platform/prettier-config'
export default { ...baseConfig }
```

```js
// stylelint.config.js
import baseConfig from '@mission-platform/stylelint-config'
export default { ...baseConfig }
```

---

## Adding a New Package

1. Create `packages/<package-name>/` with a `package.json` named `@mission-platform/<package-name>`.
2. Add `eslint-config`, `prettier-config`, and `stylelint-config` as `devDependencies` and wire up the shared configs.
3. Build and export the package (via a Vite library build or `tsc`).
4. Reference it in any app: `"@mission-platform/<package-name>": "workspace:*"`.
5. Add stories in `apps/storybook` to document the new components or composables.

---

## Releases

Packages are versioned and released independently using [Changesets](https://github.com/changesets/changesets).

```bash
# Describe your changes
pnpm changeset

# Bump package versions
pnpm changeset version

# Publish to the registry
pnpm changeset publish
```

---

## Contributing

- All new files must be `.ts` or `.vue` (using `<script setup lang="ts">`). No plain JavaScript.
- Unit tests (Vitest) and browser tests (Playwright) live next to the code they cover inside each workspace.
- Keep packages framework-agnostic where possible; clearly mark Vue-specific packages with SFCs or composables.

---

## License

Private — all rights reserved.
