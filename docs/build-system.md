# Build System

This document explains the architecture and mechanics of the Mission Platform's build system. It is designed for high performance, incremental builds, and multi-framework package distribution.

## Core Architecture

The Mission Platform uses a tiered build system that separates task orchestration from individual workspace compilation.

### 1. Task Orchestration (Turborepo)

**Turborepo** is the top-level orchestrator. It manages the dependency graph between workspaces and provides caching for all tasks.

- **Pipeline defined in `turbo.json`**: Tasks like `build`, `test`, and `lint` are defined with their dependencies (e.g., `build` depends on `^build`, meaning all dependencies must be built first).
- **Hashing**: Turborepo hashes source files, environment variables, and global dependencies to determine if a task's output can be re-used from the cache.
- **Parallelism**: Independent tasks are executed concurrently to maximize CPU utilization.

### 2. Package Compilation (tsdown)

Most library packages in `packages/` use **tsdown** for compilation.

- **Speed**: Built on top of **Rolldown** (the Rust-based successor to Rollup), providing near-instant builds.
- **Unbundling**: Packages are built with `unbundle: true`, preserving the original module structure in `dist/`. This ensures optimal tree-shaking and better debugging in consumer applications.
- **CSS Threading**: A custom plugin re-links extracted stylesheets back to their owning JS modules, ensuring that importing a component automatically pulls in its styles.

### 3. Application Bundling (Vite)

Deployable applications in `apps/` use **Vite** for development and production bundling.

- **Shared Configs**: Apps extend `@mission-platform/vite-config` to ensure consistent PostCSS pipelines and framework-agnostic resolution.
- **SSR/SSG Support**: Applications like `my-care-notes` use `vite-ssg` for static site generation.

## Turborepo Pipeline

The root `turbo.json` defines a family of build tasks. Alongside the core tasks, a set of specialized tasks emit only a specific slice of the multi-framework output, which is useful for faster, targeted builds.

### Core Tasks

| Task | Description |
| :--- | :--- |
| `build` | The primary entry point. Compiles the full multi-framework output for a workspace (via `tsdown`). |
| `build:check` | Validates types for a workspace without emitting output. |
| `build:watch` | Starts an incremental build in watch mode for a workspace, rebuilding on every change. |

### Targeted Output Tasks

These tasks reuse the same compilation but scope the emitted artifacts in `dist/` to a single concern.

| Task | Description |
| :--- | :--- |
| `build:neutral` | Emits only the framework-neutral output, excluding the per-framework bundles (Vue, React, Solid, Svelte, Web Components, Storyblok) and type declarations. |
| `build:bundle` | Emits all framework bundles (JS/CSS) but skips the `.d.ts` declaration files. |
| `build:solid` | Emits only the Solid build (`dist/solid/**`). |
| `build:svelte` | Emits only the Svelte build (`dist/svelte/**`). |
| `build:web-components` | Emits only the Web Components build (`dist/web-components/**`). |
| `build:storyblok-vue` | Emits only the Storyblok Vue build (`dist/storyblok/vue/**` and the Storyblok component manifest JSON). |
| `build:storyblok-react` | Emits only the Storyblok React build (`dist/storyblok/react/**`). |

### Caching Strategy

Turborepo caches the following artifacts:
- `dist/**`: Built JS/CSS artifacts.
- `.vite/**`: Vite's internal cache.
- `coverage/**`: Test coverage reports.

To bypass the cache and force a fresh build, use the `--force` flag:
```bash
pnpm build:force
```

## Shared Configurations

Build configurations are centralized in the `configs/` directory to maintain consistency across the monorepo.

| Package | Purpose |
| :--- | :--- |
| `@mission-platform/vite-config` | Shared Vite logic for apps and Vue-specific builds. |
| `@mission-platform/tsdown-config` | Shared tsdown logic for library packages. |
| `@mission-platform/typescript-config` | Base `tsconfig.json` presets for apps, libraries, and tests. |
| `@mission-platform/postcss-config` | Standardized CSS processing (Autoprefixer, etc.). |

## Local Development vs. Production

### Development (`dev` task)
Vite's development server provides Hot Module Replacement (HMR). When an app's `dev` task starts, Turborepo also runs the component library's `build:watch` task alongside it (via the task's `with` key), so edits to `@mission-platform/components` are recompiled automatically and picked up by the running app without a manual rebuild.

### Production (`build` task)
Turborepo executes builds in topological order. A package is only built after all its internal dependencies have successfully built. The output in `dist/` is what is eventually published or deployed.

## Advanced: WASM Integration

Certain packages (e.g., `@mission-platform/hunspell`, barcode scanners) involve Rust code compiled to WebAssembly. These builds are orchestrated via specialized tasks that use `wasm-pack` to ensure environment consistency and optimal performance.
