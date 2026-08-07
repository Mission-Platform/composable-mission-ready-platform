# Configuration Packages

The Mission Platform uses centralized configuration packages in the `configs/` directory to ensure consistency across
the monorepo.

## Overview

Centralizing configurations allows for a single source of truth for tooling rules, build processes, and code style.
Packages and applications consume these configurations by extending them in their local config files.

## Package Summary

| Package                                                 | Purpose                                      | Primary Configuration File |
|:--------------------------------------------------------|:---------------------------------------------|:---------------------------|
| [`@mission-platform/eslint-config`](./eslint-config.md) | Linting rules for JS/TS and Vue.             | `eslint.config.js`         |
| `@mission-platform/prettier-config`                     | Code formatting standards.                   | `prettier.config.js`       |
| `@mission-platform/typescript-config`                   | TypeScript compiler presets.                 | `tsconfig.json`            |
| `@mission-platform/stylelint-config`                    | CSS and SCSS linting.                        | `stylelint.config.js`      |
| `@mission-platform/vite-config`                         | Vite build and dev server config.            | `vite.config.ts`           |
| `@mission-platform/postcss-config`                      | PostCSS pipeline (Tailwind, etc.).           | `postcss.config.js`        |
| `@mission-platform/i18n-config`                         | Shared i18n constants and settings.          | `i18next.config.ts`        |
| [`@mission-platform/scripts`](./scripts-config.md)      | Shared utility scripts (in root `scripts/`). | `package.json`             |
| [Workers Configuration](./workers-config.md)            | Conventions for Cloudflare Workers.          | N/A                        |

## Core Tooling

### ESLint (`@mission-platform/eslint-config`)

Standardizes code quality rules across all workspaces. It uses the Flat Config format and includes support for
TypeScript, Vue 3, and accessibility.

### Prettier (`@mission-platform/prettier-config`)

Enforces a consistent code style (tabs, quotes, semicolons) across the entire monorepo.

### TypeScript (`@mission-platform/typescript-config`)

Provides base `tsconfig` presets for different targets:

- `base`: General defaults.
- `vue`: Optimized for Vue 3 SFCs.
- `node`: Optimized for Node.js environments.

## Build System

### Vite (`@mission-platform/vite-config`)

Provides factory functions to create Vite configurations for both applications and libraries.

```ts
import { defineAppConfig, defineLibraryConfig } from '@mission-platform/vite-config';
```

- `defineAppConfig`: For top-level applications (SPA, workers).
- `defineLibraryConfig`: For shared packages with optimal bundling and tree-shaking.

### PostCSS (`@mission-platform/postcss-config`)

Shares the PostCSS plugin pipeline (including Autoprefixer) to ensure CSS is processed consistently regardless of where
it is authored.

## Usage Pattern

To use a configuration in a workspace:

1. Add the configuration package as a `devDependency` in `package.json`.
2. Create a local configuration file (e.g., `eslint.config.js`).
3. Import and export/extend the base configuration.

```js
// Example: eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // local overrides
];
```
