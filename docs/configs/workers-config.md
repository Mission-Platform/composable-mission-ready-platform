# Worker Configuration & Development

This document describes the Cloudflare Workers in the Mission Platform monorepo, their TypeScript entrypoints, and the
configuration files used to run or deploy them.

## Worker Inventory

Standalone worker packages live under `workers/`:

| Worker | Handler | Configuration | Purpose |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | None; consumed as a bundled package | Constrained read-only API proxy |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | MailPit-backed email showcase worker |
| `forge-spa` | `workers/forge-spa/src/index.ts` | None; consumed as a bundled package | `ASSETS`-binding SPA fallback handler |

The deployable application Workers are:

| Application | Handler | Configuration |
| :---------- | :------ | :------------ |
| Website | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| My Care Notes | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| Service Monitor | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` and `forge-spa` do not have standalone Wrangler configuration files: their `src/index.ts` handlers are
bundled by `tsdown` and referenced by the application Wrangler configurations or a consuming deployment.

## Build System

Worker packages use `tsdown` for bundling. Use the package task through Turborepo or pnpm so workspace dependencies are
resolved consistently:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

Worker tests use Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

Use `@cloudflare/workers-types` for handler and binding types. The email sender's generated binding declarations are
written to `workers/email-sender/src/worker-configuration.d.ts` by its `types` script.

## Configuration and Local Development

Workers receive runtime values through the `env` object and Cloudflare bindings. Do not put secrets in tracked
`wrangler.jsonc` files; use `wrangler secret put` for sensitive values.

For the standalone email sender, run its configured Wrangler development server from the workspace package:

```bash
pnpm --filter @mission-platform/email-sender dev
```

For deployable applications, use the scripts in each app package. For example, the Website and My Care Notes Wrangler
files provide `staging` and `production` environments, while Service Monitor provides a `staging` environment:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## Deployment

Deploy from the application package whose `wrangler.jsonc` owns the route and environment:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

The standalone worker packages without Wrangler configuration are not deployed directly with `wrangler deploy`; build
their handlers and deploy them through the consuming application configuration.

## Best Practices

- Bundle dependencies into the worker output for predictable edge execution.
- Use the `env` object passed to the `fetch` handler instead of global process variables.
- Avoid Node.js built-ins unsupported by the Workers runtime, such as `fs` and `child_process`, in worker handlers.
- Keep worker bundles small to minimize cold starts and stay within Cloudflare resource limits.
