# ESLint Configuration

The `@mission-platform/eslint-config` package provides a centralized, flat ESLint configuration for the entire monorepo.

## Overview

Mission Platform uses the ESLint Flat Config format (`eslint.config.js`). The shared configuration enforces consistent code quality, accessibility, and architectural rules across all packages, applications, and workers.

## Key Features

- **TypeScript Support**: Type-aware linting powered by `typescript-eslint`.
- **Vue 3 SFCs**: Enforces `<script setup>` and best practices via `eslint-plugin-vue`.
- **Accessibility**: Built-in accessibility checks for Vue templates with `eslint-plugin-vuejs-accessibility`.
- **Import Organization**: Automatic sorting and validation of imports via `eslint-plugin-import-x`.
- **Monorepo Awareness**: Integration with `eslint-config-turbo` to ensure environment variables are properly declared.

## Built-in Plugins

The configuration includes the following plugins and rule sets:

| Plugin | Purpose |
| :--- | :--- |
| `typescript-eslint` | Standard TypeScript rules and type-aware linting. |
| `eslint-plugin-vue` | Vue 3 SFC linting and template validation. |
| `eslint-plugin-sonarjs` | Detection of code smells and bug risks. |
| `eslint-plugin-unicorn` | Dozens of small, useful community rules. |
| `eslint-plugin-i18next` | Ensures translation keys are used correctly. |
| `eslint-config-prettier` | Disables rules that conflict with Prettier formatting. |

## Usage

To apply the shared configuration to a workspace, create an `eslint.config.js` file at the root of the workspace:

```js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add workspace-specific overrides here
];
```

## Running the Linter

Use Turborepo to run linting across one or more workspaces:

```bash
# Lint the entire monorepo
pnpm exec turbo run lint

# Lint a specific package
pnpm exec turbo run lint --filter <package-name>

# Automatically fix fixable issues
pnpm exec turbo run lint:fix
```