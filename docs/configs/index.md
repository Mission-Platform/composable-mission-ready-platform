# Project Configuration Files

This document explains the project-wide configuration files located in the `configs/` directory and how to use them across different packages.

## Overview

The Mission Platform uses a centralized configuration system that standardizes development tooling across all packages in the monorepo. These configurations are designed to be:

- **Consistent**: Same rules and settings across all projects
- **Extensible**: Easy to customize for specific package needs
- **Documented**: Clear explanations of each configuration option

## Configuration Files

### ESLint Configuration (`configs/eslint.config.js`)

Our ESLint configuration extends multiple plugin configurations:

```js
import { plugin } from '@mission-platform/eslint-config';

export default plugin({
  // Custom rules can be added here
  rules: {
    'unicorn/prefer-ternary': 'error',
  },
});
```

**Key Rules:**
- Enforce consistent import styles
- Prefer destructured imports
- Disallow unused variables
- Enforce camelCase naming
- Use default parameters over explicit undefined checks
- Prefer template literals over string concatenation

### Stylelint Configuration (`configs/stylelint.config.js`)

Standardizes CSS and SCSS formatting:

```js
import { plugin } from '@mission-platform/stylelint-config';

export default plugin({
  // Custom rules can be added here
  rules: {
    'color-no-invalid-hex': true,
    'selector-class-pattern': '[a-z][a-z0-9]*(?:[-][a-z0-9]+)*',
  },
});
```

**Key Rules:**
- Enforce consistent spacing around colons and brackets
- Disallow unused CSS selectors
- Prefer consistent naming conventions for CSS variables
- Limit hex color length to 6 characters
- Use BEM naming convention for class names
- Order CSS properties in a consistent way

### Prettier Configuration (`configs/prettier.config.js`)

Standardizes code formatting:

```js
import { plugin } from '@mission-platform/prettier-config';

export default plugin({
  // Additional configuration can be added here
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
});
```

**Default Settings:**
- Use single quotes for strings
- Print width: 100 characters
- Tab width: 2 spaces
- End of line: lf
- Insert final newline
- Use single quotes instead of double quotes
- Remove trailing commas where possible

### Vitest Configuration (`configs/vitest.config.ts`)

Standardizes testing setup:

```js
import { plugin } from '@mission-platform/vitest-config';

export default plugin({
  environment: 'jsdom',
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  globals: true,
  test: {
    include: ['**/*.test.{js,ts,vue}'],
    name: 'vitest',
  },
});
```

**Key Features:**
- Component testing with Vue 3
- Mocking of Node.js modules
- Coverage reporting with 80% thresholds
- Environment variables support
- Snapshot testing capabilities
- Test timeout configuration

## Usage in Projects

To use these configurations in your project:

1. **Install the config package** (if not already installed):
   ```bash
   pnpm add -D @mission-platform/eslint-config @mission-platform/stylelint-config @mission-platform/prettier-config @mission-platform/vitest-config
   ```

2. **Configure your tooling** to use the configs:
   
   For ESLint:
   ```js
   // vite.config.ts
   import eslintConfig from '@mission-platform/eslint-config';

   export default defineConfig({
     esbuild: {
       plugins: [eslintConfig],
     },
   }); 
   ```

3. **Run your tools** - they will automatically use the standardized configurations.

## Customization

Each configuration file exports a `plugin` function that accepts an options object. You can extend these configurations by adding your custom rules:

```js
import { plugin } from '@mission-platform/eslint-config';

export default plugin({
  rules: {
    // Add project-specific rules here
    'no-console': 'warn',
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
  },
});
```

## Best Practices

- **Don't duplicate configurations** - always use the centralized configs
- **Update regularly** - check for config updates when upgrading packages
- **Document changes** - if you need to customize, document why in the project README
- **Test your configuration** - verify it works as expected in a test project
- **Keep configurations DRY** - avoid repeating the same rules across multiple files
- **Use environment-specific overrides** when needed for different deployment environments

This standardized approach ensures consistent code quality across all Mission Platform projects while allowing for necessary customization where specific project needs require it.