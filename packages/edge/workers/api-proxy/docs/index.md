# @mission-platform/api-proxy

An example Cloudflare Worker that proxies approved read-only API routes to a
fixed upstream service. This workspace owns the request policy, header
sanitization, and error boundary for the proxy handler.

## Use the worker

The package exports its bundled handler from `@mission-platform/api-proxy`.
Build it before referencing `dist/index.js` from a Wrangler configuration:

```bash
pnpm --filter @mission-platform/api-proxy build
```

Only `GET` and `HEAD` requests to `/users` and `/v1` are accepted. Query
strings are forwarded; credentials, the original `Host`, and hop-by-hop
headers are removed. Upstream or request-construction failures return `502`.

## Limitations

The package has no checked-in Wrangler deployment configuration and is not a
general-purpose reverse proxy. Add an explicit deployment configuration and
review authentication, upstream, and caching changes before exposing it.

- [Development guide](guides/development.md)
- [`README.md`](../README.md)
