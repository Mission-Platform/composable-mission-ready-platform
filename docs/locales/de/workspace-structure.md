# Workspace Structure

This document provides a technical reference for the Mission Platform monorepo layout, directory purposes, and internal
package conventions.

## Monorepo Layout Reference

Mission Platform uses pnpm workspaces and Turborepo to manage a multi-package environment. The repository is organised
into functional tiers:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products, docs, and workbenches
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Reusable Cloudflare Worker edge functions
├── forge-plugins/          # Forge compiler plugins and adapters
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Canonical English and translated documentation
```

## Primary Directories

### 1. `apps/` (Applications)

Applications are deployable units that compose functionality from the `packages/` directory. They are usually private
and never published to a registry.

- **`docs/`**: The Vite + Vue documentation site for the Markdown corpus.
- **`my-care-notes/`**: The flagship care-notes application.
- **`service-monitor/`**: The RedwoodSDK service health dashboard backed by a Durable Object.
- **`website/`**: The Mission Platform marketing and product website.
- **`storybook/`**: The component workbench and visual testing suite.

### 2. `packages/` (Building Blocks)

Reusable, versioned libraries consumed by apps. These are intended to be framework-agnostic where possible.

- **`@mission-platform/forge`**: The framework-neutral JSX runtime and adapters.
- **`@mission-platform/components`**: The multi-framework component library.
- **`@mission-platform/forms`** and **`@mission-platform/forms-core`**: Schema-driven form primitives.
- **`@mission-platform/content`** and **`@mission-platform/email-renderer`**: Content and rendering pipelines.
- **`@mission-platform/tokens`**: Design token source of truth.
- **`@mission-platform/router`** and **`@mission-platform/i18n`**: Framework-neutral routing and localization.
- **`@mission-platform/barcode`**, **`@mission-platform/code-scanner`**, **`@mission-platform/matrix-code`**, and
  **`@mission-platform/qr-code`**: Wasm-backed scanning and encoding packages.

### 3. `configs/` (Tooling Foundation)

Shared configurations that ensure consistency across all workspaces. Packages in this directory are typically used as
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, and **`stylelint-config/`**: Linting and formatting rules.
- **`typescript-config/`**: Base `tsconfig.json` files for Node, DOM, library, and framework consumers.
- **`tsdown-config/`** and **`vite-config/`**: Common library, app, Vite, and Vitest build patterns.
- **`i18n-config/`** and **`storybook-framework/`**: Shared locale extraction and framework-workbench settings.

### 4. `vite-plugins/` (Build Extensions)

Custom plugins that extend the Vite build process.

- **`forge/`**: The multi-stage compiler for Forge components.
- **`tokens/`**: Generates code artifacts from DTCG token definitions.
- **`i18n/`**: Handles locale loading and static extraction.

### 5. `workers/` (Edge Services)

Cloudflare Workers for server-side logic and optimised asset delivery.

- **`api-proxy/`**: Provides constrained read-only access to approved API routes.
- **`email-sender/`**: Local MailPit-backed email showcase worker.
- **`forge-spa/`**: Serves static assets with an `ASSETS`-binding SPA fallback.

Deployable application Workers are configured by `apps/website/wrangler.jsonc`,
`apps/my-care-notes/wrangler.jsonc`, and `apps/service-monitor/wrangler.jsonc`. The
`api-proxy` and `forge-spa` packages are bundled dependencies rather than standalone Wrangler deployments.

### 6. `forge-plugins/` (Forge Compiler Plugins)

Framework-specific output plugins and adapters for the Forge compiler.

- **`forge-cms-plugin-api/`**: CMS artifact generation and Vite/tsdown adapter integration.
- **`forge-cms-astro/`**, **`forge-cms-ghost/`**, **`forge-cms-jekyll/`**, **`forge-cms-storyblok/`**, **`forge-cms-webflow/`**: CMS-specific integration adapters.
- **`forge-plugin-api/`**: Shared Forge compiler plugin interfaces.
- **`forge-vue/`**, **`forge-react/`**, **`forge-solid/`**, **`forge-svelte/`**, **`forge-web-components/`**: Framework-specific code generation and runtime adapters.
- **`forge-router-plugin-api/`**, **`forge-router-vue/`**, **`forge-router-react/`**, **`forge-router-solid/`**, **`forge-router-svelte/`**, **`forge-router-web-components/`**, **`forge-router-redwood/`**: Router framework-specific integration adapters.

## Internal Package Conventions

To maintain a predictable environment, all packages and apps follow a standard internal layout.

### Standard `src/` Hierarchy

Source code is organised by functional type:

- **`components/`**: UI logic (SFCs or TSX).
- **`composables/`**: Reactive logic and hooks.
- **`utils/`**: Pure functions and framework-agnostic helpers.
- **`locales/`**: JSON/YAML translation files.
- **`styles/`**: SCSS partials and design system integrations.

### Barrel Export Pattern

Every directory within `src/` must contain an `index.ts` (barrel file).

- Sub-directories export their internal symbols via their local `index.ts`.
- The root `src/index.ts` acts as the public entry point for the entire workspace member.

## Root Configuration Registry

Key files at the repository root govern the monorepo's behaviour:

| File                    | Purpose                                                                              |
| :---------------------- | :----------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`   | Defines workspace boundaries, member globs, and dependency catalogs. |
| `turbo.json`            | Orchestrates the build pipeline and task caching.                    |
| `package.json`          | Root-level scripts and monorepo-wide devDependencies.                |
| `commitlint.config.mjs` | Enforces the Conventional Commits specification.                     |

## Dependency & Workspace Management

Mission Platform uses the `workspace:*` protocol for internal dependencies. This ensures that packages always use the
local version of other workspace members during development.

### PNPM Catalogs

The repository leverages **pnpm catalogs** (defined in `pnpm-workspace.yaml`) to centralise dependency versions across
the monorepo. This prevents version drift and simplifies maintenance.

### Task Execution

Cross-workspace tasks are executed via the root `package.json` using Turborepo:

- `pnpm build`: Build all workspaces in the correct dependency order.
- `pnpm test`: Run the test suites for all workspaces with a `test` task. Use `pnpm exec turbo run test --affected` for
  the changed-workspace CI scope.
- `pnpm lint`: Run ESLint across the workspaces.
- `pnpm lint:style`: Run Stylelint for app and package styles.
- `pnpm format`: Check formatting with Prettier.
- `pnpm i18n:extract`: Extract translation keys for workspaces that own catalogues.
