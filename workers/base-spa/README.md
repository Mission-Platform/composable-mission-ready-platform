# @mission-platform/base-spa

A baseline Cloudflare Worker that serves a single-page application from the
`ASSETS` binding and exposes a small JSON API under `/api/*`.

This workspace is intended as a reusable starting point for new SPA-backed
Workers in the Mission Platform monorepo.

## Scripts

```bash
# Local development (wrangler dev)
pnpm --filter @mission-platform/base-spa dev

# Type-check
pnpm --filter @mission-platform/base-spa build

# Deploy to Cloudflare
pnpm --filter @mission-platform/base-spa deploy

# Regenerate Env / binding types from wrangler.jsonc
pnpm --filter @mission-platform/base-spa cf-typegen
```

## Layout

- `src/index.ts` — Worker entry; routes `/api/*` to a JSON handler and
  delegates everything else to the static asset binding.
- `public/` — Static assets served by the `ASSETS` binding (place your SPA
  build output here).
- `wrangler.jsonc` — Wrangler configuration, including the SPA-aware
  `assets` binding (`not_found_handling: "single-page-application"`).
