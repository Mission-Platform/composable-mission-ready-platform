# Project Configuration Packages

This document explains the project-wide configuration packages located in the `configs/` directory and how to use them across applications and packages in the monorepo.

## Overview

The Mission Platform uses a centralized configuration system housed under `configs/` that standardizes development tooling across all workspaces. These configuration packages are designed to be:

- **Consistent**: Uniform rules, TypeScript targets, and code style across all projects.
- **Extensible**: Easily extended for workspace-specific requirements.
- **Maintainable**: Updated once at the root to propagate across all apps and packages.

## Configuration Packages

### 1. ESLint Configuration (`@mission-platform/eslint-config`)

Provides the base flat ESLint configuration array (`eslint.config.js`):

```js
// eslint.config.js
import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  // Add project-specific rule overrides here
];
```

**Key Features:**
- TypeScript parser and `typescript-eslint` recommended rules with project service support.
- Vue 3 SFC flat recommended rules, enforcing `script-setup` syntax.
- Organized import order via `eslint-plugin-import-x` and `eslint-import-resolver-typescript`.
- Accessibility, i18n, and SonarJS code quality rules.

### 2. Prettier Configuration (`@mission-platform/prettier-config`)

Standardizes code formatting across all JS/TS, Vue, JSON, and CSS files:

```js
// prettier.config.js
import baseConfig from '@mission-platform/prettier-config';

export default baseConfig;
```

**Default Settings:**
- Print width: 120 characters
- Tab width: 2 spaces
- Single quotes: `true`
- Semicolons: `true`
- Trailing comma: `'all'`
- HTML whitespace sensitivity: `'ignore'`
- End of line: `'lf'`

### 3. Stylelint Configuration (`@mission-platform/stylelint-config`)

Standardizes CSS, SCSS, and Vue `<style>` block formatting:

```js
// stylelint.config.js
import baseConfig from '@mission-platform/stylelint-config';

export default baseConfig;
```

**Key Rules:**
- Extends `stylelint-config-standard-scss` and `stylelint-config-recommended-vue`.
- Enforces BEM naming conventions for CSS class names.
- Validates SCSS variable patterns and disallows duplicate properties.

### 4. TypeScript Configuration (`@mission-platform/typescript-config`)

Provides base `tsconfig` presets for different workspace targets:

```json
// tsconfig.json in an app
{
  "extends": "@mission-platform/typescript-config/app",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

**Available Presets:**
- `@mission-platform/typescript-config/base`: General TypeScript defaults.
- `@mission-platform/typescript-config/app`: Target for Vue 3 frontend applications.
- `@mission-platform/typescript-config/library`: Target for shared package libraries.
- `@mission-platform/typescript-config/node`: Target for Node.js scripts and server tooling.
- `@mission-platform/typescript-config/react`: Target for React applications.
- `@mission-platform/typescript-config/test`: Target for Vitest test suites.

### 5. Vite & Vitest Configuration (`@mission-platform/vite-config`)

Provides shared Vite build configurations and Vitest testing setups:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { createViteConfig } from '@mission-platform/vite-config';

export default defineConfig(createViteConfig());
```

### 6. PostCSS Configuration (`@mission-platform/postcss-config`)

Provides shared PostCSS configuration for Tailwind CSS and Autoprefixer integration.

### 7. i18n Configuration (`@mission-platform/i18n-config`)

Provides shared internationalization constants and configuration options.

### 8. i18next CLI Vue (`@mission-platform/i18next-cli-vue`)

CLI tool and extraction utilities for extracting i18n translation keys from Vue templates and source code.

## Usage in Workspaces

To use these configuration packages in a workspace:

1. **Reference the workspace dependency** in your `package.json`:
   ```json
   {
     "devDependencies": {
       "@mission-platform/eslint-config": "workspace:*",
       "@mission-platform/prettier-config": "workspace:*",
       "@mission-platform/typescript-config": "workspace:*"
     }
   }
   ```

2. **Add configuration files** pointing to the central packages (e.g., `eslint.config.js`, `prettier.config.js`, `tsconfig.json`).

3. **Run your tools via Turborepo**:
   ```bash
   pnpm exec turbo run lint
   pnpm exec turbo run typecheck
   ```

## Best Practices

- **Never duplicate configuration rules** across workspace config files; extend the centralized package instead.
- **Maintain single-direction dependencies**: Code in `configs/` must never depend on `apps/` or `packages/`.
- **Document any custom overrides** directly in the workspace `README.md` or configuration file comments.