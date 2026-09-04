# Application Development

This how-to guide explains how to run, test, and deploy the applications in `apps/`. Applications compose reusable
packages; shared components, composables, utilities, and configuration belong in their owning workspace instead of being
copied into an app.

## Choose an application

| Application                         | Local development                                     | Build                                                   | Deployment                                                       |
| :---------------------------------- | :---------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| `@mission-platform/docs`            | `pnpm --filter @mission-platform/docs dev`            | `pnpm --filter @mission-platform/docs build`            | Preview or deploy through its hosting worker                     |
| `@mission-platform/website`         | `pnpm --filter @mission-platform/website dev`         | `pnpm --filter @mission-platform/website build`         | `pnpm --filter @mission-platform/website deploy:staging`         |
| `@mission-platform/my-care-notes`   | `pnpm --filter @mission-platform/my-care-notes dev`   | `pnpm --filter @mission-platform/my-care-notes build`   | `pnpm --filter @mission-platform/my-care-notes deploy:staging`   |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook`       | `pnpm --filter @mission-platform/storybook dev`       | `pnpm --filter @mission-platform/storybook build`       | Use the configured Storybook/Chromatic workflow                  |

The application package owns its Vite or Wrangler configuration. Do not run `wrangler deploy` from a reusable worker
package unless that package has its own `wrangler.jsonc`.

## Develop a change

1. Start the target application with its package `dev` script.

2. Make reusable changes in `packages/` and app-specific composition changes in `apps/<name>/`.

3. Build the changed application and its dependencies:

   ```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Run tests, lint, style checks, and formatting for the affected workspace:

   ```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

For a shared package change, replace `<app>` with the package name and use `...` when you need dependent workspaces
included in the build graph.

## Static documentation and website builds

The docs and website applications use `vite-ssg`. A production build generates static routes from the source content and
locale catalogues. Check the generated output with the package's `preview` script:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Keep documentation Markdown under `docs/` and website messages in the owning locale catalogue. Do not add a second
render-time copy of either source.

## Cloudflare development and deployment

Applications with a `wrangler.jsonc` expose environment-aware commands:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Use `wrangler secret put` for secrets. Keep bindings and non-secret defaults in `wrangler.jsonc`, and verify the
selected environment before deploying.

## Related guides

- [Development Setup](development-setup.md)
- [Workspace Structure](workspace-structure.md)
- [Build System](build-system.md)
- [Worker Configuration](packages/tooling/configs/workers-config.md)
- [Testing](testing.md)