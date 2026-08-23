# Build System

This document explains the architecture and mechanics of the Mission Platform's build system. It is designed for high
performance, incremental builds, and multi-framework package distribution.

## Core Architecture

The Mission Platform uses a tiered build system that separates task orchestration from individual workspace compilation.

### 1. Task Orchestration (Turborepo)

**Turborepo** is the top-level orchestrator. It manages the dependency graph between workspaces and provides caching for
all tasks.

- **Pipeline defined in `turbo.json`**: Tasks like `build`, `test`, and `lint` are defined with their dependencies
  (e.g., `build` depends on `^build`, meaning all dependencies must be built first).
- **Hashing**: Turborepo hashes source files, environment variables, and global dependencies to determine if a task's
  output can be re-used from the cache.
- **Parallelism**: Independent tasks are executed concurrently to maximize CPU utilization.

### 2. Package Compilation (tsdown)

Most library packages in `packages/` use **tsdown** for compilation.

- **Speed**: Built on top of **Rolldown** (the Rust-based successor to Rollup), providing near-instant builds.
- **Unbundling**: Packages are built with `unbundle: true`, preserving the original module structure in `dist/`. This
  ensures optimal tree-shaking and better debugging in consumer applications.
- **CSS Threading**: A custom plugin re-links extracted stylesheets back to their owning JS modules, ensuring that
  importing a component automatically pulls in its styles.

### 3. Application Bundling (Vite)

Deployable applications in `apps/` use **Vite** for development and production bundling.

- **Shared Configs**: Apps extend `@mission-platform/vite-config` to ensure consistent PostCSS pipelines and
  framework-agnostic resolution.
- **SSR/SSG Support**: Applications like `my-care-notes` use `vite-ssg` for static site generation.

### Forge package builds

Forge package builds add a neutral compiler front end to the normal `tsdown` or Vite flow. A consuming package imports
the framework plugins it wants and passes explicit instances to `defineTsdownForgeComponents` or
`defineTsdownForgeHooks`. The neutral driver creates semantic IR once, then the selected plugin owns target lowering,
source generation, declarations, runtime externals, and its native Vite/tsdown adapter.

Content-platform output is a second, orthogonal axis configured through `@mission-platform/forge-cms-plugin-api`. A
consumer passes `defineTsdownForgeCms` (or `defineTsdownForgeCmsAll`) a list of `CmsOutputPlugin` instances, each of
which _composes_ a framework plugin — `forgeStoryblokCms({ packageName, plugin, storyblokRuntime })`,
`forgeAstroCms({ packageName, plugin })`, and so on for Ghost, Jekyll, and Webflow. Because the platform and the
framework are chosen independently, `storyblok × vue` and `astro × solid` are configuration rather than new code.

CMS builds emit to `dist/cms/<cms>/<framework>/**`, with manifests and other platform sidecars mirrored into
`dist/cms/<cms>/`. Targets that need a hydrated runtime (Astro, Webflow) co-generate an island tree from the bound
framework plugin into the same build. The complete responsibility split and stage boundaries are described in
[Forge Compiler Pipeline](../vite-plugins/forge/docs/reference/compiler.md).

## Build contract

`pnpm build` is the canonical aggregate build. It delegates to Turbo's package-level `build` task without setting a
framework selector, so every Forge package emits its neutral output and every framework target configured by that
package. Packages with CMS projections emit those projections and their shared sidecars in the same staged build.

```bash
pnpm build
pnpm build:force                 # the same aggregate build, ignoring Turbo's cache
pnpm exec turbo run build --filter @mission-platform/components
```

Forge packages also retain thin compatibility aliases for rebuilding one target:

```bash
pnpm --filter @mission-platform/components run build:forge
pnpm --filter @mission-platform/components run build:vue
pnpm --filter @mission-platform/components run build:react
pnpm --filter @mission-platform/components run build:svelte
pnpm --filter @mission-platform/components run build:solid
pnpm --filter @mission-platform/components run build:web-components
```

The aliases use the same typed runner as `build`; they do not contain independent `tsdown` implementations. `build:forge`
selects the neutral target, while the framework aliases select the corresponding framework directory. Package-specific
CMS artifact-mode commands remain available where exposed, including the shared Storyblok assets command and the
per-framework Storyblok wrapper commands.

### Staging and promotion

