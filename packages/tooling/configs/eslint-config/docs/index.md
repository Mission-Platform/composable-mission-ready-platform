# @mission-platform/eslint-config

Shared flat ESLint configuration for Mission Platform workspaces.

## Install and use

Add the package to a workspace's development dependencies and extend the flat
configuration from `eslint.config.js`:

```bash
pnpm add --save-dev @mission-platform/eslint-config
```

```js
import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
```

The package includes TypeScript, Vue 3, accessibility, import, Turbo, and
formatting integrations. Add workspace-specific rules only for behavior that
cannot be shared. See [the ESLint reference](reference/eslint.md) for the
included plugins and commands.

## Contribute

Run `pnpm --filter @mission-platform/eslint-config lint` and
`pnpm --filter @mission-platform/eslint-config format` after changing rules.
Keep the package framework-aware but workspace-agnostic; applications should
not import rules from another workspace.
