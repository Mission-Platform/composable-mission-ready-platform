# @mission-platform/prettier-config

Repository formatting defaults shared by packages and applications.

## Install and use

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

Export the shared configuration from the workspace's `prettier.config.js`.
Use local overrides sparingly so Markdown, TypeScript, Vue, and configuration
files remain consistent across the monorepo.

## Contribute

Run `pnpm --filter @mission-platform/prettier-config format` after changing the
configuration. Changes should apply consistently to every workspace that uses
the package.