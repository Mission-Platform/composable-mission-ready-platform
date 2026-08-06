---
'@mission-platform/vite-plugin-i18n': patch
---

fix loading of the `virtual:i18n-resources` module in isolated worker environments

Isolated module runners such as the Cloudflare Worker environment (used by the RedwoodSDK-based `service-monitor` app) hand the resolved virtual id back to the `load` hook with the URL-safe `__x00__` placeholder instead of the raw `\0` null byte. The plugin now recognises both forms in `resolveId` and `load`, so the dev server no longer fails with `Failed to load url __x00__virtual:i18n-resources`.
