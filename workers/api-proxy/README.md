# @mission-platform/workers/api-proxy

An example Cloudflare Worker implementation that proxies incoming HTTP requests to an upstream API service (`api.example.com`).

## Architecture & Overview

This Worker serves as a reference implementation for HTTP reverse proxying on Cloudflare Workers. It intercepts incoming requests, modifies the target destination URL while preserving HTTP methods, headers, and request bodies, and forwards the response back to the client.

Key capabilities:
- **Header & Body Preservation**: Retains request headers, payloads, and HTTP methods across requests.
- **Redirect Handling**: Configured with `redirect: 'follow'` to handle upstream redirects seamlessly.
- **Error Boundary**: Catches fetch errors and returns structured HTTP 500 error responses.

## Code Overview (`index.js`)

The Worker exports a default `fetch` handler:

```javascript
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      url.hostname = 'api.example.com';
      
      const newRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      
      return await fetch(newRequest);
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy error: ' + error.message, { status: 500 });
    }
  }
};
```

## Configuration (`wrangler.jsonc`)

To deploy this worker independently, create or configure a `wrangler.jsonc` file:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "api-proxy",
  "main": "index.js",
  "compatibility_date": "2026-06-07",
  "compatibility_flags": ["nodejs_compat"]
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

# Proxies upstream to:
# https://api.example.com/users/123
```

## Customization

- **Dynamic Upstream**: Read target hostnames dynamically from environment variables (`env.UPSTREAM_HOST`).
- **Authentication**: Attach authorization headers (`Authorization: Bearer ...`) before invoking `fetch(newRequest)`.
- **Caching**: Use `cf: { cacheTtl: 300 }` options on `fetch()` to leverage Cloudflare edge caching.