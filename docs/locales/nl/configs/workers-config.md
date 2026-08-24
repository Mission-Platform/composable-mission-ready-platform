# Worker deployment directory

Worker implementation documentation belongs beside each publishable worker:

- [`@mission-platform/api-proxy`](../../workers/api-proxy/docs/index.md) — constrained read-only API proxy.
- [`@mission-platform/email-sender`](../../workers/email-sender/docs/index.md) — local MailPit-backed sender.
- [`@mission-platform/forge-spa`](../../workers/forge-spa/docs/index.md) — shared `ASSETS` SPA fallback handler.

This project page keeps only the cross-workspace deployment map. Worker
packages own their handler contracts, examples, tests, and build instructions;
application packages own routes, domains, bindings, and deployment
environments.

## Application deployment map

| Application     | Handler                               | Configuration                         | Assets                                            |
| :-------------- | :------------------------------------ | :------------------------------------ | :------------------------------------------------ |
| Website         | `workers/forge-spa/dist/index.js`     | `apps/website/wrangler.jsonc`         | `apps/website/dist/`, bound as `ASSETS`           |
| My Care Notes   | `workers/forge-spa/dist/index.js`     | `apps/my-care-notes/wrangler.jsonc`   | `apps/my-care-notes/dist/`, bound as `ASSETS`     |
| Service Monitor | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, bound as `ASSETS` |
| Docs            | Static assets                         | `apps/docs/wrangler.jsonc`            | `apps/docs/dist/`                                 |

Website and My Care Notes consume the shared Forge SPA worker. Service Monitor
owns its Worker entrypoint and Durable Object binding. The docs site is a
static Vite deployment and has no Worker entrypoint; Storybook is not a
deployment target.

Deploy from the application package whose Wrangler configuration owns the
route and environment. Keep secrets out of tracked configuration and use
Cloudflare secret storage for sensitive values. See the application-specific
deployment scripts and the package-local worker guides for implementation
details.
