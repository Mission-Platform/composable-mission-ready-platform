# @mission-platform/vite-config

Shared Vite and Vitest configuration helpers for Mission Platform packages and
applications.

## Install and use

```bash
pnpm add --save-dev @mission-platform/vite-config
```

Use `defineLibraryConfig` for packages, `defineAppConfig` for applications, and
`defineVitestConfig` from the `/vitest` subpath. Framework applications should
select one `defineFrameworkAppConfig` condition and then import shared packages
through their bare package specifiers.

## Contribute

Run `pnpm --filter @mission-platform/vite-config lint` and format checks. Keep
the helper's defaults reusable and preserve the shared Vite, PostCSS, and
externalization behavior described in the package README.
