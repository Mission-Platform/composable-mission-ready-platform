# ESLint Configuration

## Overview
This configuration extends [`@mission-platform/eslint-config`](https://github.com/mission-platform/eslint-config) with project-specific rules and conventions.

## Key Rules
- Enforce consistent import styles (prefer destructured imports)
- Disallow unused variables
- Enforce camelCase naming for all identifiers
- Require explicit return types in TypeScript
- Prefer ternary expressions over simple if-else statements

## Customization
To extend this configuration:
```js
import { plugin } from '@mission-platform/eslint-config';

export default plugin({
  rules: {
    // Add project-specific rules here
    'no-console': 'warn',
  },
});
```

## Integration
This config is automatically applied to all projects via:
```js
// vite.config.ts
import eslintConfig from '@mission-platform/eslint-config';

export default defineConfig({
  esbuild: {
    // Apply ESLint rules during build
    plugins: [eslintConfig],
  },
});
```