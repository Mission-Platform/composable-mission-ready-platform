# @mission-platform/api-proxy

An example Cloudflare Worker implementation that proxies approved read-only routes to an upstream API service (`api.example.com`).

## Architecture & Overview

This Worker serves as a reference implementation for constrained HTTP reverse proxying on Cloudflare Workers. It accepts `GET` and `HEAD` requests only for `/users` and `/v1` routes, forwards query strings, and strips credentials and hop-by-hop headers.

Key capabilities:

- **Header Sanitization**: Drops credentials, the original `Host`, and hop-by-hop headers before forwarding.
- **Redirect Handling**: Configured with `redirect: 'follow'` to handle upstream redirects seamlessly.
- **Error Boundary**: Catches construction and upstream errors and returns an opaque `502 Bad gateway` response.

## Code Overview (`src/index.ts`)

The Worker is authored in TypeScript and exports a default `fetch` handler. It is built with `tsdown` to `dist/index.js` (see the `build` script), mirroring the `@mission-platform/forge-spa` worker layout:

The implementation checks `isAllowedProxyRequest` before constructing an upstream request. It creates the upstream URL from the fixed origin plus the incoming pathname and query, copies only non-sensitive headers, and returns `Bad gateway` with status `502` if request construction or upstream fetch fails.

## Configuration (`wrangler.jsonc`)

To deploy this worker independently, create or configure a `wrangler.jsonc` file:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "api-proxy",
  "main": "dist/index.js",
  "compatibility_date": "2026-06-07",
  "compatibility_flags": ["nodejs_compat"],
}
```

## Local Development & Deployment

### Local Development

Run local preview using Wrangler from the worker directory:

```bash
# Start local dev server
pnpm exec wrangler dev
```

### Deployment

Deploy directly to Cloudflare:

```bash
# Deploy to Cloudflare Workers
pnpm exec wrangler deploy
```

## Example Usage

```bash
# Request to worker
curl -X GET https://api-proxy.your-subdomain.workers.dev/users/123

# Approved routes proxy upstream to:
# https://api.example.com/users/123
```

## Customization

- **Dynamic Upstream**: Read target hostnames dynamically from environment variables (`env.UPSTREAM_HOST`).
- **Authentication**: Attach authorization headers (`Authorization: Bearer ...`) before invoking `fetch(newRequest)`.
- **Caching**: Use `cf: { cacheTtl: 300 }` options on `fetch()` to leverage Cloudflare edge caching.
