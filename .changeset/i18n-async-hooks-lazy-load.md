---
'@mission-platform/i18n': patch
---

lazily load `node:async_hooks` so it never enters the browser bundle

A static `import { AsyncLocalStorage } from 'node:async_hooks'` made bundlers such as Vite externalize the module for
the browser and hoist the property access above the environment guard, throwing at module load in client code. The
server-side request-context storage is now initialised via a dynamic import restricted to non-browser environments,
keeping `node:async_hooks` out of the browser module graph while the server (Node, Cloudflare Workers with
`nodejs_compat`) still gets real request-scoped isolation.
