# Mission Platform Overview

Mission Platform is a composable, package-driven, framework-neutral component platform designed for building
production-ready applications with reusable building blocks. It leverages a modern monorepo architecture to provide a
highly efficient development environment for complex, multi-application ecosystems.

## The Composable Philosophy

At its core, Mission Platform is built on the principle of **composition over inheritance**. Instead of providing a
monolithic framework that dictates application structure, the platform offers a suite of small, focused, and highly
interoperable packages.

### Composable Building Blocks

Applications are assembled from shared packages, ensuring that common logic—from UI components to internationalisation
and routing—is authored once and reused everywhere. This approach reduces duplication, simplifies maintenance, and
ensures a consistent user experience across the entire product suite.

### Multi-Framework by Design

Mission Platform introduces a framework-neutral development paradigm. Using the `@mission-platform/forge-jsx` JSX dialect,
developers can author components once and compile them to native outputs for Vue 3, React, Solid, Svelte, and Web
Components. This future-proofs the codebase and allows for seamless integration into diverse frontend environments.

### Type-Safe Foundation

The entire platform is authored in **TypeScript**, providing a robust, self-documenting developer experience. Explicit
typing across all public APIs ensures that errors are caught at compile-time, significantly increasing development
velocity and code quality.

## Key Features

| Feature               | Description                                                                                                                                                            |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forge JSX Runtime** | A framework-neutral JSX dialect: author once and build for Vue 3, React, Svelte, Solid, and Web Components with zero runtime overhead. |
| **Component Library** | A comprehensive set of layout, typography, and interactive components authored once for multiple frameworks.                                           |
| **Design Tokens**     | A DTCG-compliant token system that generates SCSS and TypeScript artifacts for consistent theming.                                                     |
| **Agnostic Routing**  | A type-safe routing system that works independently of the UI framework.                                                                               |
| **Universal I18n**    | A framework-agnostic internationalisation wrapper based on i18next with dedicated Vue and React adapters.                                              |
| **Wasm Utilities**    | High-performance utilities for barcode scanning, spell checking, and more, powered by WebAssembly.                                                     |

## Technology Stack

Mission Platform is built on a modern, high-performance stack:

- **Forge JSX (`@mission-platform/forge-jsx`)**: The primary UI framework — a framework-neutral JSX runtime in which all
  shared components (everything except the apps) are authored.
- **Vue 3**: The framework the applications in `apps/` are built with, and one of several native render targets for
  Forge components.
- **TypeScript**: The standard for all source code.
- **Vite**: The build tool powering fast HMR and optimised production bundles.
- **pnpm Workspaces**: Efficient dependency management with shared lockfiles.
- **Turborepo**: High-performance task orchestration and caching.
- **Cloudflare Workers/Pages**: The primary deployment target for applications and APIs.
- **Storybook**: The workbench for component development and visual testing.

## Ecosystem Structure

The repository is organised into several distinct areas:

- **`apps/`**: Deployable applications (e.g., `my-care-notes`, `website`) that compose packages into products.
- **`packages/`**: The core building blocks, including `@mission-platform/components`, `@mission-platform/router`, and
  `@mission-platform/i18n`.
- **`packages/tooling/configs/`**: Shared configurations for ESLint, Prettier, TypeScript, and Vite.
- **`packages/tooling/vite/`**: Custom build-time tooling for design tokens, Forge compilation, and SEO.
- **`packages/edge/workers/`**: Cloudflare Workers providing backend logic and SPA serving capabilities.

## Next Steps

To begin developing on the Mission Platform, please refer to the following guides:

- **[Development Setup](./development-setup.md)**: Get your environment ready and install dependencies.
- **[Architecture](./architecture.md)**: Deep dive into the platform's design principles and dependency flow.
- **[Workspace Structure](./workspace-structure.md)**: Understand the directory layout and package conventions.
- **[Testing](./testing.md)**: Learn about our testing strategies and tools.
