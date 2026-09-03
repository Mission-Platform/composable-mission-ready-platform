# @mission-platform/postcss-config

Shared PostCSS pipeline used by Mission Platform stylesheets.

## Install and use

```bash
pnpm add --save-dev @mission-platform/postcss-config
```

Reference the package from the workspace's `postcss.config.mjs` rather than
duplicating the shared plugin pipeline. Local overrides belong in that
workspace configuration.

## Contribute

Run `pnpm --filter @mission-platform/postcss-config lint` and
`pnpm --filter @mission-platform/postcss-config format`. Keep browser
compatibility behavior in this package and avoid application-specific plugins.
