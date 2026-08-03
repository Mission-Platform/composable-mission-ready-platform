# Package Development Guide

This guide provides an overview of how to develop packages within the Mission Platform monorepo. Packages are reusable building blocks that can be shared across multiple applications and other packages.

## Overview

Packages are located in the `packages/` directory and follow a standardized structure. Each package is designed to be framework-agnostic where possible, or clearly Vue-focused when necessary.

## Creating a New Package

To create a new package, follow these steps:

1. **Create the package directory**:
   ```bash
   mkdir packages/<package-name>
   cd packages/<package-name>
   ```

2. **Initialize the package**:
   - Create a `package.json` file with the following structure:
     ```json
     {
       "name": "@mission-platform/<package-name>",
       "version": "0.1.0",
       "description": "Description of the package",
       "type": "module",
       "main": "dist/index.js",
       "types": "dist/index.d.ts",
       "files": ["dist"],
       "scripts": {
         "build": "tsc",
         "lint": "eslint . --fix",
         "test": "vitest"
       },
       "dependencies": {},
       "devDependencies": {
         "@mission-platform/eslint-config": "workspace:*",
         "@mission-platform/prettier-config": "workspace:*",
         "@mission-platform/stylelint-config": "workspace:*"
       }
     }
     ```

3. **Add configuration files**:
   - `tsconfig.json`: Extend the shared TypeScript configuration.
   - `vite.config.ts`: Define the build configuration for your package.

4. **Add source files**:
   - Organize your code in the `src/` directory.
   - Ensure all files are TypeScript (`.ts`) or Vue Single File Components (`.vue`).

5. **Add documentation**:
   - Create an `llms.txt` file to explain the package's usage.

6. **Add tests**:
   - Write unit tests using Vitest in the `src/` directory.

7. **Add stories**:
   - Create Storybook stories in the `src/` directory for visual testing.

## Package Structure

A typical package structure follows a hierarchical layout to ensure consistency and maintainability. Each functional area has its own directory with an `index.ts` barrel file.

```
packages/<package-name>/
├── src/
│   ├── components/      # UI components (Vue, React, JSX)
│   │   ├── MyComponent.vue
│   │   └── index.ts     # Exports all components
│   ├── composables/     # Reactive logic and hooks
│   │   ├── useExample.ts
│   │   └── index.ts     # Exports all composables
│   ├── locales/         # i18n translation files
│   │   ├── en.json
│   │   └── index.ts     # Exports locale definitions
│   ├── utils/           # Utility functions and helpers
│   │   ├── helper.ts
│   │   └── index.ts     # Exports all utilities
│   ├── index.ts         # Top-level barrel re-exporting public API
│   └── llms.txt         # LLM-readable package documentation
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### UI Package Composables Rule

Every UI package that ships components **MUST** also provide corresponding composables under `src/composables/` with an `index.ts` barrel. These composables should be authored write-once against `@mission-platform/forge` neutral hooks so they can be compiled to every supported framework (e.g. Vue 3, React). This ensures reactive logic remains portable and consistent across the platform.

## Best Practices

### Common Import Patterns

The Mission Platform enforces a strict dependency direction: `apps/` → `packages/`, `vite-plugins/`, `workers/` → `configs/`. Below are the correct and incorrect import patterns:

#### ✅ Correct (package importing config)
```ts
// packages/utils/logger.ts
import baseConfig from '@mission-platform/eslint-config'
```

#### ❌ Invalid (package importing app)
```ts
// packages/components/Button.vue
import AppLayout from '@/apps/main/Layout.vue' // BLOCKED BY LINT
```

#### ✅ Correct (app importing package)
```ts
// apps/my-care-notes/src/App.vue
import { useExample } from '@mission-platform/example-package'
```

#### ❌ Invalid (app importing package from wrong location)
```ts
// apps/my-care-notes/src/utils/helpers.ts
import Button from '../packages/components/Button.vue' // BLOCKED BY LINT
```

1. **Framework-Agnostic Design**:
   - Where possible, design packages to be framework-agnostic.
   - Use the `@mission-platform/forge` package for writing components that can be compiled to both Vue and React.

2. **TypeScript**:
   - All code should be written in TypeScript to ensure type safety.

3. **Testing**:
   - Write unit tests for all critical functionality using Vitest.
   - Add browser-level tests using Playwright where necessary.

4. **Documentation**:
   - Maintain an `llms.txt` file to explain the package's usage.
   - Add Storybook stories for visual documentation and testing.

5. **Changesets**:
   - Every change to a published workspace must include a changeset.
   - Use `pnpm changeset` to create a changeset describing the change.

## Publishing Packages

Packages are versioned and released independently using Changesets. Follow these steps to publish a package:

1. **Create a changeset**:
   ```bash
   pnpm changeset
   ```

2. **Bump versions**:
   ```bash
   pnpm changeset version
   ```

3. **Publish**:
   ```bash
   pnpm changeset publish
   ```

## Consuming Packages

To use a package in an application or another package, add it as a dependency:

```json
{
  "dependencies": {
    "@mission-platform/<package-name>": "workspace:*"
  }
}
```

## Dependency Direction

- Code in `packages/`, `configs/`, `vite-plugins/`, and `workers/` must never import from `apps/`.
- The dependency flow is strictly one-way: `apps` → `packages`/`vite-plugins`/`workers` → `configs`.
- Packages can import from other packages, configs, vite-plugins, and workers.

## Shared Tooling Configurations

All packages should extend the shared tooling configurations:

- **ESLint**:
  ```js
  // eslint.config.js
  import baseConfig from '@mission-platform/eslint-config'
  export default [...baseConfig]
  ```

- **Prettier**:
  ```js
  // prettier.config.js
  import baseConfig from '@mission-platform/prettier-config'
  export default { ...baseConfig }
  ```

- **Stylelint**:
  ```js
  // stylelint.config.mjs
  import baseConfig from '@mission-platform/stylelint-config'
  export default { ...baseConfig }
  ```

- **PostCSS**:
  ```js
  // postcss.config.js
  import baseConfig from '@mission-platform/postcss-config'
  export default { ...baseConfig }
  ```

## Example Package

For an example of a well-structured package, refer to the `@mission-platform/components` package in `packages/components/`.

## Additional Resources

- [Architecture Guide](architecture.md)
- [Development Setup](development-setup.md)
- [Overview](overview.md)
