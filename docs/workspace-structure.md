# Workspace Structure

This document provides a detailed overview of the Mission Platform workspace structure, including directories, packages, and their purposes.

## Root Directory Structure

```
composable_mission_ready_platform/
├── apps/                   # Deployable applications
├── configs/                # Shared tooling configurations
├── docs/                   # Documentation files
├── packages/               # Reusable building blocks
├── scripts/                # Repository-wide tooling scripts
├── vite-plugins/           # Vite build plugins
├── workers/                # Cloudflare Workers
└── (root files)            # Configuration and metadata files
```

## Detailed Directory Breakdown

### 1. `apps/` - Deployable Applications

Applications are self-contained packages that compose functionality from the shared `packages/` directory. Each app is a thin orchestration layer that assembles reusable building blocks into working products.

**Current Applications:**
- **`my-care-notes/`**: A Vue 3 note-taking application with spell checking (Hunspell/WebAssembly), grammar checking (Harper), Monaco editor, i18next integration, and Cloudflare Pages deployment.
- **`service-monitor/`**: Service health and status monitoring dashboard.
- **`storybook/`**: A Storybook instance for developing, documenting, and visually testing Vue 3 components.
- **`storybook-react/`**: A React counterpart of Storybook, cataloguing the React builds of cross-framework components.
- **`website/`**: Platform website and documentation portal.

**Conventions:**
- Each app lives in its own subdirectory: `apps/<app-name>/`
- App package names follow the scoped convention `@mission-platform/<app-name>`
- Apps are always `"private": true` and never published to a registry
- Each app has its own `vite.config.ts`, `tsconfig.json`, and test setup

### 2. `configs/` - Shared Tooling Configurations

Shared linting, formatting, and build-tooling configuration packages consumed by both `packages/` and `apps/`.

**Current Configs:**
- **`eslint-config/`**: Base ESLint flat config for TypeScript, Vue 3, React, and JavaScript
- **`i18n-config/`**: Shared i18n configuration and locale definitions
- **`i18next-cli-vue/`**: i18next CLI Vue extractor configuration
- **`postcss-config/`**: Shared PostCSS configuration
- **`prettier-config/`**: Base Prettier config for formatting
- **`stylelint-config/`**: Base Stylelint config for SCSS and Vue SFC style blocks
- **`typescript-config/`**: Shared TypeScript base configs (base, app, library, node, test)
- **`vite-config/`**: Shared Vite and Vitest helpers

**Conventions:**
- Each config lives in its own subdirectory: `configs/<config-name>/`
- Package names follow the scoped convention `@mission-platform/<config-name>`
- Configs are consumed as `devDependencies` (`"workspace:*"`)
- Configs must never import from `apps/` or `packages/`

### 3. `packages/` - Reusable Building Blocks

Shared libraries that apps consume as dependencies. These packages are the composable building blocks of the platform.

**Current Packages:**
- **`barcode/`**: 1D/2D Barcode generation and barcode rendering utilities
- **`breakpoints/`**: Responsive breakpoint utilities, composables, and Vue components
- **`code-scanner/`**: Camera-based barcode and matrix code scanner
- **`components/`**: Cross-framework component library built to both Vue 3 and React
- **`d3/`**: Reactive D3.js visualization wrappers
- **`forms/`**: Form primitives and validation components
- **`forms-core/`**: Core form validation schema engine
- **`harper/`**: Harper grammar checker integration for Monaco editor
- **`hunspell/`**: Hunspell spell checker compiled to WebAssembly via Emscripten
- **`i18n/`**: Framework-agnostic i18next wrapper with Vue and React adapters
- **`icons/`**: Write-once SVG icon components for Vue 3 and React
- **`jsx/`**: Framework-neutral JSX runtime with React-style hooks
- **`layout/`**: Layout primitives (stacks, grids, separators)
- **`map/`**: MapLibre GL Vue 3 wrapper with full reactivity support
- **`matrix-code/`**: DataMatrix and QR code rendering utilities
- **`phone-number/`**: Phone number formatting and validation
- **`qr-code/`**: SVG/Canvas QR code generator
- **`router/`**: Framework-agnostic routing system with Vue adapter
- **`rxjs/`**: RxJS composables and utilities for Vue 3
- **`scheduler-core/`**: Scheduler engine and timeline utilities
- **`seo/`**: Framework-agnostic meta tag and SEO composables
- **`tokens/`**: Design tokens authored in DTCG format with OKLab colors

**Conventions:**
- Each package lives in its own subdirectory: `packages/<package-name>/`
- Package names follow the scoped convention `@mission-platform/<package-name>`
- Packages should be framework-agnostic where possible
- Each package must have its own `package.json`, `tsconfig.json`, and build config
- Packages are versioned and released independently using Changesets
- Packages must never import from `apps/`

### 4. `scripts/` - Repository-Wide Tooling Scripts

