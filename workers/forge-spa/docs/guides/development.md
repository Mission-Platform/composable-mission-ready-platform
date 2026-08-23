# Develop the Forge SPA worker

Run the package checks from the repository root:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

The build emits `dist/index.js` and declarations. Keep the handler limited to
the typed `ASSETS.fetch(request)` delegation and test request forwarding. Test
and deploy application routes from the consuming app; do not add application
configuration or assets to this shared worker.