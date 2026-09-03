# Develop the API proxy worker

Run the focused checks from the repository root:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

The build emits `dist/index.js` and declarations. Keep the handler compatible
with the Cloudflare Workers runtime: use the typed `env` object for bindings
and do not add Node.js built-ins. Add tests for route allow-lists, sanitized
headers, query forwarding, and upstream failures when changing the handler.
