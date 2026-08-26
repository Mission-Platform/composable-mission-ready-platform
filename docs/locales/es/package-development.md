# Package Development

This guide describes how to create, develop, and publish reusable packages within the Mission Platform monorepo.
Packages are the foundational building blocks of the platform, residing in the `packages/` directory and managed via
pnpm workspaces and Turborepo.

## Creating a New Package

The recommended way to create a package is using the Mission Platform Developer MCP tool, which ensures all
configurations, scripts, and folder structures follow the platform's standards.

### 1. Scaffold with MCP

Use the `scaffold_package` tool to generate the skeleton.

```bash
# Example: Creating a new 'date-utils' package
# The tool defaults to a dry-run; set apply=true to write files
scaffold_package(name="date-utils", description="Shared date manipulation utilities", apply=true)
```

This generates a convention-compliant `packages/date-utils/` directory with:

- `package.json` with workspace-ready scripts and shared configurations.
- `tsconfig.json` extending the platform defaults.
- `vite.config.ts` for optimized builds.
- `src/index.ts` barrel file.
- `llms.txt` for AI-assisted documentation.

### 2. Manual Setup (Optional)

If you are not using the MCP tool, ensure your `package.json` uses [pnpm catalogs](https://pnpm.io/catalogs) for
dependency management and follows the scoped naming convention:

```json
{
  "name": "@mission-platform/your-package-name",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "pnpm exec turbo run build --filter @mission-platform/your-package-name",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --check ."
  },
  "devDependencies": {
    "@mission-platform/eslint-config": "workspace:*",
    "@mission-platform/prettier-config": "workspace:*"
  }
}
```

## Package Structure

Each package follows a strict internal layout. Units of code (components, composables, stores, or utils) MUST live in
their own named subdirectories with co-located tests.

```text
packages/<name>/
├── src/
│   ├── components/                 # Atomic components (atoms, molecules, etc.)
│   │   ├── atoms/
│   │   │   └── forge-button/        # forge-button.tsx + .stories.tsx + .spec.ts
│   │   └── index.ts                # Component re-exports
│   ├── composables/
│   │   └── use-date-format/        # use-date-format.ts + .spec.ts
│   ├── stores/
│   │   └── date-store/             # date-store.ts + .spec.ts
│   ├── utils/
│   │   └── date-validator/         # date-validator.ts + .spec.ts
│   ├── locales/                    # i18n JSON files
│   └── index.ts                    # Package public API (barrel)
├── docs/                           # Package-owned guides and generated API reference
│   └── reference/generated/        # Regenerated during prebuild
├── llms.txt                        # Technical overview for LLMs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stylelint for style-bearing packages

Packages that contain CSS, SCSS, or Vue style blocks must keep a discoverable Stylelint configuration and lint scripts:

```text
packages/<name>/
├── src/
│   └── styles/                     # CSS, SCSS, and Vue style sources
├── stylelint.config.mjs            # Workspace-local ESM configuration
└── package.json                    # Stylelint scripts and devDependencies
```

Add the shared configuration and its direct syntax/configuration dependencies to `devDependencies`:

```json
{
  "devDependencies": {
    "@mission-platform/stylelint-config": "workspace:*",
    "postcss-html": "catalog:stylelint",
    "postcss-scss": "catalog:stylelint",
    "stylelint": "catalog:stylelint",
    "stylelint-config-recommended-vue": "catalog:stylelint",
    "stylelint-config-standard-scss": "catalog:stylelint"
  }
}
```

Use the shared configuration from `stylelint.config.mjs` instead of duplicating its `extends` entries:

```js
// stylelint.config.mjs
import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
```

Add scripts that cover the workspace's actual style sources, then run the check before publishing:

```json
{
  "scripts": {
    "lint:style": "stylelint \"src/**/*.{vue,scss,css}\"",
    "lint:style:fix": "stylelint --fix \"src/**/*.{vue,scss,css}\""
  }
}
```

```bash
pnpm exec turbo run lint:style --filter @mission-platform/<name>
```

## Development Workflow

### Authoring Rules

1. **TypeScript Everywhere**: All source code must be in `.ts` or `.tsx` (using `@mission-platform/forge`).
2. **Framework Neutrality**: Favor framework-agnostic logic. Components should be authored once in Forge JSX to target
   multiple frameworks.
3. **Isolation**: Packages must never import from `apps/`.
4. **Testing**: Every unit (composable, store, util, component) MUST have a co-located `.spec.ts` file.

For detailed authoring instructions, see:

- [Atomic Component Design](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Store Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)

### Building

Build the package using Turbo to ensure dependencies are built in the correct order:

```bash
pnpm exec turbo run build --filter @mission-platform/<name>
```

### Testing

Run tests using Vitest:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Router packages and Web Components targets

Use `@mission-platform/router` for structured route targets, pure URL helpers, and neutral compiler markers. Shared
packages must not define or register application routes. Applications select one Forge router target independently from
their UI target, retain ownership of native route records and router instances, and bind any target-specific runtime
context during bootstrap. The initial targets are `@mission-platform/forge-router-vue`, `-react`, `-solid`, `-svelte`,
`-redwood`, and `-web-components`; unsupported capability combinations must remain compiler diagnostics.

For a framework-free package or app, select the Forge Web Components condition in both build and TypeScript configs:

```ts
import { frameworkResolveConditions } from "@mission-platform/vite-config";

export default {
  resolve: { conditions: frameworkResolveConditions("web-component") },
};
```

For Web Components applications, import the runtime from `@mission-platform/forge-router-web-components/runtime`, call
`registerRouterElements()` once, call `setForgeRouter(appRouter)` after creating the app-owned router, pass structured
`to` values as DOM properties, and use `MpMemoryHistory` in prerender/tests. A package that adds a reusable router
element or changes Web Components behavior must add a neutral story under `src/**/*.stories.ts` and include the target in
the Web Components Storybook workbench.

## Documentation (`llms.txt`)

Every package includes an `llms.txt` file at its root. This file provides a concise, technical description of the
package's APIs, components, and behavior, enabling AI assistants to better understand and use the package.

- **Title**: Use the scoped package name.
- **Components/APIs**: Table or list of available symbols with their props and responsibilities.
- **Examples**: Short code snippets for common use cases.

## Package documentation ownership

Package-specific installation, usage, limitations, contributor workflows, and API reference pages belong in the
package's `docs/` directory, not in the repository-wide `docs/` tree. The docs site ingests these files directly and
publishes them under a stable package namespace such as `/packages/barcode/index` or `/configs/eslint-config/index`.
Project-wide concepts, architecture, workspace workflows, and cross-package troubleshooting remain in root `docs/`.

Generated API pages live under `docs/reference/generated/` and are refreshed by the package `prebuild` hook; do not edit
those files manually. To preview package documentation through the site, run the docs app build or use the all-workspace
extractor described in the docs app README.

## Publishing

The Mission Platform uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

1. **Add a Changeset**: After making changes, run:
   ```bash
   pnpm changeset
   ```
   Select the package and the type of change (patch, minor, major).
2. **Commit the Changeset**: Commit the generated `.changeset/*.md` file.
3. **Version and Publish**: CI/CD handles the actual publishing, but you can locally preview versions with:
   ```bash
   pnpm changeset version
   ```
