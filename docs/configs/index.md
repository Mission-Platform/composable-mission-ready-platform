# Configuration Packages

The Mission Platform uses centralized configuration packages in the `configs/` directory to ensure consistency across
the monorepo.

## Overview

Centralizing configurations allows for a single source of truth for tooling rules, build processes, and code style.
Packages and applications consume these configurations by extending them in their local config files.

## Package Summary

| Package | Purpose | Primary configuration surface |
|:---|:---|:---|
| [`@mission-platform/eslint-config`](./eslint-config.md) | Flat ESLint rules for JS/TS and Vue. | `eslint.config.js` |
| `@mission-platform/prettier-config` | Repository formatting defaults. | `prettier.config.mjs` |
| `@mission-platform/typescript-config` | TypeScript compiler presets. | `tsconfig.json` |
| `@mission-platform/stylelint-config` | CSS and SCSS linting. | `stylelint.config.mjs` |
| `@mission-platform/vite-config` | Vite and Vitest configuration helpers. | `vite.config.ts` |
| `@mission-platform/tsdown-config` | Library bundling helpers. | `tsdown.config.ts` |
| `@mission-platform/postcss-config` | Shared PostCSS pipeline. | `postcss.config.mjs` |
| `@mission-platform/i18n-config` | Shared locale and extraction settings. | `i18next.config.ts` |
| `@mission-platform/storybook-framework` | Environment-selected Storybook framework preset. | `.storybook/main.ts` |
| [Workers Configuration](./workers-config.md) | Cloudflare Worker conventions. | `wrangler.jsonc` |

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
- `framework-<name>`: Adds the matching `mp:<framework>` export condition for external consumers.

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

## Choosing a configuration

Use the package that owns the concern rather than copying rules into a workspace. Application and library build files
may add local overrides, but shared defaults should remain in `configs/`. For a new package, start with the package
scaffold and then run the workspace checks:

```bash
pnpm exec turbo run build:check --filter @mission-platform/<name>
pnpm exec turbo run lint --filter @mission-platform/<name>
pnpm exec turbo run format --filter @mission-platform/<name>
```
