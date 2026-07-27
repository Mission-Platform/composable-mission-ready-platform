# ESLint Configuration

## Overview

The `@mission-platform/eslint-config` workspace package provides the centralized, flat ESLint configuration (`eslint.config.js`) used across all applications, packages, and workers in the Mission Platform monorepo.

## Key Rules & Plugins

- **TypeScript Support**: Powered by `typescript-eslint` with type-aware linting.
  - Enforces explicit type imports (`@typescript-eslint/consistent-type-imports`).
  - Flag unused variables while ignoring variables with leading underscore (`_`).
- **Vue 3 SFC Enforcement**: Powered by `eslint-plugin-vue`.
  - Enforces `script-setup` syntax (`vue/component-api-style`).
  - Standardizes macro order (`defineOptions`, `defineProps`, `defineEmits`, `defineSlots`).
- **Import Rules & Sorting**: Powered by `eslint-plugin-import-x` with TypeScript resolver (`eslint-import-resolver-typescript`).
  - Enforces organized import order and prohibits duplicates and useless path segments.
- **Monorepo & Turborepo Guidelines**: Enforces Turborepo environment variable dependencies via `eslint-config-turbo`.
- **Accessibility & Quality**: Integrates `eslint-plugin-vuejs-accessibility`, `eslint-plugin-i18next`, and `eslint-plugin-sonarjs`.

## Integration in Workspaces

In any workspace (`apps/*`, `packages/*`, `configs/*`, `workers/*`), create an `eslint.config.js` file importing the base configuration array:

```js
// eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
];
```

## Customization & Rule Overrides

To add workspace-specific rules or custom ignore patterns, extend the flat config array:

```js
// eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

## Running ESLint

Run linting across the monorepo using Turborepo:

```bash
# Run linting on all workspaces
pnpm exec turbo run lint

# Automatically fix lint issues
pnpm exec turbo run lint:fix
```