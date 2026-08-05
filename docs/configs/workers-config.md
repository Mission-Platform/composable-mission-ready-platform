# Worker Configuration & Development

This document outlines the conventions and configuration for Cloudflare Workers within the Mission Platform monorepo.

## Overview

Workers in the Mission Platform are located in the `workers/` directory. They are used for edge computing tasks such as serving Single Page Applications (SPAs), proxying API requests, and handling scheduled tasks.

## Project Structure

Each worker is a standalone package with its own `package.json` and build configuration.

```text
workers/
├── forge-spa/        # Serves static assets with SPA fallback
│   ├── src/
│   │   └── index.ts # Entry point
│   ├── package.json
│   └── tsdown.config.ts
└── api-proxy/       # Proxies requests to external services
    └── index.js     # Entry point
```

## Build System

Workers typically use `tsdown` for bundling. This ensures that the worker code and its dependencies are compiled into a single file compatible with the Cloudflare Workers environment.

- **Library Mode**: Most workers opt out of module preservation (`preserveModules: false`) to ship a self-contained artifact.
- **Types**: Use `@cloudflare/workers-types` for TypeScript support.

## Configuration

Workers are configured via environment variables and Cloudflare Bindings.

### Local Development
Use `wrangler dev` to run workers locally. This simulates the Cloudflare environment and allows for local testing of KV, Durable Objects, and other bindings.

### Production
Deployment is handled via `wrangler deploy`. Environment-specific configuration is managed through Cloudflare's dashboard or a `wrangler.toml` file (if provided).

## Best Practices

- **Self-Contained Artifacts**: Always bundle dependencies into the worker output to ensure consistent behavior at the edge.
- **Environment Variables**: Use the `env` object passed to the `fetch` handler instead of global process variables.
- **Edge Compatibility**: Avoid using Node.js built-in modules that are not supported by the Cloudflare Workers runtime (e.g., `fs`, `child_process`).
- **Small Footprint**: Keep worker bundles small to minimize cold start times and stay within Cloudflare's resource limits.

## Deployment Command

To deploy a worker, navigate to its directory and run:

```bash
pnpm exec wrangler deploy
```