Every Forge invocation writes to a unique package-local stage under `node_modules/.cache/forge-build/`. The stage is
ignored by Turbo's inputs and is never published. A successful build is checked for output before promotion:

- **Aggregate mode** atomically replaces the complete Forge-owned `dist` tree. Stale neutral, framework, and CMS files
  are therefore removed instead of satisfying exports accidentally.
- **Targeted mode** atomically replaces only the selected framework subtree (and its matching CMS wrapper subtree),
  preserving unrelated neutral, framework, email, and CMS output already in `dist`. The runner scopes the CMS selector
  (e.g. `FORGE_CMS_STORYBLOK_TARGET`) to the requested framework alongside `FORGE_FRAMEWORK_TARGET`, so a package's CMS
  wiring (`forgeStoryblokCmsTargets`, etc.) actually rebuilds the matching wrapper in the same stage instead of it being
  silently dropped from promotion. Promotion only clears a CMS wrapper subtree that the stage regenerated; it never
  deletes a sibling CMS wrapper the current build did not rebuild.
- CMS shared assets such as Storyblok schemas and `components.json` have a shared destination and are not deleted by a
  later framework promotion.
- A compiler failure, empty stage, or promotion failure leaves the previous published tree untouched and removes the
  temporary stage and promotion directory.

The published output remains under the existing `dist` contract: neutral modules and declarations, framework directories
(`vue`, `react`, `svelte`, `solid`, `web-components`), and CMS projections under `cms/<cms>/<framework>`. Package export
maps, including `mp:*` conditions and CMS subpaths, continue to resolve against these promoted paths.

### Package tasks

| Task          | Description                                                                                              |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| `build`       | Aggregate neutral, framework, declaration, email, and configured CMS output through the shared Forge runner. |
| `build:forge` | Targeted neutral Forge output compatibility alias.                                                      |
| `build:react`, `build:vue`, `build:svelte` | Targeted framework compatibility aliases.                                      |
| `build:solid`, `build:web-components` | Targeted framework compatibility aliases.                                         |
| `build:check` | Validates types for a workspace without publishing output.                                               |
| `build:watch` | Starts an incremental build in watch mode for a workspace.                                               |

Turbo hashes the target selectors (`FORGE_BUILD_TARGET` and the legacy Forge/CMS selectors) together with the shared
runner and staging sources. Consequently, aggregate and targeted builds cannot reuse one another's cached result. Final
`dist/**` output is cached; temporary staging and promotion directories are explicitly excluded.

### Caching Strategy

Turborepo caches the following artifacts:

- `dist/**`: Built JS/CSS artifacts.
- `.vite/**`: Vite's internal cache.
- `coverage/**`: Test coverage reports.

To bypass the cache and force a fresh build, use the `--force` flag:

```bash
pnpm build:force
```

The compatibility aliases and CMS artifact-mode tasks are package tasks, so Turbo still applies their dependency graph and
target-specific cache inputs. Temporary stages are not cache outputs; only the promoted `dist` tree is published or
restored from cache.

## Shared Configurations

Build configurations are centralized in the `configs/` directory to maintain consistency across the monorepo.

| Package                               | Purpose                                                      |
| :------------------------------------ | :----------------------------------------------------------- |
| `@mission-platform/vite-config`       | Shared Vite logic for apps and Vue-specific builds.          |
| `@mission-platform/tsdown-config`     | Shared tsdown logic for library packages.                    |
| `@mission-platform/typescript-config` | Base `tsconfig.json` presets for apps, libraries, and tests. |
| `@mission-platform/postcss-config`    | Standardized CSS processing (Autoprefixer, etc.).            |

## Local Development vs. Production

### Development (`dev` task)

Vite's development server provides Hot Module Replacement (HMR). When an app's `dev` task starts, Turborepo also runs
the component library's `build:watch` task alongside it (via the task's `with` key), so edits to
`@mission-platform/components` are recompiled automatically and picked up by the running app without a manual rebuild.

### Production (`build` task)

Turborepo executes builds in topological order. A package is only built after all its internal dependencies have
successfully built. The output in `dist/` is what is eventually published or deployed.

## Advanced: WASM Integration

Certain packages (e.g., `@mission-platform/hunspell`, barcode scanners) involve Rust code compiled to WebAssembly. These
builds are orchestrated via specialized tasks that use `wasm-pack` to ensure environment consistency and optimal
performance.
