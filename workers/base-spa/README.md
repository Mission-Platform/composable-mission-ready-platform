# @mission-platform/base-spa

A baseline Cloudflare Worker that serves a single-page application from the
`ASSETS` binding and exposes a small JSON API under `/api/*`.

This workspace is intended as a reusable starting point for new SPA-backed
Workers in the Mission Platform monorepo.

The worker is not deployed on its own — each consuming app owns its own
`wrangler.jsonc` (e.g. `apps/my-care-notes/wrangler.jsonc`,
`apps/website/wrangler.jsonc`) that points `main` at this worker's build
output (`../../workers/base-spa/dist/index.js`) and serves the app's `dist/`
through the `ASSETS` binding. Each app config defines `production` and
`staging` environments.

## Scripts

```bash
# Type-check / build the worker bundle consumed by the apps
pnpm --filter @mission-platform/base-spa build

# Deploy a consuming app (builds this worker + the app, then deploys)
pnpm deploy:my-care-notes            # production
pnpm deploy:my-care-notes:staging    # staging
pnpm deploy:website                  # production
pnpm deploy:website:staging          # staging
```

## Layout

- `src/index.ts` — Worker entry; routes `/api/*` to a JSON handler and
  delegates everything else to the static asset binding.
- `public/` — Static assets served by the `ASSETS` binding (place your SPA
  build output here).

The SPA-aware Wrangler configuration (`assets` binding with
`not_found_handling: "single-page-application"`) lives in each consuming app's
`wrangler.jsonc`, not in this workspace.
