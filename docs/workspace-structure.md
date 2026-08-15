# Workspace Structure

This document provides a technical reference for the Mission Platform monorepo layout, directory purposes, and internal
package conventions.

## Monorepo Layout Reference

Mission Platform uses pnpm workspaces and Turborepo to manage a multi-package environment. The repository is organised
into functional tiers:

```text
composable_mission_ready_platform/
├── apps/                   # Deployable products and catalogues
├── configs/                # Shared tooling and base configurations
├── packages/               # Reusable libraries and building blocks
├── vite-plugins/           # Build-time extensions and compilers
├── workers/                # Cloudflare Worker edge functions
├── crates/                 # Rust crates (including Wasm-compiled ones)
├── mcp/                    # Model Context Protocol servers
├── scripts/                # Repo-wide automation scripts
├── examples/               # Example implementations and demos
└── docs/                   # Platform documentation
```

## Primary Directories

### 1. `apps/` (Applications)

Applications are deployable units that compose functionality from the `packages/` directory. They are usually private
and never published to a registry.

- **`my-care-notes/`**: The flagship note-taking application.
- **`service-monitor/`**: Service health dashboard.
- **`website/`**: The Mission Platform marketing and documentation site.
- **`storybook/`**: The primary component workbench and visual testing suite.

### 2. `packages/` (Building Blocks)

Reusable, versioned libraries consumed by apps. These are intended to be framework-agnostic where possible.

- **`@mission-platform/forge`**: The framework-neutral JSX runtime.
- **`@mission-platform/components`**: The multi-framework component library.
- **`@mission-platform/tokens`**: Design token source-of-truth.
- **`@mission-platform/router`**: Agnostic routing engine.
- **`@mission-platform/i18n`**: Agnostic internationalisation wrapper.

### 3. `configs/` (Tooling Foundation)

Shared configurations that ensure consistency across all workspaces. Packages in this directory are typically used as
`devDependencies`.

- **`eslint-config/`**, **`prettier-config/`**, **`stylelint-config/`**: Linting and formatting rules.
- **`typescript-config/`**: Base `tsconfig.json` files for various environments (Node, DOM, Library).
- **`vite-config/`**: Common Vite and Vitest build patterns.

### 4. `vite-plugins/` (Build Extensions)

Custom plugins that extend the Vite build process.

- **`forge/`**: The multi-stage compiler for Forge components.
- **`tokens/`**: Generates code artifacts from DTCG token definitions.
- **`i18n/`**: Handles locale loading and static extraction.

### 5. `workers/` (Edge Services)

Cloudflare Workers for server-side logic and optimised asset delivery.

- **`api-proxy/`**: Handles secure communication with backend services.
- **`forge-spa/`**: Serves static assets with intelligent SPA routing fallbacks.

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

| File                    | Purpose                                                              |
|:------------------------|:---------------------------------------------------------------------|
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
- `pnpm lint`: Run linting and formatting checks across the entire repo.
