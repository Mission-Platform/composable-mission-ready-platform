# @mission-platform/forge-spa

The shared Cloudflare Worker entrypoint for Mission Platform SPA and SSG
deployments. It delegates requests to the `ASSETS` binding and is consumed by
applications rather than deployed independently.

## Integrate the worker

Build the package, then reference its compiled handler from a consuming app's
Wrangler configuration:

```bash
pnpm --filter @mission-platform/forge-spa build
```

The consumer config should set `main` to
`packages/edge/workers/forge-spa/dist/index.js` and bind its application `dist/` directory as
`ASSETS` with SPA fallback handling. Website and My Care Notes are current
consumers.

The worker owns no application routes, assets, domains, or environment
secrets. Those remain in the consuming application package.

- [Development guide](guides/development.md)
- [`README.md`](../README.md)
