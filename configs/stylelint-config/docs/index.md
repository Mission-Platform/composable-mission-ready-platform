# @mission-platform/stylelint-config

Shared Stylelint rules for CSS and SCSS in Mission Platform.

## Install and use

```bash
pnpm add --save-dev @mission-platform/stylelint-config
```

Extend the package from the workspace's `stylelint.config.mjs`. Keep component
styles close to their component and use local overrides only for a documented
workspace constraint.

## Contribute

Run `pnpm --filter @mission-platform/stylelint-config lint` and
`pnpm --filter @mission-platform/stylelint-config format`. Test rule changes
against both package SCSS and application styles.