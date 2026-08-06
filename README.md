# Mission Platform

**VueJS 3 monorepo** managed with [pnpm workspaces](https://pnpm.io/workspaces).

## Project Overview

The Mission Platform is a VueJS 3 monorepo managed with pnpm workspaces. It follows a composable, package-driven architecture where reusable building blocks live in `packages/` and deployable applications are assembled from those building blocks in `apps/`.

## Key Features

- **Forge JSX (`@mission-platform/forge`)**: The primary, framework-neutral UI framework in which all shared components (everything except the apps) are authored
- **Vue 3 (Composition API / `<script setup>`)**: The framework the apps are built with, and the primary native render target for Forge components
- **TypeScript**: Type-safe JavaScript across every workspace
- **Vite**: Dev server and production bundler
- **Vitest + Playwright**: Unit and browser-level testing
- **Storybook**: Component development, documentation, and visual testing
- **pnpm workspaces**: Monorepo dependency management
- **Turborepo**: Task orchestration, caching, and incremental builds across workspaces
- **Changesets**: Versioning and changelog automation

## Quick Start
1. Install Node.js v24.19.0 (version specified in `.nvmrc`)
2. Run `nvm use` to select the correct Node version
3. Install dependencies: `pnpm install`
4. Start development servers:
   - Storybook: `pnpm exec turbo run storybook --filter @mission-platform/storybook`
   - My Care Notes: `pnpm exec turbo run dev --filter @mission-platform/my-care-notes`

### Available Documentation
- **[Overview](docs/overview.md)**: Mission Platform architecture principles and key features
- **[Development Setup](docs/development-setup.md)**: Detailed instructions for setting up your development environment
- **[Workspace Structure](docs/workspace-structure.md)**: Overview of the repository's directory structure
- **[Architecture](docs/architecture.md)**: Detailed architecture documentation
- **[Package Development](docs/package-development.md)**: Guidelines for developing and publishing packages
- **[Best Practices](docs/best-practices.md)**: Essential guidelines for developing, testing, and maintaining applications
- **[Testing](docs/testing.md)**: Comprehensive testing strategies and tools
- **[Build System](docs/build-system.md)**: Overview of the build system and configuration
- **[API Reference](docs/api-reference.md)**: References for all Mission Platform packages and framework adapters
- **[Troubleshooting](docs/troubleshooting.md)**: Common issues and solutions for debugging and performance optimization
- **[Circular Dependencies](docs/circular-dependencies.md)**: Identifying and resolving circular dependency issues
- **[Migration Guide](docs/migration-guides/vue2-to-vue3.md)**: Step-by-step guide for migrating from Vue 2 to Vue 3

## Getting Started

```bash
# Select the correct Node version
nvm use

# Install all workspace dependencies
pnpm install

# Run Storybook
pnpm exec turbo run storybook --filter @mission-platform/storybook

# Run My Care Notes app
pnpm exec turbo run dev --filter @mission-platform/my-care-notes

# Build all apps
pnpm exec turbo run build --filter "./apps/*"

# Run tests
pnpm exec turbo run test
```

## Package Development

When creating a new package:
1. Create `packages/<package-name>/` directory
2. Initialize with `pnpm init -y`
3. Add `@mission-platform/eslint-config`, `@mission-platform/prettier-config`, and (where applicable) `@mission-platform/postcss-config` as dev dependencies
4. Build and export the package using Vite or TypeScript
5. Reference it in apps that need it: `"@mission-platform/<package-name>": "workspace:*"`