Scripts for repository-wide operations such as i18n extraction, build automation, and deployment tasks.

**Current Scripts:**
- i18n extraction utilities
- Build and deployment automation scripts
- Repository maintenance tools

### 5. `vite-plugins/` - Vite Build Plugins

Vite plugins consumed by deployable apps at build time.

**Current Vite Plugins:**
- **`assemblyscript/`**: AssemblyScript compilation plugin for Vite
- **`i18n/`**: Vite plugin for i18n locale loading and extraction
- **`jsx/`**: Two-stage compiler for framework-neutral JSX components
- **`seo/`**: Vite plugin that generates `robots.txt` and `sitemap.xml`
- **`tokens/`**: Vite plugin that generates design-token artifacts from DTCG sources

**Conventions:**
- Each plugin lives in its own subdirectory: `vite-plugins/<plugin-name>/`
- Package names follow the scoped convention `@mission-platform/vite-plugin-<name>`
- Plugins declare `vite` as an optional peer dependency
- Plugins are versioned and released independently using Changesets

### 6. `workers/` - Cloudflare Workers

Cloudflare Worker packages consumed by deployable apps for serving static assets with an SPA-style fallback.

**Current Workers:**
- **`base-spa/`**: Base SPA worker for serving static assets with an SPA-style fallback

**Conventions:**
- Each worker lives in its own subdirectory: `workers/<worker-name>/`
- Package names follow the scoped convention `@mission-platform/<worker-name>`
- Workers are always `"private": true` and never published to a registry
- Workers consume `configs/` as devDependencies and may consume `packages/` as runtime dependencies

## Root-Level Files

### Configuration Files
- **`.nvmrc`**: Specifies the required Node.js version for the project
- **`.gitignore`**: Lists files and directories to be ignored by Git
- **`.editorconfig`**: Defines coding styles for various editors
- **`commitlint.config.mjs`**: Configuration for commit message validation
- **`turbo.json`**: TurboRepo configuration for task orchestration and caching
- **`pnpm-workspace.yaml`**: pnpm workspace configuration defining included directories

### Documentation Files
- **`README.md`**: Project overview, status, and quick start guide
- **`CONTRIBUTING.md`**: Guidelines for contributing to the project
- **`DOCUMENTATION.md`**: Overview of available documentation resources
- **`AGENTS.md`**: Agent-specific guidelines and instructions

### Package Management Files
- **`package.json`**: Root workspace manifest (private, tooling only)
- **`pnpm-lock.yaml`**: Lockfile for pnpm dependency management
- **`skills-lock.json`**: Configuration for agent skills and capabilities

### Build and Deployment Files
- **`.husky/`**: Git hooks for commit message validation and other pre-commit tasks
- **`.turbo/`**: TurboRepo cache directory for incremental builds
- **`.wrangler/`**: Cloudflare Workers configuration and deployment settings

## Dependency Flow

The dependency flow in Mission Platform is strictly one-directional:

```
apps → packages/vite-plugins/workers → configs
```

- **Apps** consume packages, vite-plugins, and workers as dependencies
- **Packages, vite-plugins, and workers** consume configs as devDependencies
- **Configs** are shared tooling configurations that should not import from apps or packages

This ensures a clear separation of concerns and prevents circular dependencies.

## Workspace Management

The repository uses pnpm workspaces to manage dependencies across the monorepo. The `pnpm-workspace.yaml` file defines which directories are included in the workspace:

```yaml
packages:
  - apps/**
  - configs/**
  - packages/**
  - vite-plugins/**
  - workers/**
  - scripts
```

This configuration allows for efficient dependency management, ensuring that packages reference each other using the `workspace:*` protocol.

## Task Orchestration

Turborepo is used to orchestrate tasks across the workspace. The root `turbo.json` defines generic, cross-cutting tasks (`build`, `dev`, `test`, `lint`, etc.), while workspace-specific tasks live in per-workspace `turbo.json` files that extend the root via `"extends": ["//"]`.

Common tasks include:
- `build`: Build all packages and applications
- `dev`: Start development servers for apps
- `test`: Run tests across all workspaces
- `lint`: Lint code in all packages and apps
- `storybook`: Start Storybook development servers

For more details on task orchestration, refer to the [Development Setup](development-setup.md) guide.

## Summary

The Mission Platform workspace is organized into clear directories with specific purposes:
- **`apps/`**: Deployable applications that compose functionality from packages
- **`configs/`**: Shared tooling configurations for linting, formatting, and build settings
- **`packages/`**: Reusable building blocks consumed by apps as dependencies
- **`scripts/`**: Repository-wide tooling scripts for automation and maintenance
- **`vite-plugins/`**: Vite build plugins consumed by apps at build time
- **`workers/`**: Cloudflare Workers for serving static assets and handling SPA fallbacks

This structure ensures a clear separation of concerns, efficient dependency management, and scalable development across the platform.