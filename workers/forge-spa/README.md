# @mission-platform/forge-spa

A baseline Cloudflare Worker entrypoint that serves single-page applications and static site generation (SSG) outputs from the Cloudflare Workers `ASSETS` binding.

## Purpose & Usage

This workspace serves as a shared worker runtime entrypoint for SPA and SSG applications in the Mission Platform monorepo. It is not deployed independently; instead, consuming applications reference this worker's compiled build output in their own `wrangler.jsonc`.

Consuming apps (such as `apps/my-care-notes` and `apps/website`):

1. Configure `main: "../../workers/forge-spa/dist/index.js"` in `wrangler.jsonc`.
2. Configure `assets` binding with `directory: "./dist/"` and `not_found_handling: "single-page-application"`.
3. Target `production` and `staging` custom domains or preview URLs in their respective `wrangler.jsonc` environment definitions.

## Code Architecture

- **`src/index.ts`**: The Worker entrypoint. Receives incoming HTTP requests and delegates asset resolution to `environment.ASSETS.fetch(request)`.
- **`dist/index.js`**: Transpiled ESM JavaScript artifact consumed by Wrangler at application deployment time.

```typescript
import type { fetch, Request, Response } from '@cloudflare/workers-types';

export default {
  async fetch(request: Request, environment: Record<string, { fetch: typeof fetch }>): Promise<Response> {
    return environment.ASSETS.fetch(request);
  },
};
```

## Workflows & Scripts

### Building the Worker

Before deploying or running local Wrangler servers for consuming apps, build the `@mission-platform/forge-spa` bundle:

```bash
# Using Turborepo (recommended)
pnpm exec turbo run build --filter=@mission-platform/forge-spa

# Or using pnpm workspace filtering directly
pnpm --filter @mission-platform/forge-spa build
```

### Deploying Consuming Apps

Deploying a consuming app automatically builds both `@mission-platform/forge-spa` and the app target via Turbo dependencies defined in Wrangler config (`turbo run build --filter=<app> --filter=@mission-platform/forge-spa`):

```bash
# Deploy My Care Notes app
pnpm --filter @mission-platform/my-care-notes deploy            # production
pnpm --filter @mission-platform/my-care-notes deploy:staging    # staging

# Deploy Website app
pnpm --filter @mission-platform/website deploy                  # production
pnpm --filter @mission-platform/website deploy:staging          # staging
```

## Available Scripts

| Command                             | Description                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm build`                        | Transpiles TypeScript source (`src/index.ts`) to `dist/index.js` via `tsconfig.build.json` |
| `pnpm lint` / `pnpm lint:fix`       | Lints codebase using ESLint                                                                |
| `pnpm format` / `pnpm format:write` | Checks or fixes code formatting with Prettier                                              |
