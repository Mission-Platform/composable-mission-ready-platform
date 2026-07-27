# Mission Platform Architecture

## Overview

Mission Platform is a composable, package-driven Vue 3 component platform designed for building production-ready applications with reusable building blocks. It follows a monorepo architecture managed with [pnpm workspaces](https://pnpm.io/workspaces) and orchestrated by [Turborepo](https://turborepo.com).

## Architecture Principles

### 1. Composable Architecture
Mission Platform emphasizes **composition over inheritance**. Instead of large, monolithic frameworks, the platform provides small, focused packages that can be combined to build applications.

### 2. Cross-Framework Development
The platform supports writing components once and using them across multiple frameworks (currently Vue 3 and React) through innovative compilation techniques.

### 3. Type Safety
Every package is written in **TypeScript**, ensuring type safety throughout the development process and providing excellent developer experience with autocompletion and error checking.

### 4. Design System Integration
Built-in support for design tokens, theming, and responsive breakpoints ensures consistent visual appearance across applications.

## Repository Structure

```
composable_mission_ready_platform/
├── apps/                   # Deployable applications
│   ├── my-care-notes/      # Vue 3 note-taking application with spell checking
│   ├── service-monitor/    # Service health and status monitoring dashboard
│   ├── storybook/          # Vue 3 Storybook component catalogue and visual tests
│   ├── storybook-react/    # React Storybook catalogue for cross-framework components
│   └── website/            # Platform website and documentation portal
├── configs/                # Shared tooling configurations
│   ├── eslint-config/      # Base ESLint flat config
│   ├── i18n-config/        # Shared i18n configuration
│   ├── i18next-cli-vue/    # i18next CLI Vue extractor configuration
│   ├── postcss-config/     # Shared PostCSS configuration
│   ├── prettier-config/    # Base Prettier config
│   ├── stylelint-config/   # Base Stylelint config
│   ├── typescript-config/  # Shared TypeScript base configs
│   └── vite-config/        # Shared Vite and Vitest helpers
├── packages/               # Reusable building blocks
│   ├── barcode/            # 1D/2D Barcode generation and utilities
│   ├── breakpoints/        # Responsive breakpoint utilities, composables, and Vue components
│   ├── code-scanner/       # Camera-based barcode and matrix code scanner
│   ├── components/         # Cross-framework UI component library
│   ├── d3/                 # Reactive D3.js visualization wrappers
│   ├── forms/              # Form primitives and validation components
│   ├── forms-core/         # Core form validation schema engine
│   ├── harper/             # Harper grammar checker integration for Monaco editor
│   ├── hunspell/           # Hunspell spell checker compiled to WebAssembly
│   ├── i18n/               # Framework-agnostic i18next wrapper and adapters
│   ├── icons/              # Write-once SVG icon components for Vue 3 and React
│   ├── jsx/                # Framework-neutral JSX runtime and adapters
│   ├── layout/             # Layout primitives (stacks, grids, separators)
│   ├── map/                # MapLibre GL Vue 3 wrapper
│   ├── matrix-code/        # DataMatrix and QR code rendering utilities
│   ├── phone-number/       # Phone number formatting and validation
│   ├── qr-code/            # SVG/Canvas QR code generator
│   ├── router/             # Framework-agnostic routing system
│   ├── rxjs/               # RxJS composables and utilities for Vue 3
│   ├── scheduler-core/     # Scheduler engine and timeline utilities
│   ├── seo/                # Framework-agnostic meta tag and SEO composables
│   └── tokens/             # Design tokens authored in DTCG format with OKLab colors
├── vite-plugins/           # Vite build plugins
│   ├── assemblyscript/     # AssemblyScript compilation plugin for Vite
│   ├── i18n/               # Vite plugin for i18n locale loading and extraction
│   ├── jsx/                # Two-stage compiler for framework-neutral JSX components
│   ├── seo/                # Vite plugin that generates robots.txt and sitemap.xml
│   └── tokens/             # Vite plugin that generates design-token artifacts from DTCG sources
├── workers/                # Cloudflare Workers
│   └── base-spa/           # Base SPA worker for serving static assets with an SPA-style fallback
└── scripts/                # Repo-wide tooling scripts (i18n extraction, etc.)
```

## Dependency Flow

The dependency flow in Mission Platform is strictly one-directional:

```
apps → packages/vite-plugins/workers → configs
```

- **Apps** consume packages, vite-plugins, and workers as dependencies.
- **Packages, vite-plugins, and workers** consume configs as devDependencies.
- **Configs** are shared tooling configurations that should not import from apps or packages.

This ensures a clear separation of concerns and prevents circular dependencies.

## Key Components

### Framework-Neutral JSX Runtime
The `@mission-platform/jsx` package provides a tiny, dependency-free framework-neutral JSX runtime. It includes:

- A classic `h`/`Fragment` factory that builds a serializable `MpElement` tree.
- Framework-neutral React-style hooks (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`).
- Runtime adapters for React and Vue (`toReactComponent` / `toVueComponent`).
- Optional ambient typings that wire the classic `h` JSX factory's global `JSX` namespace to `MpElement`.

### Cross-Framework Component Library
The `@mission-platform/components` package is the platform's write-once component library. Each component is authored once in the framework-neutral `@mission-platform/jsx` dialect and built straight to both Vue 3 and React by the `@mission-platform/vite-plugin-jsx` two-stage compiler.

#### Build Process
1. **Stage 1**: Parses each neutral `.tsx` with the TypeScript compiler API and emits a per-framework source tree:
   - React `.tsx` module (`class`→`className`, `h`→`React.createElement`, hooks kept as React's own)
   - Vue `.vue` SFC (`<script lang="tsx">` `defineComponent`/`setup` with React-style hooks translated to Vue reactivity/lifecycle)
2. **Stage 2**: Compiles the per-framework source tree with each framework's native toolchain:
   - Classic `h` React JSX transform (`reactJsxPlugin`)
   - `@vitejs/plugin-vue` (+ `@vitejs/plugin-vue-jsx`)

### Design Tokens
The `@mission-platform/tokens` package provides design tokens authored in the DTCG (designtokens.org) v2025.10 format with OKLab colors. The tokens are split into:

- **Palette**: Colors, including dark surface/border primitives and scrim/shimmer primitives.
- **Structural Scales**: Breakpoint, spacing, radius, shadow, size, motion (duration + easing), z-index, opacity, border-width.
- **Typography**: Font family/size/weight/line-height/letter-spacing primitives and composite per-variant styles.
- **Themes**: Light and dark theme files with palette `{color.*}` aliases.

The `@mission-platform/vite-plugin-tokens` emits:
- Structural SCSS partials (`generated/scss/_<file>.scss`) with `$` variables, `--mp-*` CSS custom properties, and `@property` registrations.
- Merged theme SCSS (`generated/scss/_theme.scss`) with `color-scheme: light dark` and `light-dark(<light>, <dark>)` interpolations.
- Nested `as const` TypeScript modules (`generated/ts/<file>.ts`).
- Aggregate barrels (`generated/_tokens.scss` and `generated/tokens.ts`).

### Routing System
The `@mission-platform/router` package provides a framework-agnostic routing system:

- **Framework-Neutral Route Model**: `MpRoute` tree, `MpRouteLocationRaw`, `MpResolvedLocation`.
- **Pure Helpers**: Path compiling/matching/building, query string parsing/serializing, route flattening/resolving.
- **Per-Framework Adapters**: Translate the neutral routes into real routers.
  - Vue adapter: `createMpRouter` (returns an installable `Router`), `useMpRouter`/`useMpRoute` composables, and `MpRouterLink`.
  - React adapter: Coming soon.

### Internationalization
The `@mission-platform/i18n` package provides a framework-agnostic i18next wrapper:

- **Core**: `createMpI18n` for creating i18next instances.
- **Adapters**: Vue (`./vue`) and React (`./react`) adapters for framework-specific integration.
- **Base Locales**: Predefined base locales included.

## Build System

### Vite Configuration
Each workspace (apps, packages, configs) has its own `vite.config.ts` that extends shared configurations from `@mission-platform/vite-config`.

### TurboRepo Task Orchestration
The root `turbo.json` defines generic, cross-cutting tasks (`build`, `dev`, `test`, `lint`, `format`, `preview`, `storybook`, `deploy`).

Workspace-specific tasks live in per-workspace `turbo.json` files that extend the root via `"extends": ["//"]`.

### Changesets
Changesets are used for versioning and changelog automation:
- Every PR that changes a published workspace (anything under `configs/` or `packages/`) must include a changeset.
- Changesets are enforced by the `Conventional Commits` GitHub workflow.

## Deployment

### Cloudflare Workers
The `workers/` folder contains Cloudflare Worker packages consumed by the deployable apps:
- **Base SPA Worker**: Serves static assets with an SPA-style fallback.

### Cloudflare Pages
Applications like My Care Notes are deployed to Cloudflare Pages using Wrangler scripts.

## Development Workflow

### Task Runner
All cross-workspace tasks are orchestrated by Turborepo:

```bash
# Build all apps
turbo run build --filter="./apps/*"

# Build all packages
turbo run build --filter="./packages/*"

# Run tests across all workspaces
turbo run test

# Run only the tasks affected by your changes
turbo run build test lint --affected
```

### Storybook
Storybook is the primary environment for developing and testing components:

```bash
# Start Vue 3 Storybook on port 6006
turbo run storybook --filter=@mission-platform/storybook

# Start React Storybook on port 6007
turbo run storybook-react --filter=@mission-platform/storybook-react
```

### Testing
- **Unit Tests**: Vitest for unit testing.
- **Browser Tests**: Playwright for browser-level testing.
- **Component Tests**: Storybook for visual and interaction testing.

## Git Commit Convention

All commits in this repository must follow the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- `feat`: A new feature (correlates with SemVer MINOR)
- `fix`: A bug fix (correlates with SemVer PATCH)
- `refactor`: A code change that is neither a bug fix nor a new feature
- `style`: Changes that do not affect meaning (formatting, whitespace, etc.)
- `chore`: Other changes that don't modify source or test files (e.g., config, tooling)
- `docs`: Documentation-only changes
- `test`: Adding or updating tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: CI configuration changes
- `perf`: Performance improvements

### Scope
The scope must be the name of the workspace being changed (e.g., `fix(map):`, `feat(components):`).

### Breaking Changes
Use `BREAKING CHANGE: <description>` for breaking API changes (correlates with SemVer MAJOR).

### Local Enforcement
Commit messages are validated locally by a Husky `commit-msg` hook that runs commitlint.

## Summary

Mission Platform's architecture is designed to maximize reusability, maintainability, and cross-framework compatibility. By leveraging modern tooling like pnpm workspaces, Turborepo, and Vite, the platform ensures efficient development workflows and fast builds. The strict dependency flow and clear separation of concerns make it easy to maintain and extend the platform over time.