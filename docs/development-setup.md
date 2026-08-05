# Development Setup

This guide provides a step-by-step tutorial for setting up your local environment to contribute to the Mission Platform. By the end of this guide, you will have a working monorepo and be able to run the development tools.

## Prerequisites

Before cloning the repository, ensure your system meets the following requirements.

### System Requirements

| Tool | Required Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `24.19.0` | Runtime environment (Active LTS) |
| **pnpm** | `11.20.0` | Package manager and workspace orchestrator |
| **Git** | Latest stable | Version control |
| **Docker** | Latest stable | Required for WebAssembly builds (e.g., Hunspell) |

### Version Management (Recommended)

We recommend using **nvm** (Node Version Manager) to ensure you are using the correct Node.js version specified in the root `.nvmrc` file.

```bash
nvm install
nvm use
```

Enable **pnpm** using Corepack:

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
```

## Initial Setup

Follow these steps to initialize the monorepo on your machine.

### 1. Clone the Repository

```bash
git clone git@github.com:Mission-Platform/composable-mission-ready-platform.git
cd composable-mission-ready-platform
```

### 2. Install Dependencies

Install all workspace dependencies and set up git hooks:

```bash
pnpm install
```

This command triggers the `prepare` script, which initializes **Husky** for commit linting and ensures all internal package links are correctly established.

### 3. Verify the Installation

Run a smoke test to ensure the build system and environment are correctly configured:

```bash
pnpm build --filter @mission-platform/forge
```

## Development Workflow

The Mission Platform uses **Turborepo** to orchestrate tasks across applications and packages.

### Component Development (Storybook)

Storybook is the primary workbench for building and testing components in isolation. You can target specific frameworks using environment variables:

```bash
# Start Vue 3 Storybook
pnpm storybook:vue

# Start React Storybook
pnpm storybook:react
```

Other available framework targets include `solid`, `svelte`, and `web-component`.

### Application Development

To start a specific application in development mode:

```bash
# Start My Care Notes (Vue 3)
pnpm exec turbo run dev --filter @mission-platform/my-care-notes
```

The application will typically be available at `http://localhost:5173`.

### Common Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Build** | `pnpm build` | Build all apps and packages |
| **Test** | `pnpm test` | Run all Vitest suites |
| **Lint** | `pnpm lint` | Run ESLint across the monorepo |
| **Format** | `pnpm format` | Check formatting with Prettier |

## Troubleshooting

### Clearing Caches

If you encounter unexpected build errors, clear the Turborepo and Node caches:

```bash
# Remove Turborepo cache
rm -rf .turbo

# Deep clean all node_modules and reinstall
pnpm -r exec rm -rf node_modules
pnpm install
```

### WASM Build Failures

If packages involving WebAssembly (like `@mission-platform/hunspell`) fail to build, ensure **Docker** is running, as it is used to provide a consistent build environment for Rust-to-WASM compilation.
