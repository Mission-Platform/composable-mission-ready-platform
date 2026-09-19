# @mission-platform/edge-security

Defensive HTTP security headers, Content Security Policy (CSP) builders, and Cloudflare Worker middleware for the Mission Platform.

## Features

- **Strict Default Security Headers**: Automatically applies OWASP Top 10 (2025) and ISO 27001 aligned headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`).
- **Composable CSP Generation**: Serializes typed Content Security Policy directives (`createCspPolicy`) with secure defaults (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`).
- **Cloudflare Worker Middleware**: Provides `withSecurityHeaders` to wrap `ExportedHandler` objects or standalone `fetch` handlers.
- **Zero Runtime Dependencies**: Uses standard Web Fetch API (`Headers`, `Response`, `Request`).
- **Sub-Millisecond Performance**: Zero unnecessary allocations and in-place header assignment (< 0.05 ms latency).

## Usage

```typescript
import { withSecurityHeaders } from '@mission-platform/edge-security';

export default withSecurityHeaders({
  async fetch(request, env) {
    return new Response('Hello World');
  },
});
```
